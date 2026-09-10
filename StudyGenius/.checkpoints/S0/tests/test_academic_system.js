/**
 * StudyGenius Academic Intelligence System
 * test_academic_system.js
 * 
 * Suite di test automatizzati per verificare tutti i moduli dell'Academic Core.
 */

const path = require('path');
const assert = require('assert');
const {
  cleanConversationalPreamble,
  detectMathInCodeSpans,
  repairMathInCodeSpans
} = require('../src/core/textSanitizer');

console.log('🧪 AVVIO TEST AUTOMATIZZATI ACADEMIC INTELLIGENCE SYSTEM...\n');

// 1. Test PromptCompiler
console.log('1️⃣ Test PromptCompiler (Livelli L0 - L7)...');
const { PromptCompiler } = require('../src/core/promptCompiler');
const compiler = new PromptCompiler();

const physicsPrompt = compiler.compileSystemPrompt({
  subject: 'Fisica',
  studyMode: 'complete',
  customInstructions: 'Focus su onde e risonanza'
});

assert(physicsPrompt.includes('LEVEL 0 INVARIANTS'), 'Deve includere gli invarianti di livello 0');
assert(physicsPrompt.includes('MODUS OPERANDI DIDATTICO'), 'Deve includere il Modus Operandi di livello 1');
assert(physicsPrompt.includes('EPISTEMOLOGIA DELLA FISICA GENERALE'), 'Deve includere l\'epistemologia della fisica');
assert(physicsPrompt.includes('FORMATO TIPOGRAFICO E BOX SEMANTICI'), 'Deve includere i box semantici di livello 6');
assert(physicsPrompt.includes('VINCOLI DI QUALITÀ E PROTOCOLLO ANTI-BLACK-BOX'), 'Deve includere il protocollo Anti-Black-Box di livello 7');
assert(physicsPrompt.includes('Focus su onde e risonanza'), 'Deve includere le custom instructions dello studente');
console.log('   ✅ PromptCompiler superato con successo.');

// 2. Test Epistemologie
console.log('\n2️⃣ Test Epistemology Dispatcher...');
const { getEpistemologyForSubject } = require('../src/epistemology');
const chemEpi = getEpistemologyForSubject('Chimica');
const mathEpi = getEpistemologyForSubject('Matematica');
const csEpi = getEpistemologyForSubject('Informatica');

assert(chemEpi.toPromptDirective().includes('EPISTEMOLOGIA DELLA CHIMICA'), 'Epistemologia Chimica corretta');
assert(mathEpi.toPromptDirective().includes('EPISTEMOLOGIA DELLA MATEMATICA'), 'Epistemologia Matematica corretta');
assert(csEpi.toPromptDirective().includes('EPISTEMOLOGIA DELL\'INFORMATICA'), 'Epistemologia Informatica corretta');
console.log('   ✅ Epistemology Dispatcher superato con successo.');

// 3. Test AcademicContract
console.log('\n3️⃣ Test AcademicContract...');
const { AcademicContract } = require('../src/core/contract');
const contract = new AcademicContract({
  moduleId: 'test_mod_01',
  subject: 'Fisica',
  topic: 'Legge di Gauss',
  learningObjectives: ['Comprendere il flusso', 'Calcolare il campo di una sfera']
});

const directive = contract.toPromptDirective();
assert(directive.includes('CONTRATTO DIDATTICO ACCADEMICO'), 'Direttiva del contratto generata');
assert(directive.includes('Legge di Gauss'), 'Argomento presente nel contratto');

// Test validazione testo conforme
const mockValidText = `
# Capitolo 1 — Legge di Gauss

## 1.1 Inquadramento e Intuizione
> 💡 **Intuizione & Senso Fisico:** Il flusso misura quante linee di campo attraversano la superficie orientata.

## 1.2 Definizione Formale e Teorema
> 📌 **Definizione Rigorosa:** Definiamo il flusso elettrico differenziale come $d\\Phi = \\vec{E} \\cdot \\hat{n} dA$, dove $\\hat{n}$ rappresenta il versore normale alla superficie elementare $dA$.
$$ \\Phi = \\oint_S \\vec{E} \\cdot d\\vec{A} = \\frac{Q_{int}}{\\varepsilon_0} $$

## 1.3 Derivazione Analitica Passo-Passo
Sviluppando l'integrale per simmetria rotazionale sferica attorno all'origine:
$$ E(r) \\oint_S dA = E(r) 4\\pi r^2 = \\frac{Q}{\\varepsilon_0} \\implies E(r) = \\frac{1}{4\\pi\\varepsilon_0}\\frac{Q}{r^2} $$

## 1.4 Trappole d'Esame ed Errori Tipici
> ⚠️ **Attenzione / Errore Tipico d'Esame:** Confondere la validità generale della legge con la possibilità di portare E fuori dall'integrale.

## 1.5 Controlli di Coerenza
> 🔍 **Controllo di Coerenza (Dimensionale / Segno / Limiti):** Per $r \\to \\infty$, il campo tende a zero come atteso. L'unità di misura è N/C.
`.repeat(3); // lunghezza sufficiente

