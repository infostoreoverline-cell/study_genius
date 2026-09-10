/**
 * StudyGenius Academic Intelligence System
 * src/visualization/graphRenderer.js
 * 
 * Motore di rendering SVG basato su D3.js (primitive toolkit: scale, assi, curve)
 * eseguito lato client in HTML prima dello snapshot Puppeteer in PDF.
 * 
 * Rispetta rigorosamente i requisiti architetturali:
 * - Nessuna geometria SVG calcolata a mano
 * - D3.js usato come primitive toolkit, NON come libreria preimpostata
 * - Variabili CSS condivise con MathJax e il design system accademico
 * - Indicazione obbligatoria ed esplicita della provenienza (FORMULA-derived)
 */

const fs = require('fs');
const path = require('path');

// Percorso al bundle locale precompilato di D3.js (zero dipendenze di rete esterne)
const D3_BUNDLE_PATH = path.resolve(__dirname, '../../node_modules/d3/dist/d3.min.js');

let cachedD3Script = null;
function getD3BundleScript() {
  if (!cachedD3Script) {
    if (fs.existsSync(D3_BUNDLE_PATH)) {
      cachedD3Script = fs.readFileSync(D3_BUNDLE_PATH, 'utf-8');
    } else {
      cachedD3Script = '/* D3.js non trovato nel percorso locale node_modules/d3/dist/d3.min.js */';
    }
  }
  return cachedD3Script;
}

/**
 * CSS accademico condiviso con MathJax per styling armonizzato di assi, testi e curve.
 */
const ACADEMIC_GRAPH_CSS = `
:root {
  --academic-math-font: 'STIX Two Text', 'Times New Roman', 'Cambria', Georgia, serif;
  --academic-mono-font: 'JetBrains Mono', monospace;
  --academic-font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --academic-text-primary: #0f172a;
  --academic-text-secondary: #475569;
  --academic-curve-stroke: #1e3a8a;
  --academic-axis-stroke: #334155;
  --academic-grid-stroke: #e2e8f0;
  --academic-annotation-color: #dc2626;
  --academic-annotation-bg: rgba(15, 23, 42, 0.90);
}

.academic-graph-container {
  margin: 22px auto;
  text-align: center;
  page-break-inside: avoid;
  break-inside: avoid;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 16px 20px 14px 20px;
  max-width: 680px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.academic-graph-svg {
  display: block;
  margin: 0 auto;
  overflow: visible;
  font-family: var(--academic-math-font);
}

.academic-graph-svg .axis text {
  font-family: var(--academic-math-font);
  font-size: 11.5px;
  fill: var(--academic-text-primary);
}

.academic-graph-svg .axis line,
.academic-graph-svg .axis path.domain {
  stroke: var(--academic-axis-stroke);
  stroke-width: 1.25px;
}

.academic-graph-svg .grid line {
  stroke: var(--academic-grid-stroke);
  stroke-dasharray: 3, 3;
  stroke-opacity: 0.85;
}

.academic-graph-svg .grid path.domain {
  stroke-width: 0;
}

.academic-graph-svg .axis-label {
  font-family: var(--academic-math-font);
  font-size: 13px;
  font-weight: 600;
  fill: var(--academic-text-primary);
}

.academic-graph-svg .curve-path {
  fill: none;
  stroke: var(--academic-curve-stroke);
  stroke-width: 2.25px;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.academic-graph-svg .area-gradient {
  pointer-events: none;
}

.academic-graph-svg .annotation-guide {
  stroke: #94a3b8;
  stroke-width: 1px;
  stroke-dasharray: 3, 3;
}

.academic-graph-svg .annotation-circle {
  fill: var(--academic-annotation-color);
  stroke: #ffffff;
  stroke-width: 2px;
}

.academic-graph-svg .annotation-rect {
  fill: var(--academic-annotation-bg);
  rx: 3px;
  ry: 3px;
}

.academic-graph-svg .annotation-text {
  font-family: var(--academic-font-sans);
  font-size: 10px;
  font-weight: 500;
  fill: #ffffff;
  text-anchor: start;
}

.academic-graph-caption {
  margin-top: 10px;
  font-family: var(--academic-math-font);
  font-size: 12px;
  color: var(--academic-text-secondary);
  font-style: italic;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.academic-provenance-badge {
  display: inline-block;
  background: #eff6ff;
  color: #1e3a8a;
  border: 1px solid #bfdbfe;
  border-radius: 3px;
  font-family: var(--academic-font-sans);
  font-size: 9.5px;
  font-weight: 600;
  padding: 1px 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-style: normal;
}
`;

