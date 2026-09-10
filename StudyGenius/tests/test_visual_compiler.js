/**
 * StudyGenius — Test Suite: Visual Compiler
 * tests/test_visual_compiler.js
 *
 * Copre:
 * - VisualLedger (state machine, no silent loss, coverage report)
 * - SVG Sanitizer (allowlist, script removal, viewBox normalization)
 * - ConceptMapRenderer (no ASCII, layout deterministico)
 * - XyPlotRenderer (serie dati, annotazioni, gap handling)
 * - VisualSpecCompiler (schema validation, render dispatch, error codes)
 * - Compilation Barrier (hard stops: raw spec, ASCII maps, unresolved refs)
 *
 * Eseguire con: node tests/test_visual_compiler.js
 */

'use strict';

const path = require('path');
const fs   = require('fs-extra');
const os   = require('os');
const assert = require('assert');

// ─── Utility test ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

const asyncTests = [];

function test(description, fn) {
  if (fn.constructor.name === 'AsyncFunction') {
    asyncTests.push(async () => {
      try {
        await fn();
        console.log(`  ✅ ${description}`);
        passed++;
      } catch (err) {
        console.error(`  ❌ ${description}`);
        console.error(`     ${err.message}`);
        failed++;
      }
    });
  } else {
    try {
      fn();
      console.log(`  ✅ ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${description}`);
      console.error(`     ${err.message}`);
      failed++;
    }
  }
}

function expect(val) {
  return {
    toBe:           (exp) => { if (val !== exp) throw new Error(`Expected ${JSON.stringify(exp)}, got ${JSON.stringify(val)}`); },
    toBeTrue:       ()    => { if (val !== true) throw new Error(`Expected true, got ${val}`); },
    toBeFalse:      ()    => { if (val !== false) throw new Error(`Expected false, got ${val}`); },
    toContain:      (sub) => { if (!String(val).includes(sub)) throw new Error(`Expected "${val}" to contain "${sub}"`); },
    toBeGreaterThan:(n)   => { if (!(val > n)) throw new Error(`Expected ${val} > ${n}`); },
    notToThrow:     ()    => { /* val è una funzione */ try { val(); } catch (e) { throw new Error(`Expected no throw, got: ${e.message}`); } },
    toThrow:        ()    => { try { val(); throw new Error('Expected throw but did not'); } catch (e) { if (e.message === 'Expected throw but did not') throw e; } },
    toHaveLength:   (n)   => { if (val.length !== n) throw new Error(`Expected length ${n}, got ${val.length}`); },
  };
}

// ─── Import moduli ────────────────────────────────────────────────────────────
const { VisualLedger, VISUAL_STATES, resetDefaultLedger } = require('../src/core/visualLedger');
const { sanitizeSvg, validateSvgStructure } = require('../src/rendering/svgSanitizer');
const { renderConceptMap } = require('../src/rendering/conceptMapRenderer');
const { renderXyPlot }    = require('../src/rendering/xyPlotRenderer');
const { VisualSpecCompiler } = require('../src/visual/visualSpecCompiler');
const { runCompilationBarrier } = require('../src/services/pdfExportService');

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 1 — VisualLedger
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📒 SEZIONE 1 — VisualLedger\n');

test('detect crea un record con stato DETECTED', () => {
  const ledger = new VisualLedger();
  const r = ledger.detect('V001', { sourcePage: 42, visualCategory: 'concept_map' });
  expect(r.state).toBe(VISUAL_STATES.DETECTED);
  expect(r.visualId).toBe('V001');
});

test('detect di ID duplicato lancia errore', () => {
  const ledger = new VisualLedger();
  ledger.detect('V002');
  expect(() => ledger.detect('V002')).toThrow();
});

test('state machine: DETECTED → ACCEPTED → SPECIFIED → RENDERED → INSERTED → FULFILLED', () => {
  const ledger = new VisualLedger();
  ledger.detect('V003');
  ledger.accept('V003', { reason: 'HIGH_PEDAGOGICAL_VALUE' });
  ledger.specify('V003', 'ConceptMapRenderer');
  ledger.rendered('V003', '/tmp/V003.svg', 'abc123hash');
  ledger.insert('V003', 'B908');
  ledger.verify('V003', 83);
  ledger.fulfill('V003', 83);
  expect(ledger.get('V003').state).toBe(VISUAL_STATES.FULFILLED);
});

