/**
 * StudyGenius Academic Intelligence System
 * tests/test_multimodal_pipeline.js
 * 
 * Test automatico di verifica della Nuova Pipeline Multimodale:
 * 1. Zero-Token Local Analyzer (Tier A)
 * 2. Risoluzione del difetto storico (i PDF digitali con grafici non vengono più ignorati)
 * 3. Cache Persistente Multi-livello a chiave composita
 * 4. Semantic Fusion Engine & Generazione GraphSpec deterministico
 * 5. Router Token & Metriche di Telemetria
 */

const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');

const { analyzeDocumentLocally, TIER_A_CLASSES } = require('../src/multimodal/localAnalyzer');
const { VisualCacheService } = require('../src/multimodal/visualCacheService');
const { fuseVisualWithContext } = require('../src/multimodal/semanticFusionEngine');
const { MultimodalRouter } = require('../src/multimodal/multimodalRouter');
const {
  VISUAL_TAXONOMY,
  PROVENANCE_CLASSES,
  CONSISTENCY_STATES,
  RECONSTRUCTION_STRATEGIES,
  validateVisualEvidence
} = require('../src/core/schemas');

async function runMultimodalTests() {
  console.log('===============================================================');
  console.log('🧪 TEST SUITE: NUOVA PIPELINE MULTIMODALE & VISUAL EVIDENCE');
  console.log('===============================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1: Analizzatore Locale Zero-Token su PDF Digitale con Grafico
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 1]: Verifica Analisi Locale Tier A su PDF Digitale...');
  const samplePdfPath = path.resolve(__dirname, 'esempi/prova_chimica_analitica_tamponi.pdf');
  assert(fs.existsSync(samplePdfPath), `File di test mancante: ${samplePdfPath}`);
  const pdfBuffer = fs.readFileSync(samplePdfPath);

  const localRes = await analyzeDocumentLocally(pdfBuffer, 'prova_chimica_analitica_tamponi.pdf');
  assert(localRes.fileHash, 'FileHash SHA-256 deve essere calcolato');
  assert.strictEqual(localRes.pageCount, 3, 'Il PDF di test ha esattamente 3 pagine');

  // Pagina 2 deve essere identificata con figura candidata o immagini raster
  const p2 = localRes.pages.find(p => p.pageNumber === 2);
  assert(p2, 'Pagina 2 deve essere presente');
  assert(p2.imageOpsCount > 0 || p2.vectorPathOpsCount > 50, 'Pagina 2 deve contenere immagini o vettori');
  assert.strictEqual(p2.needsVisionAnalysis, true, 'Pagina 2 NON deve essere saltata dalla pipeline visuale');
  console.log('   ✔ Pagina 2 con grafico identificata con successo (Zero token consumati)');

  // ---------------------------------------------------------------------------
  // TEST 2: Validazione Contratto Rigoroso VisualEvidence v1.0.0
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 2]: Verifica validazione formale VisualEvidenceSchema...');
  const sampleEvidence = {
    figureId: 'p2-v1',
    source: {
      fileHash: localRes.fileHash,
      page: 2,
      bbox: [0.10, 0.25, 0.90, 0.75]
    },
    classification: {
      type: VISUAL_TAXONOMY.QUANTITATIVE_PLOT,
      subtype: 'titration_curve',
      confidence: 0.96
    },
    caption: {
      text: 'Curva di titolazione acido forte con base forte',
      source: 'page_text',
      confidence: 0.98
    },
    axes: {
      x: { label: 'Volume NaOH aggiunto', unit: 'mL', scale: 'linear', confidence: 0.95 },
      y: { label: 'pH', unit: null, scale: 'linear', confidence: 0.97 }
    },
    series: [
      { name: 'curva_sperimentale', representation: 'line', provenance: PROVENANCE_CLASSES.SOURCE_EXTRACTED, confidence: 0.92 }
    ],
    qualitativeObservations: [
      'Rapida variazione del pH in prossimita del punto equivalente a pH 7'
    ],
    explicitValues: [],
    estimatedValues: [],
    formulaLinks: [
      { formula: 'pH = -\\log[H^+]', status: CONSISTENCY_STATES.CONFIRMED_BY_SOURCE, confidence: 0.99 }
    ],
    uncertainty: { errorBarsPresent: false, confidenceBandPresent: false, notes: null },
    ambiguities: [],
    reconstructionStrategy: RECONSTRUCTION_STRATEGIES.REDRAW_FROM_FORMULA_DATA,
    provenance: PROVENANCE_CLASSES.SOURCE_EXTRACTED,
    requiresReview: false
  };

  const valValid = validateVisualEvidence(sampleEvidence);
  assert.strictEqual(valValid.valid, true, `Validazione schema fallita: ${valValid.errors?.join(', ')}`);

  // Test fallimento su provenienza inventata o assente
  const invalidEvidence = { ...sampleEvidence, provenance: 'HALLUCINATED_GUESS' };
  const valInvalid = validateVisualEvidence(invalidEvidence);
  assert.strictEqual(valInvalid.valid, false, 'Dovrebbe fallire per provenance non ammessa');
  console.log('   ✔ Contratto VisualEvidence validato con rigore formale');

  // ---------------------------------------------------------------------------
  // TEST 3: Semantic Fusion Engine (Fusione Testo-Figura e Rilevamento Conflitti)
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 3]: Verifica Semantic Fusion Engine & Rilevamento Conflitti...');
  const surroundingText = 'La curva di titolazione mostra il calcolo del pH = -\\log[H^+] in funzione del volume di NaOH.';
  const fused = fuseVisualWithContext(sampleEvidence, surroundingText, ['pH = -\\log[H^+]']);

  assert.strictEqual(fused.consistencyState, CONSISTENCY_STATES.CONFIRMED_BY_SOURCE);
  assert.strictEqual(fused.reconstructionStrategy, RECONSTRUCTION_STRATEGIES.REDRAW_FROM_FORMULA_DATA);
  assert(fused.graphSpec, 'Deve aver generato un GraphSpec deterministico');
  assert.strictEqual(fused.graphSpec.id, 'p2-v1');
  assert(fused.didacticDirective.includes('{{GRAPH:p2-v1}}'), 'Direttiva didattica deve contenere il placeholder');

  // Verifica rilevamento conflitto su scala discordante
  const logEvidence = {
    ...sampleEvidence,
    axes: {
      x: { label: 'T', unit: 'K', scale: 'log', confidence: 0.9 },
      y: { label: 'ln(k)', unit: null, scale: 'log', confidence: 0.9 }
    }
  };
  const fusedConflict = fuseVisualWithContext(logEvidence, 'La relazione presenta un andamento lineare semplice.', []);
  assert.strictEqual(fusedConflict.consistencyState, CONSISTENCY_STATES.CONFLICT_WITH_SOURCE);
  assert(fusedConflict.conflicts.length > 0, 'Deve segnalare conflitto tra scala log e testo lineare');
  console.log('   ✔ Fusione semantica e rilevamento conflitti funzionanti al 100%');

  // ---------------------------------------------------------------------------
  // TEST 4: Cache Persistente a Chiave Composita
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 4]: Verifica Cache Persistente Multi-livello...');
  const testCacheDir = path.resolve(__dirname, '../sessions/cache/test_multimodal_temp');
  const cache = new VisualCacheService(testCacheDir);

  const key = cache.generateKey({
    fileHash: localRes.fileHash,
    page: 2,
    bbox: [0.1, 0.2, 0.9, 0.8],
    analysisType: 'test_evidence'
  });

  assert.strictEqual(cache.has(key), false, 'La chiave non deve esistere inizialmente');
  cache.set(key, { data: 'test_evidence_content', estimatedTokens: 1500 });
  assert.strictEqual(cache.has(key), true, 'La chiave deve esistere dopo set()');

  const retrieved = cache.get(key);
  assert.strictEqual(retrieved.data, 'test_evidence_content');
  const stats = cache.getStats();
  assert.strictEqual(stats.hits, 1, 'Deve aver registrato 1 hit');
  assert.strictEqual(stats.tokensSavedEstimate, 1500, 'Deve aver registrato i token risparmiati');

  cache.clear();
  fs.removeSync(testCacheDir);
  console.log('   ✔ Cache persistente a chiave composita verificata con successo');

  // ---------------------------------------------------------------------------
  // TEST 5: Multimodal Router & Telemetria Token
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 5]: Verifica Multimodal Router & Telemetria Token...');
  const router = new MultimodalRouter();
  router.cumulativeStats.pagesProcessedLocally = 10;
  router.cumulativeStats.pagesExcludedZeroToken = 7; // 70% risparmio token locale
  router.recordOperation({
    phase: 'tierB_classify',
    tokensInput: 450,
    tokensOutput: 120,
    tokensVisual: 250,
    latencyMs: 1100
  });
  router.recordOperation({
    phase: 'tierC_evidence',
    tokensInput: 800,
    tokensOutput: 400,
    tokensVisual: 600,
    latencyMs: 2500
  });

  const report = router.generateMetricsReport(10, 2, 2);
  assert.strictEqual(report.metrics.zeroTokenPagesExclusionPercent, 70);
  assert(report.totalTokens > 0, 'Totale token deve essere > 0');
  assert(report.estimatedCostUsd > 0, 'Costo stimato deve essere calcolato');
  console.log('   ✔ Telemetria token e routing verificati con successo');

  console.log('\n===============================================================');
  console.log('🎉 TUTTI I 5 TEST DELLA PIPELINE MULTIMODALE SUPERATI AL 100%!');
  console.log('===============================================================\n');
}

runMultimodalTests().catch(err => {
  console.error('\n❌ TEST FALLITO:', err);
  process.exit(1);
});
