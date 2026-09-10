/**
 * StudyGenius Academic Intelligence System
 * src/planning/batchPlanner.js
 * 
 * Modulo di Inventario Locale Pre-Flight e Chunking Adattivo Dual-Bound.
 * 
 * Responsabilità:
 * 1. Costruzione dell'Inventario Locale Pre-Flight a costo zero token LLM.
 * 2. Stima della complessità per pagina (densità testo, formule matematiche, presenza grafici).
 * 3. Rilevazione dei legami semantici contigui (esercizi a cavallo pagina, teoremi con dimostrazione, grafici con didascalia).
 * 4. Algoritmo di Suddivisione Adattiva Dual-Bound:
 *    - Vincolo Input: limite token scorrevoli nel minuto (TPM prudenziale).
 *    - Vincolo Output: limite token di generazione (maxOutputTokens) con margine di sicurezza.
 *    - Dimensione variabile: da 1-4 pagine per dispense dense di formule/grafici fino a 12-16 pagine per appunti standard.
 * 5. Prompt strutturato a delimitatori univoci (<<<UNIT_START id="...">>> ... <<<UNIT_END id="...">>>)
 * 6. Riconciliazione parziale a manifesto (validazione unità per unità e salvataggio incrementale).
 * 7. Generazione di pacchetti chirurgici di continuazione per troncamenti MAX_TOKENS.
 */

const path = require('path');
const crypto = require('crypto');

// Complessità didattica stimata per pagina
const COMPLEXITY_LEVELS = {
  LOW: 'LOW',         // Pochi appunti, testo lineare, slide poco dense (~300-500 out tokens)
  MEDIUM: 'MEDIUM',   // Testo accademico standard, tabelle, 1 grafico (~800-1200 out tokens)
  HIGH: 'HIGH',       // Formule matematiche dense, reazioni chimiche, grafici complessi (~1500-2200 out tokens)
  EXTREME: 'EXTREME'  // Dimostrazioni dense interamente manoscritte, multi-grafici (~2500-3500 out tokens)
};

/**
 * Rileva la complessità e stima i token di una pagina
 */
function estimatePageComplexity(text = '', localPageAnalysis = null) {
  const clean = (text || '').trim();
  const len = clean.length;

  // Indicatori di formule e simboli matematici/chimici
  const mathIndicators = (clean.match(/(\\[a-zA-Z]+|\^|_|\{|\}|∫|∑|∏|√|∂|∆|≈|≠|≤|≥|→|⇄|⇌|\+|-|=)/g) || []).length;
  const hasFigureCandidate = localPageAnalysis?.needsVisionAnalysis || false;
  const figureCount = localPageAnalysis?.candidateBoxes?.length || (hasFigureCandidate ? 1 : 0);

  let complexity = COMPLEXITY_LEVELS.MEDIUM;
  let estimatedOutTokens = 1000;

  if (len < 150 && !hasFigureCandidate) {
    complexity = COMPLEXITY_LEVELS.LOW;
    estimatedOutTokens = 350;
  } else if (mathIndicators > 40 || figureCount >= 2 || (len > 1200 && mathIndicators > 20)) {
    complexity = COMPLEXITY_LEVELS.HIGH;
    estimatedOutTokens = 1800;
  } else if (mathIndicators > 80 || figureCount >= 3) {
    complexity = COMPLEXITY_LEVELS.EXTREME;
    estimatedOutTokens = 2600;
  } else if (len > 500 && mathIndicators <= 10 && !hasFigureCandidate) {
    complexity = COMPLEXITY_LEVELS.MEDIUM;
    estimatedOutTokens = 900;
  }

  // Token stimati in ingresso (PDF raster/immagine in alta risoluzione ~1200 tokens + testo)
  const estimatedInTokens = Math.round(1100 + (len / 4));

  return {
    complexity,
    estimatedInTokens,
    estimatedOutTokens,
    mathIndicators,
    figureCount
  };
}

/**
 * Rileva se una pagina ha un legame semantico forte con la pagina successiva
 * (es. esercizio o dimostrazione non conclusa, formule aperte, frasi troncate)
 */
