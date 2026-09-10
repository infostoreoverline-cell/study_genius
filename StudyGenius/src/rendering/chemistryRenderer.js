/**
 * StudyGenius Academic Intelligence System
 * src/rendering/chemistryRenderer.js
 *
 * Chemistry SVG Renderer — Renderizzatore deterministico per chimica organometallica.
 *
 * Non dipende da tool esterni (no RDKit, no ChemFig, no pdflatex).
 * Riceve una VisualSpec JSON e produce SVG inline editorialmente corretto.
 *
 * Renderers:
 * 1. renderCoordinationComplex(spec) — square planar / ottaedrico / tetraedrico
 * 2. renderElectronPathway(spec)     — pathway 16e⁻/18e⁻ con badge
 * 3. renderCatalyticCycle(spec)      — ciclo circolare con step tipizzati
 * 4. renderReactionMechanism(spec)   — schema frecce push elettronico
 * 5. renderTransEffectSeries(spec)   — serie influenza trans orizzontale
 * 6. renderReactionNetwork(spec)     — grafo orientato multi-prodotto
 *
 * Fallback chain per tutti i renderer:
 * 1. SVG deterministico da VisualSpec (primario)
 * 2. SVG schematico semplificato (se spec incompleta)
 * 3. Tabella tipografica editoriale (NEVER ASCII)
 */

'use strict';

const { validateVisualSpec } = require('../visual/visualArchitect');

// ============================================================================
// COSTANTI DI STILE EDITORIALE
// ============================================================================

const STYLE = {
  FONT_FAMILY: 'STIX Two Math, STIX Two Text, Georgia, serif',
  FONT_SANS: 'Inter, Helvetica Neue, Arial, sans-serif',
  COLOR_METAL: '#2563eb',
  COLOR_LIGAND: '#1e293b',
  COLOR_BOND: '#334155',
  COLOR_OX_ADD: '#ea580c',     // arancione — addizione ossidativa
  COLOR_RED_ELIM: '#2563eb',   // blu — eliminazione riduttiva
  COLOR_INSERTION: '#16a34a',  // verde — inserzione/migrazione
  COLOR_SUBST: '#7c3aed',      // viola — sostituzione ligandistica
  COLOR_EQUIL: '#0891b2',      // ciano — equilibrio
  COLOR_ELECTRON_16: '#dc2626', // rosso — specie 16e⁻ (insatura, reattiva)
  COLOR_ELECTRON_18: '#166534', // verde scuro — specie 18e⁻ (satura)
  COLOR_ELECTRON_14: '#92400e', // ambra — specie 14e⁻ (molto insatura)
  COLOR_TRANS_HIGH: '#b91c1c',
  COLOR_TRANS_LOW: '#1d4ed8',
  COLOR_NODE: '#f1f5f9',
  COLOR_NODE_BORDER: '#475569',
  BADGE_R: 12,
  NODE_R: 28,
  METAL_R: 22,
  BOND_WIDTH: 2,
  ARROW_SIZE: 7,
  SVG_STYLE: `
    .chem-metal { fill: #dbeafe; stroke: #2563eb; stroke-width: 2; }
    .chem-ligand { fill: #f1f5f9; stroke: #475569; stroke-width: 1.5; }
    .chem-bond { stroke: #334155; stroke-width: 2; fill: none; }
    .chem-arrow { fill: none; marker-end: url(#arrow-default); }
    .chem-arrow-oa { stroke: #ea580c; marker-end: url(#arrow-oa); }
    .chem-arrow-re { stroke: #2563eb; marker-end: url(#arrow-re); }
    .chem-arrow-ins { stroke: #16a34a; marker-end: url(#arrow-ins); }
    .chem-arrow-sub { stroke: #7c3aed; marker-end: url(#arrow-sub); }
    .chem-arrow-eq  { stroke: #0891b2; stroke-dasharray: 5 3; marker-end: url(#arrow-eq); }
    .chem-badge-16 { fill: #fef2f2; stroke: #dc2626; }
    .chem-badge-18 { fill: #f0fdf4; stroke: #166534; }
    .chem-badge-14 { fill: #fffbeb; stroke: #92400e; }
    .chem-label { font-family: STIX Two Math, Georgia, serif; }
    .chem-caption { font-family: Inter, Arial, sans-serif; font-size: 11px; fill: #64748b; }
  `
};

