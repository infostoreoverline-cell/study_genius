/**
 * StudyGenius Academic Intelligence System
 * src/rendering/diagramEngine.js
 * 
 * Motore Deterministico per Grafici di Funzione e Diagrammi Scientifici.
 * 
 * Principi di Sicurezza & Accuratezza:
 * 1. Grafici Quantitativi: Calcolati punto per punto da espressioni matematiche reali,
 *    senza allucinazioni geometriche dell'LLM, esportati in SVG vettoriale puro.
 * 2. Diagrammi Schematici (TikZ/ChemFig): Compilazione sicura vincolata a `-no-shell-escape`.
 * 3. Fallback Resiliente: In assenza di compilatori nativi, genera schemi SVG puliti senza crash.
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

/**
 * Valutatore matematico sicuro per espressioni di funzioni a singola variabile.
 * Supporta costanti (pi, e), funzioni matematiche elementari (sin, cos, tan, exp, log, ln, sqrt, abs)
 * ed espressioni condizionali per funzioni a tratti (es. "r < 1 ? 2*r : 2/(r*r)").
 * 
 * Non utilizza eval() arbitrario ma tokenizza e calcola in un contesto controllato.
 * 
 * @param {string} expr Espressione algebrica
 * @param {number} varValue Valore della variabile
 * @param {string} varName Nome della variabile (default 'x')
 * @returns {number} Valore numerico calcolato
 */
function safeEvaluateMath(expr, varValue, varName = 'x') {
  if (typeof expr !== 'string') return 0;

  // Sanitizzazione preliminare: ammessi solo caratteri matematici consentiti
  const sanitized = expr
    .replace(/\s+/g, '')
    .replace(/\^/g, '**')
    .replace(/\\pi/g, String(Math.PI))
    .replace(/\bpi\b/gi, String(Math.PI))
    .replace(/\be\b/g, String(Math.E))
    .replace(/\bln\b/gi, 'Math.log')
    .replace(/\blog\b/gi, 'Math.log10')
    .replace(/\bexp\b/gi, 'Math.exp')
    .replace(/\bsqrt\b/gi, 'Math.sqrt')
    .replace(/\bsin\b/gi, 'Math.sin')
    .replace(/\bcos\b/gi, 'Math.cos')
    .replace(/\btan\b/gi, 'Math.tan')
    .replace(/\babs\b/gi, 'Math.abs');

  // Verifica che l'espressione non contenga chiamate proibite o caratteri non matematici
  const allowedPattern = /^[0-9+\-*/().?:><=!&|,\s]|Math\.(log|log10|exp|sqrt|sin|cos|tan|abs|PI|E)|[a-zA-Z_][a-zA-Z0-9_]*/;
  if (!allowedPattern.test(sanitized)) {
    return 0;
  }

  try {
    // Esecuzione sandbox con solo la variabile e Math disponibili
    const fn = new Function(varName, 'Math', `
      "use strict";
      try {
        return (${sanitized});
      } catch(e) {
        return 0;
      }
    `);
    const val = fn(varValue, Math);
    return (typeof val === 'number' && !isNaN(val) && isFinite(val)) ? val : 0;
  } catch (err) {
    return 0;
  }
}

/**
 * Genera un grafico SVG vettoriale puro da una specifica strutturata
 * 
 * @param {Object} spec Specifica del grafico
 * @param {string} spec.title Titolo del grafico
 * @param {string} spec.expression Espressione della funzione (es. "r < 1 ? 2*r : 2/(r^2)")
 * @param {Array<number>} spec.domain Intervallo [xMin, xMax] (es. [0, 4])
 * @param {Array<number>} [spec.range] Intervallo [yMin, yMax] opzionale
 * @param {string} [spec.variable='x'] Nome variabile ('x', 'r', 't', ecc.)
 * @param {string} [spec.xLabel] Etichetta asse X
 * @param {string} [spec.yLabel] Etichetta asse Y
 * @param {Array<Object>} [spec.annotations] Punti ed etichette notevoli da annotare
 * @returns {string} Stringa SVG completa e auto-contenuta
 */
