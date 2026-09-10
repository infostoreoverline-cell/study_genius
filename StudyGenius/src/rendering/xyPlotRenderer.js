/**
 * StudyGenius Academic Intelligence System
 * src/rendering/xyPlotRenderer.js
 *
 * Renderer deterministico per grafici XY con serie di dati pre-calcolate.
 * (kind: "xy_plot")
 *
 * Differenza chiave da diagramEngine.js:
 * - diagramEngine.js: prende un'ESPRESSIONE matematica e la campiona localmente
 * - xyPlotRenderer.js: prende SERIE DI DATI pre-calcolate (array di punti {x,y})
 *   come definite dallo schema VisualSpec v1.0 (markdown.md §8.1 §25.1)
 *
 * Specifica: 2.md §82 (Deterministic plots), 2.md §83 (Sampling),
 *            2.md §84 (Discontinuities), 2.md §85 (Important points),
 *            markdown.md §12 (Layout matematico), §25 (Esempio punto di lavoro).
 *
 * Supporta:
 * - Scale lineari e logaritmiche
 * - Gap nella serie (y: null = discontinuità)
 * - Annotazioni con marker
 * - Legenda automatica
 * - Multi-series
 */

'use strict';

const crypto = require('crypto');

// ─── Palette colori serie ─────────────────────────────────────────────────────
const SERIES_PALETTE = [
  '#2c6fad', // blu principale
  '#e84393', // rosa/magenta
  '#148f77', // verde acqua
  '#f39c12', // arancio
  '#7d3c98', // viola
  '#c0392b', // rosso
  '#1abc9c', // turchese
  '#e67e22', // arancio scuro
];

const THEME = {
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSize: { axis: 11, label: 12, title: 14, legend: 11, annotation: 10 },
  bgColor: '#ffffff',
  gridColor: '#e8ecf2',
  axisColor: '#2d3748',
  zeroLine: '#b0b8c8',
  annotationBg: '#f8f9fa',
  markerRadius: 4,
};

/**
 * Renderizza un grafico XY da VisualSpec v1.0 (kind: xy_plot).
 *
 * @param {Object} spec  VisualSpec (schema markdown.md §8.1)
 * @returns {string}     SVG string
 */