// ============================================================================
// HELPER: DEFS SVG (marcatori frecce per tipo)
// ============================================================================

function buildDefs() {
  const arrowTypes = [
    { id: 'arrow-default', color: '#334155' },
    { id: 'arrow-oa', color: '#ea580c' },
    { id: 'arrow-re', color: '#2563eb' },
    { id: 'arrow-ins', color: '#16a34a' },
    { id: 'arrow-sub', color: '#7c3aed' },
    { id: 'arrow-eq', color: '#0891b2' },
    { id: 'arrow-trans', color: '#b91c1c', dasharray: '5 3' }
  ];
  const markers = arrowTypes.map(({ id, color }) =>
    `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="${color}"/>
    </marker>`
  ).join('\n    ');
  return `<defs>\n  <style>${STYLE.SVG_STYLE}</style>\n    ${markers}\n  </defs>`;
}

// ============================================================================
// HELPER: freccia SVG con tipo semantico
// ============================================================================

function arrowClass(type) {
  switch (type) {
    case 'oxidative_addition': return 'chem-arrow chem-arrow-oa';
    case 'reductive_elimination': return 'chem-arrow chem-arrow-re';
    case 'migratory_insertion':
    case 'beta_hydride_elimination': return 'chem-arrow chem-arrow-ins';
    case 'ligand_substitution':
    case 'coordination':
    case 'decoordination': return 'chem-arrow chem-arrow-sub';
    case 'equilibrium': return 'chem-arrow chem-arrow-eq';
    case 'trans_influence': return 'chem-arrow';
    default: return 'chem-arrow';
  }
}

function arrowMarker(type) {
  switch (type) {
    case 'oxidative_addition': return 'url(#arrow-oa)';
    case 'reductive_elimination': return 'url(#arrow-re)';
    case 'migratory_insertion':
    case 'beta_hydride_elimination': return 'url(#arrow-ins)';
    case 'ligand_substitution':
    case 'coordination':
    case 'decoordination': return 'url(#arrow-sub)';
    case 'equilibrium': return 'url(#arrow-eq)';
    default: return 'url(#arrow-default)';
  }
}

