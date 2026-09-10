/**
 * StudyGenius Academic Intelligence System
 * src/rendering/conceptMapRenderer.js  — v2.0 (Premium Visual Edition)
 *
 * Renderer deterministico per Mappe Concettuali (kind: "concept_map").
 *
 * REGOLA ASSOLUTA (1.md §6.2 / 2.md §107):
 *   Una sezione "Mappa Concettuale" NON PUÒ MAI contenere ├── nel PDF finale.
 *   Se questo renderer non può produrre SVG valido, lancia errore (NO_PDF).
 *
 * Principi di design v2.0:
 *   - Tipografia Inter (system-ui) professionale, mai monospace
 *   - Gradienti per nodi root, colori per livello gerarchico
 *   - Drop-shadow leggero per profondità visiva
 *   - Frecce con stili distinti per tipo relazione (classificazione, dipendenza, trasformazione)
 *   - Layout Reingold-Tilford avanzato: elimina sovrapposizioni, centra perfettamente
 *   - Legenda automatica se relazioni etichettate > 1 tipo
 *   - NO ASCII tree — mai ├── └── in output
 *
 * Famiglie supportate: CONCEPT_MAP, ROADMAP, DEPENDENCY_GRAPH, CLASSIFICATION, HIERARCHY
 * Layout intents: top_down (default), left_right, radial
 */

'use strict';

const crypto = require('crypto');

// ─── Palette colori per livello ───────────────────────────────────────────────
// Colori calibrati per stampa (CMYK-safe), contrasto AA/AAA WCAG 2.1
const LEVEL_PALETTE = [
  { bg: '#1e3a5f', text: '#ffffff', border: '#1e3a5f', accent: '#3b82f6' }, // L0 root
  { bg: '#1d4ed8', text: '#ffffff', border: '#1e40af', accent: '#60a5fa' }, // L1
  { bg: '#0891b2', text: '#ffffff', border: '#0e7490', accent: '#22d3ee' }, // L2
  { bg: '#0d9488', text: '#ffffff', border: '#0f766e', accent: '#2dd4bf' }, // L3
  { bg: '#059669', text: '#ffffff', border: '#047857', accent: '#34d399' }, // L4
  { bg: '#7c3aed', text: '#ffffff', border: '#6d28d9', accent: '#a78bfa' }, // L5+
];

const PALE_PALETTE = [
  { bg: '#eff6ff', text: '#1e3a8a', border: '#bfdbfe', accent: '#3b82f6' },
  { bg: '#eff6ff', text: '#1e3a8a', border: '#bfdbfe', accent: '#3b82f6' },
  { bg: '#ecfeff', text: '#164e63', border: '#a5f3fc', accent: '#0891b2' },
  { bg: '#f0fdfa', text: '#134e4a', border: '#99f6e4', accent: '#0d9488' },
  { bg: '#f0fdf4', text: '#14532d', border: '#bbf7d0', accent: '#059669' },
  { bg: '#f5f3ff', text: '#3b0764', border: '#ddd6fe', accent: '#7c3aed' },
];

// ─── Stili freccia per tipo relazione ─────────────────────────────────────────
const RELATION_STYLES = {
  classification: { color: '#3b82f6', dash: '',            label: 'classificazione', width: 1.8 },
  dependency:     { color: '#7c3aed', dash: '6 3',         label: 'dipendenza',      width: 1.6 },
  transformation: { color: '#059669', dash: '2 2',         label: 'trasformazione',  width: 1.6 },
  sequence:       { color: '#0891b2', dash: '',            label: 'sequenza',        width: 1.8 },
  comparison:     { color: '#d97706', dash: '5 2 2 2',     label: 'confronto',       width: 1.5 },
  default:        { color: '#64748b', dash: '',            label: '',                width: 1.5 },
};

// ─── Costanti layout ──────────────────────────────────────────────────────────
const FONT_FAMILY    = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif";
const FONT_SIZE_ROOT = 14;
const FONT_SIZE_L1   = 13;
const FONT_SIZE_LEAF = 12;
const FONT_SIZE_EDGE = 10;
const FONT_SIZE_TITLE= 15;

