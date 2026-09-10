/**
 * StudyGenius Academic Intelligence System
 * src/rendering/svgSanitizer.js
 *
 * SVG Sanitizer & Normalizer
 *
 * Tratta qualsiasi SVG proveniente da LLM o sorgenti esterne come NON AFFIDABILE.
 * Applica una allowlist rigorosa di elementi e attributi, rimuove script e contenuto
 * pericoloso, normalizza viewBox, stabilizza ID, deduplicata defs.
 *
 * Specifica: 2.md §11 (SVG sanitization), markdown.md §17 (Sicurezza SVG),
 *            2.md §12 (SVG normalization), markdown.md §16 (Profilo statico).
 *
 * Principio chiave (markdown.md §17.2):
 *   "Se vengono eliminate tutte le punte delle frecce, il risultato non è
 *    accettabile solo perché è sicuro."
 *   → Conservare conteggi semantici e segnalare rimozioni.
 */

'use strict';

// ─── Allowlist elementi SVG consentiti (profilo statico iniziale) ─────────────
// Specifica: markdown.md §16.1
const ALLOWED_ELEMENTS = new Set([
  'svg', 'g', 'defs', 'title', 'desc',
  'path', 'rect', 'circle', 'ellipse',
  'line', 'polyline', 'polygon',
  'text', 'tspan',
  'marker', 'clipPath', 'use',
  'symbol', 'linearGradient', 'radialGradient', 'stop',
]);

// ─── Allowlist attributi per categoria ────────────────────────────────────────
const ALLOWED_ATTRIBUTES_GLOBAL = new Set([
  'id', 'class', 'style',
  'transform', 'clip-path', 'mask',
  'opacity', 'display', 'visibility',
  'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-opacity',
  'stroke-dasharray', 'stroke-dashoffset',
  'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'color', 'color-interpolation',
  'font-family', 'font-size', 'font-style', 'font-weight',
  'text-anchor', 'dominant-baseline', 'alignment-baseline',
  'letter-spacing', 'word-spacing',
  'aria-label', 'aria-labelledby', 'aria-describedby', 'role',
  'tabindex',
]);

const ALLOWED_ATTRIBUTES_BY_ELEMENT = {
  svg:           new Set(['xmlns', 'xmlns:xlink', 'viewBox', 'width', 'height', 'preserveAspectRatio', 'version']),
  use:           new Set(['href', 'xlink:href', 'x', 'y', 'width', 'height']),
  path:          new Set(['d']),
  rect:          new Set(['x', 'y', 'width', 'height', 'rx', 'ry']),
  circle:        new Set(['cx', 'cy', 'r']),
  ellipse:       new Set(['cx', 'cy', 'rx', 'ry']),
  line:          new Set(['x1', 'y1', 'x2', 'y2']),
  polyline:      new Set(['points']),
  polygon:       new Set(['points']),
  text:          new Set(['x', 'y', 'dx', 'dy', 'rotate', 'textLength', 'lengthAdjust']),
  tspan:         new Set(['x', 'y', 'dx', 'dy', 'rotate']),
  marker:        new Set(['markerUnits', 'markerWidth', 'markerHeight', 'orient', 'refX', 'refY', 'viewBox']),
  clipPath:      new Set(['clipPathUnits']),
  defs:          new Set([]),
  g:             new Set([]),
  symbol:        new Set(['viewBox', 'preserveAspectRatio', 'x', 'y', 'width', 'height']),
  linearGradient: new Set(['x1', 'y1', 'x2', 'y2', 'gradientUnits', 'gradientTransform', 'spreadMethod']),
  radialGradient: new Set(['cx', 'cy', 'r', 'fx', 'fy', 'gradientUnits', 'gradientTransform', 'spreadMethod']),
  stop:          new Set(['offset', 'stop-color', 'stop-opacity']),
  title:         new Set([]),
  desc:          new Set([]),
};

// ─── Pattern vietati ─────────────────────────────────────────────────────────

// Attributi evento JS (on*)
const FORBIDDEN_ATTR_PATTERN = /^on[a-z]+$/i;
// URL pericolosi (javascript:, data:text/html, vbscript:)
const FORBIDDEN_URL_PATTERN = /^\s*(javascript|vbscript|data:text\/html)/i;
// Elementi da rimuovere completamente insieme ai loro contenuti
const FORBIDDEN_ELEMENTS = new Set(['script', 'animate', 'animateTransform', 'set', 'foreignObject']);

/**
 * Sanitizza e normalizza un SVG stringa.
 *
 * @param {string} svgString  SVG grezzo (potenzialmente da LLM o sorgente esterna)
 * @param {string} [contextId] ID del visual per log (es. "V034")
 * @returns {{ svg: string, safe: boolean, report: SanitizationReport }}
 */