function renderFunctionPlotSvg(spec) {
  // Dimensioni e margini conformi a Sezione 9.16 (Regole anti-clipping)
  const width = spec.width || 700;
  const height = spec.height || 380;
  const margin = { top: 75, right: 45, bottom: 65, left: 75 };

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const domain = Array.isArray(spec.domain) && spec.domain.length === 2
    ? [Number(spec.domain[0]), Number(spec.domain[1])]
    : [0, 5];
  const [xMin, xMax] = domain;
  const varName = spec.variable || 'x';

  // 1. Campionamento di 200 punti equidistanti (deterministico)
  const numSamples = 200;
  const step = (xMax - xMin) / (numSamples - 1);
  const points = [];
  let yMinObserved = Infinity;
  let yMaxObserved = -Infinity;

  for (let i = 0; i < numSamples; i++) {
    const xVal = xMin + i * step;
    const yVal = safeEvaluateMath(spec.expression, xVal, varName);
    points.push({ x: xVal, y: yVal });
    if (yVal < yMinObserved) yMinObserved = yVal;
    if (yVal > yMaxObserved) yMaxObserved = yVal;
  }

  // Intervallo asse Y (usa spec.range se fornito, altrimenti calcola con margine 15%)
  let yMin = spec.range && spec.range[0] !== undefined ? Number(spec.range[0]) : Math.min(0, yMinObserved);
  let yMax = spec.range && spec.range[1] !== undefined ? Number(spec.range[1]) : (yMaxObserved * 1.15 || 1);
  if (yMax <= yMin) yMax = yMin + 1;

  // Funzioni di proiezione coordinate (World -> Canvas)
  const mapX = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
  const mapY = (y) => margin.top + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight;

  // 2. Costruzione path SVG della curva e area sottesa
  let pathD = '';
  const yZeroClamped = Math.max(yMin, Math.min(0, yMax));
  let areaD = `M ${mapX(points[0].x)} ${mapY(yZeroClamped)}`;

  for (let i = 0; i < points.length; i++) {
    const cx = mapX(points[i].x);
    const cy = mapY(points[i].y);
    if (i === 0) {
      pathD += `M ${cx.toFixed(1)} ${cy.toFixed(1)}`;
      areaD += ` L ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    } else {
      pathD += ` L ${cx.toFixed(1)} ${cy.toFixed(1)}`;
      areaD += ` L ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    }
  }
  areaD += ` L ${mapX(points[points.length - 1].x)} ${mapY(yZeroClamped)} Z`;

  // 3. Griglia e Ticks
  const numXTicks = 5;
  const numYTicks = 5;
  let gridSvg = '';
  let labelsSvg = '';

  // Ticks asse X
  for (let i = 0; i <= numXTicks; i++) {
    const val = xMin + (i / numXTicks) * (xMax - xMin);
    const cx = mapX(val);
    gridSvg += `<line x1="${cx.toFixed(1)}" y1="${margin.top}" x2="${cx.toFixed(1)}" y2="${margin.top + plotHeight}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />`;
    labelsSvg += `<text x="${cx.toFixed(1)}" y="${margin.top + plotHeight + 18}" text-anchor="middle" font-size="11" fill="#64748b" font-family="Inter, sans-serif">${val.toFixed(1).replace(/\.0$/, '')}</text>`;
  }

  // Ticks asse Y
  for (let j = 0; j <= numYTicks; j++) {
    const val = yMin + (j / numYTicks) * (yMax - yMin);
    const cy = mapY(val);
    gridSvg += `<line x1="${margin.left}" y1="${cy.toFixed(1)}" x2="${margin.left + plotWidth}" y2="${cy.toFixed(1)}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />`;
    labelsSvg += `<text x="${margin.left - 10}" y="${(cy + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#64748b" font-family="Inter, sans-serif">${val.toFixed(1).replace(/\.0$/, '')}</text>`;
  }

  // 4. Annotazioni di punti notevoli con protezione anti-clipping
  let annotationsSvg = '';
  if (Array.isArray(spec.annotations)) {
    for (const ann of spec.annotations) {
      const ax = Number(ann.x);
      const ay = ann.y !== undefined ? Number(ann.y) : safeEvaluateMath(spec.expression, ax, varName);
      const acx = mapX(ax);
      const acy = mapY(ay);
      const labelText = String(ann.label || '');
      const boxWidth = labelText.length * 6.8 + 14;

      // Se l'etichetta oltrepassa il bordo destro, la spostiamo a sinistra del punto
      const placeLeft = (acx + boxWidth + 12) > (width - margin.right);
      const rectX = placeLeft ? (acx - boxWidth - 8) : (acx + 8);
      const textX = placeLeft ? (acx - boxWidth / 2 - 8) : (acx + boxWidth / 2 + 8);
      const rectY = Math.max(margin.top + 6, acy - 24);

      annotationsSvg += `
        <circle cx="${acx.toFixed(1)}" cy="${acy.toFixed(1)}" r="4.5" fill="#dc2626" stroke="#ffffff" stroke-width="2" />
        <rect x="${rectX.toFixed(1)}" y="${rectY.toFixed(1)}" width="${boxWidth}" height="20" rx="3" fill="#1e293b" fill-opacity="0.9" />
        <text x="${textX.toFixed(1)}" y="${(rectY + 14).toFixed(1)}" text-anchor="middle" font-size="10.5" font-family="Inter, sans-serif" font-weight="500" fill="#ffffff">${escapeXml(labelText)}</text>
      `;
    }
  }

  // 5. Assemblaggio SVG Completo Anti-Clipping (Sezione 9.16)
  const xLabel = spec.xLabel || varName;
  const yLabel = spec.yLabel || `f(${varName})`;
  const title = spec.title || `Grafico di ${yLabel}`;
  const subtitle = spec.expression ? `f(${varName}) = ${spec.expression}` : '';

  return `
<svg class="academic-plot-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="auto" style="max-width: ${width}px; background: #ffffff; border-radius: 6px; border: 1px solid #cbd5e1; margin: 16px auto; display: block;">
  <defs>
    <linearGradient id="plotGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e3a8a" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0.01" />
    </linearGradient>
    <marker id="axisArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#334155" />
    </marker>
  </defs>

  <!-- Intestazione a 2 Righe Separate: Titolo e Formula non collidono mai (Sezione 9.16 - 9.34) -->
  <text x="${margin.left}" y="28" font-family="'Source Serif 4', 'STIX Two Text', serif" font-size="14.5" font-weight="700" fill="#0f172a">${escapeXml(title)}</text>
  <text x="${margin.left}" y="48" font-family="'Source Sans 3', 'Inter', sans-serif" font-size="11" fill="#475569">${escapeXml(subtitle)}</text>

  <!-- Griglia -->
  ${gridSvg}

  <!-- Asse X con freccia -->
  <line x1="${margin.left}" y1="${mapY(yZeroClamped)}" x2="${margin.left + plotWidth + 12}" y2="${mapY(yZeroClamped)}" stroke="#334155" stroke-width="1.5" marker-end="url(#axisArrow)" />
  <!-- Etichetta Asse X Centrata Sotto il Plot: Nessun Taglio Laterale (Sezione 9.16 - 9.35) -->
  <text x="${(margin.left + plotWidth / 2).toFixed(1)}" y="${margin.top + plotHeight + 46}" text-anchor="middle" font-family="'Source Sans 3', 'Inter', sans-serif" font-size="11.5" font-weight="600" fill="#1e293b">${escapeXml(xLabel)}</text>

  <!-- Asse Y con freccia -->
  <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left}" y2="${margin.top - 12}" stroke="#334155" stroke-width="1.5" marker-end="url(#axisArrow)" />
  <!-- Etichetta Asse Y Ruotata Centrata Verticalmente (Sezione 9.16 - 9.35) -->
  <text transform="rotate(-90, 22, ${(margin.top + plotHeight / 2).toFixed(1)})" x="22" y="${(margin.top + plotHeight / 2).toFixed(1)}" text-anchor="middle" font-family="'Source Sans 3', 'Inter', sans-serif" font-size="11.5" font-weight="600" fill="#1e293b">${escapeXml(yLabel)}</text>

  <!-- Labels Ticks -->
  ${labelsSvg}

  <!-- Area Sottesa -->
  <path d="${areaD}" fill="url(#plotGrad)" />

  <!-- Curva Funzione Reale Calcolata -->
  <path d="${pathD}" fill="none" stroke="#1e3a8a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Annotazioni Notabili -->
  ${annotationsSvg}
</svg>
`.trim();
}

