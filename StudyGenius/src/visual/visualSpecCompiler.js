/**
 * StudyGenius Academic Intelligence System
 * src/visual/visualSpecCompiler.js
 *
 * Visual Spec Compiler — Dispatcher centrale dal VisualSpec JSON al renderer SVG.
 *
 * Compila le VisualSpec (schema v1.0 da markdown.md §8.1) in artifact SVG persistenti.
 * Aggiorna il VisualLedger e usa il VisualObserver per log strutturati.
 *
 * Specifica: markdown.md §14 (Compilation Barrier), 2.md §128 (Final directive),
 *            1.md §5 (Visual Pipeline), 1.md §62 (No silent loss).
 *
 * Pipeline per ogni visual:
 *   VisualSpec JSON → validate schema → validate semantics →
 *   dispatch renderer → render SVG → sanitize → persist artifact →
 *   update ledger → return result
 *
 * Renderer Registry:
 * | kind             | renderer                  | status      |
 * |------------------|---------------------------|-------------|
 * | concept_map      | conceptMapRenderer        | IMPLEMENTED |
 * | xy_plot          | xyPlotRenderer            | IMPLEMENTED |
 * | function_plot    | diagramEngine             | IMPLEMENTED |
 * | chemistry_svg    | chemistryRenderer         | IMPLEMENTED |
 * | typographic_table| (inline HTML/text)        | PARTIAL     |
 */

'use strict';

const path   = require('path');
const fs     = require('fs-extra');
const crypto = require('crypto');

const { VisualLedger, VISUAL_STATES } = require('../core/visualLedger');
const { visualObserver }              = require('../core/visualObserver');
const { sanitizeSvg, validateSvgStructure } = require('../rendering/svgSanitizer');
const { renderConceptMap }            = require('../rendering/conceptMapRenderer');
const { renderXyPlot }               = require('../rendering/xyPlotRenderer');
const { renderFunctionPlotSvg }      = require('../rendering/diagramEngine');

// ─── Schema version supportata ────────────────────────────────────────────────
const SUPPORTED_SCHEMA_VERSION = '1.0';

// ─── Renderer Registry ────────────────────────────────────────────────────────

const RENDERER_REGISTRY = {
  concept_map:   { fn: renderConceptMap,     name: 'ConceptMapRenderer'  },
  xy_plot:       { fn: renderXyPlot,         name: 'XyPlotRenderer'      },
  function_plot: { fn: _bridgeFunctionPlot,  name: 'DiagramEngine'       },
  // 'chemistry_svg' -> chemistryRenderer è chiamato direttamente dall'orchestratore (ha logica aggiuntiva)
};

/**
 * Bridge per diagramEngine.js che usa l'interfaccia legacy.
 * Specifica: 2.md §82 (function_plot).
 */
function _bridgeFunctionPlot(spec) {
  const payload = spec.payload || {};
  return renderFunctionPlotSvg({
    title:       spec.title,
    expression:  payload.expression,
    domain:      payload.xAxis?.domain || payload.domain,
    range:       payload.yAxis?.domain || payload.range,
    variable:    payload.variable || 'x',
    xLabel:      _axisLabel(payload.xAxis?.label),
    yLabel:      _axisLabel(payload.yAxis?.label),
    annotations: payload.annotations || [],
    width:       spec.width,
    height:      spec.height,
  });
}

function _axisLabel(label) {
  if (!label) return '';
  if (Array.isArray(label)) return label.map(s => s.value || '').join('');
  return String(label);
}

// ─── VisualSpecCompiler ────────────────────────────────────────────────────────

class VisualSpecCompiler {
  /**
   * @param {Object} opts
   * @param {string}       opts.artifactsDir  Directory dove persistere gli SVG
   * @param {VisualLedger} [opts.ledger]       Istanza VisualLedger per questo job
   */
  constructor({ artifactsDir, ledger }) {
    this.artifactsDir = artifactsDir;
    this.ledger       = ledger || new VisualLedger();
  }