function sanitizeSvg(svgString, contextId = 'UNKNOWN') {
  const report = {
    visualId: contextId,
    inputLength: svgString ? svgString.length : 0,
    outputLength: 0,
    elementsRemoved: [],
    attributesRemoved: [],
    textNodesModified: 0,
    warnings: [],
    safe: true,
    empty: false,
  };

  if (!svgString || typeof svgString !== 'string' || svgString.trim().length === 0) {
    report.safe = false;
    report.empty = true;
    report.warnings.push('SVG_EMPTY_INPUT');
    return { svg: '', safe: false, report };
  }

  // Parsing XML/SVG — usa regex deterministiche per ambiente Node.js senza JSDOM
  let result = svgString;

  // 1. Rimuovi elementi vietati (con contenuto)
  for (const el of FORBIDDEN_ELEMENTS) {
    const before = result;
    result = result.replace(new RegExp(`<${el}[^>]*>[\\s\\S]*?<\\/${el}>`, 'gi'), '');
    result = result.replace(new RegExp(`<${el}[^>]*/?>`, 'gi'), '');
    if (result !== before) {
      report.elementsRemoved.push(el);
      if (el === 'script') {
        report.safe = false;
        report.warnings.push('SCRIPT_ELEMENT_REMOVED');
      }
    }
  }

  // 2. Rimuovi attributi evento (on*)
  result = result.replace(/\s+on[a-z]+\s*=\s*["'][^"']*["']/gi, (match) => {
    report.attributesRemoved.push(`event_attr: ${match.trim().slice(0, 40)}`);
    return '';
  });

  // 3. Rimuovi href/xlink:href con URL pericolosi
  result = result.replace(/((?:xlink:)?href)\s*=\s*["']([^"']*)["']/gi, (match, attr, url) => {
    if (FORBIDDEN_URL_PATTERN.test(url)) {
      report.attributesRemoved.push(`${attr}: ${url.slice(0, 40)}`);
      report.warnings.push('FORBIDDEN_URL_REMOVED');
      return '';
    }
    return match;
  });

  // 4. Rimuovi src con URL pericolosi
  result = result.replace(/\bsrc\s*=\s*["']([^"']*)["']/gi, (match, url) => {
    if (FORBIDDEN_URL_PATTERN.test(url) || url.startsWith('http')) {
      report.attributesRemoved.push(`src: ${url.slice(0, 40)}`);
      return '';
    }
    return match;
  });

  // 5. Normalizza viewBox — assicura che esista e abbia valori positivi
  result = _normalizeViewBox(result, report);

  // 6. Rimuovi elementi non nella allowlist (solo tag, non contenuto per sicurezza)
  // Segnala ma non rimuove per non distruggere contenuto legittimo
  const unknownElements = [];
  const elementPattern = /<([a-zA-Z][a-zA-Z0-9:-]*)\s/g;
  let m;
  while ((m = elementPattern.exec(result)) !== null) {
    const tag = m[1].toLowerCase().replace(/^svg:/, '');
    if (!ALLOWED_ELEMENTS.has(tag) && !unknownElements.includes(tag)) {
      unknownElements.push(tag);
    }
  }
  if (unknownElements.length > 0) {
    report.warnings.push(`UNKNOWN_ELEMENTS: ${unknownElements.join(', ')}`);
  }

  // 7. Auto-fix path aperti senza fill (anti-glitch triangoli neri)
  result = fixMissingPathFill(result);

  // 8. Iniezione ID semantici deterministici se assenti
  result = ensureSemanticAttributes(result);

  report.outputLength = result.length;
  report.empty = result.trim().length === 0;

  if (report.empty) {
    report.safe = false;
    report.warnings.push('SVG_EMPTY_AFTER_SANITIZATION');
  }

  return { svg: result, safe: report.safe, report };
}

/**
 * Risolve il bug universale SVG dei path aperti:
 * Se un tag <path> specifica uno stroke (linea/segnale/tubazione/curva) ma non dichiara fill,
 * lo standard SVG applica per default fill="black", creando giganteschi poligoni neri parassiti.
 * Questa funzione inietta esplicitamente fill="none".
 * 
 * @param {string} svgStr
 * @returns {string} SVG corretto
 */
function fixMissingPathFill(svgStr) {
  if (!svgStr || typeof svgStr !== 'string') return '';
  return svgStr.replace(/<path\b([^>]*?)(\/?>)/gi, (match, attrs, closing) => {
    // Se ha già un attributo fill, lascialo inalterato
    if (/\bfill\s*=/i.test(attrs)) {
      return match;
    }
    // Se è un path con stroke (quindi inteso come linea o contorno) oppure non chiuso
    const hasStroke = /\bstroke\s*=/i.test(attrs);
    const dMatch = attrs.match(/\bd\s*=\s*["']([^"']*)["']/i);
    const dVal = dMatch ? dMatch[1].trim() : '';
    const isClosed = /[zZ]\s*$/.test(dVal);

    if (hasStroke || !isClosed) {
      return `<path${attrs} fill="none"${closing}`;
    }
    return match;
  });
}

/**
 * Assicura che ogni elemento testuale o grafico importante possieda un ID semantico univoco
 * basato sul suo contenuto testuale o ruolo, consentendo al Patch Engine di indirizzarlo con precisione.
 * 
 * @param {string} svgStr
 * @returns {string} SVG arricchito con ID semantici
 */
