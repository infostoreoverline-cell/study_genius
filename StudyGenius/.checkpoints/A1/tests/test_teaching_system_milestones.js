/**
 * Test Suite: StudyGenius Teaching System — Milestones 1 & 2
 * 
 * Verifies:
 * 1. Subject Knowledge Base persistence (LOAD_KB, SAVE_KB, MERGE_KB)
 * 2. Canonical Explanation registry & retrieval (canonicalExplanationId, REVIEW_OF, FIRST_USE)
 * 3. Semantic deduplication & 34x duplicate collapse (Teorie Acido-Base benchmark)
 * 4. Quality Engine Rendering & Formatting Hard-Fails:
 *    - EMPTY_FORMULA_RENDER
 *    - LATEX_SYNTAX_ERROR / BROKEN_LATEX
 *    - MATH_AS_CODE_SPAN
 *    - LLM_PREAMBLE_LEAK
 *    - DUPLICATE_ACROSS_SESSIONS & DUPLICATE_CANONICAL_EXPLANATION
 * 5. Session listing cleanliness (filtering auxiliary JSON files: _blueprint, _jobState, etc.)
 */

const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');

const {
  createGraph,
  upsertNode,
  saveGraph,
  loadSubjectKnowledgeBase,
  saveSubjectKnowledgeBase,
  mergeIntoSubjectKnowledgeBase,
  findCanonicalExplanation,
  registerCanonicalExplanation
} = require('../src/core/knowledgeGraph');

const {
  collapseDuplicateCanonicalSections,
  cleanConversationalPreamble,
  repairMathInCodeSpans
} = require('../src/core/textSanitizer');

const { QualityEngine } = require('../src/core/qualityEngine');
const { AcademicContract } = require('../src/core/contract');

console.log('🧪 AVVIO TEST AUTOMATIZZATI STUDYGENIUS TEACHING SYSTEM (MILESTONES 1 & 2)...\n');

// =========================================================================
// TEST 1: Subject Knowledge Base Persistence & Upsert Merge
// =========================================================================
console.log('1️⃣ Test Subject Knowledge Base Persistence (LOAD_KB, SAVE_KB, MERGE_KB)...');
const tempSessionsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studygenius_kb_test_'));

try {
  const subject = 'Chimica Analitica';
  
  // 1. Caricamento iniziale da directory vuota
  const kbInitial = loadSubjectKnowledgeBase(subject, tempSessionsDir);
  assert.strictEqual(kbInitial.nodes.length, 0, 'La KB iniziale per nuova materia deve essere vuota');
  assert.strictEqual(kbInitial.subject, subject);

  // 2. Registrazione spiegazione canonica nella sessione 1
  const session1Graph = createGraph('session-1', subject);
  upsertNode(session1Graph, {
    id: 'acid-base-core',
    type: 'CONCEPT',
    label: 'Teorie Acido-Base e Interazioni Elettrostatiche',
    chapterId: 'cap1',
    canonicalExplanationId: 'canon-acid-base-v1',
    isCanonical: true,
    canonicalRef: 'Capitolo 1, Sezione 1.1',
    firstUse: { chapter: 'cap1', section: '1.1', position: 100 },
    attrs: { importance: 5, examRelevance: 5 }
  });

  // Salva session1 nel subject KB
  mergeIntoSubjectKnowledgeBase(kbInitial, session1Graph);
  saveSubjectKnowledgeBase(subject, kbInitial, tempSessionsDir);

  // 3. Nuova sessione carica la KB salvata
  const kbLoaded = loadSubjectKnowledgeBase(subject, tempSessionsDir);
  assert.strictEqual(kbLoaded.nodes.length, 1, 'La KB ricaricata deve contenere 1 nodo persistito');
  assert.strictEqual(kbLoaded.nodes[0].canonicalExplanationId, 'canon-acid-base-v1');
  assert.strictEqual(kbLoaded.nodes[0].isCanonical, true);
  assert.strictEqual(kbLoaded.nodes[0].canonicalRef, 'Capitolo 1, Sezione 1.1');

  // 4. Sessione 2 fa upsert: stesso concetto viene riconosciuto come REVIEW
  const session2Found = findCanonicalExplanation(kbLoaded, 'Teorie Acido-Base e Interazioni Elettrostatiche');
  assert.strictEqual(session2Found.found, true, 'Il concetto deve essere trovato nella KB persistente');
  assert.strictEqual(session2Found.canonicalExplanationId, 'canon-acid-base-v1');
  assert.strictEqual(session2Found.canonicalRef, 'Capitolo 1, Sezione 1.1');

  console.log('   ✅ Subject Knowledge Base Persistence & Upsert verificati con successo.');
} finally {
  fs.removeSync(tempSessionsDir);
}

