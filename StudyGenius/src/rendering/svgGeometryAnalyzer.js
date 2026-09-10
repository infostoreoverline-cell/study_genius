/**
 * StudyGenius Academic Intelligence System
 * src/rendering/svgGeometryAnalyzer.js — VSVP V2
 * 
 * Analizzatore Geometrico Deterministico via Chromium DOM (Puppeteer).
 * 
 * Principio Fondamentale:
 * Il computer calcola la geometria reale (bounding box effettivi, collisioni fisiche,
 * clipping e spaziature minime); l'LLM non deve mai essere usato per stimare coordinate
 * o verificare intersezioni geometriche.
 * 
 * Funzionalità:
 * 1. Rendering headless in Chromium con rendering accurato dei font
 * 2. Estrazione getBBox() e getBoundingClientRect() reali
 * 3. Matrice delle collisioni Text-to-Text e Text-to-Geometry
 * 4. Rilevamento clipping ed overflow rispetto al viewBox
 * 5. Calcolo clearance minima (minimumGap)
 */

'use strict';

const puppeteer = require('puppeteer');

let sharedBrowser = null;
let sharedBrowserUsers = 0;

/**
 * Ottiene o crea un'istanza Puppeteer condivisa per analisi rapide
 */
async function getBrowserInstance() {
  if (!sharedBrowser) {
    sharedBrowser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
  }
  sharedBrowserUsers++;
  return sharedBrowser;
}

/**
 * Rilascia l'istanza condivisa di Puppeteer se nessun altro la sta usando
 */
async function releaseBrowserInstance() {
  sharedBrowserUsers = Math.max(0, sharedBrowserUsers - 1);
  if (sharedBrowserUsers === 0 && sharedBrowser) {
    try {
      await sharedBrowser.close();
    } catch (_) {}
    sharedBrowser = null;
  }
}

/**
 * Normalizza e parse del viewBox
 */
function parseViewBox(viewBoxStr, width = 800, height = 500) {
  if (typeof viewBoxStr === 'string' && viewBoxStr.trim()) {
    const parts = viewBoxStr.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
    }
  }
  const w = parseFloat(width) || 800;
  const h = parseFloat(height) || 500;
  return { minX: 0, minY: 0, width: w, height: h };
}

/**
 * Esegue l'analisi geometrica deterministica di un SVG nel DOM reale
 * 
 * @param {string} svgString Stringa SVG completa
 * @param {Object} [options]
 * @param {number} [options.minClearancePx=8] Distanza minima in pixel tra etichette non collidenti
 * @param {number} [options.minCollisionAreaPx=2] Area minima di intersezione per considerare collisione
 * @param {boolean} [options.checkGeometryCollisions=true] Se controllare collisioni testo-linee/forme
 * @param {Object} [options.browserInstance] Istanza browser esterna opzionale
 * @returns {Promise<GeometricQAResult>}
 */
