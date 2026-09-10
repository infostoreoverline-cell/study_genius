/**
 * StudyGenius Academic Intelligence System
 * scripts/generate_sample_pdf.js
 * 
 * Genera una dispensa accademica di esempio in formato PDF all'interno della cartella "esempi",
 * contenente la dimostrazione teorica del Teorema di Gauss, le formule vettoriali MathJax
 * e il grafico vettoriale deterministico D3.js generato dal Visualization Engine (Milestone V1).
 */

const path = require('path');
const fs = require('fs-extra');
const puppeteer = require('puppeteer');

// MathJax per il rendering lato server delle formule LaTeX in SVG vettoriale
const { mathjax } = require('mathjax-full/js/mathjax.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { SVG } = require('mathjax-full/js/output/svg.js');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');

// Visualization Engine di StudyGenius
const {
  validateGraphSpec,
  buildDataset,
  validateGraphData,
  renderGraphToHtml,
  getGraphHeadAssets,
  ACADEMIC_GRAPH_CSS
} = require('../src/visualization');

// Setup MathJax
const mathjaxAdaptor = liteAdaptor();
RegisterHTMLHandler(mathjaxAdaptor);
const mathjaxTex = new TeX({
  packages: AllPackages,
  inlineMath: [['$', '$'], ['\\(', '\\)']],
  displayMath: [['$$', '$$'], ['\\[', '\\]']],
  processEscapes: true
});
const mathjaxSvg = new SVG({ fontCache: 'local' });

function renderMathJax(contentHtml) {
  const doc = mathjax.document(contentHtml, {
    InputJax: mathjaxTex,
    OutputJax: mathjaxSvg
  });
  doc.render();
  const css = mathjaxAdaptor.textContent(mathjaxSvg.styleSheet(doc));
  const renderedHtml = mathjaxAdaptor.innerHTML(mathjaxAdaptor.body(doc.document));
  return { html: renderedHtml, css };
}