  /**
   * Compila una singola VisualSpec in un artifact SVG.
   *
   * @param {Object} spec  VisualSpec v1.0
   * @returns {Promise<CompilationResult>}
   */
  async compile(spec) {
    const visualId = spec.visualId || `V_auto_${Date.now()}`;

    // ─ 1. Valida schema ──────────────────────────────────────────────────────
    const schemaErrors = _validateSchema(spec);
    if (schemaErrors.length > 0) {
      const reason = `SCHEMA_ERRORS: ${schemaErrors.join('; ')}`;
      visualObserver.failed(visualId, reason);
      if (this.ledger.has(visualId)) {
        this.ledger.fail(visualId, reason);
      }
      return { success: false, visualId, error: reason, schemaErrors };
    }

    // ─ 2. Valida semantica ───────────────────────────────────────────────────
    const semanticErrors = _validateSemantics(spec);
    if (semanticErrors.length > 0) {
      const reason = `SEMANTIC_ERRORS: ${semanticErrors.join('; ')}`;
      visualObserver.failed(visualId, reason);
      if (this.ledger.has(visualId)) {
        this.ledger.fail(visualId, reason);
      }
      return { success: false, visualId, error: reason, semanticErrors };
    }

    // ─ 3. Seleziona renderer ─────────────────────────────────────────────────
    const kind     = spec.kind;
    const entry    = RENDERER_REGISTRY[kind];
    if (!entry) {
      const reason = `UNKNOWN_KIND: "${kind}". Renderer non registrato.`;
      visualObserver.failed(visualId, reason);
      if (this.ledger.has(visualId)) {
        this.ledger.fail(visualId, reason);
      }
      return { success: false, visualId, error: reason };
    }

    visualObserver.specified(visualId, entry.name);
    if (this.ledger.has(visualId)) {
      this.ledger.specify(visualId, entry.name);
    }

    // ─ 4. Render ─────────────────────────────────────────────────────────────
    let rawSvg;
    try {
      rawSvg = entry.fn(spec);
    } catch (err) {
      const reason = `RENDER_ERROR: ${err.message}`;
      visualObserver.failed(visualId, reason);
      if (this.ledger.has(visualId)) {
        this.ledger.fail(visualId, reason);
      }
      return { success: false, visualId, error: reason };
    }

    // ─ 5. Sanitizza SVG ──────────────────────────────────────────────────────
    const { svg: cleanSvg, safe, report: sanitReport } = sanitizeSvg(rawSvg, visualId);
    if (!safe || !cleanSvg) {
      const reason = `SANITIZATION_FAILED: ${sanitReport.warnings.join(', ')}`;
      visualObserver.qaFail(visualId, reason);
      if (this.ledger.has(visualId)) {
        this.ledger.fail(visualId, reason);
      }
      return { success: false, visualId, error: reason, sanitizationReport: sanitReport };
    }

    // ─ 6. Valida struttura SVG ───────────────────────────────────────────────
    const svgErrors = validateSvgStructure(cleanSvg);
    if (svgErrors.length > 0) {
      const reason = `SVG_STRUCTURAL_ERRORS: ${svgErrors.join(', ')}`;
      visualObserver.qaFail(visualId, reason);
      if (this.ledger.has(visualId)) {
        this.ledger.fail(visualId, reason);
      }
      return { success: false, visualId, error: reason, svgErrors };
    }

    visualObserver.qaPass(visualId, ['structural', 'sanitization']);

    // ─ 7. Persisti artifact ──────────────────────────────────────────────────
    const artifactPath = await this._persist(visualId, cleanSvg);
    const artifactHash = crypto.createHash('sha256').update(cleanSvg, 'utf8').digest('hex');
    const sizeBytes    = Buffer.byteLength(cleanSvg, 'utf8');

    visualObserver.rendered(visualId, artifactPath, sizeBytes);
    if (this.ledger.has(visualId)) {
      this.ledger.rendered(visualId, artifactPath, artifactHash);
    }

    return {
      success:    true,
      visualId,
      artifactPath,
      artifactHash,
      sizeBytes,
      kind,
      renderer:   entry.name,
      sanitizationReport: sanitReport,
    };
  }

  /**
   * Compila un batch di VisualSpec in parallelo (max 4 concurrent).
   * @param {Object[]} specs
   * @returns {Promise<CompilationResult[]>}
   */
  async compileAll(specs) {
    const results = [];
    const CONCURRENCY = 4;

    for (let i = 0; i < specs.length; i += CONCURRENCY) {
      const batch = specs.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(s => this.compile(s)));
      results.push(...batchResults);
    }

