/**
 * StudyGenius Web App - Client-Side Concept Map & Visual Spec Renderer
 * Rende deterministicamente i blocchi json:visual-spec (kind: concept_map) in SVG vettoriali puri nel browser.
 */

(function (window) {
  'use strict';

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

  const RELATION_STYLES = {
    classification: { color: '#3b82f6', dash: '', label: 'classificazione', width: 1.8 },
    dependency: { color: '#7c3aed', dash: '6 3', label: 'dipendenza', width: 1.6 },
    transformation: { color: '#059669', dash: '2 2', label: 'trasformazione', width: 1.6 },
    sequence: { color: '#0891b2', dash: '', label: 'sequenza', width: 1.8 },
    comparison: { color: '#d97706', dash: '5 2 2 2', label: 'confronto', width: 1.5 },
    default: { color: '#64748b', dash: '', label: '', width: 1.5 },
  };

  const FONT_FAMILY = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif";
  const FONT_SIZE_ROOT = 14;
  const FONT_SIZE_L1 = 13;
  const FONT_SIZE_LEAF = 12;
  const FONT_SIZE_EDGE = 10;
  const FONT_SIZE_TITLE = 15;

  const PADDING = { h: 16, v: 10 };
  const NODE_RADIUS = 8;
  const MIN_NODE_W = 100;
  const MAX_NODE_W = 230;
  const LEVEL_GAP = 80;
  const SIBLING_GAP = 20;
  const CHAR_W = 7.0;
  const LINE_H = 18;

  function measureNode(text, fontSize, hasCategory) {
    const fs = fontSize || FONT_SIZE_L1;
    const scale = fs / 13;
    const maxChars = Math.floor(MAX_NODE_W / (CHAR_W * scale)) - 2;
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [''];
    for (const w of words) {
      const last = lines[lines.length - 1];
      if ((last + (last ? ' ' : '') + w).length <= maxChars) {
        lines[lines.length - 1] = last ? (last + ' ' + w) : w;
      } else {
        lines.push(w);
      }
    }
    const maxLen = Math.max.apply(null, lines.map(function(l) { return l.length; }));
    const w = Math.min(MAX_NODE_W, Math.max(MIN_NODE_W, Math.ceil(maxLen * CHAR_W * scale + PADDING.h * 2)));
    const h = Math.ceil(lines.length * LINE_H * scale + PADDING.v * 2 + 2) + (hasCategory ? 16 : 0);
    return { w: w, h: h, lines: lines };
  }

  function nodeLabel(node) {
    if (!node.label) return String(node.id || '');
    if (Array.isArray(node.label)) return node.label.map(function(s) { return s.value || ''; }).join('');
    return String(node.label);
  }

  function edgeLabel(edge) {
    if (!edge.label) return '';
    if (Array.isArray(edge.label)) return edge.label.map(function(s) { return s.value || ''; }).join('');
    return String(edge.label);
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function shortHash(s) {
    var hash = 0;
    var str = String(s);
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).slice(0, 6) || 'c0m';
  }

  function _darken(hex, amount) {
    var amt = amount || 0.1;
    var num = parseInt(hex.replace('#', ''), 16);
    var r = Math.max(0, Math.min(255, (num >> 16) - Math.round(255 * amt)));
    var g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) - Math.round(255 * amt)));
    var b = Math.max(0, Math.min(255, (num & 0xff) - Math.round(255 * amt)));
    return '#' + [r, g, b].map(function(v) { return v.toString(16).padStart(2, '0'); }).join('');
  }

  function buildTree(nodeMap, edges) {
    var children = new Map();
    nodeMap.forEach(function(_, id) { children.set(id, []); });
    var hasParent = new Set();
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      if (nodeMap.has(e.from) && nodeMap.has(e.to)) {
        children.get(e.from).push(e.to);
        hasParent.add(e.to);
      }
    }
    var roots = [];
    nodeMap.forEach(function(_, id) {
      if (!hasParent.has(id)) roots.push(id);
    });
    if (roots.length === 0 && nodeMap.size > 0) roots.push(Array.from(nodeMap.keys())[0]);
    return { children: children, roots: roots };
  }

  function layoutTopDown(nodeMap, edges) {
    var tree = buildTree(nodeMap, edges);
    var children = tree.children;
    var roots = tree.roots;

    var level = new Map();
    var queue = roots.map(function(r) { return [r, 0]; });
    var visited = new Set();
    while (queue.length > 0) {
      var item = queue.shift();
      var id = item[0];
      var lv = item[1];
      if (visited.has(id)) continue;
      visited.add(id);
      level.set(id, lv);
      var kids = children.get(id) || [];
      for (var k = 0; k < kids.length; k++) {
        if (!visited.has(kids[k])) queue.push([kids[k], lv + 1]);
      }
    }

    nodeMap.forEach(function(_, id) {
      if (!level.has(id)) level.set(id, 0);
    });

    var subtreeW = new Map();
    var relX = new Map();

    function computeSubtree(id, seen) {
      seen = seen || new Set();
      if (seen.has(id)) return nodeMap.get(id)._m.w;
      seen.add(id);
      var kids = (children.get(id) || []).filter(function(k) {
        return !seen.has(k) && level.get(k) > level.get(id);
      });
      var nw = nodeMap.get(id)._m.w;

      if (kids.length === 0) {
        subtreeW.set(id, nw);
        relX.set(id, 0);
        return nw;
      }

      var kidsTotalW = 0;
      var kidOffsets = [];
      for (var i = 0; i < kids.length; i++) {
        var kw = computeSubtree(kids[i], seen);
        kidOffsets.push(kidsTotalW);
        kidsTotalW += kw + (i < kids.length - 1 ? SIBLING_GAP : 0);
      }

      var totalW = Math.max(nw, kidsTotalW);
      subtreeW.set(id, totalW);

      var parentX = (totalW - nw) / 2;
      relX.set(id, parentX);

      var kidsShift = (totalW - kidsTotalW) / 2;
      for (var j = 0; j < kids.length; j++) {
        nodeMap.get(kids[j])._subtreeShift = kidOffsets[j] + kidsShift;
      }

      return totalW;
    }

    function assignPos(id, originX, seen) {
      seen = seen || new Set();
      if (seen.has(id)) return;
      seen.add(id);
      var n = nodeMap.get(id);
      n._x = originX + (relX.get(id) || 0);
      n._level = level.get(id);

      var kids = (children.get(id) || []).filter(function(k) {
        return !seen.has(k) && level.get(k) > level.get(id);
      });
      for (var i = 0; i < kids.length; i++) {
        var shift = nodeMap.get(kids[i])._subtreeShift || 0;
        assignPos(kids[i], originX + shift, seen);
      }
    }

    var curOriginX = 0;
    for (var r = 0; r < roots.length; r++) {
      var sw = computeSubtree(roots[r]);
      assignPos(roots[r], curOriginX);
      curOriginX += sw + SIBLING_GAP * 2;
    }

    var maxHByLevel = new Map();
    level.forEach(function(lv, id) {
      var h = nodeMap.get(id)._m.h;
      maxHByLevel.set(lv, Math.max(maxHByLevel.get(lv) || 0, h));
    });
    var yByLevel = new Map();
    var curY = 0;
    var sortedLevels = Array.from(maxHByLevel.keys()).sort(function(a, b) { return a - b; });
    for (var s = 0; s < sortedLevels.length; s++) {
      var slv = sortedLevels[s];
      yByLevel.set(slv, curY);
      curY += maxHByLevel.get(slv) + LEVEL_GAP;
    }
    level.forEach(function(lv, id) {
      nodeMap.get(id)._y = yByLevel.get(lv);
    });
  }

  function renderConceptMap(spec) {
    if (!spec) return '';
    var payload = spec.payload || {};
    var nodes = payload.nodes || [];
    var edges = payload.edges || [];
    var title = spec.title || '';
    var showLegend = payload.showLegend !== false;

    if (nodes.length === 0) return '';

    var nodeMap = new Map();
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var label = nodeLabel(node);
      var m = measureNode(label, FONT_SIZE_L1, Boolean(node.category));
      nodeMap.set(node.id, Object.assign({}, node, { _label: label, _m: m, _x: 0, _y: 0, _level: 0 }));
    }

    layoutTopDown(nodeMap, edges);

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodeMap.forEach(function(n) {
      minX = Math.min(minX, n._x);
      minY = Math.min(minY, n._y);
      maxX = Math.max(maxX, n._x + n._m.w);
      maxY = Math.max(maxY, n._y + n._m.h);
    });

    var usedRelations = new Set(edges.map(function(e) { return e.relation || 'default'; }).filter(function(r) { return r !== 'default'; }));
    var legendH = showLegend && usedRelations.size > 1 ? 36 + usedRelations.size * 20 : 0;

    var PAD = 48;
    var titleH = title ? 42 : 12;
    var W = Math.max(480, maxX - minX + PAD * 2);
    var H = Math.max(200, maxY - minY + PAD * 2 + titleH + legendH);

    var offX = PAD - minX;
    var offY = PAD + titleH - minY;

    var hasParentSet = new Set(edges.map(function(e) { return e.to; }));
    var rootObj = nodes.find(function(n) { return !hasParentSet.has(n.id); });
    var rootId = rootObj ? rootObj.id : (nodes[0] ? nodes[0].id : '');
    var uid = shortHash(spec.visualId || title || 'cm');

    var parts = [];
    parts.push(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="auto" style="max-height: 520px; display: block; margin: 0 auto;" ' +
      'data-visual-id="' + esc(spec.visualId || '') + '" role="img" aria-label="' + esc(title || 'Mappa Concettuale') + '">'
    );
    parts.push('  <title>' + esc(title || 'Mappa Concettuale') + '</title>');
    parts.push('  <defs>');
    parts.push(
      '    <filter id="shadow-' + uid + '" x="-10%" y="-10%" width="120%" height="130%">' +
      '      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#00000020"/>' +
      '    </filter>'
    );

    LEVEL_PALETTE.forEach(function(col, idx) {
      parts.push(
        '    <linearGradient id="grad-' + uid + '-' + idx + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '      <stop offset="0%" stop-color="' + col.bg + '" stop-opacity="1"/>' +
        '      <stop offset="100%" stop-color="' + _darken(col.bg, 0.12) + '" stop-opacity="1"/>' +
        '    </linearGradient>'
      );
    });

    for (var rel in RELATION_STYLES) {
      var style = RELATION_STYLES[rel];
      var mid = 'arrow-' + uid + '-' + rel;
      parts.push(
        '    <marker id="' + mid + '" viewBox="0 0 10 7" refX="9" refY="3.5" ' +
        '            markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
        '      <path d="M 0 0 L 10 3.5 L 0 7 z" fill="' + style.color + '" opacity="0.9"/>' +
        '    </marker>'
      );
    }

    parts.push('  </defs>');
    parts.push('  <rect width="' + W + '" height="' + H + '" fill="#fafbfc" rx="6"/>');
    parts.push('  <rect x="1" y="1" width="' + (W - 2) + '" height="' + (H - 2) + '" fill="none" stroke="#e2e8f0" stroke-width="1" rx="6"/>');

    if (title) {
      parts.push(
        '  <text x="' + (W / 2) + '" y="28" text-anchor="middle" ' +
        '    font-size="' + FONT_SIZE_TITLE + '" font-weight="700" fill="#0f172a" ' +
        '    font-family="' + FONT_FAMILY + '" letter-spacing="-0.3">' + esc(title) + '</text>' +
        '  <line x1="' + (W * 0.2) + '" y1="36" x2="' + (W * 0.8) + '" y2="36" stroke="#e2e8f0" stroke-width="1"/>'
      );
    }

    for (var eIdx = 0; eIdx < edges.length; eIdx++) {
      var edge = edges[eIdx];
      var src = nodeMap.get(edge.from);
      var dst = nodeMap.get(edge.to);
      if (!src || !dst) continue;

      var eStyle = RELATION_STYLES[edge.relation] || RELATION_STYLES.default;
      var eMarkId = 'arrow-' + uid + '-' + (edge.relation || 'default');

      var outEdges = edges.filter(function(e) { return e.from === edge.from; });
      var oIdx = outEdges.indexOf(edge);
      var numOut = outEdges.length;
      var spread = Math.min(src._m.w * 0.55, (numOut - 1) * 20);
      var startXOffset = numOut > 1 ? -spread / 2 + (oIdx / (numOut - 1)) * spread : 0;

      var x1 = src._x + offX + src._m.w / 2 + startXOffset;
      var y1 = src._y + offY + src._m.h;
      var x2 = dst._x + offX + dst._m.w / 2;
      var y2 = dst._y + offY;

      var ctrl1Y = y1 + (y2 - y1) * 0.45;
      var ctrl2Y = y2 - (y2 - y1) * 0.45;
      var d = 'M ' + x1 + ' ' + y1 + ' C ' + x1 + ' ' + ctrl1Y + ', ' + x2 + ' ' + ctrl2Y + ', ' + x2 + ' ' + y2;
      var dashAttr = eStyle.dash ? ' stroke-dasharray="' + eStyle.dash + '"' : '';

      parts.push(
        '  <path d="' + d + '" fill="none" stroke="' + eStyle.color + '" stroke-width="' + eStyle.width + '" ' +
        ' marker-end="url(#' + eMarkId + ')" stroke-linecap="round"' + dashAttr + ' opacity="0.85"/>'
      );

      var elabel = edgeLabel(edge);
      if (elabel) {
        var lx = (x1 + x2) / 2;
        var ly = (y1 + y2) / 2;
        var textW = Math.max(48, elabel.length * 6.5 + 14);
        parts.push(
          '  <rect x="' + (lx - textW / 2) + '" y="' + (ly - 9) + '" width="' + textW + '" height="18" ' +
          ' fill="#ffffff" rx="9" stroke="' + eStyle.color + '55" stroke-width="1" filter="url(#shadow-' + uid + ')"/>' +
          '  <text x="' + lx + '" y="' + (ly + 3.5) + '" text-anchor="middle" font-size="' + FONT_SIZE_EDGE + '" font-weight="600" ' +
          ' fill="' + eStyle.color + '" font-family="' + FONT_FAMILY + '">' + esc(elabel) + '</text>'
        );
      }
    }

    nodeMap.forEach(function(n) {
      var x = n._x + offX;
      var y = n._y + offY;
      var w = n._m.w;
      var h = n._m.h;
      var lv = Math.min(n._level || 0, LEVEL_PALETTE.length - 1);
      var isRoot = n.id === rootId;

      var col = LEVEL_PALETTE[lv];
      var palCol = PALE_PALETTE[lv];
      var gradId = 'grad-' + uid + '-' + lv;

      if (isRoot) {
        parts.push(
          '  <rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (NODE_RADIUS + 2) + '" ry="' + (NODE_RADIUS + 2) + '" ' +
          ' fill="url(#' + gradId + ')" stroke="' + col.accent + '" stroke-width="2" ' +
          ' filter="url(#shadow-' + uid + ')"/>'
        );
      } else if (lv === 1) {
        parts.push(
          '  <rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + NODE_RADIUS + '" ry="' + NODE_RADIUS + '" ' +
          ' fill="url(#' + gradId + ')" stroke="' + col.accent + '" stroke-width="1.5" ' +
          ' filter="url(#shadow-' + uid + ')"/>'
        );
      } else {
        parts.push(
          '  <rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (NODE_RADIUS - 1) + '" ry="' + (NODE_RADIUS - 1) + '" ' +
          ' fill="' + palCol.bg + '" stroke="' + palCol.border + '" stroke-width="1.5" ' +
          ' filter="url(#shadow-' + uid + ')"/>' +
          '  <rect x="' + x + '" y="' + (y + 3) + '" width="3" height="' + (h - 6) + '" ' +
          ' fill="' + palCol.accent + '" rx="1.5" ry="1.5"/>'
        );
      }

      var fg = isRoot || lv <= 1 ? col.text : palCol.text;
      var fSize = isRoot ? FONT_SIZE_ROOT : (lv === 1 ? FONT_SIZE_L1 : FONT_SIZE_LEAF);
      var fWeight = isRoot ? '700' : (lv === 1 ? '600' : '500');
      var lines = n._m.lines;
      var totalTextH = lines.length * LINE_H;
      var textStartY = n.category
        ? y + (h - totalTextH - 14) / 2 + LINE_H * 0.8
        : y + (h - totalTextH) / 2 + LINE_H * 0.8;

      for (var l = 0; l < lines.length; l++) {
        parts.push(
          '  <text x="' + (x + w / 2) + '" y="' + (textStartY + l * LINE_H) + '" ' +
          ' text-anchor="middle" fill="' + fg + '" ' +
          ' font-size="' + fSize + '" font-weight="' + fWeight + '" ' +
          ' font-family="' + FONT_FAMILY + '">' + esc(lines[l]) + '</text>'
        );
      }

      if (n.category) {
        var catW = Math.min(w - 14, n.category.length * 6 + 14);
        var catX = x + w / 2 - catW / 2;
        var catY = y + h - 17;
        parts.push(
          '  <rect x="' + catX + '" y="' + catY + '" width="' + catW + '" height="13" ' +
          ' fill="' + (isRoot || lv <= 1 ? col.accent + '35' : palCol.accent + '25') + '" rx="5" ' +
          ' stroke="' + (isRoot || lv <= 1 ? col.accent : palCol.accent) + '" stroke-width="0.8"/>' +
          '  <text x="' + (x + w / 2) + '" y="' + (catY + 9.5) + '" text-anchor="middle" ' +
          ' font-size="8.5" font-weight="600" fill="' + fg + '" font-family="' + FONT_FAMILY + '">' + esc(n.category) + '</text>'
        );
      }
    });

    if (legendH > 0) {
      var legX = PAD;
      var legY = H - legendH + 8;
      parts.push(
        '  <line x1="' + (W * 0.1) + '" y1="' + (legY - 4) + '" x2="' + (W * 0.9) + '" y2="' + (legY - 4) + '" ' +
        ' stroke="#e2e8f0" stroke-width="1"/>' +
        '  <text x="' + legX + '" y="' + (legY + 12) + '" font-size="9" fill="#64748b" ' +
        ' font-family="' + FONT_FAMILY + '" font-weight="600">Legenda relazioni:</text>'
      );
      var li = 0;
      usedRelations.forEach(function(rel) {
        var rStyle = RELATION_STYLES[rel] || RELATION_STYLES.default;
        var ly = legY + 28 + li * 18;
        var dashAttr = rStyle.dash ? ' stroke-dasharray="' + rStyle.dash + '"' : '';
        parts.push(
          '  <line x1="' + legX + '" y1="' + (ly - 5) + '" x2="' + (legX + 28) + '" y2="' + (ly - 5) + '" ' +
          ' stroke="' + rStyle.color + '" stroke-width="1.5"' + dashAttr + '/>' +
          '  <polygon points="' + (legX + 28) + ',' + (ly - 5) + ' ' + (legX + 22) + ',' + (ly - 8) + ' ' + (legX + 22) + ',' + (ly - 2) + '" ' +
          ' fill="' + rStyle.color + '"/>' +
          '  <text x="' + (legX + 34) + '" y="' + ly + '" font-size="9" fill="#475569" ' +
          ' font-family="' + FONT_FAMILY + '">' + esc(rStyle.label || rel) + '</text>'
        );
        li++;
      });
    }

    parts.push('</svg>');
    return parts.join('\n').split('\n').map(function(l) { return l.trim(); }).filter(Boolean).join('\n');
  }

  window.renderConceptMap = renderConceptMap;

})(typeof window !== 'undefined' ? window : this);