function drawArrow(x1, y1, x2, y2, type, label = '', curved = false) {
  const cls = arrowClass(type);
  const marker = arrowMarker(type);
  let path;
  if (curved) {
    const mx = (x1 + x2) / 2;
    const my = Math.min(y1, y2) - 30;
    path = `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
  } else {
    path = `M${x1},${y1} L${x2},${y2}`;
  }
  const labelEl = label
    ? `<text x="${(x1+x2)/2}" y="${(y1+y2)/2 - 5}" class="chem-caption" text-anchor="middle">${escXml(label)}</text>`
    : '';
  return `<path d="${path}" class="${cls}" stroke-width="1.8" fill="none" marker-end="${marker}"/>${labelEl}`;
}

function escXml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================================
// 1. COORDINATION COMPLEX RENDERER
// ============================================================================

/**
 * Geometrie standard per complessi di coordinazione.
 * Produce posizioni (x, y) normalizzate per ogni slot.
 */
function getGeometrySlots(geometry, cx, cy, r) {
  switch (geometry) {
    case 'square_planar':
      return [
        { id: 'N', x: cx, y: cy - r },
        { id: 'E', x: cx + r, y: cy },
        { id: 'S', x: cx, y: cy + r },
        { id: 'W', x: cx - r, y: cy }
      ];
    case 'octahedral': {
      const r2 = r * 0.8;
      return [
        { id: 'N', x: cx, y: cy - r },
        { id: 'E', x: cx + r, y: cy },
        { id: 'S', x: cx, y: cy + r },
        { id: 'W', x: cx - r, y: cy },
        { id: 'axial_1', x: cx - r2 * 0.5, y: cy - r2 * 0.5 },
        { id: 'axial_2', x: cx + r2 * 0.5, y: cy + r2 * 0.5 }
      ];
    }
    case 'tetrahedral':
      return [
        { id: 'NE', x: cx + r * 0.7, y: cy - r * 0.7 },
        { id: 'NW', x: cx - r * 0.7, y: cy - r * 0.7 },
        { id: 'SE', x: cx + r * 0.7, y: cy + r * 0.7 },
        { id: 'SW', x: cx - r * 0.7, y: cy + r * 0.7 }
      ];
    case 'linear':
      return [
        { id: 'N', x: cx, y: cy - r },
        { id: 'S', x: cx, y: cy + r }
      ];
    case 'trigonal_bipyramidal':
      return [
        { id: 'axial_1', x: cx, y: cy - r },
        { id: 'axial_2', x: cx, y: cy + r },
        { id: 'equatorial_1', x: cx + r * 0.95, y: cy },
        { id: 'equatorial_2', x: cx - r * 0.95 * 0.5, y: cy - r * 0.95 * 0.866 },
        { id: 'equatorial_3', x: cx - r * 0.95 * 0.5, y: cy + r * 0.95 * 0.866 }
      ];
    default:
      // Fallback: distribuzione circolare uniforme
      return Array.from({ length: 4 }, (_, i) => {
        const angle = (i / 4) * 2 * Math.PI - Math.PI / 2;
        return { id: `pos_${i}`, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      });
  }
}

function renderCoordinationComplex(spec) {
  const validation = validateVisualSpec(spec);

  const cx = 180, cy = 160, bondLen = 75;
  const W = 360, H = 320;

  const metal = (spec.entities || []).find(e => e.role === 'metal_center') || { label: '?', geometry: 'square_planar' };
  const geometry = metal.geometry || 'square_planar';
  const ligands = spec.ligands || [];
  const slots = getGeometrySlots(geometry, cx, cy, bondLen);

  let elements = [];

  // Disegna bond (linee)
  for (let i = 0; i < Math.min(ligands.length, slots.length); i++) {
    const s = slots[i];
    const isHighTransInfluence = (ligands[i]?.transInfluence || 0) >= 7;
    const strokeStyle = isHighTransInfluence ? 'stroke:#b91c1c;stroke-width:2.5;' : '';
    elements.push(`<line x1="${cx}" y1="${cy}" x2="${s.x}" y2="${s.y}" class="chem-bond" style="${strokeStyle}"/>`);
  }

  // Disegna ligandi
  for (let i = 0; i < Math.min(ligands.length, slots.length); i++) {
    const s = slots[i];
    const lig = ligands[i];
    const formula = escXml(lig.formula || '?');
    const hasHighInfluence = (lig.transInfluence || 0) >= 7;
    const ligColor = hasHighInfluence ? '#fef2f2' : '#f1f5f9';
    const ligBorder = hasHighInfluence ? '#b91c1c' : '#475569';
    elements.push(`
    <circle cx="${s.x}" cy="${s.y}" r="20" fill="${ligColor}" stroke="${ligBorder}" stroke-width="1.5"/>
    <text x="${s.x}" y="${s.y + 5}" text-anchor="middle" font-family="${STYLE.FONT_FAMILY}" font-size="13" fill="${STYLE.COLOR_LIGAND}">${formula}</text>`);
    // Trans influence annotation
    if (hasHighInfluence) {
      elements.push(`<text x="${s.x}" y="${s.y + 22}" text-anchor="middle" class="chem-caption" fill="#b91c1c">TI=${lig.transInfluence}</text>`);
    }
  }

  // Metallo centrale
  const oxState = metal.oxidationState != null ? `(${metal.oxidationState > 0 ? '+' : ''}${metal.oxidationState})` : '';
  elements.push(`
  <circle cx="${cx}" cy="${cy}" r="${STYLE.METAL_R}" class="chem-metal"/>
  <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-family="${STYLE.FONT_FAMILY}" font-size="14" font-weight="bold" fill="${STYLE.COLOR_METAL}">${escXml(metal.label)}${escXml(oxState)}</text>`);

  // Badge conteggio elettronico per metallo/complesso
  const eCount = metal.electronCount != null ? metal.electronCount : spec.electronCount;
  if (eCount != null) {
    const badgeCol = electronBadgeColor(eCount);
    elements.push(`
    <rect x="${cx + 28}" y="${cy - 34}" width="38" height="18" rx="4" fill="#f8fafc" stroke="${badgeCol}" stroke-width="1.5"/>
    <text x="${cx + 47}" y="${cy - 21}" text-anchor="middle" font-family="${STYLE.FONT_SANS}" font-size="10" font-weight="bold" fill="${badgeCol}">${eCount}e⁻</text>`);
  }

  // Geometria label
  elements.push(`<text x="${W/2}" y="${H - 10}" text-anchor="middle" class="chem-caption" fill="#94a3b8">${escXml(geometry.replace('_', ' '))}</text>`);

  // Warning se validazione fallisce
  if (!validation.valid) {
    elements.push(`<text x="10" y="15" class="chem-caption" fill="#dc2626">⚠ ${escXml(validation.errors[0] || 'Schema parziale')}</text>`);
  }

  const svgBody = elements.join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escXml(spec.didacticFocus || 'Complesso di coordinazione')}">
  ${buildDefs()}
  <rect width="${W}" height="${H}" fill="white"/>
  ${svgBody}
</svg>`;
}

// ============================================================================
// 2. ELECTRON PATHWAY RENDERER
// ============================================================================

function electronBadgeClass(count) {
  if (count <= 14) return 'chem-badge-14';
  if (count === 16) return 'chem-badge-16';
  return 'chem-badge-18';
}

function electronBadgeColor(count) {
  if (count <= 14) return '#92400e';
  if (count === 16) return '#dc2626';
  return '#166534';
}

function renderElectronPathway(spec) {
  const entities = spec.entities || [];
  const arrows = spec.arrows || [];
  const annotations = spec.annotations || [];

  const NODE_W = 90, NODE_H = 48, PADDING = 30, GAP = 60;
  const totalW = entities.length * (NODE_W + GAP) + PADDING * 2;
  const H = 180;
  const nodeY = H / 2 - NODE_H / 2;

  const nodePositions = new Map();
  entities.forEach((e, i) => {
    const x = PADDING + i * (NODE_W + GAP);
    nodePositions.set(e.id, { x, y: nodeY, cx: x + NODE_W / 2, cy: nodeY + NODE_H / 2 });
  });

  let elements = [];

  // Frecce
  for (const arr of arrows) {
    const from = nodePositions.get(arr.from);
    const to = nodePositions.get(arr.to);
    if (!from || !to) continue;
    const x1 = from.x + NODE_W;
    const y1 = from.cy;
    const x2 = to.x;
    const y2 = to.cy;
    elements.push(drawArrow(x1, y1, x2, y2, arr.type, arr.label, arr.curved));
  }

  // Nodi
  for (const e of entities) {
    const pos = nodePositions.get(e.id);
    if (!pos) continue;
    const hasCount = e.electronCount != null;
    const badgeCls = hasCount ? electronBadgeClass(e.electronCount) : '';
    const badgeColor = hasCount ? electronBadgeColor(e.electronCount) : '#475569';
    const isActive = e.electronCount === 16 || e.electronCount === 14;
    const borderColor = isActive ? '#dc2626' : '#475569';
    const fillColor = isActive ? '#fef2f2' : '#f8fafc';

    elements.push(`
    <rect x="${pos.x}" y="${pos.y}" width="${NODE_W}" height="${NODE_H}" rx="6" fill="${fillColor}" stroke="${borderColor}" stroke-width="${isActive ? 2 : 1.5}"/>
    <text x="${pos.cx}" y="${pos.cy + 1}" text-anchor="middle" dominant-baseline="middle" font-family="${STYLE.FONT_FAMILY}" font-size="11" fill="#1e293b">${escXml(e.label)}</text>`);

    // Badge electron count
    if (hasCount) {
      const bx = pos.x + NODE_W - 2;
      const by = pos.y - 2;
      elements.push(`
      <circle cx="${bx}" cy="${by}" r="${STYLE.BADGE_R}" class="${badgeCls}" stroke-width="1.5"/>
      <text x="${bx}" y="${by + 4}" text-anchor="middle" font-family="${STYLE.FONT_SANS}" font-size="9" font-weight="bold" fill="${badgeColor}">${e.electronCount}e⁻</text>`);
    }
  }

  // Annotazioni
  for (const ann of annotations) {
    const pos = nodePositions.get(ann.entityId);
    if (!pos) continue;
    elements.push(`<text x="${pos.cx}" y="${pos.y + NODE_H + 14}" text-anchor="middle" class="chem-caption" fill="#64748b">${escXml(ann.text)}</text>`);
  }

  const svgBody = elements.join('\n');
  const W = Math.max(totalW, 300);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H + 30}" role="img" aria-label="${escXml(spec.didacticFocus || 'Pathway elettronico')}">
  ${buildDefs()}
  <rect width="${W}" height="${H + 30}" fill="white"/>
  ${svgBody}
</svg>`;
}

// ============================================================================
// 3. CATALYTIC CYCLE RENDERER
// ============================================================================

function renderCatalyticCycle(spec) {
  const entities = spec.entities || [];
  const arrows = spec.arrows || [];
  const n = entities.length;
  const CX = 200, CY = 200, R = 130;
  const W = 400, H = 400;

  const nodePositions = new Map();
  entities.forEach((e, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const x = CX + R * Math.cos(angle);
    const y = CY + R * Math.sin(angle);
    nodePositions.set(e.id, { x, y });
  });

  let elements = [];

  // Cerchio guida (tratteggiato)
  elements.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 3"/>`);

  // Catalizzatore in centro
  const catalyst = entities.find(e => e.role === 'catalyst');
  if (catalyst) {
    elements.push(`
    <circle cx="${CX}" cy="${CY}" r="22" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
    <text x="${CX}" y="${CY + 5}" text-anchor="middle" font-family="${STYLE.FONT_FAMILY}" font-size="12" fill="${STYLE.COLOR_METAL}">${escXml(catalyst.label)}</text>`);
  }

  // Frecce tra step
  for (const arr of arrows) {
    const from = nodePositions.get(arr.from);
    const to = nodePositions.get(arr.to);
    if (!from || !to) continue;
    // Offset per evitare sovrapposizione con i nodi
    const dx = to.x - from.x, dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nr = 26 / dist;
    const x1 = from.x + dx * nr, y1 = from.y + dy * nr;
    const x2 = to.x - dx * nr, y2 = to.y - dy * nr;
    elements.push(drawArrow(x1, y1, x2, y2, arr.type, arr.label, arr.curved));
  }

  // Nodi
  for (const e of entities) {
    const pos = nodePositions.get(e.id);
    if (!pos || e.role === 'catalyst') continue;
    const isIntermediate = e.role === 'intermediate';
    const fill = isIntermediate ? '#f8fafc' : (e.role === 'substrate' ? '#ecfdf5' : '#fef3c7');
    const stroke = isIntermediate ? '#475569' : (e.role === 'substrate' ? '#166534' : '#92400e');
    elements.push(`
    <circle cx="${pos.x}" cy="${pos.y}" r="${STYLE.NODE_R}" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/>
    <text x="${pos.x}" y="${pos.y + 5}" text-anchor="middle" font-family="${STYLE.FONT_FAMILY}" font-size="11" fill="#1e293b">${escXml(e.label)}</text>`);
    if (e.oxidationState != null) {
      elements.push(`<text x="${pos.x + STYLE.NODE_R - 4}" y="${pos.y - STYLE.NODE_R + 6}" text-anchor="middle" font-family="${STYLE.FONT_SANS}" font-size="9" fill="#7c3aed">${e.oxidationState > 0 ? '+' : ''}${e.oxidationState}</text>`);
    }
  }

  const svgBody = elements.join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escXml(spec.didacticFocus || 'Ciclo catalitico')}">
  ${buildDefs()}
  <rect width="${W}" height="${H}" fill="white"/>
  ${svgBody}
