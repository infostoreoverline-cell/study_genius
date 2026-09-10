/**
 * StudyGenius Academic Intelligence System
 * src/rendering/chapterArtifactManager.js
 * 
 * Gestione degli Chapter Artifacts autonomi e Render Cache incrementale.
 * Ogni capitolo è un'unità indipendente compilata e cachata su hash crittografico:
 * Se il contenuto non cambia, il rendering PDF viene riutilizzato istantaneamente (zero-latency reuse).
 */

const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const { parseBlocks } = require('../generation/blockManager');
const { validateChapterArtifact } = require('../core/schemas');

const CURRENT_RENDERER_VERSION = '2.0.0';
const CURRENT_STYLE_VERSION = '2.0.0';
const CURRENT_MATH_VERSION = '3.2.1';

/**
 * Calcola l'hash univoco del contenuto del capitolo
 */
function computeContentHash(markdownText, styleVersion = CURRENT_STYLE_VERSION, mathVersion = CURRENT_MATH_VERSION) {
  return crypto
    .createHash('sha256')
    .update((markdownText || '').trim())
    .update(`::style=${styleVersion}`)
    .update(`::math=${mathVersion}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Crea o aggiorna un ChapterArtifact
 */
function createChapterArtifact({
  chapterId,
  title = 'Capitolo',
  rawMarkdown = '',
  pdfPath = null,
  pageOffset = 1,
  pageCount = 0,
  metrics = {}
}) {
  const contentHash = computeContentHash(rawMarkdown);
  const blocks = parseBlocks(rawMarkdown);

  const artifact = {
    chapterId,
    title,
    contentHash,
    renderHash: pdfPath ? contentHash : null,
    status: pdfPath ? 'rendered' : 'generated',
    blocks,
    rawMarkdown,
    pdfPath,
    metrics: {
      wordCount: (rawMarkdown.match(/[\p{L}\p{N}_\-]+/gu) || []).length,
      formulaCount: (rawMarkdown.match(/\$[^$]+\$|\$\$[\s\S]+?\$\$/g) || []).length,
      graphCount: (rawMarkdown.match(/{{GRAPH:[^}]+}}/g) || []).length,
      ...(metrics || {})
    },
    pageOffset,
    pageCount
  };

  const val = validateChapterArtifact(artifact);
  if (!val.valid) {
    throw new Error(`ChapterArtifact non valido: ${val.errors.join('; ')}`);
  }

  return artifact;
}

/**
 * Verifica se la cache di rendering del capitolo è valida e riutilizzabile
 */
function isRenderCacheValid(artifact, styleVersion = CURRENT_STYLE_VERSION, mathVersion = CURRENT_MATH_VERSION) {
  if (!artifact || !artifact.pdfPath || !artifact.contentHash) return false;

  // Verifica se il file PDF esiste su disco
  if (!fs.existsSync(artifact.pdfPath)) return false;

  // Calcola hash del contenuto attuale
  const expectedHash = computeContentHash(artifact.rawMarkdown, styleVersion, mathVersion);

  return artifact.contentHash === expectedHash && artifact.renderHash === expectedHash;
}

/**
 * Salva l'artifact su file JSON
 */
function saveChapterArtifact(baseDir, artifact) {
  const targetDir = path.join(baseDir, 'artifacts', 'chapters');
  fs.ensureDirSync(targetDir);
  const filePath = path.join(targetDir, `${artifact.chapterId}.json`);
  fs.writeJsonSync(filePath, artifact, { spaces: 2 });
  return filePath;
}

/**
 * Carica l'artifact da file JSON
 */
function loadChapterArtifact(baseDir, chapterId) {
  const filePath = path.join(baseDir, 'artifacts', 'chapters', `${chapterId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readJsonSync(filePath);
}

module.exports = {
  CURRENT_RENDERER_VERSION,
  CURRENT_STYLE_VERSION,
  CURRENT_MATH_VERSION,
  computeContentHash,
  createChapterArtifact,
  isRenderCacheValid,
  saveChapterArtifact,
  loadChapterArtifact
};
