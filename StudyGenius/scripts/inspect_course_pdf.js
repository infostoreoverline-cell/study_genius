const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function inspect() {
  const pdfPath = path.resolve(__dirname, '../../1-schemi_impianto_v2.pdf');
  const buf = fs.readFileSync(pdfPath);
  const data = await pdfParse(buf);
  console.log('Total pages:', data.numpages);
  
  // Analisi per capitoli/argomenti principali
  const text = data.text;
  const sections = text.split(/Fondamenti di Impianti Chimici\s+-\s+Corso di Laurea in Chimica Industriale/);
  console.log('Detected slide splits:', sections.length);

  sections.forEach((sec, idx) => {
    const lines = sec.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const header = lines.slice(0, 4).join(' // ');
    console.log(`[Slide ${idx}] ${header.slice(0, 100)}`);
  });
}

inspect().catch(console.error);