test('transizione illegale lancia errore', () => {
  const ledger = new VisualLedger();
  ledger.detect('V004');
  // Non si può passare da DETECTED a RENDERED direttamente
  expect(() => ledger.rendered('V004', '/tmp/x.svg', 'hash')).toThrow();
});

test('assertNoSilentLoss: pass quando tutti i visual accepted hanno outcome', () => {
  const ledger = new VisualLedger();
  ledger.detect('V005');
  ledger.accept('V005');
  ledger.specify('V005', 'XyPlot');
  ledger.rendered('V005', '/tmp/V005.svg', 'hash1');
  ledger.insert('V005', 'B1');
  ledger.verify('V005', 10);
  ledger.fulfill('V005', 10);
  expect(() => ledger.assertNoSilentLoss()).notToThrow();
});

test('assertNoSilentLoss: fail se visual accepted senza outcome (silent loss)', () => {
  const ledger = new VisualLedger();
  ledger.detect('V006');
  ledger.accept('V006');
  // Nessuna transizione successiva → silent loss
  expect(() => ledger.assertNoSilentLoss()).toThrow();
});

test('reject con reason è outcome valido', () => {
  const ledger = new VisualLedger();
  ledger.detect('V007');
  ledger.reject('V007', 'LOW_PEDAGOGICAL_VALUE');
  expect(ledger.get('V007').state).toBe(VISUAL_STATES.REJECTED_WITH_REASON);
  expect(() => ledger.assertNoSilentLoss()).notToThrow();
});

test('generateCoverageReport genera testo con STATUS', () => {
  const ledger = new VisualLedger();
  ledger.detect('V008');
  ledger.accept('V008');
  ledger.specify('V008', 'XyPlot');
  ledger.rendered('V008', '/tmp/V008.svg', 'hash');
  ledger.insert('V008', 'B2');
  ledger.verify('V008', 5);
  ledger.fulfill('V008', 5);
  const report = ledger.generateCoverageReport();
  expect(report).toContain('VISUAL COVERAGE REPORT');
  expect(report).toContain('PASS');
});

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 2 — SVG Sanitizer
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🧹 SEZIONE 2 — SVG Sanitizer\n');

test('sanitize: rimuove tag <script>', () => {
  const dirty = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><script>alert(1)</script><rect width="10" height="10"/></svg>`;
  const { svg, safe, report } = sanitizeSvg(dirty, 'TEST');
  expect(report.warnings.some(w => w.includes('SCRIPT'))).toBeTrue();
});

test('sanitize: rimuove event handler on*', () => {
  const dirty = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect onclick="evil()" width="10" height="10"/></svg>`;
  const { svg } = sanitizeSvg(dirty, 'TEST2');
  expect(svg).toContain('<rect');
  expect(svg.includes('onclick')).toBeFalse();
});

test('sanitize: input vuoto → safe=false', () => {
  const { safe, report } = sanitizeSvg('', 'TEST3');
  expect(safe).toBeFalse();
});

test('validateSvgStructure: SVG valido → nessun errore', () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect x="10" y="10" width="50" height="50"/></svg>`;
  const errors = validateSvgStructure(svg);
  expect(errors.length).toBe(0);
});

test('validateSvgStructure: viewBox mancante → errore VIEWBOX_MISSING', () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect x="10" y="10" width="50" height="50"/></svg>`;
  const errors = validateSvgStructure(svg);
  expect(errors.some(e => e.includes('VIEWBOX_MISSING'))).toBeTrue();
});

