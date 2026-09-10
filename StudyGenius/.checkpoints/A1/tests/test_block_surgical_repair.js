/**
 * Test unitario per Fase 3: Block Manager & Surgical Repair (src/generation/blockManager.js)
 */

const assert = require('assert');
const {
  parseBlocks,
  serializeBlocks,
  replaceBlock,
  insertBlock,
  moveBlock
} = require('../src/generation/blockManager');
const { RepairLoop } = require('../src/generation/repairLoop');

console.log('🧪 [Test Block Surgical Repair]: Avvio test dei blocchi strutturali...');

const sampleDoc = `# Capitolo 7 — Complessazione

Testo introduttivo al capitolo.

<!-- BLOCK:fdu:concept-mass-balance -->
## 1. Bilancio di Massa
$$ C_M = [M] + [ML] $$
dove $C_M$ è la concentrazione analitica totale.
<!-- /BLOCK:fdu:concept-mass-balance -->

<!-- BLOCK:fdu:concept-alpha -->
## 2. Coefficiente alpha
$$ \alpha = 1 + \beta [L] $$
<!-- /BLOCK:fdu:concept-alpha -->

<!-- BLOCK:fdu:concept-cond-const -->
## 3. Costante Condizionale
$$ K' = K / \alpha $$
<!-- /BLOCK:fdu:concept-cond-const -->

Conclusione del capitolo.`;

// 1. Test parseBlocks
const blocks = parseBlocks(sampleDoc);
assert.strictEqual(blocks.length, 5, `Attesi 5 blocchi (2 prose + 3 explicit), trovati ${blocks.length}`);
assert.strictEqual(blocks[1].blockId, 'concept-mass-balance');
assert.strictEqual(blocks[2].blockId, 'concept-alpha');
assert.strictEqual(blocks[3].blockId, 'concept-cond-const');
console.log('  ✅ 1. parseBlocks ha indicizzato correttamente 3 blocchi espliciti e 2 blocchi di prosa');

// 2. Test replaceBlock per ID
const updatedContent = '\n## 2. Coefficiente alpha (Aggiornato)\n$$ \\alpha = 1 + \\sum \\beta_i [L]^i $$\ndove $\\alpha$ quantifica le reazioni secondarie.\n';
const docAfterReplace = replaceBlock(sampleDoc, 'concept-alpha', updatedContent);

assert(docAfterReplace.includes('Coefficiente alpha (Aggiornato)'));
assert(docAfterReplace.includes('Bilancio di Massa'));
assert(docAfterReplace.includes('Costante Condizionale'));
console.log('  ✅ 2. replaceBlock ha sostituito chirurgicamente il blocco target preservando il resto');

// 3. Test insertBlock (Inserimento blocco ponte prima di alpha)
const bridgeBlock = {
  blockId: 'bridge-alpha-motivation',
  blockType: 'MOTIVATION_BRIDGE',
  content: '\n> 💡 **Motivazione di alpha**: Poiché il legante libero compete con altre specie, serve un coefficiente correttivo.\n'
};
const docAfterInsert = insertBlock(sampleDoc, 'concept-alpha', bridgeBlock, 'before');
assert(docAfterInsert.includes('BLOCK:MOTIVATION_BRIDGE:bridge-alpha-motivation'));
assert(docAfterInsert.indexOf('bridge-alpha-motivation') < docAfterInsert.indexOf('concept-alpha'));
console.log('  ✅ 3. insertBlock ha inserito il blocco MOTIVATION_BRIDGE esattamente prima del target');

// 4. Test moveBlock (Inversione di blocchi)
const docAfterMove = moveBlock(sampleDoc, 'concept-alpha', 'concept-mass-balance', 'before');
assert(docAfterMove.indexOf('concept-alpha') < docAfterMove.indexOf('concept-mass-balance'));
console.log('  ✅ 4. moveBlock ha riposizionato il blocco per correggere l\'ordine didattico');

// 5. Test attemptScopeRepair con RepairLoop per PREREQUISITE_VIOLATION
const repairLoop = new RepairLoop(null, null);
const violation = {
  type: 'PREREQUISITE_VIOLATION',
  scope: 'SECTION',
  targetId: 'concept-cond-const',
  details: {
    dependentConcept: 'Costante Condizionale',
    prerequisiteConcept: 'Coefficiente alpha'
  }
};

(async () => {
  const repairedDoc = await repairLoop.attemptScopeRepair(sampleDoc, violation, 'Chimica Analitica');
  assert(repairedDoc.includes('MOTIVATION_BRIDGE'));
  assert(repairedDoc.includes('Prima di formalizzare "Costante Condizionale"'));
  console.log('  ✅ 5. attemptScopeRepair ha inserito autonomamente il blocco ponte didattico');

  console.log('\n🎉 TEST FASE 3 (BLOCK SURGICAL REPAIR) SUPERATO CON SUCCESSO!');
})();
