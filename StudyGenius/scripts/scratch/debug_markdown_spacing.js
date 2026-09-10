/**
 * Debug: verifica dove mancano righe vuote prima di heading e tabelle
 */
const fs = require('fs');
const path = require('path');

const mdPath = path.resolve(__dirname, '../../sessions/Fisica/36a8f952-3189-463c-bef1-0d369da19b55.md');
const content = fs.readFileSync(mdPath, 'utf8');
const lines = content.split('\n');

console.log('=== HEADING SENZA RIGA VUOTA PRIMA ===');
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const prevLine = lines[i - 1];
  
  // Controlla heading senza riga vuota prima
  if (/^#{1,6}\s+/.test(line.trim()) && prevLine.trim() !== '' && !prevLine.trim().startsWith('---')) {
    console.log(`  Riga ${i + 1}: "${line.trim().slice(0, 80)}" — prev: "${prevLine.trim().slice(0, 60)}"`);
  }
}

console.log('\n=== TABELLE SENZA RIGA VUOTA PRIMA ===');
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const prevLine = lines[i - 1];
  
  // Controlla tabelle (riga che inizia con |) senza riga vuota prima
  if (/^\|/.test(line.trim()) && prevLine.trim() !== '' && !/^\|/.test(prevLine.trim())) {
    console.log(`  Riga ${i + 1}: "${line.trim().slice(0, 80)}" — prev: "${prevLine.trim().slice(0, 60)}"`);
  }
}

console.log('\n=== FORMULE SU RIGA SINGOLA SENZA SPAZIATURE ===');
for (let i = 1; i < lines.length - 1; i++) {
  const line = lines[i].trim();
  const prevLine = lines[i - 1].trim();
  const nextLine = lines[i + 1].trim();
  
  // Formula display su riga singola ($ o $$) senza riga vuota prima e dopo
  if (/^\$[^$]/.test(line) && line.endsWith('$') && !line.startsWith('$$')) {
    if (prevLine !== '' || nextLine !== '') {
      console.log(`  Riga ${i + 1}: "${line.slice(0, 80)}"`);
      if (prevLine !== '') console.log(`    prev non vuota: "${prevLine.slice(0, 60)}"`);
      if (nextLine !== '') console.log(`    next non vuota: "${nextLine.slice(0, 60)}"`);
    }
  }
}
