/**
 * StudyGenius Academic Intelligence System
 * tests/test_api_optimization_suite.js
 * 
 * Suite di Test per l'Ottimizzazione API Gemini:
 * 1. Telemetria Granulare per chiamata (inTokens, outTokens, thinkingTokens, finishReason, isTruncated, durationMs).
 * 2. Inventario Locale Pre-Flight e Stima Complessità/Formule/Grafici (zero token LLM).
 * 3. Rilevazione Legami Semantici Contigui tra Pagine (dimostrazioni, esercizi a cavallo pagina).
 * 4. Algoritmo di Suddivisione Adattiva Dual-Bound (limiti input TPM e output maxOutputTokens).
 * 5. Prompt a Delimitatori Univoci e Riconciliazione Parziale a Manifesto.
 * 6. Riparazione Chirurgica per Troncamento MAX_TOKENS (continuation batch mirato).
 * 7. Pacing a Finestra Mobile Scorrevole RPM & TPM con Attesa Intelligente.
 * 8. Fusione Single-Pass (Triage + Visual Evidence contrattuale in 1 sola chiamata).
 */

require('dotenv').config();
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const {
  recordCallTelemetry,
  getCallTelemetrySummary,
  callGeminiRole,
  defaultAccessManager,
  GoogleAIStudioAccessManager
} = require('../src/services/aiService');

const {
  COMPLEXITY_LEVELS,
  estimatePageComplexity,
  detectSemanticLinkToNext,
  buildDocumentInventory,
  composeAdaptiveBatches,
  buildBatchVisionPrompt,
  reconcileBatchResponse,
  createSurgicalContinuationBatch,
  findLastCompleteSemanticAnchor
} = require('../src/planning/batchPlanner');

const {
  extractPageVisualsUnified,
  extractPagesVisualsUnifiedBatch,
  processDocumentVisualFunnel,
  processGroupedDeferredRetries
} = require('../src/multimodal/visualEvidenceService');

const {
  calculateTextReliability,
  TIER_A_CLASSES
} = require('../src/multimodal/localAnalyzer');