function detectSemanticLinkToNext(text = '', pageNum = 1) {
  const clean = (text || '').trim();
  if (clean.length === 0) return false;

  // Frasi che terminano senza punto fermo o con virgola/due punti/trattino
  const endsUnfinished = /[:,;\-–—(]\s*$/.test(clean);

  // Indicatori di esercizio, teorema o problema in corso
  const hasExerciseOrProof = /(esercizio|problema|teorema|dimostrazione|esempio|svolgimento)\s*\d*[^.]*$/i.test(clean);

  // Parentesi o formule LaTeX non chiuse sulla stessa pagina
  const openParens = (clean.match(/\(/g) || []).length;
  const closeParens = (clean.match(/\)/g) || []).length;
  const openLatexBlock = (clean.match(/\\\[/g) || []).length;
  const closeLatexBlock = (clean.match(/\\\]/g) || []).length;

  const unbalanced = (openParens > closeParens) || (openLatexBlock > closeLatexBlock);

  return endsUnfinished || hasExerciseOrProof || unbalanced;
}

/**
 * Costruisce l'inventario locale del materiale da elaborare per un documento
 * 
 * @param {Object} params
 * @param {string} params.filename Nome del file sorgente
 * @param {string} params.fileHash Hash univoco del documento
 * @param {number} params.totalPages Numero di pagine totali
 * @param {Array<string>} [params.pageTexts] Testo digitale estratto per pagina (se disponibile)
 * @param {Object} [params.localAnalysis] Analisi locale prodotta da localAnalyzer
 * @param {boolean} [params.isScanned] Se il documento è una scansione/manoscritto
 * @returns {Array<Object>} Lista delle MaterialUnit
 */
function buildDocumentInventory({
  filename,
  fileHash,
  totalPages = 1,
  pageTexts = [],
  localAnalysis = null,
  isScanned = false
}) {
  const units = [];
  const cleanDocHash = fileHash ? fileHash.slice(0, 10) : crypto.createHash('md5').update(filename).digest('hex').slice(0, 10);

  for (let p = 1; p <= totalPages; p++) {
    const pText = pageTexts[p - 1] || '';
    const pageLocal = localAnalysis?.pages ? localAnalysis.pages.find(item => item.pageNumber === p) : null;

    const hasNativeText = pText.trim().length > 60;
    const needsVision = isScanned || !hasNativeText || (pageLocal?.needsVisionAnalysis || false);

    const { complexity, estimatedInTokens, estimatedOutTokens, mathIndicators, figureCount } = estimatePageComplexity(pText, pageLocal);
    const hasLinkToNext = p < totalPages ? detectSemanticLinkToNext(pText, p) : false;

    const unitId = `${cleanDocHash}_p${p}`;

    units.push({
      unitId,
      sourceFilename: filename,
      sourceDocHash: cleanDocHash,
      pageNumber: p,
      hasNativeText,
      nativeTextSnippet: hasNativeText ? pText.slice(0, 200) : '',
      needsVision,
      isScanned,
      complexity,
      mathIndicators,
      figureCount,
      estimatedInTokens,
      estimatedOutTokens,
      hasLinkToNext,
      isCached: false
    });
  }

  return units;
}

/**
 * Algoritmo di Suddivisione Adattiva Dual-Bound:
 * Compone pacchetti ottimizzati rispettando contemporaneamente i limiti di input (TPM)
 * e i limiti di output (maxOutputTokens), preservando i legami semantici contigui.
 * 
 * @param {Array<Object>} units Lista di MaterialUnit
 * @param {Object} options
 * @param {number} [options.maxInputTokensPerBatch=70000] Limite prudenziale input per batch
 * @param {number} [options.maxOutputTokensPerBatch=12000] Limite desiderato output per batch (lascia margine su 16k)
 * @param {number} [options.maxPagesCap=16] Massimo pagine consentite per batch a bassa complessità
 * @returns {Array<Object>} Lista di AdaptiveBatch
 */
function composeAdaptiveBatches(units = [], options = {}) {
  const {
    maxInputTokensPerBatch = 70000,
    maxOutputTokensPerBatch = 12000,
    maxPagesCap = 16
  } = options;

  // Considera solo le unità che richiedono elaborazione remota (Vision o Trascrizione)
  const pendingUnits = units.filter(u => u.needsVision && !u.isCached);
  if (pendingUnits.length === 0) return [];

  const batches = [];
  let currentBatchUnits = [];
  let currentInputTokens = 0;
  let currentOutputTokens = 0;

  for (let i = 0; i < pendingUnits.length; i++) {
    const unit = pendingUnits[i];
    const isFirstInBatch = currentBatchUnits.length === 0;

    // Determina il tetto dinamico di pagine per questo blocco in base alla complessità
    let dynamicPageLimit = maxPagesCap;
    if (unit.complexity === COMPLEXITY_LEVELS.EXTREME) dynamicPageLimit = 4;
    else if (unit.complexity === COMPLEXITY_LEVELS.HIGH) dynamicPageLimit = 8;
    else if (unit.complexity === COMPLEXITY_LEVELS.MEDIUM) dynamicPageLimit = 12;

    const wouldExceedInput = (currentInputTokens + unit.estimatedInTokens) > maxInputTokensPerBatch;
    const wouldExceedOutput = (currentOutputTokens + unit.estimatedOutTokens) > maxOutputTokensPerBatch;
    const wouldExceedPages = currentBatchUnits.length >= dynamicPageLimit;

    // Se il blocco sfora i vincoli e non è il primo elemento, chiudi il blocco corrente
    if (!isFirstInBatch && (wouldExceedInput || wouldExceedOutput || wouldExceedPages)) {
      // Controllo legame semantico: se l'ultimo elemento era legato a questo e non sforiamo gravemente l'output, estendi di 1
      const lastUnit = currentBatchUnits[currentBatchUnits.length - 1];
      const canSafelyExtend = lastUnit.hasLinkToNext && (currentOutputTokens + unit.estimatedOutTokens) <= (maxOutputTokensPerBatch * 1.35);

      if (!canSafelyExtend) {
        batches.push(createBatchObject(currentBatchUnits));
        currentBatchUnits = [];
        currentInputTokens = 0;
        currentOutputTokens = 0;
      }
    }

    currentBatchUnits.push(unit);
    currentInputTokens += unit.estimatedInTokens;
    currentOutputTokens += unit.estimatedOutTokens;
  }

  if (currentBatchUnits.length > 0) {
    batches.push(createBatchObject(currentBatchUnits));
  }

  return batches;
}

/**
 * Crea l'oggetto AdaptiveBatch completo
 */
function createBatchObject(units) {
  const startPage = units[0].pageNumber;
  const endPage = units[units.length - 1].pageNumber;
  const docHash = units[0].sourceDocHash;
  const filename = units[0].sourceFilename;

  const totalIn = units.reduce((acc, u) => acc + u.estimatedInTokens, 0) + 500; // +500 prompt
  const totalOut = units.reduce((acc, u) => acc + u.estimatedOutTokens, 0);

  // maxOutputTokens dinamico con margine di sicurezza del 50%, scalabile fino a 65.536 tokens supportati dal modello
  const modelOutputCeiling = 65536;
  const suggestedMaxOutput = Math.min(modelOutputCeiling, Math.max(4096, Math.round(totalOut * 1.5)));

  return {
    batchId: `batch_${docHash}_p${startPage}_p${endPage}`,
    sourceFilename: filename,
    sourceDocHash: docHash,
    startPage,
    endPage,
    pageCount: units.length,
    unitIds: units.map(u => u.unitId),
    units,
    estimatedInputTokens: totalIn,
    estimatedOutputTokens: totalOut,
    suggestedMaxOutputTokens: suggestedMaxOutput,
    displayName: `${filename} [Pagine ${startPage}-${endPage} (${units.length} pag.)]`
  };
}

/**
 * Costruisce il prompt strutturato con delimitatori formali per manifesto di unità
 */
function buildBatchVisionPrompt(batch) {
  const unitListStr = batch.units.map(u => `  - Unità ID: "${u.unitId}" (Pagina ${u.pageNumber}, complessità stimata: ${u.complexity})`).join('\n');

  return `Sei un trascrittore, analista didattico ed estrattore scientifico di massimo livello accademico.
Analizza con estrema precisione questo estratto documentale (${batch.displayName}).

Questo blocco contiene le seguenti ${batch.pageCount} unità didattiche da elaborare:
${unitListStr}

══════════════════════════════════════════════════════════════════
REGOLE FORMALI DI DELIMITAZIONE E STRUTTURA (OBBLIGATORIE):
══════════════════════════════════════════════════════════════════
1. Per CIASCUNA unità richiesta, racchiudi la trascrizione completa tra i delimitatori formali:
   <<<UNIT_START id="UNIT_ID">>>
   # === ESTRATTO FEDELE: [Nome File] (Pagina X) ===
   [Trascrizione integrale e fedele di tutto il testo, definizioni, teoremi e problemi]
   <<<UNIT_END id="UNIT_ID">>>

2. RIGORE SCIENTIFICO E FORMULE:
   - Tutte le formule matematiche e reazioni chimiche devono essere convertite in LaTeX impeccabile:
     \\( ... \\) per formule in riga, \\[ ... \\] per formule in blocco.
   - Non omettere passaggi algebrici, calcoli o costanti.

3. FIGURE E GRAFICI SCIENTIFICI (CONTRATTO VISUALE UNIFICATO):
   Se nella pagina è presente un grafico, schema o diagramma, inserisci IMMEDIATAMENTE dopo il testo della pagina il blocco contrattuale:
   <<<VISUAL_CONTRACT id="fig_pX_1">>>
   {
     "figureId": "fig_pX_1",
     "source": { "page": X },
     "classification": { "type": "quantitative_plot", "subtype": "es. titration_curve o schema_pompa" },
     "caption": { "text": "didascalia o titolo della figura" },
     "axes": { "x": { "label": "asse x", "unit": "unità" }, "y": { "label": "asse y", "unit": "unità" } },
     "series": [ { "name": "Curva 1", "representation": "line" } ],
     "qualitativeObservations": [ "andamento qualitativo osservabile" ],
     "formulaLinks": [ { "formula": "legge matematica correlata" } ],
     "ambiguities": [],
     "reconstructionStrategy": "REDRAW_FROM_FORMULA_DATA",
     "requiresReview": false
   }
   <<<VISUAL_END id="fig_pX_1">>>

4. INTEGRITÀ: Elabora TUTTE le unità elencate. Non saltare nessuna unità e non interrompere a metà.`;
}

/**
 * Riconcilia la risposta ricevuta con il manifesto delle unità richieste
 * Verifica il contenuto per ciascuna unità e isola successi e omissioni
 */
function reconcileBatchResponse(batch, responseText) {
  const completedUnits = [];
  const missingUnitIds = [];
  const visualContracts = [];

  if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
    return {
      completedUnits: [],
      missingUnitIds: [...batch.unitIds],
      visualContracts: [],
      isFullyComplete: false,
      reason: 'RISPOSTA_VUOTA'
    };
  }

  // Estrazione contratti visuali
  const contractRegex = /<<<VISUAL_CONTRACT id="([^"]+)">>>([\s\S]*?)<<<VISUAL_END id="\1">>>/g;
  let contractMatch;
  while ((contractMatch = contractRegex.exec(responseText)) !== null) {
    const cId = contractMatch[1];
    const rawJson = contractMatch[2].trim();
    try {
      const cleanJson = rawJson.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      visualContracts.push({ contractId: cId, ...parsed });
    } catch (_) {
      console.warn(`  ⚠️ Contratto visuale ${cId} non valido come JSON.`);
    }
  }

  // Estrazione unità di testo
  const unitRegex = /<<<UNIT_START id="([^"]+)">>>([\s\S]*?)<<<UNIT_END id="\1">>>/g;
  const extractedUnitMap = new Map();
  let unitMatch;

  while ((unitMatch = unitRegex.exec(responseText)) !== null) {
    const uId = unitMatch[1];
    const content = unitMatch[2].trim();
    extractedUnitMap.set(uId, content);
  }

  // Controllo di completezza per ogni unità richiesta
  for (const expectedId of batch.unitIds) {
    const unitDef = batch.units.find(u => u.unitId === expectedId);
    const content = extractedUnitMap.get(expectedId);

    if (!content || content.length < 30) {
      missingUnitIds.push(expectedId);
      continue;
    }

    // Controlli mirati di qualità sul contenuto
    const openParens = (content.match(/\\\(|\\\[/g) || []).length;
    const closeParens = (content.match(/\\\)|\\\]/g) || []).length;
    const isLatexBalanced = Math.abs(openParens - closeParens) <= 1; // tolleranza minima

    completedUnits.push({
      unitId: expectedId,
      sourceFilename: unitDef?.sourceFilename || batch.sourceFilename,
      pageNumber: unitDef?.pageNumber,
      content,
      isLatexBalanced,
      charCount: content.length,
      validated: true
    });
  }

  // Se i delimitatori non sono stati rispettati ma il testo è molto lungo, fallback permissivo
  if (completedUnits.length === 0 && responseText.length > 200 && batch.unitIds.length === 1) {
    const singleId = batch.unitIds[0];
    completedUnits.push({
      unitId: singleId,
      sourceFilename: batch.sourceFilename,
      pageNumber: batch.startPage,
      content: responseText.trim(),
      isLatexBalanced: true,
      charCount: responseText.length,
      validated: true,
      fallbackUsed: true
    });
    return {
      completedUnits,
      missingUnitIds: [],
      visualContracts,
      isFullyComplete: true
    };
  }

  return {
    completedUnits,
    missingUnitIds,
    visualContracts,
    isFullyComplete: missingUnitIds.length === 0
  };
}

