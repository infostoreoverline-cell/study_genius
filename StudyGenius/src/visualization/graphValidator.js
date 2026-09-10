/**
 * StudyGenius Academic Intelligence System
 * src/visualization/graphValidator.js
 * 
 * Validatore deterministico per dataset numerici e coerenza testo↔grafico.
 * 
 * Controlli minimi MVP:
 * 1. dataset non vuoto
 * 2. nessun NaN / Infinity nei valori y
 * 3. dominio x coerente con quello dichiarato nel nodo GRAPH
 * 4. expression valutabile da mathjs senza errori
 * 5. se domainSplit presente: nessun gap o overlap tra le condizioni
 * 
 * Controllo di coerenza testuale:
 * - checkClaimConsistency: verifica deterministica senza LLM dei claim numerici dichiarati nel testo.
 */

const math = require('mathjs');
const { evaluateScalar, inferVariableName } = require('./dataBuilder');

/**
 * Esegue i 5 controlli minimi MVP sul dataset calcolato e sulla specifica del nodo GRAPH.
 * 
 * @param {Object} graphNode Specifica nodo GRAPH
 * @param {Object} dataset Dataset calcolato da dataBuilder.js
 * @returns {{ valid: boolean, errors: Array<{ type: string, message: string, details?: any }> }}
 */
