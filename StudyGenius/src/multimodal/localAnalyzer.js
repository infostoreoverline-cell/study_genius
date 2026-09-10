/**
 * StudyGenius Academic Intelligence System
 * src/multimodal/localAnalyzer.js
 * 
 * Fase Locale Preliminare a ZERO TOKEN LLM.
 * 
 * Responsabilità:
 * 1. Verifica MIME reale e calcolo Hash crittografico SHA-256 del documento e delle pagine.
 * 2. Estrazione deterministica di testo, coordinate spaziali e ordine di lettura.
 * 3. Rilevamento di primitive vettoriali (linee, curve, assi) e immagini raster incorporate (XObject).
 * 4. Individuazione didascalie ("Figura", "Grafico", "Tabella", "Schema") e riferimenti incrociati.
 * 5. Classificazione Tier A (Text-only vs Figure candidates):
 *    Le pagine puramente testuali vengono escluse categoricamente da Gemini Vision (zero token!).
 */

const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');

// Cache del modulo pdfjs-dist (legacy build per Node.js)
let pdfjsLibPromise = null;
async function getPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then(m => m.default || m);
  }
  return pdfjsLibPromise;
}

const TIER_A_CLASSES = {
  TEXT_ONLY: 'TEXT_ONLY',
  FORMULAS_ONLY: 'FORMULAS_ONLY',
  HAS_TABLE: 'HAS_TABLE',
  HAS_FIGURE_CANDIDATE: 'HAS_FIGURE_CANDIDATE',
  MULTI_PANEL_CANDIDATE: 'MULTI_PANEL_CANDIDATE',
  UNCERTAIN: 'UNCERTAIN'
};

const CAPTION_REGEX = /\b(figura|grafico|diagramma|schema|tabella|fig\.)\s*([0-9a-zA-Z\.\-_]+)?/i;
const CROSS_REF_REGEX = /\b(si veda|come mostrato in|vedi|cfr\.|illustrato in)\s+(figura|grafico|diagramma|fig\.)\s*([0-9a-zA-Z\.\-_]+)?/i;

/**
 * Calcola l'hash SHA-256 di un buffer
 */
function calculateSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Valuta l'affidabilità dell'estrazione deterministica del testo (rilevamento glifi corrotti o ordine saltato)
 */
