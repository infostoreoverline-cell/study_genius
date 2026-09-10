/**
 * StudyGenius Academic Intelligence System
 * src/rendering/svgPatchEngine.js — VSVP V2
 * 
 * Motore di Patching Deterministico dell'SVG (La "Mano" di StudyGenius).
 * 
 * Principio Fondamentale:
 * "LLM = Mente, StudyGenius = Mano".
 * L'LLM formula indicazioni e intenzioni astratte di riparazione (Repair Actions);
 * questo motore applica matematicamente le traslazioni, aggiorna attributi,
 * distanzia etichette e inietta linee guida (leader lines) SENZA mai rigenerare
 * l'SVG da zero, azzerando le regressioni sintattiche o stilistiche.
 */

'use strict';

/**
 * Mappa direzioni testuali in moltiplicatori vettoriali unitari (dx, dy)
 */
const DIRECTION_VECTORS = {
  'north':        { x:  0.0, y: -1.0 },
  'north-east':   { x:  0.8, y: -0.8 },
  'east':         { x:  1.0, y:  0.0 },
  'south-east':   { x:  0.8, y:  0.8 },
  'south':        { x:  0.0, y:  1.0 },
  'south-west':   { x: -0.8, y:  0.8 },
  'west':         { x: -1.0, y:  0.0 },
  'north-west':   { x: -0.8, y: -0.8 },
  'upper':        { x:  0.0, y: -1.0 },
  'lower':        { x:  0.0, y:  1.0 },
  'left':         { x: -1.0, y:  0.0 },
  'right':        { x:  1.0, y:  0.0 },
  'upper-left':   { x: -0.8, y: -0.8 },
  'upper-right':  { x:  0.8, y: -0.8 },
  'lower-left':   { x: -0.8, y:  0.8 },
  'lower-right':  { x:  0.8, y:  0.8 }
};

/**
 * Calcola il Minimum Translation Vector (MTV) basato su repulsione fisica
 * tra due bounding box (A = elemento da spostare, B = ostacolo).
 * Algoritmo universale valido per qualsiasi tipologia di diagramma (mappe concettuali,
 * circuiti, schemi P&ID, cicli termodinamici, grafici, apparati chimici).
 */
function computeRepulsionDisplacement(boxA, boxB, clearancePx = 25) {
  if (!boxA || !boxB) {
    return { dx: 0, dy: -clearancePx };
  }

  const centerAx = boxA.x + (boxA.width / 2);
  const centerAy = boxA.y + (boxA.height / 2);
  const centerBx = boxB.x + (boxB.width / 2);
  const centerBy = boxB.y + (boxB.height / 2);

  let vx = centerAx - centerBx;
  let vy = centerAy - centerBy;
  const dist = Math.sqrt(vx * vx + vy * vy);

  // Calcola sovrapposizione su asse X e Y
  const overlapX = Math.max(0, Math.min(boxA.x + boxA.width, boxB.x + boxB.width) - Math.max(boxA.x, boxB.x));
  const overlapY = Math.max(0, Math.min(boxA.y + boxA.height, boxB.y + boxB.height) - Math.max(boxA.y, boxB.y));

  // Se B è un ostacolo o contenitore molto grande che racchiude o attraversa A (es. voluta, asse cartesiano, reattore)
  if (boxB.width > boxA.width * 2 && boxB.height > boxA.height * 2) {
    const dLeft = Math.abs(boxA.x - boxB.x);
    const dRight = Math.abs((boxB.x + boxB.width) - (boxA.x + boxA.width));
    const dTop = Math.abs(boxA.y - boxB.y);
    const dBottom = Math.abs((boxB.y + boxB.height) - (boxA.y + boxA.height));

    const minD = Math.min(dLeft, dRight, dTop, dBottom);
    if (minD === dTop) return { dx: 0, dy: -Math.round(dTop + clearancePx) };
    if (minD === dBottom) return { dx: 0, dy: Math.round(dBottom + clearancePx) };
    if (minD === dLeft) return { dx: -Math.round(dLeft + clearancePx), dy: 0 };
    return { dx: Math.round(dRight + clearancePx), dy: 0 };
  }

  // Altrimenti, respingi lungo la direzione tra i baricentri
  if (dist < 1) {
    return { dx: Math.round(clearancePx * 0.7), dy: -Math.round(clearancePx * 0.7) };
  }

  const normX = vx / dist;
  const normY = vy / dist;
  const push = Math.max(clearancePx, Math.max(overlapX, overlapY) + 12);

  return {
    dx: Math.round(normX * push),
    dy: Math.round(normY * push)
  };
}

