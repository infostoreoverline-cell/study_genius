/**
 * StudyGenius Academic Intelligence System
 * test_visualization_engine.js
 * 
 * Test Suite per la Milestone V1 del Visualization Engine:
 * - Validazione schema del nodo GRAPH (graphSpec.js)
 * - Calcolo deterministico dataset per la sfera carica E(r) (dataBuilder.js)
 * - I 5 controlli di integrità del dataset (graphValidator.js)
 * - Controllo deterministico di coerenza claim testo↔grafico (GRAPH_TEXT_INCONSISTENCY)
 * - Integrazione con AcademicKnowledgeGraph
 * - Rendering SVG client-side con D3.js in ambiente Puppeteer reale
 */

const assert = require('assert');
const {
  validateGraphSpec,
  ALLOWED_PROVENANCES_MVP,
  ALLOWED_CHART_TYPES_MVP,
  buildDataset,
  validateGraphData,
  checkClaimConsistency,
  renderGraphToHtml,
  getGraphHeadAssets,
  renderGraphToStaticSvg
} = require('../src/visualization');
const { AcademicKnowledgeGraph } = require('../src/core/knowledgeGraph');
const puppeteer = require('puppeteer');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

console.log('\n===============================================================');
console.log('🔬 STUDYGENIUS VISUALIZATION ENGINE (MILESTONE V1) TEST SUITE');
console.log('===============================================================\n');

// ---------------------------------------------------------------------------
// TEST 1: Validazione Schema del Nodo GRAPH (graphSpec.js)
// ---------------------------------------------------------------------------
console.log('📋 Gruppo 1: Validazione Schema Nodo GRAPH');

const validSphereGraphNode = {
  id: 'electric-field-charged-sphere',
  type: 'GRAPH',
  chapterId: 'campo-elettrico-simmetria-sferica',
  relatedFormulaId: 'gauss-law-e-sphere',
  provenance: 'FORMULA-derived',
  chartType: 'FUNCTION',
  x: { label: 'r', unit: 'm', min: 0, max: '3*R' },
  y: { label: 'E(r)', unit: 'N/C' },
  domainSplit: [
    { condition: 'r < R', expression: 'rho*r/(3*epsilon0)' },
    { condition: 'r >= R', expression: 'rho*R^3/(3*epsilon0*r^2)' }
  ],
  annotations: [
    { x: 'R', label: 'raccordo tra i due regimi' }
  ],
  context: {
    R: 1.0,
    rho: 1.0,
    epsilon0: 8.854e-12
  },
  status: 'unverified'
};

runTest('1.1 Schema valido per E(r) della sfera carica', () => {
  const result = validateGraphSpec(validSphereGraphNode);
  assert.strictEqual(result.valid, true, 'Lo schema valido deve essere accettato');
  assert.strictEqual(result.errors.length, 0);
});

runTest('1.2 Rifiuto assoluto se manca la provenance (GRAPH_MISSING_PROVENANCE)', () => {
  const invalid = { ...validSphereGraphNode };
  delete invalid.provenance;
  const result = validateGraphSpec(invalid);
  assert.strictEqual(result.valid, false);
  const provErr = result.errors.find(e => e.code === 'GRAPH_MISSING_PROVENANCE');
  assert.ok(provErr, 'Deve segnalare GRAPH_MISSING_PROVENANCE');
});

runTest('1.3 Rifiuto se la provenance non è supportata nel MVP', () => {
  const invalid = { ...validSphereGraphNode, provenance: 'DATA-derived' };
  const result = validateGraphSpec(invalid);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.code === 'UNSUPPORTED_PROVENANCE'));
});

runTest('1.4 Rifiuto di chartType non consentito nel MVP', () => {
  const invalid = { ...validSphereGraphNode, chartType: '3D_SURFACE' };
  const result = validateGraphSpec(invalid);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.code === 'UNSUPPORTED_CHART_TYPE'));
});

runTest('1.5 Rifiuto se mancano assi o espressione matematica', () => {
  const missingAxis = { ...validSphereGraphNode, x: null };
  assert.strictEqual(validateGraphSpec(missingAxis).valid, false);

  const missingExpr = { ...validSphereGraphNode, expression: null, domainSplit: null };
  assert.strictEqual(validateGraphSpec(missingExpr).valid, false);
});