function validateGraphData(arg1, arg2) {
  // Supporta sia validateGraphData(graphNode, dataset) che validateGraphData(dataset, graphNode)
  let graphNode, dataset;
  if (arg1 && Array.isArray(arg1.points)) {
    dataset = arg1;
    graphNode = arg2;
  } else {
    graphNode = arg1;
    dataset = arg2;
  }

  const errors = [];

  // 1. Controllo: dataset non vuoto
  if (!dataset || !Array.isArray(dataset.points) || dataset.points.length === 0) {
    errors.push({
      type: 'GRAPH_DATA_INVALID',
      message: 'Il dataset calcolato è vuoto o non contiene punti'
    });
    return { valid: false, errors };
  }

  // 2. Controllo: nessun NaN / Infinity nei valori y (e x)
  const invalidPoints = dataset.points.filter(p => (
    typeof p.y !== 'number' || isNaN(p.y) || !isFinite(p.y) ||
    typeof p.x !== 'number' || isNaN(p.x) || !isFinite(p.x)
  ));

  if (invalidPoints.length > 0) {
    errors.push({
      type: 'GRAPH_DATA_INVALID',
      message: `Rilevati ${invalidPoints.length} punti non validi (NaN o Infinity) nel dataset`,
      details: { sample: invalidPoints.slice(0, 5) }
    });
  }

  // 3. Controllo: dominio x coerente con quello dichiarato nel nodo GRAPH
  const context = { ...(graphNode.context || {}) };
  const expectedMin = evaluateScalar(graphNode.x.min, context);
  const expectedMax = evaluateScalar(graphNode.x.max, context);

  const actualMin = dataset.points[0].x;
  const actualMax = dataset.points[dataset.points.length - 1].x;

  const tol = 1e-6;
  if (Math.abs(actualMin - expectedMin) > tol || Math.abs(actualMax - expectedMax) > tol) {
    errors.push({
      type: 'GRAPH_DATA_INVALID',
      message: `Dominio X incoerente. Atteso: [${expectedMin}, ${expectedMax}], Calcolato: [${actualMin}, ${actualMax}]`,
      details: { expectedMin, expectedMax, actualMin, actualMax }
    });
  }

  // 4. Controllo: expression valutabile da mathjs senza errori
  const varName = inferVariableName(graphNode);
  const sampleScope = { ...context, [varName]: expectedMin, x: expectedMin };

  if (graphNode.expression) {
    try {
      math.evaluate(graphNode.expression, sampleScope);
    } catch (exprErr) {
      errors.push({
        type: 'GRAPH_DATA_INVALID',
        message: `Espressione principale "${graphNode.expression}" non valutabile: ${exprErr.message}`,
        details: { expression: graphNode.expression, error: exprErr.message }
      });
    }
  }

  // 5. Controllo: se domainSplit presente: nessun gap o overlap tra le condizioni
  if (Array.isArray(graphNode.domainSplit) && graphNode.domainSplit.length > 0) {
    const testSamples = 100;
    const testStep = (expectedMax - expectedMin) / testSamples;

    let hasGap = false;
    let hasOverlap = false;
    const problematicPoints = [];

    for (let i = 0; i <= testSamples; i++) {
      const xVal = expectedMin + i * testStep;
      const testScope = { ...context, [varName]: xVal, x: xVal };

      let matchCount = 0;
      for (const split of graphNode.domainSplit) {
        try {
          if (math.evaluate(split.condition, testScope)) {
            matchCount++;
          }
        } catch (condErr) {
          errors.push({
            type: 'GRAPH_DATA_INVALID',
            message: `Errore nella condizione di domainSplit "${split.condition}": ${condErr.message}`
          });
        }
      }

      if (matchCount === 0 && !hasGap) {
        hasGap = true;
        problematicPoints.push({ x: xVal, issue: 'GAP (nessuna condizione soddisfatta)' });
      } else if (matchCount > 1 && !hasOverlap) {
        hasOverlap = true;
        problematicPoints.push({ x: xVal, issue: 'OVERLAP (condizioni multiple soddisfatte contemporaneamente)' });
      }
    }

    if (hasGap) {
      errors.push({
        type: 'GRAPH_DATA_INVALID',
        message: 'Rilevato GAP nella suddivisione a tratti (domainSplit): esistono intervalli non coperti da alcuna condizione',
        details: { problematicPoints }
      });
    }

    if (hasOverlap) {
      errors.push({
        type: 'GRAPH_DATA_INVALID',
        message: 'Rilevato OVERLAP nella suddivisione a tratti (domainSplit): esistono punti che soddisfano condizioni multiple in conflitto',
        details: { problematicPoints }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Esegue la verifica deterministica di coerenza testo↔grafico (Sezione 9).
 * Confronta affermazioni analitiche presenti nel testo (claim) con i valori reali del dataset calcolato.
 * 
 * @param {Object} claim Specifica del claim
 * @param {string} claim.claim Tipo di claim ('max_at', 'min_at', 'value_at', 'zero_at', ecc.)
 * @param {number|string} [claim.x] Coordinata x dichiarata o simbolica (es. "R")
 * @param {number|string} [claim.xValue] Coordinata x numerica
 * @param {number|string} [claim.y_expected] Valore y atteso dichiarato
 * @param {number|string} [claim.yExpected] Valore y atteso alternativo
 * @param {Object} dataset Dataset calcolato da dataBuilder
 * @param {number} [tolerance=0.02] Tolleranza relativa (default 2%)
 * @param {Object} [context={}] Contesto per risoluzione variabili simboliche
 * @returns {{ valid: boolean, hardFail?: string, claim: Object, actual: number, expected: number, relError?: number, message?: string }}
 */
function checkClaimConsistency(claim, dataset, tolerance = 0.02, context = {}) {
  if (!claim || !dataset || !Array.isArray(dataset.points) || dataset.points.length === 0) {
    return {
      valid: false,
      hardFail: 'GRAPH_TEXT_INCONSISTENCY',
      claim,
      actual: NaN,
      expected: NaN,
      message: 'Dati o claim non validi per la verifica di coerenza'
    };
  }

  // Risoluzione coordinate x e y_expected
  const xTarget = claim.xValue !== undefined
    ? Number(claim.xValue)
    : evaluateScalar(claim.x, context);

  let expectedY = claim.yExpected !== undefined
    ? Number(claim.yExpected)
    : (claim.y_expected !== undefined ? evaluateScalar(claim.y_expected, context) : undefined);

  if (isNaN(xTarget)) {
    return {
      valid: false,
      hardFail: 'GRAPH_TEXT_INCONSISTENCY',
      claim,
      actual: NaN,
      expected: expectedY,
      message: `Punto x dichiarato nel claim non risolvibile: "${claim.x || claim.xValue}"`
    };
  }

  // Trova il punto più vicino nel dataset reale
  const step = dataset.step || ((dataset.domain[1] - dataset.domain[0]) / dataset.points.length);
  const actual = dataset.points.find(p => Math.abs(p.x - xTarget) <= (step * 0.6))
    || dataset.points.reduce((closest, curr) => (
      Math.abs(curr.x - xTarget) < Math.abs(closest.x - xTarget) ? curr : closest
    ), dataset.points[0]);

  if (!actual) {
    return {
      valid: false,
      hardFail: 'GRAPH_TEXT_INCONSISTENCY',
      claim,
      actual: NaN,
      expected: expectedY,
      message: `Nessun punto trovato nel dataset corrispondente a x=${xTarget}`
    };
  }

  // Se il claim è 'max_at': verifica anche che sia effettivamente un massimo relativo o assoluto
  if (claim.claim === 'max_at') {
    const isGlobalMax = dataset.points.every(p => p.y <= actual.y + Math.abs(actual.y * tolerance));
    if (!isGlobalMax) {
      return {
        valid: false,
        hardFail: 'GRAPH_TEXT_INCONSISTENCY',
        claim,
        actual: actual.y,
        expected: expectedY,
        message: `Il claim dichiara un massimo a x=${xTarget} (y=${actual.y}), ma il grafico presenta valori superiori altrove`
      };
    }
  }

  // Se il claim è 'min_at': verifica che sia effettivamente un minimo
  if (claim.claim === 'min_at') {
    const isGlobalMin = dataset.points.every(p => p.y >= actual.y - Math.abs(actual.y * tolerance));
    if (!isGlobalMin) {
      return {
        valid: false,
        hardFail: 'GRAPH_TEXT_INCONSISTENCY',
        claim,
        actual: actual.y,
        expected: expectedY,
        message: `Il claim dichiara un minimo a x=${xTarget} (y=${actual.y}), ma il grafico presenta valori inferiori altrove`
      };
    }
  }

  // Se c'è un valore atteso y da verificare
  if (expectedY !== undefined && !isNaN(expectedY)) {
    let relError;
    if (Math.abs(expectedY) < 1e-9) {
      relError = Math.abs(actual.y - expectedY);
    } else {
      relError = Math.abs(actual.y - expectedY) / Math.abs(expectedY);
    }

    if (relError > tolerance) {
      return {
        valid: false,
        hardFail: 'GRAPH_TEXT_INCONSISTENCY',
        claim,
        actual: actual.y,
        expected: expectedY,
        relError,
        message: `Incoerenza numerica testo↔grafico: per x=${xTarget}, il testo indica y=${expectedY}, ma il calcolo deterministico restituisce y=${actual.y} (errore relativo ${(relError * 100).toFixed(2)}% > tolleranza ${(tolerance * 100).toFixed(2)}%)`
      };
    }

    return {
      valid: true,
      claim,
      actual: actual.y,
      expected: expectedY,
      relError
    };
  }

  return {
    valid: true,
    claim,
    actual: actual.y,
    expected: actual.y,
    relError: 0
  };
}

module.exports = {
  validateGraphData,
  checkClaimConsistency
};