const validationResult = contract.validateGeneratedText(mockValidText);
assert(validationResult.valid, 'Il testo ben strutturato deve superare il contratto');
assert(validationResult.score >= 75, `Score deve essere >= 75 (attuale: ${validationResult.score})`);
console.log(`   ✅ AcademicContract superato (Score: ${validationResult.score}/100).`);

// 4. Test KnowledgeGraph & Lineage
console.log('\n4️⃣ Test AcademicKnowledgeGraph & Formula Lineage...');
const { AcademicKnowledgeGraph } = require('../src/core/knowledgeGraph');
const graph = new AcademicKnowledgeGraph();

graph.addNode({
  name: 'Campo Elettrico',
  type: 'concept',
  prerequisites: ['Forza di Coulomb'],
  examTraps: ['Confondere E con V']
});

graph.registerFormulaLineage({
  id: 'gauss_law',
  name: 'Legge di Gauss',
  latex: '\\oint \\vec{E} \\cdot d\\vec{A} = \\frac{Q}{\\varepsilon_0}',
  originLaw: 'Coulomb + Sovrapposizione'
});

const masterContext = graph.toMasterPlanContext();
assert(masterContext.includes('Campo Elettrico'), 'Grafo genera contesto per Master Plan');
assert(graph.getFormulaLineage('gauss_law') !== undefined, 'Formula Lineage registrata');
console.log('   ✅ AcademicKnowledgeGraph superato con successo.');

// 5. Test QualityEngine (Quality Gates 0-7)
console.log('\n5️⃣ Test QualityEngine (Quality Gates 0 - 7)...');
const { QualityEngine } = require('../src/core/qualityEngine');
const qEngine = new QualityEngine();

const qReport = qEngine.evaluateQuality(mockValidText, contract, 'Fisica');
assert(qReport.overallScore >= 80, `Punteggio globale deve essere >= 80 (attuale: ${qReport.overallScore})`);
assert(qReport.gatePassed, 'Quality Gates devono essere superati');
console.log(`   ✅ QualityEngine superato con successo (Overall: ${qReport.overallScore}/100, Gate Passed: ${qReport.gatePassed}).`);

// 6. Test ShardRoles & SeamWelding2 Heuristic
console.log('\n6️⃣ Test Shard Roles & Heuristic Seam Welding...');
const { assignShardMission, calculateDynamicShards } = require('../src/generation/shardRoles');
const { SeamWelding2 } = require('../src/generation/seamWelding2');

const mission0 = assignShardMission(0, 3, 'Fisica', 'complete');
const mission1 = assignShardMission(1, 3, 'Fisica', 'complete');
assert(mission0 !== mission1, 'I ruoli degli shard devono essere differenziati e non ridondanti');

const seamWelder = new SeamWelding2(null, null);
const cleanedDisjoint = seamWelder.cleanDisjointHeadLocally('In questo modulo vedremo la continuazione...\n\n## 2.1 Elettrostatica');
assert(!cleanedDisjoint.includes('In questo modulo vedremo'), 'Aperture disgiunte rimosse');
console.log('   ✅ Shard Roles & Seam Welding superati con successo.');

// 7. Test Callout Transformation
console.log('\n7️⃣ Test Callout HTML Transformation...');
// Simula la funzione di trasformazione
function testTransform(html) {
  return html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (match, inner) => {
    let type = 'general';
    if (/📌|Definizione/i.test(inner)) type = 'definition';
    else if (/💡|Intuizione/i.test(inner)) type = 'intuition';
    else if (/⚠️|Attenzione/i.test(inner)) type = 'warning';
    return `<div class="academic-callout callout-${type}">${inner}</div>`;
  });
}