// ---------------------------------------------------------------------------
// TEST 2: Calcolo Deterministico del Dataset per E(r) (dataBuilder.js)
// ---------------------------------------------------------------------------
console.log('\n📐 Gruppo 2: Calcolo Deterministico del Dataset (dataBuilder.js)');

let calculatedDataset = null;

runTest('2.1 Calcolo deterministico dataset per sfera carica (R=1, rho=1, epsilon0=8.854e-12)', () => {
  calculatedDataset = buildDataset(validSphereGraphNode, 300);
  assert.ok(calculatedDataset, 'Il dataset non deve essere null');
  assert.strictEqual(calculatedDataset.points.length, 301, 'Deve contenere 301 punti campionati');
  assert.strictEqual(calculatedDataset.domain[0], 0);
  assert.strictEqual(calculatedDataset.domain[1], 3.0);
});

runTest('2.2 Verifica fisica esatta a r=0, r=R e r=3R', () => {
  const { R, rho, epsilon0 } = validSphereGraphNode.context;
  const expectedEmax = (rho * R) / (3 * epsilon0); // ~ 3.76477e10 N/C

  // 1. A r = 0, E = 0
  const p0 = calculatedDataset.points[0];
  assert.strictEqual(p0.x, 0);
  assert.strictEqual(p0.y, 0, 'Il campo elettrico al centro della sfera deve essere esattamente 0');

  // 2. A r = R, E = Emax
  const pR = calculatedDataset.points.find(p => Math.abs(p.x - 1.0) < 0.005);
  assert.ok(pR, 'Punto a r=R trovato');
  const relDiffMax = Math.abs(pR.y - expectedEmax) / expectedEmax;
  assert.ok(relDiffMax < 0.01, `E(R) deve coincidere con la formula teorica (diff: ${relDiffMax})`);

  // 3. Raccordo continuo tra i due regimi: verifica che non vi siano salti a r=R
  const step = calculatedDataset.step;
  const pJustBefore = calculatedDataset.points.find(p => Math.abs(p.x - (1.0 - step)) < 1e-6);
  const pJustAfter = calculatedDataset.points.find(p => Math.abs(p.x - (1.0 + step)) < 1e-6);
  assert.ok(pJustBefore && pJustAfter);
  const jump = Math.abs(pJustAfter.y - pJustBefore.y) / expectedEmax;
  assert.ok(jump < 0.05, `La transizione deve essere continua, salto relativo: ${jump}`);

  // 4. A r = 3R, E(3R) = Emax / 9 (legge inverso del quadrato)
  const p3R = calculatedDataset.points[calculatedDataset.points.length - 1];
  assert.strictEqual(p3R.x, 3.0);
  const expectedE3R = expectedEmax / 9;
  const relDiff3R = Math.abs(p3R.y - expectedE3R) / expectedE3R;
  assert.ok(relDiff3R < 0.01, `E(3R) deve decrescere come 1/r^2 (diff: ${relDiff3R})`);

  // 5. Verifica annotazione risolta con coordinate corrette
  assert.strictEqual(calculatedDataset.annotations.length, 1);
  assert.strictEqual(calculatedDataset.annotations[0].x, 1.0);
  const annRelDiff = Math.abs(calculatedDataset.annotations[0].y - expectedEmax) / expectedEmax;
  assert.ok(annRelDiff < 0.01, 'L\'annotazione deve avere coordinata Y calcolata esattamente');
});

// ---------------------------------------------------------------------------
// TEST 3: I 5 Controlli Minimi di Integrità Dataset (graphValidator.js)
// ---------------------------------------------------------------------------
console.log('\n🛡️ Gruppo 3: Controlli Minimi di Validazione Dataset (graphValidator.js)');