async function analyzeSvgGeometry(svgString, options = {}) {
  const minClearance = options.minClearancePx !== undefined ? options.minClearancePx : 8;
  const minOverlapArea = options.minCollisionAreaPx !== undefined ? options.minCollisionAreaPx : 2;
  const checkGeom = options.checkGeometryCollisions !== false;

  const browser = options.browserInstance || await getBrowserInstance();
  const ownsBrowser = !options.browserInstance;
  let page = null;

  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2 });

    // HTML harness con font accademici standard
    const htmlHarness = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #ffffff; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
          #container { display: inline-block; }
        </style>
      </head>
      <body>
        <div id="container">${svgString}</div>
      </body>
      </html>
    `;

    await page.setContent(htmlHarness, { waitUntil: 'domcontentloaded' });
    try {
      await page.evaluateHandle('document.fonts.ready');
    } catch (_) {}

    // Esegui analisi nel contesto Chromium
    const result = await page.evaluate((minClearancePx, minOverlapAreaPx, checkGeometry) => {
      const svgEl = document.querySelector('#container svg');
      if (!svgEl) {
        return {
          valid: false,
          error: 'Nessun elemento <svg> trovato nel markup fornito',
          collisions: [],
          clippings: [],
          elements: {}
        };
      }

      // 1. Estrazione ViewBox
      const rawVb = svgEl.getAttribute('viewBox') || '';
      const rawW = svgEl.getAttribute('width') || '800';
      const rawH = svgEl.getAttribute('height') || '500';
      
      let vb = { minX: 0, minY: 0, width: parseFloat(rawW) || 800, height: parseFloat(rawH) || 500 };
      if (rawVb.trim()) {
        const p = rawVb.trim().split(/[\s,]+/).map(Number);
        if (p.length === 4 && p.every(n => !isNaN(n))) {
          vb = { minX: p[0], minY: p[1], width: p[2], height: p[3] };
        }
      }

      // 2. Censimento e misurazione di tutti gli elementi grafici e testuali
      const allElements = svgEl.querySelectorAll('text, path, circle, ellipse, rect, polygon, line, g[id]');
      const elementRegistry = {};
      const textNodes = [];
      const shapeNodes = [];

      let autoIdCounter = 1;

      allElements.forEach((el) => {
        const tag = el.tagName.toLowerCase();
        let id = el.getAttribute('id');
        if (!id) {
          id = `elem_${tag}_${autoIdCounter++}`;
          el.setAttribute('id', id);
        }

        let bbox = { x: 0, y: 0, width: 0, height: 0 };
        try {
          if (typeof el.getBBox === 'function') {
            const b = el.getBBox();
            bbox = {
              x: Math.round(b.x * 100) / 100,
              y: Math.round(b.y * 100) / 100,
              width: Math.round(b.width * 100) / 100,
              height: Math.round(b.height * 100) / 100
            };
          }
        } catch (_) {}

        // Salta elementi invisibili o a dimensione zero
        if (bbox.width <= 0.1 && bbox.height <= 0.1) return;

        const role = el.getAttribute('data-role') || '';
        const target = el.getAttribute('data-target') || '';
        const parentId = el.parentElement && el.parentElement.id ? el.parentElement.id : null;

        const item = {
          id,
          tag,
          role,
          target,
          parentId,
          bbox,
          text: tag === 'text' ? (el.textContent || '').trim() : ''
        };

        elementRegistry[id] = item;

        if (tag === 'text') {
          textNodes.push(item);
        } else if (tag !== 'g') {
          shapeNodes.push(item);
        }
      });

      // 3. Collision Matrix (Text-to-Text)
      const collisions = [];
      const lowClearanceWarnings = [];

      for (let i = 0; i < textNodes.length; i++) {
        for (let j = i + 1; j < textNodes.length; j++) {
          const t1 = textNodes[i];
          const t2 = textNodes[j];
          const b1 = t1.bbox;
          const b2 = t2.bbox;

          // Se sono tspans o figli dello stesso g etichetta, salta
          if (t1.parentId && t1.parentId === t2.parentId && t1.parentId.includes('label')) {
            continue;
          }

          const xOverlap = Math.max(0, Math.min(b1.x + b1.width, b2.x + b2.width) - Math.max(b1.x, b2.x));
          const yOverlap = Math.max(0, Math.min(b1.y + b1.height, b2.y + b2.height) - Math.max(b1.y, b2.y));
          const intersectionArea = xOverlap * yOverlap;

          if (intersectionArea >= minOverlapAreaPx) {
            const minBoxArea = Math.min(b1.width * b1.height, b2.width * b2.height) || 1;
            const overlapPercentage = Math.round((intersectionArea / minBoxArea) * 1000) / 10;

            collisions.push({
              type: 'TEXT_TEXT_COLLISION',
              severity: overlapPercentage > 20 ? 'critical' : 'major',
              elementA: t1.id,
              textA: t1.text,
              elementB: t2.id,
              textB: t2.text,
              intersectionArea: Math.round(intersectionArea * 10) / 10,
              overlapPercentage,
              boxA: b1,
              boxB: b2,
              recommendation: `Spostare uno dei due testi. Clearance richiesta: almeno ${minClearancePx}px.`
            });
          } else if (intersectionArea === 0 && minClearancePx > 0) {
            // Calcola distanza (gap)
            const dx = Math.max(0, Math.max(b1.x, b2.x) - Math.min(b1.x + b1.width, b2.x + b2.width));
            const dy = Math.max(0, Math.max(b1.y, b2.y) - Math.min(b1.y + b1.height, b2.y + b2.height));
            const gap = Math.sqrt(dx * dx + dy * dy);

            if (gap < minClearancePx) {
              lowClearanceWarnings.push({
                elementA: t1.id,
                textA: t1.text,
                elementB: t2.id,
                textB: t2.text,
                gap: Math.round(gap * 10) / 10,
                minRequired: minClearancePx
              });
            }
          }
        }
      }

      // 4. Collision Text-to-Geometry (se abilitato)
      // Rileva etichette di testo che collidono inaspettatamente con linee o bordi
      if (checkGeometry) {
        textNodes.forEach(t => {
          const tb = t.bbox;
          shapeNodes.forEach(s => {
            // Escludi se il testo è dichiarato come appartenente allo shape (data-target o parent comune)
            if (t.target === s.id || (t.parentId && t.parentId === s.id)) return;
            // Escludi se lo shape è la leader-line (linea guida) dello stesso testo
            if (s.role === 'leader-line' || (s.id && (s.id.includes(t.id) || s.id.startsWith('leader_')))) return;
            // Escludi se lo shape è un rect di sfondo o container dichiarato
            if (s.tag === 'rect' && s.role === 'background') return;

            const sb = s.bbox;
            // Se lo shape racchiude COMPLETAMENTE il testo (es. nodo concetto con rect attorno), è consentito
            const isContained = (tb.x >= sb.x - 2 && tb.y >= sb.y - 2 &&
                                 tb.x + tb.width <= sb.x + sb.width + 2 &&
                                 tb.y + tb.height <= sb.y + sb.height + 2);
            if (isContained) return;

            const xOverlap = Math.max(0, Math.min(tb.x + tb.width, sb.x + sb.width) - Math.max(tb.x, sb.x));
            const yOverlap = Math.max(0, Math.min(tb.y + tb.height, sb.y + sb.height) - Math.max(tb.y, sb.y));
            const intArea = xOverlap * yOverlap;

            // Se taglia significativamente una linea/path o arco
            if (intArea > 15 && (s.tag === 'line' || s.tag === 'path')) {
              collisions.push({
                type: 'TEXT_PATH_COLLISION',
                severity: 'major',
                elementA: t.id,
                textA: t.text,
                elementB: s.id,
                tagB: s.tag,
                intersectionArea: Math.round(intArea * 10) / 10,
                boxA: tb,
                boxB: sb,
                recommendation: `L'etichetta "${t.text}" interseca il tracciato ${s.id}. Spostare l'etichetta o deviare la linea.`
              });
            }
          });
        });
      }

      // 5. Rilevamento Clipping / ViewBox Overflow
      const clippings = [];
      const tolerance = 1.0; // 1px tolleranza anti-subpixel rounding

      allElements.forEach(el => {
        const id = el.id;
        const item = elementRegistry[id];
        if (!item || !item.bbox) return;

        const b = item.bbox;
        const isClippedLeft = b.x < vb.minX - tolerance;
        const isClippedTop = b.y < vb.minY - tolerance;
        const isClippedRight = (b.x + b.width) > (vb.minX + vb.width + tolerance);
        const isClippedBottom = (b.y + b.height) > (vb.minY + vb.height + tolerance);

        if (isClippedLeft || isClippedTop || isClippedRight || isClippedBottom) {
          clippings.push({
            id: item.id,
            tag: item.tag,
            text: item.text || undefined,
            bbox: b,
            clippedSides: {
              left: isClippedLeft,
              top: isClippedTop,
              right: isClippedRight,
              bottom: isClippedBottom
            }
          });
        }
      });

      return {
        valid: true,
        viewBox: vb,
        elementsCount: Object.keys(elementRegistry).length,
        textElementsCount: textNodes.length,
        collisionCount: collisions.length,
        clippingCount: clippings.length,
        collisions,
        lowClearanceWarnings,
        clippings,
        elements: elementRegistry
      };
    }, minClearance, minOverlapArea, checkGeom);

    result.passed = (result.collisionCount === 0 && result.clippingCount === 0);
    return result;

  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
    if (ownsBrowser) {
      await releaseBrowserInstance();
    }
  }
}

module.exports = {
  analyzeSvgGeometry,
  parseViewBox,
  getBrowserInstance,
  releaseBrowserInstance
};
