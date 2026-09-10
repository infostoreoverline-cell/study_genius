const fs = require('fs');
const path = require('path');
const { processDiagramsInMarkdown } = require('../src/rendering/diagramEngine');

const targetFile = path.resolve(__dirname, '../sessions/Fisica/36a8f952-3189-463c-bef1-0d369da19b55.md');
const content = fs.readFileSync(targetFile, 'utf8');
const lines = content.split('\n');

function unescapeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

const before = lines.slice(0, 318);
const after = lines.slice(8019);

const restoredLines = [];
for (let i = 318; i <= 8018; i++) {
  const line = lines[i];
  const m = line.match(/<strong>([\s\S]*?)<\/strong>/);
  if (m) {
    restoredLines.push(unescapeHtml(m[1]));
  }
}

console.log('Restored cell count:', restoredLines.length);
const rawRestoredMd = before.join('\n') + '\n\n' + restoredLines.join('\n') + '\n\n' + after.join('\n');

// Now run processDiagramsInMarkdown with the fixed diagramEngine
const processedMd = processDiagramsInMarkdown(rawRestoredMd);

console.log('Original corrupted size:', content.length);
console.log('Clean processed size:', processedMd.length);
console.log('Has academic-noble-degradation in processed?', processedMd.includes('academic-noble-degradation'));
console.log('Has academic-diagram in processed?', processedMd.includes('academic-diagram'));

// Write the clean, properly rendered markdown back to the session file
fs.writeFileSync(targetFile, processedMd, 'utf8');
console.log('Successfully saved cleaned session to', targetFile);
