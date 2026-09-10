const { processDiagramsInMarkdown } = require('../src/rendering/diagramEngine');

const md1 = `Testo prima

\`\`\`text
Mappa di Prova
├── Nodo 1
│   ├── Sub 1A
│   └── Sub 1B
└── Nodo 2
\`\`\`

Testo dopo`;

const res1 = processDiagramsInMarkdown(md1);
console.log('Test 1 (fenced):');
console.log('Contains SVG:', res1.includes('<svg'));
console.log('Contains ASCII tree:', res1.includes('├──'));
console.log('Contains fence:', res1.includes('```'));

const md2 = `Testo prima

Mappa Unfenced
├── Punto X
└── Punto Y

Testo dopo`;

const res2 = processDiagramsInMarkdown(md2);
console.log('\nTest 2 (unfenced):');
console.log('Contains SVG:', res2.includes('<svg'));
console.log('Contains ASCII tree:', res2.includes('├──'));

const md3 = `Testo prima

\`\`\`json:visual-spec
{
  "kind": "concept_map",
  "title": "Mappa Spec v1.0",
  "payload": {
    "nodes": [
      { "id": "root", "label": "Radice" },
      { "id": "child", "label": "Figlio" }
    ],
    "edges": [
      { "from": "root", "to": "child", "relation": "classification" }
    ]
  }
}
\`\`\`

Testo dopo`;

const res3 = processDiagramsInMarkdown(md3);
console.log('\nTest 3 (json:visual-spec concept_map):');
console.log('Contains SVG:', res3.includes('<svg'));
console.log('Contains raw spec:', res3.includes('json:visual-spec'));