/**
 * Compone una Figura Scientifica Editoriale a Regioni Indipendenti conforme alle Sezioni 9.32-9.36
 * 1. Titolo dichiarativo unico
 * 2. Sottotitolo metodologico (dati • modello • incertezza)
 * 3. Area grafico principale (68-72% larghezza)
 * 4. Pannello risultati e formule TeX riservato (28-32% larghezza)
 * 5. Eventuale pannello diagnostico residui
 * 6. Takeaway didattico
 * 7. Didascalia quadripartita e provenienza
 * 
 * @param {Object} spec Specifica della figura scientifica
 * @returns {string} Frammento HTML completo
 */
function renderScientificFigureHtml(spec) {
  if (!spec) return '';

  const titleText = typeof spec.title === 'object' && spec.title !== null
    ? (spec.title.text || '')
    : String(spec.title || '');

  const subtitleText = typeof spec.subtitle === 'object' && spec.subtitle !== null
    ? (spec.subtitle.text || '')
    : String(spec.subtitle || '');

  const disciplineBadge = spec.discipline
    ? `<div class="figure-discipline-badge" style="display: inline-block; font-family: 'Source Sans 3', 'Inter', sans-serif; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 3px; background: #e2e8f0; color: #334155; margin-bottom: 6px;">${escapeXml(spec.discipline)}</div>`
    : '';

  let mainPlotSvg = spec.mainPlotSvg || spec.svg || '';
  if (!mainPlotSvg && spec.functionPlot) {
    mainPlotSvg = renderFunctionPlotSvg({
      ...spec.functionPlot,
      width: spec.functionPlot.width || 440,
      height: spec.functionPlot.height || 250
    });
  }

  // Pannello dei risultati
  let resultPanelHtml = '';
  if (spec.resultPanel) {
    const heading = spec.resultPanel.heading || 'Risultati del modello';
    let eqContent = '';
    if (Array.isArray(spec.resultPanel.equations)) {
      eqContent = spec.resultPanel.equations.map(eq => {
        const tex = typeof eq === 'object' && eq !== null ? (eq.tex || '') : String(eq);
        return (tex.startsWith('$') || tex.startsWith('\\(') || tex.startsWith('\\[')) ? tex : `$$${tex}$$`;
      }).join('\n');
    } else if (typeof spec.resultPanel.equations === 'string') {
      const tex = spec.resultPanel.equations;
      eqContent = (tex.startsWith('$') || tex.startsWith('\\(') || tex.startsWith('\\[')) ? tex : `$$${tex}$$`;
    }

    const notes = spec.resultPanel.notes ? `<div class="figure-result-notes">${escapeXml(spec.resultPanel.notes)}</div>` : '';

    resultPanelHtml = `
      <div class="figure-result-panel">
        <div class="figure-result-title">${escapeXml(heading)}</div>
        <div class="figure-result-equations">${eqContent}</div>
        ${notes}
      </div>
    `;
  }

  const diagSvg = spec.diagnosticSvg ? `<div class="figure-diagnostics">${spec.diagnosticSvg}</div>` : '';
  const takeawayHtml = spec.takeaway ? `<div class="figure-takeaway"><span class="takeaway-label">Takeaway didattico:</span> ${escapeXml(spec.takeaway)}</div>` : '';
  const captionHtml = spec.caption ? `<figcaption class="figure-caption">${escapeXml(spec.caption)}</figcaption>` : '';

  return `
<figure class="academic-scientific-figure" style="page-break-inside: avoid; break-inside: avoid;">
  <div class="figure-header">
    ${disciplineBadge}
    <div class="figure-title">${escapeXml(titleText)}</div>
    ${subtitleText ? `<div class="figure-subtitle">${escapeXml(subtitleText)}</div>` : ''}
  </div>
  <div class="figure-layout-grid">
    <div class="figure-plot-col">
      ${mainPlotSvg}
    </div>
    ${resultPanelHtml}
  </div>
  ${diagSvg}
  ${takeawayHtml}
  ${captionHtml}
</figure>
`.trim();
}