</svg>`;
}

// ============================================================================
// 4. REACTION MECHANISM RENDERER (frecce push)
// ============================================================================

function renderReactionMechanism(spec) {
  const entities = spec.entities || [];
  const arrows = spec.arrows || [];
  const n = entities.length;
  const NODE_W = 80, NODE_H = 42, GAP = 70;
  const cols = Math.min(n, 4);
  const rows = Math.ceil(n / cols);
  const W = cols * (NODE_W + GAP) + 60;
  const H = rows * (NODE_H + 80) + 60;

  const nodePositions = new Map();
  entities.forEach((e, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 30 + col * (NODE_W + GAP);
    const y = 30 + row * (NODE_H + 80);
    nodePositions.set(e.id, { x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2 });
  });

  let elements = [];

  // Frecce
  for (const arr of arrows) {
    const from = nodePositions.get(arr.from);
    const to = nodePositions.get(arr.to);
    if (!from || !to) continue;
    const x1 = from.x + NODE_W;
    const y1 = from.cy;
    const x2 = to.x;
    const y2 = to.cy;
    elements.push(drawArrow(x1, y1, x2, y2, arr.type, arr.label, false));
  }

  // Nodi
  for (const e of entities) {
    const pos = nodePositions.get(e.id);
    if (!pos) continue;
    const hasCount = e.electronCount != null;
    const isActive = e.electronCount === 16 || e.electronCount === 14;
    const fill = isActive ? '#fef2f2' : '#f8fafc';
    const stroke = isActive ? '#dc2626' : '#475569';

    elements.push(`
    <rect x="${pos.x}" y="${pos.y}" width="${NODE_W}" height="${NODE_H}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    <text x="${pos.cx}" y="${pos.cy + 1}" text-anchor="middle" dominant-baseline="middle" font-family="${STYLE.FONT_FAMILY}" font-size="11" fill="#1e293b">${escXml(e.label)}</text>`);

    if (e.oxidationState != null) {
      elements.push(`<text x="${pos.x + NODE_W - 4}" y="${pos.y + 12}" text-anchor="end" font-family="${STYLE.FONT_SANS}" font-size="9" fill="#7c3aed">${e.oxidationState > 0 ? '+' : ''}${e.oxidationState}</text>`);
    }
    if (hasCount) {
      const bx = pos.x - 2, by = pos.y - 2;
      elements.push(`
      <circle cx="${bx}" cy="${by}" r="10" class="${electronBadgeClass(e.electronCount)}" stroke-width="1.2"/>
      <text x="${bx}" y="${by + 4}" text-anchor="middle" font-family="${STYLE.FONT_SANS}" font-size="8" fill="${electronBadgeColor(e.electronCount)}">${e.electronCount}e</text>`);
    }
  }

  // Legenda
  const legendItems = [
    { color: STYLE.COLOR_OX_ADD, label: 'Add. ossidativa' },
    { color: STYLE.COLOR_RED_ELIM, label: 'Elim. riduttiva' },
    { color: STYLE.COLOR_INSERTION, label: 'Inserzione' },
    { color: STYLE.COLOR_SUBST, label: 'Sostituzione' }
  ];
  legendItems.forEach((item, i) => {
    const lx = 10 + i * 95;
    const ly = H - 18;
    elements.push(`<circle cx="${lx + 6}" cy="${ly}" r="5" fill="${item.color}"/>`);
    elements.push(`<text x="${lx + 14}" y="${ly + 4}" font-family="${STYLE.FONT_SANS}" font-size="9" fill="#64748b">${escXml(item.label)}</text>`);
  });

  const svgBody = elements.join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.max(W, 400)} ${Math.max(H, 200)}" role="img" aria-label="${escXml(spec.didacticFocus || 'Meccanismo di reazione')}">
  ${buildDefs()}
  <rect width="${Math.max(W, 400)}" height="${Math.max(H, 200)}" fill="white"/>
  ${svgBody}