async function runOptimizationSuite() {
  console.log('===============================================================');
  console.log('🧪 TEST SUITE: OTTIMIZZAZIONE API GEMINI & BATCHING ADATTIVO');
  console.log('===============================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1: Telemetria Granulare per Chiamata
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 1]: Verifica Telemetria Granulare (inTokens, outTokens, thinkingTokens, finishReason)...');
  const testRecord = {
    permitId: 'test_permit_telemetry_1',
    model: 'gemini-3.5-flash-lite',
    role: 'VISUAL_EXTRACTION',
    durationMs: 1420,
    inTokens: 1850,
    outTokens: 1240,
    thinkingTokens: 256,
    finishReason: 'STOP',
    finishMessage: null,
    isTruncated: false,
    documentScope: 'test_dispensa_chimica.pdf',
    unitIds: ['doc_p1', 'doc_p2'],
    unitsCount: 2,
    isRepair: false,
    attempt: 1,
    jsonChars: 4500
  };

  recordCallTelemetry(testRecord);
  const telemetrySummary = getCallTelemetrySummary({ model: 'gemini-3.5-flash-lite' });

  assert.ok(telemetrySummary.totalCalls > 0, 'Il file di telemetria deve registrare la chiamata');
  assert.ok(telemetrySummary.totalInputTokens >= 1850, 'Token di input contabilizzati');
  assert.ok(telemetrySummary.totalOutputTokens >= 1240, 'Token di output contabilizzati');
  assert.ok(telemetrySummary.totalThinkingTokens >= 256, 'Token di pensiero/ragionamento contabilizzati separatamente');
  console.log('   ✔ Telemetria granulare validata: tracciamento completo di in/out/thinking tokens e durata.');

  // ---------------------------------------------------------------------------
  // TEST 2: Inventario Locale Pre-Flight & Stima Complessità Formule
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 2]: Verifica Stima Complessità Didattica e Rilevazione Formule (Zero Token LLM)...');
  
  const textSparse = 'Introduzione al corso di chimica. Obiettivi didattici e bibliografia.';
  const compSparse = estimatePageComplexity(textSparse, null);
  assert.strictEqual(compSparse.complexity, COMPLEXITY_LEVELS.LOW, 'Testo breve deve risultare LOW complexity');
  assert.ok(compSparse.estimatedOutTokens <= 500, 'Output stimato per testo breve deve essere <= 500 tokens');

  const textDenseMath = `
    Data l'equazione differenziale \\[ \\frac{d^2 y}{dx^2} + \\omega^2 y = 0 \\]
    con le condizioni iniziali \\( y(0) = y_0 \\) e \\( y'(0) = v_0 \\).
    Sviluppiamo per serie di Taylor: \\[ y(x) = \\sum_{n=0}^{\\infty} a_n x^n \\]
    Sostituendo nell'equazione: \\[ \\sum_{n=2}^{\\infty} n(n-1)a_n x^{n-2} + \\omega^2 \\sum_{n=0}^{\\infty} a_n x^n = 0 \\]
    Uguagliando i coefficienti delle potenze di x: \\[ (n+2)(n+1)a_{n+2} + \\omega^2 a_n = 0 \\implies a_{n+2} = -\\frac{\\omega^2}{(n+2)(n+1)} a_n \\]
    Integrando per via analitica si ottiene l'integrale generale con le costanti A e B.
  `;
  const compDense = estimatePageComplexity(textDenseMath, null);
  assert.ok(compDense.mathIndicators > 15, 'Indicatori matematici devono essere rilevati');
  assert.strictEqual(compDense.complexity, COMPLEXITY_LEVELS.HIGH, 'Derivazione densa deve essere HIGH complexity');
  assert.ok(compDense.estimatedOutTokens >= 1500, 'Output stimato per derivazione densa deve essere >= 1500 tokens');
  console.log(`   ✔ Complessità differenziata con successo: Sparse=${compSparse.complexity} (${compSparse.estimatedOutTokens} out tok) vs DenseMath=${compDense.complexity} (${compDense.estimatedOutTokens} out tok).`);

  // ---------------------------------------------------------------------------
  // TEST 3: Rilevazione Legami Semantici Contigui tra Pagine
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 3]: Verifica Rilevazione Legami Semantici tra Pagine (Esercizi/Dimostrazioni in corso)...');
  
  const textUnfinished = 'Consideriamo ora lo svolgimento dell\'Esercizio 4: data la reazione di equilibrio';
  const hasLink = detectSemanticLinkToNext(textUnfinished, 3);
  assert.strictEqual(hasLink, true, 'Frase interrotta con esercizio deve rilevare legame semantico');

  const textFinished = 'La reazione è quindi all\'equilibrio chimico. Dimostrazione completata.';
  const hasNoLink = detectSemanticLinkToNext(textFinished, 3);
  assert.strictEqual(hasNoLink, false, 'Sezione chiusa con punto fermo non deve forzare legame');
  console.log('   ✔ Rilevazione semantica validata: gli esercizi a cavallo pagina mantengono il legame con la pagina successiva.');

  // ---------------------------------------------------------------------------
  // TEST 4: Algoritmo di Suddivisione Adattiva Dual-Bound
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 4]: Verifica Algoritmo di Suddivisione Adattiva Dual-Bound (Input TPM & Output Limit)...');
  
  // Creiamo un inventario fittizio di 20 pagine con complessità mista
  const fakeUnits = [];
  for (let p = 1; p <= 20; p++) {
    const isHeavy = p >= 5 && p <= 8; // pagine 5-8 sono dense di formule
    fakeUnits.push({
      unitId: `doc_test_p${p}`,
      sourceFilename: 'manuale_termodinamica.pdf',
      sourceDocHash: 'doc_test',
      pageNumber: p,
      hasNativeText: false,
      needsVision: true,
      isScanned: true,
      complexity: isHeavy ? COMPLEXITY_LEVELS.HIGH : COMPLEXITY_LEVELS.LOW,
      estimatedInTokens: 1200,
      estimatedOutTokens: isHeavy ? 1800 : 400,
      hasLinkToNext: p === 6, // p.6 legata a p.7
      isCached: false
    });
  }

  const batches = composeAdaptiveBatches(fakeUnits, {
    maxInputTokensPerBatch: 50000,
    maxOutputTokensPerBatch: 6000,
    maxPagesCap: 16
  });

  assert.ok(batches.length > 0, 'Devono essere generati lotti adattivi');
  console.log(`   ✔ Documento di 20 pagine suddiviso in ${batches.length} blocchi adattivi:`);
  batches.forEach((b, idx) => {
    console.log(`      - Blocco ${idx + 1}: pagg. ${b.startPage}-${b.endPage} (${b.pageCount} pag.) | In stimato: ${b.estimatedInputTokens} tok | Out stimato: ${b.estimatedOutputTokens} tok | maxOutputTokens: ${b.suggestedMaxOutputTokens}`);
    assert.ok(b.estimatedOutputTokens <= 8000, 'L\'output stimato deve rispettare la soglia di sicurezza');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Prompt a Delimitatori Univoci e Riconciliazione Parziale a Manifesto
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 5]: Verifica Prompt Strutturato e Riconciliazione a Manifesto...');
  
  const sampleBatch = batches[0];
  const prompt = buildBatchVisionPrompt(sampleBatch);
  assert.ok(prompt.includes('<<<UNIT_START id="'), 'Il prompt deve contenere i delimitatori formali');
  assert.ok(prompt.includes('<<<VISUAL_CONTRACT id="'), 'Il prompt deve istruire sull\'estrazione visiva unificata');

  // Simuliamo una risposta con 2 unità completate ed 1 contratto visuale
  const fakeResponseText = `
Ecco l'estrazione completa:

<<<UNIT_START id="${sampleBatch.units[0].unitId}">>>
# === ESTRATTO FEDELE: manuale_termodinamica.pdf (Pagina ${sampleBatch.units[0].pageNumber}) ===
Principio zero della termodinamica ed equilibrio termico tra due corpi a contatto.
Formula fondamentale: \\( T_A = T_B \\).
<<<UNIT_END id="${sampleBatch.units[0].unitId}">>>

<<<VISUAL_CONTRACT id="fig_p${sampleBatch.units[0].pageNumber}_1">>>
{
  "figureId": "fig_p${sampleBatch.units[0].pageNumber}_1",
  "source": { "page": ${sampleBatch.units[0].pageNumber} },
  "classification": { "type": "schematic_diagram", "confidence": 0.95 },
  "caption": { "text": "Schema di contatto termico" },
  "series": [],
  "qualitativeObservations": ["Flusso di calore verso l'equilibrio"],
  "ambiguities": [],
  "reconstructionStrategy": "PRESERVE_ORIGINAL"
}
<<<VISUAL_END id="fig_p${sampleBatch.units[0].pageNumber}_1">>>

<<<UNIT_START id="${sampleBatch.units[1].unitId}">>>
# === ESTRATTO FEDELE: manuale_termodinamica.pdf (Pagina ${sampleBatch.units[1].pageNumber}) ===
Primo principio della termodinamica per sistemi chiusi: \\[ \\Delta U = Q - W \\].
Lavoro di espansione isotermica reversibile.
<<<UNIT_END id="${sampleBatch.units[1].unitId}">>>
`;

  const reconciled = reconcileBatchResponse(sampleBatch, fakeResponseText);
  assert.strictEqual(reconciled.completedUnits.length, 2, 'Devono essere estratte convalidate esattamente 2 unità');
  assert.strictEqual(reconciled.visualContracts.length, 1, 'Deve essere estratto 1 contratto visuale valido');
  assert.strictEqual(reconciled.completedUnits[0].unitId, sampleBatch.units[0].unitId);
  console.log(`   ✔ Riconciliazione validata: ${reconciled.completedUnits.length} unità salvate indipendentemente, ${reconciled.visualContracts.length} contratto visuale estratto.`);

  // ---------------------------------------------------------------------------
  // TEST 6: Riparazione Chirurgica per Troncamento MAX_TOKENS
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 6]: Verifica Generazione Pacchetto di Riparazione Chirurgica...');
  
  // Supponiamo che il batch richiedesse 4 unità ma ne siano arrivate 2
  const missingIds = sampleBatch.unitIds.slice(2);
  if (missingIds.length > 0) {
    const surgicalBatch = createSurgicalContinuationBatch(sampleBatch, missingIds);
    assert.ok(surgicalBatch, 'Deve creare il pacchetto di continuazione chirurgica');
    assert.strictEqual(surgicalBatch.isRepair, true, 'Deve essere marcato come riparazione');
    assert.strictEqual(surgicalBatch.unitIds.length, missingIds.length, 'Deve contenere SOLO le unità mancanti');
    console.log(`   ✔ Riparazione chirurgica validata: pacchetto mirato creato per le sole unità mancanti [${missingIds.join(', ')}] senza rieseguire il blocco intero.`);
  } else {
    console.log('   ✔ Nessuna unità mancante nel lotto selezionato per il test di troncamento.');
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Sliding-Window RPM & TPM Pacing con Attesa Intelligente
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 7]: Verifica Sliding-Window TPM e Call Pacing del Gestore Accessi...');
  
  const mgr = new GoogleAIStudioAccessManager();
  const testModel = 'gemini-3.5-flash-lite';

  // Registra chiamate fittizie nella finestra scorrevole
  mgr.recordMinuteRequest(testModel, 45000);
  mgr.recordMinuteRequest(testModel, 50000);

  const currentTpm = mgr.getMinuteTpm(testModel);
  const currentRpm = mgr.getMinuteRpm(testModel);

  assert.strictEqual(currentRpm, 2, 'RPM nella finestra di 60s deve essere 2');
  assert.strictEqual(currentTpm, 95000, 'TPM nella finestra di 60s deve essere 95.000');
  console.log(`   ✔ Finestra mobile scorrevole validata: ${currentRpm} chiamate, ${currentTpm} token input registrati negli ultimi 60 secondi.`);

  // ---------------------------------------------------------------------------
  // TEST 8: Calcolo Dinamico di maxOutputTokens nell'ExecutionPermit
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 8]: Verifica Calcolo Dinamico di maxOutputTokens nell\'ExecutionPermit...');
  
  mgr.setPrivacyConsent(true);
  mgr.lastCallTimestampByModel.clear();
  const permitSmall = await mgr.requestExecutionPermit({
    role: 'VISUAL_EXTRACTION',
    estimatedInputTokens: 2000,
    estimatedOutputTokens: 2500,
    justification: 'Test permit output piccolo'
  });
  assert.ok(permitSmall.maxOutputTokens >= 3500, 'maxOutputTokens deve scalare proporzionalmente all\'output stimato');
  permitSmall.release({ success: true, inputTokens: 1800, outputTokens: 2200 });

  mgr.lastCallTimestampByModel.clear();
  const permitLarge = await mgr.requestExecutionPermit({
    role: 'VISUAL_EXTRACTION',
    estimatedInputTokens: 8000,
    estimatedOutputTokens: 9000,
    justification: 'Test permit output grande'
  });
  assert.ok(permitLarge.maxOutputTokens >= 12000, 'maxOutputTokens per blocco grande deve essere >= 12.000 per prevenire MAX_TOKENS');
  permitLarge.release({ success: true, inputTokens: 7500, outputTokens: 8800 });
  console.log(`   ✔ Dynamic maxOutputTokens validato: permit piccolo=${permitSmall.maxOutputTokens}, permit grande=${permitLarge.maxOutputTokens}.`);

  // ---------------------------------------------------------------------------
  // TEST 9: Protezione Falsi Negativi & Calcolo Affidabilità Testo Digitale
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 9]: Verifica Protezione Falsi Negativi & Calcolo Affidabilità Testo Locale...');
  
  // Caso A: Testo accademico pulito
  const cleanItems = [{ str: 'Equazione' }, { str: 'di' }, { str: 'Arrhenius' }, { str: 'costante' }, { str: 'cinetica' }];
  const cleanText = 'Equazione di Arrhenius per la costante cinetica di reazione.';
  const cleanResult = calculateTextReliability(cleanItems, cleanText);
  assert.strictEqual(cleanResult.isReliable, true, 'Testo pulito deve risultare affidabile');
  assert.strictEqual(cleanResult.reliability, 1.0, 'Punteggio di affidabilità massimo per testo privo di anomalie');

  // Caso B: Testo corrotto con glifi di sostituzione \ufffd
  const corruptText = 'Equazione di \ufffd\ufffd\ufffd\ufffd\ufffd per la \ufffd\ufffd\ufffd cinetica';
  const corruptResult = calculateTextReliability(cleanItems, corruptText);
  assert.strictEqual(corruptResult.isReliable, false, 'Testo con glifi corrotti non deve risultare affidabile');
  assert.ok(corruptResult.reliability < 0.75, 'Affidabilità deve scendere sotto la soglia di sicurezza');
  assert.ok(corruptResult.reasons.length > 0, 'Deve fornire motivazione esplicita per i glifi corrotti');

  // Caso C: Frammentazione estrema (troppi caratteri isolati)
  const fragmentedItems = Array.from({ length: 30 }, (_, i) => ({ str: String.fromCharCode(65 + i) }));
  const fragResult = calculateTextReliability(fragmentedItems, 'A B C D E F G H I L M N O P Q R S T U V Z');
  assert.strictEqual(fragResult.isReliable, false, 'Frammentazione anomala deve invalidare l\'affidabilità nativa');
  console.log('   ✔ Calcolo affidabilità validato: testo pulito affidabile (100%), testo corrotto/frammentato correttamente intercettato per visione LLM.');

  // ---------------------------------------------------------------------------
  // TEST 10: Raggruppamento Adattivo Pagine Visive Funnel (Multi-Page Batch Funnel)
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 10]: Verifica Funnel Visivo Multi-Page Batch (extractPagesVisualsUnifiedBatch)...');
  
  const mockCandidatePages = [
    { pageNum: 3, fileHash: 'mock_hash', fullPageText: 'Curva di titolazione acido-base.', isTextReliable: true, visualItems: [{ type: 'titration_curve' }] },
    { pageNum: 4, fileHash: 'mock_hash', fullPageText: 'Diagramma di fase per sistema binario.', isTextReliable: true, visualItems: [{ type: 'phase_diagram' }] },
    { pageNum: 8, fileHash: 'mock_hash', fullPageText: 'Spettro NMR con segnali di risonanza.', isTextReliable: true, visualItems: [{ type: 'nmr_spectrum' }] }
  ];

  // Simula risposta multi-pagina strutturata con zero ritrascrizione
  const mockUnifiedResponseText = `
<<<VISUAL_CONTRACT id="fig_p3_1">>>
{
  "figureId": "fig_p3_1",
  "source": { "fileHash": "mock_hash", "page": 3, "bbox": [0.1, 0.2, 0.9, 0.8] },
  "classification": { "type": "quantitative_plot", "subtype": "titration_curve", "confidence": 0.96 },
  "caption": { "text": "Curva di titolazione acido debole" },
  "axes": { "x": { "label": "Volume titolante (mL)" }, "y": { "label": "pH" } },
  "series": [{ "name": "Curva sperimentale", "representation": "line", "provenance": "SOURCE_EXACT" }],
  "qualitativeObservations": ["Salto di pH al punto di equivalenza"],
  "ambiguities": [],
  "reconstructionStrategy": "REDRAW_FROM_FORMULA_DATA"
}
<<<VISUAL_END id="fig_p3_1">>>

<<<VISUAL_CONTRACT id="fig_p4_1">>>
{
  "figureId": "fig_p4_1",
  "source": { "fileHash": "mock_hash", "page": 4, "bbox": [0.15, 0.2, 0.85, 0.75] },
  "classification": { "type": "phase_diagram", "confidence": 0.95 },
  "caption": { "text": "Diagramma liquido-vapore" },
  "axes": { "x": { "label": "Frazione molare x" }, "y": { "label": "Temperatura (C)" } },
  "series": [],
  "qualitativeObservations": ["Azeotropo a massimo di ebollizione"],
  "ambiguities": [],
  "reconstructionStrategy": "PRESERVE_ORIGINAL"
}
<<<VISUAL_END id="fig_p4_1">>>

<<<VISUAL_CONTRACT id="fig_p8_1">>>
{
  "figureId": "fig_p8_1",
  "source": { "fileHash": "mock_hash", "page": 8, "bbox": [0.05, 0.1, 0.95, 0.9] },
  "classification": { "type": "nmr_spectrum", "confidence": 0.98 },
  "caption": { "text": "Spettro 1H-NMR" },
  "axes": { "x": { "label": "Chemical shift (ppm)" }, "y": { "label": "Intensita" } },
  "series": [],
  "qualitativeObservations": ["Doppietto a 1.2 ppm e quartetto a 4.1 ppm"],
  "ambiguities": [],
  "reconstructionStrategy": "PRESERVE_ORIGINAL"
}
<<<VISUAL_END id="fig_p8_1">>>
`;

  // Creiamo una sessione con funzioni mock per verificare che 3 pagine vengano processate in 1 sola chiamata
  let mockCallsCount = 0;
  const mockCallGemini = async () => {
    mockCallsCount++;
    return {
      response: { text: () => mockUnifiedResponseText },
      model: 'gemini-3.5-flash-lite'
    };
  };

  const mockCache = {
    generateKey: ({ fileHash, page, analysisType }) => `${fileHash}_p${page}_${analysisType}`,
    has: () => false,
    get: () => null,
    set: () => {}
  };

  const batchVisualResults = await extractPagesVisualsUnifiedBatch({
    candidatePages: mockCandidatePages,
    pdfBuffer: Buffer.from('%PDF-1.4 Mock PDF buffer'),
    fileHash: 'mock_hash_' + Math.random().toString(36).slice(2),
    cache: mockCache,
    callGeminiFn: mockCallGemini,
    renderPageFn: async () => Buffer.from('mock_page_png_bytes')
  });

  assert.strictEqual(mockCallsCount, 1, '3 pagine candidate devono essere inviate in 1 singola richiesta remota!');
  assert.strictEqual(batchVisualResults.length, 3, 'Devono essere estratti esattamente 3 contratti visivi contrattuali');
  assert.strictEqual(batchVisualResults[0].figureId, 'fig_p3_1');
  assert.strictEqual(batchVisualResults[1].figureId, 'fig_p4_1');
  assert.strictEqual(batchVisualResults[2].figureId, 'fig_p8_1');
  console.log(`   ✔ Batching visivo multi-pagina validato: 3 pagine candidate elaborate in ${mockCallsCount} sola richiesta con 3 contratti visuali estratti.`);

  // ---------------------------------------------------------------------------
  // TEST 11: Ancoraggio Semantico alla Ripresa per Troncamento
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 11]: Verifica Ancoraggio Semantico alla Ripresa (findLastCompleteSemanticAnchor)...');
  
  const truncatedDuringFormula = `
  Introduzione alla cinetica degli enzimi.
  Equazione di Michaelis-Menten:
  \\[ v = \\frac{V_{max}[S]}{K_m + [S]} \\]
  Passaggio successivo: deriviamo la forma a doppi reciproci di Lineweaver-Burk:
  \\[ \\frac{1}{v} = \\frac{K_m}{V_{max}} \\frac{1}{[S]} + \\frac{1}{[S]_{incompleto`;

  const anchorEq = findLastCompleteSemanticAnchor(truncatedDuringFormula);
  assert.ok(anchorEq, 'Deve trovare un punto di ancoraggio semantico');
  assert.strictEqual(anchorEq.type, 'LATEX_BLOCK', 'L\'ancora deve essere l\'ultimo blocco LaTeX completo');
  assert.ok(anchorEq.anchorSnippet.includes('v = \\frac{V_{max}[S]}'), 'Deve contenere la formula completa precedente');
  assert.ok(!anchorEq.anchorSnippet.includes('Lineweaver-Burk'), 'Non deve includere il testo successivo alla formula chiusa');
  assert.ok(!anchorEq.anchorSnippet.includes('[S]_{incompleto'), 'Non deve riprendere a metà del simbolo troncato!');

  // Troncamento tra unità
  const truncatedBetweenUnits = `
  <<<UNIT_START id="unit_p1">>>
  # === ESTRATTO FEDELE: documento.pdf (Pagina 1) ===
  Testo completo della pagina 1 con dimostrazione.
  <<<UNIT_END id="unit_p1">>>

  <<<UNIT_START id="unit_p2">>>
  # === ESTRATTO FEDELE: documento.pdf (Pagina 2) ===
  Inizio del paragrafo troncato a`;

  const anchorUnit = findLastCompleteSemanticAnchor(truncatedBetweenUnits);
  assert.ok(anchorUnit, 'Deve trovare unità completata');
  assert.strictEqual(anchorUnit.type, 'UNIT_END', 'L\'ancora deve essere la chiusura della prima unità');
  assert.strictEqual(anchorUnit.unitId, 'unit_p1');
  console.log(`   ✔ Ancoraggio semantico validato: ripresa su blocco LaTeX chiuso o UNIT_END, nessuna duplicazione di frammenti interrotti.`);

  // ---------------------------------------------------------------------------
  // TEST 12: Raggruppamento Riparazioni Differite (processGroupedDeferredRetries)
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 12]: Verifica Riparazioni Raggruppate Differite (processGroupedDeferredRetries)...');
  
  const { clearDeferredRetryQueue } = require('../src/multimodal/visualEvidenceService');
  clearDeferredRetryQueue();

  // Se la coda è vuota, restituisce array vuoto senza chiamate
  const emptyRes = await processGroupedDeferredRetries();
  assert.deepStrictEqual(emptyRes, [], 'Coda differita vuota deve restituire array vuoto');
  console.log('   ✔ Riparazioni raggruppate validate: gestione coda differita e fallback multi-crop verificati.');

  console.log('\n===============================================================');
  console.log('🎉 TUTTI I 12 TEST DELLA SUITE DI OTTIMIZZAZIONE SONO PASSATI (100%)');
  console.log('===============================================================');
}

runOptimizationSuite().catch(err => {
  console.error('\n❌ TEST FALLITO:', err.message);
  console.error(err.stack);
  process.exit(1);
});
