const path = require('path');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const officeParser = require('officeparser');
const { UPLOAD_LIMITS } = require('../config');
const { analyzeDocumentLocally } = require('../multimodal/localAnalyzer');
const { buildDocumentInventory, composeAdaptiveBatches } = require('../planning/batchPlanner');

// Configurazione memoria Multer
const storage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: UPLOAD_LIMITS.maxFileSize,
    files: UPLOAD_LIMITS.maxFiles
  }
}).array('pdfs', UPLOAD_LIMITS.maxFiles);

function handleMulterError(err, req, res, next) {
  if (err) {
    console.error('❌ Errore Multer durante upload:', err.code || err.message);
    if (typeof req.resume === 'function') {
      req.resume();
    }
  }
  if (err && err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: `Troppi file: massimo ${UPLOAD_LIMITS.maxFiles} file per volta.` });
  }
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: `File troppo grande: massimo ${Math.round(UPLOAD_LIMITS.maxFileSize / 1024 / 1024)}MB per file.` });
  }
  if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: `Campo inaspettato: ${err.field}. Usa il campo 'pdfs'.` });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Errore upload file.' });
  }
  next();
}

/**
 * Analizza ciascun file caricato e ne determina la natura:
 * 1. Presentazioni PowerPoint (.pptx / .ppt) -> officeparser
 * 2. PDF Digitale -> estrazione locale ultra-rapida con pdf-parse
 * 3. Appunti a mano / Scansioni -> micro-chunking a 5 pagine per Gemini Multimodal Vision
 */
