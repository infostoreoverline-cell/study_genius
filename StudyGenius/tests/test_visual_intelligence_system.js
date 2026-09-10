/**
 * StudyGenius Academic Intelligence System
 * tests/test_visual_intelligence_system.js
 * 
 * Test Suite Ufficiale di Validazione per il Sistema di Intelligenza Visuale Epistemica:
 * 1. Visual Coverage Matrix: costruzione pre-generazione e valutazione multi-criterio dei candidati.
 * 2. Visual Coverage Audit: riconciliazione contabile e Hard Fail su promesse omesse senza motivazione.
 * 3. Bando Assoluto Pseudo-Visuali ASCII: intercettazione e degradazione nobile in tabella accademica.
 * 4. Decoupled QA a 4 auditor specializzati (Deterministico, Semantico/Scientifico, Didattico, Coverage).
 * 5. Evidence-Grounding Guard: rilevamento e blocco di componenti allucinati (es. "denuder" su membrana).
 * 6. Graduazione dei Difetti: distinzione rigorosa tra Hard Fail bloccante e Quality Deficiency graduata.
 */

const assert = require('assert');
const {
  STRATEGIC_DECISIONS,
  DETECTED_STRUCTURES,
  COGNITIVE_NEEDS,
  CANDIDATE_FORMS,
  evaluateCandidateRepresentations,
  buildVisualCoverageMatrix,
  auditVisualCoverage,
  enrichCoverageFromEvidence
} = require('../src/core/visualCoverage');

const {
  VisualQualityAuditor,
  DeterministicQAEngine,
  SemanticScientificAuditor,
  DidacticCritic,
  HARD_FAIL_CODES,
  QUALITY_DEFICIENCY_CODES
} = require('../src/verification/visualQualityGates');

const { processDiagramsInMarkdown } = require('../src/rendering/diagramEngine');