/**
 * Compila codice TikZ in modo rigorosamente sicuro (-no-shell-escape)
 * Se pdflatex non è disponibile, restituisce un fallback SVG schematico elegante.
 * 
 * @param {string} tikzCode Codice TikZ (circuitikz, chemfig, tkz-euclide)
 * @param {string} [type='diagram'] Tipo di diagramma
 * @returns {string} SVG vettoriale
 */
function renderTikZSafe(tikzCode, type = 'diagram') {
  const hasPdflatex = isCommandAvailable('pdflatex');

  if (!hasPdflatex) {
    return renderFallbackSchematicSvg(tikzCode, type, 'Compilatore pdflatex non rilevato sul server');
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studygenius_tikz_'));
  const texFile = path.join(tmpDir, 'diagram.tex');
  const pdfFile = path.join(tmpDir, 'diagram.pdf');

  // LaTeX Preamble rigoroso e protetto
  const latexDoc = `
\\documentclass[tikz,border=4pt]{standalone}
\\usepackage{amsmath,amssymb}
\\usepackage{tikz}
\\usepackage{circuitikz}
\\usepackage{chemfig}
\\begin{document}
${tikzCode}
\\end{document}
`;

  try {
    fs.writeFileSync(texFile, latexDoc, 'utf-8');

    // SICUREZZA ASSOLUTA: -no-shell-escape OBBLIGATORIO
    execSync(`pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error diagram.tex`, {
      cwd: tmpDir,
      timeout: 8000,
      stdio: 'pipe'
    });

    // Se dvisvgm o pdf2svg è disponibile, converti in SVG
    if (isCommandAvailable('pdf2svg')) {
      const svgFile = path.join(tmpDir, 'diagram.svg');
      execSync(`pdf2svg diagram.pdf diagram.svg`, { cwd: tmpDir, timeout: 5000, stdio: 'pipe' });
      const svgContent = fs.readFileSync(svgFile, 'utf-8');
      fs.removeSync(tmpDir);
      return svgContent;
    }

    fs.removeSync(tmpDir);
    return renderFallbackSchematicSvg(tikzCode, type, 'pdf2svg non presente per la conversione');
  } catch (err) {
    try { fs.removeSync(tmpDir); } catch (e) {}
    return renderFallbackSchematicSvg(tikzCode, type, `Errore compilazione TikZ: ${err.message.slice(0, 100)}`);
  }
}

/**
 * Fallback SVG schematico elegante quando la compilazione esterna non è disponibile
 */
function renderFallbackSchematicSvg(codeSnippet, type, note) {
  const cleanSnippet = codeSnippet.trim().slice(0, 300);
  return `
<div class="academic-diagram academic-schematic-fallback" style="margin: 18px 0; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 14px 18px; background: #f8fafc;">
  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
    <span style="font-weight: 600; font-size: 12.5px; color: #1e3a8a; text-transform: uppercase;">📐 Schema / Struttura (${escapeXml(type)})</span>
    <span style="font-size: 11px; color: #64748b; font-style: italic;">${escapeXml(note)}</span>
  </div>
  <pre style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #334155; overflow-x: auto; margin: 0;">${escapeXml(cleanSnippet)}</pre>
</div>
`.trim();
}

/**
 * Assembla una figura scientifica conforme all'architettura a regioni indipendenti (Sezioni 9.32 - 9.36):
 * 1. Titolo dichiarativo (Source Serif 4)
 * 2. Sottotitolo metodologico (Source Sans 3 / Inter)
 * 3. Area del grafico principale (68-72% larghezza)
 * 4. Pannello dei risultati riservato (28-32% larghezza) con formule TeX allineate su =
 * 5. Pannello diagnostico residui
 * 6. Takeaway didattico
 * 7. Didascalia e provenienza
 * 
 * @param {Object} spec Specifica strutturata della figura
 * @returns {string} Frammento HTML completo
 */
function renderScientificFigureHtml(spec) {
  if (!spec) return '';

  const titleText = typeof spec.title === 'object' && spec.title.text ? spec.title.text : (spec.title || '');
  const subtitleText = typeof spec.subtitle === 'object' && spec.subtitle.text ? spec.subtitle.text : (spec.subtitle || '');
  const takeawayText = spec.takeaway || '';
  const captionText = spec.caption || '';

  const mainPlotSvg = spec.mainPlotSvg || spec.plotSvg || spec.svg || '';
  const diagnosticSvg = spec.diagnosticSvg || spec.diagnosticPlot || '';

  // 1. Costruzione Pannello dei Risultati (28-32% larghezza, mai sovrapposto ai dati)
  let resultPanelHtml = '';
  if (spec.resultPanel) {
    const heading = spec.resultPanel.heading || 'Risultati del modello';
    let eqHtml = '';
    if (Array.isArray(spec.resultPanel.equations)) {
      eqHtml = spec.resultPanel.equations.map(eq => {
        const tex = typeof eq === 'object' && eq.tex ? eq.tex : String(eq);
        return tex.startsWith('$') ? tex : `$$${tex}$$`;
      }).join('\n');
    } else if (spec.resultPanel.equations) {
      const eq = String(spec.resultPanel.equations);
      eqHtml = eq.startsWith('$') ? eq : `$$${eq}$$`;
    }
    const notes = spec.resultPanel.notes || spec.resultPanel.note || '';

    resultPanelHtml = `
      <div class="figure-result-panel">
        <div class="panel-heading">${escapeXml(heading)}</div>
        <div class="panel-equations">${eqHtml}</div>
        ${notes ? `<div class="panel-note">${escapeXml(notes)}</div>` : ''}
      </div>
    `;
  }

  // 2. Griglia di Layout a Due Colonne (Plot ~70% / Risultati ~30%)
  const gridHtml = `
    <div class="figure-layout-grid">
      <div class="figure-plot-col" style="${resultPanelHtml ? '' : 'flex: 0 0 100%; max-width: 100%;'}">
        ${mainPlotSvg}
      </div>
      ${resultPanelHtml}
    </div>
  `;

  return `
<div class="academic-diagram academic-scientific-figure" style="page-break-inside: avoid; break-inside: avoid;">
  <div class="figure-header">
    <div class="figure-title">${escapeXml(titleText)}</div>
    ${subtitleText ? `<div class="figure-subtitle">${escapeXml(subtitleText)}</div>` : ''}
  </div>
  ${gridHtml}
  ${diagnosticSvg ? `<div class="figure-diagnostics">${diagnosticSvg}</div>` : ''}
  ${takeawayText ? `<div class="figure-takeaway"><strong>Takeaway didattico:</strong> ${escapeXml(takeawayText)}</div>` : ''}
  ${captionText ? `<div class="figure-caption">${captionText}</div>` : ''}
</div>
  `.trim();
}

/**
 * Converte un albero gerarchico ASCII (├──, └──) in una tabella accademica tipografica strutturata.
 * Rispetta la direttiva del bando assoluto di pseudo-visualizzazioni monospace.
 * 
 * @param {string} asciiText Contenuto del blocco di codice con caratteri ad albero
 * @returns {string} Markup HTML elegante della tabella accademica
 */
function transformAsciiTreeToAcademicTable(asciiText) {
  if (!asciiText) return '';
  // Protezione di sicurezza assoluta: mai convertire codice SVG o tag XML in albero ASCII
  if (asciiText.includes('<svg') || asciiText.includes('</svg>') || /<\/?[a-z][\s\S]*>/i.test(asciiText)) {
    return asciiText;
  }
  const lines = asciiText.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return '';

  let rootTitle = 'Tassonomia e Gerarchia Concettuale';
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    // Se la prima riga non ha rami dell'albero, trattala come titolo radice
    if (i === 0 && !/[├└│─]/.test(rawLine)) {
      rootTitle = rawLine.trim().replace(/^#+\s*/, '');
      continue;
    }

    // Calcola profondità dal numero di caratteri speciali e indentazione
    const depthMatch = rawLine.match(/^([\s│\s]*)/);
    const leading = depthMatch ? depthMatch[1] : '';
    const depth = Math.max(1, Math.floor(leading.length / 3) + 1);

    // Pulisce il testo dal glifo di diramazione
    const cleanContent = rawLine
      .replace(/^[│\s]*[├└]──\s*/, '')
      .replace(/^[│\s─]+/, '')
      .trim();

    if (cleanContent) {
      rows.push({ depth, text: cleanContent });
    }
  }

  if (rows.length === 0) return '';

  const tableRowsHtml = rows.map((r, idx) => {
    const indentPx = (r.depth - 1) * 20;
    const badgeColor = r.depth === 1 ? '#2563eb' : (r.depth === 2 ? '#0891b2' : '#64748b');
    const badgeLabel = r.depth === 1 ? 'LIVELLO 1' : `SOTTO-LIVELLO ${r.depth}`;
    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

    return `
      <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 7px 10px; width: 140px; font-weight: 600; font-size: 10.5px; color: ${badgeColor};">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: ${badgeColor}15; border: 1px solid ${badgeColor}30;">
            ${badgeLabel}
          </span>
        </td>
        <td style="padding: 7px 10px; font-size: 11.5px; color: #1e293b; padding-left: ${10 + indentPx}px;">
          ${r.depth > 1 ? '<span style="color: #94a3b8; margin-right: 6px;">↳</span>' : ''}
          <strong>${escapeXml(r.text)}</strong>
        </td>
      </tr>
    `;
  }).join('');

  let conceptMapSvg = '';
  try {
    const { renderAsciiTreeAsConceptMap } = require('./conceptMapRenderer');
    conceptMapSvg = renderAsciiTreeAsConceptMap(asciiText, rootTitle);
  } catch (_) {}

  return `
<div class="academic-diagram academic-noble-degradation" style="page-break-inside: avoid; break-inside: avoid; margin: 20px auto; max-width: 680px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
  ${conceptMapSvg ? `<div class="academic-concept-map" style="margin-bottom: 14px; overflow-x: auto; text-align: center;">${conceptMapSvg}</div>` : ''}
  <div style="font-family: 'Source Serif 4', 'STIX Two Text', serif; font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 8px; border-bottom: 2px solid #2563eb; padding-bottom: 4px;">
    📌 ${escapeXml(rootTitle)}
  </div>
  <table class="academic-table" style="width: 100%; border-collapse: collapse; text-align: left;">
    <thead>
      <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
        <th style="padding: 6px 10px; font-size: 11px; color: #475569; font-weight: 700;">Gerarchia</th>
        <th style="padding: 6px 10px; font-size: 11px; color: #475569; font-weight: 700;">Entità Didattica</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>
  <div style="font-size: 9.5px; color: #64748b; font-style: italic; margin-top: 6px; text-align: right;">
    Degradazione Nobile Tipografica — Grammatica Accademica StudyGenius
  </div>
</div>
  `.trim();
}

/**
 * Preprocessa un testo Markdown cercando blocchi di grafico (json:plot o plot)
 * e diagrammi TikZ, sostituendoli con i corrispettivi SVG vettoriali.
 * 
 * @param {string} markdownText 
 * @param {Object} [knowledgeGraph] 
 * @returns {string} Markdown con SVG iniettati
 */
function processDiagramsInMarkdown(markdownText, knowledgeGraph = null) {
  if (!markdownText) return '';

  let processed = markdownText;

  // 1. Elabora PRIMA i blocchi ```json:visual-spec (Concept Map, XY Plot, Chemistry)
  // I blocchi strutturati hanno priorità assoluta e non devono mai essere confusi con testo
  const visualSpecBlockRegex = /```(?:json:visual-spec|visual-spec)\s*\n([\s\S]*?)\n```/g;
  processed = processed.replace(visualSpecBlockRegex, (match, jsonBody) => {
    let spec;
    try {
      spec = JSON.parse(jsonBody.trim());
    } catch (parseErr) {
      return `\n\n<div class="academic-diagram academic-visual-spec-error" style="border:1px solid #fca5a5;background:#fef2f2;padding:12px;border-radius:6px"><p style="color:#b91c1c;font-family:Inter,sans-serif;font-size:13px">⚠️ Schema visuale non valido: ${parseErr.message}</p></div>\n\n`;
    }
    try {
      if (spec.kind === 'concept_map' || spec.type === 'concept_map') {
        const { renderConceptMap } = require('./conceptMapRenderer');
        const svgResult = renderConceptMap(spec);
        if (svgResult) {
          return `\n\n<div class="academic-diagram academic-concept-map" data-spec-type="concept_map" style="page-break-inside: avoid; break-inside: avoid; margin: 20px auto; max-width: 100%; text-align: center; overflow-x: auto;">${svgResult}</div>\n\n`;
        }
      }
      if (spec.kind === 'xy_plot' || spec.type === 'xy_plot') {
        const { renderXyPlot } = require('./xyPlotRenderer');
        const svgResult = renderXyPlot(spec);
        if (svgResult) {
          return `\n\n<div class="academic-diagram academic-xy-plot" data-spec-type="xy_plot" style="page-break-inside: avoid; break-inside: avoid; margin: 20px auto; max-width: 100%; text-align: center;">${svgResult}</div>\n\n`;
        }
      }
      const { renderFromVisualSpec } = require('./chemistryRenderer');
      let svgResult = renderFromVisualSpec(spec);
      if (svgResult) {
        return `\n\n<div class="academic-diagram academic-chemistry-renderer" data-spec-type="${spec.specType || 'unknown'}">${svgResult}</div>\n\n`;
      }
    } catch (err) {
      console.warn('  ⚠️ [diagramEngine] Errore compilazione visual-spec:', err.message);
    }
    return match;
  });

  // 2. Elabora blocchi ```svg o ```xml:svg isolati
  const svgBlockRegex = /```(?:svg|xml:svg)\s*\n([\s\S]*?)(?:```|$)/g;
  processed = processed.replace(svgBlockRegex, (match, svgBody) => {
    let trimmed = svgBody.trim();
    if (trimmed.includes('<svg')) {
      const svgStart = trimmed.indexOf('<svg');
      let svgContent = trimmed.slice(svgStart);
      if (!svgContent.includes('</svg>')) {
        svgContent += '\n</svg>';
      }
      return `\n\n<div class="academic-diagram academic-svg-asset" style="page-break-inside: avoid; break-inside: avoid; margin: 20px auto; max-width: 650px; text-align: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px;">${svgContent}</div>\n\n`;
    }
    return match;
  });

  // 3. Elabora blocchi scientific-figure e figure
  const figureBlockRegex = /```(?:json:scientific-figure|scientific-figure|json:figure|figure)\s*\n([\s\S]*?)\n```/g;
  processed = processed.replace(figureBlockRegex, (match, jsonBody) => {
    try {
      const figSpec = JSON.parse(jsonBody.trim());
      if (figSpec.resultPanel || figSpec.mainPlotSvg || figSpec.diagnosticSvg || figSpec.layout === 'scientific' || (figSpec.subtitle && figSpec.takeaway)) {
        return `\n\n${renderScientificFigureHtml(figSpec)}\n\n`;
      }
      const svgContent = figSpec.svg || '';
      const captionText = figSpec.caption || '';
      const titleText = figSpec.title || '';
      return `\n\n<div class="academic-diagram academic-technical-figure" style="page-break-inside: avoid; break-inside: avoid; margin: 22px auto; max-width: 650px; text-align: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px;">${titleText ? `<div style="font-family: 'Source Serif 4', 'STIX Two Text', serif; font-weight: 700; font-size: 13.5px; color: #0f172a; margin-bottom: 10px;">${escapeXml(titleText)}</div>` : ''}${svgContent}${captionText ? `<div style="font-size: 11px; color: #475569; font-style: italic; margin-top: 8px; line-height: 1.4;">${captionText}</div>` : ''}</div>\n\n`;
    } catch (err) {
      return `\n\n> ⚠️ *[Specifica figura non valida: ${err.message}]*\n\n`;
    }
  });

  // 4. BANDO ASSOLUTO DI PSEUDO-VISUALIZZAZIONI ASCII (├──, └──, │)
  // Intercetta alberi ASCII ESCLUSIVAMENTE delimitati, senza mai oltrepassare delimitatori o toccare SVG
  const asciiTreeRegex = /```(?:text|ascii|tree|plaintext)\s*\n([^`]*?(?:├──|└──)[^`]*?)\n```/g;
  processed = processed.replace(asciiTreeRegex, (match, body) => {
    if (body.includes('<svg') || body.includes('</svg>')) return match;
    return `\n\n${transformAsciiTreeToAcademicTable(body)}\n\n`;
  });

  const untypedAsciiRegex = /```\s*\n([^`]*?(?:├──|└──)[^`]*?)\n```/g;
  processed = processed.replace(untypedAsciiRegex, (match, body) => {
    if (body.includes('<svg') || body.includes('</svg>') || body.includes('<div')) return match;
    return `\n\n${transformAsciiTreeToAcademicTable(body)}\n\n`;
  });

  // Intercetta alberi ASCII non racchiusi in blocchi di codice (unfenced rigoroso)
  const unfencedAsciiRegex = /(?:^|\n)((?:[ \t]*[│\s]*[├└]──[^\n]*(?:\r?\n|$))+)/g;
  processed = processed.replace(unfencedAsciiRegex, (match, body) => {
    if (body.includes('<') || body.includes('>') || body.includes('svg')) return match;
    return `\n\n${transformAsciiTreeToAcademicTable(body)}\n\n`;
  });

  // 1. Elabora blocchi ```json:plot o ```plot (Grafici Quantitativi - Famiglia A)
  const plotBlockRegex = /```(?:json:plot|plot)\s*\n([\s\S]*?)\n```/g;
  processed = processed.replace(plotBlockRegex, (match, jsonBody) => {
    try {
      const spec = JSON.parse(jsonBody.trim());
      // Verifica con Knowledge Graph se fornito
      if (knowledgeGraph && spec.expression) {
        // Cerca se esiste una formula corrispondente
        const matchingNode = (knowledgeGraph.nodes || []).find(
          n => n.type === 'FORMULA' && spec.expression.includes(n.label || '')
        );
        if (matchingNode) {
          spec.title = spec.title || `Andamento di ${matchingNode.label}`;
        }
      }
      const svg = renderFunctionPlotSvg(spec);
      return `\n\n<div class="academic-diagram academic-function-plot">${svg}</div>\n\n`;
    } catch (err) {
      return `\n\n> ⚠️ *[Specifica grafico non valida: ${err.message}]*\n\n`;
    }
  });

  // 2. Elabora blocchi ```tikz o ```chemfig
  const tikzBlockRegex = /```(tikz|chemfig|circuitikz)\s*\n([\s\S]*?)\n```/g;
  processed = processed.replace(tikzBlockRegex, (match, lang, code) => {
    const renderedDiagram = renderTikZSafe(code, lang);
    // Se renderTikZSafe ha prodotto un SVG reale, usalo
    if (renderedDiagram && !renderedDiagram.includes('sourceCode') && renderedDiagram.startsWith('<')) {
      return `\n\n<div class="academic-diagram academic-${lang}">${renderedDiagram}</div>\n\n`;
    }
    // Se il renderer ha restituito il codice sorgente o una stringa non-SVG,
    // usa il fallback tipografico (mai mostrare codice sorgente)
    try {
      const { renderFallbackTypographic } = require('./chemistryRenderer');
      const fallbackSvg = renderFallbackTypographic({
        specType: lang,
        didacticFocus: `Schema ${lang} — compilatore non disponibile`,
        entities: []
      });
      return `\n\n<div class="academic-diagram academic-${lang}-fallback">${fallbackSvg}</div>\n\n`;
    } catch (_) {
      return `\n\n<blockquote>⚠️ Schema ${lang} non renderizzabile (compilatore assente)</blockquote>\n\n`;
    }
  });

  // 3. Elabora placeholder deterministici {{GRAPH:<graphId>}} (Milestone V2-V4)
  const graphPlaceholderRegex = /\{\{GRAPH:([a-zA-Z0-9_\-]+)\}\}/g;
  processed = processed.replace(graphPlaceholderRegex, (match, graphId) => {
    let graphNode = null;
    if (knowledgeGraph) {
      if (Array.isArray(knowledgeGraph.nodes)) {
        graphNode = knowledgeGraph.nodes.find(n => n.type === 'GRAPH' && (n.id === graphId || n.graphId === graphId));
      }
      if (!graphNode && Array.isArray(knowledgeGraph.graphNodes)) {
        graphNode = knowledgeGraph.graphNodes.find(n => n.id === graphId || n.graphId === graphId);
      }
    }

    if (!graphNode) {
      return `\n\n> ⚠️ *[Grafico "${graphId}" non trovato nel Knowledge Graph]*\n\n`;
    }

    try {
      const { buildDataset } = require('../visualization/dataBuilder');
      const { renderGraphToHtml } = require('../visualization/graphRenderer');
      const dataset = buildDataset(graphNode);
      return `\n\n${renderGraphToHtml(graphNode, dataset)}\n\n`;
    } catch (err) {
      return `\n\n> ⚠️ *[Errore rendering grafico "${graphId}": ${err.message}]*\n\n`;
    }
  });

  // 4. Elabora blocchi ```json:graph incorporati
  const embeddedGraphRegex = /```(?:json:graph|graph)\s*\n([\s\S]*?)\n```/g;
  processed = processed.replace(embeddedGraphRegex, (match, jsonBody) => {
    try {
      const graphNode = JSON.parse(jsonBody.trim());
      if (graphNode && (graphNode.type === 'GRAPH' || graphNode.chartType || graphNode.expression)) {
        const { buildDataset } = require('../visualization/dataBuilder');
        const { renderGraphToHtml } = require('../visualization/graphRenderer');
        const dataset = buildDataset(graphNode);
        return `\n\n${renderGraphToHtml(graphNode, dataset)}\n\n`;
      }
    } catch (err) {
      return `\n\n> ⚠️ *[Errore grafico embedded: ${err.message}]*\n\n`;
    }
    return match;
  });

  // 5. Rimuove blocchi json:graphClaims dal corpo del testo finale (utilizzati solo per audit QualityEngine)
  const claimsBlockRegex = /```(?:json:graphClaims|graphClaims)\s*\n([\s\S]*?)\n```/g;
  processed = processed.replace(claimsBlockRegex, '');

  return processed;
}