test('validateSvgStructure: nessun elemento grafico → errore NO_GRAPHIC_ELEMENTS', () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><title>test</title></svg>`;
  const errors = validateSvgStructure(svg);
  expect(errors.some(e => e.includes('NO_GRAPHIC_ELEMENTS'))).toBeTrue();
});

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 3 — ConceptMapRenderer
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🗺️  SEZIONE 3 — ConceptMapRenderer\n');

const FIXTURE_MAP = {
  schemaVersion: '1.0',
  visualId:      'v_classificazione',
  kind:          'concept_map',
  title:         'Macchine a fluido: confronto introduttivo',
  payload: {
    nodes: [
      { id: 'macchine', label: [{ kind: 'text', value: 'Macchine a fluido' }] },
      { id: 'pompe',    label: [{ kind: 'text', value: 'Pompe' }] },
      { id: 'turbine',  label: [{ kind: 'text', value: 'Turbine' }] },
    ],
    edges: [
      { id: 'e_pompe',   from: 'macchine', to: 'pompe',   relation: 'classification' },
      { id: 'e_turbine', from: 'macchine', to: 'turbine', relation: 'classification' },
    ],
  },
};

test('renderConceptMap: produce SVG valido con 3 nodi e 2 archi', () => {
  const svg = renderConceptMap(FIXTURE_MAP);
  expect(svg).toContain('<svg');
  expect(svg).toContain('Macchine a fluido');
  expect(svg).toContain('Pompe');
  expect(svg).toContain('Turbine');
  // Deve contenere almeno 2 path (archi)
  const pathMatches = svg.match(/<path/g) || [];
  expect(pathMatches.length).toBeGreaterThan(1);
});

test('renderConceptMap: NON produce caratteri ASCII tree', () => {
  const svg = renderConceptMap(FIXTURE_MAP);
  expect(svg.includes('├')).toBeFalse();
  expect(svg.includes('└')).toBeFalse();
});

test('renderConceptMap: SVG supera validazione strutturale', () => {
  const svg = renderConceptMap(FIXTURE_MAP);
  const errors = validateSvgStructure(svg);
  expect(errors.length).toBe(0);
});

test('renderConceptMap: lancia errore con nodi vuoti', () => {
  const emptySpec = { ...FIXTURE_MAP, payload: { nodes: [], edges: [] } };
  expect(() => renderConceptMap(emptySpec)).toThrow();
});

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 4 — XyPlotRenderer
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📈 SEZIONE 4 — XyPlotRenderer\n');

const FIXTURE_XY = {
  schemaVersion: '1.0',
  visualId:      'v_punto_lavoro',
  kind:          'xy_plot',
  title:         'Intersezione fra pompa e impianto',
  payload: {
    xAxis: { label: [{ kind: 'text', value: 'Portata Q' }], unit: 'm3/h', scale: 'linear', domain: [0, 40] },
    yAxis: { label: [{ kind: 'text', value: 'Prevalenza H' }], unit: 'm',    scale: 'linear', domain: [0, 45] },
    series: [
      {
        id: 'pompa', label: [{ kind: 'text', value: 'Pompa' }], interpolation: 'linear',
        points: [{ x: 0, y: 40 }, { x: 20, y: 32 }, { x: 31.62, y: 20 }, { x: 40, y: 8 }]
      },
      {
        id: 'impianto', label: [{ kind: 'text', value: 'Impianto' }], interpolation: 'linear',
        points: [{ x: 0, y: 10 }, { x: 20, y: 14 }, { x: 31.62, y: 20 }, { x: 40, y: 26 }]
      },
    ],
    annotations: [{ id: 'punto_lavoro', label: [{ kind: 'text', value: 'Punto di lavoro' }], x: 31.62, y: 20 }]
  },
};

test('renderXyPlot: produce SVG valido con 2 serie', () => {
  const svg = renderXyPlot(FIXTURE_XY);
  expect(svg).toContain('<svg');
  expect(svg).toContain('Pompa');
  expect(svg).toContain('Impianto');
  // Deve contenere 2 path di serie
  const pathMatches = svg.match(/<path[^>]+data-series/g) || [];
  expect(pathMatches.length).toBe(2);
});

test('renderXyPlot: include annotazione con label', () => {
  const svg = renderXyPlot(FIXTURE_XY);
  expect(svg).toContain('Punto di lavoro');
});

test('renderXyPlot: SVG supera validazione strutturale', () => {
  const svg = renderXyPlot(FIXTURE_XY);
  const errors = validateSvgStructure(svg);
  expect(errors.length).toBe(0);
});

test('renderXyPlot: gestisce gap (y: null) senza crash', () => {
  const gapSpec = JSON.parse(JSON.stringify(FIXTURE_XY));
  gapSpec.payload.series[0].points[1] = { x: 20, y: null };  // gap esplicito
  expect(() => renderXyPlot(gapSpec)).notToThrow();
});

test('renderXyPlot: lancia errore con serie vuote', () => {
  const emptySpec = { ...FIXTURE_XY, payload: { ...FIXTURE_XY.payload, series: [] } };
  expect(() => renderXyPlot(emptySpec)).toThrow();
});

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 5 — VisualSpecCompiler
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n⚙️  SEZIONE 5 — VisualSpecCompiler\n');

const TEMP_ARTIFACTS_DIR = path.join(os.tmpdir(), 'sg_test_artifacts_' + Date.now());

test('compile concept_map: produce artifact SVG valido', async () => {
  const compiler = new VisualSpecCompiler({ artifactsDir: TEMP_ARTIFACTS_DIR });
  const result = await compiler.compile(FIXTURE_MAP);
  expect(result.success).toBeTrue();
  expect(result.artifactPath).toContain('.svg');
  expect(fs.existsSync(result.artifactPath)).toBeTrue();
});

test('compile xy_plot: produce artifact SVG valido', async () => {
  const compiler = new VisualSpecCompiler({ artifactsDir: TEMP_ARTIFACTS_DIR });
  const result = await compiler.compile(FIXTURE_XY);
  expect(result.success).toBeTrue();
});

test('compile: schema mancante visualId → failure con MISSING_OR_EMPTY_VISUAL_ID', async () => {
  const compiler = new VisualSpecCompiler({ artifactsDir: TEMP_ARTIFACTS_DIR });
  const badSpec = { schemaVersion: '1.0', kind: 'concept_map', title: 'Test', payload: { nodes: [], edges: [] } };
  const result = await compiler.compile(badSpec);
  expect(result.success).toBeFalse();
  expect(result.error).toContain('MISSING_OR_EMPTY_VISUAL_ID');
});

test('compile: kind non registrato → failure con UNKNOWN_KIND', async () => {
  const compiler = new VisualSpecCompiler({ artifactsDir: TEMP_ARTIFACTS_DIR });
  const badSpec = { schemaVersion: '1.0', visualId: 'VX', kind: 'quantum_hologram', title: 'X', payload: {} };
  const result = await compiler.compile(badSpec);
  expect(result.success).toBeFalse();
  expect(result.error).toContain('UNKNOWN_KIND');
});

test('compile: concept_map con arco su nodo inesistente → failure semantica', async () => {
  const compiler = new VisualSpecCompiler({ artifactsDir: TEMP_ARTIFACTS_DIR });
  const badSpec = {
    schemaVersion: '1.0', visualId: 'VY', kind: 'concept_map', title: 'Test',
    payload: {
      nodes: [{ id: 'A', label: 'Node A' }],
      edges: [{ id: 'E1', from: 'A', to: 'NONEXISTENT', relation: 'classification' }]
    }
  };
  const result = await compiler.compile(badSpec);
  expect(result.success).toBeFalse();
  expect(result.error).toContain('EDGE_TO_UNKNOWN_NODE');
});

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 6 — Compilation Barrier
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🚫 SEZIONE 6 — Compilation Barrier\n');

test('barrier PASS: content pulito', () => {
  const { pass } = runCompilationBarrier('# Capitolo 1\n\nTesto normale senza problemi.');
  expect(pass).toBeTrue();
});

test('barrier FAIL: raw json:visual-spec nel content', () => {
  const content = '# Mappa\n\n```json:visual-spec\n{"kind":"concept_map"}\n```\n\nTesto dopo.';
  const { pass, violations } = runCompilationBarrier(content);
  expect(pass).toBeFalse();
  expect(violations.some(v => v.includes('RAW_VISUAL_SPEC_IN_CONTENT'))).toBeTrue();
});

test('barrier FAIL: ASCII concept map rilevato', () => {
  const content = '## Mappa\n\n├── Nodo A\n│   └── Nodo B\n│   └── Nodo C\n└── Nodo D\n';
  const { pass, violations } = runCompilationBarrier(content);
  expect(pass).toBeFalse();
  expect(violations.some(v => v.includes('ASCII_CONCEPT_MAP_DETECTED'))).toBeTrue();
});

test('barrier FAIL: riferimento [[visual:...]] non risolto', () => {
  const content = 'Vedi la figura [[visual:V034]] per dettagli.';
  const { pass, violations } = runCompilationBarrier(content);
  expect(pass).toBeFalse();
  expect(violations.some(v => v.includes('UNRESOLVED_VISUAL_REFERENCES'))).toBeTrue();
});

test('barrier PASS: content null o vuoto', () => {
  const { pass } = runCompilationBarrier('');
  expect(pass).toBeTrue();
});

test('compile: layoutDirectives con chiave sconosciuta rifiutata', async () => {
  const compiler = new VisualSpecCompiler({ artifactsDir: TEMP_ARTIFACTS_DIR });
  const spec = {
    schemaVersion: '1.0',
    visualId: 'VL_ERR_KEY',
    kind: 'concept_map',
    title: 'Test',
    payload: {
      nodes: [{ id: 'n1', label: '1' }],
      edges: [],
      layoutDirectives: { intent: 'top_down', sconosciuta: true }
    }
  };
  const result = await compiler.compile(spec);
  expect(result.success).toBeFalse();
  expect(result.error).toContain('INVALID_LAYOUT_DIRECTIVE');
});

test('compile: layoutDirectives valide → success', async () => {
  const compiler = new VisualSpecCompiler({ artifactsDir: TEMP_ARTIFACTS_DIR });
  const spec = {
    schemaVersion: '1.0',
    visualId: 'VL2',
    kind: 'concept_map',
    title: 'Test',
    payload: {
      nodes: [{ id: 'n1', label: '1' }],
      edges: [],
      layoutDirectives: { intent: 'top_down', density: 'compact', wrapMode: 'auto', maxNodeWidth: 150 }
    }
  };
  const result = await compiler.compile(spec);
  expect(result.success).toBeTrue();
});

test('compile: invarianza semantica (cambiare layoutDirectives non altera nodi, archi, label o relazioni)', async () => {
  const compiler = new VisualSpecCompiler({ artifactsDir: TEMP_ARTIFACTS_DIR });

  // Baseline config
  const baseSpec = {
    schemaVersion: '1.0',
    visualId: 'VL3_base',
    kind: 'concept_map',
    title: 'Test Invarianza',
    payload: {
      nodes: [
        { id: 'n1', label: 'Nodo Uno' },
        { id: 'n2', label: 'Nodo Due' }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: 'collega' }
      ]
    }
  };

  const layoutSpec = JSON.parse(JSON.stringify(baseSpec));
  layoutSpec.visualId = 'VL3_layout';
  layoutSpec.payload.layoutDirectives = { intent: 'left_right', density: 'loose' };

  // Create deep clone prima della compilazione per il confronto
  const preCompileBaseNodes = JSON.parse(JSON.stringify(baseSpec.payload.nodes));
  const preCompileBaseEdges = JSON.parse(JSON.stringify(baseSpec.payload.edges));
  
  const preCompileLayoutNodes = JSON.parse(JSON.stringify(layoutSpec.payload.nodes));
  const preCompileLayoutEdges = JSON.parse(JSON.stringify(layoutSpec.payload.edges));

  const resBase = await compiler.compile(baseSpec);
  const resLayout = await compiler.compile(layoutSpec);

  expect(resBase.success).toBeTrue();
  expect(resLayout.success).toBeTrue();

  // Assert the semantic structures were not mutated during compile
  assert.deepStrictEqual(baseSpec.payload.nodes, preCompileBaseNodes);
  assert.deepStrictEqual(baseSpec.payload.edges, preCompileBaseEdges);
  assert.deepStrictEqual(layoutSpec.payload.nodes, preCompileLayoutNodes);
  assert.deepStrictEqual(layoutSpec.payload.edges, preCompileLayoutEdges);
  
  // Assert both have exactly identical semantic structures with each other
  assert.deepStrictEqual(baseSpec.payload.nodes, layoutSpec.payload.nodes);
  assert.deepStrictEqual(baseSpec.payload.edges, layoutSpec.payload.edges);

  const svgBase = require('fs').readFileSync(resBase.artifactPath, 'utf8');
  const svgLayout = require('fs').readFileSync(resLayout.artifactPath, 'utf8');

  // Verify the layouts actually produced different SVGs
  expect(svgBase !== svgLayout).toBeTrue();
});

test('compile: layoutDirectives modificano SVG e chiavi scorrette vengono rifiutate', async () => {
  const compiler = new VisualSpecCompiler({ artifactsDir: TEMP_ARTIFACTS_DIR });

  const createSpec = (id, directives) => ({
    schemaVersion: '1.0',
    visualId: id,
    kind: 'concept_map',
    title: 'Test',
    payload: {
      nodes: [
        { id: 'n1', label: 'Una etichetta di nodo molto lunga che dovrebbe andare a capo' },
        { id: 'n2', label: 'Nodo Due' }
      ],
      edges: [{ from: 'n1', to: 'n2', label: 'collega' }],
      layoutDirectives: directives
    }
  });

  const compileAndGetSvg = async (spec) => {
    const res = await compiler.compile(spec);
    expect(res.success).toBeTrue();
    return require('fs').readFileSync(res.artifactPath, 'utf8');
  };

  const svgTopDown = await compileAndGetSvg(createSpec('LD_1', { intent: 'top_down' }));
  const svgLeftRight = await compileAndGetSvg(createSpec('LD_2', { intent: 'left_right' }));
  assert.notStrictEqual(svgTopDown, svgLeftRight, 'top_down e left_right producono geometrie differenti');

  const svgCompact = await compileAndGetSvg(createSpec('LD_3', { density: 'compact' }));
  const svgLoose = await compileAndGetSvg(createSpec('LD_4', { density: 'loose' }));
  assert.notStrictEqual(svgCompact, svgLoose, 'compact e loose producono distanze differenti');

  const svgWrapAuto = await compileAndGetSvg(createSpec('LD_5', { wrapMode: 'auto' }));
  const svgWrapNone = await compileAndGetSvg(createSpec('LD_6', { wrapMode: 'none' }));
  assert.notStrictEqual(svgWrapAuto, svgWrapNone, 'wrapMode auto e none producono rendering differenti');
  
  const svgMaxWidth50 = await compileAndGetSvg(createSpec('LD_7', { maxNodeWidth: 50 }));
  const svgMaxWidth300 = await compileAndGetSvg(createSpec('LD_8', { maxNodeWidth: 300 }));
  assert.notStrictEqual(svgMaxWidth50, svgMaxWidth300, 'maxNodeWidth diversi producono geometrie differenti');
  
  // SVG, XML e coordinate inseriti nelle direttive vengono rifiutati
  const maliciousDirectives = [
    { svg: '<svg></svg>' },
    { xml: '<node/>' },
    { x: 100, y: 200 }
  ];

  for (let i = 0; i < maliciousDirectives.length; i++) {
    const dir = maliciousDirectives[i];
    const spec = createSpec('LD_ERR_' + i, dir);
    const result = await compiler.compile(spec);
    expect(result.success).toBeFalse();
    expect(result.error).toContain('INVALID_LAYOUT_DIRECTIVE');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FINALE
// ─────────────────────────────────────────────────────────────────────────────

async function runAsync() {
  for (const t of asyncTests) {
    await t();
  }
}

async function main() {
  try {
    await fs.ensureDir(TEMP_ARTIFACTS_DIR);
    await runAsync();
  } finally {
    // Cleanup temp artifacts
    try { await fs.remove(TEMP_ARTIFACTS_DIR); } catch (_) {}

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`  Risultato: ${passed} passati, ${failed} falliti`);
    console.log('─'.repeat(50));

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('\n  ✅ Tutti i test Visual Compiler superati!\n');
    }
  }
}

// I test sincroni vengono già eseguiti durante il require.
// Avvio il main solo per cleanup e summary.
main().catch(err => {
  console.error('Errore critico test runner:', err);
  process.exit(1);
});
