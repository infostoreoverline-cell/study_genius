/**
 * Genera il PDF completo della cavitazione per verificare il fix
 */
const path = require('path');
const fs = require('fs-extra');
const { generatePdf } = require('../../src/services/pdfExportService');

async function testCavitazionePdf() {
  const mdPath = path.resolve(__dirname, '../../sessions/Fisica/36a8f952-3189-463c-bef1-0d369da19b55.md');
  const markdown = fs.readFileSync(mdPath, 'utf8');

  console.log('Generazione PDF Cavitazione...');
  const result = await generatePdf({
    content: markdown,
    isMarkdown: true,
    title: 'Cavitazione nelle Pompe Centrifughe',
    subject: 'Fisica'
  });

  // Salva il PDF risultante
  const outputPath = path.resolve(__dirname, '../../sessions/Fisica/Cavitazione_Test_Fix.pdf');
  fs.writeFileSync(outputPath, result.buffer);
  console.log(`PDF salvato in: ${outputPath} (${result.buffer.length} bytes)`);
}

testCavitazionePdf().catch(console.error);
