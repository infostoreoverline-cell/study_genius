/**
 * StudyGenius — Test Suite: Visual Reading Contract (VRC) & Adaptive Epistemic Hermeneutics
 * 
 * Verifica le 7 proprietà cardine:
 * 1. Assegnazione Traiettorie Cognitive (State Space, Transport Vector, Catalytic Cycle, Discriminant Branching)
 * 2. Calibrazione Profondità Didattica A-D (Glance, Conceptual, Quantitative, Problem-Solving)
 * 3. Bando Cliché Introduttivi Passivi (BANNED_VISUAL_CLICHE)
 * 4. Principio della Domanda Scientifica Sospesa (MISSING_SUSPENDED_QUESTION)
 * 5. Ancoraggi Semantici Bidirezionali Testo <-> Grafica (MISSING_SEMANTIC_ANCHORS)
 * 6. Separazione Didascalia Tecnica vs Ermeneutica Fenomenologica (CAPTION_NARRATIVE_POLLUTION)
 * 7. Integrazione DidacticCritic: Rilassamento Adattivo Classe A vs Rigore Analitico Classe C/D
 */

const assert = require('assert');
const {
  READING_DEPTH_CLASSES,
  COGNITIVE_TRAJECTORIES,
  EXAM_COMPETENCIES,
  determineReadingDepthClass,
  determineCognitiveTrajectory,
  getTrajectoryProtocolSteps,
  buildReadingContract,
  auditReadingText
} = require('../src/core/visualReadingContract');

const {
  VisualQualityAuditor,
  DidacticCritic,
  QUALITY_DEFICIENCY_CODES
} = require('../src/verification/visualQualityGates');

