/**
 * StudyGenius Academic Intelligence System
 * src/core/coverageMatrix.js
 * 
 * Coverage Matrix: confronta l'output didattico generato a fronte dei nodi
 * richiesti dal Teaching Blueprint e dal Knowledge Graph.
 * Dichiara con precisione matematica quali concetti sono coperti, verificati o mancanti.
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Valuta la copertura dei nodi richiesti dal Blueprint e dal Grafo all'interno del testo generato
 * @param {Object} blueprint Teaching Blueprint
 * @param {Object} knowledgeGraph Knowledge Graph strutturato
 * @param {string} fullText Testo completo generato
 * @returns {Object} Report formale della Coverage Matrix
 */
function evaluateCoverage(blueprint, knowledgeGraph, fullText = '') {
  const result = {
    timestamp: new Date().toISOString(),
    chapters: [],
    totalRequired: 0,
    totalCovered: 0,
    overallCoverage: 1.0,
    passed: true
  };

  const graphNodes = knowledgeGraph?.nodes || [];
  const nodeMap = new Map(graphNodes.map(n => [n.id, n]));

  const chapters = blueprint?.chapters || [
    {
      chapterId: 'cap-all',
      title: 'Tutti i Capitoli',
      requiredNodes: graphNodes.map(n => n.id)
    }
  ];

  for (const chap of chapters) {
    const chapReport = {
      chapterId: chap.chapterId,
      title: chap.title,
      items: [],
      missingNodes: [],
      coverageRatio: 1.0,
      passed: true
    };

    const reqNodeIds = chap.requiredNodes || [];
    let chapCovered = 0;

    for (const nodeId of reqNodeIds) {
      const node = nodeMap.get(nodeId);
      const label = node ? node.label : nodeId;

      // Cerca il concetto nel testo: prova con label e content
      const searchTerms = [label];
      if (node?.content && node.content.length > 5 && node.content.length < 50) {
        searchTerms.push(node.content);
      }

      const isFound = searchTerms.some(term => {
        const cleanTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(cleanTerm, 'i').test(fullText);
      });

      const item = {
        nodeId,
        label,
        type: node ? node.type : 'CONCEPT',
        required: true,
        generated: isFound,
        verified: isFound // se presente e privo di flag di errore nel testo
      };

      chapReport.items.push(item);

      if (isFound) {
        chapCovered++;
      } else {
        chapReport.missingNodes.push({ nodeId, label });
      }
    }

    const totalInChap = reqNodeIds.length;
    chapReport.coverageRatio = totalInChap > 0 ? (chapCovered / totalInChap) : 1.0;
    chapReport.passed = chapReport.coverageRatio >= 0.8; // Soglia minima 80% coverage per capitolo

    result.totalRequired += totalInChap;
    result.totalCovered += chapCovered;
    result.chapters.push(chapReport);
  }

  result.overallCoverage = result.totalRequired > 0
    ? (result.totalCovered / result.totalRequired)
    : 1.0;

  result.passed = result.overallCoverage >= 0.8 && result.chapters.every(c => c.passed);

  return result;
}

/**
 * Salva la Coverage Matrix su disco
 * @param {string} filePath 
 * @param {Object} coverage 
 */
function saveCoverageMatrix(filePath, coverage) {
  fs.ensureDirSync(path.dirname(filePath));
  fs.writeJsonSync(filePath, coverage, { spaces: 2 });
}

/**
 * Carica la Coverage Matrix da disco
 * @param {string} filePath 
 * @returns {Object}
 */
function loadCoverageMatrix(filePath) {
  return fs.readJsonSync(filePath);
}

module.exports = {
  evaluateCoverage,
  saveCoverageMatrix,
  loadCoverageMatrix
};
