/**
 * StudyGenius Academic Intelligence System
 * scripts/generate_chemistry_sample_pdf.js
 * 
 * Genera una dispensa accademica di Chimica Analitica (Soluzioni Tampone e Potere Tampone)
 * con impaginazione A4, formule LaTeX vettoriali MathJax e due grafici deterministici D3.js:
 * 1. Speziazione della specie coniugata alpha(A-) vs pH
 * 2. Potere tampone di Van Slyke beta(pH) con dimostrazione analitica dei limiti di efficacia.
 */

const path = require('path');
const fs = require('fs-extra');
const puppeteer = require('puppeteer');

// MathJax per il rendering LaTeX lato server in SVG
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
  getGraphHeadAssets
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

async function generateChemistrySamplePdf() {
  console.log('🚀 Avvio generazione dispensa di Chimica Analitica (Soluzioni Tampone)...');

  // =========================================================================
  // 1. NODO GRAFICO 1: Curva di Speziazione alpha(A-) vs pH
  // =========================================================================
  const speciationNode = {
    id: 'buffer-speciation-distribution',
    type: 'GRAPH',
    chapterId: 'soluzioni-tampone-equilibri-acido-base',
    relatedFormulaId: 'acid-dissociation-speciation-alpha',
    provenance: 'FORMULA-derived',
    chartType: 'FUNCTION',
    x: { label: 'pH', unit: '', min: 2.5, max: 7.0 },
    y: { label: 'alpha(A-)', unit: '' },
    expression: '1 / (1 + 10^(pKa - pH))',
    annotations: [
      { x: 3.76, label: 'pH = pKa - 1: [A-] = 9.1% (Limite inferiore)' },
      { x: 4.76, label: 'pH = pKa (4.76): [HA] = [A-] = 50% (Punto Isobestico)' },
      { x: 5.76, align: 'left', label: 'pH = pKa + 1: [A-] = 90.9% (Limite superiore)' }
    ],
    context: {
      pKa: 4.76
    },
    status: 'unverified'
  };

  const v1 = validateGraphSpec(speciationNode);
  if (!v1.valid) throw new Error(`Errore validazione speciationNode: ${JSON.stringify(v1.errors)}`);
  const datasetSpeciation = buildDataset(speciationNode, 220);
  const dataVal1 = validateGraphData(speciationNode, datasetSpeciation);
  if (!dataVal1.valid) throw new Error(`Errore dataset speciation: ${JSON.stringify(dataVal1.errors)}`);

  const htmlGraphSpeciation = renderGraphToHtml(speciationNode, datasetSpeciation);
  console.log('✅ Grafico 1 (Speziazione) compilato con successo');

  // =========================================================================
  // 2. NODO GRAFICO 2: Potere Tampone di Van Slyke beta(pH)
  // =========================================================================
  const bufferCapacityNode = {
    id: 'van-slyke-buffer-capacity',
    type: 'GRAPH',
    chapterId: 'soluzioni-tampone-equilibri-acido-base',
    relatedFormulaId: 'van-slyke-buffer-index',
    provenance: 'FORMULA-derived',
    chartType: 'FUNCTION',
    x: { label: 'pH', unit: '', min: 2.5, max: 7.0 },
    y: { label: 'beta', unit: 'M/pH' },
    expression: '2.303 * (10^(-pH) + 10^(pH - 14) + Ctot * 10^(-pKa) * 10^(-pH) / (10^(-pKa) + 10^(-pH))^2)',
    annotations: [
      { x: 3.76, align: 'left', label: 'pKa - 1: Limite inf. (33%)' },
      { x: 4.76, label: 'pH = pKa: Massimo (beta_max = 0.576*Ctot)' },
      { x: 5.76, label: 'pKa + 1: Limite sup. (33%)' }
    ],
    context: {
      pKa: 4.76,
      Ctot: 0.1
    },
    status: 'unverified'
  };

  const v2 = validateGraphSpec(bufferCapacityNode);
  if (!v2.valid) throw new Error(`Errore validazione bufferCapacityNode: ${JSON.stringify(v2.errors)}`);
  const datasetCapacity = buildDataset(bufferCapacityNode, 220);
  const dataVal2 = validateGraphData(bufferCapacityNode, datasetCapacity);
  if (!dataVal2.valid) throw new Error(`Errore dataset capacity: ${JSON.stringify(dataVal2.errors)}`);

  const htmlGraphCapacity = renderGraphToHtml(bufferCapacityNode, datasetCapacity);
  console.log('✅ Grafico 2 (Potere Tampone Van Slyke) compilato con successo');

  // =========================================================================
  // 3. TESTO DIDATTICO RIGOROSO (FONDAMENTI DI CHIMICA ANALITICA)
  // =========================================================================
  const rawChapterContent = `
    <!-- PAGINA 2: MECCANISMO DEL TAMPONE E GRAFICO DI SPEZIAZIONE -->
    <h1>Capitolo 3 — Equilibri Acido-Base: Teoria e Limiti delle Soluzioni Tampone</h1>

    <h2>3.1 Meccanismo Chimico ed Equazione di Henderson-Hasselbalch</h2>
    <p>
      In Chimica Analitica, una <strong>soluzione tampone</strong> è definita operativamente come un sistema chimico in grado di minimizzare le variazioni di $\\text{pH}$ conseguenti all'aggiunta di quantità moderate di acidi forti o basi forti, oppure alla diluizione. È formata da una coppia coniugata acido-base a concentrazioni paragonabili, tipicamente un acido debole $HA$ e la sua base coniugata $A^-$ (fornita sotto forma di sale completamente dissociato $NaA$):
    </p>

    <div class="academic-callout callout-definition">
      <p><strong>Definizione 3.1 (Equilibrio della Coppia Coniugata):</strong></p>
      <div style="text-align: center; margin: 4px 0;">
        $$HA + H_2O \\rightleftharpoons A^- + H_3O^+, \\quad K_a = \\frac{[H_3O^+][A^-]}{[HA]}$$
      </div>
      <p>
        Se applichiamo l'operatore $-\\log_{10}$ ad entrambi i membri, si perviene all'<strong>Equazione di Henderson-Hasselbalch</strong>:
      </p>
      <div style="text-align: center; margin: 4px 0;">
        $$\\text{pH} = \\text{p}K_a + \\log_{10}\\left(\\frac{[A^-]}{[HA]}\\right) \\approx \\text{p}K_a + \\log_{10}\\left(\\frac{C_b}{C_a}\\right)$$
      </div>
      <p>
        <strong>Condizioni di Validità Analitica:</strong> L'uguaglianza approssimata $[A^-] \\approx C_b$ e $[HA] \\approx C_a$ è lecita solo se la quantità di $HA$ dissociata e la quantità di $A^-$ idrolizzata sono trascurabili rispetto alle concentrazioni analitiche iniziali ($[H_3O^+] \\ll C_a, C_b$ e $[OH^-] \\ll C_a, C_b$). Tale condizione richiede $C_a, C_b \\ge 10^{-3}\\,\\text{M}$ e $3 < \\text{pH} < 11$.
      </p>
    </div>

    <h2>3.2 Dimostrazione Grafica 1: Distribuzione delle Specie e Limite di Esaurimento</h2>
    <p>
      La frazione di acido convertita nella specie ionizzata basica $\\alpha_{A^-}(\\text{pH})$ esprime la speziazione analitica del sistema in funzione del $\\text{pH}$:
    </p>
    <div style="text-align: center; margin: 4px 0;">
      $$\\alpha_{A^-} = \\frac{[A^-]}{C_{\\text{tot}}} = \\frac{K_a}{K_a + [H^+]} = \\frac{1}{1 + 10^{\\text{p}K_a - \\text{pH}}}$$
    </div>
    <p>
      Il seguente grafico deterministico calcola la frazione molare della base coniugata per il sistema acido acetico / acetato ($\\text{p}K_a = 4.76$):
    </p>

    <!-- GRAFICO 1: SPEZIAZIONE -->
    {{GRAPH_1_SPECIATION}}

    <p style="font-size: 11.5px; margin-top: 4px;">
      <strong>Dimostrazione del Limite Tramite il Grafico:</strong> A $\\text{pH} = \\text{p}K_a = 4.76$ le due curve di concentrazione si incrociano ($\\alpha_{HA} = \\alpha_{A^-} = 0.50$, punto isobestico). Ai limiti dell'intervallo didattico $\\text{pH} = \\text{p}K_a \\pm 1$, una delle due specie scende drasticamente a solo il <strong>$9.1\\%$</strong> della concentrazione totale ($[A^-]/[HA] = 0.1$ oppure $[A^-]/[HA] = 10$). Fuori da questa finestra, la riserva chimica si esaurisce rapidamente e la soluzione non può più neutralizzare perturbazioni.
    </p>

    <div class="page-break-section"></div>

    <!-- PAGINA 3: DERIVAZIONE VAN SLYKE E GRAFICO CAPACITA TAMPONE -->
    <h2>3.3 Il Potere Tampone di Van Slyke ($\\beta$) e la Risoluzione Matematica del Massimo</h2>
    <p>
      Per quantificare rigorosamente la resistenza opposta dalla soluzione, Donald Van Slyke (1922) definì l'<strong>Indice di Capacità Tampone</strong> come la derivata prima della concentrazione di base forte aggiunta rispetto alla variazione infinitesima di $\\text{pH}$:
    </p>

    <div class="academic-callout callout-theorem">
      <p><strong>Teorema 3.1 (Formulazione Generale del Potere Tampone di Van Slyke):</strong></p>
      <div style="text-align: center; margin: 4px 0;">
        $$\\beta = \\frac{dC_b}{d\\text{pH}} = -\\frac{dC_a}{d\\text{pH}} = 2.303 \\left( [H^+] + [OH^-] + C_{\\text{tot}} \\cdot \\frac{K_a [H^+]}{(K_a + [H^+])^2} \\right) \\quad \\left[\\frac{\\text{mol}}{\\text{L} \\cdot \\text{pH}}\\right]$$
      </div>
      <p>
        <strong>Dimostrazione del Massimo:</strong> Nel range tampone $3.5 \\le \\text{pH} \\le 6.0$, i contributi di auto-tampone del solvente $[H^+]$ e $[OH^-]$ sono trascurabili. Il termine della coppia coniugata $f([H^+]) = \\frac{K_a [H^+]}{(K_a + [H^+])^2}$ raggiunge il suo massimo analitico imponendo $\\frac{d f}{d[H^+]} = 0$, la cui soluzione unica è $[H^+] = K_a \\implies \\mathbf{\\text{pH} = \\text{p}K_a}$.
      </p>
      <p>
        Sostituendo $[H^+] = K_a$, si ottiene il massimo teorico assoluto della capacità tampone:
      </p>
      <div style="text-align: center; margin: 4px 0;">
        $$\\beta_{\\max} = 2.303 \\cdot C_{\\text{tot}} \\cdot \\frac{K_a^2}{(2K_a)^2} = \\frac{2.303}{4}\\,C_{\\text{tot}} \\approx \\mathbf{0.576\\,C_{\\text{tot}}}$$
      </div>
    </div>

    <!-- GRAFICO 2: POTERE TAMPONE VAN SLYKE -->
    {{GRAPH_2_CAPACITY}}

    <p style="font-size: 11.5px; margin-top: 4px;">
      <strong>Dimostrazione Matematica dei Limiti $\\text{p}K_a \\pm 1$:</strong> Calcolando la funzione a $\\text{pH} = \\text{p}K_a \\pm 1$ ($[H^+] = 10\\,K_a$ oppure $[H^+] = 0.1\\,K_a$):
    </p>
    <div style="text-align: center; margin: 4px 0;">
      $$\\beta(\\text{p}K_a \\pm 1) = 2.303\\,C_{\\text{tot}} \\cdot \\frac{10}{(11)^2} = 2.303\\,C_{\\text{tot}} \\cdot 0.0826 \\approx \\mathbf{0.190\\,C_{\\text{tot}}} = \\mathbf{0.33\\,\\beta_{\\max}}$$
    </div>
    <p style="font-size: 11.5px;">
      Il grafico campionario vettoriale dimostra che ai bordi della finestra $\\text{p}K_a \\pm 1$, il potere tampone scende esattamente a <strong>un terzo</strong> del valore massimo. A $\\text{p}K_a \\pm 2$, $\\beta$ crolla a meno del $3.9\\%$, determinando la completa inutilità analitica del sistema.
    </p>

    <div class="page-break-section"></div>

    <!-- PAGINA 4: LIMITI OPERATIVI, INTERFERENZE E DOMANDE D'ESAME -->
    <h2>3.4 Limiti Operativi, Diluizione e Precipitazione di Idrossidi Metallici</h2>

    <div class="academic-callout callout-coherence">
      <p><strong>Analisi Critica: Effetto Diluizione e Concentrazione Minima:</strong></p>
      <ul>
        <li>
          <strong>Invarianza del $\\text{pH}$ alla diluizione:</strong> Dall'equazione di Henderson-Hasselbalch, $\\text{pH} = \\text{p}K_a + \\log(n_b / n_a)$. Poiché le moli delle specie coniugate non cambiano diluendo con acqua pura, il $\\text{pH}$ teorico rimane immutato.
        </li>
        <li>
          <strong>Decadimento Lineare di $\\beta$ con la Concentrazione:</strong> Dalla formula di Van Slyke, $\\beta_{\\max} = 0.576\\,C_{\\text{tot}}$. Se diluiamo una soluzione tampone da $0.1\\,\\text{M}$ a $0.01\\,\\text{M}$ ($1:10$), il $\\text{pH}$ resta invariato ma il potere tampone <strong>decade del $90\\%$</strong>! Una minima traccia di acido o base provocherà un'escursione violenta di $\\text{pH}$.
        </li>
      </ul>
    </div>

    <div class="academic-callout callout-warning">
      <p><strong>⚠️ Limite di Precipitazione di Idrossidi Metallici (Interferenza Analitica Critica):</strong></p>
      <p>
        Nei laboratori di Chimica Analitica (ad esempio nelle titolazioni complessometriche con EDTA di ioni metallici come $Mg^{2+}, Zn^{2+}, Fe^{3+}$), il tampone serve a mantenere costante il $\\text{pH}$ alcalino. Tuttavia, il $\\text{pH}$ del tampone fissa univocamente la concentrazione idrossilica:
      </p>
      <div style="text-align: center; margin: 4px 0;">
        $$[OH^-] = \\frac{K_w}{[H^+]} = 10^{\\text{pH} - 14}$$
      </div>
      <p>
        Se il prodotto ionico supera il prodotto di solubilità dell'idrossido ($[M^{n+}][OH^-]^n > K_{ps}$), l'idrossido metallico <strong>precipita irreversibilmente</strong> sotto forma di solido $M(OH)_n(s)$, sottraendo il metallo alla soluzione e distruggendo il tampone. Esiste quindi un <strong>$\\text{pH}$ limite massimo invalicabile</strong>:
      </p>
      <div style="text-align: center; margin: 4px 0;">
        $$\\text{pH}_{\\text{limite}} = 14 + \\frac{1}{n}\\log_{10}\\left(\\frac{K_{ps}}{[M^{n+}]}\\right)$$
      </div>
    </div>

    <h2>3.5 Domande Chiave d'Esame di Chimica Analitica</h2>

    <div class="academic-callout callout-exam">
      <p><strong>💡 Domanda 1: "Perché per tamponare a $\\text{pH} = 7.0$ non si usa acido acetico / acetato ad altissima concentrazione, ma si sceglie un tampone fosfato ($H_2PO_4^- / HPO_4^{2-}$ con $\\text{p}K_{a2} = 7.20$)?"</strong></p>
      <p>
        <strong>Risposta Modello:</strong> Per l'acido acetico ($\\text{p}K_a = 4.76$), un $\\text{pH} = 7.0$ dista $\\Delta \\text{pH} = 2.24$ unità dal $\\text{p}K_a$. A questo valore, il rapporto $[A^-]/[HA] = 10^{7.0 - 4.76} \\approx 174$, il che significa che l'acido indissociato $HA$ rappresenta meno dello $0.57\\%$ del totale. Dalla curva di Van Slyke, $\\beta$ è sceso a meno del $2\\%$ di $\\beta_{\\max}$. Anche portando $C_{\\text{tot}}$ a valori molto elevati, la soluzione non possiede riserva acida contro l'aggiunta di basi. Il sistema diidrogenofosfato/idrogenofosfato ha $\\text{p}K_{a2} = 7.20$, dista solo $0.20$ unità da $\\text{pH} = 7.0$, operando con oltre il $95\\%$ del suo massimo potere tampone.
      </p>
    </div>

    <div class="academic-callout callout-exam">
      <p><strong>💡 Domanda 2: "Qual è la relazione geometrica tra la curva di titolazione di un acido debole e la curva del potere tampone $\\beta(\\text{pH})$?"</strong></p>
      <p>
        <strong>Risposta Modello:</strong> La pendenza della curva di titolazione $\\frac{d\\text{pH}}{dV_b}$ è inversamente proporzionale alla capacità tampone: $\\frac{d\\text{pH}}{dV_b} = \\frac{1}{\\beta \\cdot V_{\\text{tot}}}$. Al punto di semi-neutralizzazione ($V_b = V_{eq}/2$, $\\text{pH} = \\text{p}K_a$), $\\beta$ raggiunge il suo massimo assoluto, per cui la curva di titolazione presenta un plateau orizzontale a pendenza minima. All'avvicinarsi del punto equivalente ($V_b \\to V_{eq}$), una specie si esaurisce, $\\beta \\to 0$, e la derivata diverge all'infinito generando la caratteristica impennata verticale del salto di $\\text{pH}$.
      </p>
    </div>
  `;

  // Compilazione formule MathJax
  console.log('📐 Compilazione formule matematiche LaTeX con MathJax SVG...');
  const renderedMath = renderMathJax(rawChapterContent);

  // Iniezione dei due grafici D3 all'interno dei rispettivi placeholder
  let finalChapterHtml = renderedMath.html.replace('{{GRAPH_1_SPECIATION}}', htmlGraphSpeciation);
  finalChapterHtml = finalChapterHtml.replace('{{GRAPH_2_CAPACITY}}', htmlGraphCapacity);

  // Assemblaggio HTML completo
  const docTitle = 'Equilibri Acido-Base: Soluzioni Tampone e Capacità Tampone di Van Slyke';
  const docSubject = 'Fondamenti di Chimica Analitica — Prof. Salvatore, Filippelli, Michela';
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
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.25;
      margin: 20px 0 14px 0;
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
    .callout-warning { border-left: 4px solid #dc2626; background: #fef2f2; color: #991b1b; }
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
      margin: 8px auto 10px auto !important;
      padding: 10px 14px 8px 14px !important;
      max-width: 580px !important;
    }
    .academic-graph-container .academic-graph-svg {
      max-height: 250px !important;
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
    <div class="frontespizio-subtitle">Dispensa accademica con derivazioni integrali e dimostrazioni grafiche deterministiche</div>
    <div class="frontespizio-meta-box">
      <div class="frontespizio-meta-row">
        <span class="frontespizio-meta-label">Materia:</span>
        <span class="frontespizio-meta-val">${docSubject}</span>
      </div>
      <div class="frontespizio-meta-row">
        <span class="frontespizio-meta-label">Metodo didattico:</span>
        <span class="frontespizio-meta-val">Derivazione termodinamica + Limiti analitici + Verifica grafica D3.js</span>
      </div>
      <div class="frontespizio-meta-row">
        <span class="frontespizio-meta-label">Motore Grafico:</span>
        <span class="frontespizio-meta-val">Visualization Engine V1 (D3.js deterministico, FORMULA-derived)</span>
      </div>
      <div class="frontespizio-meta-row">
        <span class="frontespizio-meta-label">Notazione:</span>
        <span class="frontespizio-meta-val">Standard IUPAC, Formule LaTeX vettoriali MathJax SVG</span>
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

  // Avvio Puppeteer ed esportazione in PDF e PNG
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

    // Attesa rendering dei due grafici D3
    await page.waitForSelector('.academic-graph-rendered', { timeout: 10000 });
    console.log('✅ Grafici D3 renderizzati con successo nel DOM!');

    try {
      await page.evaluateHandle('document.fonts.ready');
    } catch (e) {}

    // Cartella di destinazione "esempi"
    const workspaceRoot = path.resolve(__dirname, '..', '..');
    const targetDir = path.join(workspaceRoot, 'esempi');
    await fs.ensureDir(targetDir);

    // Screenshot di ciascun grafico
    const graphElements = await page.$$('.academic-graph-container');
    if (graphElements[0]) {
      const p1 = path.join(targetDir, 'grafico_distribuzione_specie_tampone.png');
      await graphElements[0].screenshot({ path: p1 });
      console.log(`🖼️ Grafico Speziazione salvato in: ${p1}`);
    }
    if (graphElements[1]) {
      const p2 = path.join(targetDir, 'grafico_potere_tampone_van_slyke.png');
      await graphElements[1].screenshot({ path: p2 });
      console.log(`🖼️ Grafico Potere Tampone salvato in: ${p2}`);
    }

    // Screenshot completo dell'intera dispensa
    const fullpageImgPath = path.join(targetDir, 'anteprima_chimica_tamponi_completa.png');
    await page.screenshot({
      path: fullpageImgPath,
      fullPage: true
    });
    console.log(`📸 Anteprima visiva completa salvata in: ${fullpageImgPath}`);

    // Generazione del PDF A4
    const pdfFilename = 'Esempio_Chimica_Analitica_Tamponi.pdf';
    const pdfOutputPath = path.join(targetDir, pdfFilename);

    console.log('📄 Generazione PDF A4 con layout accademico...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '18mm',
        bottom: '18mm',
        left: '16mm',
        right: '16mm'
      },
      preferCSSPageSize: true
    });

    await fs.writeFile(pdfOutputPath, pdfBuffer);
    console.log(`🎉 PDF generato con successo (${pdfBuffer.length} bytes):`);
    console.log(`   👉 ${pdfOutputPath}`);

    return {
      pdfPath: pdfOutputPath,
      sizeBytes: pdfBuffer.length
    };
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  generateChemistrySamplePdf()
    .then(res => {
      console.log('\n=======================================================');
      console.log('✨ DISPENSA DI CHIMICA ANALITICA GENERATA CON SUCCESSO');
      console.log(`📄 PDF: ${res.pdfPath} (${(res.sizeBytes / 1024).toFixed(1)} KB)`);
      console.log('=======================================================\n');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Errore durante la generazione:', err);
      process.exit(1);
    });
}

module.exports = { generateChemistrySamplePdf };
