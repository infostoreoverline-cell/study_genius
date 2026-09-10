/**
 * StudyGenius — Test Suite: VisualSpec Transactional Repair (Blocco 2B)
 * tests/test_visual_spec_repair.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { refineAllDiagramsInMarkdown } = require('../src/rendering/visualFeedbackLoop');
const visualFeedbackLoop = require('../src/rendering/visualFeedbackLoop');

async function runTests() {
  console.log('\n🚀 SEZIONE 1 — Repair Transazionale VisualSpec\n');

  // Mappa concettuale con etichette esageratamente lunghe (forza wrap = false di default)
  // che causerà di certo una collisione geometrica in SVG
  const inputMarkdown = `
Ecco una mappa concettuale con testo lunghissimo che colliderà se non riparato:

\`\`\`json:visual-spec
{
  "schemaVersion": "1.0",
  "visualId": "test_map_collision",
  "kind": "concept_map",
  "title": "Mappa Collisioni",
  "payload": {
    "layoutDirectives": { "intent": "top_down" },
    "nodes": [
      { "id": "A", "label": "QUESTO E' UN NODO CON TESTO ESTREMAMENTE LUNGO CHE SICURAMENTE COLLIDERA' CON IL NODO B SULLA DESTRA PERCHE' LA LARGHEZZA NON E' LIMITATA" },
      { "id": "B", "label": "QUESTO E' UN ALTRO NODO CON TESTO ANCORA PIU' LUNGO CHE COLLIDERA' CON IL NODO A SULLA SINISTRA" }
    ],
    "edges": [
      { "from": "A", "to": "B", "label": "relazione" }
    ]
  }
}
\`\`\`
  `;

  // Manteniamo lo stub del rasterize per evitare avvio inutile di Puppeteer/Sharp e chiamate LLM per la semantica
  const originalRasterize = visualFeedbackLoop.rasterizeSvg;
  visualFeedbackLoop.rasterizeSvg = async (svgString, options) => {
    return Buffer.from('fake png', 'utf8');
  };

  try {
    const { updatedMarkdown, optimizedCount, results } = await refineAllDiagramsInMarkdown(inputMarkdown, { mode: 'strict', maxMicroRepairs: 2 });

    if (results.length === 0) {
      throw new Error("Nessun diagramma elaborato");
    }

    const res = results[0];
    
    // Assicuriamoci che abbia effettuato ALMENO un repair (quindi iterazioni > 1)
    if (res.iterations < 2) {
      throw new Error(`Expected at least 2 iterations due to collisions, but got ${res.iterations}`);
    }

    // Se non ha passato il gate (passed === false), il Markdown non dovrebbe essere sostituito
    if (!res.passed) {
      if (!updatedMarkdown.includes('\`\`\`json:visual-spec')) {
        throw new Error('Il diagramma non ha passato il QA ma il blocco markdown originale è stato sostituito/perso!');
      }
      console.log('  ✅ Comportamento Fail-Closed corretto: il diagramma fallito non sostituisce la spec originale.');
    }

    console.log('  ✅ Test VisualSpec Repair (transazionale) superato (Le iterazioni di QA sono state eseguite).');
  } finally {
    visualFeedbackLoop.rasterizeSvg = originalRasterize;
  }
}

runTests().catch(err => {
  console.error('❌ Test fallito:', err);
  process.exit(1);
});
