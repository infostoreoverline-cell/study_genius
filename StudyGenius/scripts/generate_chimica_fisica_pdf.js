/**
 * StudyGenius Academic Intelligence System
 * scripts/generate_chimica_fisica_pdf.js
 * 
 * Generazione ed Audit Didattico del Capitolo di Chimica Fisica
 * (Cinetica Chimica, Arrhenius, Eyring, Profilo di Energia Potenziale e Grafici Quantitativi)
 * Conforme alla Specifica Didattica Master (STUDY_GENIUS_METODO_DIDATTICO_MASTER.md - Sezione 7.1, 7.3, 9.8 - 9.19).
 */

const path = require('path');
const fs = require('fs-extra');
const pdfParse = require('pdf-parse');
const { generatePdf } = require('../src/services/pdfExportService');

function safeWritePdf(destPath, buffer) {
  try {
    fs.writeFileSync(destPath, buffer);
    console.log(`  ✔ File salvato con successo: ${destPath}`);
    return destPath;
  } catch (err) {
    if (err.code === 'EBUSY') {
      const ext = path.extname(destPath);
      const base = path.basename(destPath, ext);
      const altPath = path.join(path.dirname(destPath), `${base}_master${ext}`);
      fs.writeFileSync(altPath, buffer);
      console.warn(`  ⚠️ [EBUSY] File ${path.basename(destPath)} bloccato da visualizzatore PDF. Salvato come: ${altPath}`);
      return altPath;
    }
    throw err;
  }
}

async function runChimicaFisicaGeneration() {
  console.log('🚀 [Chimica Fisica] Inizio compilazione capitolo didattico master...');

  const docsDir = path.resolve(__dirname, '../../descrizioni funzionamento');
  const sessionDir = path.resolve(__dirname, '../sessions/Chimica');
  fs.ensureDirSync(docsDir);
  fs.ensureDirSync(sessionDir);

  const docMdPath = path.join(docsDir, 'ESEMPIO_CHIMICA_FISICA_CON_GRAFICI.md');
  const sessionMdPath = path.join(sessionDir, 'Esempio_Chimica_Fisica_Arrhenius_Master.md');
  const docPdfPath = path.join(docsDir, 'ESEMPIO_CHIMICA_FISICA_CON_GRAFICI.pdf');
  const sessionPdfPath = path.join(sessionDir, 'Esempio_Chimica_Fisica_Arrhenius_Master.pdf');

  // 1. Lettura certificata del Markdown da disco
  if (!fs.existsSync(docMdPath)) {
    throw new Error(`File sorgente non trovato: ${docMdPath}`);
  }
  const markdownContent = fs.readFileSync(docMdPath, 'utf-8');

  // Sincronizzazione copia nella sessione di Chimica
  fs.writeFileSync(sessionMdPath, markdownContent, 'utf-8');
  console.log('  ✔ Sorgente sincronizzata in sessione Chimica:', sessionMdPath);

  // 2. Compilazione PDF con Puppeteer headless + MathJax 4 SVG + DiagramEngine
  console.log('📄 [Chimica Fisica] Generazione PDF con MathJax 4 SVG e DiagramEngine...');
  const result = await generatePdf({
    content: markdownContent,
    isMarkdown: true,
    title: 'Chimica Fisica: Cinetica Chimica e Termodinamica dello Stato di Transizione',
    subject: 'Chimica Fisica'
  });

  // 3. Salvataggio Buffer PDF
  const actualDocPdf = safeWritePdf(docPdfPath, result.buffer);
  const actualSessionPdf = safeWritePdf(sessionPdfPath, result.buffer);

  // 4. Audit Post-Print di Terzo Livello con pdf-parse (Sezione 9.18 - 9.19)
  console.log('🔍 [Chimica Fisica] Esecuzione Audit QA Post-Stampa (Sezione 9.19)...');
  const parsedPdf = await pdfParse(Buffer.from(result.buffer));
  const pdfText = parsedPdf.text || '';

  const defects = [];
  if (/Math input error/i.test(pdfText)) {
    defects.push('MATH_MERROR_PRESENT: Rilevata stringa "Math input error" nel testo estratto dal PDF!');
  }
  if (/<(?:circle|line|rect|path|svg)\b/i.test(pdfText)) {
    defects.push('RAW_SVG_LEAK: Rilevati tag SVG grezzi stampati come testo nel PDF!');
  }
  if (/\\[a-zA-Z]{3,}/.test(pdfText) && (pdfText.includes('\\rho') || pdfText.includes('\\mathbf') || pdfText.includes('\\oint'))) {
    defects.push('RAW_TEX_LEAK: Rilevati comandi TeX non compilati visibili nel PDF!');
  }
  if (/Plot di Arrhenius:\s*ln\(k\)\s*vs\s*x/i.test(pdfText) && /La pendenza della retta di Arrhenius/i.test(pdfText)) {
    defects.push('DUPLICATE_FIGURE_TITLE: Rilevato titolo interno duplicato all\'interno della figura di Arrhenius!');
  }

  if (defects.length > 0) {
    console.error('❌ QA POST-PRINT FALLITO con i seguenti difetti:');
    defects.forEach(d => console.error(`  - ${d}`));
    throw new Error(`Audit QA Post-Stampa fallito: ${defects.join('; ')}`);
  }

  console.log('  ✔ Audit Post-Print superato al 100%!');
  console.log(`  ✔ Numero di pagine generate: ${parsedPdf.numpages}`);
  console.log(`  ✔ Dimensione testo estratto: ${pdfText.length} caratteri`);
  console.log('======================================================================');
  console.log('🎉 COMPILAZIONE CHIMICA FISICA COMPLETATA CON SUCCESSO! ZERO DIFETTI!');
  console.log('======================================================================');
  console.log(`📁 PDF Documentazione : ${actualDocPdf} (${result.buffer.length} bytes)`);
  console.log(`📁 PDF Sessione       : ${actualSessionPdf} (${result.buffer.length} bytes)`);
  console.log(`📁 Markdown Ufficiale : ${docMdPath}`);
  console.log('======================================================================');
}

runChimicaFisicaGeneration().catch(err => {
  console.error('❌ Errore irreversibile nella generazione:', err);
  process.exit(1);
});