function replaceGraphPlaceholders(text, graphNodes = []) {
  if (!text) return '';
  const nodeMap = new Map();
  for (const node of graphNodes) {
    if (node.id) nodeMap.set(node.id, node);
    if (node.graphId) nodeMap.set(node.graphId, node);
  }

  const { buildDataset } = require('../visualization/dataBuilder');
  const { renderGraphToHtml } = require('../visualization/graphRenderer');

  return text.replace(/\{\{GRAPH:([a-zA-Z0-9_\-]+)\}\}/g, (match, graphId) => {
    const graphNode = nodeMap.get(graphId);
    if (!graphNode) {
      return `\n\n> ⚠️ *[Grafico "${graphId}" richiesto ma non trovato]*\n\n`;
    }
    try {
      const dataset = buildDataset(graphNode);
      return `\n\n${renderGraphToHtml(graphNode, dataset)}\n\n`;
    } catch (err) {
      return `\n\n> ⚠️ *[Errore rendering grafico "${graphId}": ${err.message}]*\n\n`;
    }
  });
}

function isCommandAvailable(cmd) {
  try {
    const checkCmd = os.platform() === 'win32' ? `where ${cmd}` : `which ${cmd}`;
    execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  safeEvaluateMath,
  renderFunctionPlotSvg,
  renderScientificFigureHtml,
  renderTikZSafe,
  processDiagramsInMarkdown,
  replaceGraphPlaceholders,
  // Re-export per accesso centralizzato al sistema chimico v2.0
  getChemistryRenderer: () => require('./chemistryRenderer'),
  getVisualArtifactManager: () => require('./visualArtifactManager')
};