/**
 * Script D3 client-side eseguito dentro la pagina HTML Puppeteer per costruire l'SVG.
 */
const CLIENT_D3_RENDERER_FUNCTION = `
window.renderStudyGeniusGraph = function(dataPayload, containerId) {
  if (typeof d3 === 'undefined') {
    console.error('D3.js non disponibile nel contesto del browser');
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) return;

  const target = container.querySelector('.graph-render-target');
  if (!target) return;
  target.innerHTML = '';

  const { graphNode, dataset } = dataPayload;
  const points = dataset.points || [];
  if (points.length === 0) return;

  const width = 640;
  const height = 330;
  const margin = { top: 32, right: 35, bottom: 48, left: 62 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // 1. D3 Scales (Primitive Toolkit)
  const xDomain = [dataset.domain[0], dataset.domain[1]];
  const yObsMin = dataset.range[0];
  const yObsMax = dataset.range[1];
  const yMin = yObsMin >= 0 ? 0 : yObsMin * 1.05;
  const yMax = yObsMax > yMin ? yObsMax * 1.12 : yMin + 1;
  const yDomain = [yMin, yMax];

  const xScale = d3.scaleLinear().domain(xDomain).range([margin.left, width - margin.right]);
  const yScale = d3.scaleLinear().domain(yDomain).range([height - margin.bottom, margin.top]);

  // 2. Creazione SVG Vettoriale
  const svg = d3.select(target)
    .append('svg')
    .attr('class', 'academic-graph-svg')
    .attr('viewBox', \`0 0 \${width} \${height}\`)
    .attr('width', '100%')
    .attr('height', 'auto')
    .style('max-width', \`\${width}px\`);

  // Defs: gradiente area e freccia assi
  const defs = svg.append('defs');
  const grad = defs.append('linearGradient')
    .attr('id', \`plotGrad-\${containerId}\`)
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '0%').attr('y2', '100%');
  grad.append('stop').attr('offset', '0%').attr('stop-color', '#1e3a8a').attr('stop-opacity', 0.16);
  grad.append('stop').attr('offset', '100%').attr('stop-color', '#1e3a8a').attr('stop-opacity', 0.01);

  // Marker freccia assi
  defs.append('marker')
    .attr('id', \`arrow-\${containerId}\`)
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 6)
    .attr('refY', 5)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M 0 1.5 L 8 5 L 0 8.5 z')
    .attr('fill', '#334155');

  // 3. D3 Grid (Primitive Toolkit)
  const xGrid = d3.axisBottom(xScale).ticks(6).tickSize(-innerHeight).tickFormat('');
  const yGrid = d3.axisLeft(yScale).ticks(6).tickSize(-innerWidth).tickFormat('');

  svg.append('g')
    .attr('class', 'grid grid-x')
    .attr('transform', \`translate(0,\${height - margin.bottom})\`)
    .call(xGrid);

  svg.append('g')
    .attr('class', 'grid grid-y')
    .attr('transform', \`translate(\${margin.left},0)\`)
    .call(yGrid);

  // 4. Area Sottesa
  const areaGenerator = d3.area()
    .x(d => xScale(d.x))
    .y0(yScale(Math.max(0, yMin)))
    .y1(d => yScale(d.y))
    .curve(d3.curveLinear);

  svg.append('path')
    .datum(points)
    .attr('class', 'area-gradient')
    .attr('d', areaGenerator)
    .attr('fill', \`url(#plotGrad-\${containerId})\`);

  // 5. D3 Path Generator della Curva Matematica
  const lineGenerator = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y))
    .curve(d3.curveLinear);

  svg.append('path')
    .datum(points)
    .attr('class', 'curve-path')
    .attr('d', lineGenerator);

  // 6. D3 Axes (Primitive Toolkit)
  const formatTick = d => {
    if (Math.abs(d) >= 1000 || (Math.abs(d) > 0 && Math.abs(d) < 0.01)) {
      return d3.format('.1e')(d);
    }
    return d3.format('.2~f')(d);
  };

  const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(formatTick);
  const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(formatTick);

  const gX = svg.append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', \`translate(0,\${height - margin.bottom})\`)
    .call(xAxis);

  const gY = svg.append('g')
    .attr('class', 'axis axis-y')
    .attr('transform', \`translate(\${margin.left},0)\`)
    .call(yAxis);

  // Frecce sui terminali degli assi
  gX.select('.domain').attr('marker-end', \`url(#arrow-\${containerId})\`);
  gY.select('.domain').attr('marker-end', \`url(#arrow-\${containerId})\`);

  // Etichette assi
  const xUnitStr = dataset.xUnit ? \` [\${dataset.xUnit}]\` : '';
  const yUnitStr = dataset.yUnit ? \` [\${dataset.yUnit}]\` : '';

  svg.append('text')
    .attr('class', 'axis-label')
    .attr('x', width - margin.right + 10)
    .attr('y', height - margin.bottom + 4)
    .attr('text-anchor', 'start')
    .text(\`\${dataset.xLabel}\${xUnitStr}\`);

  svg.append('text')
    .attr('class', 'axis-label')
    .attr('x', margin.left)
    .attr('y', margin.top - 14)
    .attr('text-anchor', 'middle')
    .text(\`\${dataset.yLabel}\${yUnitStr}\`);

  // 7. Annotazioni Didattiche Vettoriali
  if (Array.isArray(dataset.annotations)) {
    for (const ann of dataset.annotations) {
      if (typeof ann.x !== 'number' || isNaN(ann.x)) continue;
      const ax = xScale(ann.x);
      const ay = typeof ann.y === 'number' && !isNaN(ann.y) ? yScale(ann.y) : yScale(0);

      // Linea guida tratteggiata verso l'asse X
      svg.append('line')
        .attr('class', 'annotation-guide')
        .attr('x1', ax).attr('y1', height - margin.bottom)
        .attr('x2', ax).attr('y2', ay);

      // Cerchio punto notevole
      svg.append('circle')
        .attr('class', 'annotation-circle')
        .attr('cx', ax)
        .attr('cy', ay)
        .attr('r', 4.5);

      // Badge etichetta
      if (ann.label) {
        const textLen = ann.label.length * 6.2 + 14;
        let rectX = ax + 8;
        let rectY = ay - 22;

        // Offset manuale se specificato nel nodo
        if (typeof ann.offsetY === 'number') {
          rectY += ann.offsetY;
        }

        // Allineamento etichetta
        if (ann.align === 'left') {
          rectX = ax - textLen - 8;
        } else if (ann.align === 'right') {
          rectX = ax + 8;
        } else {
          // Posizionamento predefinito con clamping sul bordo destro
          if (rectX + textLen > width - 12) {
            rectX = width - textLen - 12;
          }
        }

        // Salvaguardia margini
        if (rectX < margin.left) {
          rectX = margin.left + 4;
        }
        if (rectX + textLen > width - 4) {
          rectX = width - textLen - 4;
        }

        // Salvaguardia margine superiore
        if (rectY < margin.top - 10) {
          rectY = ay + 8;
        }

        svg.append('rect')
          .attr('class', 'annotation-rect')
          .attr('x', rectX)
          .attr('y', rectY)
          .attr('width', textLen)
          .attr('height', 18);

        svg.append('text')
          .attr('class', 'annotation-text')
          .attr('x', rectX + 7)
          .attr('y', rectY + 12.5)
          .text(ann.label);
      }
    }
  }

  // Segna il completamento del rendering nel DOM
  container.classList.add('academic-graph-rendered');
};
`;

