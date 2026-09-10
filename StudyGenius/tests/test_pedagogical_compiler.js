/**
 * Test unitario per Fase 1: Pedagogical Compiler (src/planning/pedagogicalCompiler.js)
 */

const assert = require('assert');
const { createGraph, addNode, addEdge } = require('../src/core/knowledgeGraph');
const { compileChapterBlueprint, buildTeachingPromptDirective } = require('../src/planning/pedagogicalCompiler');

console.log('🧪 [Test Pedagogical Compiler]: Avvio test di compilazione pedagogica...');

// Costruiamo il caso reale di Chimica Analitica citato dall'utente
const graph = createGraph('session-complexation', 'Chimica Analitica');

// Nodi
addNode(graph, {
  id: 'concept-free-ligand',
  label: 'Legante Libero [L]',
  type: 'CONCEPT',
  chapterId: 'cap07'
});

addNode(graph, {
  id: 'concept-complex-formation',
  label: 'Formazione dei Complessi ML_n',
  type: 'CONCEPT',
  chapterId: 'cap07'
});

addNode(graph, {
  id: 'concept-mass-balance',
  label: 'Bilanci di Massa per Metallo e Legante',
  type: 'LAW',
  chapterId: 'cap07'
});

addNode(graph, {
  id: 'concept-side-reactions',
  label: 'Reazioni Parassite e di Protonazione',
  type: 'CONCEPT',
  chapterId: 'cap07'
});

addNode(graph, {
  id: 'concept-alpha-coefficient',
  label: 'Coefficiente di Reazione Secondaria alpha',
  type: 'CONCEPT',
  chapterId: 'cap07',
  attrs: {
    symbol: 'alpha',
    meaning: 'Misura dell\'estensione delle reazioni secondarie sul metallo o legante',
    mustMotivate: true
  }
});

addNode(graph, {
  id: 'concept-conditional-constant',
  label: 'Costante di Formazione Condizionale K_eff',
  type: 'LAW',
  chapterId: 'cap07',
  attrs: {
    symbol: 'K_eff',
    meaning: 'Costante termodinamica corretta per i coefficienti alpha'
  }
});

// Relazioni di dipendenza causale/pedagogica:
// - complex-formation richiede free-ligand
addEdge(graph, { from: 'concept-complex-formation', to: 'concept-free-ligand', type: 'REQUIRES' });
// - mass-balance richiede complex-formation
addEdge(graph, { from: 'concept-mass-balance', to: 'concept-complex-formation', type: 'REQUIRES' });
// - side-reactions richiede mass-balance
addEdge(graph, { from: 'concept-side-reactions', to: 'concept-mass-balance', type: 'REQUIRES' });
// - alpha richiede side-reactions (è motivato dal fatto che il legante libero differisce da quello totale)
addEdge(graph, { from: 'concept-alpha-coefficient', to: 'concept-side-reactions', type: 'REQUIRES' });
// - conditional-constant richiede alpha
addEdge(graph, { from: 'concept-conditional-constant', to: 'concept-alpha-coefficient', type: 'REQUIRES' });

// Compilazione del Blueprint
const blueprint = compileChapterBlueprint({
  sessionId: 'session-complexation',
  subject: 'Chimica Analitica',
  chapterId: 'cap07',
  title: 'Complessi con Leganti Ausiliari e Costanti Condizionali',
  knowledgeGraph: graph
});

// 1. Verifica Learning Order topologico
console.log('  Topological Concept Order calcolato:', blueprint.conceptOrder);
const alphaIdx = blueprint.conceptOrder.indexOf('concept-alpha-coefficient');
const sideReactIdx = blueprint.conceptOrder.indexOf('concept-side-reactions');
const condConstIdx = blueprint.conceptOrder.indexOf('concept-conditional-constant');

assert(sideReactIdx < alphaIdx, 'side-reactions deve precedere alpha-coefficient!');
assert(alphaIdx < condConstIdx, 'alpha-coefficient deve precedere conditional-constant!');
console.log('  ✅ 1. Learning Order topologico rispetta rigorosamente i prerequisiti didattici');

// 2. Verifica FirstUseContract
const alphaContract = blueprint.firstUseContracts.find(c => c.conceptId === 'concept-alpha-coefficient');
assert(alphaContract, 'FirstUseContract per alpha deve essere presente');
assert.strictEqual(alphaContract.requirements.mustMotivate, true);
assert.strictEqual(alphaContract.pedagogicalPattern, 'PROBLEM_FIRST');
console.log('  ✅ 2. FirstUseContract per alpha formalizzato con pattern PROBLEM_FIRST');

// 3. Verifica ConceptBlocks
const bridgeBlock = blueprint.conceptBlocks.find(b => b.blockType === 'MOTIVATION_BRIDGE' && b.conceptId === 'concept-alpha-coefficient');
assert(bridgeBlock, 'Deve essere programmato un MOTIVATION_BRIDGE prima di definire alpha');
const fduBlock = blueprint.conceptBlocks.find(b => b.blockType === 'FORMAL_DEPENDENCY_UNIT' && b.conceptId === 'concept-alpha-coefficient');
assert(fduBlock, 'Deve essere programmata una Formal Dependency Unit per alpha');
console.log('  ✅ 3. ConceptBlocks: programmato MOTIVATION_BRIDGE + Formal Dependency Unit');

// 4. Verifica Direttive Prompt
const directiveText = buildTeachingPromptDirective(blueprint);
assert(directiveText.includes('LEARNING ORDER TOPOLOGICO'));
assert(directiveText.includes('BLOCK IDs'));
assert(directiveText.includes('stepSignificance'));
console.log('  ✅ 4. Direttiva di prompt per LLM generata con successo');

console.log('\n🎉 TEST FASE 1 (PEDAGOGICAL COMPILER) SUPERATO CON SUCCESSO!');