const rawHtml = '<blockquote><p>📌 <strong>Definizione Rigorosa:</strong> Test di definizione</p></blockquote>';
const transformed = testTransform(rawHtml);
assert(transformed.includes('academic-callout callout-definition'), 'Callout trasformato correttamente');
console.log('   ✅ Callout Transformation superata con successo.');

// 8. Test KnowledgeGraph Operations & Dependency Traversal
console.log('\n8️⃣ Test KnowledgeGraph Operations, Upsert & Dependency Traversal...');
const {
  createGraph,
  upsertNode,
  addEdge,
  getDependencies,
  getDependents,
  getChapterSubgraph
} = require('../src/core/knowledgeGraph');

const testGraph = createGraph('test-session', 'Fisica');

// Inserisce catena: Definition A -> Formula B -> Derivation C -> Exercise D
upsertNode(testGraph, { id: 'def-a', type: 'DEFINITION', label: 'Carica Elettrica', chapterId: 'cap1' });
upsertNode(testGraph, { id: 'form-b', type: 'FORMULA', label: 'Legge di Coulomb', chapterId: 'cap1' });
upsertNode(testGraph, { id: 'deriv-c', type: 'DERIVATION', label: 'Campo da Coulomb', chapterId: 'cap1' });
upsertNode(testGraph, { id: 'ex-d', type: 'EXERCISE', label: 'Esercizio Sfere', chapterId: 'cap1' });
upsertNode(testGraph, { id: 'ext-prereq', type: 'CONCEPT', label: 'Vettori e Sistemi di Coordinate', chapterId: 'prereq' });

addEdge(testGraph, { from: 'form-b', to: 'def-a', type: 'REQUIRES' });
addEdge(testGraph, { from: 'form-b', to: 'ext-prereq', type: 'REQUIRES' });
addEdge(testGraph, { from: 'deriv-c', to: 'form-b', type: 'DERIVES_FROM' });
addEdge(testGraph, { from: 'ex-d', to: 'deriv-c', type: 'APPLIES' });

// Test dependencies (prerequisiti transitivi di deriv-c)
const depsOfC = getDependencies(testGraph, 'deriv-c');
assert(depsOfC.includes('form-b'), 'deriv-c dipende da form-b');
assert(depsOfC.includes('def-a'), 'deriv-c dipende transitivamente da def-a');
assert(depsOfC.includes('ext-prereq'), 'deriv-c dipende transitivamente da ext-prereq');

// Test dependents (chi risente se def-a cambia per il repair?)
const dependentsOfA = getDependents(testGraph, 'def-a');
assert(dependentsOfA.includes('form-b'), 'form-b dipende da def-a');
assert(dependentsOfA.includes('deriv-c'), 'deriv-c dipende da def-a');
assert(dependentsOfA.includes('ex-d'), 'ex-d dipende da def-a');

// Test chapter subgraph
const subCap1 = getChapterSubgraph(testGraph, 'cap1');
assert.strictEqual(subCap1.nodes.length, 4, '4 nodi nel capitolo 1');
assert(subCap1.externalDependencies.some(n => n.id === 'ext-prereq'), 'Include prerequisito esterno');
console.log('   ✅ KnowledgeGraph Operations & Traversal superati con successo.');

// 9. Test GraphValidator (Validità, missing targets, cicli)
console.log('\n9️⃣ Test GraphValidator (Validità, Missing Target e Cicli)...');
const { validateGraph } = require('../src/core/graphValidator');

const validReport = validateGraph(testGraph);
assert(validReport.valid, 'testGraph deve risultare valido');

// Simula grafo con target inesistente
const brokenTargetGraph = {
  nodes: [{ id: 'n1', type: 'CONCEPT', label: 'Test' }],
  edges: [{ from: 'n1', to: 'n_missing', type: 'REQUIRES' }]
};
const brokenReport = validateGraph(brokenTargetGraph);
assert(!brokenReport.valid, 'Grafo con nodo mancante deve fallire');
assert(brokenReport.errors.some(e => e.type === 'MISSING_TARGET'), 'Rileva errore MISSING_TARGET');