</svg>`;
}

// ============================================================================
// 5. TRANS EFFECT SERIES RENDERER
// ============================================================================

function renderTransEffectSeries(spec) {
  const list = (spec.ligands && spec.ligands.length > 0) ? spec.ligands : (spec.entities || []);
  const ligands = list.slice().sort((a, b) => (b.transInfluence || 0) - (a.transInfluence || 0));
  const W = Math.max(ligands.length * 70 + 60, 400);
  const H = 140;
  const startX = 30, axisY = 80;
  const step = (W - 60) / Math.max(ligands.length - 1, 1);

  let elements = [];

  // Asse
  elements.push(`<line x1="${startX}" y1="${axisY}" x2="${W - 30}" y2="${axisY}" stroke="#334155" stroke-width="2" marker-end="url(#arrow-default)"/>`);
  elements.push(`<text x="${startX}" y="${axisY + 20}" class="chem-caption" fill="#b91c1c">Influenza alta</text>`);
  elements.push(`<text x="${W - 60}" y="${axisY + 20}" class="chem-caption" fill="#1d4ed8">Influenza bassa</text>`);

  ligands.forEach((lig, i) => {
    const x = startX + i * step;
    const transVal = lig.transInfluence || 0;
    const ratio = transVal / 10;
    // Colore interpolato rosso (alta) → blu (bassa)
    const r = Math.round(185 * ratio + 29 * (1 - ratio));
    const g = Math.round(28 * ratio + 78 * (1 - ratio));
    const b = Math.round(28 * ratio + 216 * (1 - ratio));
    const color = `rgb(${r},${g},${b})`;
    const name = lig.formula || lig.label || '?';

    elements.push(`
    <circle cx="${x}" cy="${axisY}" r="8" fill="${color}" opacity="0.85"/>
    <text x="${x}" y="${axisY - 16}" text-anchor="middle" font-family="${STYLE.FONT_FAMILY}" font-size="13" fill="#1e293b">${escXml(name)}</text>
    <text x="${x}" y="${axisY + 36}" text-anchor="middle" class="chem-caption" fill="${color}">${transVal.toFixed(1)}</text>`);
  });

  elements.push(`<text x="${W/2}" y="20" text-anchor="middle" font-family="${STYLE.FONT_SANS}" font-size="13" font-weight="600" fill="#1e293b">Serie di Influenza Trans</text>`);

  const svgBody = elements.join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escXml(spec.didacticFocus || 'Serie effetto trans')}">
  ${buildDefs()}
  <rect width="${W}" height="${H}" fill="white"/>
  ${svgBody}
</svg>`;
}