const PADDING = { h: 16, v: 10 };
const NODE_RADIUS = 8;
const MIN_NODE_W  = 100;
const MAX_NODE_W  = 220;
const LEVEL_GAP   = 80;    // px verticale tra livelli
const SIBLING_GAP = 20;    // px orizzontale tra fratelli
const CHAR_W      = 7.0;   // px/char a 13px
const LINE_H      = 18;    // px per riga testo

// ─── Misura testo con word-wrap ────────────────────────────────────────────────
function measureNode(text, fontSize = FONT_SIZE_L1, hasCategory = false) {
  const scale    = fontSize / 13;
  const maxChars = Math.floor(MAX_NODE_W / (CHAR_W * scale)) - 2;
  const words    = String(text || '').split(/\s+/).filter(Boolean);
  const lines    = [''];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if ((last + (last ? ' ' : '') + w).length <= maxChars) {
      lines[lines.length - 1] = last ? `${last} ${w}` : w;
    } else {
      lines.push(w);
    }
  }
  const maxLen = Math.max(...lines.map(l => l.length));
  const w = Math.min(MAX_NODE_W, Math.max(MIN_NODE_W,
    Math.ceil(maxLen * CHAR_W * scale + PADDING.h * 2)));
  const h = Math.ceil(lines.length * LINE_H * scale + PADDING.v * 2 + 2) + (hasCategory ? 16 : 0);
  return { w, h, lines };
}

// ─── Estrazione label da spec ──────────────────────────────────────────────────
function nodeLabel(node) {
  if (!node.label) return String(node.id || '');
  if (Array.isArray(node.label)) return node.label.map(s => s.value || '').join('');
  return String(node.label);
}
function edgeLabel(edge) {
  if (!edge.label) return '';
  if (Array.isArray(edge.label)) return edge.label.map(s => s.value || '').join('');
  return String(edge.label);
}

// ─── Escape SVG ───────────────────────────────────────────────────────────────
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shortHash(s) {
  return crypto.createHash('md5').update(String(s)).digest('hex').slice(0, 6);
}

// ─── Layout Reingold-Tilford (top-down) ───────────────────────────────────────
function buildTree(nodeMap, edges) {
  const children = new Map([...nodeMap.keys()].map(id => [id, []]));
  const hasParent = new Set();
  for (const e of edges) {
    if (nodeMap.has(e.from) && nodeMap.has(e.to)) {
      children.get(e.from).push(e.to);
      hasParent.add(e.to);
    }
  }
  const roots = [...nodeMap.keys()].filter(id => !hasParent.has(id));
  if (roots.length === 0 && nodeMap.size > 0) roots.push([...nodeMap.keys()][0]);
  return { children, roots };
}