/**
 * Individua l'ultimo ancoraggio semantico completo e verificabile in una risposta troncata
 * (es. ultima unità chiusa, ultimo blocco formula centrato \] o ultimo paragrafo concluso).
 * Evita di riprendere a metà formula, prevenendo duplicazioni o sintassi LaTeX corrotta.
 */
function findLastCompleteSemanticAnchor(truncatedText = '') {
  if (!truncatedText || typeof truncatedText !== 'string') return null;

  // 1. Ultima unità didattica formalmente conclusa
  const lastUnitEnd = truncatedText.lastIndexOf('<<<UNIT_END');
  if (lastUnitEnd !== -1) {
    const match = truncatedText.slice(lastUnitEnd).match(/<<<UNIT_END id="([^"]+)">>>/);
    if (match) {
      return {
        type: 'UNIT_END',
        unitId: match[1],
        position: lastUnitEnd + match[0].length,
        anchorSnippet: `Unità convalidata: <<<UNIT_END id="${match[1]}">>>`
      };
    }
  }

  // 2. Ultimo blocco formula centrato chiuso \]
  const lastLatexBlock = truncatedText.lastIndexOf('\\]');
  if (lastLatexBlock !== -1 && lastLatexBlock > truncatedText.length - 1500) {
    const snippet = truncatedText.slice(Math.max(0, lastLatexBlock - 120), lastLatexBlock + 2).trim();
    return {
      type: 'LATEX_BLOCK',
      position: lastLatexBlock + 2,
      anchorSnippet: snippet
    };
  }

  // 3. Ultimo paragrafo concluso con punto fermo
  const lastSentence = truncatedText.lastIndexOf('.\n');
  if (lastSentence !== -1 && lastSentence > truncatedText.length - 1000) {
    const snippet = truncatedText.slice(Math.max(0, lastSentence - 120), lastSentence + 2).trim();
    return {
      type: 'PARAGRAPH_END',
      position: lastSentence + 2,
      anchorSnippet: snippet
    };
  }

  return null;
}