function calculateTextReliability(textItems = [], fullPageText = '') {
  if (!fullPageText || fullPageText.length === 0) {
    return { reliability: 1.0, isReliable: true, reasons: [] };
  }

  const reasons = [];
  let penalty = 0;

  // 1. Controllo caratteri di sostituzione / glifi corrotti (\ufffd)
  const replacementChars = (fullPageText.match(/\ufffd/g) || []).length;
  if (replacementChars > 0) {
    const ratio = replacementChars / fullPageText.length;
    if (ratio > 0.015) {
      penalty += 0.45;
      reasons.push(`Glifi corrotti/sostituiti nel font nativo (${replacementChars} occorrenze)`);
    }
  }

  // 2. Controllo frammentazione anomala (troppi elementi isolati a singolo carattere)
  if (textItems.length > 25) {
    const singleCharItems = textItems.filter(item => item.str && item.str.trim().length === 1).length;
    const singleRatio = singleCharItems / textItems.length;
    if (singleRatio > 0.65) {
      penalty += 0.35;
      reasons.push(`Frammentazione anomala del testo (${Math.round(singleRatio * 100)}% elementi a singolo carattere)`);
    }
  }

  // 3. Controllo caratteri di controllo ASCII anomali
  const controlChars = (fullPageText.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
  if (controlChars > 5) {
    penalty += 0.3;
    reasons.push(`Caratteri di controllo anomali presenti (${controlChars})`);
  }

  const reliability = Math.max(0.0, Math.min(1.0, 1.0 - penalty));
  return {
    reliability,
    isReliable: reliability >= 0.75,
    reasons
  };
}

/**
 * Analisi locale deterministica a zero token per un intero PDF
 * 
 * @param {Buffer} pdfBuffer Buffer binario del file PDF
 * @param {string} filename Nome file sorgente
 * @returns {Promise<Object>} Risultato strutturato dell'analisi locale
 */
async function analyzeDocumentLocally(pdfBuffer, filename = 'document.pdf') {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    throw new Error('Buffer PDF non valido o vuoto');
  }

  const fileHash = calculateSha256(pdfBuffer);
  const pdfjs = await getPdfJs();

  // 1. Ispezione strutturale di base con pdf-lib (integrità, cifratura, numero pagine)
  let srcDoc;
  let totalPages = 1;
  try {
    srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    totalPages = srcDoc.getPageCount();
  } catch (err) {
    console.warn(`  ⚠️ localAnalyzer: Errore caricamento con pdf-lib per ${filename}: ${err.message}`);
  }

  // 2. Caricamento con PDF.js per estrazione coordinate e primitive
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    disableFontFace: true
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages || totalPages;

  const pagesAnalysis = [];
  let excludedFromVisionCount = 0;
  let figureCandidatesCount = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const { width, height } = viewport;

    // Estrazione testo con coordinate
    const textContent = await page.getTextContent();
    const textItems = [];
    let fullPageText = '';

    for (const item of textContent.items) {
      if (typeof item.str === 'string' && item.str.trim().length > 0) {
        textItems.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
          height: item.height || 0,
          normalizedBbox: [
            Math.max(0, Math.min(1, item.transform[4] / width)),
            Math.max(0, Math.min(1, 1 - (item.transform[5] + (item.height || 0)) / height)),
            Math.max(0, Math.min(1, (item.transform[4] + (item.width || 0)) / width)),
            Math.max(0, Math.min(1, 1 - item.transform[5] / height))
          ]
        });
        fullPageText += item.str + ' ';
      }
    }

    fullPageText = fullPageText.trim();
    const charCount = fullPageText.length;

    // Ispezione operatori grafici (tracciati vettoriali e immagini)
    let vectorPathOpsCount = 0;
    let imageOpsCount = 0;

    try {
      const opList = await page.getOperatorList();
      const fnArray = opList.fnArray || [];
      const OPS = pdfjs.OPS || {};

      for (let i = 0; i < fnArray.length; i++) {
        const op = fnArray[i];
        if (
          op === OPS.paintImageXObject ||
          op === OPS.paintInlineImageXObject ||
          op === OPS.paintImageMaskXObject
        ) {
          imageOpsCount++;
        } else if (
          op === OPS.constructPath ||
          op === OPS.stroke ||
          op === OPS.fill ||
          op === OPS.eoFill ||
          op === OPS.lineTo ||
          op === OPS.curveTo
        ) {
          vectorPathOpsCount++;
        }
      }
    } catch (opErr) {
      // Fallback permissivo in caso di getOperatorList fallito
      vectorPathOpsCount = 0;
    }

    // Ricerca segnali didascalie e riferimenti
    const hasCaption = CAPTION_REGEX.test(fullPageText);
    const hasCrossRef = CROSS_REF_REGEX.test(fullPageText);

    // Bounding box delle didascalie candidate
    let candidateCaption = null;
    const captionMatch = fullPageText.match(CAPTION_REGEX);
    if (captionMatch) {
      const startIdx = fullPageText.indexOf(captionMatch[0]);
      candidateCaption = fullPageText.slice(startIdx, Math.min(fullPageText.length, startIdx + 200)).trim();
    }

    // Valutazione affidabilità testo locale per prevenire falsi negativi
    const textQuality = calculateTextReliability(textItems, fullPageText);
    const isTextReliable = textQuality.isReliable;

    // Calcolo densità e classificazione Tier A
    let tierAClass = TIER_A_CLASSES.UNCERTAIN;
    let needsVisionAnalysis = false;
    let reason = '';

    const hasImages = imageOpsCount > 0;
    const hasDenseVectors = vectorPathOpsCount > 25; // Curve, assi cartesiani, grafici vettoriali
    const isDenseText = charCount > 450;

    if (!isTextReliable && charCount > 40) {
      // Testo nativo corrotto o frammentato: non fidarsi del solo canale locale!
      tierAClass = TIER_A_CLASSES.UNCERTAIN;
      needsVisionAnalysis = true;
      reason = `Testo digitale non affidabile (${textQuality.reasons.join(', ')}): richiesta lettura visiva`;
    } else if (hasImages && hasCaption) {
      tierAClass = imageOpsCount > 1 ? TIER_A_CLASSES.MULTI_PANEL_CANDIDATE : TIER_A_CLASSES.HAS_FIGURE_CANDIDATE;
      needsVisionAnalysis = true;
      reason = 'Immagine/i raster con didascalia esplicita';
    } else if (hasDenseVectors && (hasCaption || hasCrossRef || charCount < 800)) {
      tierAClass = TIER_A_CLASSES.HAS_FIGURE_CANDIDATE;
      needsVisionAnalysis = true;
      reason = 'Alta densità di primitive vettoriali con didascalia/riferimento o spazio libero';
    } else if (hasImages && !hasCaption) {
      tierAClass = imageOpsCount > 2 ? TIER_A_CLASSES.MULTI_PANEL_CANDIDATE : TIER_A_CLASSES.HAS_FIGURE_CANDIDATE;
      needsVisionAnalysis = true;
      reason = 'Immagine/i raster presenti (senza didascalia testuale formale)';
    } else if (hasDenseVectors && !hasImages) {
      // Protezione falsi negativi: grafici vettoriali (senza immagini raster)
      tierAClass = TIER_A_CLASSES.HAS_FIGURE_CANDIDATE;
      needsVisionAnalysis = true;
      reason = `Tracciati vettoriali significativi rilevati (${vectorPathOpsCount} operazioni): possibile grafico vettoriale`;
    } else if (isDenseText && !hasImages && vectorPathOpsCount < 20 && !hasCaption && isTextReliable) {
      tierAClass = TIER_A_CLASSES.TEXT_ONLY;
      needsVisionAnalysis = false;
      reason = 'Pagina ad alta densità testuale senza immagini né primitive grafiche';
    } else if (charCount > 100 && (fullPageText.includes('$$') || fullPageText.includes('\\int') || fullPageText.includes('\\sum')) && !hasImages && vectorPathOpsCount < 25 && isTextReliable) {
      tierAClass = TIER_A_CLASSES.FORMULAS_ONLY;
      needsVisionAnalysis = false;
      reason = 'Formule matematiche native senza figure grafiche';
    } else if (fullPageText.toLowerCase().includes('tabella') && !hasImages && vectorPathOpsCount < 20 && isTextReliable) {
      tierAClass = TIER_A_CLASSES.HAS_TABLE;
      needsVisionAnalysis = false;
      reason = 'Struttura tabulare gestibile dal canale testuale';
    } else {
      // Incertezza (es. slide con poco testo o schemi non standard) -> da verificare con Tier B economico
      tierAClass = TIER_A_CLASSES.UNCERTAIN;
      needsVisionAnalysis = (vectorPathOpsCount > 15 || charCount < 300);
      reason = needsVisionAnalysis ? 'Poco testo o grafica moderata: richiesta verifica economica Tier B' : 'Pagina a basso contenuto grafico';
    }

    if (!needsVisionAnalysis) {
      excludedFromVisionCount++;
    } else {
      figureCandidatesCount++;
    }

    pagesAnalysis.push({
      pageNumber: pageNum,
      width,
      height,
      charCount,
      imageOpsCount,
      vectorPathOpsCount,
      hasCaption,
      candidateCaption,
      hasCrossRef,
      tierAClass,
      needsVisionAnalysis,
      isTextReliable,
      textReliabilityScore: textQuality.reliability,
      textReliabilityReasons: textQuality.reasons,
      reason,
      textSnippet: fullPageText.slice(0, 300)
    });
  }

  const analysisResult = {
    filename,
    fileHash,
    pageCount: numPages,
    totalPages,
    pages: pagesAnalysis,
    summary: {
      total: numPages,
      excludedFromVisionCount,
      figureCandidatesCount,
      reliableTextPagesCount: pagesAnalysis.filter(p => p.isTextReliable).length,
      unreliableTextPagesCount: pagesAnalysis.filter(p => !p.isTextReliable).length,
      zeroTokenEfficiencyPercent: Math.round((excludedFromVisionCount / Math.max(1, numPages)) * 100)
    }
  };

  console.log(`\n🔍 [localAnalyzer]: ${filename} (Hash: ${fileHash.slice(0, 8)}...)`);
  console.log(`   Pagine totali: ${numPages} | Escluse da Vision (Zero Token): ${excludedFromVisionCount} (${analysisResult.summary.zeroTokenEfficiencyPercent}%) | Candidate Vision: ${figureCandidatesCount}`);

  return analysisResult;
}

module.exports = {
  analyzeDocumentLocally,
  calculateSha256,
  calculateTextReliability,
  TIER_A_CLASSES
};