async function runTests() {
  console.log('🧪 AVVIO TEST SUITE: Sistema di Intelligenza Visuale Epistemica (StudyGenius)\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Errore: ${err.message}\n`);
    }
  }

  // =========================================================================
  // TEST 1: Valutazione Multi-Criterio delle Candidate Representations (No Lookup Table)
  // =========================================================================
  test('1. Selezione Multi-Criterio: Alternative Tecnologiche valutate su cardinalità e layout', () => {
    // Caso 1: 3 tecnologie a confronto -> Matrice comparativa
    const evalHigh = evaluateCandidateRepresentations({
      detectedStructure: DETECTED_STRUCTURES.ALTERNATIVE_TECHNOLOGIES,
      cognitiveNeed: COGNITIVE_NEEDS.UNDERSTANDING,
      factors: { cardinality: 3 }
    });
    assert.strictEqual(evalHigh.chosenRepresentation, CANDIDATE_FORMS.COMPARISON_MATRIX);
    assert(evalHigh.candidates.length >= 3, 'Dovrebbe proporre almeno 3 alternative candidate');
    assert(evalHigh.candidates.some(c => c.form === CANDIDATE_FORMS.COMPARISON_CARDS));

    // Caso 2: Ciclo catalitico -> Scelta intrinsecamente ciclica
    const evalCycle = evaluateCandidateRepresentations({
      detectedStructure: DETECTED_STRUCTURES.CATALYTIC_CYCLE,
      cognitiveNeed: COGNITIVE_NEEDS.UNDERSTANDING
    });
    assert.strictEqual(evalCycle.chosenRepresentation, CANDIDATE_FORMS.CYCLIC_MECHANISM);
    assert.strictEqual(evalCycle.strategicDecision, STRATEGIC_DECISIONS.VISUALIZE);

    // Caso 3: Definizione formale -> Decisione didattica di NON usare grafici (KEEP_AS_TEXT)
    const evalDef = evaluateCandidateRepresentations({
      detectedStructure: DETECTED_STRUCTURES.DEFINITION,
      cognitiveNeed: COGNITIVE_NEEDS.LOCAL_COMPREHENSION
    });
    assert.strictEqual(evalDef.chosenRepresentation, CANDIDATE_FORMS.PROSE);
    assert.strictEqual(evalDef.strategicDecision, STRATEGIC_DECISIONS.KEEP_AS_TEXT);
  });

  // =========================================================================
  // TEST 2: Costruzione Pre-Generazione della Visual Coverage Matrix
  // =========================================================================
  test('2. Compilazione della Visual Coverage Matrix dall\'Evidence Layer e Knowledge Graph', () => {
    const mockContracts = [
      {
        figureId: 'fig_cloro_membrana',
        conceptId: 'cella_membrana_cloro',
        label: 'Cella a Membrana per Elettrolisi Cloro-Soda',
        provenance: 'SOURCE_RECONSTRUCTED',
        classification: { type: 'technical_figure' }
      },
      {
        figureId: 'fig_ciclo_catalitico',
        conceptId: 'ciclo_monsanto',
        label: 'Ciclo Catalitico Monsanto con Rodio',
        provenance: 'SOURCE_RECONSTRUCTED',
        classification: { type: 'conceptual_diagram' }
      }
    ];

    const mockKG = {
      nodes: [
        { id: 'node_def', label: 'Definizione di Soluzione Satura', type: 'DEFINITION' },
        { id: 'node_overview', label: 'Panoramica Processi Cloro-Alcali', type: 'CONCEPT' },
        { id: 'node_uses', label: 'Usi e Applicazioni dell\'Acido Acetico', type: 'CONCEPT' }
      ]
    };

    const matrix = buildVisualCoverageMatrix({
      knowledgeGraph: mockKG,
      visualContracts: mockContracts,
      subject: 'Chimica Industriale'
    });

    assert.strictEqual(matrix.length, 5, 'La matrice deve contenere 5 requisiti visuali identificati');
    
    // Verifica decisione della definizione: KEEP_AS_TEXT
    const defItem = matrix.find(m => m.conceptId === 'node_def');
    assert.strictEqual(defItem.strategicDecision, STRATEGIC_DECISIONS.KEEP_AS_TEXT);

    // Verifica decisione del ciclo: RECONSTRUCT/VISUALIZE come cyclic_mechanism
    const cycleItem = matrix.find(m => m.conceptId === 'ciclo_monsanto');
    assert.strictEqual(cycleItem.chosenRepresentation, CANDIDATE_FORMS.CYCLIC_MECHANISM);

    // Verifica macrostruttura: roadmap
    const overviewItem = matrix.find(m => m.conceptId === 'node_overview');
    assert.strictEqual(overviewItem.chosenRepresentation, CANDIDATE_FORMS.ROADMAP_STEPPER);
    assert.strictEqual(overviewItem.provenanceIntent, 'MODEL_SYNTHESIZED');
  });

  // =========================================================================
  // TEST 3: Visual Coverage Audit (Riconciliazione e Hard Fail su Omissioni)
  // =========================================================================
  test('3. Visual Coverage Audit: Rileva omissione ingiustificata come Hard Fail', () => {
    const plannedMatrix = [
      {
        id: 'vcm-1',
        conceptId: 'fig_membrana',
        sourceId: 'fig_membrana',
        label: 'Cella a Membrana',
        strategicDecision: STRATEGIC_DECISIONS.VISUALIZE,
        chosenRepresentation: 'membrane_cell_schema'
      },
      {
        id: 'vcm-2',
        conceptId: 'ciclo_monsanto',
        sourceId: 'fig_ciclo',
        label: 'Ciclo Catalitico',
        strategicDecision: STRATEGIC_DECISIONS.RECONSTRUCT,
        chosenRepresentation: 'cyclic_mechanism'
      }
    ];

    // Simula testo che contiene solo fig_membrana ma ha dimenticato fig_ciclo senza giustificazione
    const partialMarkdown = `
# Chimica Industriale
Qui trattiamo fig_membrana con diagramma e barriera cationica.
    `;

    const audit = auditVisualCoverage(plannedMatrix, partialMarkdown, []);
    assert.strictEqual(audit.passed, false, 'Deve fallire per omissione del ciclo catalitico');
    assert.strictEqual(audit.omittedWithoutJustification, 1);
    assert.strictEqual(audit.hardFails[0].code, 'VISUAL_REQUIREMENT_OMITTED_WITHOUT_JUSTIFICATION');
  });

  test('4. Visual Coverage Audit: Superato se l\'esigenza è soddisfatta o motivatamente convertita', () => {
    const plannedMatrix = [
      {
        id: 'vcm-1',
        conceptId: 'fig_membrana',
        sourceId: 'fig_membrana',
        label: 'Cella a Membrana',
        strategicDecision: STRATEGIC_DECISIONS.VISUALIZE,
        chosenRepresentation: 'membrane_cell_schema'
      },
      {
        id: 'vcm-2',
        conceptId: 'confronto_celle',
        sourceId: 'fig_confronto',
        label: 'Confronto Celle Cloro-Soda',
        strategicDecision: STRATEGIC_DECISIONS.VISUALIZE,
        chosenRepresentation: 'comparison_matrix'
      }
    ];

    // Testo in cui fig_membrana è renderizzata e il confronto è esplicitamente convertito in tabella
    const completeMarkdown = `
# Chimica Industriale
fig_membrana: schema con barriera cationica.
Trattazione tabulare di sintesi in tabella per Confronto Celle Cloro-Soda:
| Parametro | Mercurio | Membrana |
| Efficienza | 95% | 98% |
    `;

    const audit = auditVisualCoverage(plannedMatrix, completeMarkdown, [{ id: 'fig_membrana' }]);
    assert.strictEqual(audit.passed, true, 'Deve superare l\'audit grazie alla conversione motivata');
    assert.strictEqual(audit.satisfiedVisuals, 1);
    assert.strictEqual(audit.convertedJustified, 1);
    assert.strictEqual(audit.omittedWithoutJustification, 0);
  });

  // =========================================================================
  // TEST 5: Bando Assoluto di Pseudo-Visualizzazioni ASCII (Degradazione Nobile)
  // =========================================================================
  test('5. Bando Pseudo-Visuali: Intercetta albero ASCII (├──, └──) e genera tabella accademica tipografica', () => {
    const rawMarkdownWithAscii = `
# Panoramica Tecnologie
\`\`\`tree
Processi Cloro-Alcali
├── Cella a Mercurio (Castner-Kellner)
│   ├── Anodo di Grafite
│   └── Catodo Mobile di Mercurio
├── Cella a Diaframma
└── Cella a Membrana Cationica (Nafion)
\`\`\`
Spiegazione teorica seguente.
    `;

    const rendered = processDiagramsInMarkdown(rawMarkdownWithAscii);

    // Non deve più esistere il blocco di codice monospace con ├── o └──
    assert(!rendered.includes('├──'), 'Gli alberi ASCII ├── devono essere intercettati');
    assert(!rendered.includes('└──'), 'Gli alberi ASCII └── devono essere intercettati');
    
    // Deve contenere la tabella accademica tipografica con classe academic-noble-degradation
    assert(rendered.includes('academic-noble-degradation'), 'Deve applicare la Degradazione Nobile');
    assert(rendered.includes('academic-table'), 'Deve contenere una tabella accademica');
    assert(rendered.includes('Cella a Membrana Cationica (Nafion)'), 'Deve preservare il testo dei nodi');
  });

  // =========================================================================
  // TEST 6: Evidence-Grounding Guard (Rilevamento Allucinazione "denuder" su membrana)
  // =========================================================================
  test('6. Evidence-Grounding Guard: Rileva e blocca componente allucinato errato ("denuder" su cella a membrana)', () => {
    const auditor = new VisualQualityAuditor();

    // Visual evidence con attribuzione ingegneristica falsa
    const hallucinatedEvidence = [
      {
        figureId: 'fig_test_hallucination',
        provenance: 'MODEL_SYNTHESIZED',
        caption: { text: 'Cella cloro-soda a membrana con denuder e ricircolo salamoia' },
        source: { fileHash: 'hash1', page: 1, bbox: [0, 0, 100, 100] },
        classification: { type: 'technical_figure', confidence: 0.95 }
      }
    ];

    const result = auditor.auditPublication({
      visualEvidences: hallucinatedEvidence,
      markdownContent: 'Descrizione della cella a membrana.'
    });

    assert.strictEqual(result.passed, false, 'Deve fallire per Evidence-Grounding violation');
    const groundingFail = result.hardFails.find(f => f.code === HARD_FAIL_CODES.FABRICATED_UNGROUNDED_COMPONENT);
    assert(groundingFail, 'Deve emettere FABRICATED_UNGROUNDED_COMPONENT per denuder su membrana');
    console.log(`     Diagnostica intercettata: "${groundingFail.message}"`);
  });

  // =========================================================================
  // TEST 7: Decoupled QA e Graduazione dei Difetti (Hard Fail vs Quality Deficiency)
  // =========================================================================
  test('7. Graduazione dei Difetti: Difetti lievi (didattica, asse log) penalizzano lo score senza Hard Fail', () => {
    const auditor = new VisualQualityAuditor();

    const validEvidence = [
      {
        figureId: 'fig_arrhenius',
        provenance: 'SOURCE_RECONSTRUCTED',
        caption: { text: 'Plot di Arrhenius della cinetica' },
        source: { fileHash: 'hash2', page: 3, bbox: [0, 0, 100, 100] },
        classification: { type: 'quantitative_plot', confidence: 0.98 },
        axes: {
          x: { label: '1/T', unit: 'K^-1', scale: 'linear' },
          y: { label: 'ln(k)', unit: 's^-1', scale: 'log' } // asse log non normalizzato -> Quality Deficiency
        }
      }
    ];

    // Markdown privo di Trabocchetto d'Esame -> Quality Deficiency (soft)
    const markdown = `
# Studio della Cinetica
Nel grafico fig_arrhenius osservando il grafico si nota la retta.
    `;

    const result = auditor.auditPublication({
      visualEvidences: validEvidence,
      markdownContent: markdown
    });

    assert.strictEqual(result.passed, true, 'Non ci sono Hard Fail scientifici, la pubblicazione deve essere autorizzata');
    assert(result.deficiencies.length >= 1, 'Deve aver registrato almeno una Quality Deficiency');
    assert(result.visualScore < 100 && result.visualScore >= 80, `Punteggio visuale graduato atteso tra 80 e 99, ottenuto: ${result.visualScore}`);
    console.log(`     Punteggio graduato: ${result.visualScore}/100, Deficiencies rilevate: ${result.deficiencies.map(d => d.code).join(', ')}`);
  });

  // =========================================================================
  // TEST 8: Strutture Chimiche Molecolari e Arricchimento da Evidenza Multimodale (v2.0)
  // =========================================================================
  test('8. Chimica Molecolare v2.0: Riconoscimento strutture organometalliche ed enrichCoverageFromEvidence', () => {
    // 1. Valutazione Complesso di Coordinazione
    const evalCoord = evaluateCandidateRepresentations({
      detectedStructure: DETECTED_STRUCTURES.COORDINATION_COMPLEX,
      cognitiveNeed: COGNITIVE_NEEDS.UNDERSTANDING
    });
    assert.strictEqual(evalCoord.chosenRepresentation, CANDIDATE_FORMS.COORDINATION_DIAGRAM);
    assert.strictEqual(evalCoord.strategicDecision, STRATEGIC_DECISIONS.VISUALIZE);

    // 2. Valutazione Effetto Trans
    const evalTrans = evaluateCandidateRepresentations({
      detectedStructure: DETECTED_STRUCTURES.TRANS_EFFECT,
      cognitiveNeed: COGNITIVE_NEEDS.UNDERSTANDING
    });
    assert.strictEqual(evalTrans.chosenRepresentation, CANDIDATE_FORMS.TRANS_EFFECT_SERIES);

    // 3. Valutazione Pathway Elettronico (16e⁻ / 18e⁻)
    const evalElectron = evaluateCandidateRepresentations({
      detectedStructure: DETECTED_STRUCTURES.ELECTRON_PATHWAY,
      cognitiveNeed: COGNITIVE_NEEDS.QUANTITATIVE_ANALYSIS
    });
    assert.strictEqual(evalElectron.chosenRepresentation, CANDIDATE_FORMS.ELECTRON_PATHWAY_DIAGRAM);

    // 4. Arricchimento Matrice con evidenze multimodali
    const initialMatrix = [
      {
        id: 'vcm-10',
        sourceId: 'fig_cisplatino',
        label: 'Sintesi del cisplatino',
        detectedStructure: DETECTED_STRUCTURES.MASS_FLOW,
        chosenRepresentation: CANDIDATE_FORMS.FLOWSHEET_BLOCKS
      }
    ];

    const visualContracts = [
      {
        figureId: 'fig_cisplatino',
        caption: { text: 'Effetto trans nella sostituzione dei ligandi del cisplatino Pt(II)' },
        classification: { type: 'chemical_structure' },
        qualitativeObservations: ['Complesso quadrato piano PtCl2(NH3)2', 'Effetto trans cloruro vs ammoniaca']
      }
    ];

    const enriched = enrichCoverageFromEvidence(initialMatrix, visualContracts);
    assert.strictEqual(enriched[0].detectedStructure, DETECTED_STRUCTURES.TRANS_EFFECT);
    assert.strictEqual(enriched[0].chosenRepresentation, CANDIDATE_FORMS.TRANS_EFFECT_SERIES);
    console.log(`     Enrichment riuscito: ${initialMatrix[0].chosenRepresentation} -> ${enriched[0].chosenRepresentation}`);
  });

  console.log(`\n🏁 RISULTATO TEST SUITE: ${passedTests}/${totalTests} test superati con successo.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