// ============================================================================
// 6. REACTION NETWORK RENDERER
// ============================================================================

function renderReactionNetwork(spec) {
  const entities = spec.entities || [];
  const arrows = spec.arrows || [];
  const n = entities.length;
  const R_LAYOUT = 140;
  const CX = 220, CY = 180;
  const W = 440, H = 360;

  const nodePositions = new Map();
  entities.forEach((e, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const x = CX + R_LAYOUT * Math.cos(angle);
    const y = CY + R_LAYOUT * Math.sin(angle);
    nodePositions.set(e.id, { x, y });
  });

  let elements = [];

  // Frecce
  for (const arr of arrows) {
    const from = nodePositions.get(arr.from);
    const to = nodePositions.get(arr.to);
    if (!from || !to) continue;
    const dx = to.x - from.x, dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nr = 24 / dist;
    const x1 = from.x + dx * nr, y1 = from.y + dy * nr;
    const x2 = to.x - dx * nr, y2 = to.y - dy * nr;
    elements.push(drawArrow(x1, y1, x2, y2, arr.type || 'reaction', arr.label, false));
  }

  // Nodi
  for (const e of entities) {
    const pos = nodePositions.get(e.id);
    if (!pos) continue;
    elements.push(`
    <circle cx="${pos.x}" cy="${pos.y}" r="26" fill="${STYLE.COLOR_NODE}" stroke="${STYLE.COLOR_NODE_BORDER}" stroke-width="1.8"/>
    <text x="${pos.x}" y="${pos.y + 5}" text-anchor="middle" font-family="${STYLE.FONT_FAMILY}" font-size="12" fill="#1e293b">${escXml(e.label)}</text>`);
  }

  elements.push(`<text x="${W/2}" y="18" text-anchor="middle" font-family="${STYLE.FONT_SANS}" font-size="13" font-weight="600" fill="#1e293b">Rete di Trasformazione</text>`);

  const svgBody = elements.join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escXml(spec.didacticFocus || 'Rete di trasformazione')}">
  ${buildDefs()}
  <rect width="${W}" height="${H}" fill="white"/>
  ${svgBody}
