const express = require('express');
const router = express.Router();

const { CONFIG } = require('../config');
const {
  uploadMiddleware,
  handleMulterError,
  prepareIntelligentPdfChunks
} = require('../services/extractorService');
const { getGeminiClient, callGeminiRole, callGeminiWithCascade } = require('../services/aiService');
const {
  buildBatchVisionPrompt,
  reconcileBatchResponse,
  createSurgicalContinuationBatch
} = require('../planning/batchPlanner');
const { extractTopicLedger } = require('../services/scopeService');
const {
  processDocumentVisualFunnel,
  processDeferredRetryQueue,
  processGroupedDeferredRetries,
  registerDocumentBuffer,
  getDeferredRetryQueue
} = require('../multimodal/visualEvidenceService');
const { fuseVisualWithContext } = require('../multimodal/semanticFusionEngine');
const { defaultCacheInstance } = require('../multimodal/visualCacheService');
const { defaultRouterInstance } = require('../multimodal/multimodalRouter');
const { generatePreflightPlan } = require('../planning/preflightPlanner');

// Document-Level Memoization Cache & In-Flight Registry
const extractedDocumentCache = new Map();
const inFlightDocumentRegistry = new Map();

/**
 * POST /api/extract/preflight
 * Pianificazione locale preliminare a zero token prima dell'estrazione
 */