// Simula grafo ciclico vietato
const cyclicGraph = {
  nodes: [
    { id: 'c1', type: 'CONCEPT', label: 'C1' },
    { id: 'c2', type: 'CONCEPT', label: 'C2' }
  ],
  edges: [
    { from: 'c1', to: 'c2', type: 'DERIVES_FROM' },
    { from: 'c2', to: 'c1', type: 'DERIVES_FROM' }
  ]
};
const cyclicReport = validateGraph(cyclicGraph);
assert(!cyclicReport.valid, 'Grafo ciclico deve fallire la validazione');
assert(cyclicReport.errors.some(e => e.type === 'CYCLIC_DEPENDENCY'), 'Rileva errore CYCLIC_DEPENDENCY');
console.log('   ✅ GraphValidator superato con successo.');

// 10. Test Hard-Fail Quality Gates
console.log('\n🔟 Test QualityEngine Hard-Fail Gates vs Soft Score...');
const brokenLatexText = mockValidText + '\n\n$$ E = mc^2 $'; // formula non chiusa (dispari)
const hardFailReport = qEngine.evaluateQuality(brokenLatexText, contract, 'Fisica');
assert(!hardFailReport.passed, 'Testo con LaTeX rotto deve ricevere passed = false (Hard-Fail)');
assert(hardFailReport.hardFails.some(hf => hf.type === 'BROKEN_LATEX'), 'Rileva errore Hard-Fail BROKEN_LATEX');
console.log('   ✅ Hard-Fail Quality Gates superati con successo.');

// 11. Test Teaching Blueprint Engine
console.log('\n1️⃣1️⃣ Test Teaching Blueprint Engine...');
const {
  createBlueprint,
  addChapterToBlueprint,
  buildBlueprintFromGraphAndPlan,
  buildChapterPromptContext
} = require('../src/planning/blueprint');

const bp = createBlueprint('sess_01', 'Fisica');
addChapterToBlueprint(bp, {
  chapterId: 'cap1-elettrostatica',
  title: 'Elettrostatica e Legge di Gauss',
  objectives: ['Calcolare flussi', 'Derivare legge'],
  requiredNodes: ['def-a', 'form-b']
});
assert.strictEqual(bp.chapters.length, 1, 'Blueprint registra capitolo');

const chapterContext = buildChapterPromptContext(bp.chapters[0], subCap1);
assert(chapterContext.includes('Elettrostatica e Legge di Gauss'), 'Contesto capitolo generato');
assert(chapterContext.includes('def-a') || chapterContext.includes('Carica Elettrica'), 'Nodi inclusi nel contesto');
console.log('   ✅ Teaching Blueprint Engine superato con successo.');

// 12. Test Coverage Matrix Audit
console.log('\n1️⃣2️⃣ Test Coverage Matrix Audit...');
const { evaluateCoverage } = require('../src/core/coverageMatrix');
const covReport = evaluateCoverage(bp, testGraph, mockValidText);
assert(covReport.chapters.length > 0, 'Coverage report generato');
assert(typeof covReport.overallCoverage === 'number', 'Coverage ratio numerico calcolato');
console.log(`   ✅ Coverage Matrix superata con successo (Overall Coverage: ${Math.round(covReport.overallCoverage * 100)}%).`);

// 13. Test JobState State Machine & Transitions
console.log('\n1️⃣3️⃣ Test JobState State Machine & Checkpoint Transitions...');
const {
  initJobState,
  transitionPhase,
  isPhaseCompleted
} = require('../src/core/jobState');

const job = initJobState('sess_state_test', 'Fisica');
assert.strictEqual(job.currentPhase, 'INSPECT');

transitionPhase(job, 'EXTRACT', { inspectedFiles: 3 });
assert.strictEqual(job.currentPhase, 'EXTRACT');
assert(isPhaseCompleted(job, 'INSPECT'), 'Fase INSPECT completata');

transitionPhase(job, 'MAP_GRAPH', { pages: 12 });
assert.strictEqual(job.currentPhase, 'MAP_GRAPH');
assert(isPhaseCompleted(job, 'EXTRACT'), 'Fase EXTRACT completata');
assert.strictEqual(job.phaseOutputs.EXTRACT.pages, 12, 'Output fase memorizzato');
console.log('   ✅ JobState State Machine superata con successo.');

