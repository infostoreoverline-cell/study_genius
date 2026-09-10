/**
 * StudyGenius Academic Intelligence System
 * src/planning/preflightPlanner.js
 * 
 * Pianificatore Pre-Flight Locale a Zero Token per Sessioni Sostenibili ("Una Dispensa al Giorno").
 * 
 * Responsabilità:
 * 1. Ispezione preliminare di tutti i file caricati tramite localAnalyzer (zero token LLM).
 * 2. Censimento di pagine testuali pure (0 chiamate), scansioni/appunti e pagine con visuali candidate.
 * 3. Stima accurata del fabbisogno di chiamate API (triage, estrazione, riserva revisione).
 * 4. Confronto atomico con il budget residuo e il soft limit registrato nel Quota Ledger Pacific Time.
 * 5. Generazione di un piano prudente con raccomandazione operativa ('PROCEED', 'CHECKPOINT_SUGGESTED', 'EXCEEDS_SAFE_BUDGET').
 */

const { analyzeDocumentLocally } = require('../multimodal/localAnalyzer');
const { defaultAccessManager } = require('../services/googleAIStudioAccessManager');

/**
 * Genera il piano di sessione pre-flight prima di consumare qualsiasi quota API
 * 
 * @param {Object} params
 * @param {Array<Object>} params.files Lista dei file caricati (con buffer e originalname)
 * @param {string} [params.targetScope=''] Ambito di studio richiesto dall'utente
 * @param {string} [params.studyMode='complete'] 'complete' o 'summary'
 * @returns {Promise<Object>} Piano di sessione con stima e raccomandazione
 */
async function generatePreflightPlan({ files = [], targetScope = '', studyMode = 'complete' }) {
  const fileAnalyses = [];
  let totalPages = 0;
  let textOnlyPages = 0;
  let visualCandidatePages = 0;

  for (const file of files) {
    if (!file.buffer || !Buffer.isBuffer(file.buffer)) continue;

    const isPdf = (file.originalname && file.originalname.toLowerCase().endsWith('.pdf')) || file.mimetype === 'application/pdf';
    if (isPdf) {
      try {
        const localRes = await analyzeDocumentLocally(file.buffer, file.originalname || 'document.pdf');
        const pages = localRes.pages || [];
        totalPages += pages.length;

        const candidates = pages.filter(p => p.needsVisionAnalysis);
        visualCandidatePages += candidates.length;
        textOnlyPages += (pages.length - candidates.length);

        fileAnalyses.push({
          filename: file.originalname,
          fileHash: localRes.fileHash,
          totalPages: pages.length,
          textOnlyPages: pages.length - candidates.length,
          visualCandidatePages: candidates.length,
          candidatePageNumbers: candidates.map(c => c.pageNumber)
        });
      } catch (err) {
        console.warn(`  ⚠️ [Preflight] Fallback stima su ${file.originalname}: ${err.message}`);
        totalPages += 10;
        visualCandidatePages += 2;
      }
    } else {
      // PPTX o altri file di testo
      fileAnalyses.push({
        filename: file.originalname,
        totalPages: 1,
        textOnlyPages: 1,
        visualCandidatePages: 0
      });
      totalPages += 1;
      textOnlyPages += 1;
    }
  }

  // Stima prudente delle chiamate necessarie:
  // - Pagine solo testo: 0 chiamate (100% elaborate localmente con pdfjs/pdf-parse)
  // - Pagine con grafici candidate: 1 chiamata Flash-Lite (single-pass) o raggruppate
  // - Riserva per approfondimento selettivo Tier C / Revisione (25% delle candidate)
  const minCalls = Math.max(1, Math.ceil(visualCandidatePages * 0.7));
  const maxCalls = Math.max(2, visualCandidatePages + Math.ceil(visualCandidatePages * 0.25));

  // Interroga il ledger delle quote Pacific Time
  const budget = defaultAccessManager.getRemainingBudget();
  const primaryModel = 'gemini-3.5-flash-lite';
  const modelBudget = budget.models[primaryModel] || { remaining: 280, softRemaining: 200 };

  const remainingRpd = modelBudget.remaining;
  const softRemaining = modelBudget.softRemaining;

  let recommendation = 'PROCEED';
  let statusMessage = '';

  if (maxCalls <= softRemaining) {
    recommendation = 'PROCEED';
    statusMessage = `Sessione sostenibile: stimate ${minCalls}-${maxCalls} chiamate su un budget prudente di ${softRemaining} richieste residue oggi (reset PT: ${new Date(budget.nextResetTime).toLocaleTimeString('it-IT')}).`;
  } else if (minCalls <= softRemaining) {
    recommendation = 'CHECKPOINT_SUGGESTED';
    statusMessage = `Sessione ampia: stimate ${minCalls}-${maxCalls} chiamate. Il fabbisogno massimo si avvicina al soft limit giornaliero (${softRemaining} residue). Si consiglia un'elaborazione mirata per capitolo.`;
  } else {
    recommendation = 'EXCEEDS_SAFE_BUDGET';
    statusMessage = `Attenzione budget: stimate ${minCalls}-${maxCalls} chiamate a fronte di sole ${softRemaining} richieste nel soft limit giornaliero. È opportuno selezionare un intervallo di pagine o suddividere lo studio.`;
  }

  const plan = {
    planId: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    generatedAt: new Date().toISOString(),
    metrics: {
      totalFiles: files.length,
      totalPages,
      textOnlyPages,
      visualCandidatePages,
      zeroTokenSavingRatio: totalPages > 0 ? `${((textOnlyPages / totalPages) * 100).toFixed(1)}%` : '0%'
    },
    estimate: {
      minCalls,
      maxCalls,
      primaryModel,
      escalationReserve: Math.ceil(visualCandidatePages * 0.25)
    },
    budgetStatus: {
      pacificDay: budget.pacificDay,
      nextResetTime: budget.nextResetTime,
      modelRemainingRpd: remainingRpd,
      modelSoftRemainingRpd: softRemaining,
      recommendation,
      statusMessage
    },
    files: fileAnalyses
  };

  console.log(`\n📋 [PREFLIGHT_PLAN] Pagine totali: ${totalPages} (${textOnlyPages} testo a costo zero token, ${visualCandidatePages} candidate visuali) | Stima chiamate: ${minCalls}-${maxCalls} | Esito: ${recommendation}`);
  return plan;
}

module.exports = {
  generatePreflightPlan
};
