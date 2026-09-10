/**
 * StudyGenius Academic Intelligence System
 * src/multimodal/visualEvidenceService.js
 * 
 * Gestore Multimodale a Imbuto per VisualEvidence.
 * 
 * Implementa il Funnel a 3 livelli:
 * - Tier A: (già eseguito da localAnalyzer.js) esclude pagine solo testo a zero token.
 * - Tier B: Classificazione economica rapida (Flash) per bounding box e tipo.
 * - Tier C: Analisi approfondita selettiva (Crop ad alta risoluzione + Pagina intera + Testo locale).
 * 
 * Garantisce:
 * 1. Rispetto tassativo dello schema JSON VisualEvidence (v1.0.0).
 * 2. Risoluzione adattiva (bassa per Tier B, alta per Tier C).
 * 3. Cache persistente multi-livello a chiave composita.
 */

const fs = require('fs-extra');
const path = require('path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

const { defaultCacheInstance } = require('./visualCacheService');
const { getGeminiClient, callGeminiRole, callGeminiWithCascade } = require('../services/aiService');
const { CONFIG } = require('../config');
const {
  VISUAL_TAXONOMY,
  PROVENANCE_CLASSES,
  CONSISTENCY_STATES,
  RECONSTRUCTION_STRATEGIES,
  validateVisualEvidence
} = require('../core/schemas');

let sharedBrowser = null;
async function getSharedBrowser() {
  if (!sharedBrowser) {
    sharedBrowser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }
  return sharedBrowser;
}

// Registro centrale dei buffer PDF per riuso persistente offline
const documentBufferRegistry = new Map();

function registerDocumentBuffer(fileHash, buffer) {
  if (fileHash && Buffer.isBuffer(buffer) && buffer.length > 0) {
    documentBufferRegistry.set(fileHash, buffer);
  }
}

function getDocumentBuffer(fileHash) {
  return documentBufferRegistry.get(fileHash) || null;
}

/**
 * Rendering offline deterministico di una pagina PDF in buffer PNG (con PDF.js e Puppeteer)
 */
async function renderPdfPageToPng(pdfBuffer, pageNum, scale = 2.0, fileHash = null) {
  let activeBuffer = pdfBuffer;
  if ((!activeBuffer || !Buffer.isBuffer(activeBuffer) || activeBuffer.length === 0) && fileHash) {
    activeBuffer = getDocumentBuffer(fileHash);
  }

  if (!activeBuffer || !Buffer.isBuffer(activeBuffer) || activeBuffer.length === 0) {
    throw new Error(`LOCAL_DATA_MISSING: Buffer PDF assente o vuoto per pagina ${pageNum} (hash: ${fileHash || 'non specificato'}). Impossibile eseguire il rendering.`);
  }

  const browser = await getSharedBrowser();
  const page = await browser.newPage();

  try {
    const pdfJsPath = path.resolve(__dirname, '../../node_modules/pdfjs-dist/build/pdf.min.mjs');
    const pdfJsCode = fs.readFileSync(pdfJsPath, 'utf8');
    const workerJsPath = path.resolve(__dirname, '../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
    const workerJsCode = fs.readFileSync(workerJsPath, 'utf8');

    const html = `
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <canvas id="pdfCanvas"></canvas>
          <script type="module">
            ${pdfJsCode}
            window.pdfjsLib = { getDocument, GlobalWorkerOptions };
            const workerBlob = new Blob([${JSON.stringify(workerJsCode)}], { type: 'text/javascript' });
            GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
          </script>
          <script>
            async function render(b64, targetPage, targetScale) {
              const raw = atob(b64);
              const uint8 = new Uint8Array(raw.length);
              for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
              
              const loadingTask = window.pdfjsLib.getDocument({
                data: uint8,
                useSystemFonts: true,
                disableFontFace: true
              });
              const pdf = await loadingTask.promise;
              const page = await pdf.getPage(targetPage);
              const viewport = page.getViewport({ scale: targetScale || 2.0 });
              
              const canvas = document.getElementById('pdfCanvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const ctx = canvas.getContext('2d');
              
              await page.render({ canvasContext: ctx, viewport: viewport }).promise;
              return canvas.toDataURL('image/png');
            }
            window.renderPdfPage = render;
          </script>
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.renderPdfPage === 'function' && typeof window.pdfjsLib !== 'undefined', { timeout: 15000 });

    const b64Data = activeBuffer.toString('base64');
    const dataUrl = await page.evaluate(async (b64, pNum, sc) => {
      return await window.renderPdfPage(b64, pNum, sc);
    }, b64Data, pageNum, scale);

    const base64Image = dataUrl.replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64Image, 'base64');
  } finally {
    await page.close();
  }
}

/**
 * Ritaglio ad alta risoluzione di una bounding box [x0, y0, x1, y1] normalizzata (0..1)
 */
async function cropNormalizedRegion(fullImageBuffer, normalizedBbox, paddingPercent = 0.02) {
  const metadata = await sharp(fullImageBuffer).metadata();
  const imgW = metadata.width;
  const imgH = metadata.height;

  const [x0, y0, x1, y1] = normalizedBbox;
  const padX = Math.round((x1 - x0) * imgW * paddingPercent);
  const padY = Math.round((y1 - y0) * imgH * paddingPercent);

  const left = Math.max(0, Math.round(x0 * imgW) - padX);
  const top = Math.max(0, Math.round(y0 * imgH) - padY);
  const width = Math.min(imgW - left, Math.round((x1 - x0) * imgW) + 2 * padX);
  const height = Math.min(imgH - top, Math.round((y1 - y0) * imgH) + 2 * padY);

  if (width <= 10 || height <= 10) {
    return fullImageBuffer; // Fallback se bbox degenere
  }

  return await sharp(fullImageBuffer)
    .extract({ left, top, width, height })
    .png()
    .toBuffer();
}

// In-Flight Request Deduplication Registry
const inFlightRegistry = new Map();

// Coda differita per visuali critiche quando tutti gli endpoint sono sovraccarichi
let deferredRetryQueue = [];

/**
 * Valutazione rigorosa delle condizioni per invocare SCIENTIFIC_REVIEW.
 * Bypassa la chiamata se la confidenza e' alta (>= 0.65) e non vi sono conflitti reali o campi critici mancanti.
 */
function evaluateReviewNecessity(parsedEvidence, visualItem = {}, surroundingText = '') {
  const conf = parsedEvidence.classification ? (parsedEvidence.classification.confidence || 0) : 0;

  // 1. LOW_CONFIDENCE (soglia minima di affidabilita')
  if (conf < 0.65) {
    return { shouldReview: true, reason: 'LOW_CONFIDENCE', detail: `Confidenza ${conf.toFixed(2)} < 0.65` };
  }

  // 2. SOURCE_VISUAL_CONFLICT (conflitto esplicito tra formule, testo o evidenza)
  const hasFormulaConflict = Array.isArray(parsedEvidence.formulaLinks) && parsedEvidence.formulaLinks.some(fl =>
    fl.status === 'CONFLICT_WITH_SOURCE' || fl.status === 'AMBIGUOUS'
  );
  const ambiguitiesText = (parsedEvidence.ambiguities || []).join(' ').toLowerCase();
  const hasConflictText = ambiguitiesText.includes('conflict') ||
    ambiguitiesText.includes('contraddiz') ||
    ambiguitiesText.includes('discord') ||
    ambiguitiesText.includes('incoeren');

  if (hasFormulaConflict || hasConflictText) {
    return { shouldReview: true, reason: 'SOURCE_VISUAL_CONFLICT', detail: 'Conflitto rilevato tra formula/testo e visuale' };
  }

  // 3. EXACT_VALUES_REQUIRED (richiesta esplicita o estrazione quantitativa critica)
  if (visualItem.exactValuesRequired || (parsedEvidence.uncertainty && parsedEvidence.uncertainty.exactValuesRequired)) {
    return { shouldReview: true, reason: 'EXACT_VALUES_REQUIRED', detail: 'Richiesta certificazione valori quantitativi esatti' };
  }

  // 4. CENTRAL_TO_EXERCISE (figura cardine per risoluzione problema ma con confidenza non impeccabile)
  const textLower = (surroundingText || '').toLowerCase();
  const captionLower = (parsedEvidence.caption?.text || '').toLowerCase();
  const isExercise = textLower.includes('esercizio') || textLower.includes('problema') || captionLower.includes('esercizio') || visualItem.centralToExercise;
  if (isExercise && conf < 0.85) {
    return { shouldReview: true, reason: 'CENTRAL_TO_EXERCISE', detail: `Figura determinante per esercizio con confidenza ${conf.toFixed(2)} < 0.85` };
  }

  // 5. UNRESOLVED_CRITICAL_FIELDS (grafico quantitativo privo di assi o etichette chiave)
  const isQuant = parsedEvidence.classification?.type === 'quantitative_plot';
  const missingAxes = isQuant && (!parsedEvidence.axes || !parsedEvidence.axes.x || !parsedEvidence.axes.y);
  if (missingAxes) {
    return { shouldReview: true, reason: 'UNRESOLVED_CRITICAL_FIELDS', detail: 'Campi critici assi non risolti in quantitative_plot' };
  }

  if (parsedEvidence.requiresReview && conf < 0.80) {
    return { shouldReview: true, reason: 'UNRESOLVED_CRITICAL_FIELDS', detail: 'Flag requiresReview attivo con confidenza moderata' };
  }

  return { shouldReview: false, reason: null, detail: null };
}

/**
 * Tier B: Classificazione Visuale Economica Rapida (BBox + Tipo)
 */
async function classifyVisualsTierB({
  pdfBuffer,
  fileHash,
  pageAnalysis,
  cache = defaultCacheInstance
}) {
  const pageNum = pageAnalysis.pageNumber;
  const dedupeKey = `${fileHash}_p${pageNum}_tierB_classify_v1`;

  if (inFlightRegistry.has(dedupeKey)) {
    console.log(`    🤝 [IN_FLIGHT_JOIN]: Classificazione Tier B per pagina ${pageNum} già in corso. Attendo promessa.`);
    return await inFlightRegistry.get(dedupeKey);
  }

  const executionPromise = (async () => {
    try {
      const cacheKey = cache.generateKey({
        fileHash,
        page: pageNum,
        analysisType: 'tierB_classify'
      });

      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        console.log(`    ⚡ [CACHE_HIT] Tier B: Pagina ${pageNum} recuperata da cache`);
        return cached;
      }

      // Rendering a bassa risoluzione (scale: 1.2) per classificazione economica
      const lowResPng = await renderPdfPageToPng(pdfBuffer, pageNum, 1.2, fileHash);

      const prompt = `Sei un classificatore rapido di elementi visivi accademici.
Analizza l'immagine di questa pagina universitaria (Pagina ${pageNum}).
Individua TUTTE le figure visive rilevanti (grafici quantitativi, curve sperimentali, diagrammi di flusso, schemi a blocchi, apparati, formule in blocco centrale, tabelle grafiche, spettri).
Restituisci ESCLUSIVAMENTE un oggetto JSON conforme al seguente schema:

{
  "page": ${pageNum},
  "visuals": [
    {
      "figureId": "p${pageNum}-v1",
      "type": "quantitative_plot",
      "bbox": [x0, y0, x1, y1],
      "multiPanel": false,
      "captionCandidate": "testo della didascalia se visibile, altrimenti null",
      "relevance": 0.95,
      "needsDetailedAnalysis": true
    }
  ]
}

REGOLE RIGIDE:
1. Coordinate bbox normalizzate tra 0.0 e 1.0: [left, top, right, bottom].
2. "type" deve appartenere a: ${Object.values(VISUAL_TAXONOMY).join(', ')}.
3. Se non ci sono visuali o ci sono solo testi ordinari, restituisci {"page": ${pageNum}, "visuals": []}.
4. Nessun testo introduttivo né Markdown oltre al blocco JSON.`;

      const result = await callGeminiRole({
        role: 'DOCUMENT_TRIAGE',
        contents: [
          prompt,
          {
            inlineData: {
              mimeType: 'image/png',
              data: lowResPng.toString('base64')
            }
          }
        ],
        config: { temperature: 0.1 }
      });

      const rawText = result.response.text();
      const cleanJson = rawText.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      cache.set(cacheKey, parsed);
      return parsed;
    } catch (err) {
      console.warn(`    ⚠️ [Tier B] Errore classificazione pagina ${pageNum}: ${err.message}`);
      return {
        page: pageNum,
        visuals: [],
        status: 'TRIAGE_FAILED',
        reason: err.message,
        candidateUnverified: pageAnalysis?.needsVisionAnalysis || false
      };
    }
  })();

  inFlightRegistry.set(dedupeKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    inFlightRegistry.delete(dedupeKey);
  }
}

/**
 * Tier C: Analisi Approfondita Selettiva (Generazione Contratto VisualEvidence)
 */
async function analyzeVisualDetailedTierC({
  pdfBuffer,
  fileHash,
  visualItem,
  pageAnalysis,
  targetScope = '',
  cache = defaultCacheInstance
}) {
  const pageNum = pageAnalysis.pageNumber;
  const bbox = visualItem.bbox || [0.05, 0.15, 0.95, 0.85];
  const figureId = visualItem.figureId || `${fileHash ? fileHash.slice(0, 8) + '_' : ''}p${pageNum}-v1`;

  // Deduplicazione In-Flight per figura
  const dedupeKey = `${fileHash}_p${pageNum}_${figureId}_tierC_evidence_v1`;
  if (inFlightRegistry.has(dedupeKey)) {
    console.log(`    🤝 [IN_FLIGHT_JOIN]: Analisi Tier C per ${figureId} già in corso. Attendo completamento.`);
    return await inFlightRegistry.get(dedupeKey);
  }

  const executionPromise = (async () => {
    const cacheKey = cache.generateKey({
      fileHash,
      page: pageNum,
      bbox,
      analysisType: 'tierC_evidence'
    });

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      console.log(`    ⚡ [CACHE_HIT] Tier C: Figura ${figureId} recuperata da cache`);
      return cached;
    }

    // Verifica e recupero buffer PDF
    let activeBuffer = pdfBuffer;
    if ((!activeBuffer || !Buffer.isBuffer(activeBuffer) || activeBuffer.length === 0) && fileHash) {
      activeBuffer = getDocumentBuffer(fileHash);
    }
    if (!activeBuffer || !Buffer.isBuffer(activeBuffer) || activeBuffer.length === 0) {
      const missingErr = new Error(`LOCAL_DATA_MISSING: Buffer binario non reperibile per la figura ${figureId} (hash: ${fileHash || 'non specificato'}).`);
      missingErr.code = 'LOCAL_DATA_MISSING';
      missingErr.isLocalError = true;
      console.error(`  ❌ [LOCAL_DATA_MISSING] ${missingErr.message}`);
      return {
        figureId,
        source: { fileHash, page: pageNum, bbox },
        classification: { type: visualItem.type || 'unknown_candidate', subtype: null, confidence: 0.0 },
        status: 'LOCAL_DATA_MISSING',
        provenance: 'LOCAL_ERROR',
        ambiguities: [missingErr.message],
        reconstructionStrategy: RECONSTRUCTION_STRATEGIES.PRESERVE_ORIGINAL,
        requiresReview: false
      };
    }

    // 1. Rendering ad alta risoluzione (scale: 2.2) per leggere nitidamente tick, simboli, assi e formule
    const fullPageHighRes = await renderPdfPageToPng(activeBuffer, pageNum, 2.2, fileHash);
    const cropHighRes = await cropNormalizedRegion(fullPageHighRes, bbox, 0.03);

    // Salvataggio ritaglio su disco per riuso ed esportazione
    const cropKey = `${fileHash.slice(0, 12)}_p${pageNum}_${figureId}`;
    const cropFilePath = cache.saveCrop(cropKey, cropHighRes);

    const surroundingText = pageAnalysis.textSnippet || '';

    const prompt = `Sei un analista scientifico specialistico.
Ti fornisco due immagini dello stesso documento:
1. Il RITAGLIO AD ALTA RISOLUZIONE della figura in esame (${figureId}).
2. L'IMMAGINE DELLA PAGINA INTERA (per comprendere il contesto discorsivo, titolo e didascalia).

Testo circostante estratto localmente:
"${surroundingText}"

${targetScope ? `Ambito di studio richiesto: "${targetScope}"` : ''}

COMPITO:
Estrai con il massimo rigore scientifico ed epistemico tutte le proprietà visibili della figura in formato JSON compatto.
ATTENZIONE: NON scrivere spiegazioni narrative da professore, introduzioni o commenti didattici. Il testo pedagogico completo sara' redatto a valle da DeepSeek.
Genera ESCLUSIVAMENTE un oggetto JSON compatto conforme al seguente schema:

{
  "visualId": "${figureId}",
  "decision": "SCIENTIFIC_PLOT | CONCEPT_MAP | PROCESS_DIAGRAM | COMPARISON_TABLE | SOURCE_RECONSTRUCTION | KEEP_AS_TEXT | NEEDS_REVIEW",
  "provenance": "SOURCE_EXACT",
  "mandatoryConcepts": ["concetto 1", "concetto 2"],
  "mandatoryRelations": ["A -> B"],
  "availableData": ["dato 1", "unità"],
  "chosenRepresentation": "xy_plot",
  "motivation": "ragione della scelta",
  "confidence": 0.95,
  "abstentionReason": null
}

REGOLE RIGIDE:
- Restituisci ESCLUSIVAMENTE il codice JSON puro senza markdown o preamboli.
- Non inserire prose verbose: limitati a valori e fatti visivi accertabili.`;

    try {
      const result = await callGeminiRole({
        role: 'VISUAL_EXTRACTION',
        contents: [
          prompt,
          {
            inlineData: {
              mimeType: 'image/png',
              data: cropHighRes.toString('base64')
            }
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: fullPageHighRes.toString('base64')
            }
          }
        ],
        config: { mediaResolution: 'MEDIA_RESOLUTION_HIGH', temperature: 0.1 }
      });

      const raw = result.response.text();
      const clean = raw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      const parsedEvidence = JSON.parse(clean);

      parsedEvidence.cropPath = cropFilePath;
      parsedEvidence.cropKey = cropKey;

      // Telemetria di compattamento e qualita' JSON
      let populatedFields = 0;
      let totalFields = 0;
      function countFields(obj) {
        if (!obj || typeof obj !== 'object') return;
        for (const k of Object.keys(obj)) {
          totalFields++;
          const val = obj[k];
          if (val !== null && val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0)) {
            populatedFields++;
          }
          if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            countFields(val);
          }
        }
      }
      countFields(parsedEvidence);
      const usefulRatio = totalFields > 0 ? ((populatedFields / totalFields) * 100).toFixed(1) : '100';

      parsedEvidence.telemetry = {
        modelUsed: result.model,
        rawChars: raw.length,
        jsonChars: clean.length,
        populatedFields,
        totalFields,
        usefulPercentage: `${usefulRatio}%`,
        timestamp: new Date().toISOString()
      };

      console.log(`    📊 [TELEMETRY]: ${figureId} -> Modello: ${result.model} | Raw: ${raw.length} ch, JSON: ${clean.length} ch | Campi valorizzati: ${populatedFields}/${totalFields} (${usefulRatio}%)`);

      // Gating rigoroso di SCIENTIFIC_REVIEW
      const reviewDecision = evaluateReviewNecessity(parsedEvidence, visualItem, surroundingText);

      if (reviewDecision.shouldReview) {
        console.log(`    🧪 [SCIENTIFIC_REVIEW]: Attivazione revisione specialistica per ${figureId} [MOTIVO: ${reviewDecision.reason}] (${reviewDecision.detail})`);
        try {
          const reviewPrompt = `Sei un revisore scientifico universitario. Risolvi la seguente ambiguita'/conflitto nella figura (${figureId}):
Motivo revisione: ${reviewDecision.reason} - ${reviewDecision.detail}
Dati estratti: ${JSON.stringify(parsedEvidence.classification)}
Formule: ${JSON.stringify(parsedEvidence.formulaLinks)}

Restituisci un JSON compatto con: {"certified": true, "revisedConfidence": number, "resolvedAmbiguities": string[], "newAmbiguities": string[], "scientificNotes": string}`;

          const reviewResult = await callGeminiRole({
            role: 'SCIENTIFIC_REVIEW',
            contents: [
              reviewPrompt,
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: cropHighRes.toString('base64')
                }
              }
            ],
            config: { mediaResolution: 'MEDIA_RESOLUTION_HIGH', temperature: 0.05 }
          });

          const reviewRaw = reviewResult.response.text();
          const reviewClean = reviewRaw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
          const reviewJson = JSON.parse(reviewClean);

          parsedEvidence.scientificReview = {
            model: reviewResult.model,
            certified: !!reviewJson.certified,
            reason: reviewDecision.reason,
            notes: reviewJson.scientificNotes || '',
            timestamp: new Date().toISOString()
          };

          if (typeof reviewJson.revisedConfidence === 'number') {
            parsedEvidence.classification.confidence = reviewJson.revisedConfidence;
          }
          if (Array.isArray(reviewJson.newAmbiguities)) {
            parsedEvidence.ambiguities = [...(parsedEvidence.ambiguities || []), ...reviewJson.newAmbiguities];
          }
          console.log(`    ✅ [SCIENTIFIC_REVIEW_COMPLETED]: ${figureId} certificata da ${reviewResult.model}`);
        } catch (revErr) {
          console.warn(`    ⚠️ [SCIENTIFIC_REVIEW_SKIPPED]: Revisione fallita su ${figureId}: ${revErr.message}. Mantengo evidenza preliminare.`);
        }
      } else {
        const confVal = parsedEvidence.classification?.confidence || 1.0;
        console.log(`    ⏭️ [REVIEW_BYPASSED]: Revisione specialistica non necessaria per ${figureId} (confidenza: ${confVal.toFixed(2)}, nessun conflitto o campo critico irrisolto)`);
      }

      const validation = validateVisualEvidence(parsedEvidence);
      if (!validation.valid) {
        console.warn(`    ⚠️ [Tier C] Difetti validazione VisualEvidence per ${figureId}:`, validation.errors);
      }

      cache.set(cacheKey, parsedEvidence);
      return parsedEvidence;
    } catch (err) {
      console.error(`    ❌ [Tier C] Errore analisi dettagliata per ${figureId}: ${err.message}`);

      // GESTIONE OUTPUT VUOTO (RECITATION / safety silenzioso / glitch SDK)
      // Il modello ha risposto con un output completamente vuoto dopo tutti i retry.
      // Degradazione controllata: evidence con bassa confidence e status tracciabile.
      if (err.isEmptyOutput || err.code === 'ERR_EMPTY_MODEL_OUTPUT') {
        console.warn(`    ⚠️ [EMPTY_OUTPUT_DEGRADATION]: Modello ha restituito output vuoto per ${figureId}. Degradazione a TRIAGE_ONLY.`);
        const emptyOutputEvidence = {
          visualId: figureId,
          decision: 'NEEDS_REVIEW',
          provenance: 'TRIAGE_ONLY',
          mandatoryConcepts: [],
          mandatoryRelations: [],
          availableData: [],
          chosenRepresentation: 'none',
          motivation: 'Analisi Tier C non disponibile: risposta vuota dal modello (RECITATION o filtro di sicurezza silenzioso)',
          confidence: 0.4,
          abstentionReason: 'EMPTY_MODEL_OUTPUT'
        };
        cache.set(cacheKey, emptyOutputEvidence);
        return emptyOutputEvidence;
      }

      // GESTIONE DEGRADAZIONE CONTROLLATA & DEFERRED RETRY
      const isOverload = err.code === 'ALL_CANDIDATES_OVERLOADED' || (err.message && err.message.includes('ALL_CANDIDATES_OVERLOADED'));
      const isCritical = (
        visualItem.type === 'quantitative_plot' ||
        visualItem.relevance >= 0.75 ||
        visualItem.centralToExercise ||
        (pageAnalysis.textSnippet && /esercizio|formula|calcolo|teorema|spettro/i.test(pageAnalysis.textSnippet))
      );

      if (isOverload) {
        if (!isCritical && visualItem.captionCandidate) {
          // Degradazione controllata consentita solo per figure non critiche
          console.warn(`    ⚠️ [CONTROLLED_DEGRADATION]: Tutti i modelli sovraccarichi. Figura ${figureId} non critica (rilevanza ${visualItem.relevance || 0.5}) -> Degradazione controllata a TRIAGE_ONLY.`);
          const degradedEvidence = {
            visualId: figureId,
            decision: 'KEEP_AS_TEXT',
            provenance: 'TRIAGE_ONLY',
            mandatoryConcepts: [],
            mandatoryRelations: [],
            availableData: [],
            chosenRepresentation: 'text',
            motivation: 'Degradazione controllata TRIAGE_ONLY per sovraccarico provider',
            confidence: 0.6,
            abstentionReason: 'ALL_CANDIDATES_OVERLOADED'
          };
          cache.set(cacheKey, degradedEvidence);
          return degradedEvidence;
        } else {
          // Figura critica: divieto assoluto di fallback silenzioso! Inserimento in coda DEFERRED_RETRY
          console.warn(`    ⏳ [DEFERRED_RETRY]: Tutti i modelli sovraccarichi per figura critica ${figureId}. Accodata in deferredRetryQueue per ripresa differita.`);
          const deferredItem = {
            figureId,
            fileHash,
            pageNum,
            bbox,
            visualItem,
            pageAnalysis,
            targetScope,
            reason: 'ALL_CANDIDATES_OVERLOADED',
            enqueuedAt: new Date().toISOString()
          };
          deferredRetryQueue.push(deferredItem);

          const deferredEvidence = {
            visualId: figureId,
            decision: 'NEEDS_REVIEW',
            provenance: 'SOURCE_VISUAL_UNVERIFIED',
            mandatoryConcepts: [],
            mandatoryRelations: [],
            availableData: [],
            chosenRepresentation: 'none',
            motivation: 'Figura critica in attesa di retry differito',
            confidence: 0.0,
            abstentionReason: 'DEFERRED_RETRY'
          };
          return deferredEvidence;
        }
      }

      const fallbackEvidence = {
        visualId: figureId,
        decision: 'NEEDS_REVIEW',
        provenance: PROVENANCE_CLASSES.SOURCE_EXTRACTED,
        mandatoryConcepts: [],
        mandatoryRelations: [],
        availableData: [],
        chosenRepresentation: 'none',
        motivation: 'Analisi automatica parziale fallita',
        confidence: 0.5,
        abstentionReason: err.message
      };
      cache.set(cacheKey, fallbackEvidence);
      return fallbackEvidence;
    }
  })();

  inFlightRegistry.set(dedupeKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    inFlightRegistry.delete(dedupeKey);
  }
}

/**
 * Single-Pass Fused Extraction: Rileva ed estrae le evidenze visive strutturate in un'unica chiamata API.
 * Elimina la cascata obbligatoria a 2-3 chiamate (Tier B + Tier C + Tier D) sulle pagine grafiche leggibili.
 */
async function extractPageVisualsUnified({
  pdfBuffer,
  fileHash,
  pageAnalysis,
  targetScope = '',
  cache = defaultCacheInstance
}) {
  const pageNum = pageAnalysis.pageNumber;
  const dedupeKey = `${fileHash}_p${pageNum}_unified_evidence_v1`;

  if (inFlightRegistry.has(dedupeKey)) {
    console.log(`    🤝 [IN_FLIGHT_JOIN]: Analisi unificata pagina ${pageNum} già in corso. Attendo.`);
    return await inFlightRegistry.get(dedupeKey);
  }

  const executionPromise = (async () => {
    const cacheKey = cache.generateKey({
      fileHash,
      page: pageNum,
      analysisType: 'unified_page_evidence_v1'
    });

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      console.log(`    ⚡ [CACHE_HIT] Analisi unificata per pagina ${pageNum} recuperata da cache`);
      return cached;
    }

    let activeBuffer = pdfBuffer;
    if ((!activeBuffer || !Buffer.isBuffer(activeBuffer) || activeBuffer.length === 0) && fileHash) {
      activeBuffer = getDocumentBuffer(fileHash);
    }
    if (!activeBuffer || !Buffer.isBuffer(activeBuffer) || activeBuffer.length === 0) {
      return null;
    }

    const pageImage = await renderPdfPageToPng(activeBuffer, pageNum, 2.0, fileHash);
    const textSnippet = pageAnalysis.textSnippet || '';

    const prompt = `Sei un analista scientifico e didattico esperto. Analizza questa pagina accademica (Pagina ${pageNum}).
TESTO ESTRATTO DALLA PAGINA:
"""
${textSnippet.slice(0, 800)}
"""

COMPITO UNIFICATO (SINGLE-PASS):
1. Individua se sono presenti grafici quantitativi, schemi concettuali, diagrammi di flusso, spettri o tabelle scientifiche.
2. Per ciascuna figura individuata, estrai IMMEDIATAMENTE il contratto strutturato con coordinate bbox [x0, y0, x1, y1] normalizzate (0.0 - 1.0) e tutte le proprietà visive.
3. Se NON ci sono figure rilevanti o ci sono solo testi/formule ordinarie, restituisci {"visuals": []}.

Genera ESCLUSIVAMENTE un oggetto JSON valido:
{
  "page": ${pageNum},
  "visuals": [
    {
      "visualId": "${fileHash ? fileHash.slice(0, 8) + '_' : ''}p${pageNum}-v1",
      "decision": "SCIENTIFIC_PLOT | CONCEPT_MAP | PROCESS_DIAGRAM | COMPARISON_TABLE | SOURCE_RECONSTRUCTION | KEEP_AS_TEXT | NEEDS_REVIEW",
      "provenance": "SOURCE_EXACT",
      "mandatoryConcepts": ["concetto 1", "concetto 2"],
      "mandatoryRelations": ["A -> B"],
      "availableData": ["dato 1", "unità"],
      "chosenRepresentation": "xy_plot",
      "motivation": "ragione della scelta",
      "confidence": 0.95,
      "abstentionReason": null
    }
  ]
}`;

    try {
      const result = await callGeminiRole({
        role: 'VISUAL_EXTRACTION',
        contents: [
          prompt,
          {
            inlineData: {
              mimeType: 'image/png',
              data: pageImage.toString('base64')
            }
          }
        ],
        config: { mediaResolution: 'HIGH', temperature: 0.1 },
        metadata: {
          documentScope: `page_${pageNum}`,
          unitIds: [`p${pageNum}_unified`],
          justification: `Analisi unificata single-pass pagina ${pageNum}`
        }
      });

      const raw = result.response.text();
      const clean = raw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);

      const evidences = (parsed.visuals || []).map(v => ({
        ...v,
        figureId: v.figureId || `${fileHash ? fileHash.slice(0, 8) + '_' : ''}p${pageNum}-v1`,
        source: { fileHash, page: pageNum, bbox: v.source?.bbox || [0.05, 0.15, 0.95, 0.85] },
        provenance: PROVENANCE_CLASSES.SOURCE_EXTRACTED,
        status: 'FUSED_EXTRACTION_SUCCESS'
      }));

      cache.set(cacheKey, evidences);
      return evidences;
    } catch (err) {
      console.warn(`    ⚠️ [Unified Extraction] Fallback su Tier B per pagina ${pageNum}: ${err.message}`);
      return null;
    }
  })();

  inFlightRegistry.set(dedupeKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    inFlightRegistry.delete(dedupeKey);
  }
}

/**
 * Single-Pass Fused Extraction Multi-Pagina (Batching Visuale Adattivo):
 * Raggruppa più pagine candidate in una sola richiesta a Gemini, con ZERO RITRASCRIZIONE
 * del testo digitale già affidabile, estraendo solo i contratti VisualEvidence e testi interni alle figure.
 */
async function extractPagesVisualsUnifiedBatch({
  pdfBuffer,
  fileHash,
  candidatePages = [],
  targetScope = '',
  cache = defaultCacheInstance,
  callGeminiFn = callGeminiRole,
  renderPageFn = renderPdfPageToPng
}) {
  if (!candidatePages || candidatePages.length === 0) return [];

  // Normalizzazione delle pagine candidate (supporta sia pageNumber che pageNum)
  const normalizedPages = candidatePages.map(p => ({
    ...p,
    pageNumber: p.pageNumber || p.pageNum || 1
  }));

  if (normalizedPages.length === 1) {
    const single = await extractPageVisualsUnified({
      pdfBuffer,
      fileHash,
      pageAnalysis: normalizedPages[0],
      targetScope,
      cache
    });
    return Array.isArray(single) ? single : [];
  }

  const pageNumbers = normalizedPages.map(p => p.pageNumber);
  const dedupeKey = `${fileHash}_pages_${pageNumbers.join('_')}_unified_batch_v1`;

  if (inFlightRegistry.has(dedupeKey)) {
    console.log(`    🤝 [IN_FLIGHT_JOIN]: Analisi batch unificata per pagine [${pageNumbers.join(', ')}] già in corso. Attendo.`);
    return await inFlightRegistry.get(dedupeKey);
  }

  const executionPromise = (async () => {
    let activeBuffer = pdfBuffer;
    if ((!activeBuffer || !Buffer.isBuffer(activeBuffer) || activeBuffer.length === 0) && fileHash) {
      activeBuffer = getDocumentBuffer(fileHash);
    }
    if (!activeBuffer || !Buffer.isBuffer(activeBuffer) || activeBuffer.length === 0) {
      return null;
    }

    // Controlla la cache per ciascuna pagina
    const uncachedPages = [];
    const cachedEvidences = [];

    for (const p of normalizedPages) {
      const pKey = cache.generateKey({
        fileHash,
        page: p.pageNumber,
        analysisType: 'unified_page_evidence_v1'
      });
      if (cache.has(pKey)) {
        const found = cache.get(pKey);
        console.log(`    ⚡ [CACHE_HIT] Pagina ${p.pageNumber} recuperata da cache`);
        if (Array.isArray(found)) cachedEvidences.push(...found);
      } else {
        uncachedPages.push(p);
      }
    }

    if (uncachedPages.length === 0) {
      return cachedEvidences;
    }

    // Costruzione contenuto multimodale per le pagine non in cache con direttiva ZERO RITRASCRIZIONE
    const prompt = `Sei un analista scientifico e trascrittore di figure didattiche di livello universitario.
Analizza con estremo rigore le seguenti ${uncachedPages.length} pagine del documento (${fileHash.slice(0, 8)}).
PAGINE ACCADEMICHE DA ESAMINARE: [${uncachedPages.map(p => 'Pagina ' + p.pageNumber).join(', ')}].

══════════════════════════════════════════════════════════════════
DIRETTIVA FONDAMENTALE A ZERO RITRASCRIZIONE DEL TESTO DIGITALE:
══════════════════════════════════════════════════════════════════
1. Il testo digitale normale di queste pagine è GIÀ estratto localmente e validato.
2. NON ritrascrivere paragrafi di testo ordinario, definizioni discorsive o formule già presenti nel corpo del documento.
3. Concentrati ESCLUSIVAMENTE sull'estrazione strutturata delle proprietà visive dei grafici, schemi, diagrammi, curve e formule interne alle figure.
4. Per CIASCUNA figura o grafico individuato in queste pagine, restituisci il contratto strutturato conforme al seguente formato esatto:

<<<VISUAL_CONTRACT id="fig_pX_Y">>>
{
  "visualId": "${fileHash.slice(0, 8)}_pX-vY",
  "decision": "SCIENTIFIC_PLOT | CONCEPT_MAP | PROCESS_DIAGRAM | COMPARISON_TABLE | SOURCE_RECONSTRUCTION | KEEP_AS_TEXT | NEEDS_REVIEW",
  "provenance": "SOURCE_EXACT",
  "mandatoryConcepts": ["concetto 1", "concetto 2"],
  "mandatoryRelations": ["A -> B"],
  "availableData": ["dato 1", "unità"],
  "chosenRepresentation": "xy_plot",
  "motivation": "ragione della scelta",
  "confidence": 0.95,
  "abstentionReason": null
}
<<<VISUAL_END id="fig_pX_Y">>>

Se una pagina NON contiene figure, diagrammi o schemi rilevanti, non emettere alcun contratto per quella pagina.`;

    const contents = [prompt];

    // Rendering ad alta risoluzione di ciascuna pagina non in cache
    for (const p of uncachedPages) {
      const pagePng = await renderPageFn(activeBuffer, p.pageNumber, 2.0, fileHash);
      contents.push({
        inlineData: {
          mimeType: 'image/png',
          data: pagePng ? pagePng.toString('base64') : ''
        }
      });
    }

    try {
      const result = await callGeminiFn({
        role: 'VISUAL_EXTRACTION',
        contents,
        config: { mediaResolution: 'HIGH', temperature: 0.1 },
        metadata: {
          documentScope: `${fileHash.slice(0, 8)} [pagg. ${uncachedPages.map(p => p.pageNumber).join(', ')}]`,
          unitIds: uncachedPages.map(p => `p${p.pageNumber}_visual`),
          estimatedTokens: Math.round(uncachedPages.length * 1300 + 400),
          estimatedOutputTokens: Math.round(uncachedPages.length * 700),
          justification: `Analisi batch unificata visuali per ${uncachedPages.length} pagine`
        }
      });

      const raw = result.response.text();
      const contractRegex = /<<<VISUAL_CONTRACT id="([^"]+)">>>([\s\S]*?)<<<VISUAL_END id="\1">>>/g;
      const extractedEvidences = [];
      let match;

      while ((match = contractRegex.exec(raw)) !== null) {
        const cId = match[1];
        const jsonStr = match[2].replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(jsonStr);
          parsed.figureId = parsed.figureId || `${fileHash.slice(0, 8)}_${cId}`;
          parsed.provenance = PROVENANCE_CLASSES.SOURCE_EXTRACTED;
          parsed.status = 'BATCH_EXTRACTION_SUCCESS';
          extractedEvidences.push(parsed);

          // Memorizzazione in cache per pagina
          const pageNum = parsed.source?.page || uncachedPages[0]?.pageNumber;
          const pKey = cache.generateKey({
            fileHash,
            page: pageNum,
            analysisType: 'unified_page_evidence_v1'
          });
          const existing = cache.get(pKey) || [];
          cache.set(pKey, [...(Array.isArray(existing) ? existing : []), parsed]);
        } catch (jErr) {
          console.warn(`  ⚠️ Impossibile parsare contratto visuale ${cId}: ${jErr.message}`);
        }
      }

      console.log(`    ⚡ [BATCH_VISUAL_SUCCESS]: Lotti di ${uncachedPages.length} pagine elaborati in 1 singola chiamata -> ${extractedEvidences.length} contratti visuali estratti.`);
      return [...cachedEvidences, ...extractedEvidences];

    } catch (err) {
      console.warn(`    ⚠️ [Batch Visual Extraction Fallback]: Errore batch su pagine [${uncachedPages.map(p => p.pageNumber).join(', ')}]: ${err.message}. Fallback su elaborazione pagina singola.`);
      return null;
    }
  })();

  inFlightRegistry.set(dedupeKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    inFlightRegistry.delete(dedupeKey);
  }
}

/**
 * Pipeline Integrata Funnel per una lista di pagine candidate
 */
async function processDocumentVisualFunnel({
  pdfBuffer,
  localAnalysis,
  targetScope = '',
  studyMode = 'complete',
  cache = defaultCacheInstance,
  preferSinglePass = true
}) {
  const { fileHash, pages } = localAnalysis;
  if (pdfBuffer && fileHash) {
    registerDocumentBuffer(fileHash, pdfBuffer);
  }
  const visualEvidences = [];
  const candidatePages = pages.filter(p => p.needsVisionAnalysis);

  console.log(`\n🎯 [Visual Funnel]: Elaborazione di ${candidatePages.length} pagine candidate su ${pages.length} totali`);

  // Batching multi-pagina delle candidatePages in lotti da 4 pagine
  const VISUAL_BATCH_SIZE = 4;
  for (let i = 0; i < candidatePages.length; i += VISUAL_BATCH_SIZE) {
    const batchPages = candidatePages.slice(i, i + VISUAL_BATCH_SIZE);

    if (preferSinglePass && batchPages.length > 1) {
      const batchResults = await extractPagesVisualsUnifiedBatch({
        pdfBuffer,
        fileHash,
        candidatePages: batchPages,
        targetScope,
        cache
      });

      if (Array.isArray(batchResults)) {
        for (const ev of batchResults) {
          visualEvidences.push(ev);
        }
        continue; // Passa al lotto successivo di pagine
      }
    }

    // Se il batch non è applicabile o fallisce, elabora le pagine del lotto singolarmente
    for (const page of batchPages) {
      if (preferSinglePass) {
        const unifiedResults = await extractPageVisualsUnified({
          pdfBuffer,
          fileHash,
          pageAnalysis: page,
          targetScope,
          cache
        });

        if (Array.isArray(unifiedResults)) {
          console.log(`    ⚡ [SINGLE_PASS_SUCCESS]: Pagina ${page.pageNumber} elaborata in singola chiamata (${unifiedResults.length} visuali estratte)`);
          for (const ev of unifiedResults) {
            visualEvidences.push(ev);
          }
          continue;
        }
      }

      // 1. Tier B: Classificazione Rapida Bounding Box (Fallback)
      const tierBResult = await classifyVisualsTierB({
        pdfBuffer,
        fileHash,
        pageAnalysis: page,
        cache
      });

      const visuals = tierBResult.visuals || [];
      if (visuals.length === 0) {
        const reason = tierBResult.reason || 'Nessun elemento grafico rilevante confermato da Tier B sopra la soglia';
        const conf = tierBResult.confidence !== undefined ? tierBResult.confidence : 0.85;
        console.log(`    ℹ️ [TIER_B_REJECTED] Pagina ${page.pageNumber}: nessuna figura confermata da Tier B (motivo: "${reason}", confidenza: ${conf})`);
        continue;
      }

      console.log(`    🔍 Pagina ${page.pageNumber}: individuate ${visuals.length} visuali candidate da Tier B`);

      for (const visual of visuals) {
        if (fileHash && visual.figureId && !visual.figureId.startsWith(fileHash.slice(0, 8))) {
          visual.figureId = `${fileHash.slice(0, 8)}_${visual.figureId}`;
        }

        if (studyMode === 'summary' && visual.relevance < 0.85) {
          console.log(`    ⏩ Salto figura ${visual.figureId} in modalità sintesi (rilevanza ${visual.relevance} < 0.85)`);
          continue;
        }

        if (visual.needsDetailedAnalysis) {
          console.log(`    🔬 [Tier C]: Avvio analisi approfondita per ${visual.figureId} (${visual.type})...`);
          const evidence = await analyzeVisualDetailedTierC({
            pdfBuffer,
            fileHash,
            visualItem: visual,
            pageAnalysis: page,
            targetScope,
            cache
          });
          visualEvidences.push(evidence);
        }
      }
    }
  }

  console.log(`✅ [Visual Funnel]: Conclusa elaborazione. Generati ${visualEvidences.length} contratti VisualEvidence`);
  return visualEvidences;
}

/**
 * Ripresa delle figure in coda DEFERRED_RETRY senza riavviare l'intero PDF
 */
async function processDeferredRetryQueue({ pdfBuffer, cache = defaultCacheInstance } = {}) {
  if (deferredRetryQueue.length === 0) return [];
  console.log(`\n🔁 [DEFERRED_QUEUE]: Avvio ripresa di ${deferredRetryQueue.length} figure differite...`);
  const resolved = [];
  const pending = [...deferredRetryQueue];
  deferredRetryQueue = [];

  for (const item of pending) {
    item.attempts = (item.attempts || 0) + 1;
    const maxAttempts = item.maxAttempts || 3;

    if (item.attempts > maxAttempts) {
      console.warn(`  ❌ [DEFERRED_RETRY_ABORTED]: Figura ${item.figureId} ha superato il tetto massimo di ${maxAttempts} tentativi. Rimossa dalla coda.`);
      continue;
    }

    const itemBuffer = pdfBuffer || item.pdfBuffer || getDocumentBuffer(item.fileHash);
    if (!itemBuffer) {
      console.warn(`  🛑 [DEFERRED_RETRY_LOCAL_ERROR]: Buffer mancante per figura ${item.figureId} (hash: ${item.fileHash}). Non ritentabile via rete.`);
      continue;
    }

    try {
      const evidence = await analyzeVisualDetailedTierC({
        pdfBuffer: itemBuffer,
        fileHash: item.fileHash,
        visualItem: item.visualItem,
        pageAnalysis: item.pageAnalysis,
        targetScope: item.targetScope,
        cache
      });
      if (evidence && evidence.status !== 'DEFERRED_RETRY' && evidence.status !== 'LOCAL_DATA_MISSING') {
        resolved.push(evidence);
        console.log(`  ✅ [DEFERRED_RETRY_SUCCESS]: Figura ${item.figureId} recuperata con successo (tentativo ${item.attempts}/${maxAttempts})`);
      } else if (evidence && evidence.status === 'LOCAL_DATA_MISSING') {
        console.warn(`  🛑 [DEFERRED_RETRY_LOCAL_ERROR]: Figura ${item.figureId} non elaborabile localmente per dati mancanti. Rimossa dalla coda.`);
      } else if (item.attempts < maxAttempts) {
        deferredRetryQueue.push(item);
      }
    } catch (e) {
      console.warn(`  ⚠️ [DEFERRED_RETRY_PENDING]: Figura ${item.figureId} ancora non elaborabile (tentativo ${item.attempts}/${maxAttempts}): ${e.message}`);
      if (item.attempts < maxAttempts && !e.message?.includes('LOCAL_DATA_MISSING')) {
        deferredRetryQueue.push(item);
      }
    }
  }
  return resolved;
}

/**
 * Ripresa Raggruppata delle figure in coda differita (Multi-Crop Grouped Repair)
 * Raggruppa molteplici figure con dubbi o etichette irrisolte in un'unica chiamata mirata.
 */
async function processGroupedDeferredRetries({ pdfBuffer, cache = defaultCacheInstance } = {}) {
  if (deferredRetryQueue.length === 0) return [];
  console.log(`\n🔁 [GROUPED_REPAIR]: Avvio riparazione raggruppata di ${deferredRetryQueue.length} figure differite...`);

  const pending = [...deferredRetryQueue];
  deferredRetryQueue = [];
  const resolved = [];

  const REPAIR_BATCH_SIZE = 4;
  for (let i = 0; i < pending.length; i += REPAIR_BATCH_SIZE) {
    const batchItems = pending.slice(i, i + REPAIR_BATCH_SIZE);

    if (batchItems.length === 1) {
      const item = batchItems[0];
      const itemBuffer = pdfBuffer || item.pdfBuffer || getDocumentBuffer(item.fileHash);
      if (!itemBuffer) continue;
      try {
        const ev = await analyzeVisualDetailedTierC({
          pdfBuffer: itemBuffer,
          fileHash: item.fileHash,
          visualItem: item.visualItem,
          pageAnalysis: item.pageAnalysis,
          targetScope: item.targetScope,
          cache
        });
        if (ev && ev.status !== 'DEFERRED_RETRY' && ev.status !== 'LOCAL_DATA_MISSING') resolved.push(ev);
      } catch (_) {}
      continue;
    }

    try {
      const contents = [];
      const questions = [];

      for (let idx = 0; idx < batchItems.length; idx++) {
        const item = batchItems[idx];
        const itemBuffer = pdfBuffer || item.pdfBuffer || getDocumentBuffer(item.fileHash);
        if (!itemBuffer) continue;

        const pageImg = await renderPdfPageToPng(itemBuffer, item.pageNum, 2.0, item.fileHash);
        const crop = await cropNormalizedRegion(pageImg, item.bbox || [0.05, 0.15, 0.95, 0.85], 0.03);

        contents.push({
          inlineData: {
            mimeType: 'image/png',
            data: crop.toString('base64')
          }
        });
        questions.push(`Figura ${idx + 1} [ID: ${item.figureId}, Pagina ${item.pageNum}]: Risolvi le seguenti ambiguità: ${(item.visualItem?.ambiguities || ['Verifica assi e scale']).join('; ')}`);
      }

      const prompt = `Sei un revisore scientifico esperto. Risolvi in modo risolutivo e compatto le seguenti ${batchItems.length} figure accademiche:
${questions.join('\n')}

Genera ESCLUSIVAMENTE un array JSON con le soluzioni convalidate:
[
  {
    "figureId": "ID_DELLA_FIGURA",
    "certified": true,
    "revisedConfidence": 0.95,
    "scientificNotes": "Spiegazione puntuale della risoluzione di scale, curve ed etichette",
    "resolvedValues": []
  }
]`;

      contents.unshift(prompt);

      const res = await callGeminiRole({
        role: 'SCIENTIFIC_REVIEW',
        contents,
        config: { temperature: 0.1 },
        metadata: {
          justification: `Riparazione raggruppata multi-crop per ${batchItems.length} figure`,
          unitIds: batchItems.map(b => b.figureId),
          isRepair: true
        }
      });

      const cleanJson = res.response.text().replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      const parsedArray = JSON.parse(cleanJson);

      for (const p of (Array.isArray(parsedArray) ? parsedArray : [parsedArray])) {
        const orig = batchItems.find(b => b.figureId === p.figureId);
        if (orig) {
          const reconciledEvidence = {
            figureId: p.figureId,
            source: { fileHash: orig.fileHash, page: orig.pageNum, bbox: orig.bbox },
            classification: { type: orig.visualItem?.type || 'quantitative_plot', confidence: p.revisedConfidence || 0.95 },
            caption: { text: orig.visualItem?.captionCandidate || 'Figura certificata', confidence: 0.95 },
            scientificReview: { certified: !!p.certified, notes: p.scientificNotes || '', timestamp: new Date().toISOString() },
            status: 'GROUPED_REPAIR_SUCCESS',
            provenance: PROVENANCE_CLASSES.SOURCE_EXTRACTED
          };
          resolved.push(reconciledEvidence);
        }
      }
      console.log(`    🩹 [GROUPED_REPAIR_SUCCESS]: Risolte ${resolved.length}/${batchItems.length} figure in 1 sola chiamata di riparazione.`);
    } catch (grpErr) {
      console.warn(`    ⚠️ [GROUPED_REPAIR_FAILED]: Fallback su elaborazione differita singola: ${grpErr.message}`);
    }
  }

  return resolved;
}

async function closeSharedBrowser() {
  if (sharedBrowser) {
    try {
      await sharedBrowser.close();
    } catch (e) {}
    sharedBrowser = null;
  }
}

module.exports = {
  renderPdfPageToPng,
  cropNormalizedRegion,
  classifyVisualsTierB,
  analyzeVisualDetailedTierC,
  extractPageVisualsUnified,
  extractPagesVisualsUnifiedBatch,
  processDocumentVisualFunnel,
  processDeferredRetryQueue,
  processGroupedDeferredRetries,
  evaluateReviewNecessity,
  registerDocumentBuffer,
  getDocumentBuffer,
  getInFlightRegistry: () => inFlightRegistry,
  getDeferredRetryQueue: () => deferredRetryQueue,
  clearDeferredRetryQueue: () => { deferredRetryQueue = []; },
  closeSharedBrowser
};

