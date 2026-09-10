/**
 * StudyGenius Academic Intelligence System
 * src/multimodal/multimodalRouter.js
 * 
 * Router Intelligente di Token & Telemetria Multimodale.
 * 
 * Responsabilità:
 * 1. Misurazione Reale del Consumo Token (Input, Output, Visuali, Cache).
 * 2. Routing a Costo Minimo (Deterministico -> Flash -> Modello avanzato).
 * 3. Politica di Budget per Modalità Didattica (Sintesi, Completa, Teoria, Esercizi, Assistita).
 * 4. Calcolo delle metriche di efficienza didattica e computazionale.
 */

class MultimodalRouter {
  constructor() {
    this.sessionLogs = [];
    this.cumulativeStats = {
      pagesProcessedLocally: 0,
      pagesExcludedZeroToken: 0,
      tierBVisualQueries: 0,
      tierCDeepQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      tokensInputTotal: 0,
      tokensOutputTotal: 0,
      tokensVisualEstimated: 0,
      tokensSavedByCache: 0,
      totalLatencyMs: 0
    };
  }

  /**
   * Determina il budget e i limiti di analisi per la modalità selezionata (Sezione 17)
   */
  getBudgetPolicy(studyMode = 'complete') {
    switch (studyMode) {
      case 'summary':
        return {
          mode: 'summary',
          maxVisualsPerChapter: 2,
          minRelevanceThreshold: 0.85,
          allowDecorative: false,
          prioritizeReconstruction: true,
          resolutionScale: 1.8,
          description: 'Sintesi accademica ad alta densità: solo figure indispensabili'
        };
      case 'theory':
        return {
          mode: 'theory',
          maxVisualsPerChapter: 6,
          minRelevanceThreshold: 0.60,
          allowDecorative: false,
          prioritizeReconstruction: true,
          resolutionScale: 2.2,
          description: 'Focus Teoria: massima ampiezza per meccanismi, derivazioni e limiti'
        };
      case 'exercises':
        return {
          mode: 'exercises',
          maxVisualsPerChapter: 4,
          minRelevanceThreshold: 0.75,
          allowDecorative: false,
          prioritizeReconstruction: false, // preferisce la consegna originale con dati
          resolutionScale: 2.0,
          description: 'Focus Esercizi: schemi geometrici e grafici con dati da estrarre'
        };
      case 'assisted':
        return {
          mode: 'assisted',
          maxVisualsPerChapter: 4,
          minRelevanceThreshold: 0.70,
          allowDecorative: false,
          prioritizeReconstruction: true,
          resolutionScale: 2.0,
          description: 'Focus Assistito: tarato dinamicamente sulle lacune'
        };
      case 'complete':
      default:
        return {
          mode: 'complete',
          maxVisualsPerChapter: 8,
          minRelevanceThreshold: 0.65,
          allowDecorative: false,
          prioritizeReconstruction: true,
          resolutionScale: 2.2,
          description: 'Modalità Completa: trattazione magistrale integrale'
        };
    }
  }

  /**
   * Registra una chiamata o operazione nella telemetria
   */
  recordOperation({
    phase, // 'local_tierA', 'tierB_classify', 'tierC_evidence', 'fusion', 'cache_hit'
    model = 'local',
    tokensInput = 0,
    tokensOutput = 0,
    tokensVisual = 0,
    latencyMs = 0,
    isCacheHit = false,
    pageNumber = null,
    figureId = null,
    notes = ''
  }) {
    const entry = {
      timestamp: new Date().toISOString(),
      phase,
      model,
      pageNumber,
      figureId,
      tokensInput,
      tokensOutput,
      tokensVisual,
      latencyMs,
      isCacheHit,
      notes
    };

    this.sessionLogs.push(entry);

    if (isCacheHit) {
      this.cumulativeStats.cacheHits++;
      this.cumulativeStats.tokensSavedByCache += (tokensInput + tokensVisual + 500);
    } else {
      if (phase !== 'local_tierA') this.cumulativeStats.cacheMisses++;
    }

    this.cumulativeStats.tokensInputTotal += tokensInput;
    this.cumulativeStats.tokensOutputTotal += tokensOutput;
    this.cumulativeStats.tokensVisualEstimated += tokensVisual;
    this.cumulativeStats.totalLatencyMs += latencyMs;
  }

  /**
   * Calcola le metriche analitiche richieste dalla Sezione 16 della Specifica
   */
  generateMetricsReport(totalUsablePages = 1, recognizedFiguresCount = 0, utilizedFiguresCount = 0) {
    const totalQueries = this.cumulativeStats.cacheHits + this.cumulativeStats.cacheMisses;
    const hitRatePercent = totalQueries > 0 ? ((this.cumulativeStats.cacheHits / totalQueries) * 100).toFixed(1) : '0.0';

    const zeroTokenExclusionPercent = this.cumulativeStats.pagesProcessedLocally > 0
      ? ((this.cumulativeStats.pagesExcludedZeroToken / this.cumulativeStats.pagesProcessedLocally) * 100).toFixed(1)
      : '0.0';

    const totalTokens = this.cumulativeStats.tokensInputTotal + this.cumulativeStats.tokensOutputTotal + this.cumulativeStats.tokensVisualEstimated;
    const tokensPerPage = (totalTokens / Math.max(1, totalUsablePages)).toFixed(0);
    const tokensPerRecognizedFigure = (totalTokens / Math.max(1, recognizedFiguresCount)).toFixed(0);
    const tokensPerUtilizedFigure = (totalTokens / Math.max(1, utilizedFiguresCount)).toFixed(0);

    // Stima economica (Gemini Flash: ~$0.075 / 1M input tokens, ~$0.30 / 1M output tokens)
    const estimatedCostUsd = (
      (this.cumulativeStats.tokensInputTotal / 1000000) * 0.075 +
      (this.cumulativeStats.tokensOutputTotal / 1000000) * 0.30 +
      (this.cumulativeStats.tokensVisualEstimated / 1000000) * 0.075
    ).toFixed(5);

    return {
      totalTokens,
      tokensInputTotal: this.cumulativeStats.tokensInputTotal,
      tokensOutputTotal: this.cumulativeStats.tokensOutputTotal,
      tokensVisualEstimated: this.cumulativeStats.tokensVisualEstimated,
      tokensSavedByCache: this.cumulativeStats.tokensSavedByCache,
      estimatedCostUsd,
      metrics: {
        tokensPerUsablePage: Number(tokensPerPage),
        tokensPerRecognizedFigure: Number(tokensPerRecognizedFigure),
        tokensPerUtilizedFigure: Number(tokensPerUtilizedFigure),
        cacheHitRatePercent: Number(hitRatePercent),
        zeroTokenPagesExclusionPercent: Number(zeroTokenExclusionPercent),
        totalLatencySeconds: (this.cumulativeStats.totalLatencyMs / 1000).toFixed(2)
      },
      logCount: this.sessionLogs.length
    };
  }

  reset() {
    this.sessionLogs = [];
    this.cumulativeStats = {
      pagesProcessedLocally: 0,
      pagesExcludedZeroToken: 0,
      tierBVisualQueries: 0,
      tierCDeepQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      tokensInputTotal: 0,
      tokensOutputTotal: 0,
      tokensVisualEstimated: 0,
      tokensSavedByCache: 0,
      totalLatencyMs: 0
    };
  }
}

const defaultRouterInstance = new MultimodalRouter();

module.exports = {
  MultimodalRouter,
  defaultRouterInstance
};