async function runTests() {
  console.log('🧪 AVVIO TEST SUITE: Visual Reading Contract (VRC) & Adaptive Epistemic Hermeneutics\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`  ✅ [PASS] ${name}`);
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Errore: ${err.message}\n`);
    }
  }

  // =========================================================================
  // TEST 1: Traiettorie Cognitive
  // =========================================================================
  test('1. Traiettorie Cognitive: Assegnazione corretta per forma e struttura della conoscenza', () => {
    // Ciclo catalitico
    const cycleTraj = determineCognitiveTrajectory({ chosenRepresentation: 'cyclic_mechanism' });
    assert.strictEqual(cycleTraj, COGNITIVE_TRAJECTORIES.CATALYTIC_CYCLE);

    // Flusso PFD / Cella a membrana
    const pfdTraj = determineCognitiveTrajectory({ chosenRepresentation: 'membrane_cell_flowsheet' });
    assert.strictEqual(pfdTraj, COGNITIVE_TRAJECTORIES.TRANSPORT_VECTOR);

    // Decision tree / Roadmap
    const treeTraj = determineCognitiveTrajectory({ chosenRepresentation: 'technology_decision_tree' });
    assert.strictEqual(treeTraj, COGNITIVE_TRAJECTORIES.DISCRIMINANT_BRANCHING);

    // Curve di stato / Plot cartesiani
    const plotTraj = determineCognitiveTrajectory({ chosenRepresentation: 'cartesian_curves_pump_head' });
    assert.strictEqual(plotTraj, COGNITIVE_TRAJECTORIES.STATE_SPACE);

    // Verifica passi del protocollo per State Space (6 step)
    const steps = getTrajectoryProtocolSteps(plotTraj);
    assert.strictEqual(steps.length, 6, 'State Space deve prevedere 6 passi sequenziali di lettura');
    assert.strictEqual(steps[0].name, 'Assi e Unità di Misura');
    assert.strictEqual(steps[3].name, 'Punto di Lavoro Nominale');
  });

  // =========================================================================
  // TEST 2: Calibrazione Profondità Didattica A-D
  // =========================================================================
  test('2. Calibrazione Profondità: Differenziazione rigorosa tra Overview (A), Meccanismo (B), Quantitativo (C) ed Esame (D)', () => {
    // Classe A: Roadmap
    const classA = determineReadingDepthClass({ chosenRepresentation: 'roadmap_stepper', visualLevel: 'ORIENTAMENTO' });
    assert.strictEqual(classA, READING_DEPTH_CLASSES.CLASS_A_GLANCE);

    // Classe B: Flusso o meccanismo
    const classB = determineReadingDepthClass({ chosenRepresentation: 'cyclic_mechanism', visualLevel: 'COMPRENSIONE' });
    assert.strictEqual(classB, READING_DEPTH_CLASSES.CLASS_B_CONCEPTUAL);

    // Classe C: Plot quantitativo con assi
    const classC = determineReadingDepthClass(
      { chosenRepresentation: 'kinetic_plot' },
      { axes: { x: { label: 'T' }, y: { label: 'k' } } }
    );
    assert.strictEqual(classC, READING_DEPTH_CLASSES.CLASS_C_QUANTITATIVE);

    // Classe D: Problema d'esame
    const classD = determineReadingDepthClass({ chosenRepresentation: 'reactor_sizing_calc', visualLevel: 'EXAM_PROBLEM' });
    assert.strictEqual(classD, READING_DEPTH_CLASSES.CLASS_D_PROBLEM_SOLVING);
  });

  // =========================================================================
  // TEST 3: Intercettazione Bando Cliché Introduttivi
  // =========================================================================
  test('3. Bando Cliché: Rileva e penalizza cliché passivi ("Come si evince chiaramente dalla figura")', () => {
    const contract = buildReadingContract(
      { conceptId: 'fig_reazione', label: 'Profilo di Reazione' },
      { classification: { type: 'energy_profile' } },
      { depthClass: READING_DEPTH_CLASSES.CLASS_B_CONCEPTUAL }
    );

    const badText = `
      Nel processo chimico esaminato, come si evince chiaramente dalla figura fig_reazione,
      l'energia di attivazione diminuisce in presenza del catalizzatore.
    `;

    const audit = auditReadingText(contract, badText, 'Fig. 1 — Profilo energetico.');
    assert.strictEqual(audit.passed, false, 'Deve fallire per presenza di cliché introduttivo passivo');
    const clicheDef = audit.deficiencies.find(d => d.code === 'BANNED_VISUAL_CLICHE');
    assert(clicheDef, 'Deve contenere la deficiency BANNED_VISUAL_CLICHE');
  });

  // =========================================================================
  // TEST 4: Principio della Domanda Scientifica Sospesa
  // =========================================================================
  test('4. Domanda Scientifica Sospesa: Il visuale deve rispondere a un dilemma teorico precedente', () => {
    const contract = buildReadingContract(
      { conceptId: 'fig_pompa', label: 'Curva Caratteristica Pompa' },
      { classification: { type: 'quantitative_plot' }, axes: { x: { label: 'Portata Q' }, y: { label: 'Prevalenza H' } } },
      { depthClass: READING_DEPTH_CLASSES.CLASS_C_QUANTITATIVE, semanticAnchors: ['Portata Q', 'Prevalenza H', 'Punto di lavoro'] }
    );

    // Testo privo di tensione scientifica precedente
    const textWithoutTension = `
      Trattiamo la prevalenza. fig_pompa illustra la Portata Q e Prevalenza H nel Punto di lavoro.
      Se aumentiamo la portata, la prevalenza cala. Attenzione al trabocchetto del punto di lavoro.
    `;
    const auditCold = auditReadingText(contract, textWithoutTension);
    const missingQuestionDef = auditCold.deficiencies.find(d => d.code === 'MISSING_SUSPENDED_QUESTION');
    assert(missingQuestionDef, 'Deve rilevare MISSING_SUSPENDED_QUESTION quando manca il dilemma preliminare');

    // Testo con domanda scientifica sospesa
    const textWithTension = `
      Come è possibile garantire che la pompa operi stabilmente senza incorrere nel fenomeno di cavitazione?
      Per rispondere a questa esigenza, analizziamo fig_pompa:
      Lungo l'asse delle ascisse è riportata la Portata Q [m³/h], mentre sulle ordinate troviamo la Prevalenza H [m].
      Il Punto di lavoro P0 stabilisce l'intersezione con la curva dell'impianto.
      Se aumentiamo la resistenza della valvola, il punto si sposta verso sinistra riducendo la portata.
      Attenzione al trabocchetto tipico d'esame: confondere la prevalenza manometrica con quella geodetica.
    `;
    const auditWarm = auditReadingText(contract, textWithTension);
    assert(!auditWarm.deficiencies.some(d => d.code === 'MISSING_SUSPENDED_QUESTION'), 'Non deve segnalare MISSING_SUSPENDED_QUESTION');
  });

  // =========================================================================
  // TEST 5: Ancoraggi Semantici Testo <-> Grafica
  // =========================================================================
  test('5. Ancoraggi Semantici: Verifica la connessione bidirezionale tra claim nel testo ed elementi grafici', () => {
    const contract = buildReadingContract(
      { conceptId: 'fig_membrana', label: 'Cella Cloro-Soda a Membrana' },
      {},
      {
        depthClass: READING_DEPTH_CLASSES.CLASS_B_CONCEPTUAL,
        trajectory: COGNITIVE_TRAJECTORIES.TRANSPORT_VECTOR,
        semanticAnchors: ['comparto anodico', 'membrana Nafion', 'catolita']
      }
    );

    // Testo che ignora gli ancoraggi semantici dichiarati
    const textDisconnected = `
      Perché la selettività è fondamentale nella cella cloro-soda?
      fig_membrana mostra la cella nel suo complesso con correnti e soluzioni acquose.
      Attenzione al trabocchetto delle perdite ohmiche.
    `;
    const auditDisconn = auditReadingText(contract, textDisconnected);
    const anchorDef = auditDisconn.deficiencies.find(d => d.code === 'MISSING_SEMANTIC_ANCHORS');
    assert(anchorDef, 'Deve segnalare MISSING_SEMANTIC_ANCHORS se il testo non cita i componenti chiave');

    // Testo che cita gli ancoraggi semantici
    const textAnchored = `
      Quale meccanismo garantisce che il cloro e la soda non reagiscano pericolosamente tra loro?
      Nel diagramma fig_membrana:
      1. La salamoia purificata entra nel comparto anodico dove si sviluppa Cl2;
      2. La membrana Nafion blocca i flussi di anioni Cl- e OH-, permettendo unicamente la migrazione di Na+;
      3. Nel comparto catolita si raccoglie NaOH al 32% ad elevata purezza.
    `;
    const auditAnchored = auditReadingText(contract, textAnchored);
    assert(!auditAnchored.deficiencies.some(d => d.code === 'MISSING_SEMANTIC_ANCHORS'), 'Tutti gli ancoraggi semantici sono soddisfatti');
    assert.strictEqual(auditAnchored.matchedAnchors.length, 3);
  });

  // =========================================================================
  // TEST 6: Separazione Didascalia Tecnica vs Ermeneutica Fenomenologica
  // =========================================================================
  test('6. Separazione Didascalia: Blocca l\'inquinamento narrativo nella caption', () => {
    const contract = buildReadingContract(
      { conceptId: 'fig_ciclo', label: 'Ciclo Monsanto' },
      {},
      { depthClass: READING_DEPTH_CLASSES.CLASS_B_CONCEPTUAL }
    );

    // Didascalia prolissa con spiegazioni narrative
    const pollutedCaption = `
      Figura 4.2 — Ciclo catalitico Monsanto per la sintesi dell'acido acetico. In questa sede spieghiamo infatti che
      il rodio cambia stato di ossidazione da +1 a +3 e possiamo notare che questo accade perché il metil ioduro si addiziona
      in modo stereospecifico permettendo al complesso di coordinare un ulteriore ligando carbonilico in soluzione acida continua.
    `;

    const audit = auditReadingText(contract, 'Quale ciclo governa la carbonilazione del metanolo? fig_ciclo mostra il ciclo con catalizzatore e prodotto.', pollutedCaption);
    const captionDef = audit.deficiencies.find(d => d.code === 'CAPTION_NARRATIVE_POLLUTION');
    assert(captionDef, 'Deve segnalare CAPTION_NARRATIVE_POLLUTION per didascalia narrativa eccessiva');

    // Didascalia tecnica pulita
    const cleanCaption = 'Figura 4.2 — Ciclo catalitico Monsanto. Condizioni: T = 180 °C, P = 30 bar. Provenienza: SOURCE_RECONSTRUCTED.';
    const auditClean = auditReadingText(contract, 'Quale ciclo governa la carbonilazione del metanolo? fig_ciclo mostra il catalizzatore, stato di ossidazione e prodotto.', cleanCaption);
    assert(!auditClean.deficiencies.some(d => d.code === 'CAPTION_NARRATIVE_POLLUTION'));
  });

  // =========================================================================
  // TEST 7: Integrazione DidacticCritic e Rilassamento Adattivo per Classe A
  // =========================================================================
  test('7. Integrazione DidacticCritic: Classe A non richiede trabocchetto forzato, Classe C esige rigore', () => {
    const auditor = new VisualQualityAuditor();

    // 7.1 Mappa / Roadmap di Classe A (Glance)
    const classAEvidence = [
      {
        figureId: 'fig_roadmap_tecnologie',
        provenance: 'MODEL_SYNTHESIZED',
        depthClass: READING_DEPTH_CLASSES.CLASS_A_GLANCE,
        source: { fileHash: 'hash_synth', page: 1, bbox: [0, 0, 100, 100] },
        caption: { text: 'Mappa concettuale delle tecnologie cloro-alcali' },
        classification: { type: 'conceptual_diagram', confidence: 0.95 }
      }
    ];

    // Testo per Classe A: descrittivo e sintetico, SENZA trabocchetto d'esame
    const markdownClassA = `
      # Panoramica Tecnologica
      La sezione seguente esplora fig_roadmap_tecnologie per orientare lo studente tra mercurio, diaframma e membrana.
    `;

    const resultA = auditor.auditPublication({
      visualEvidences: classAEvidence,
      markdownContent: markdownClassA
    });

    // In classe A, l'assenza di trabocchetto d'esame NON deve essere penalizzata!
    const trapDefA = resultA.deficiencies.find(d => d.code === QUALITY_DEFICIENCY_CODES.MISSING_EXAM_TRAP_NOTE);
    assert(!trapDefA, 'La Classe A (Overview) non deve ricevere penalità per assenza di trabocchetto d\'esame forzato!');
    assert.strictEqual(resultA.passed, true, `Audit per Classe A deve passare, errori: ${resultA.hardFails.map(h => h.message).join('; ')}`);
    assert.strictEqual(resultA.visualScore, 100, 'Score 100/100 per Classe A ben integrata');

    // 7.2 Grafico Quantitativo di Classe C con Ermeneutica Perfetta
    const classCEvidence = [
      {
        figureId: 'fig_curva_rendimento',
        provenance: 'FORMULA_DERIVED',
        depthClass: READING_DEPTH_CLASSES.CLASS_C_QUANTITATIVE,
        source: { fileHash: 'hash_derived', page: 2, bbox: [0, 0, 100, 100] },
        caption: { text: 'Rendimento faradico in funzione della densità di corrente j. Provenienza: FORMULA_DERIVED.' },
        classification: { type: 'quantitative_plot', confidence: 0.98 },
        axes: {
          x: { label: 'j', unit: 'kA/m^2', scale: 'linear' },
          y: { label: 'eta', unit: '%', scale: 'linear' }
        },
        readingContract: buildReadingContract(
          { conceptId: 'fig_curva_rendimento', label: 'Curva di Rendimento Faradico' },
          {
            classification: { type: 'quantitative_plot', confidence: 0.98 },
            axes: { x: { label: 'j' }, y: { label: 'eta' } }
          },
          {
            depthClass: READING_DEPTH_CLASSES.CLASS_C_QUANTITATIVE,
            semanticAnchors: ['j', 'eta', 'punto di lavoro']
          }
        )
      }
    ];

    const markdownClassC = `
      ## Analisi Elettrochimica
      Come varia l'efficienza reale della cella quando viene forzata ad alte produttività?
      Esaminiamo fig_curva_rendimento:
      Lungo l'asse x è tracciata la densità di corrente j [kA/m²], mentre l'asse y riporta il rendimento faradico eta [%].
      Il punto di lavoro nominale si colloca a 3.5 kA/m² con un rendimento del 96%.
      Se aumentiamo la densità di corrente oltre i 4 kA/m², le reazioni parassite aumentano causando un drastico calo di eta.
      Attenzione al trabocchetto tipico d'esame: non confondere il rendimento faradico (di corrente) con il rendimento energetico globale!
    `;

    const resultC = auditor.auditPublication({
      visualEvidences: classCEvidence,
      markdownContent: markdownClassC,
      strictReadingContract: true
    });

    assert.strictEqual(resultC.passed, true, 'Audit publication per Classe C deve passare');
    assert.strictEqual(resultC.deficiencies.length, 0, `Nessuna deficiency attesa per Classe C impeccabile, trovate: ${resultC.deficiencies.map(d => d.code).join(', ')}`);
    assert.strictEqual(resultC.visualScore, 100, 'Score 100/100 per ermeneutica quantitativa completa');
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