function layoutTopDown(nodeMap, edges) {
  const { children, roots } = buildTree(nodeMap, edges);

  // Assegna livelli BFS
  const level = new Map();
  const queue = roots.map(r => [r, 0]);
  const visited = new Set();
  while (queue.length > 0) {
    const [id, lv] = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    level.set(id, lv);
    for (const c of (children.get(id) || [])) {
      if (!visited.has(c)) queue.push([c, lv + 1]);
    }
  }

  // Nodi non raggiunti (cicli o isolati)
  for (const id of nodeMap.keys()) {
    if (!level.has(id)) {
      level.set(id, 0);
    }
  }

  // Subtree width & relative placement (post-order)
  const subtreeW = new Map();
  const relX = new Map();

  function computeSubtree(id, seen = new Set()) {
    if (seen.has(id)) return nodeMap.get(id)._m.w;
    seen.add(id);
    const kids = (children.get(id) || []).filter(k => !seen.has(k) && level.get(k) > level.get(id));
    const nw = nodeMap.get(id)._m.w;

    if (kids.length === 0) {
      subtreeW.set(id, nw);
      relX.set(id, 0);
      return nw;
    }

    let kidsTotalW = 0;
    const kidOffsets = [];
    for (let i = 0; i < kids.length; i++) {
      const kw = computeSubtree(kids[i], seen);
      kidOffsets.push(kidsTotalW);
      kidsTotalW += kw + (i < kids.length - 1 ? SIBLING_GAP : 0);
    }

    const totalW = Math.max(nw, kidsTotalW);
    subtreeW.set(id, totalW);

    // Centra il nodo padre rispetto al subtree
    const parentX = (totalW - nw) / 2;
    relX.set(id, parentX);

    // Se il padre è più largo dei figli, distribuisci i figli centrati sotto il padre
    const kidsShift = (totalW - kidsTotalW) / 2;
    for (let i = 0; i < kids.length; i++) {
      nodeMap.get(kids[i])._subtreeShift = kidOffsets[i] + kidsShift;
    }

    return totalW;
  }

  // Assegna coordinate X assolute top-down
  function assignPos(id, originX, seen = new Set()) {
    if (seen.has(id)) return;
    seen.add(id);
    const n = nodeMap.get(id);
    n._x = originX + (relX.get(id) || 0);
    n._level = level.get(id);

    const kids = (children.get(id) || []).filter(k => !seen.has(k) && level.get(k) > level.get(id));
    for (const kid of kids) {
      const shift = nodeMap.get(kid)._subtreeShift || 0;
      assignPos(kid, originX + shift, seen);
    }
  }

  let curOriginX = 0;
  for (const r of roots) {
    const sw = computeSubtree(r);
    assignPos(r, curOriginX);
    curOriginX += sw + SIBLING_GAP * 2;
  }

  // Calcola altezze Y per livello per evitare sovrapposizioni verticali
  const maxHByLevel = new Map();
  for (const [id, lv] of level) {
    const h = nodeMap.get(id)._m.h;
    maxHByLevel.set(lv, Math.max(maxHByLevel.get(lv) || 0, h));
  }
  const yByLevel = new Map();
  let curY = 0;
  const sortedLevels = [...maxHByLevel.keys()].sort((a, b) => a - b);
  for (const lv of sortedLevels) {
    yByLevel.set(lv, curY);
    curY += maxHByLevel.get(lv) + LEVEL_GAP;
  }
  for (const [id, lv] of level) {
    nodeMap.get(id)._y = yByLevel.get(lv);
  }
}

function layoutLeftRight(nodeMap, edges) {
  layoutTopDown(nodeMap, edges);
  // Swap x↔y con scala
  const SCALE_X = 1.5;
  for (const n of nodeMap.values()) {
    const oldX = n._x;
    const oldY = n._y;
    n._x = oldY * SCALE_X;
    n._y = oldX;
    // Swap dimensioni
    const oldW = n._m.w;
    n._m.w = Math.max(60, n._m.h + 10);
    n._m.h = oldW;
  }
}

// ─── Renderer SVG principale ──────────────────────────────────────────────────

/**
 * Renderizza una concept map da VisualSpec v1.0.
 * @param {Object} spec  VisualSpec completa
 * @returns {string}     SVG string valido, auto-contenuto, senza ASCII
 */