runTest('3.1 Dataset valido supera tutti i 5 controlli', () => {
  const result = validateGraphData(validSphereGraphNode, calculatedDataset);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

runTest('3.2 Rilevamento NaN o Infinity nei valori y (GRAPH_DATA_INVALID)', () => {
  const badDataset = {
    ...calculatedDataset,
    points: [
      ...calculatedDataset.points.slice(0, 10),
      { x: 0.1, y: NaN },
      ...calculatedDataset.points.slice(11)
    ]
  };
  const result = validateGraphData(validSphereGraphNode, badDataset);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.type === 'GRAPH_DATA_INVALID' && e.message.includes('NaN')));
});

runTest('3.3 Rilevamento di GAP nella suddivisione a tratti (domainSplit)', () => {
  const gappedNode = {
    ...validSphereGraphNode,
    domainSplit: [
      { condition: 'r < 0.8', expression: 'rho*r/(3*epsilon0)' },
      { condition: 'r >= 1.2', expression: 'rho*R^3/(3*epsilon0*r^2)' }
      // GAP tra 0.8 e 1.2!
    ]
  };
  const result = validateGraphData(gappedNode, calculatedDataset);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.message.includes('GAP')));
});

runTest('3.4 Rilevamento di OVERLAP nella suddivisione a tratti (domainSplit)', () => {
  const overlapNode = {
    ...validSphereGraphNode,
    domainSplit: [
      { condition: 'r <= 1.5', expression: 'rho*r/(3*epsilon0)' },
      { condition: 'r >= 0.5', expression: 'rho*R^3/(3*epsilon0*r^2)' }
      // OVERLAP tra 0.5 e 1.5!
    ]
  };
  const result = validateGraphData(overlapNode, calculatedDataset);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.message.includes('OVERLAP')));
});

// ---------------------------------------------------------------------------
// TEST 4: Verifica Deterministica Coerenza Testo↔Grafico (GRAPH_TEXT_INCONSISTENCY)
// ---------------------------------------------------------------------------
console.log('\n🔍 Gruppo 4: Verifica Deterministica Coerenza Testo↔Grafico');

runTest('4.1 Claim veritiero confermato con successo numerico', () => {
  const { R, rho, epsilon0 } = validSphereGraphNode.context;
  const expectedEmax = (rho * R) / (3 * epsilon0);

  const trueClaim = {
    graphId: 'electric-field-charged-sphere',
    claim: 'max_at',
    x: 'R',
    y_expected: expectedEmax
  };

  const check = checkClaimConsistency(trueClaim, calculatedDataset, 0.02, validSphereGraphNode.context);
  assert.strictEqual(check.valid, true);
  assert.ok(check.relError < 0.02);
});

runTest('4.2 Claim mendace: valore numerico errato scatena GRAPH_TEXT_INCONSISTENCY', () => {
  const falseValueClaim = {
    graphId: 'electric-field-charged-sphere',
    claim: 'value_at',
    x: 'R',
    y_expected: 1.5e5 // Valore completamente inventato dall'LLM!
  };

  const check = checkClaimConsistency(falseValueClaim, calculatedDataset, 0.02, validSphereGraphNode.context);
  assert.strictEqual(check.valid, false);
  assert.strictEqual(check.hardFail, 'GRAPH_TEXT_INCONSISTENCY');
  assert.ok(check.relError > 0.9);
  console.log(`    ℹ️ Bloccata incoerenza testo-grafico: relError = ${(check.relError * 100).toFixed(1)}%`);
});

runTest('4.3 Claim mendace: posizione del massimo errata scatena GRAPH_TEXT_INCONSISTENCY', () => {
  const falseMaxClaim = {
    graphId: 'electric-field-charged-sphere',
    claim: 'max_at',
    x: 2.0 // Il testo sostiene erroneamente che il massimo sia a r=2R anziché r=R!
  };

  const check = checkClaimConsistency(falseMaxClaim, calculatedDataset, 0.02, validSphereGraphNode.context);
  assert.strictEqual(check.valid, false);
  assert.strictEqual(check.hardFail, 'GRAPH_TEXT_INCONSISTENCY');
  assert.ok(check.message.includes('massimo'));
});

// ---------------------------------------------------------------------------
// TEST 5: Integrazione con AcademicKnowledgeGraph
// ---------------------------------------------------------------------------
console.log('\n🌐 Gruppo 5: Integrazione con AcademicKnowledgeGraph');

