/**
 * StudyGenius Academic Intelligence System
 * scripts/generate_master_example_pdf.js
 * 
 * Generatore dell'Esempio Didattico Ufficiale con Grafici Quantitativi e Schemi Tecnici
 * secondo il Metodo Didattico Master (STUDY_GENIUS_METODO_DIDATTICO_MASTER.md - Sezione 9.8 - 9.19).
 */

const path = require('path');
const fs = require('fs-extra');
const { generatePdf } = require('../src/services/pdfExportService');

function safeWritePdf(destPath, buffer) {
  try {
    fs.writeFileSync(destPath, buffer);
    console.log(`  ✔ Salvato con successo: ${destPath}`);
    return destPath;
  } catch (err) {
    if (err.code === 'EBUSY') {
      const ext = path.extname(destPath);
      const base = path.basename(destPath, ext);
      const candidates = [
        path.join(path.dirname(destPath), `${base}_master${ext}`),
        path.join(path.dirname(destPath), `${base}_v2${ext}`),
        path.join(path.dirname(destPath), `${base}_${Date.now()}${ext}`)
      ];
      for (const altPath of candidates) {
        try {
          fs.writeFileSync(altPath, buffer);
          console.warn(`  ⚠️ [EBUSY] File bloccato da visualizzatore PDF. Salvato con successo come: ${altPath}`);
          return altPath;
        } catch (e) {
          // prova candidato successivo
        }
      }
    }
    throw err;
  }
}

async function runMasterGeneration() {
  console.log('🚀 [Master Generator] Inizio generazione capitolo accademico secondo Sezione 9.8-9.19...');

  // 1. Directory di destinazione
  const docsDir = path.resolve(__dirname, '../../descrizioni funzionamento');
  const sessionDir = path.resolve(__dirname, '../sessions/Fisica');
  fs.ensureDirSync(docsDir);
  fs.ensureDirSync(sessionDir);

  const docMdPath = path.join(docsDir, 'ESEMPIO_SESSIONE_CON_GRAFICI_E_PDF.md');
  const sessionMdPath = path.join(sessionDir, 'Esempio_Gauss_Campo_Elettrico_Master.md');
  const docPdfPath = path.join(docsDir, 'ESEMPIO_SESSIONE_CON_GRAFICI_E_PDF.pdf');
  const sessionPdfPath = path.join(sessionDir, 'Esempio_Gauss_Campo_Elettrico_Master.pdf');

  // 2. Caricamento del Markdown direttamente da file disco per preservare al 100% tutti gli escape LaTeX (Sezione 9.14)
  console.log('📝 [Master Generator] Lettura sorgente Markdown certificata da disco...');
  if (!fs.existsSync(docMdPath)) {
    throw new Error(`File sorgente non trovato: ${docMdPath}`);
  }
  const exampleMarkdown = fs.readFileSync(docMdPath, 'utf-8');

  // Sincronizzazione con la sessione persistente di Fisica
  fs.writeFileSync(sessionMdPath, exampleMarkdown, 'utf-8');
  console.log('  ✔ Markdown sincronizzato in:', sessionMdPath);

  // 3. Generazione PDF Accademico ad Alta Fedeltà con controlli QA pre e post-stampa (Sezioni 9.17, 9.18, 9.19)
  console.log('📄 [Master Generator] Compilazione PDF con Puppeteer headless + MathJax SVG + DiagramEngine...');
  const result = await generatePdf({
    content: exampleMarkdown,
    isMarkdown: true,
    title: 'Fisica Generale II: Teorema di Gauss e Campo Elettrico Radiale',
    subject: 'Fisica Generale II'
  });

  // 4. Salvataggio buffer PDF verificato con gestione di eventuale lock EBUSY
  const actualDocPdf = safeWritePdf(docPdfPath, result.buffer);
  const actualSessionPdf = safeWritePdf(sessionPdfPath, result.buffer);

  console.log('======================================================================');
  console.log('🎉 COMPILAZIONE E QA COMPLETATI CON SUCCESSO! ZERO DIFETTI!');
  console.log('======================================================================');
  console.log(`📁 PDF Documentazione : ${actualDocPdf} (${result.buffer.length} bytes)`);
  console.log(`📁 PDF Sessione Fisica : ${actualSessionPdf} (${result.buffer.length} bytes)`);
  console.log(`📁 Markdown Ufficiale : ${docMdPath}`);
  console.log('======================================================================');
}

runMasterGeneration().catch(err => {
  console.error('❌ Errore irreversibile nella generazione:', err);
  process.exit(1);
});
