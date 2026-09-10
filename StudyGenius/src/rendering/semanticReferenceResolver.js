/**
 * StudyGenius Academic Intelligence System
 * src/rendering/semanticReferenceResolver.js
 * 
 * Risolutore semantico dei riferimenti incrociati ([REF:target]).
 * Separa completamente la conoscenza logica dall'impaginazione fisica:
 * 1. Mappa i segnaposti logici [REF:concept.id] o [REF:chapter.id].
 * 2. Risolve la rappresentazione in base ai metadati di impaginazione globale (Capitolo X, pag. Y).
 * 3. Segnala in modo deterministico eventuali INVALID_REFERENCE.
 */

const REF_REGEX = /\[REF:([a-zA-Z0-9_\-\.]+)\]/g;

/**
 * Costruisce il catalogo globale dei riferimenti noti
 * @param {Array<Object>} chapterArtifacts 
 * @param {Object} [knowledgeGraph] 
 * @returns {Map<string, { targetType: string, targetId: string, title: string, chapterNumber: number, startPage: number }>}
 */
function buildReferenceCatalog(chapterArtifacts = [], knowledgeGraph = null) {
  const catalog = new Map();

  chapterArtifacts.forEach((chap, idx) => {
    const chapterNum = idx + 1;
    const startPage = chap.pageOffset || 1;

    // Registra capitolo per ID e per refKey
    catalog.set(`chapter.${chap.chapterId}`, {
      targetType: 'CHAPTER',
      targetId: chap.chapterId,
      title: chap.title || `Capitolo ${chapterNum}`,
      chapterNumber: chapterNum,
      startPage
    });
    catalog.set(chap.chapterId, catalog.get(`chapter.${chap.chapterId}`));

    // Registra concetti presenti nei blocchi del capitolo
    if (Array.isArray(chap.blocks)) {
      chap.blocks.forEach(b => {
        if (b.conceptId) {
          catalog.set(`concept.${b.conceptId}`, {
            targetType: 'CONCEPT',
            targetId: b.conceptId,
            title: b.conceptId,
            chapterNumber: chapterNum,
            startPage
          });
          catalog.set(b.conceptId, catalog.get(`concept.${b.conceptId}`));
        }
      });
    }
  });

  // Integra nodi del Knowledge Graph se fornito
  if (knowledgeGraph && Array.isArray(knowledgeGraph.nodes)) {
    knowledgeGraph.nodes.forEach(n => {
      const chapEntry = catalog.get(`chapter.${n.chapterId}`) || { chapterNumber: 1, startPage: 1 };
      const entry = {
        targetType: n.type || 'CONCEPT',
        targetId: n.id,
        title: n.label || n.id,
        chapterNumber: chapEntry.chapterNumber,
        startPage: chapEntry.startPage
      };
      catalog.set(`concept.${n.id}`, entry);
      catalog.set(n.id, entry);
      if (n.attrs?.symbol) {
        catalog.set(`symbol.${n.attrs.symbol}`, entry);
      }
    });
  }

  return catalog;
}

/**
 * Risolve tutti i riferimenti semantici [REF:...] nel testo di un capitolo
 * @param {string} text 
 * @param {Map<string, Object>} catalog 
 * @param {Object} currentChapterInfo { chapterId, chapterNumber }
 * @param {'academic'|'minimal'|'inline'} mode 
 * @returns {{ resolvedText: string, unresolvedRefs: Array<string> }}
 */
function resolveSemanticReferences(text, catalog, currentChapterInfo = {}, mode = 'academic') {
  if (!text || typeof text !== 'string') return { resolvedText: text, unresolvedRefs: [] };

  const unresolvedRefs = [];

  const resolvedText = text.replace(REF_REGEX, (match, refKey) => {
    const entry = catalog.get(refKey);

    if (!entry) {
      unresolvedRefs.push(refKey);
      return match; // Mantiene invariato per audit
    }

    const isSameChapter = currentChapterInfo.chapterNumber && entry.chapterNumber === currentChapterInfo.chapterNumber;

    if (entry.targetType === 'CHAPTER') {
      if (isSameChapter) return 'in questo capitolo';
      return `Capitolo ${entry.chapterNumber} (pag. ${entry.startPage})`;
    }

    // Concept reference
    if (isSameChapter) {
      return `(v. sopra, pag. ${entry.startPage})`;
    }
    return `nel Capitolo ${entry.chapterNumber} («${entry.title}», pag. ${entry.startPage})`;
  });

  return { resolvedText, unresolvedRefs };
}

module.exports = {
  buildReferenceCatalog,
  resolveSemanticReferences
};
