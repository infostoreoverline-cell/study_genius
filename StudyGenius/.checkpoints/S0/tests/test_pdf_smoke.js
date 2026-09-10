const path = require('path');
const fs = require('fs-extra');
const { generatePdf } = require('../src/services/pdfExportService');

async function testPdf() {
  console.log('Testing PDF generation...');
  const sampleMarkdown = `
# Elettrostatica: Teorema di Gauss

## 1. Introduzione Fondazionale
Il teorema di Gauss correla il flusso del campo elettrostatico attraverso una superficie chiusa $\\Sigma$ alla carica netta $Q_{\\text{int}}$ concatenata:

$$\\Phi_{\\Sigma}(\\mathbf{E}) = \\oint_{\\Sigma} \\mathbf{E} \\cdot d\\mathbf{A} = \\frac{Q_{\\text{int}}}{\\varepsilon_0}$$

> 📌 **Definizione Formale**: Il flusso elettrico esprime la misura macroscopica delle linee di forza che attraversano orientatamente l'elemento di superficie orientato $d\\mathbf{A} = \\hat{n} dA$.

## 2. Profilo Radiale del Campo Elettrico $E(r)$

\`\`\`json:plot
{
  "title": "Andamento del Campo Elettrico E(r) per Sfera Uniformemente Carica",
  "expression": "x <= 1 ? x : 1 / (x * x)",
  "domain": [0, 4],
  "xLabel": "Distanza radiale r/R",
  "yLabel": "Campo Elettrico E(r) [norm.]",
  "annotations": [
    { "x": 1, "y": 1, "label": "Massimo a r = R" }
  ]
}
\`\`\`

> 🔍 **Controllo di Coerenza Asintotica**:
> Per $r \\to 0$, $E(r) \\propto r \\to 0$ (cancellazione per simmetria sferica al centro).
> Per $r \\gg R$, $E(r) \\sim 1/r^2$, recuperando esattamente il limite puntiforme della legge di Coulomb.
`;

  console.log('Generating full PDF via pdfExportService.generatePdf...');
  const result = await generatePdf({
    content: sampleMarkdown,
    isMarkdown: true,
    title: 'Esempio Elettrostatica: Teorema di Gauss e Grafici Quantitativi',
    subject: 'Fisica Generale II'
  });

  const outPath = path.join(__dirname, 'output_smoke.pdf');
  fs.writeFileSync(outPath, result.buffer);
  console.log('🎉 PDF GENERATED SUCCESSFULLY!');
  console.log('File:', outPath);
  console.log('Size:', result.buffer.length, 'bytes');
  console.log('Filename:', result.filename);
}

testPdf().catch(err => {
  console.error('PDF Generation Error:', err);
  process.exit(1);
});