runTest('5.1 Creazione ed edge tra nodo FORMULA e nodo GRAPH nel grafo della conoscenza', () => {
  const akg = new AcademicKnowledgeGraph('test-session', 'Fisica 2');

  // Nodo FORMULA
  const formulaNode = akg.addNode({
    id: 'gauss-law-e-sphere',
    type: 'FORMULA',
    chapterId: 'campo-elettrico-simmetria-sferica',
    label: 'Campo di una sfera uniformemente carica',
    content: 'E(r) = \\frac{\\rho r}{3\\varepsilon_0} (r < R); \\frac{\\rho R^3}{3\\varepsilon_0 r^2} (r \\ge R)'
  });
  assert.strictEqual(formulaNode.type, 'FORMULA');

  // Nodo GRAPH
  const graphNode = akg.addNode({
    ...validSphereGraphNode,
    attrs: {
      provenance: 'FORMULA-derived',
      chartType: 'FUNCTION'
    }
  });
  assert.strictEqual(graphNode.type, 'GRAPH');

  // Relazione formale ILLUSTRATED_BY
  akg.addEdge({
    from: 'gauss-law-e-sphere',
    to: 'electric-field-charged-sphere',
    type: 'ILLUSTRATED_BY'
  });

  // Validazione del Knowledge Graph aggiornato
  const validation = akg.validate();
  assert.strictEqual(validation.valid, true, `Il grafo deve essere valido. Errori: ${JSON.stringify(validation.errors)}`);
});

// ---------------------------------------------------------------------------
// TEST 6: Rendering Vettoriale D3.js Client-Side in Puppeteer Reale
// ---------------------------------------------------------------------------
console.log('\n🎨 Gruppo 6: Rendering D3.js Client-Side in Puppeteer (Snapshot Test)');

(async () => {
  await runAsyncTest('6.1 Generazione HTML e rendering SVG con primitive D3.js in Puppeteer', async () => {
    // Genera l'HTML del grafico
    const htmlSnippet = renderGraphToHtml(validSphereGraphNode, calculatedDataset);
    assert.ok(htmlSnippet.includes('class="academic-graph-container"'));
    assert.ok(htmlSnippet.includes('FORMULA-derived'));

    // Lancia Puppeteer headless
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      const svgResult = await renderGraphToStaticSvg(page, validSphereGraphNode, calculatedDataset);

      assert.ok(svgResult, 'Il rendering D3 in Puppeteer deve produrre un risultato');
      assert.ok(svgResult.svg.includes('<svg'), 'L\'output deve contenere un tag <svg>');
      assert.ok(svgResult.svg.includes('curve-path'), 'Deve contenere il path D3 della curva');
      assert.strictEqual(svgResult.hasAxes, true, 'Deve contenere gli assi D3 formattati (axis-x e axis-y)');
      assert.strictEqual(svgResult.hasGrid, true, 'Deve contenere la griglia di riferimento');
      assert.strictEqual(svgResult.annotationCount, 1, 'Deve aver disegnato il punto notevole di raccordo');
      assert.strictEqual(svgResult.provenanceLabel.trim().toUpperCase(), 'FORMULA-DERIVED');

      // Verifica che la curva contenga coordinate SVG valide
      const pathMatch = svgResult.svg.match(/class="curve-path"[^>]*d="([^"]+)"/);
      assert.ok(pathMatch && pathMatch[1].startsWith('M'), 'Il generator D3.line() deve aver generato un path SVG "M..." valido');

      console.log(`    ℹ️ SVG vettoriale D3 renderizzato con successo (${svgResult.svg.length} caratteri, 1 annotazione, assi e griglia presenti)`);
    } finally {
      await browser.close();
    }
  });

  console.log('\n===============================================================');
  console.log(`🎉 TUTTI I ${passedTests}/${totalTests} TEST DEL VISUALIZATION ENGINE SONO PASSATI CON SUCCESSO!`);
  console.log('===============================================================\n');
})().catch(err => {
  console.error('\n❌ Errore irreversibile nella test suite:', err);
  process.exit(1);
});