// =========================================================================
// TEST 2: Canonical Explanation Registry & Pedagogical Edge Types
// =========================================================================
console.log('\n2️⃣ Test Canonical Explanation Registry & Pedagogical Edge Types...');
{
  const graph = createGraph('test-session', 'Chimica Analitica');
  
  registerCanonicalExplanation(
    graph,
    'alpha-metal',
    'Coefficiente di Reazione Parassita del Metallo (alpha_M)',
    'canon-alpha-metal-master',
    'Capitolo 3, Sezione 3.2',
    { chapter: 'cap3', section: '3.2', position: 450 }
  );

  const node = graph.nodes.find(n => n.id === 'alpha-metal');
  assert.ok(node, 'Il nodo canonico deve essere registrato');
  assert.strictEqual(node.canonicalExplanationId, 'canon-alpha-metal-master');
  assert.strictEqual(node.isCanonical, true);
  assert.strictEqual(node.firstUse.section, '3.2');

  // Test archi pedagogici
  upsertNode(graph, {
    id: 'complexation-groups',
    type: 'CONCEPT',
    label: 'Strategia dei Gruppi in Titolazioni Complessometriche',
    chapterId: 'cap3'
  });

  graph.edges.push({
    from: 'alpha-metal',
    to: 'complexation-groups',
    type: 'FIRST_USE'
  });
  graph.edges.push({
    from: 'alpha-metal',
    to: 'complexation-groups',
    type: 'MOTIVATED_BY'
  });

  assert.strictEqual(graph.edges.length, 2);
  assert.strictEqual(graph.edges[0].type, 'FIRST_USE');
  assert.strictEqual(graph.edges[1].type, 'MOTIVATED_BY');

  console.log('   ✅ Canonical Explanation Registry & Archi pedagogici verificati.');
}

