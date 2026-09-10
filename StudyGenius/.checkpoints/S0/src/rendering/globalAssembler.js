/**
 * StudyGenius Academic Intelligence System
 * src/rendering/globalAssembler.js
 * 
 * Global Assembler & Table of Contents (TOC) Generator.
 * Unisce i capitoli autonomi, calcola gli offset di pagina globali,
 * risolve i riferimenti semantici e genera l'indice e il PDF master finale.
 */

const fs = require('fs-extra');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { buildReferenceCatalog, resolveSemanticReferences } = require('./semanticReferenceResolver');

/**
 * Calcola l'impaginazione globale e gli offset per tutti i capitoli
 * @param {Array<Object>} chapterArtifacts 
 * @param {number} startOffset Offset iniziale (es. 1 o 3 se c'è copertina/indice)
 * @returns {Array<Object>} chapterArtifacts con pageOffset e pageCount assegnati
 */
function calculateGlobalOffsets(chapterArtifacts = [], startOffset = 1) {
  let currentOffset = startOffset;

  return chapterArtifacts.map((chap, idx) => {
    const pageCount = chap.pageCount || Math.max(1, Math.ceil((chap.metrics?.wordCount || 500) / 450));
    const offset = currentOffset;
    currentOffset += pageCount;

    return {
      ...chap,
      chapterNumber: idx + 1,
      pageOffset: offset,
      pageCount
    };
  });
}

/**
 * Genera il Table of Contents (TOC) strutturato come artefatto derivato
 * @param {Array<Object>} chapterArtifacts 
 * @param {string} subject 
 * @returns {{ tocMarkdown: string, tocEntries: Array<Object> }}
 */
function generateStructuredTOC(chapterArtifacts = [], subject = 'Trattazione Accademica') {
  const entries = [];
  let tocMarkdown = `# Indice Generale — ${subject}\n\n`;

  chapterArtifacts.forEach((chap, idx) => {
    const num = idx + 1;
    const title = chap.title || `Capitolo ${num}`;
    const page = chap.pageOffset || 1;
    const wordCount = chap.metrics?.wordCount || 0;
    const estTime = Math.max(1, Math.round(wordCount / 200));

    entries.push({
      chapterNumber: num,
      chapterId: chap.chapterId,
      title,
      page,
      wordCount,
      estimatedMinutes: estTime
    });

    tocMarkdown += `### Capitolo ${num}: ${title} ......................... pag. ${page}\n`;
    tocMarkdown += `*Trattazione integrale • ~${wordCount} parole • Tempo stimato di studio: ${estTime} min*\n\n`;
  });

  return { tocMarkdown, tocEntries: entries };
}

/**
 * Assembla il PDF finale a partire dai PDF dei singoli capitoli usando pdf-lib
 * @param {Array<Object>} chapterArtifacts 
 * @param {string} outputPath Percorso del PDF master assemblato
 * @param {Object} metadata 
 * @returns {Promise<string>} outputPath del PDF master
 */
async function assembleMasterPdf(chapterArtifacts = [], outputPath, metadata = {}) {
  const masterDoc = await PDFDocument.create();
  fs.ensureDirSync(path.dirname(outputPath));

  // Aggiungi metadati PDF
  masterDoc.setTitle(metadata.title || 'StudyGenius — Dispensa Universitaria');
  masterDoc.setAuthor('StudyGenius Academic Intelligence System (Oltre 1000)');
  masterDoc.setSubject(metadata.subject || 'Generale');

  for (const chap of chapterArtifacts) {
    if (chap.pdfPath && fs.existsSync(chap.pdfPath)) {
      const chapPdfBytes = await fs.readFile(chap.pdfPath);
      const chapDoc = await PDFDocument.load(chapPdfBytes);
      const pageIndices = chapDoc.getPageIndices();
      const copiedPages = await masterDoc.copyPages(chapDoc, pageIndices);

      copiedPages.forEach(p => masterDoc.addPage(p));
    }
  }

  // Se nessun PDF parziale era presente su disco, crea una pagina placeholder con TOC
  if (masterDoc.getPageCount() === 0) {
    const page = masterDoc.addPage([595.28, 841.89]); // A4
    const font = await masterDoc.embedFont(StandardFonts.HelveticaBold);
    page.drawText(metadata.title || 'StudyGenius Master Document', {
      x: 50,
      y: 780,
      size: 18,
      font,
      color: rgb(0.1, 0.1, 0.1)
    });
  }

  const pdfBytes = await masterDoc.save();
  await fs.writeFile(outputPath, pdfBytes);
  return outputPath;
}

module.exports = {
  calculateGlobalOffsets,
  generateStructuredTOC,
  assembleMasterPdf
};