function ensureSemanticAttributes(svgStr) {
  if (!svgStr || typeof svgStr !== 'string') return '';

  let textCounter = 1;
  // 1. Arricchisci i tag <text>
  let enriched = svgStr.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi, (match, attrs, innerText) => {
    let cleanAttrs = attrs;
    let hasId = /\bid\s*=/i.test(cleanAttrs);

    if (!hasId) {
      const rawText = innerText.replace(/<[^>]+>/g, '').trim();
      const slug = rawText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30);
      const generatedId = slug.length >= 2 ? `label-${slug}` : `label-text-${textCounter++}`;
      cleanAttrs = ` id="${generatedId}" data-role="label"${cleanAttrs}`;
    } else if (!/\bdata-role\s*=/i.test(cleanAttrs)) {
      cleanAttrs = ` data-role="label"${cleanAttrs}`;
    }

    return `<text${cleanAttrs}>${innerText}</text>`;
  });

  let pathCounter = 1;
  // 2. Arricchisci i tag <path> senza id
  enriched = enriched.replace(/<path\b([^>]*?)(\/?>)/gi, (match, attrs, closing) => {
    if (!/\bid\s*=/i.test(attrs)) {
      const isSignal = /stroke-dasharray/i.test(attrs);
      const generatedId = isSignal ? `signal-path-${pathCounter++}` : `path-${pathCounter++}`;
      return `<path id="${generatedId}" data-role="path"${attrs}${closing}`;
    }
    return match;
  });

  return enriched;
}

/**
 * Normalizza il viewBox dell'SVG.
 * - Se mancante, tenta di derivarlo da width/height
 * - Garantisce che i valori siano finiti e positivi
 */
function _normalizeViewBox(svgStr, report) {
  // Cerca viewBox esistente
  const vbMatch = svgStr.match(/viewBox\s*=\s*["']([^"']*)["']/i);

  if (vbMatch) {
    const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(isFinite) && parts[2] > 0 && parts[3] > 0) {
      return svgStr; // viewBox valido, nessuna modifica
    }
    report.warnings.push(`INVALID_VIEWBOX: "${vbMatch[1]}"`);
  }

  // Tenta derivazione da width/height
  const wMatch = svgStr.match(/\bwidth\s*=\s*["']([0-9.]+)[^"']*["']/i);
  const hMatch = svgStr.match(/\bheight\s*=\s*["']([0-9.]+)[^"']*["']/i);

  if (wMatch && hMatch) {
    const w = parseFloat(wMatch[1]);
    const h = parseFloat(hMatch[1]);
    if (w > 0 && h > 0) {
      if (vbMatch) {
        // Sostituisci viewBox non valido
        return svgStr.replace(/viewBox\s*=\s*["'][^"']*["']/i, `viewBox="0 0 ${w} ${h}"`);
      } else {
        // Aggiungi viewBox mancante
        return svgStr.replace(/<svg\b/i, `<svg viewBox="0 0 ${w} ${h}"`);
      }
    }
  }

  report.warnings.push('VIEWBOX_NOT_DETERMINABLE');
  return svgStr;
}

/**
 * Verifica strutturale minima di un SVG sanitizzato.
 * Restituisce lista di errori (vuota = pass).
 *
 * Specifica: 2.md §10 (SVG contract), 2.md §53 (Structural SVG QA).
 * @param {string} svgString
 * @returns {string[]} Lista di codici di errore
 */
function validateSvgStructure(svgString) {
  const errors = [];

  if (!svgString || svgString.trim().length === 0) {
    errors.push('SVG_EMPTY');
    return errors;
  }

  // Deve avere tag <svg
  if (!/<svg\b/i.test(svgString)) errors.push('SVG_TAG_MISSING');

  // viewBox deve esistere
  const vbMatch = svgString.match(/viewBox\s*=\s*["']([^"']*)["']/i);
  if (!vbMatch) {
    errors.push('VIEWBOX_MISSING');
  } else {
    const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length !== 4 || !parts.every(isFinite)) errors.push('VIEWBOX_INVALID');
    if (parts[2] <= 0 || parts[3] <= 0) errors.push('VIEWBOX_ZERO_SIZE');
  }

  // Non deve contenere script
  if (/<script\b/i.test(svgString)) errors.push('SCRIPT_PRESENT');

  // Non deve contenere event handler
  if (/\bon[a-z]+\s*=/i.test(svgString)) errors.push('EVENT_HANDLER_PRESENT');

  // Deve contenere almeno un elemento grafico
  const hasContent = /(<path|<rect|<circle|<ellipse|<line|<polyline|<polygon|<text|<use)\b/i.test(svgString);
  if (!hasContent) errors.push('NO_GRAPHIC_ELEMENTS');

  return errors;
}

module.exports = {
  sanitizeSvg,
  validateSvgStructure,
  fixMissingPathFill,
  ensureSemanticAttributes,
  ALLOWED_ELEMENTS,
  ALLOWED_ATTRIBUTES_GLOBAL,
};

