/**
 * Test unitario per Fase 4: Render Cache Incrementale, Reference Resolver & Global Assembler
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const {
  createChapterArtifact,
  isRenderCacheValid,
  computeContentHash
} = require('../src/rendering/chapterArtifactManager');
const {
  buildReferenceCatalog,
  resolveSemanticReferences
} = require('../src/rendering/semanticReferenceResolver');
const {
  calculateGlobalOffsets,
  generateStructuredTOC,
  assembleMasterPdf
} = require('../src/rendering/globalAssembler');
const {
  initJobState,
  transitionPhase,
  setChapterStatus,
  invalidateChapters
} = require('../src/core/jobState');

console.log('🧪 [Test Incremental Render & Assembly]: Avvio test di compilazione globale...');

// 1. Test ChapterArtifact e Content Hash
const chap1 = createChapterArtifact({
  chapterId: 'cap01',
  title: 'Equilibri in Soluzione Acquosa',
  rawMarkdown: '# Equilibri\nTrattazione approfondita degli equilibri acido-base e pH.',
  pageCount: 10
});

const chap2 = createChapterArtifact({
  chapterId: 'cap02',
  title: 'Complessazione con Leganti Ausiliari',
  rawMarkdown: '# Complessazione\nCome abbiamo visto in [REF:chapter.cap01], la speziazione dipende dal pH.\nDefiniamo il coefficiente [REF:concept.alpha].',
  pageCount: 15
});

assert(chap1.contentHash, 'contentHash deve essere generato');
assert.strictEqual(chap1.status, 'generated');
console.log('  ✅ 1. ChapterArtifacts creati con contentHash crittografici indipendenti');

// 2. Test Render Cache Check
const dummyPdfPath = path.join(__dirname, 'test_scratch_dummy.pdf');
fs.writeFileSync(dummyPdfPath, '%PDF-1.4 dummy content');

const cachedChap = {
  ...chap1,
  pdfPath: dummyPdfPath,
  renderHash: chap1.contentHash
};

assert.strictEqual(isRenderCacheValid(cachedChap), true, 'La cache deve risultare valida se PDF esiste e hash coincide');

const modifiedChap = {
  ...cachedChap,
  rawMarkdown: '# Equilibri Modificati\nNuovo contenuto che altera il testo.'
};
assert.strictEqual(isRenderCacheValid(modifiedChap), false, 'La cache deve risultare INVALIDA se il markdown cambia');
fs.removeSync(dummyPdfPath);
console.log('  ✅ 2. Render Cache: riuso istantaneo se inalterato, invalidazione corretta se modificato');

// 3. Test Calculate Global Offsets
const chaptersWithOffsets = calculateGlobalOffsets([chap1, chap2], 1);
assert.strictEqual(chaptersWithOffsets[0].pageOffset, 1);
assert.strictEqual(chaptersWithOffsets[1].pageOffset, 11); // 1 + 10 pagine di cap1
console.log('  ✅ 3. Calcolo globale degli offset di pagina eseguito con successo (Cap1: 1, Cap2: 11)');

// 4. Test Semantic Reference Resolver
const catalog = buildReferenceCatalog(chaptersWithOffsets);
assert(catalog.has('chapter.cap01'));

const { resolvedText, unresolvedRefs } = resolveSemanticReferences(chap2.rawMarkdown, catalog, { chapterId: 'cap02', chapterNumber: 2 });
assert(resolvedText.includes('Capitolo 1 (pag. 1)'), `Riferimento non risolto: ${resolvedText}`);
console.log('  ✅ 4. Risoluzione semantica di [REF:chapter.cap01] in "Capitolo 1 (pag. 1)"');

// 5. Test Structured TOC Generator
const { tocMarkdown, tocEntries } = generateStructuredTOC(chaptersWithOffsets, 'Chimica Analitica');
assert(tocMarkdown.includes('Capitolo 1: Equilibri in Soluzione Acquosa ......................... pag. 1'));
assert(tocMarkdown.includes('Capitolo 2: Complessazione con Leganti Ausiliari ......................... pag. 11'));
assert.strictEqual(tocEntries.length, 2);
console.log('  ✅ 5. Table of Contents (TOC) derivato generato con impaginazione reale');

// 6. Test JobState v3.0.0 a 17 fasi e Invalidation
const job = initJobState('session-test-01', 'Chimica Analitica');
assert.strictEqual(job.pipelineVersion, '3.0.0');
assert.strictEqual(job.currentPhase, 'INSPECT');

transitionPhase(job, 'BUILD_LEARNING_ORDER');
assert.strictEqual(job.currentPhase, 'BUILD_LEARNING_ORDER');
assert(job.completedPhases.includes('INSPECT'));

setChapterStatus(job, 'cap01', 'completed', { renderHash: 'hash1' });
setChapterStatus(job, 'cap02', 'rendered', { renderHash: 'hash2' });

invalidateChapters(job, ['cap02']);
assert.strictEqual(job.chapters['cap02'].status, 'pending');
assert(job.invalidatedChapters.includes('cap02'));
console.log('  ✅ 6. JobState v3.0.0: transizioni di fase e invalidazione selettiva validate');

// 7. Test Assemble Master PDF con pdf-lib
(async () => {
  const masterPdfPath = path.join(__dirname, 'test_assembled_master.pdf');
  const assembled = await assembleMasterPdf(chaptersWithOffsets, masterPdfPath, {
    title: 'Chimica Analitica — Trattazione Magistrale',
    subject: 'Chimica Analitica'
  });
  assert(fs.existsSync(assembled));
  const stats = fs.statSync(assembled);
  assert(stats.size > 500, 'Il PDF master assemblato deve essere valido e non vuoto');
  fs.removeSync(masterPdfPath);
  console.log('  ✅ 7. assembleMasterPdf: generato PDF master valido con metadati e impaginazione');

  console.log('\n🎉 TEST FASE 4 (RENDER CACHE & GLOBAL ASSEMBLY) SUPERATO CON SUCCESSO!');
})();