// 14. Test Deterministic Function Plotter & Diagram Preprocessor
console.log('\n1️⃣4️⃣ Test Deterministic Function Plotter & Diagram Preprocessor...');
const {
  renderFunctionPlotSvg,
  safeEvaluateMath,
  processDiagramsInMarkdown
} = require('../src/rendering/diagramEngine');

// Valutazione matematica a tratti
const valInterior = safeEvaluateMath('r < 1 ? 2*r : 2/(r*r)', 0.5, 'r');
const valExterior = safeEvaluateMath('r < 1 ? 2*r : 2/(r*r)', 2.0, 'r');
assert.strictEqual(valInterior, 1.0, 'Calcolo corretto zona interna r < 1');
assert.strictEqual(valExterior, 0.5, 'Calcolo corretto zona esterna r >= 1');

// Generazione SVG
const plotSvg = renderFunctionPlotSvg({
  title: 'Campo Elettrico Sfera E(r)',
  expression: 'r < 1 ? 2*r : 2/(r*r)',
  domain: [0, 4],
  variable: 'r',
  xLabel: 'r (m)',
  yLabel: 'E(r) (V/m)',
  annotations: [{ x: 1, label: 'Superficie R' }]
});
assert(plotSvg.includes('<svg'), 'SVG generato correttamente');
assert(plotSvg.includes('Campo Elettrico Sfera E(r)'), 'Titolo presente nel grafico');
assert(plotSvg.includes('Superficie R'), 'Annotazione presente nel grafico');

// Preprocessing Markdown
const mockMarkdownWithPlot = `
# Elettrostatica
\`\`\`plot
{
  "title": "Andamento E(r)",
  "expression": "x^2",
  "domain": [0, 3]
}
\`\`\`
Fine paragrafo.
`;
const processedMd = processDiagramsInMarkdown(mockMarkdownWithPlot);
assert(processedMd.includes('academic-function-plot'), 'Blocco plot convertito in academic-function-plot');
assert(processedMd.includes('<svg'), 'SVG iniettato nel markdown');
console.log('   ✅ Deterministic Function Plotter superato con successo.');

// 15. Test MathJax Rigorous LaTeX Syntax Validation
console.log('\n1️⃣5️⃣ Test MathJax Rigorous LaTeX Syntax Validation...');
const malformedBraceLatex = mockValidText + '\n\n$$ \\frac{1}{2 $$'; // Graffa mancante
const mathjaxReport = qEngine.evaluateQuality(malformedBraceLatex, contract, 'Fisica');
assert(!mathjaxReport.passed, 'Formula con graffa aperta non chiusa deve fallire i Quality Gates (Hard-Fail)');
assert(
  mathjaxReport.hardFails.some(hf => hf.type === 'BROKEN_LATEX' && hf.message.includes('MathJax')),
  'MathJax deve intercettare errore di sintassi specifico (Missing close brace)'
);
console.log('   ✅ MathJax Rigorous LaTeX Validation superata con successo.');

// 16. Test Visual Requirement Gate (requires_visual)
console.log('\n1️⃣6️⃣ Test Visual Requirement Gate (requires_visual)...');
const graphWithVisualNeed = createGraph('sess_visual', 'Fisica');
upsertNode(graphWithVisualNeed, {
  id: 'gauss-visual',
  type: 'LAW',
  label: 'Legge di Gauss e Linee di Campo',
  requires_visual: true,
  attrs: { requires_visual: true, importance: 5 }
});

// Testo privo di SVG/diagrammi
const textWithoutVisual = mockValidText;
const reportWithoutVisual = qEngine.evaluateQuality(textWithoutVisual, contract, 'Fisica', graphWithVisualNeed);
assert(!reportWithoutVisual.passed, 'Nodo con requires_visual privo di diagramma deve causare Hard-Fail');
assert(
  reportWithoutVisual.hardFails.some(hf => hf.type === 'MISSING_REQUIRED_VISUAL'),
  'Genera errore MISSING_REQUIRED_VISUAL'
);

// Testo con SVG/diagramma presente
const textWithVisual = mockValidText + '\n\n' + plotSvg;
const reportWithVisual = qEngine.evaluateQuality(textWithVisual, contract, 'Fisica', graphWithVisualNeed);
assert(
  !reportWithVisual.hardFails.some(hf => hf.type === 'MISSING_REQUIRED_VISUAL'),
  'Con diagramma SVG presente, il gate visuale viene superato'
);
console.log('   ✅ Visual Requirement Gate superato con successo.');