/**
 * Genera il frammento HTML completo per incorporare un grafico nella pagina.
 * Include il contenitore, il placeholder, la didascalia con badge di provenienza
 * e lo script inline di inizializzazione D3.
 * 
 * @param {Object} graphNode 
 * @param {Object} dataset 
 * @param {string} [captionCustom] 
 * @returns {string} Frammento HTML
 */
function renderGraphToHtml(graphNode, dataset, captionCustom = null) {
  const containerId = `studygenius-graph-${graphNode.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const provenance = dataset.provenance || graphNode.provenance || 'FORMULA-derived';

  // Didascalia di provenienza leggibile (Sezione 6 del piano)
  let captionText = captionCustom;
  if (!captionText) {
    if (graphNode.relatedFormulaId) {
      captionText = `Curva teorica ottenuta dalla relazione matematica di riferimento (${graphNode.relatedFormulaId})`;
    } else {
      captionText = `Curva teorica ottenuta da relazione matematica formale`;
    }
  }

  const payloadJson = JSON.stringify({ graphNode, dataset }).replace(/</g, '\\u003c');

  return `
<figure class="academic-graph-container" id="${containerId}" data-graph-id="${graphNode.id}" data-provenance="${provenance}">
  <div class="graph-render-target"></div>
  <figcaption class="academic-graph-caption">
    <span class="academic-provenance-badge">${provenance}</span>
    <span class="caption-text">${escapeHtml(captionText)}</span>
  </figcaption>
  <script>
    (function() {
      const payload = ${payloadJson};
      if (typeof window.renderStudyGeniusGraph === 'function') {
        window.renderStudyGeniusGraph(payload, "${containerId}");
      } else {
        document.addEventListener('DOMContentLoaded', function() {
          if (typeof window.renderStudyGeniusGraph === 'function') {
            window.renderStudyGeniusGraph(payload, "${containerId}");
          }
        });
      }
    })();
  </script>
</figure>
`.trim();
}

/**
 * Restituisce i tag <style> e <script> necessari nel <head> del documento HTML
 * per supportare i grafici accademici deterministici.
 * 
 * @returns {string}
 */
function getGraphHeadAssets() {
  const d3Script = getD3BundleScript();
  return `
<style id="studygenius-graph-styles">
${ACADEMIC_GRAPH_CSS}
</style>
<script id="studygenius-d3-bundle">
${d3Script}
</script>
<script id="studygenius-graph-runtime">
${CLIENT_D3_RENDERER_FUNCTION}
</script>
`.trim();
}

/**
 * Helper per test o rendering headless statico con istanza Puppeteer.
 * Carica l'HTML in una pagina Puppeteer, attende il completamento del rendering D3
 * ed estrae il markup SVG generato.
 * 
 * @param {Object} page Istanza Page di Puppeteer
 * @param {Object} graphNode 
 * @param {Object} dataset 
 * @returns {Promise<{ svg: string, width: number, height: number }>}
 */
async function renderGraphToStaticSvg(page, graphNode, dataset) {
  const assets = getGraphHeadAssets();
  const graphHtml = renderGraphToHtml(graphNode, dataset);

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${assets}
</head>
<body style="background: #ffffff; margin: 0; padding: 20px;">
  ${graphHtml}
</body>
</html>`;

  await page.setJavaScriptEnabled(true);
  await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' });

  // Attende che D3 completi il rendering
  await page.waitForSelector('.academic-graph-rendered', { timeout: 10000 });

  const svgResult = await page.evaluate((graphId) => {
    const el = document.querySelector(`[data-graph-id="${graphId}"] svg`);
    if (!el) return null;
    return {
      svg: el.outerHTML,
      hasAxes: !!el.querySelector('.axis-x') && !!el.querySelector('.axis-y'),
      hasCurve: !!el.querySelector('.curve-path'),
      hasGrid: !!el.querySelector('.grid'),
      annotationCount: el.querySelectorAll('.annotation-circle').length,
      provenanceLabel: document.querySelector(`[data-graph-id="${graphId}"] .academic-provenance-badge`)?.textContent || ''
    };
  }, graphNode.id);

  return svgResult;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  renderGraphToHtml,
  getGraphHeadAssets,
  renderGraphToStaticSvg,
  ACADEMIC_GRAPH_CSS,
  CLIENT_D3_RENDERER_FUNCTION,
  getD3BundleScript
};