function renderXyPlot(spec) {
  const payload     = spec.payload || {};
  const xAxis       = payload.xAxis   || {};
  const yAxis       = payload.yAxis   || {};
  const series      = payload.series  || [];
  const annotations = payload.annotations || [];
  const title       = spec.title || '';

  if (series.length === 0) {
    throw new Error('[XyPlotRenderer] EMPTY_SERIES: nessuna serie di dati fornita.');
  }

  // ─ Dimensioni ───────────────────────────────────────────────────────────────
  const W = spec.width  || 680;
  const H = spec.height || 400;
  const margin = { top: 54, right: 28, bottom: 68, left: 64 };
  const plotW  = W - margin.left - margin.right;
  const plotH  = H - margin.top  - margin.bottom;

  // ─ Dominio ──────────────────────────────────────────────────────────────────
  const xDomain = _resolveDomain(xAxis.domain, series, 'x', xAxis.scale);
  const yDomain = _resolveDomain(yAxis.domain, series, 'y', yAxis.scale);
  const xScale  = xAxis.scale === 'log' ? 'log' : 'linear';
  const yScale  = yAxis.scale === 'log' ? 'log' : 'linear';

  // Funzioni di trasformazione coordinate dati → coordinate SVG
  const toSvgX = (v) => _toSvgCoord(v, xDomain, plotW, xScale, false);
  const toSvgY = (v) => _toSvgCoord(v, yDomain, plotH, yScale, true);  // invertito

  // ─ Assi ─────────────────────────────────────────────────────────────────────
  const xTicks = _generateTicks(xDomain, xScale, 6);
  const yTicks = _generateTicks(yDomain, yScale, 5);

  // ─ Legenda ──────────────────────────────────────────────────────────────────
  const legendItems = series.filter(s => s.label);
  const legendH     = legendItems.length > 0 ? legendItems.length * 18 + 12 : 0;

  // ─ SVG output ───────────────────────────────────────────────────────────────
  const parts = [];
  const clipId = `clip-${_shortHash(spec.visualId || 'xy')}`;

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ` +
    `data-visual-id="${spec.visualId || ''}">`
  );
  parts.push(`  <title>${_esc(title || 'Grafico XY')}</title>`);
  parts.push(`  <rect width="${W}" height="${H}" fill="${THEME.bgColor}"/>`);

  // Clip path per le serie
  parts.push(
    `  <defs>` +
    `<clipPath id="${clipId}">` +
    `<rect x="0" y="0" width="${plotW}" height="${plotH}"/>` +
    `</clipPath></defs>`
  );

  // Titolo
  if (title) {
    parts.push(
      `  <text x="${W / 2}" y="22" text-anchor="middle" ` +
      `font-size="${THEME.fontSize.title}" font-family="${THEME.fontFamily}" ` +
      `font-weight="bold" fill="${THEME.axisColor}">${_esc(title)}</text>`
    );
  }

  // Gruppo plot
  parts.push(`  <g transform="translate(${margin.left},${margin.top})">`);

  // Griglia
  for (const t of yTicks) {
    const sy = toSvgY(t);
    if (sy < 0 || sy > plotH) continue;
    parts.push(
      `    <line x1="0" y1="${sy.toFixed(2)}" x2="${plotW}" y2="${sy.toFixed(2)}" ` +
      `stroke="${THEME.gridColor}" stroke-width="1"/>`
    );
  }
  for (const t of xTicks) {
    const sx = toSvgX(t);
    if (sx < 0 || sx > plotW) continue;
    parts.push(
      `    <line x1="${sx.toFixed(2)}" y1="0" x2="${sx.toFixed(2)}" y2="${plotH}" ` +
      `stroke="${THEME.gridColor}" stroke-width="1"/>`
    );
  }

  // Asse x=0 e y=0 se nel dominio
  if (xDomain[0] <= 0 && xDomain[1] >= 0) {
    const sx = toSvgX(0);
    parts.push(
      `    <line x1="${sx.toFixed(2)}" y1="0" x2="${sx.toFixed(2)}" y2="${plotH}" ` +
      `stroke="${THEME.zeroLine}" stroke-width="1.2" stroke-dasharray="4 3"/>`
    );
  }
  if (yDomain[0] <= 0 && yDomain[1] >= 0) {
    const sy = toSvgY(0);
    parts.push(
      `    <line x1="0" y1="${sy.toFixed(2)}" x2="${plotW}" y2="${sy.toFixed(2)}" ` +
      `stroke="${THEME.zeroLine}" stroke-width="1.2" stroke-dasharray="4 3"/>`
    );
  }

  // Serie (con clip)
  parts.push(`    <g clip-path="url(#${clipId})">`);
  series.forEach((s, idx) => {
    const color  = SERIES_PALETTE[idx % SERIES_PALETTE.length];
    const label  = _seriesLabel(s.label);
    const points = (s.points || []).filter(p =>
      p !== null && typeof p.x === 'number' && isFinite(p.x)
    );

    // Segmenti (gestione gap: y === null)
    const pathParts = [];
    let inGap = true;
    for (const pt of points) {
      if (pt.y === null || pt.y === undefined || !isFinite(pt.y)) {
        inGap = true;
        continue;
      }
      const sx = toSvgX(pt.x).toFixed(2);
      const sy = toSvgY(pt.y).toFixed(2);
      if (inGap) {
        pathParts.push(`M ${sx} ${sy}`);
        inGap = false;
      } else {
        pathParts.push(`L ${sx} ${sy}`);
      }
    }

    if (pathParts.length > 0) {
      parts.push(
        `      <path d="${pathParts.join(' ')}" fill="none" ` +
        `stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ` +
        `data-series="${_esc(s.id || '')}"/>`
      );
    }
  });
  parts.push(`    </g>`);  // fine clip group

  // Annotazioni (punti notevoli)
  for (const ann of annotations) {
    if (typeof ann.x !== 'number' || typeof ann.y !== 'number') continue;
    const sx = toSvgX(ann.x);
    const sy = toSvgY(ann.y);
    if (sx < -10 || sx > plotW + 10 || sy < -10 || sy > plotH + 10) continue;

    const annLabel = _seriesLabel(ann.label);

    // Crosshair linee tratteggiate al punto
    parts.push(
      `    <line x1="${sx.toFixed(2)}" y1="${sy.toFixed(2)}" x2="${sx.toFixed(2)}" y2="${plotH}" ` +
      `stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>`,
      `    <line x1="0" y1="${sy.toFixed(2)}" x2="${sx.toFixed(2)}" y2="${sy.toFixed(2)}" ` +
      `stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>`
    );

    // Marker punto
    parts.push(
      `    <circle cx="${sx.toFixed(2)}" cy="${sy.toFixed(2)}" r="${THEME.markerRadius + 1}" ` +
      `fill="white" stroke="#374151" stroke-width="1.5"/>`
    );

    // Label annotazione
    if (annLabel) {
      const lx = sx + 8;
      const ly = sy - 8;
      parts.push(
        `    <text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" ` +
        `font-size="${THEME.fontSize.annotation}" font-family="${THEME.fontFamily}" ` +
        `fill="#374151">${_esc(annLabel)}</text>`
      );
    }
  }

  // Assi SVG (bordi)
  parts.push(
    `    <line x1="0" y1="${plotH}" x2="${plotW}" y2="${plotH}" stroke="${THEME.axisColor}" stroke-width="1.8"/>`,
    `    <line x1="0" y1="0" x2="0" y2="${plotH}" stroke="${THEME.axisColor}" stroke-width="1.8"/>`
  );

  // Tick labels X
  for (const t of xTicks) {
    const sx = toSvgX(t);
    if (sx < 0 || sx > plotW) continue;
    parts.push(
      `    <line x1="${sx.toFixed(2)}" y1="${plotH}" x2="${sx.toFixed(2)}" y2="${(plotH + 5).toFixed(2)}" ` +
      `stroke="${THEME.axisColor}" stroke-width="1.2"/>`,
      `    <text x="${sx.toFixed(2)}" y="${(plotH + 18).toFixed(2)}" ` +
      `text-anchor="middle" font-size="${THEME.fontSize.axis}" font-family="${THEME.fontFamily}" ` +
      `fill="${THEME.axisColor}">${_formatTick(t)}</text>`
    );
  }

  // Tick labels Y
  for (const t of yTicks) {
    const sy = toSvgY(t);
    if (sy < 0 || sy > plotH) continue;
    parts.push(
      `    <line x1="-5" y1="${sy.toFixed(2)}" x2="0" y2="${sy.toFixed(2)}" ` +
      `stroke="${THEME.axisColor}" stroke-width="1.2"/>`,
      `    <text x="-10" y="${(sy + 4).toFixed(2)}" ` +
      `text-anchor="end" font-size="${THEME.fontSize.axis}" font-family="${THEME.fontFamily}" ` +
      `fill="${THEME.axisColor}">${_formatTick(t)}</text>`
    );
  }

  // Label assi
  const xLabelText = _axisLabel(xAxis.label) + (xAxis.unit ? ` [${xAxis.unit}]` : '');
  const yLabelText = _axisLabel(yAxis.label) + (yAxis.unit ? ` [${yAxis.unit}]` : '');

  if (xLabelText.trim()) {
    parts.push(
      `    <text x="${(plotW / 2).toFixed(2)}" y="${(plotH + 46).toFixed(2)}" ` +
      `text-anchor="middle" font-size="${THEME.fontSize.label}" font-family="${THEME.fontFamily}" ` +
      `font-weight="bold" fill="${THEME.axisColor}">${_esc(xLabelText)}</text>`
    );
  }
  if (yLabelText.trim()) {
    parts.push(
      `    <text transform="rotate(-90)" x="${(-plotH / 2).toFixed(2)}" y="-46" ` +
      `text-anchor="middle" font-size="${THEME.fontSize.label}" font-family="${THEME.fontFamily}" ` +
      `font-weight="bold" fill="${THEME.axisColor}">${_esc(yLabelText)}</text>`
    );
  }

  // Legenda
  if (legendItems.length > 0) {
    const legX = plotW - 160;
    const legY = 6;
    parts.push(
      `    <rect x="${legX - 6}" y="${legY - 4}" width="160" height="${legendH}" ` +
      `fill="white" fill-opacity="0.9" stroke="${THEME.gridColor}" stroke-width="1" rx="4"/>`
    );
    legendItems.forEach((s, idx) => {
      const color = SERIES_PALETTE[idx % SERIES_PALETTE.length];
      const lbl   = _seriesLabel(s.label);
      const ly    = legY + idx * 18 + 12;
      parts.push(
        `    <line x1="${legX}" y1="${ly - 4}" x2="${legX + 20}" y2="${ly - 4}" ` +
        `stroke="${color}" stroke-width="2.2"/>`,
        `    <text x="${legX + 26}" y="${ly}" font-size="${THEME.fontSize.legend}" ` +
        `font-family="${THEME.fontFamily}" fill="${THEME.axisColor}">${_esc(lbl)}</text>`
      );
    });
  }

  parts.push(`  </g>`);  // fine g plot
  parts.push('</svg>');
  return parts.join('\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _resolveDomain(specDomain, series, axis, scale) {
  if (Array.isArray(specDomain) && specDomain.length === 2 &&
      isFinite(specDomain[0]) && isFinite(specDomain[1]) &&
      specDomain[0] < specDomain[1]) {
    return specDomain;
  }
  // Auto-detect
  let min = Infinity, max = -Infinity;
  for (const s of series) {
    for (const pt of (s.points || [])) {
      if (pt === null) continue;
      const v = pt[axis];
      if (typeof v === 'number' && isFinite(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }
  if (!isFinite(min)) { min = 0; max = 1; }
  if (min === max)    { min -= 1; max += 1; }
  const pad = (max - min) * 0.05;
  return [min - pad, max + pad];
}

function _toSvgCoord(value, domain, size, scale, invert) {
  let t;
  if (scale === 'log') {
    const logMin = Math.log10(Math.max(domain[0], 1e-10));
    const logMax = Math.log10(Math.max(domain[1], 1e-10));
    t = (Math.log10(Math.max(value, 1e-10)) - logMin) / (logMax - logMin);
  } else {
    t = (value - domain[0]) / (domain[1] - domain[0]);
  }
  return invert ? size * (1 - t) : size * t;
}

function _generateTicks(domain, scale, count) {
  const [min, max] = domain;
  if (scale === 'log') {
    const ticks = [];
    const logMin = Math.ceil(Math.log10(Math.max(min, 1e-10)));
    const logMax = Math.floor(Math.log10(Math.max(max, 1e-10)));
    for (let e = logMin; e <= logMax; e++) ticks.push(Math.pow(10, e));
    return ticks;
  }
  const step  = _niceStep((max - min) / (count - 1));
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.01; v += step) {
    ticks.push(parseFloat(v.toPrecision(10)));
    if (ticks.length >= count + 2) break;
  }
  return ticks;
}

function _niceStep(rawStep) {
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  if (norm < 1.5) return mag;
  if (norm < 3)   return 2 * mag;
  if (norm < 7)   return 5 * mag;
  return 10 * mag;
}

function _formatTick(v) {
  if (Math.abs(v) >= 1e6 || (Math.abs(v) < 0.01 && v !== 0)) {
    return v.toExponential(1);
  }
  const s = parseFloat(v.toPrecision(4));
  return String(s);
}

function _axisLabel(label) {
  if (!label) return '';
  if (Array.isArray(label)) return label.map(seg => seg.value || '').join('');
  return String(label);
}

function _seriesLabel(label) {
  if (!label) return '';
  if (Array.isArray(label)) return label.map(seg => seg.value || '').join('');
  return String(label);
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _shortHash(str) {
  return crypto.createHash('md5').update(str).digest('hex').slice(0, 6);
}

module.exports = {
  renderXyPlot,
};