/**
 * Calcola lo spostamento (dx, dy) in pixel da una raccomandazione di preferredRegion
 */
function computeDisplacement(regionStr, clearancePx = 25) {
  const norm = (regionStr || 'north').toLowerCase().trim();
  const vec = DIRECTION_VECTORS[norm] || { x: 0, y: -1 };
  return {
    dx: Math.round(vec.x * clearancePx),
    dy: Math.round(vec.y * clearancePx)
  };
}

/**
 * Trova e restituisce l'apertura e chiusura del tag per un elemento identificato da ID
 * o per un tag <text> contenente una determinata stringa.
 */
function findElementInSvg(svgString, targetId, textSnippet = '') {
  if (!svgString) return null;

  // 1. Cerca per id esatto: id="targetId" o id='targetId'
  if (targetId) {
    const idEsc = targetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const idRegex = new RegExp(`<([a-zA-Z0-9_-]+)\\s+[^>]*?id=['"]${idEsc}['"][^>]*>`, 'i');
    const match = idRegex.exec(svgString);
    if (match) {
      const startIndex = match.index;
      const fullOpenTag = match[0];
      const tagName = match[1];
      return { startIndex, fullOpenTag, tagName, isSelfClosing: fullOpenTag.endsWith('/>') };
    }
  }

  // 2. Cerca per testo contenuto nel tag <text> (fallback se targetId non presente)
  if (textSnippet && typeof textSnippet === 'string') {
    const cleanSnippet = textSnippet.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (cleanSnippet.length >= 3) {
      const textRegex = new RegExp(`<text\\b([^>]*)>([\\s\\S]*?${cleanSnippet}[\\s\\S]*?)</text>`, 'i');
      const match = textRegex.exec(svgString);
      if (match) {
        return {
          startIndex: match.index,
          fullOpenTag: `<text${match[1]}>`,
          tagName: 'text',
          isSelfClosing: false,
          innerContent: match[2],
          fullMatchLength: match[0].length
        };
      }
    }
  }

  return null;
}

/**
 * Applica una patch geometrica per riposizionare un'etichetta (REPOSITION_LABEL)
 */