</svg>`;
}

// ============================================================================
// FALLBACK TIPOGRAFICO (mai ASCII, mai codice sorgente)
// ============================================================================

/**
 * Fallback SVG schematico per quando la spec è parziale o incompleta.
 * Produce un box editoriale con il focus didattico e le entità in lista.
 * NON mostra mai codice sorgente o ASCII art.
 */
function renderFallbackTypographic(spec) {
  const title = escXml(spec?.didacticFocus || 'Schema non disponibile');
  const specType = escXml(spec?.specType || 'schema');
  const entities = spec?.entities || spec?.ligands || [];
  const W = 380, LINE_H = 22;
  const listH = Math.max(entities.length * LINE_H + 60, 80);
  const H = listH + 40;

  const rows = entities.slice(0, 8).map((e, i) => {
    const label = escXml((e.label || e.formula || '?'));
    const count = e.electronCount != null ? ` [${e.electronCount}e⁻]` : '';
    return `<text x="20" y="${70 + i * LINE_H}" font-family="${STYLE.FONT_SANS}" font-size="12" fill="#334155">• ${label}${escXml(count)}</text>`;
  }).join('\n');

  const more = entities.length > 8 ? `<text x="20" y="${70 + 8 * LINE_H}" class="chem-caption" fill="#94a3b8">... e altri ${entities.length - 8} elementi</text>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" class="academic-noble-degradation academic-table" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">
  ${buildDefs()}
  <rect width="${W}" height="${H}" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
  <rect x="0" y="0" width="${W}" height="36" rx="8" fill="#e2e8f0"/>
  <text x="14" y="23" font-family="${STYLE.FONT_SANS}" font-size="13" font-weight="600" fill="#1e293b">${title}</text>
  <text x="${W-10}" y="23" text-anchor="end" font-family="${STYLE.FONT_SANS}" font-size="10" fill="#94a3b8">${specType}</text>
  ${rows}
  ${more}