async function generateSamplePdf() {
  console.log('🚀 Avvio generazione dispensa di esempio con grafico deterministico D3.js...');

  // 1. Definizione e calcolo del nodo grafico FORMULA-derived (Sfera carica)
  const sphereGraphNode = {
    id: 'electric-field-charged-sphere',
    type: 'GRAPH',
    chapterId: 'campo-elettrico-simmetria-sferica',
    relatedFormulaId: 'gauss-law-e-sphere',
    provenance: 'FORMULA-derived',
    chartType: 'FUNCTION',
    x: { label: 'r', unit: 'm', min: 0, max: '3*R' },
    y: { label: 'E(r)', unit: 'N/C' },
    domainSplit: [
      { condition: 'r < R', expression: 'rho*r/(3*epsilon0)' },
      { condition: 'r >= R', expression: 'rho*R^3/(3*epsilon0*r^2)' }
    ],
    annotations: [
      { x: 'R', label: 'raccordo tra i due regimi (massimo di campo)' }
    ],
    context: {
      R: 1.0,
      rho: 1.0,
      epsilon0: 8.854e-12
    },
    status: 'unverified'
  };

  // Validazione spec
  const specValidation = validateGraphSpec(sphereGraphNode);
  if (!specValidation.valid) {
    throw new Error(`Specifiche del grafico non valide: ${JSON.stringify(specValidation.errors)}`);
  }

  // Calcolo numerico deterministico
  const dataset = buildDataset(sphereGraphNode, 300);
  const dataValidation = validateGraphData(sphereGraphNode, dataset);
  if (!dataValidation.valid) {
    throw new Error(`Dati del grafico non validi: ${JSON.stringify(dataValidation.errors)}`);
  }

  console.log(`📊 Dataset generato: ${dataset.points.length} campioni, dominio [${dataset.domain[0]}, ${dataset.domain[1]}], range [${dataset.range[0].toExponential(2)}, ${dataset.range[1].toExponential(2)}]`);

  // Rendering HTML del componente grafico
  const graphHtmlSnippet = renderGraphToHtml(sphereGraphNode, dataset);

  // 2. Costruzione del testo didattico accademico
  const rawChapterContent = `
    <h1>Capitolo 4 — Distribuzioni Continue di Carica e Teorema di Gauss</h1>
    
    <h2>4.1 Il Problema Fisico: Sfera Dielettrica Uniformemente Carica</h2>
    <p>
      Consideriamo una sfera dielettrica isolante di raggio $R$ posizionata con il proprio centro nell'origine del sistema di riferimento. 
      La sfera contiene una carica elettrica totale $Q$ distribuita in modo omogeneo nel suo volume, descritta da una densità volumica di carica costante $\\rho$:
    </p>

    <div class="academic-callout callout-definition">
      <p><strong>Definizione 4.1 (Densità Volumica di Carica Costante):</strong></p>
      <p>
        Dato il volume totale della sfera $V = \\frac{4}{3}\\pi R^3$, la densità volumetrica di carica uniforme è definita come:
      </p>
      <div style="text-align: center; margin: 8px 0;">
        $$\\rho = \\frac{Q}{V} = \\frac{Q}{\\frac{4}{3}\\pi R^3} \\quad \\left[\\frac{\\text{C}}{\\text{m}^3}\\right]$$
      </div>
      <p>
        Poiché la distribuzione possiede simmetria sferica centrale, il campo elettrostatico risultante $\\vec{E}(\\vec{r})$ deve essere puramente radiale e dipendere esclusivamente dalla distanza $r = \\|\\vec{r}\\|$ dal centro: $\\vec{E}(\\vec{r}) = E(r)\\,\\hat{u}_r$.
      </p>
    </div>

    <h2>4.2 Applicazione del Teorema di Gauss</h2>
    <p>
      Per calcolare l'intensità del campo $E(r)$, scegliamo come superficie gaussiana chiusa $\\Sigma$ una sfera concentrica di raggio arbitrario $r$.
    </p>

    <div class="academic-callout callout-theorem">
      <p><strong>Teorema 4.1 (Legge di Gauss in Forma Integrale):</strong></p>
      <p>
        Il flusso del campo elettrico attraverso una qualsiasi superficie chiusa $\\Sigma$ è proporzionale alla carica totale interna $Q_{\\text{int}}$:
      </p>
      <div style="text-align: center; margin: 8px 0;">
        $$\\Phi_\\Sigma(\\vec{E}) = \\oint_\\Sigma \\vec{E} \\cdot d\\vec{A} = \\frac{Q_{\\text{int}}}{\\varepsilon_0}$$
      </div>
      <p>
        Grazie all'isotropia radiale, $\\vec{E}$ è ovunque parallelo al versore normale uscente $d\\vec{A} = dA\\,\\hat{u}_r$ e possiede modulo costante su tutta la superficie gaussiana sferica:
      </p>
      <div style="text-align: center; margin: 8px 0;">
        $$\\Phi_\\Sigma(\\vec{E}) = \\oint_\\Sigma E(r)\\,dA = E(r) \\oint_\\Sigma dA = E(r) \\cdot 4\\pi r^2$$
      </div>
    </div>

    <h2>4.3 Derivazione Analitica nei Due Regimi</h2>
    <p>
      L'espressione analitica di $Q_{\\text{int}}$ varia a seconda che il punto di osservazione si trovi all'interno o all'esterno della sfera:
    </p>

    <h3>Regime Interno: $r < R$</h3>
    <p>
      La superficie gaussiana racchiude solo la porzione di carica compresa nella sfera di raggio $r$. Il volume interno è $V(r) = \\frac{4}{3}\\pi r^3$, per cui:
    </p>
    <div style="text-align: center; margin: 8px 0;">
      $$Q_{\\text{int}}(r) = \\rho \\cdot V(r) = \\rho \\cdot \\frac{4}{3}\\pi r^3$$
    </div>
    <p>
      Uguagliando al flusso calcolato mediante la legge di Gauss:
    </p>
    <div style="text-align: center; margin: 8px 0;">
      $$E(r) \\cdot 4\\pi r^2 = \\frac{\\rho \\cdot \\frac{4}{3}\\pi r^3}{\\varepsilon_0} \\implies E(r) = \\frac{\\rho}{3\\varepsilon_0}\\,r \\quad (r < R)$$
    </div>
    <p>
      <strong>Intuizione fisica:</strong> All'interno della sfera, il campo elettrico cresce <em>linearmente</em> partendo da zero al centro ($E(0) = 0$). Man mano che ci si allontana dall'origine, la quantità di carica che attrae/respinge aumenta proporzionalmente a $r^3$, superando l'effetto dell'indebolimento quadratico $1/r^2$.
    </p>

    <h3>Regime Esterno: $r \\ge R$</h3>
    <p>
      Per $r \\ge R$, la superficie gaussiana racchiude l'intera carica della sfera $Q = \\rho \\cdot \\frac{4}{3}\\pi R^3$:
    </p>
    <div style="text-align: center; margin: 8px 0;">
      $$E(r) \\cdot 4\\pi r^2 = \\frac{\\rho \\cdot \\frac{4}{3}\\pi R^3}{\\varepsilon_0} \\implies E(r) = \\frac{\\rho R^3}{3\\varepsilon_0}\\,\\frac{1}{r^2} = \\frac{Q}{4\\pi\\varepsilon_0 r^2} \\quad (r \\ge R)$$
    </div>
    <p>
      <strong>Intuizione fisica:</strong> All'esterno della sfera, il campo decade come l'inverso del quadrato della distanza ($1/r^2$), esattamente coincidente con il campo prodotto da una carica puntiforme $Q$ concentrata nel centro geometrico della sfera.
    </p>

    <div style="page-break-before: always;"></div>

    <h2>4.4 Profilo del Campo Elettrico $E(r)$ (Visualizzazione Vettoriale)</h2>
    <p>
      Il seguente grafico, calcolato e disegnato dal <strong>Visualization Engine deterministico</strong> di StudyGenius, illustra l'andamento continuo del campo elettrostatico $E(r)$ in funzione del raggio $r$ (con $R = 1.0\\,\\text{m}$, $\\rho = 1.0\\,\\text{C/m}^3$ e $\\varepsilon_0 = 8.854 \\times 10^{-12}\\,\\text{F/m}$):
    </p>

    <!-- INSERIMENTO GRAFICO DETERMINISTICO -->
    {{GRAPH_CONTAINER_PLACEHOLDER}}

    <h2>4.5 Analisi di Coerenza Didattica e Proprietà Notevoli</h2>
    
    <div class="academic-callout callout-coherence">
      <p><strong>Verifica di Coerenza Matematica e Fisica (Continuous Patching):</strong></p>
      <ul>
        <li><strong>Comportamento al centro ($r = 0$):</strong> $E(0) = \\frac{\\rho}{3\\varepsilon_0} \\cdot 0 = 0$. Per ragioni di simmetria, i contributi delle cariche opposte si elidono perfettamente al centro.</li>
        <li><strong>Massimo e Continuità sulla superficie ($r = R$):</strong>
          $$\\lim_{r \\to R^-} E(r) = \\frac{\\rho R}{3\\varepsilon_0} \\approx 3.76 \\times 10^{10}\\,\\frac{\\text{N}}{\\text{C}}$$
          $$\\lim_{r \\to R^+} E(r) = \\frac{\\rho R^3}{3\\varepsilon_0 R^2} = \\frac{\\rho R}{3\\varepsilon_0}$$
          I limiti sinistro e destro coincidono esattamente. Il campo $E(r)$ è <strong>continuo</strong> su tutto $\\mathbb{R}^3$, raggiungendo il suo valore massimo assoluto sulla superficie di separazione $r = R$.
        </li>
        <li><strong>Decadimento asintotico ($r \\to \\infty$):</strong> Per distanze $r \\gg R$, $E(r) \\sim 1/r^2$, verificando il principio di corrispondenza con la legge di Coulomb.</li>
      </ul>
    </div>

    <div class="academic-callout callout-exam">
      <p><strong>💡 Domanda Chiave d'Esame Orale:</strong></p>
      <p>
        <em>"Perché il campo elettrico di una sfera dielettrica è continuo in $r=R$, mentre per una sfera conduttrice presenta una discontinuità a gradino?"</em>
      </p>
      <p>
        <strong>Risposta Modello:</strong> Nella sfera isolante la carica è distribuita in volume ($\\rho$ finito), dunque il flusso attraverso una pillbox infinitesima a cavallo della superficie racchiude carica infinitesima d'ordine $dr$, rendendo la componente normale del campo continua. In un conduttore all'equilibrio elettrostatico la carica risiede interamente in uno strato superficiale bidimensionale con densità superficiale $\\sigma = Q/(4\\pi R^2)$. Il salto del campo è dato dalla condizione al contorno $\\Delta E_\\perp = \\sigma / \\varepsilon_0$, portando a $E_{\\text{int}} = 0$ ed $E_{\\text{ext}}(R^+) = \\sigma/\\varepsilon_0$.
      </p>
    </div>
  `;

  // Compilazione formule MathJax
  console.log('📐 Compilazione formule matematiche LaTeX via MathJax SVG...');
  const renderedMath = renderMathJax(rawChapterContent);

  // Inserimento del grafico al posto del placeholder
  const finalChapterHtml = renderedMath.html.replace('{{GRAPH_CONTAINER_PLACEHOLDER}}', graphHtmlSnippet);

  // 3. Assemblaggio HTML completo
  const docTitle = 'Teorema di Gauss e Campo Elettrico di una Sfera Uniformemente Carica';
  const docSubject = 'Fisica Generale II — Elettromagnetismo';
  const formattedDate = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

  const fullHtml = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  
  <style>
    ${renderedMath.css}

    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }
    body {
      font-family: 'STIX Two Text', 'Times New Roman', 'Cambria', Georgia, serif;
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
      color: #0f172a;
      line-height: 1.5;
      font-size: 12px;
      text-rendering: optimizeLegibility;
      background: #ffffff;
    }

    /* FRONTESPIZIO UNIVERSITARIO ACCADEMICO */
    .frontespizio {
      box-sizing: border-box;
      min-height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      border: 2px solid #0f172a;
      padding: 35px 30px;
      margin: 0 0 20px 0;
      page-break-after: always;
      break-after: page;
      background: #fafafa;
    }
    @media screen {
      .frontespizio {
        min-height: 640px;
        margin-bottom: 35px;
      }
    }
    .frontespizio-uni {
      font-size: 13.5px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-weight: 700;
      color: #334155;
      margin-bottom: 22px;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 8px;
      width: 100%;
    }
    .frontespizio-title {
      font-size: 25px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.25;
      margin: 22px 0 14px 0;
    }
    .frontespizio-subtitle {
      font-size: 14.5px;
      color: #1e3a8a;
      font-style: italic;
      margin-bottom: 30px;
    }
    .frontespizio-meta-box {
      width: 100%;
      max-width: 500px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      padding: 16px 22px;
      border-radius: 4px;
      text-align: left;
      font-size: 12px;
      margin-top: 20px;
    }
    .frontespizio-meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 4px;
    }
    .frontespizio-meta-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .frontespizio-meta-label {
      font-weight: 600;
      color: #475569;
    }
    .frontespizio-meta-val {
      color: #0f172a;
      font-weight: 500;
    }

    /* CORPO DELLA DISPENSA */
    .dispensa-content {
      margin-top: 0;
    }
    h1, h2, h3, h4 {
      font-family: 'STIX Two Text', serif;
      page-break-after: avoid;
      break-after: avoid;
      color: #0f172a;
    }
    h1 {
      font-size: 18px;
      font-weight: 700;
      border-bottom: 1.5px solid #1e293b;
      padding-bottom: 3px;
      margin-top: 0;
      margin-bottom: 8px;
    }
    h2 {
      font-size: 14.5px;
      color: #1e3a8a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
      margin-top: 12px;
      margin-bottom: 5px;
    }
    h3 {
      font-size: 13px;
      color: #1e293b;
      margin-top: 8px;
      margin-bottom: 3px;
    }
    p {
      margin: 4px 0;
      text-align: justify;
      text-justify: inter-word;
      font-size: 12px;
      line-height: 1.5;
    }
    ul, ol {
      margin: 3px 0;
      padding-left: 18px;
      font-size: 11.5px;
    }
    li { margin: 1px 0; }

    /* CALLOUT SEMANTICI ACCADEMICI */
    .academic-callout {
      padding: 7px 12px;
      margin: 6px 0;
      border-radius: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
      font-size: 11.5px;
      line-height: 1.45;
    }
    .academic-callout p { margin: 2px 0; }
    .callout-definition { border-left: 4px solid #2563eb; background: #eff6ff; color: #1e3a8a; }
    .callout-theorem { border-left: 4px solid #4f46e5; background: #eef2ff; color: #312e81; }
    .callout-coherence { border-left: 4px solid #0d9488; background: #f0fdfa; color: #134e4a; }
    .callout-exam { border-left: 4px solid #7c3aed; background: #f5f3ff; color: #4c1d95; }

    mjx-container[jax="SVG"][display="true"] {
      display: block;
      text-align: center;
      margin: 0.3em 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    mjx-container[jax="SVG"]:not([display="true"]) {
      display: inline-block;
      vertical-align: middle;
    }

    /* Ottimizzazione Grafico Deterministico in Pagina A4 */
    .academic-graph-container {
      margin: 8px auto 12px auto !important;
      padding: 10px 14px 8px 14px !important;
      max-width: 580px !important;
    }
    .academic-graph-container .academic-graph-svg {
      max-height: 255px !important;
      width: auto !important;
      display: block !important;
      margin: 0 auto !important;
    }

    .page-break-section {
      page-break-before: always;
      break-before: page;
    }
  </style>

  <!-- Iniezione D3.js e Visualization Engine -->
  ${getGraphHeadAssets()}
</head>
<body>
  <!-- FRONTESPIZIO -->
  <div class="frontespizio">
    <div class="frontespizio-uni">Università degli Studi · StudyGenius</div>
    <div class="frontespizio-title">${docTitle}</div>
    <div class="frontespizio-subtitle">Dispensa accademica con derivazione integrale e grafica deterministica</div>
    <div class="frontespizio-meta-box">
      <div class="frontespizio-meta-row">
        <span class="frontespizio-meta-label">Materia:</span>
        <span class="frontespizio-meta-val">${docSubject}</span>
      </div>
      <div class="frontespizio-meta-row">
        <span class="frontespizio-meta-label">Metodo didattico:</span>
        <span class="frontespizio-meta-val">Derivazione motivata + Teorema di Gauss + Controlli di coerenza</span>
      </div>
      <div class="frontespizio-meta-row">
        <span class="frontespizio-meta-label">Motore Grafico:</span>
        <span class="frontespizio-meta-val">Visualization Engine V1 (D3.js deterministico, FORMULA-derived)</span>
      </div>
      <div class="frontespizio-meta-row">
        <span class="frontespizio-meta-label">Notazione:</span>
        <span class="frontespizio-meta-val">Standard SI, Formule LaTeX vettoriali MathJax</span>
      </div>
      <div class="frontespizio-meta-row">
        <span class="frontespizio-meta-label">Data di generazione:</span>
        <span class="frontespizio-meta-val">${formattedDate}</span>
      </div>
    </div>
  </div>

  <!-- CONTENUTO DISPENSA -->
  <div class="dispensa-content">
    ${finalChapterHtml}
  </div>
</body>
</html>`;

  // 4. Avvio Puppeteer ed esportazione in PDF e PNG
  console.log('🌐 Lancio istanza Puppeteer per il rendering deterministico...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    await page.setJavaScriptEnabled(true);

    console.log('⏳ Caricamento contenuto nella pagina ed esecuzione script D3 client-side...');
    await page.setContent(fullHtml, {
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 45000
    });

    // Attesa rendering del grafico D3
    await page.waitForSelector('.academic-graph-rendered', { timeout: 10000 });
    console.log('✅ Grafico D3 renderizzato con successo nel DOM!');

    // Attesa font accademici
    try {
      await page.evaluateHandle('document.fonts.ready');
    } catch (e) {}

    // Cartella di destinazione "esempi"
    const workspaceRoot = path.resolve(__dirname, '..', '..');
    const targetDir = path.join(workspaceRoot, 'esempi');
    await fs.ensureDir(targetDir);

    // Screenshot dell'elemento grafico per preview immediata ad alta risoluzione
    const graphElement = await page.$('.academic-graph-container');
    const imgFilename = 'grafico_campo_elettrico_sfera.png';
    const imgOutputPath = path.join(targetDir, imgFilename);
    if (graphElement) {
      await graphElement.screenshot({
        path: imgOutputPath,
        omitBackground: false
      });
      console.log(`🖼️ Immagine del grafico salvata in: ${imgOutputPath}`);
    }

    // Screenshot completo delle pagine per anteprima visiva rapida
    const fullpageImgPath = path.join(targetDir, 'anteprima_dispensa_completa.png');
    await page.screenshot({
      path: fullpageImgPath,
      fullPage: true
    });
    console.log(`📸 Anteprima visiva completa salvata in: ${fullpageImgPath}`);

    // Generazione del PDF A4
    const pdfFilename = 'Esempio_Grafico_Sfera_Carica.pdf';
    const pdfOutputPath = path.join(targetDir, pdfFilename);

    console.log('📄 Generazione PDF A4 con layout accademico...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '18mm',
        right: '18mm'
      },
      preferCSSPageSize: true
    });

    await fs.writeFile(pdfOutputPath, pdfBuffer);
    console.log(`🎉 PDF generato con successo (${pdfBuffer.length} bytes):`);
    console.log(`   👉 ${pdfOutputPath}`);

    return {
      pdfPath: pdfOutputPath,
      imgPath: imgOutputPath,
      sizeBytes: pdfBuffer.length
    };
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  generateSamplePdf()
    .then(res => {
      console.log('\n=======================================================');
      console.log('✨ OPERAZIONE COMPLETATA CON SUCCESSO');
      console.log(`📄 PDF: ${res.pdfPath} (${(res.sizeBytes / 1024).toFixed(1)} KB)`);
      console.log(`🖼️ Immagine: ${res.imgPath}`);
      console.log('=======================================================\n');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Errore durante la generazione:', err);
      process.exit(1);
    });
}

module.exports = { generateSamplePdf };