function applyRepositionLabel(svgString, repair, geometryInfo = null) {
  const targetId = repair.targetId || (repair.targetIds && repair.targetIds[0]);
  const textHint = repair.textSnippet || repair.targetText || '';

  const found = findElementInSvg(svgString, targetId, textHint);
  if (!found) {
    return { success: false, reason: `Elemento "${targetId || textHint}" non trovato nell'SVG` };
  }

  const clearance = repair.minimumClearance || repair.clearance || 25;
  let dx = repair.dx;
  let dy = repair.dy;

  if (dx === undefined || dy === undefined) {
    if (repair.boxA && repair.boxB) {
      const rep = computeRepulsionDisplacement(repair.boxA, repair.boxB, clearance);
      dx = rep.dx;
      dy = rep.dy;
    } else if (repair.preferredRegion) {
      const computed = computeDisplacement(repair.preferredRegion, clearance);
      dx = computed.dx;
      dy = computed.dy;
    } else {
      dx = 0;
      dy = -clearance;
    }
  }

  const tag = found.tagName;
  const oldOpenTag = found.fullOpenTag;
  let newOpenTag = oldOpenTag;

  // Estrai coordinate x, y se presenti
  const xMatch = oldOpenTag.match(/\bx=['"]([^'"]+)['"]/);
  const yMatch = oldOpenTag.match(/\by=['"]([^'"]+)['"]/);
  let origX = xMatch ? parseFloat(xMatch[1]) : 0;
  let origY = yMatch ? parseFloat(yMatch[1]) : 0;

  // Traccia coordinate di origine stabili (per evitare leader lines a ragnatela)
  const oxMatch = oldOpenTag.match(/\bdata-origin-x=['"]([^'"]+)['"]/);
  const oyMatch = oldOpenTag.match(/\bdata-origin-y=['"]([^'"]+)['"]/);
  const originX = oxMatch ? parseFloat(oxMatch[1]) : origX;
  const originY = oyMatch ? parseFloat(oyMatch[1]) : origY;

  // Rileva se è un titolo (non spostare fuori e non aggiungere leader line)
  const isTitle = (origY < 50 && (oldOpenTag.includes('font-size="16"') || oldOpenTag.includes('font-size="18"') || (targetId && targetId.includes('titolo'))));
  if (isTitle) {
    repair.addLeaderLine = false;
    dy = Math.max(-10, Math.min(10, dy));
  }

  let newX = origX;
  let newY = origY;

  if (xMatch && yMatch && !isNaN(origX) && !isNaN(origY)) {
    newX = Math.round((origX + dx) * 10) / 10;
    newY = Math.round((origY + dy) * 10) / 10;

    // Se è un titolo, mantieni sempre dentro l'area visibile (y >= 25)
    if (isTitle) {
      newY = Math.max(25, newY);
    }

    newOpenTag = newOpenTag
      .replace(/\bx=['"][^'"]+['"]/, `x="${newX}"`)
      .replace(/\by=['"][^'"]+['"]/, `y="${newY}"`);

    // Inietta data-origin se assente per fissare l'ancora della leader line
    if (!oxMatch && origX && origY) {
      newOpenTag = newOpenTag.replace(new RegExp(`^<${tag}\\b`), `<${tag} data-origin-x="${origX}" data-origin-y="${origY}"`);
    }
  } else {
    // Applica o concatena un translate(dx, dy)
    const transformMatch = oldOpenTag.match(/\btransform=['"]([^'"]+)['"]/);
    if (transformMatch) {
      const oldTr = transformMatch[1];
      const newTr = `${oldTr} translate(${dx}, ${dy})`;
      newOpenTag = newOpenTag.replace(/\btransform=['"][^'"]+['"]/, `transform="${newTr}"`);
    } else {
      newOpenTag = newOpenTag.replace(new RegExp(`^<${tag}\\b`), `<${tag} transform="translate(${dx}, ${dy})"`);
    }
  }

  // Rimuovi eventuali leader-line preesistenti per lo stesso targetId (idempotenza)
  let updatedSvg = svgString;
  const leaderId = `leader_${(targetId || 'line').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  if (targetId) {
    const prevLeaderRegex = new RegExp(`\\s*<line[^>]*id=['"]${leaderId}['"][^>]*\\/?>`, 'gi');
    updatedSvg = updatedSvg.replace(prevLeaderRegex, '');
  }

  // Trova di nuovo la posizione se sono state rimosse stringhe prima
  const refound = findElementInSvg(updatedSvg, targetId, textHint);
  if (refound) {
    updatedSvg = updatedSvg.slice(0, refound.startIndex) + newOpenTag + updatedSvg.slice(refound.startIndex + refound.fullOpenTag.length);
  } else {
    updatedSvg = updatedSvg.replace(oldOpenTag, newOpenTag);
  }

  // Iniezione leader-line opzionale (collegata stabilmente a originX/originY)
  if (!isTitle && repair.addLeaderLine && originX && originY && (Math.abs(newX - originX) > 15 || Math.abs(newY - originY) > 15)) {
    const leaderLine = `\n  <line id="${leaderId}" data-role="leader-line" class="vsvp-leader-line" x1="${newX}" y1="${newY - 4}" x2="${originX}" y2="${originY}" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3 2" opacity="0.8"/>`;
    updatedSvg = updatedSvg.replace(newOpenTag, `${leaderLine}\n  ${newOpenTag}`);
  }

  return { success: true, svg: updatedSvg, delta: { dx, dy } };
}

/**
 * Applica la modifica di attributi (SET_ATTRIBUTE)
 */
function applySetAttribute(svgString, repair) {
  const targetId = repair.targetId || (repair.targetIds && repair.targetIds[0]);
  const textHint = repair.textSnippet || '';
  const attributes = repair.attributes || {};

  const found = findElementInSvg(svgString, targetId, textHint);
  if (!found) {
    return { success: false, reason: `Elemento "${targetId}" non trovato per SET_ATTRIBUTE` };
  }

  const oldOpenTag = found.fullOpenTag;
  let newOpenTag = oldOpenTag;

  for (const [attrName, attrValue] of Object.entries(attributes)) {
    const attrRegex = new RegExp(`\\b${attrName}=['"][^'"]*['"]`, 'i');
    if (attrRegex.test(newOpenTag)) {
      newOpenTag = newOpenTag.replace(attrRegex, `${attrName}="${attrValue}"`);
    } else {
      // Inserisci l'attributo prima della chiusura del tag
      const closingIndex = newOpenTag.endsWith('/>') ? newOpenTag.length - 2 : newOpenTag.length - 1;
      newOpenTag = `${newOpenTag.slice(0, closingIndex)} ${attrName}="${attrValue}"${newOpenTag.slice(closingIndex)}`;
    }
  }

  const updatedSvg = svgString.slice(0, found.startIndex) + newOpenTag + svgString.slice(found.startIndex + oldOpenTag.length);
  return { success: true, svg: updatedSvg };
}