</svg>`;
}

// ============================================================================
// DISPATCHER PRINCIPALE
// ============================================================================

/**
 * Dispatcher principale: seleziona il renderer corretto dalla VisualSpec.
 * Implementa la fallback chain: SVG deterministico → SVG schematico → tabella tipografica.
 *
 * @param {Object} spec VisualSpec validata
 * @returns {string} SVG inline pronto per embedding nel documento HTML
 */
function renderFromVisualSpec(spec) {
  if (!spec) return renderFallbackTypographic(null);

  const { valid } = validateVisualSpec(spec);

  try {
    switch (spec.specType) {
      case 'coordination_complex':
        return renderCoordinationComplex(spec);
      case 'electron_count_pathway':
        return renderElectronPathway(spec);
      case 'catalytic_cycle_organometallic':
      case 'cyclic_mechanism':
        return renderCatalyticCycle(spec);
      case 'reaction_mechanism':
        return renderReactionMechanism(spec);
      case 'trans_effect_diagram':
        return renderTransEffectSeries(spec);
      case 'reaction_network':
        return renderReactionNetwork(spec);
      default:
        // Per tipi non chimici, il dispatcher originale (diagramEngine) gestisce
        return null;
    }
  } catch (err) {
    // Fallback tipografico su errore interno
    return renderFallbackTypographic(spec);
  }
}

module.exports = {
  renderFromVisualSpec,
  renderCoordinationComplex,
  renderElectronPathway,
  renderCatalyticCycle,
  renderReactionMechanism,
  renderTransEffectSeries,
  renderReactionNetwork,
  renderFallbackTypographic
};
