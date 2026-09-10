/**
 * StudyGenius Academic Intelligence System
 * src/visualization/dataBuilder.js
 * 
 * Motore deterministico per il calcolo dei dataset numerici.
 * Trasforma espressioni simboliche/continue/a tratti in tabelle di punti discreti
 * garantendo precisione matematica e zero allucinazioni dell'LLM.
 */

const math = require('mathjs');

/**
 * Risolve un'espressione scalare numerica o simbolica dato un contesto.
 * 
 * @param {number|string} val Valore numerico o espressione (es. "3*R")
 * @param {Object} context Dizionario delle costanti e parametri
 * @returns {number}
 */
function evaluateScalar(val, context = {}) {
  if (typeof val === 'number') {
    return val;
  }
  if (typeof val === 'string') {
    const res = math.evaluate(val, context);
    return Number(res);
  }
  return NaN;
}

/**
 * Determina il nome della variabile indipendente principale.
 * 
 * @param {Object} graphNode 
 * @returns {string}
 */
function inferVariableName(graphNode) {
  if (graphNode.variable && typeof graphNode.variable === 'string') {
    return graphNode.variable.trim();
  }
  const xLabel = graphNode.x && graphNode.x.label ? graphNode.x.label.trim() : '';
  // Se l'etichetta è un identificatore alfanumerico semplice (es. "r", "x", "t", "pH")
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(xLabel)) {
    return xLabel;
  }
  return 'x';
}

/**
 * Costruisce il dataset numerico a partire dalla specifica del nodo GRAPH.
 * 
 * @param {Object} graphNode Nodo GRAPH validato
 * @param {number} [points=200] Numero di punti da campionare
 * @returns {{
 *   points: Array<{ x: number, y: number }>,
 *   domain: [number, number],
 *   range: [number, number],
 *   step: number,
 *   xLabel: string,
 *   xUnit: string,
 *   yLabel: string,
 *   yUnit: string,
 *   provenance: string,
 *   annotations: Array<{ x: number, y: number, label: string }>
 * }}
 */
function buildDataset(graphNode, points = 200) {
  if (!graphNode || !graphNode.x) {
    throw new Error('Nodo GRAPH non valido per la generazione del dataset');
  }

  const context = { ...(graphNode.context || {}) };
  const varName = inferVariableName(graphNode);

  // Risoluzione limiti dominio
  const xMin = evaluateScalar(graphNode.x.min, context);
  const xMax = evaluateScalar(graphNode.x.max, context);

  if (isNaN(xMin) || isNaN(xMax)) {
    throw new Error(`Limiti del dominio X non validi: min=${graphNode.x.min}, max=${graphNode.x.max}`);
  }
  if (xMin >= xMax) {
    throw new Error(`Il limite inferiore x.min (${xMin}) deve essere minore di x.max (${xMax})`);
  }

  const numPoints = Math.max(10, points);
  const step = (xMax - xMin) / numPoints;

  const datasetPoints = [];
  let yMinObserved = Infinity;
  let yMaxObserved = -Infinity;

  const { expression, domainSplit } = graphNode;

  for (let i = 0; i <= numPoints; i++) {
    const xi = xMin + i * step;
    // Ambito di valutazione con la variabile sia con il suo nome dedotto che come fallback 'x'
    const scope = {
      ...context,
      [varName]: xi,
      x: xi
    };

    let activeExpr = expression;
    if (Array.isArray(domainSplit) && domainSplit.length > 0) {
      const match = domainSplit.find(d => {
        try {
          return !!math.evaluate(d.condition, scope);
        } catch (e) {
          return false;
        }
      });
      if (match) {
        activeExpr = match.expression;
      } else {
        // Nessuna condizione soddisfatta: segnala gap
        activeExpr = null;
      }
    }

    if (!activeExpr) {
      datasetPoints.push({ x: xi, y: NaN });
      continue;
    }

    let yi = NaN;
    try {
      yi = Number(math.evaluate(activeExpr, scope));
    } catch (err) {
      yi = NaN;
    }

    datasetPoints.push({ x: xi, y: yi });

    if (!isNaN(yi) && isFinite(yi)) {
      if (yi < yMinObserved) yMinObserved = yi;
      if (yi > yMaxObserved) yMaxObserved = yi;
    }
  }

  // Risoluzione annotazioni con coordinate numeriche esatte
  const resolvedAnnotations = [];
  if (Array.isArray(graphNode.annotations)) {
    for (const ann of graphNode.annotations) {
      const annX = evaluateScalar(ann.x, context);
      if (isNaN(annX)) continue;

      const annScope = {
        ...context,
        [varName]: annX,
        x: annX
      };

      let annY;
      if (ann.y !== undefined) {
        annY = evaluateScalar(ann.y, context);
      } else {
        let activeExpr = expression;
        if (Array.isArray(domainSplit) && domainSplit.length > 0) {
          const match = domainSplit.find(d => {
            try {
              return !!math.evaluate(d.condition, annScope);
            } catch (e) {
              return false;
            }
          });
          if (match) activeExpr = match.expression;
        }
        try {
          annY = activeExpr ? Number(math.evaluate(activeExpr, annScope)) : NaN;
        } catch (e) {
          annY = NaN;
        }
      }

      resolvedAnnotations.push({
        x: annX,
        y: annY,
        label: ann.label || ''
      });
    }
  }

  const yMin = isFinite(yMinObserved) ? yMinObserved : 0;
  const yMax = isFinite(yMaxObserved) ? yMaxObserved : 1;

  return {
    points: datasetPoints,
    domain: [xMin, xMax],
    range: [yMin, yMax],
    step,
    xLabel: graphNode.x.label || 'x',
    xUnit: graphNode.x.unit || '',
    yLabel: graphNode.y.label || 'y',
    yUnit: graphNode.y.unit || '',
    provenance: graphNode.provenance || 'FORMULA-derived',
    relatedFormulaId: graphNode.relatedFormulaId || null,
    annotations: resolvedAnnotations
  };
}

module.exports = {
  buildDataset,
  evaluateScalar,
  inferVariableName
};