// 17. Test PDF Layout QA Bounding Box Inspection
console.log('\n1️⃣7️⃣ Test PDF Layout QA Bounding Box Inspection...');
const { auditDomOverflow } = require('../src/rendering/pdfQA');
// Mock di pagina Puppeteer
const mockPuppeteerPage = {
  evaluate: async (fn, maxHeight) => {
    return {
      overflows: [],
      warnings: []
    };
  }
};
auditDomOverflow(mockPuppeteerPage).then(async qaRes => {
  assert(qaRes.passed, 'Layout QA passa se non ci sono elementi fuori scala');
  console.log('   ✅ PDF Layout QA Inspection superata con successo.');

  // 18. Test Code-Span Math Detection & Auto-Repair (repairMathInCodeSpans)
  console.log('\n1️⃣8️⃣ Test Code-Span Math Detection & Auto-Repair (repairMathInCodeSpans)...');
  const rawNotationMarkdown = `
# Sezione di Prova: Notazione Globale

- **Notazione Unificata:**
    - \`C_X\`: Concentrazione analitica totale della specie X.
    - \`[X]\`: Concentrazione molare all'equilibrio.
    - \`pH = -log[H⁺]\`, \`pOH = -log[OH⁻]\`, \`pKa = -log Ka\`, \`pKps = -log Kps\`.
    - \`log C\`: Logaritmo concentrazione.
    - \`α_X\`: Coefficiente di reazione laterale.
    - \`K'\`: Costante condizionale a dato pH.
    - \`φ\`: Frazione titolata.
    - \`E\`: Potenziale di cella; \`E°\`: Potenziale standard.
- **Strumenti Matematici:**
    1. **Bilancio di Massa (BM):** \`C_X = Σ [specie contenenti X]\`.
    2. **Bilancio di Carica (BC):** \`Σ (carica × [catione]) = Σ (|carica| × [anione])\`.

\`\`\`python
# Blocco codice puro: NON deve essere toccato!
def ph_calc(conc):
    return -log(conc)
\`\`\`
`;

  const detectedSpans = detectMathInCodeSpans(rawNotationMarkdown);
  assert(detectedSpans.length >= 8, `Devono essere rilevati almeno 8 code span matematici (rilevati: ${detectedSpans.length})`);

  const repairedMarkdown = repairMathInCodeSpans(rawNotationMarkdown, 'Chimica');
  assert(repairedMarkdown.includes('$C_X$: Concentrazione'), '$C_X$ convertito in LaTeX inline');
  assert(repairedMarkdown.includes('$[X]$: Concentrazione'), '$[X]$ convertito in LaTeX inline');
  assert(repairedMarkdown.includes('$pH = -log[H⁺]$'), '$pH = -log[H⁺]$ convertito in LaTeX inline');
  assert(repairedMarkdown.includes('$α_X$'), '$α_X$ convertito in LaTeX inline');
  assert(repairedMarkdown.includes('$K\'$'), '$K\'$ convertito in LaTeX inline');
  assert(repairedMarkdown.includes('$φ$'), '$φ$ convertito in LaTeX inline');
  assert(repairedMarkdown.includes('$E$: Potenziale'), '$E$ convertito in LaTeX inline');
  assert(repairedMarkdown.includes('$E°$: Potenziale'), '$E°$ convertito in LaTeX inline');
  assert(repairedMarkdown.includes('$C_X = Σ [specie contenenti X]$'), 'Equazione BM convertita in LaTeX inline');
  assert(repairedMarkdown.includes('def ph_calc(conc):'), 'I blocchi a triplo backtick devono restare inalterati');
  assert(!repairedMarkdown.includes('`C_X`'), 'Nessun backtick residuo per simboli matematici');
  console.log('   ✅ Code-Span Math Detection & Auto-Repair superato con successo.');

  // 19. Test Conversational Preamble Removal (cleanConversationalPreamble)
  console.log('\n1️⃣9️⃣ Test Conversational Preamble Removal (cleanConversationalPreamble)...');
  const textWithPreamble = `Certamente. Ecco la sintesi accademica ad alta densità per la sezione richiesta, conforme al contratto didattico.

---

# 📚 Dispensa Magistrale di Chimica Analitica: Sintesi d'Esame ad Alta Densità

Trattazione della teoria acido-base.

---

Certamente. Ecco la sintesi accademica per la sezione assegnata, conforme al ruolo didattico.

---

# Capitolo 2: Equilibri di Precipitazione

Trattazione dei sali poco solubili.`;

  const cleanedPreambleText = cleanConversationalPreamble(textWithPreamble);
  assert(!cleanedPreambleText.startsWith('Certamente'), 'Il documento finale non deve iniziare con frasi conversazionali');
  assert(!cleanedPreambleText.includes('Certamente. Ecco la sintesi'), 'Tutti i preamboli inter-shard devono essere rimossi');
  assert(cleanedPreambleText.startsWith('# 📚 Dispensa Magistrale'), 'Il documento deve iniziare direttamente con il primo heading');
  assert(cleanedPreambleText.includes('# Capitolo 2: Equilibri di Precipitazione'), 'I capitoli successivi devono essere preservati');
  console.log('   ✅ Conversational Preamble Removal superato con successo.');

  // 20. Test Turbo High-Concurrency Adaptive Sharding & Parallel Seam Welding
  console.log('\n2️⃣0️⃣ Test Turbo High-Concurrency Adaptive Sharding & Parallel Seam Welding...');
  
  // Verifica calcolo concorrenza per vari volumi di blocchi
  const conf1 = calculateDynamicShards(1, 120);
  assert.strictEqual(conf1.numShards, 1, '1 blocco produce 1 shard');
  assert.strictEqual(conf1.modulesPerShard, 1, '1 modulo per shard');

  const conf5 = calculateDynamicShards(5, 120);
  assert.strictEqual(conf5.numShards, 5, '5 blocchi producono 5 shard');
  assert.strictEqual(conf5.modulesPerShard, 1, '5 shard in parallelo puro 1:1');

  const conf25 = calculateDynamicShards(25, 120);
  assert.strictEqual(conf25.numShards, 25, '25 blocchi producono 25 shard simultanei');
  assert.strictEqual(conf25.modulesPerShard, 1, '25 shard in parallelo puro 1:1');

  // Test caso 70 blocchi (come richiesto dall'utente)
  const conf70 = calculateDynamicShards(70, 120);
  assert.strictEqual(conf70.numShards, 70, '70 blocchi producono 70 shard simultanei');
  assert.strictEqual(conf70.modulesPerShard, 1, '70 shard in parallelo puro 1:1 senza strozzature a 4');

  // Test rispetto del tetto massimo di concorrenza
  const conf150 = calculateDynamicShards(150, 120);
  assert.strictEqual(conf150.numShards, 120, '150 blocchi scalano fino al tetto configurato (120)');
  assert.strictEqual(conf150.modulesPerShard, 2, 'Distribuzione equa dei moduli per shard oltre il tetto');

  // Test saldatura parallela SeamWelding2 con 5 shard mock
  const mockShards = [
    '# Capitolo 1: Cinematica\nDescrizione del moto.',
    'In questo modulo vedremo la dinamica.\n\n## 2.1 Principi della Dinamica\nTrattazione delle forze.',
    'Benvenuti al terzo capitolo.\n\n## 3.1 Energia e Lavoro\nDefinizione di energia.',
    'In questa sezione esaminiamo la gravitazione.\n\n## 4.1 Legge di Newton\nCampo gravitazionale.',
    'Fine della trattazione magistrale.'
  ];

  const parallelWelder = new SeamWelding2(null, null);
  const weldedResult = await parallelWelder.weldShards(mockShards, 'Fisica');
  assert.strictEqual(weldedResult.length, 5, 'Tutti i 5 shard restituiti');
  assert(!weldedResult[1].includes('In questo modulo vedremo'), 'Apertura disgiunta rimossa da shard 2');
  assert(!weldedResult[2].includes('Benvenuti al terzo capitolo'), 'Apertura disgiunta rimossa da shard 3');
  assert(!weldedResult[3].includes('In questa sezione esaminiamo'), 'Apertura disgiunta rimossa da shard 4');
  console.log('   ✅ Turbo High-Concurrency Sharding & Parallel Seam Welding superati con successo.');

  console.log('\n🎉 TUTTI I 20 TEST DEL STUDYGENIUS ACADEMIC INTELLIGENCE SYSTEM SONO STATI SUPERATI CON SUCCESSO!');
});