/**
 * Espande il viewBox per evitare clipping (EXPAND_VIEWBOX)
 */
function applyExpandViewBox(svgString, repair, geometryInfo = null) {
  const margins = repair.expandMargins || { left: 20, right: 20, top: 15, bottom: 15 };
  // Limita margini per evitare inflazione spropositata del viewBox
  const dLeft = Math.min(30, Math.max(0, margins.left || 0));
  const dRight = Math.min(30, Math.max(0, margins.right || 0));
  const dTop = Math.min(20, Math.max(0, margins.top || 0));
  const dBottom = Math.min(20, Math.max(0, margins.bottom || 0));

  const vbMatch = svgString.match(/\bviewBox=['"]([^'"]+)['"]/i);
  if (!vbMatch) {
    return { success: false, reason: 'Nessun attributo viewBox trovato nel tag <svg>' };
  }

  const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return { success: false, reason: 'Valore viewBox non valido' };
  }

  const [minX, minY, width, height] = parts;
  const newMinX = Math.round(minX - dLeft);
  const newMinY = Math.round(minY - dTop);
  const newWidth = Math.round(width + dLeft + dRight);
  const newHeight = Math.round(height + dTop + dBottom);

  const newVbStr = `viewBox="${newMinX} ${newMinY} ${newWidth} ${newHeight}"`;
  let updatedSvg = svgString.replace(/\bviewBox=['"][^'"]+['"]/i, newVbStr);

  // Espandi anche il rettangolo di sfondo se presente
  updatedSvg = updatedSvg.replace(/(<rect\b[^>]*\bfill=['"]#[a-f0-9]+['"][^>]*\brx=['"]\d+['"])/i, (rectMatch) => {
    let r = rectMatch;
    if (r.includes('width=')) {
      r = r.replace(/\bwidth=['"][^'"]*['"]/, `width="${newWidth}"`);
    }
    if (r.includes('height=')) {
      r = r.replace(/\bheight=['"][^'"]*['"]/, `height="${newHeight}"`);
    }
    if (r.includes('x=')) {
      r = r.replace(/\bx=['"][^'"]*['"]/, `x="${newMinX}"`);
    }
    if (r.includes('y=')) {
      r = r.replace(/\by=['"][^'"]*['"]/, `y="${newMinY}"`);
    }
    return r;
  });

  return { success: true, svg: updatedSvg, newViewBox: { minX: newMinX, minY: newMinY, width: newWidth, height: newHeight } };
}

/**
 * Applica una lista di Recommended Repairs in modo deterministico
 * 
 * @param {string} svgString Stringa SVG sorgente
 * @param {Array<Object>} repairs Lista di azioni di riparazione
 * @param {Object} [geometryInfo] Dati calcolati da svgGeometryAnalyzer
 * @returns {{ patchedSvg: string, appliedRepairs: Array<Object>, failedRepairs: Array<Object> }}
 */
function applyStructuredPatches(svgString, repairs = [], geometryInfo = null) {
  if (!svgString || !Array.isArray(repairs) || repairs.length === 0) {
    return {
      patchedSvg: svgString || '',
      appliedRepairs: [],
      failedRepairs: []
    };
  }

  let currentSvg = svgString;
  const appliedRepairs = [];
  const failedRepairs = [];

  for (const repair of repairs) {
    const action = (repair.action || repair.type || '').toUpperCase();
    let res = null;

    switch (action) {
      case 'REPOSITION_LABEL':
      case 'MOVE_LABEL':
        res = applyRepositionLabel(currentSvg, repair, geometryInfo);
        break;

      case 'SET_ATTRIBUTE':
      case 'UPDATE_STYLE':
        res = applySetAttribute(currentSvg, repair);
        break;

      case 'EXPAND_VIEWBOX':
      case 'FIX_CLIPPING':
        res = applyExpandViewBox(currentSvg, repair, geometryInfo);
        break;

      default:
        failedRepairs.push({ repair, reason: `Azione "${action}" non supportata da svgPatchEngine` });
        continue;
    }

    if (res && res.success) {
      currentSvg = res.svg;
      appliedRepairs.push({ ...repair, result: res });
    } else {
      failedRepairs.push({ repair, reason: res?.reason || 'Applicazione fallita' });
    }
  }

  return {
    patchedSvg: currentSvg,
    appliedRepairs,
    failedRepairs
  };
}

module.exports = {
  applyStructuredPatches,
  computeDisplacement,
  applyRepositionLabel,
  applySetAttribute,
  applyExpandViewBox,
  DIRECTION_VECTORS
};