// =========================================================================
// TEST 3: Collasso Deduplicazione Semantica (Benchmark 34 Ripetizioni)
// =========================================================================
console.log('\n3️⃣ Test Benchmark Deduplicazione: Collasso delle 34 occorrenze duplicate...');
{
  // Simuliamo il caso reale: 34 blocchi generati con lo stesso titolo teorico
  let simulatedText = '';
  for (let i = 1; i <= 34; i++) {
    simulatedText += `\n\n# 1.1 Teorie Acido-Base e Interazioni Elettrostatiche\n\nIn questa trattazione iniziale introduciamo la definizione di Arrhenius, Bronsted-Lowry e Lewis. L'equilibrio acido-base si definisce mediante la costante $K_a = \\frac{[H^+][A^-]}{[HA]}$. Si definiscono le interazioni elettrostatiche e la forza ionica.\n\n### Esercizio Applicativo ${i}\nCalcolare il pH di una soluzione di acido acetico $0.1\\text{ M}$ con $K_a = 1.8 \\times 10^{-5}$. Risoluzione: $x = \\sqrt{K_a C} = 1.34 \\times 10^{-3}$, pH = 2.87.\n`;
  }

  const collapsed = collapseDuplicateCanonicalSections(simulatedText, 'Chimica Analitica');

  // Conta le occorrenze di trattazione completa vs Canonical Review
  const canonicalReviewCount = (collapsed.match(/Richiamo Didattico \(Canonical Review\)/g) || []).length;
  const originalDefinitionsCount = (collapsed.match(/introduciamo la definizione di Arrhenius/g) || []).length;
  const exercisePreservedCount = (collapsed.match(/### Esercizio Applicativo \d+/g) || []).length;

  assert.strictEqual(originalDefinitionsCount, 1, 'La teoria fondamentale deve comparire ESATTAMENTE 1 sola volta');
  assert.strictEqual(canonicalReviewCount, 33, 'Le successive 33 occorrenze devono essere collassate in Canonical Review');
  assert.strictEqual(exercisePreservedCount, 34, 'Tutti i 34 esercizi applicativi specifici devono essere preservati integralmente');

  console.log(`   ✅ Benchmark 34x superato: 1 spiegazione master canonica + 33 canonical reviews (34/34 esercizi preservati).`);
}

// =========================================================================
// TEST 4: Quality Engine Gate 0B — LLM_PREAMBLE_LEAK
// =========================================================================
console.log('\n4️⃣ Test Quality Engine Gate 0B (LLM_PREAMBLE_LEAK)...');
{
  const qe = new QualityEngine();
  const contract = new AcademicContract({ subject: 'Fisica', topic: 'Termodinamica' });

  // Testo con preambolo conversazionale residuo (> 500 caratteri per superare Gate 0)
  const textWithPreamble = `Certamente. Ecco a te la trattazione completa e approfondita di Termodinamica come da te richiesto:\n\n---\n\n# 1. Primo Principio della Termodinamica\n\nIl primo principio della termodinamica stabilisce la conservazione dell'energia per un sistema termodinamico chiuso. Formalmente, per una trasformazione infinitesima o finita abbiamo:
$$ \\Delta U = Q - W $$
dove $U$ rappresenta l'energia interna del sistema (funzione di stato estensiva espressa in Joule), $Q$ è il calore scambiato con l'ambiente circostante e $W$ è il lavoro termodinamico compiuto dal sistema.
💡 **Intuizione Fenomenologica:** L'energia non può essere né creata né distrutta, ma solo convertita tra forme diverse. L'equivalenza tra calore e lavoro meccanico è il fondamento della conversione energetica.
Condizioni di validità del modello: sistema chiuso privo di reazioni nucleari o relativistiche.`;

  const report = qe.evaluateQuality(textWithPreamble, contract, 'Fisica');
  const hasPreambleFail = report.failedGates.some(f => f.type === 'LLM_PREAMBLE_LEAK');
  assert.ok(hasPreambleFail, 'Il Quality Engine deve sollevare un HARD-FAIL per LLM_PREAMBLE_LEAK');

  // Verifica auto-pulizia deterministica con cleanConversationalPreamble
  const cleaned = cleanConversationalPreamble(textWithPreamble);
  assert.ok(!cleaned.startsWith('Certamente'), 'Il preambolo deve essere rimosso');
  assert.ok(cleaned.startsWith('# 1. Primo Principio'), 'Il testo ripulito deve iniziare direttamente dal titolo Markdown');

  const reportClean = qe.evaluateQuality(cleaned, contract, 'Fisica');
  const cleanHasPreambleFail = reportClean.failedGates.some(f => f.type === 'LLM_PREAMBLE_LEAK');
  assert.ok(!cleanHasPreambleFail, 'Dopo la sanitizzazione deterministica, il gate LLM_PREAMBLE_LEAK deve essere superato');

  console.log('   ✅ Gate 0B LLM_PREAMBLE_LEAK e sanitizzatore verificati con successo.');
}

// =========================================================================
// TEST 5: Quality Engine Gate 1 — LATEX_SYNTAX_ERROR & EMPTY_FORMULA_RENDER
// =========================================================================
console.log('\n5️⃣ Test Quality Engine Gate 1 (LATEX_SYNTAX_ERROR & EMPTY_FORMULA_RENDER)...');
{
  const qe = new QualityEngine();
  const contract = new AcademicContract({ subject: 'Chimica', topic: 'Equilibri' });

  // Formula con sintassi LaTeX rotta (> 500 car.)
  const textWithBrokenLatex = `# 1. Equilibri Ionici in Soluzione Acquosa

La costante di equilibrio per la dissociazione dell'acido debole $HA$ in acqua si formalizza tramite la legge di azione di massa di Guldberg e Waage.
La reazione è: $HA + H_2O \\rightleftharpoons A^- + H_3O^+$.
La relazione matematica fondamentale presenta un errore sintattico grave non parsabile da MathJax:
$$\\frac{\\invalidMacro{A}}{\\broken$$

💡 **Intuizione Fenomenologica:** L'acido debole rilascia protoni nel mezzo acquoso generando un equilibrio dinamico tra specie neutre indissociate e ioni solvatati.
La costante di acidità $K_a$ misura la tendenza termodinamica alla deprotonazione in condizioni standard.`;

  const reportLatex = qe.evaluateQuality(textWithBrokenLatex, contract, 'Chimica');
  const hasLatexError = reportLatex.failedGates.some(f => f.type === 'LATEX_SYNTAX_ERROR' || f.type === 'BROKEN_LATEX');
  assert.ok(hasLatexError, 'Il Quality Engine deve sollevare un HARD-FAIL per sintassi LaTeX non valida');

  // Formula che produce rendering vuoto (> 500 car.)
  const textWithEmptyFormula = `# 1. Identità e Relazioni di Equilibrio

Consideriamo la seguente relazione fondamentale per il bilancio di massa nel sistema acido-base esaminato:
$$ ~ $$

Inoltre, per la concentrazione analitica totale $C_a$ abbiamo la relazione scalare ben definita:
$$ C_a = [HA] + [A^-] $$
💡 **Intuizione Fenomenologica:** La conservazione della massa garantisce che la quantità totale dell'acido rimanga invariata indipendentemente dal grado di dissociazione $K_a$.`;

  const reportEmpty = qe.evaluateQuality(textWithEmptyFormula, contract, 'Chimica');
  assert.ok(reportEmpty.failedGates.length > 0, 'Il Quality Engine deve bloccare formule vuote o non conformi');

  console.log('   ✅ Gate 1 LATEX_SYNTAX_ERROR & EMPTY_FORMULA_RENDER verificati con successo.');
}

// =========================================================================
// TEST 6: Quality Engine Gate 2 — MATH_AS_CODE_SPAN
// =========================================================================
console.log('\n6️⃣ Test Quality Engine Gate 2 (MATH_AS_CODE_SPAN)...');
{
  const qe = new QualityEngine();
  const contract = new AcademicContract({ subject: 'Chimica', topic: 'Costanti' });

  // Notazione matematica scritta come code span (`pH`, `Ka`, `10^-5`) (> 500 car.)
  const textWithCodeSpanMath = `# 1. Notazione Globale ed Equilibri in Soluzione

Nel nostro sistema chimico in esame consideriamo un valore controllato con \`pH = 7.4\`, mentre la costante di dissociazione acida è data da \`Ka = 1.8 * 10^-5\` con concentrazione idrogenionica \`[H+] = 10^-7 M\`.
Definiamo il coefficiente di reazione parassita mediante la notazione analitica tradizionale.

💡 **Intuizione Fenomenologica:** Quando il pH varia, la concentrazione di protoni liberi determina lo spostamento del punto di equilibrio secondo il principio di Le Chatelier.
Le approssimazioni di neutralità elettrica e bilancio di carica devono essere rigorosamente verificate.`;

  const reportCodeSpan = qe.evaluateQuality(textWithCodeSpanMath, contract, 'Chimica');
  const hasCodeSpanFail = reportCodeSpan.failedGates.some(f => f.type === 'MATH_AS_CODE_SPAN');
  assert.ok(hasCodeSpanFail, 'Il Quality Engine deve sollevare HARD-FAIL per MATH_AS_CODE_SPAN');

  // Riparazione deterministica con repairMathInCodeSpans
  const repairedText = repairMathInCodeSpans(textWithCodeSpanMath, 'Chimica');
  assert.ok(repairedText.includes('$pH = 7.4$') || repairedText.includes('$pH$'), 'I code span devono essere convertiti in LaTeX $...$');
  assert.ok(repairedText.includes('$Ka'), 'Ka deve essere in LaTeX');

  console.log('   ✅ Gate 2 MATH_AS_CODE_SPAN e riparatore automatico verificati con successo.');
}

// =========================================================================
// TEST 7: Quality Engine Gate 3C — DUPLICATE_CANONICAL_EXPLANATION & DUPLICATE_ACROSS_SESSIONS
// =========================================================================
console.log('\n7️⃣ Test Quality Engine Gate 3C (DUPLICATE_CANONICAL_EXPLANATION & DUPLICATE_ACROSS_SESSIONS)...');
{
  const qe = new QualityEngine();
  const contract = new AcademicContract({ subject: 'Chimica', topic: 'Equilibri' });

  // 1. Duplicazione interna: sezione teorica identica ripetuta (> 500 car.)
  const textWithDuplicateInternal = `
# 1. Teorie Acido-Base e Interazioni Elettrostatiche
Trattazione iniziale completa con formule e dimostrazioni formali per la forza ionica $I = \\frac{1}{2} \\sum c_i z_i^2$ e coefficienti di attività di Debye-Huckel.
💡 **Intuizione Fenomenologica:** Gli ioni in soluzione creano una nube di carica opposta che scherma le attrazioni elettrostatiche.

# 2. Equilibri Complessometrici
Descrizione dettagliata della formazione dei complessi con ligandi polidentati come EDTA.

# 1. Teorie Acido-Base e Interazioni Elettrostatiche
Seconda trattazione teorica da zero dello stesso capitolo, ripetendo esattamente la definizione di Debye-Huckel e le interazioni coulombiane.
`;

  const dummyGraph = createGraph('test-session', 'Chimica');
  const reportInternal = qe.evaluateQuality(textWithDuplicateInternal, contract, 'Chimica', dummyGraph);
  const hasInternalDupFail = reportInternal.failedGates.some(f => f.type === 'DUPLICATE_CANONICAL_EXPLANATION');
  assert.ok(hasInternalDupFail, 'Il Quality Engine deve sollevare DUPLICATE_CANONICAL_EXPLANATION per titoli duplicati');

  // 2. Duplicazione cross-sessione: concetto già canonico re-derivato da zero (> 500 car.)
  const sessionGraph = createGraph('session-2', 'Chimica');
  upsertNode(sessionGraph, {
    id: 'acid-base-review',
    type: 'CONCEPT',
    label: 'Teorie Acido-Base',
    chapterId: 'cap1',
    canonicalExplanationId: 'canon-acid-base-v1',
    isCanonical: false, // Già definita in precedenza!
    canonicalRef: 'Capitolo 1, Sezione 1.1',
    attrs: { isReview: true }
  });

  const textWithReDerivation = `
# 1.1 Teorie Acido-Base
Definizione Rigorosa: Definiamo da zero cosa si intende per acido e base secondo Bronsted e formalizziamo le equazioni di reazione con le relative costanti di dissociazione $K_a$ e $K_b$.
Consideriamo la specie chimica monoprotica generica $HA$ disciolta in acqua pura a temperatura costante di $25^\\circ\\text{C}$.
La reazione di dissociazione acida all'equilibrio si esprime tramite:
$$ HA + H_2O \\rightleftharpoons A^- + H_3O^+ $$
💡 **Intuizione Fenomenologica:** Il trasferimento protonico tra donatore e accettore costituisce la base fondamentale per la teoria degli equilibri acido-base.
`;

  const reportCross = qe.evaluateQuality(textWithReDerivation, contract, 'Chimica', sessionGraph);
  const hasCrossDupFail = reportCross.failedGates.some(f => f.type === 'DUPLICATE_ACROSS_SESSIONS');
  assert.ok(hasCrossDupFail, 'Il Quality Engine deve sollevare DUPLICATE_ACROSS_SESSIONS se un nodo review viene re-derivato');

  // 3. Con Canonical Review callout, il controllo passa! (> 500 car.)
  const textWithReviewCallout = `
# 1.1 Teorie Acido-Base
> 📌 **Richiamo Didattico (Canonical Review):** I fondamenti teorici sono già stati formalizzati in Sezione 1.1.
Procediamo ora con l'applicazione diretta e il calcolo delle concentrazioni all'equilibrio con $pH = -\\log[H^+]$.
Per una soluzione con concentrazione iniziale $C_a = 0.05\\text{ M}$ e costante di acidità nota, impostiamo l'equazione di secondo grado risolutiva per la determinazione esatta del pH.
💡 **Intuizione Fenomenologica:** Avendo già formalizzato le definizioni, possiamo concentrarci direttamente sui bilanci di carica e di massa senza reiterare le dimostrazioni elementari.
`;

  const reportCallout = qe.evaluateQuality(textWithReviewCallout, contract, 'Chimica', sessionGraph);
  const hasCrossDupFail2 = reportCallout.failedGates.some(f => f.type === 'DUPLICATE_ACROSS_SESSIONS');
  assert.strictEqual(hasCrossDupFail2, false, 'Con il Canonical Review Callout, DUPLICATE_ACROSS_SESSIONS non deve fallire');

  console.log('   ✅ Gate 3C Anti-Duplication verificato con successo.');
}

// =========================================================================
// TEST 8: Session Listing Cleanliness (Filtro file ausiliari _blueprint, etc.)
// =========================================================================
console.log('\n8️⃣ Test Session Listing Cleanliness (Filtro file ausiliari _blueprint.json)...');
{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studygenius_sessions_filter_'));
  try {
    const subjDir = path.join(tempDir, 'Chimica');
    fs.ensureDirSync(subjDir);

    // Crea sessione valida
    const validMeta = {
      id: 'valid-session-123',
      title: 'Sessione Valida Chimica',
      subject: 'Chimica',
      createdAt: new Date().toISOString()
    };
    fs.writeJsonSync(path.join(subjDir, 'valid-session-123.json'), validMeta);

    // Crea file ausiliari che prima inquinavano la lista sessioni
    fs.writeJsonSync(path.join(subjDir, 'valid-session-123_blueprint.json'), { chapters: [] });
    fs.writeJsonSync(path.join(subjDir, 'valid-session-123_knowledgeGraph.json'), { nodes: [] });
    fs.writeJsonSync(path.join(subjDir, 'valid-session-123_coverage.json'), { overallCoverage: 1 });
    fs.writeJsonSync(path.join(subjDir, 'valid-session-123_jobState.json'), { currentPhase: 'DONE' });

    // Funzione di filtro usata in server.js
    const files = fs.readdirSync(subjDir);
    const sessionMetas = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      if (file.includes('_blueprint') || file.includes('_knowledgeGraph') || file.includes('_coverage') || file.includes('_jobState')) {
        continue;
      }
      try {
        const meta = fs.readJsonSync(path.join(subjDir, file));
        if (meta && (meta.id || meta.sessionId)) {
          sessionMetas.push(meta);
        }
      } catch (e) {}
    }

    assert.strictEqual(sessionMetas.length, 1, 'Deve essere restituita solo la sessione effettiva, escludendo tutti i 4 file ausiliari');
    assert.strictEqual(sessionMetas[0].id, 'valid-session-123');

    console.log('   ✅ Filtro file ausiliari verificato con successo: zero file spazzatura o phantom sessions.');
  } finally {
    fs.removeSync(tempDir);
  }
}

console.log('\n🎉 TUTTI I TEST DEI MILESTONES 1 & 2 DEL TEACHING SYSTEM SONO STATI SUPERATI CON SUCCESSO!');