    return results;
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  async _persist(visualId, svgContent) {
    await fs.ensureDir(this.artifactsDir);
    const filename = `${_safeName(visualId)}_final.svg`;
    const filePath = path.join(this.artifactsDir, filename);
    await fs.writeFile(filePath, svgContent, 'utf8');
    return filePath;
  }
}

// ─── Validazione schema ─────────────────────────────────────────────────────────

function _validateSchema(spec) {
  const errors = [];
  if (!spec || typeof spec !== 'object') {
    errors.push('SPEC_NOT_OBJECT');
    return errors;
  }

  // schemaVersion
  if (!spec.schemaVersion) {
    errors.push('MISSING_SCHEMA_VERSION');
  } else if (spec.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    errors.push(`UNSUPPORTED_SCHEMA_VERSION: "${spec.schemaVersion}" (attesa: "${SUPPORTED_SCHEMA_VERSION}")`);
  }

  // visualId
  if (!spec.visualId || typeof spec.visualId !== 'string' || spec.visualId.trim() === '') {
    errors.push('MISSING_OR_EMPTY_VISUAL_ID');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(spec.visualId)) {
    errors.push(`INVALID_VISUAL_ID_FORMAT: "${spec.visualId}" (solo alfanumerici, _ e - consentiti)`);
  }

  // kind
  if (!spec.kind || typeof spec.kind !== 'string') {
    errors.push('MISSING_KIND');
  }

  // title
  if (!spec.title || typeof spec.title !== 'string') {
    errors.push('MISSING_TITLE');
  }

  // payload
  if (!spec.payload || typeof spec.payload !== 'object') {
    errors.push('MISSING_PAYLOAD');
  }

  return errors;
}

// ─── Validazione semantica ─────────────────────────────────────────────────────

function _validateSemantics(spec) {
  const errors = [];
  const payload = spec.payload || {};

  if (spec.kind === 'concept_map') {
    const nodes = payload.nodes || [];
    const edges = payload.edges || [];

    if (nodes.length === 0) {
      errors.push('CONCEPT_MAP_NO_NODES');
    }

    // ID univoci nodi
    const nodeIds = new Set();
    for (const n of nodes) {
      if (!n.id) { errors.push('NODE_MISSING_ID'); continue; }
      if (nodeIds.has(n.id)) errors.push(`DUPLICATE_NODE_ID: "${n.id}"`);
      nodeIds.add(n.id);
    }

    // Archi su nodi esistenti
    for (const e of edges) {
      if (!e.from || !e.to) { errors.push('EDGE_MISSING_FROM_OR_TO'); continue; }
      if (!nodeIds.has(e.from)) errors.push(`EDGE_FROM_UNKNOWN_NODE: "${e.from}"`);
      if (!nodeIds.has(e.to))   errors.push(`EDGE_TO_UNKNOWN_NODE: "${e.to}"`);
    }
  }

  if (spec.kind === 'xy_plot') {
    const series = payload.series || [];
    if (series.length === 0) {
      errors.push('XY_PLOT_NO_SERIES');
    }

    for (const s of series) {
      if (!s.id) errors.push('SERIES_MISSING_ID');
      const points = s.points || [];
      for (const pt of points) {
        if (pt === null) continue; // gap esplicito OK
        if (typeof pt.x !== 'number' || !isFinite(pt.x)) {
          errors.push(`SERIES_${s.id}_INVALID_X_VALUE`);
          break;
        }
      }
    }

    // Dominio
    const xDomain = payload.xAxis?.domain;
    if (xDomain && Array.isArray(xDomain)) {
      if (xDomain.length !== 2 || !isFinite(xDomain[0]) || !isFinite(xDomain[1])) {
        errors.push('X_DOMAIN_INVALID');
      } else if (xDomain[0] >= xDomain[1]) {
        errors.push('X_DOMAIN_EMPTY');
      }
    }

    // Annotazioni su coordinate valide
    for (const ann of (payload.annotations || [])) {
      if (typeof ann.x !== 'number' || !isFinite(ann.x)) {
        errors.push(`ANNOTATION_${ann.id}_INVALID_X`);
      }
    }
  }

  return errors;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function _safeName(visualId) {
  return String(visualId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

module.exports = {
  VisualSpecCompiler,
  RENDERER_REGISTRY,
  SUPPORTED_SCHEMA_VERSION,
};