/**
 * Costruisce un pacchetto di riparazione chirurgica per le unità residue non completate,
 * ancorando la ripresa all'ultimo blocco semantico completo.
 */
function createSurgicalContinuationBatch(originalBatch, missingUnitIds, truncatedText = '') {
  const remainingUnits = originalBatch.units.filter(u => missingUnitIds.includes(u.unitId));
  if (remainingUnits.length === 0) return null;

  const continuationBatch = createBatchObject(remainingUnits);
  continuationBatch.isRepair = true;
  continuationBatch.originalBatchId = originalBatch.batchId;
  continuationBatch.displayName = `${originalBatch.sourceFilename} [RIPARAZIONE CHIRURGICA: ${remainingUnits.map(u => 'p.' + u.pageNumber).join(', ')}]`;

  const semanticAnchor = findLastCompleteSemanticAnchor(truncatedText);
  continuationBatch.semanticAnchor = semanticAnchor;

  return continuationBatch;
}

module.exports = {
  COMPLEXITY_LEVELS,
  estimatePageComplexity,
  detectSemanticLinkToNext,
  buildDocumentInventory,
  composeAdaptiveBatches,
  buildBatchVisionPrompt,
  reconcileBatchResponse,
  findLastCompleteSemanticAnchor,
  createSurgicalContinuationBatch
};
