/**
 * Test unitario per Step 0: Schemi e Contratti Dati (src/core/schemas.js)
 */

const assert = require('assert');
const schemas = require('../src/core/schemas');

console.log('🧪 [Test Schemas]: Avvio test di validazione dei 10 contratti dati Oltre 1000...');

// 1. Test KnowledgeGraph v2.0.0
const validGraph = {
  schemaVersion: '2.0.0',
  sessionId: 'session-chem-01',
  subject: 'Chimica Analitica',
  nodes: [
    {
      id: 'concept-alpha-m',
      label: 'Coefficiente di Reazione Secondaria alpha_M',
      type: 'CONCEPT',
      chapterId: 'cap07-complexation',
      firstUse: {
        conceptId: 'concept-alpha-m',
        firstUseChapter: 'cap07-complexation',
        symbol: 'alpha_M',
        meaning: 'Rapporto tra concentrazione analitica totale e libera',
        pedagogicalPattern: 'PROBLEM_FIRST'
      }
    }
  ],
  edges: [
    { from: 'concept-alpha-m', to: 'concept-conditional-const', type: 'REQUIRES' }
  ]
};
const graphRes = schemas.validateKnowledgeGraph(validGraph);
assert.strictEqual(graphRes.valid, true, `KnowledgeGraph validation failed: ${graphRes.errors?.join('; ')}`);
console.log('  ✅ 1. KnowledgeGraph validato con successo');

// 2. Test FirstUseContract
const validContract = {
  conceptId: 'concept-alpha-m',
  firstUseChapter: 'cap07',
  symbol: 'alpha_M',
  meaning: 'Frazione del metallo presente nella forma libera',
  pedagogicalPattern: 'PROBLEM_FIRST'
};
const contractRes = schemas.validateFirstUseContract(validContract);
assert.strictEqual(contractRes.valid, true);
console.log('  ✅ 2. FirstUseContract validato con successo');

// 3. Test TeachingBlueprint v2.0.0
const validBlueprint = {
  blueprintVersion: '2.0.0',
  chapterId: 'cap07',
  conceptOrder: ['free-metal', 'mass-balance', 'alpha-metal', 'conditional-const'],
  conceptBlocks: [],
  firstUseContracts: [validContract]
};
const blueprintRes = schemas.validateTeachingBlueprint(validBlueprint);
assert.strictEqual(blueprintRes.valid, true);
console.log('  ✅ 3. TeachingBlueprint validato con successo');

// 4. Test ConceptBlock
const validBlock = {
  blockId: 'block-alpha-def-01',
  conceptId: 'concept-alpha-m',
  blockType: 'FORMAL_DEPENDENCY_UNIT',
  content: 'Definizione di alpha...',
  stepSignificance: 'MEDIUM'
};
const blockRes = schemas.validateConceptBlock(validBlock);
assert.strictEqual(blockRes.valid, true);
console.log('  ✅ 4. ConceptBlock validato con successo');

// 5. Test Violation
const validViolation = {
  type: 'PREREQUISITE_VIOLATION',
  severity: 'HARD_FAIL',
  scope: 'SECTION',
  message: 'Costante condizionale introdotta prima di alpha_M'
};
const violationRes = schemas.validateViolation(validViolation);
assert.strictEqual(violationRes.valid, true);
console.log('  ✅ 5. Violation validato con successo');

// 6. Test RepairRequest
const validRepair = {
  repairId: 'rep-01',
  scope: 'BLOCK',
  violationType: 'UNRESOLVED_FIRST_USE',
  targetBlockId: 'block-alpha-def-01',
  allowedEdits: ['ADD_MOTIVATION'],
  forbiddenEdits: ['CHANGE_FORMULA']
};
const repairRes = schemas.validateRepairRequest(validRepair);
assert.strictEqual(repairRes.valid, true);
console.log('  ✅ 6. RepairRequest validato con successo');

// 7. Test ChapterArtifact
const validArtifact = {
  chapterId: 'cap07',
  contentHash: 'hash-abc-123',
  status: 'verified',
  blocks: [validBlock]
};
const artifactRes = schemas.validateChapterArtifact(validArtifact);
assert.strictEqual(artifactRes.valid, true);
console.log('  ✅ 7. ChapterArtifact validato con successo');

// 8. Test SemanticReference
const validRef = {
  refKey: 'REF:concept.alpha-coefficient',
  targetType: 'CONCEPT',
  targetId: 'concept-alpha-m'
};
const refRes = schemas.validateSemanticReference(validRef);
assert.strictEqual(refRes.valid, true);
console.log('  ✅ 8. SemanticReference validato con successo');

// 9. Test GraphSpec
const validGraphSpec = {
  id: 'graph-titration-curve',
  provenance: 'FORMULA-derived',
  chartType: 'line',
  domain: { min: 0, max: 50, points: 100 },
  series: [{ name: 'pH', expression: '14 - log10(x)' }]
};
const graphSpecRes = schemas.validateGraphSpec(validGraphSpec);
assert.strictEqual(graphSpecRes.valid, true);
console.log('  ✅ 9. GraphSpec validato con successo');

// 10. Test JobState v3.0.0
const validJobState = {
  pipelineVersion: '3.0.0',
  sessionId: 'session-chem-01',
  currentPhase: 'VERIFY_DIDACTICS',
  completedPhases: ['INSPECT', 'EXTRACT', 'MAP_GRAPH', 'BUILD_TEACHING_BLUEPRINT'],
  chapters: {
    cap07: { status: 'verifying' }
  }
};
const jobStateRes = schemas.validateJobState(validJobState);
assert.strictEqual(jobStateRes.valid, true);
console.log('  ✅ 10. JobState validato con successo');

console.log('\n🎉 TUTTI I 10 SCHEMI DEI DATI RISPETTANO INTEGRALMENTE I CONTRATTI DI STEP 0!');
