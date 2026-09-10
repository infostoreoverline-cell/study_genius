/**
 * StudyGenius Academic Intelligence System
 * src/generation/blockManager.js
 * 
 * Gestore deterministico dei blocchi concettuali (Block ID & AST).
 * Sostituisce i fragili replace() su stringhe piene con manipolazioni mirate per ID di blocco:
 * <!-- BLOCK:type:id --> ... <!-- /BLOCK:type:id -->
 */

const BLOCK_REGEX = /<!--\s*BLOCK:([a-zA-Z0-9_\-]+):([a-zA-Z0-9_\-]+)\s*-->([\s\S]*?)<!--\s*\/BLOCK:\1:\2\s*-->/g;

/**
 * Esegue il parsing di un documento Markdown identificando tutti i blocchi strutturati
 * e preservando la prosa intermedia.
 * 
 * @param {string} text 
 * @returns {Array<{
 *   blockId: string,
 *   blockType: string,
 *   content: string,
 *   raw: string,
 *   isExplicitBlock: boolean
 * }>}
 */
function parseBlocks(text = '') {
  if (!text || typeof text !== 'string') return [];

  const blocks = [];
  let lastIndex = 0;
  let blockMatch;

  const regex = new RegExp(BLOCK_REGEX.source, 'g');

  while ((blockMatch = regex.exec(text)) !== null) {
    const matchStart = blockMatch.index;
    const matchEnd = regex.lastIndex;

    // Se c'è testo prima del blocco (o tra due blocchi)
    if (matchStart > lastIndex) {
      const interstitialText = text.slice(lastIndex, matchStart);
      if (interstitialText.trim().length > 0) {
        blocks.push({
          blockId: `prose-${blocks.length + 1}`,
          blockType: 'GENERAL_PROSE',
          content: interstitialText,
          raw: interstitialText,
          isExplicitBlock: false
        });
      }
    }

    const blockType = blockMatch[1];
    const blockId = blockMatch[2];
    const innerContent = blockMatch[3];

    blocks.push({
      blockId,
      blockType,
      content: innerContent,
      raw: blockMatch[0],
      isExplicitBlock: true
    });

    lastIndex = matchEnd;
  }

  // Eventuale testo rimanente dopo l'ultimo blocco
  if (lastIndex < text.length) {
    const trailingText = text.slice(lastIndex);
    if (trailingText.trim().length > 0) {
      blocks.push({
        blockId: `prose-${blocks.length + 1}`,
        blockType: 'GENERAL_PROSE',
        content: trailingText,
        raw: trailingText,
        isExplicitBlock: false
      });
    }
  }

  return blocks;
}

/**
 * Ricostruisce il testo Markdown completo a partire dalla lista dei blocchi
 * @param {Array<Object>} blocks 
 * @returns {string}
 */
function serializeBlocks(blocks = []) {
  if (!Array.isArray(blocks)) return '';

  return blocks.map(b => {
    if (b.isExplicitBlock) {
      return `<!-- BLOCK:${b.blockType}:${b.blockId} -->${b.content}<!-- /BLOCK:${b.blockType}:${b.blockId} -->`;
    }
    return b.content;
  }).join('');
}

/**
 * Sostituisce chirurgicamente un blocco specifico per ID
 * @param {string} document 
 * @param {string} targetBlockId 
 * @param {string} newInnerContent 
 * @returns {string} documento aggiornato
 */
function replaceBlock(document, targetBlockId, newInnerContent) {
  if (!document || !targetBlockId) return document;

  const blocks = parseBlocks(document);
  let found = false;

  for (const b of blocks) {
    if (b.blockId === targetBlockId) {
      b.content = newInnerContent;
      found = true;
      break;
    }
  }

  return found ? serializeBlocks(blocks) : document;
}

/**
 * Inserisce un nuovo blocco (es. blocco ponte o motivazione) prima o dopo un blocco target
 * @param {string} document 
 * @param {string} targetBlockId 
 * @param {{ blockId: string, blockType: string, content: string }} newBlock 
 * @param {'before'|'after'} position 
 * @returns {string} documento aggiornato
 */
function insertBlock(document, targetBlockId, newBlock, position = 'after') {
  if (!document || !targetBlockId || !newBlock) return document;

  const blocks = parseBlocks(document);
  const targetIdx = blocks.findIndex(b => b.blockId === targetBlockId);

  if (targetIdx === -1) return document;

  const formattedBlock = {
    blockId: newBlock.blockId,
    blockType: newBlock.blockType || 'MOTIVATION_BRIDGE',
    content: newBlock.content || '',
    isExplicitBlock: true
  };

  const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
  blocks.splice(insertIdx, 0, formattedBlock);

  return serializeBlocks(blocks);
}

/**
 * Sposta un blocco prima o dopo un altro blocco target (risolve PREREQUISITE_VIOLATION strutturali)
 * @param {string} document 
 * @param {string} blockIdToMove 
 * @param {string} targetBlockId 
 * @param {'before'|'after'} position 
 * @returns {string} documento riordinato
 */
function moveBlock(document, blockIdToMove, targetBlockId, position = 'before') {
  if (!document || !blockIdToMove || !targetBlockId || blockIdToMove === targetBlockId) return document;

  const blocks = parseBlocks(document);
  const moveIdx = blocks.findIndex(b => b.blockId === blockIdToMove);
  if (moveIdx === -1) return document;

  const [blockToMove] = blocks.splice(moveIdx, 1);

  const targetIdx = blocks.findIndex(b => b.blockId === targetBlockId);
  if (targetIdx === -1) {
    // Ripristina se target non trovato
    blocks.splice(moveIdx, 0, blockToMove);
    return document;
  }

  const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
  blocks.splice(insertIdx, 0, blockToMove);

  return serializeBlocks(blocks);
}

/**
 * Avvolge una porzione o genera il blocco formattato
 */
function formatBlock(blockType, blockId, content) {
  return `<!-- BLOCK:${blockType}:${blockId} -->\n${content.trim()}\n<!-- /BLOCK:${blockType}:${blockId} -->`;
}

module.exports = {
  parseBlocks,
  serializeBlocks,
  replaceBlock,
  insertBlock,
  moveBlock,
  formatBlock
};