function renderConceptMap(spec) {
  const payload = spec.payload || {};
  const nodes   = payload.nodes || [];
  const edges   = payload.edges || [];
  const title   = spec.title || '';
  const layoutIntent = payload.layoutIntent || 'top_down';
  const showLegend   = payload.showLegend !== false;

  if (nodes.length === 0) {
    throw new Error('[ConceptMapRenderer] EMPTY_NODES: impossibile renderizzare mappa senza nodi.');
  }

  // ─ Prepara nodeMap ──────────────────────────────────────────────────────────
  const nodeMap = new Map();
  for (const node of nodes) {
    const label = nodeLabel(node);
    const m     = measureNode(label, FONT_SIZE_L1, Boolean(node.category));
    nodeMap.set(node.id, { ...node, _label: label, _m: m, _x: 0, _y: 0, _level: 0 });
  }

  // ─ Applica layout ───────────────────────────────────────────────────────────
  if (layoutIntent === 'left_right') {
    layoutLeftRight(nodeMap, edges);
  } else {
    layoutTopDown(nodeMap, edges);
  }

  // ─ Bounding box + offset ────────────────────────────────────────────────────
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodeMap.values()) {
    minX = Math.min(minX, n._x);
    minY = Math.min(minY, n._y);
    maxX = Math.max(maxX, n._x + n._m.w);
    maxY = Math.max(maxY, n._y + n._m.h);
  }

  // Rileva relazioni usate per la legenda
  const usedRelations = new Set(edges.map(e => e.relation || 'default').filter(r => r !== 'default'));
  const legendH = showLegend && usedRelations.size > 1 ? 36 + usedRelations.size * 20 : 0;

  const PAD   = 48;
  const titleH = title ? 42 : 12;
  const W = Math.max(480, maxX - minX + PAD * 2);
  const H = Math.max(200, maxY - minY + PAD * 2 + titleH + legendH);

  const offX = PAD - minX;
  const offY = PAD + titleH - minY;

  // ─ Root detection ────────────────────────────────────────────────────────────
  const hasParentSet = new Set(edges.map(e => e.to));
  const rootId = nodes.find(n => !hasParentSet.has(n.id))?.id || nodes[0]?.id;

  // ─ IDs univoci per defs ──────────────────────────────────────────────────────
  const uid = shortHash(spec.visualId || title || 'cm');

  // ─ SVG ───────────────────────────────────────────────────────────────────────
  const parts = [];

  // Header
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ` +
    `data-visual-id="${esc(spec.visualId || '')}" role="img" aria-label="${esc(title || 'Mappa Concettuale')}">`
  );
  parts.push(`  <title>${esc(title || 'Mappa Concettuale')}</title>`);

  // ─ Defs: gradienti + ombre + marker frecce ────────────────────────────────────
  parts.push('  <defs>');

  // Drop shadow filter
  parts.push(`
    <filter id="shadow-${uid}" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#00000020"/>
    </filter>`);

  // Gradienti per livelli
  LEVEL_PALETTE.forEach((col, i) => {
    parts.push(`
    <linearGradient id="grad-${uid}-${i}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${col.bg}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${_darken(col.bg, 0.12)}" stop-opacity="1"/>
    </linearGradient>`);
  });

  // Marker frecce per ogni tipo di relazione
  for (const [rel, style] of Object.entries(RELATION_STYLES)) {
    const mid = `arrow-${uid}-${rel}`;
    parts.push(`
    <marker id="${mid}" viewBox="0 0 10 7" refX="9" refY="3.5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 3.5 L 0 7 z" fill="${style.color}" opacity="0.9"/>
    </marker>`);
  }

  parts.push('  </defs>');

  // Background
  parts.push(`  <rect width="${W}" height="${H}" fill="#fafbfc" rx="4"/>`);

  // Bordo esterno sottile
  parts.push(`  <rect x="1" y="1" width="${W-2}" height="${H-2}" fill="none" stroke="#e2e8f0" stroke-width="1" rx="4"/>`);

  // Titolo
  if (title) {
    parts.push(`
  <text x="${W / 2}" y="28" text-anchor="middle"
    font-size="${FONT_SIZE_TITLE}" font-weight="700" fill="#0f172a"
    font-family="${FONT_FAMILY}" letter-spacing="-0.3">${esc(title)}</text>
  <line x1="${W * 0.2}" y1="36" x2="${W * 0.8}" y2="36" stroke="#e2e8f0" stroke-width="1"/>`);
  }

  // ─ ARCHI (prima dei nodi per stare sotto) ─────────────────────────────────────
  for (const edge of edges) {
    const src = nodeMap.get(edge.from);
    const dst = nodeMap.get(edge.to);
    if (!src || !dst) continue;

    const style  = RELATION_STYLES[edge.relation] || RELATION_STYLES.default;
    const markId = `arrow-${uid}-${edge.relation || 'default'}`;

    // Calcola exit point distribuito se il nodo ha più archi uscenti
    const outEdges = edges.filter(e => e.from === edge.from);
    const edgeIdx = outEdges.indexOf(edge);
    const numOut = outEdges.length;
    const spread = Math.min(src._m.w * 0.55, (numOut - 1) * 20);
    const startXOffset = numOut > 1 ? -spread / 2 + (edgeIdx / (numOut - 1)) * spread : 0;

    // Punto di uscita: centro-basso del nodo sorgente (con offset)
    const x1 = src._x + offX + src._m.w / 2 + startXOffset;
    const y1 = src._y + offY + src._m.h;
    // Punto di arrivo: centro-alto del nodo destinazione
    const x2 = dst._x + offX + dst._m.w / 2;
    const y2 = dst._y + offY;

    // Bezier cubica morbida
    const ctrl1Y = y1 + (y2 - y1) * 0.45;
    const ctrl2Y = y2 - (y2 - y1) * 0.45;
    const d = `M ${x1} ${y1} C ${x1} ${ctrl1Y}, ${x2} ${ctrl2Y}, ${x2} ${y2}`;

    const dashAttr = style.dash ? ` stroke-dasharray="${style.dash}"` : '';

    parts.push(
      `  <path id="edge-${esc(edge.from)}-${esc(edge.to)}" data-role="relation-edge" d="${d}" fill="none" stroke="${style.color}" stroke-width="${style.width}"` +
      ` marker-end="url(#${markId})" stroke-linecap="round"${dashAttr} opacity="0.85"/>`
    );

    // Etichetta arco (pill bianca opaca con ombra, per non far trasparire la curva sotto)
    const elabel = edgeLabel(edge);
    if (elabel) {
      const lx = (x1 + x2) / 2;
      const ly = (y1 + y2) / 2;
      const textW = Math.max(48, elabel.length * 6.5 + 14);
      parts.push(
        `  <rect id="edge-pill-${esc(edge.from)}-${esc(edge.to)}" data-role="relation-pill" x="${lx - textW / 2}" y="${ly - 9}" width="${textW}" height="18"` +
        ` fill="#ffffff" rx="9" stroke="${style.color}55" stroke-width="1" filter="url(#shadow-${uid})"/>`
      );
      parts.push(
        `  <text id="label-edge-${esc(edge.from)}-${esc(edge.to)}" data-role="relation-label" data-target="edge-${esc(edge.from)}-${esc(edge.to)}" x="${lx}" y="${ly + 3.5}" text-anchor="middle" font-size="${FONT_SIZE_EDGE}" font-weight="600"` +
        ` fill="${style.color}" font-family="${FONT_FAMILY}">${esc(elabel)}</text>`
      );
    }
  }

  // ─ NODI ──────────────────────────────────────────────────────────────────────
  for (const n of nodeMap.values()) {
    const x    = n._x + offX;
    const y    = n._y + offY;
    const w    = n._m.w;
    const h    = n._m.h;
    const lv   = Math.min(n._level || 0, LEVEL_PALETTE.length - 1);
    const isRoot = n.id === rootId;

    const col    = LEVEL_PALETTE[lv];
    const palCol = PALE_PALETTE[lv];
    const gradId = `grad-${uid}-${lv}`;

    // ─ Disegna nodo ─────────────────────────────────────────────────────────────
    if (isRoot) {
      // Root: gradiente scuro, ombra, border accent
      parts.push(
        `  <rect id="node-${esc(n.id)}" data-role="concept-node" x="${x}" y="${y}" width="${w}" height="${h}" rx="${NODE_RADIUS + 2}" ry="${NODE_RADIUS + 2}"` +
        ` fill="url(#${gradId})" stroke="${col.accent}" stroke-width="2"` +
        ` filter="url(#shadow-${uid})"/>`
      );
    } else if (lv === 1) {
      // Livello 1: nodo colorato ma più leggero
      parts.push(
        `  <rect id="node-${esc(n.id)}" data-role="concept-node" x="${x}" y="${y}" width="${w}" height="${h}" rx="${NODE_RADIUS}" ry="${NODE_RADIUS}"` +
        ` fill="url(#${gradId})" stroke="${col.accent}" stroke-width="1.5"` +
        ` filter="url(#shadow-${uid})"/>`
      );
    } else {
      // Livelli foglia: sfondo chiaro, bordo colorato
      parts.push(
        `  <rect id="node-${esc(n.id)}" data-role="concept-node" x="${x}" y="${y}" width="${w}" height="${h}" rx="${NODE_RADIUS - 1}" ry="${NODE_RADIUS - 1}"` +
        ` fill="${palCol.bg}" stroke="${palCol.border}" stroke-width="1.5"` +
        ` filter="url(#shadow-${uid})"/>`
      );
      // Barra laterale colorata (accent strip sinistra)
      parts.push(
        `  <rect id="node-accent-${esc(n.id)}" data-role="accent-strip" x="${x}" y="${y + 3}" width="3" height="${h - 6}"` +
        ` fill="${palCol.accent}" rx="1.5" ry="1.5"/>`
      );
    }

    // ─ Testo del nodo ────────────────────────────────────────────────────────────
    const fg      = isRoot || lv <= 1 ? col.text : palCol.text;
    const fSize   = isRoot ? FONT_SIZE_ROOT : (lv === 1 ? FONT_SIZE_L1 : FONT_SIZE_LEAF);
    const fWeight = isRoot ? '700' : (lv === 1 ? '600' : '500');
    const lines   = n._m.lines;
    const totalTextH = lines.length * LINE_H;
    const textStartY = n.category
      ? y + (h - totalTextH - 14) / 2 + LINE_H * 0.8
      : y + (h - totalTextH) / 2 + LINE_H * 0.8;

    for (let i = 0; i < lines.length; i++) {
      parts.push(
        `  <text id="label-node-${esc(n.id)}-${i}" data-role="concept-label" data-target="node-${esc(n.id)}" x="${x + w / 2}" y="${textStartY + i * LINE_H}"` +
        ` text-anchor="middle" fill="${fg}"` +
        ` font-size="${fSize}" font-weight="${fWeight}"` +
        ` font-family="${FONT_FAMILY}">${esc(lines[i])}</text>`
      );
    }

    // Badge categoria (se presente)
    if (n.category) {
      const catW = Math.min(w - 14, n.category.length * 6 + 14);
      const catX = x + w / 2 - catW / 2;
      const catY = y + h - 17;
      parts.push(
        `  <rect x="${catX}" y="${catY}" width="${catW}" height="13"` +
        ` fill="${isRoot || lv <= 1 ? col.accent + '35' : palCol.accent + '25'}" rx="5"` +
        ` stroke="${isRoot || lv <= 1 ? col.accent : palCol.accent}" stroke-width="0.8"/>`
      );
      parts.push(
        `  <text x="${x + w / 2}" y="${catY + 9.5}" text-anchor="middle"` +
        ` font-size="8.5" font-weight="600" fill="${fg}" font-family="${FONT_FAMILY}">${esc(n.category)}</text>`
      );
    }
  }

  // ─ LEGENDA ────────────────────────────────────────────────────────────────────
  if (legendH > 0) {
    const legX = PAD;
    const legY = H - legendH + 8;
    parts.push(
      `  <line x1="${W * 0.1}" y1="${legY - 4}" x2="${W * 0.9}" y2="${legY - 4}"` +
      ` stroke="#e2e8f0" stroke-width="1"/>`
    );
    parts.push(
      `  <text x="${legX}" y="${legY + 12}" font-size="9" fill="#64748b"` +
      ` font-family="${FONT_FAMILY}" font-weight="600">Legenda relazioni:</text>`
    );
    let li = 0;
    for (const rel of usedRelations) {
      const style = RELATION_STYLES[rel] || RELATION_STYLES.default;
      const ly = legY + 28 + li * 18;
      const dashAttr = style.dash ? ` stroke-dasharray="${style.dash}"` : '';
      parts.push(
        `  <line x1="${legX}" y1="${ly - 5}" x2="${legX + 28}" y2="${ly - 5}"` +
        ` stroke="${style.color}" stroke-width="1.5"${dashAttr}/>`
      );
      parts.push(
        `  <polygon points="${legX + 28},${ly - 5} ${legX + 22},${ly - 8} ${legX + 22},${ly - 2}"` +
        ` fill="${style.color}"/>`
      );
      parts.push(
        `  <text x="${legX + 34}" y="${ly}" font-size="9" fill="#475569"` +
        ` font-family="${FONT_FAMILY}">${esc(style.label || rel)}</text>`
      );
      li++;
    }
  }

  // Footer brand sottile
  parts.push(
    `  <text x="${W - 10}" y="${H - 6}" text-anchor="end"` +
    ` font-size="7.5" fill="#cbd5e1" font-family="${FONT_FAMILY}">StudyGenius</text>`
  );

  parts.push('</svg>');
  return parts.join('\n').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
}

// ─── Costruttore da ASCII tree ────────────────────────────────────────────────
/**
 * Converte un albero ASCII (├──, └──, │) in una VisualSpec concept_map
 * e la renderizza come SVG premium.
 *
 * @param {string} asciiText  Testo con albero ASCII
 * @param {string} rootTitle  Titolo radice
 * @returns {string}          SVG string
 */
function renderAsciiTreeAsConceptMap(asciiText, rootTitle = 'Struttura Gerarchica') {
  const nodes = [];
  const edges = [];

  const lines = asciiText.split('\n').filter(l => l.trim().length > 0);

  // Estrae il titolo radice se la prima riga non ha caratteri albero
  let title = rootTitle;
  let startIdx = 0;
  if (lines.length > 0 && !/[├└│─]/.test(lines[0])) {
    title = lines[0].trim().replace(/^#+\s*/, '');
    startIdx = 1;
  }

  // Nodo radice
  const rootId = 'root_0';
  nodes.push({ id: rootId, label: [{ kind: 'text', value: title }] });

  // Stack per tracciare l'antenato corrente per ogni profondità (indice 0 = root)
  const depthStack = [rootId];

  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i];

    // Calcola livello esatto da prefisso (├── / └── preceduto da '│   ' o '    ')
    const m = rawLine.match(/^([│\s]*)[├└]──/);
    const prefix = m ? m[1] : '';
    const norm = prefix.replace(/│\s{1,3}/g, '    ').replace(/│/g, '  ');
    const level = Math.floor(norm.length / 3) + 1;

    // Pulisce il testo
    const text = rawLine
      .replace(/^[│\s]*[├└]──\s*/, '')
      .replace(/^[│\s─]+/, '')
      .trim();

    if (!text) continue;

    const nodeId = `n_${i}`;
    nodes.push({ id: nodeId, label: [{ kind: 'text', value: text }] });

    // Trova il parent corretto (il nodo al livello level - 1 nello stack)
    const parentId = depthStack[level - 1] || rootId;
    depthStack[level] = nodeId;
    depthStack.length = level + 1; // rimuovi i livelli più profondi

    edges.push({ id: `e_${i}`, from: parentId, to: nodeId, relation: 'classification' });
  }

  const spec = {
    schemaVersion: '1.0',
    visualId:      `ascii_map_${shortHash(asciiText.slice(0, 50))}`,
    kind:          'concept_map',
    title,
    payload:       { nodes, edges, layoutIntent: 'top_down', showLegend: false },
  };

  return renderConceptMap(spec);
}

// ─── Helper privato: scurisce un colore hex ───────────────────────────────────
function _darken(hex, amount = 0.1) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r   = Math.max(0, Math.min(255, (num >> 16) - Math.round(255 * amount)));
  const g   = Math.max(0, Math.min(255, ((num >> 8) & 0xff) - Math.round(255 * amount)));
  const b   = Math.max(0, Math.min(255, (num & 0xff) - Math.round(255 * amount)));
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

module.exports = {
  renderConceptMap,
  renderAsciiTreeAsConceptMap,
  measureNode,
};