router.post('/extract/preflight', (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nessun file caricato per la pianificazione pre-flight' });
    }
    const targetScope = req.body?.targetScope || '';
    const studyMode = req.body?.studyMode || 'complete';
    const plan = await generatePreflightPlan({ files: req.files, targetScope, studyMode });
    res.json({ success: true, plan });
  } catch (err) {
    console.error('❌ Errore durante la pianificazione pre-flight:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/extract
 * Upload PDF/PPTX ed estrazione intelligente ibrida (Locale + Vision)
 */
router.post('/extract', (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const jobId = req.headers['x-job-id'] || (req.body && req.body.jobId) || `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const sessionId = req.headers['x-session-id'] || (req.body && req.body.sessionId) || 'default_session';

    let pageRangesMap = {};
    try {
      if (req.body.pageRanges) {
        pageRangesMap = typeof req.body.pageRanges === 'string'
          ? JSON.parse(req.body.pageRanges)
          : req.body.pageRanges;
      }
    } catch (e) {
      console.warn(`  ℹ️ [jobId=${jobId}] pageRanges parsing:`, e.message);
    }

    const totalFiles = req.files.length;
    console.log(`\n📚 [jobId=${jobId}] [session=${sessionId}] Inizio estrazione ibrida per ${totalFiles} file caricati...`);

    const preparedItems = await prepareIntelligentPdfChunks(req.files, 5, pageRangesMap);
    console.log(`🧩 [jobId=${jobId}] [session=${sessionId}] Elaborazione strutturata in ${preparedItems.length} blocchi totali`);

    const genAI = getGeminiClient();
    const fallbackModels = CONFIG.GEMINI_MODELS;

    let extractedTexts = [];
    let allVisualEvidences = [];
    let allFusedArtifacts = [];
    let itemIndex = 0;

    for (const item of preparedItems) {
      itemIndex++;

      if (item.type === 'pptx') {
        console.log(`\n⚡ [${itemIndex}/${preparedItems.length}] [jobId=${jobId}] Slide PowerPoint: ${item.displayName}`);
        extractedTexts.push({
          filename: item.displayName,
          sourceFiles: [item.filename],
          content: item.content,
          success: true
        });
        continue;
      }

      if (item.type === 'digital') {
        if (item.hasVisualCandidates && item.localAnalysis && item.buffer) {
          const fileHash = item.localAnalysis.fileHash || item.filename;
          registerDocumentBuffer(fileHash, item.buffer);
          const partSuffix = item.startPage ? `_p${item.startPage}_${item.endPage}` : '';
          const docKey = `${fileHash}${partSuffix}_funnel_v1`;

          console.log(`\n📸 [${itemIndex}/${preparedItems.length}] [jobId=${jobId}] [session=${sessionId}] PDF Digitale con ${item.localAnalysis.summary.figureCandidatesCount} figure candidate`);

          try {
            let evidences = [];

            if (extractedDocumentCache.has(docKey)) {
              console.log(`  ⚡ [DOC_CACHE_HIT] [jobId=${jobId}] Riutilizzo risultati Visual Funnel per documento già analizzato: ${item.displayName}`);
              evidences = extractedDocumentCache.get(docKey);
            } else if (inFlightDocumentRegistry.has(docKey)) {
              console.log(`  🤝 [DOC_IN_FLIGHT_JOIN] [jobId=${jobId}] Visual Funnel per documento già in esecuzione in un altro job/blocco. Attendo completamento.`);
              evidences = await inFlightDocumentRegistry.get(docKey);
            } else {
              const funnelPromise = (async () => {
                const results = await processDocumentVisualFunnel({
                  pdfBuffer: item.buffer,
                  localAnalysis: item.localAnalysis
                });
                extractedDocumentCache.set(docKey, results);
                return results;
              })();

              inFlightDocumentRegistry.set(docKey, funnelPromise);
              try {
                evidences = await funnelPromise;
              } finally {
                inFlightDocumentRegistry.delete(docKey);
              }
            }

            let augmentedContent = item.content;
            for (const ev of evidences) {
              const fused = fuseVisualWithContext(ev, item.content);
              allVisualEvidences.push(ev);
              allFusedArtifacts.push(fused);
              augmentedContent += `\n\n# === EVIDENZA VISUALE CERTIFICATA: ${fused.figureId} ===\n${fused.didacticDirective}\n`;
            }

            extractedTexts.push({
              filename: item.displayName,
              sourceFiles: [item.filename],
              content: augmentedContent,
              visualEvidences: evidences,
              success: true
            });
          } catch (funnelErr) {
            console.warn(`  ⚠️ [jobId=${jobId}] Errore nel Visual Funnel per ${item.displayName}: ${funnelErr.message}`);
            extractedTexts.push({
              filename: item.displayName,
              sourceFiles: [item.filename],
              content: item.content,
              success: true
            });
          }
        } else {
          console.log(`\n⚡ [${itemIndex}/${preparedItems.length}] [jobId=${jobId}] Testo digitale pronto (Zero figure nel Tier A: 100% token Vision risparmiati!): ${item.displayName}`);
          extractedTexts.push({
            filename: item.displayName,
            sourceFiles: [item.filename],
            content: item.content,
            success: true
          });
        }
        continue;
      }

      console.log(`\n🔄 [${itemIndex}/${preparedItems.length}] Gemini Vision su blocco: ${item.displayName} (${item.sizeMB} MB)`);

      const hasBatchInfo = !!item.batchInfo;
      const prompt = hasBatchInfo ? buildBatchVisionPrompt(item.batchInfo) : `Sei un trascrittore ed estrattore accademico esperto. Analizza con estrema precisione questo estratto PDF (${item.displayName}):

ISTRUZIONI CRUCIALI PER L'ESTRAZIONE INTEGRALE:
1. Trascrivi e spiega TUTTO il contenuto presente in queste pagine senza riassumere e senza saltare alcun passaggio.
2. Per gli appunti scritti a mano, decifra e trascrivi fedelmente ogni parola, calcolo, reazione, freccia di equilibrio ed equazione.
3. Tutte le formule matematiche e chimiche devono essere convertite in LaTeX impeccabile (\\( ... \\) per formule in riga, \\[ ... \\] per formule in blocco centrato).
4. Se sono presenti grafici, schemi, tabelle, figure o disegni a mano, descrivine dettagliatamente il significato inserendo: [SCHEMA/GRAFICO: descrizione analitica di cosa rappresenta e delle relazioni tra le variabili].
5. Mantieni la numerazione di esercizi, esempi, teoremi o problemi.
6. Non omettere nulla: ogni singolo dato, passaggio algebrico o equazione è fondamentale.

Inizia con l'intestazione:
# === ESTRATTO DA: ${item.displayName} ===`;

      try {
        const base64Data = item.buffer.toString('base64');
        const callMetadata = {
          documentScope: item.displayName,
          unitIds: item.unitIds || (item.batchInfo ? item.batchInfo.unitIds : []),
          estimatedTokens: item.estimatedInputTokens || 1500,
          estimatedOutputTokens: item.estimatedOutputTokens || (item.pageCount * 1000)
        };

        const result = await callGeminiRole({
          role: 'VISUAL_EXTRACTION',
          contents: [
            prompt,
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data
              }
            }
          ],
          config: {
            mediaResolution: 'HIGH',
            maxOutputTokens: item.suggestedMaxOutputTokens || undefined
          },
          metadata: callMetadata
        });

        const text = result.response.text();

        if (hasBatchInfo) {
          const reconciled = reconcileBatchResponse(item.batchInfo, text);
          console.log(`  📊 [RECONCILE]: ${reconciled.completedUnits.length}/${item.batchInfo.unitIds.length} unità convalidate con successo (${reconciled.visualContracts.length} contratti visuali estratti)`);

          // Salva le unità completate
          for (const u of reconciled.completedUnits) {
            extractedTexts.push({
              filename: `${item.filename} (p.${u.pageNumber})`,
              sourceFiles: [item.filename],
              content: u.content,
              success: true,
              unitId: u.unitId
            });
          }

          // Aggiungi eventuali evidenze visuali estratte
          for (const vc of reconciled.visualContracts) {
            allVisualEvidences.push(vc);
          }

          // Gestione Troncamento o Unità Mancanti con Riparazione Chirurgica
          if (reconciled.missingUnitIds.length > 0) {
            console.warn(`  ⚠️ [PARTIAL_SUCCESS]: ${reconciled.missingUnitIds.length} unità mancanti/troncate nel blocco: [${reconciled.missingUnitIds.join(', ')}]. Avvio riparazione chirurgica mirata...`);

            const continuationBatch = createSurgicalContinuationBatch(item.batchInfo, reconciled.missingUnitIds);
            if (continuationBatch) {
              try {
                const continuationPrompt = `ATTENZIONE - COMPLETAMENTO CHIRURGICO:
Le prime unità del documento sono già state estratte con successo.
Elabora ESCLUSIVAMENTE le seguenti ${continuationBatch.pageCount} unità residue non ancora completate:
${continuationBatch.units.map(u => `  - Unità ID: "${u.unitId}" (Pagina ${u.pageNumber})`).join('\n')}

Per ciascuna unità residua genera il blocco formale:
<<<UNIT_START id="UNIT_ID">>>
# === ESTRATTO FEDELE: ${continuationBatch.sourceFilename} (Pagina X) ===
[Trascrizione integrale senza abbreviare]
<<<UNIT_END id="UNIT_ID">>>`;

                const contResult = await callGeminiRole({
                  role: 'VISUAL_EXTRACTION',
                  contents: [
                    continuationPrompt,
                    {
                      inlineData: {
                        mimeType: 'application/pdf',
                        data: base64Data
                      }
                    }
                  ],
                  config: { mediaResolution: 'HIGH', maxOutputTokens: continuationBatch.suggestedMaxOutputTokens },
                  metadata: {
                    documentScope: continuationBatch.displayName,
                    unitIds: continuationBatch.unitIds,
                    estimatedTokens: continuationBatch.estimatedInputTokens,
                    estimatedOutputTokens: continuationBatch.estimatedOutputTokens,
                    isRepair: true
                  }
                });

                const contText = contResult.response.text();
                const contReconciled = reconcileBatchResponse(continuationBatch, contText);
                console.log(`  🩹 [SURGICAL_REPAIR_COMPLETED]: Recuperate ${contReconciled.completedUnits.length}/${continuationBatch.unitIds.length} unità con la continuazione.`);

                for (const cu of contReconciled.completedUnits) {
                  extractedTexts.push({
                    filename: `${item.filename} (p.${cu.pageNumber})`,
                    sourceFiles: [item.filename],
                    content: cu.content,
                    success: true,
                    unitId: cu.unitId
                  });
                }
              } catch (contErr) {
                console.warn(`  ⚠️ Riparazione chirurgica fallita: ${contErr.message}`);
              }
            }
          }
        } else {
          console.log(`  ✅ Estratto con successo tramite ${result.model} (${text.length} caratteri trascritti fedelmente)`);
          extractedTexts.push({
            filename: item.displayName,
            sourceFiles: [item.filename],
            content: text,
            success: true
          });
        }

      } catch (fileError) {
        console.error(`  ❌ Errore durante l'elaborazione del blocco:`, fileError.message);
        const isFatalAuth = fileError.message && (fileError.message.includes('Fatal Gemini Auth Error') || fileError.message.includes('401') || fileError.message.includes('403'));

        extractedTexts.push({
          filename: item.displayName,
          sourceFiles: [item.filename],
          content: `[ERRORE ESTRAZIONE: ${fileError.message}]`,
          success: false
        });

        if (isFatalAuth) {
          console.error('  🛑 Job interrotto: errore critico di autenticazione/autorizzazione Gemini.');
          break;
        }
      }

      if (itemIndex < preparedItems.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    const successCount = extractedTexts.filter(f => f.success).length;
    const combinedExtracted = extractedTexts.filter(f => f.success).map(f => f.content).join('\n\n');
    const detectedTopics = extractTopicLedger(combinedExtracted);

    // Se vi sono visuali critiche differite, tenta la ripresa delle figure prima di chiudere la risposta
    if (getDeferredRetryQueue().length > 0) {
      console.log(`\n⏳ [jobId=${jobId}] Elaborazione parti indipendenti conclusa. Tentativo ripresa di ${getDeferredRetryQueue().length} visuali critiche in coda differita...`);
      try {
        const recovered = await processGroupedDeferredRetries();
        if (recovered.length > 0) {
          for (const rec of recovered) {
            allVisualEvidences.push(rec);
            const fused = fuseVisualWithContext(rec, combinedExtracted);
            allFusedArtifacts.push(fused);
          }
          console.log(`  🎉 [jobId=${jobId}] Recuperate con successo ${recovered.length} visuali differite senza riprocessare il PDF.`);
        }
      } catch (deferErr) {
        console.warn(`  ⚠️ [jobId=${jobId}] Ripresa coda differita non riuscita: ${deferErr.message}`);
      }
    }

    res.json({
      success: true,
      files: extractedTexts,
      totalChars: extractedTexts.reduce((s, f) => s + f.content.length, 0),
      detectedTopics,
      visualEvidences: allVisualEvidences,
      fusedVisualArtifacts: allFusedArtifacts,
      visualMetrics: defaultRouterInstance.generateMetricsReport(totalFiles, allVisualEvidences.length, allVisualEvidences.length),
      stats: {
        total: totalFiles,
        blocks: preparedItems.length,
        success: successCount,
        failed: preparedItems.length - successCount,
        visualsFound: allVisualEvidences.length
      }
    });

  } catch (error) {
    console.error('Errore estrazione generale:', error);
    res.status(500).json({ error: error.message || 'Errore durante l\'estrazione' });
  }
});

/**
 * POST /api/extract-topics
 * Estrae l'indice degli argomenti da un testo fornito
 */
router.post('/extract-topics', (req, res) => {
  try {
    const { text } = req.body;
    const topics = extractTopicLedger(text || '').slice(0, 30);
    res.json({ success: true, topics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