async function prepareIntelligentPdfChunks(files, maxPagesPerChunk = 5, pageRangesMap = {}) {
  const sortedFiles = [...files].sort((a, b) =>
    a.originalname.localeCompare(b.originalname, undefined, { numeric: true, sensitivity: 'base' })
  );

  const preparedItems = [];

  for (const file of sortedFiles) {
    const ext = path.extname(file.originalname).toLowerCase();

    // =====================================================================
    // CASO 1: PRESENTAZIONI POWERPOINT (.pptx / .ppt)
    // =====================================================================
    if (ext === '.pptx' || ext === '.ppt') {
      console.log(`  📊 [PowerPoint Slide]: ${file.originalname} -> Estrazione slide e note del relatore`);
      try {
        const rawPptText = await officeParser.parseOffice(file.buffer, { fileType: ext.replace('.', '') });
        const cleanText = (rawPptText || '').trim();
        preparedItems.push({
          type: 'pptx',
          filename: file.originalname,
          displayName: `${file.originalname} (Slide PowerPoint)`,
          content: `# === PRESENTAZIONE SLIDE POWERPOINT: ${file.originalname} ===\n\n${cleanText || '[Nessun testo digitale rilevato nelle slide]'}\n\n[NOTA PER IL MODELLO: Questo documento è una presentazione slide con possibili note del relatore. Espandi i concetti in una trattazione universitaria discorsiva e parlata completa.]`,
          pageCount: 1,
          sizeMB: (file.size / 1024 / 1024).toFixed(1)
        });
      } catch (pptxErr) {
        console.warn(`  ⚠️ Errore estrazione PowerPoint per ${file.originalname}: ${pptxErr.message}`);
        preparedItems.push({
          type: 'pptx',
          filename: file.originalname,
          displayName: `${file.originalname} (Errore parsing)`,
          content: `[AVVISO: Impossibile estrarre automaticamente il testo da ${file.originalname}: ${pptxErr.message}. Se il file contiene principalmente grafici/immagini, ti consigliamo di salvarlo in PDF per l'analisi visiva].`,
          pageCount: 1,
          sizeMB: (file.size / 1024 / 1024).toFixed(1)
        });
      }
      continue;
    }

    // =====================================================================
    // CASO 2: RITAGLIO PAGINE OPZIONALE (PER PDF E GRANDI LIBRI)
    // =====================================================================
    let fileBuffer = file.buffer;
    const userRange = pageRangesMap[file.originalname] || '';
    let appliedRangeStr = '';

    if (userRange && userRange.trim()) {
      const match = userRange.trim().match(/^(\d+)\s*[-–to:]\s*(\d+)$/i);
      if (match) {
        try {
          const startP = parseInt(match[1], 10);
          const endP = parseInt(match[2], 10);
          const srcDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
          const totalP = srcDoc.getPageCount();
          const validStart = Math.max(1, Math.min(startP, totalP));
          const validEnd = Math.max(validStart, Math.min(endP, totalP));

          const subDoc = await PDFDocument.create();
          const pageIndices = [];
          for (let p = validStart - 1; p < validEnd; p++) pageIndices.push(p);

          const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
          copiedPages.forEach(p => subDoc.addPage(p));
          const subBytes = await subDoc.save();
          fileBuffer = Buffer.from(subBytes);
          appliedRangeStr = ` [Pagine ${validStart}-${validEnd} di ${totalP}]`;
          console.log(`  ✂️ Applicato intervallo pagine per ${file.originalname}: ${validStart}-${validEnd} (su ${totalP} totali)`);
        } catch (cropErr) {
          console.warn(`  ⚠️ Errore ritaglio pagine per ${file.originalname}: ${cropErr.message}`);
        }
      }
    }

    // =====================================================================
    // CASO 3: ANALISI DIGITALE vs APPUNTI A MANO
    // =====================================================================
    let parsedData = null;
    try {
      parsedData = await pdfParse(fileBuffer);
    } catch (e) {
      console.log(`  ℹ️ pdf-parse non disponibile o file scansionato per ${file.originalname}: ${e.message}`);
    }

    const numPages = parsedData ? (parsedData.numpages || 1) : 1;
    const digitalText = parsedData ? (parsedData.text || '').trim() : '';
    const avgCharsPerPage = digitalText.length / Math.max(1, numPages);

    const isDigitalTextBook = digitalText.length > 400 && avgCharsPerPage > 50;

    if (isDigitalTextBook) {
      if (digitalText.length > 75000) {
        console.log(`  📚 [Libro/Macro-Volume]: ${file.originalname}${appliedRangeStr} (${numPages} pag., ${digitalText.length} car.) -> Suddivisione modulare per capitoli`);
        
        let localAnalysis = null;
        try {
          localAnalysis = await analyzeDocumentLocally(fileBuffer, file.originalname);
        } catch (locErr) {
          console.warn(`  ⚠️ localAnalyzer fallback su ${file.originalname}: ${locErr.message}`);
        }

        const CHUNK_SIZE = 50000;
        let remainingText = digitalText;
        const parts = [];

        while (remainingText.length > 0) {
          if (remainingText.length <= CHUNK_SIZE * 1.2) {
            parts.push(remainingText);
            break;
          }
          let splitIdx = remainingText.lastIndexOf('\n\n', CHUNK_SIZE);
          if (splitIdx < CHUNK_SIZE * 0.6) {
            splitIdx = remainingText.lastIndexOf('\n', CHUNK_SIZE);
          }
          if (splitIdx < CHUNK_SIZE * 0.5) {
            splitIdx = CHUNK_SIZE;
          }
          parts.push(remainingText.slice(0, splitIdx).trim());
          remainingText = remainingText.slice(splitIdx).trim();
        }

        const totalParts = parts.length;
        for (let i = 0; i < totalParts; i++) {
          const estStartPage = Math.max(1, Math.round((i / totalParts) * numPages) + 1);
          const estEndPage = Math.min(numPages, Math.round(((i + 1) / totalParts) * numPages));

          let partLocalAnalysis = null;
          let hasPartVisuals = false;
          if (localAnalysis && Array.isArray(localAnalysis.pages)) {
            const partPages = localAnalysis.pages.filter(p => p.pageNumber >= estStartPage && p.pageNumber <= estEndPage);
            const partCandidates = partPages.filter(p => p.needsVisionAnalysis).length;
            partLocalAnalysis = {
              ...localAnalysis,
              pages: partPages,
              summary: {
                ...localAnalysis.summary,
                totalPages: partPages.length,
                figureCandidatesCount: partCandidates
              }
            };
            hasPartVisuals = partCandidates > 0;
          }

          preparedItems.push({
            type: 'digital',
            filename: file.originalname,
            displayName: `${file.originalname}${appliedRangeStr} [Parte ${i + 1}/${totalParts} - ~pag. ${estStartPage}-${estEndPage}]`,
            content: `# === LIBRO/MANUALE: ${file.originalname}${appliedRangeStr} [Parte ${i + 1}/${totalParts}] ===\n\n${parts[i]}`,
            pageCount: Math.max(1, estEndPage - estStartPage + 1),
            sizeMB: (file.size / 1024 / 1024 / totalParts).toFixed(1),
            buffer: fileBuffer,
            localAnalysis: partLocalAnalysis || localAnalysis,
            hasVisualCandidates: hasPartVisuals,
            startPage: estStartPage,
            endPage: estEndPage
          });
        }
        continue;
      }

      console.log(`  📖 [Libro/PDF Digitale]: ${file.originalname}${appliedRangeStr} (${numPages} pag., ${digitalText.length} caratteri estratti istantaneamente)`);
      let localAnalysis = null;
      try {
        localAnalysis = await analyzeDocumentLocally(fileBuffer, file.originalname);
      } catch (locErr) {
        console.warn(`  ⚠️ localAnalyzer fallback su ${file.originalname}: ${locErr.message}`);
      }

      preparedItems.push({
        type: 'digital',
        filename: file.originalname,
        displayName: `${file.originalname}${appliedRangeStr} (${numPages} pag.)`,
        content: `# === DOCUMENTO DIGITALE: ${file.originalname}${appliedRangeStr} (${numPages} pagine) ===\n\n${digitalText}`,
        pageCount: numPages,
        sizeMB: (file.size / 1024 / 1024).toFixed(1),
        buffer: fileBuffer,
        localAnalysis,
        hasVisualCandidates: localAnalysis && localAnalysis.summary && localAnalysis.summary.figureCandidatesCount > 0
      });
      continue;
    }

    // =====================================================================
    // CASO 4: APPUNTI A MANO / SCANSIONI -> CHUNKING ADATTIVO DUAL-BOUND PER GEMINI
    // =====================================================================
    console.log(`  ✍️ [Appunti a mano / Scansione]: ${file.originalname}${appliedRangeStr} (${numPages} pag.) -> Analisi adattiva dei contenuti`);

    try {
      const srcDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
      const totalPages = srcDoc.getPageCount();

      // Costruzione inventario locale pre-flight (zero token LLM)
      const units = buildDocumentInventory({
        filename: file.originalname,
        fileHash: null,
        totalPages,
        pageTexts: [],
        localAnalysis: null,
        isScanned: true
      });

      // Calcola i blocchi adattivi dual-bound (input e output)
      const adaptiveBatches = composeAdaptiveBatches(units, {
        maxInputTokensPerBatch: 65000,
        maxOutputTokensPerBatch: 12000,
        maxPagesCap: Math.max(maxPagesPerChunk || 5, 16)
      });

      if (adaptiveBatches.length === 0) {
        preparedItems.push({
          type: 'vision',
          buffer: fileBuffer,
          filename: file.originalname,
          displayName: `${file.originalname}${appliedRangeStr} (${totalPages} pag.)`,
          pageRange: `1-${totalPages}`,
          pageCount: totalPages,
          sizeMB: (fileBuffer.length / 1024 / 1024).toFixed(1)
        });
      } else {
        console.log(`  🧩 [BATCHING ADATTIVO]: ${file.originalname} suddiviso in ${adaptiveBatches.length} blocchi intelligenti (anziché ${Math.ceil(totalPages / 5)} blocchi statici da 5 pag.)`);

        for (const batch of adaptiveBatches) {
          const chunkDoc = await PDFDocument.create();
          const pageIndices = [];
          for (let i = batch.startPage - 1; i < batch.endPage; i++) pageIndices.push(i);

          const copiedPages = await chunkDoc.copyPages(srcDoc, pageIndices);
          copiedPages.forEach(p => chunkDoc.addPage(p));
          const chunkBytes = await chunkDoc.save();
          const chunkBuffer = Buffer.from(chunkBytes);

          preparedItems.push({
            type: 'vision',
            buffer: chunkBuffer,
            filename: file.originalname,
            displayName: `${file.originalname}${appliedRangeStr} [Pagine ${batch.startPage}-${batch.endPage} di ${totalPages}]`,
            pageRange: `${batch.startPage}-${batch.endPage}`,
            pageCount: batch.pageCount,
            sizeMB: (chunkBuffer.length / 1024 / 1024).toFixed(1),
            batchInfo: batch,
            unitIds: batch.unitIds,
            estimatedInputTokens: batch.estimatedInputTokens,
            estimatedOutputTokens: batch.estimatedOutputTokens,
            suggestedMaxOutputTokens: batch.suggestedMaxOutputTokens
          });
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ Errore micro-chunking per ${file.originalname} (${err.message}). Invio intero.`);
      preparedItems.push({
        type: 'vision',
        buffer: fileBuffer,
        filename: file.originalname,
        displayName: `${file.originalname}${appliedRangeStr}`,
        pageRange: 'intero',
        pageCount: 1,
        sizeMB: (fileBuffer.length / 1024 / 1024).toFixed(1)
      });
    }
  }

  return preparedItems;
}

module.exports = {
  uploadMiddleware,
  handleMulterError,
  prepareIntelligentPdfChunks,
  buildDocumentInventory,
  composeAdaptiveBatches
};
