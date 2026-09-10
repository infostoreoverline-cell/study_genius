/**
 * StudyGenius Academic Intelligence System
 * src/visualization/graphSpec.js
 * 
 * Validatore e definizioni di schema per il nodo GRAPH nel Knowledge Graph.
 * Rispetta il principio fondamentale:
 * "LLM decides what to plot; deterministic engine decides how to calculate and render it."
 */

const ALLOWED_PROVENANCES_MVP = new Set(['FORMULA-derived']);
const ALLOWED_CHART_TYPES_MVP = new Set(['FUNCTION', 'LINE', 'SCATTER']);

/**
 * Valida la conformità di uno schema di nodo GRAPH alle specifiche MVP.
 * 
 * @param {Object} node Oggetto nodo da validare
 * @returns {{ valid: boolean, errors: Array<{ field: string, message: string, code: string }> }}
 */
function validateGraphSpec(node) {
  const errors = [];

  if (!node || typeof node !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'node', message: 'Il nodo deve essere un oggetto valido', code: 'INVALID_NODE' }]
    };
  }

  // 1. Validazione Campi Base
  if (!node.id || typeof node.id !== 'string' || !node.id.trim()) {
    errors.push({ field: 'id', message: 'Il campo "id" è obbligatorio e deve essere una stringa non vuota', code: 'MISSING_ID' });
  }

  const type = (node.type || '').toUpperCase();
  if (type !== 'GRAPH') {
    errors.push({ field: 'type', message: `Il campo "type" deve essere "GRAPH" (ricevuto: "${node.type}")`, code: 'INVALID_TYPE' });
  }

  if (!node.chapterId || typeof node.chapterId !== 'string' || !node.chapterId.trim()) {
    errors.push({ field: 'chapterId', message: 'Il campo "chapterId" è obbligatorio', code: 'MISSING_CHAPTER_ID' });
  }

  // 2. Provenance (Regola assoluta: nessun grafico senza provenienza dichiarata)
  if (!node.provenance) {
    errors.push({
      field: 'provenance',
      message: 'Un nodo GRAPH senza provenance dichiarata non può essere renderizzato',
      code: 'GRAPH_MISSING_PROVENANCE'
    });
  } else if (!ALLOWED_PROVENANCES_MVP.has(node.provenance)) {
    errors.push({
      field: 'provenance',
      message: `Provenance "${node.provenance}" non supportata nel MVP. Ammesse solo: ${Array.from(ALLOWED_PROVENANCES_MVP).join(', ')}`,
      code: 'UNSUPPORTED_PROVENANCE'
    });
  }

  // 3. Chart Type (Limitato a FUNCTION, LINE, SCATTER nel MVP)
  const chartType = (node.chartType || '').toUpperCase();
  if (!chartType) {
    errors.push({ field: 'chartType', message: 'Il campo "chartType" è obbligatorio', code: 'MISSING_CHART_TYPE' });
  } else if (!ALLOWED_CHART_TYPES_MVP.has(chartType)) {
    errors.push({
      field: 'chartType',
      message: `Tipo di grafico "${node.chartType}" non consentito nel MVP. Ammessi: ${Array.from(ALLOWED_CHART_TYPES_MVP).join(', ')}`,
      code: 'UNSUPPORTED_CHART_TYPE'
    });
  }

  // 4. Asse X
  if (!node.x || typeof node.x !== 'object') {
    errors.push({ field: 'x', message: 'La specifica dell\'asse "x" è obbligatoria', code: 'MISSING_X_SPEC' });
  } else {
    if (!node.x.label || typeof node.x.label !== 'string') {
      errors.push({ field: 'x.label', message: 'L\'etichetta dell\'asse X ("x.label") è obbligatoria', code: 'MISSING_X_LABEL' });
    }
    if (node.x.min === undefined || node.x.min === null) {
      errors.push({ field: 'x.min', message: 'Il limite inferiore "x.min" è obbligatorio', code: 'MISSING_X_MIN' });
    }
    if (node.x.max === undefined || node.x.max === null) {
      errors.push({ field: 'x.max', message: 'Il limite superiore "x.max" è obbligatorio', code: 'MISSING_X_MAX' });
    }
  }

  // 5. Asse Y
  if (!node.y || typeof node.y !== 'object') {
    errors.push({ field: 'y', message: 'La specifica dell\'asse "y" è obbligatoria', code: 'MISSING_Y_SPEC' });
  } else {
    if (!node.y.label || typeof node.y.label !== 'string') {
      errors.push({ field: 'y.label', message: 'L\'etichetta dell\'asse Y ("y.label") è obbligatoria', code: 'MISSING_Y_LABEL' });
    }
  }

  // 6. Espressione Matematica / Domain Split
  const hasExpression = typeof node.expression === 'string' && node.expression.trim().length > 0;
  const hasDomainSplit = Array.isArray(node.domainSplit) && node.domainSplit.length > 0;

  if (!hasExpression && !hasDomainSplit) {
    errors.push({
      field: 'expression',
      message: 'Il nodo deve specificare almeno una "expression" o un "domainSplit"',
      code: 'MISSING_EXPRESSION'
    });
  }

  if (hasDomainSplit) {
    for (let i = 0; i < node.domainSplit.length; i++) {
      const split = node.domainSplit[i];
      if (!split || typeof split !== 'object') {
        errors.push({
          field: `domainSplit[${i}]`,
          message: `L'elemento domainSplit all'indice ${i} deve essere un oggetto valido`,
          code: 'INVALID_DOMAIN_SPLIT_ITEM'
        });
        continue;
      }
      if (!split.condition || typeof split.condition !== 'string') {
        errors.push({
          field: `domainSplit[${i}].condition`,
          message: `Condizione mancante in domainSplit all'indice ${i}`,
          code: 'MISSING_DOMAIN_SPLIT_CONDITION'
        });
      }
      if (!split.expression || typeof split.expression !== 'string') {
        errors.push({
          field: `domainSplit[${i}].expression`,
          message: `Espressione mancante in domainSplit all'indice ${i}`,
          code: 'MISSING_DOMAIN_SPLIT_EXPRESSION'
        });
      }
    }
  }

  // 7. Annotazioni (opzionali, ma se presenti devono avere formato valido)
  if (node.annotations !== undefined) {
    if (!Array.isArray(node.annotations)) {
      errors.push({ field: 'annotations', message: 'Il campo "annotations" deve essere un array', code: 'INVALID_ANNOTATIONS' });
    } else {
      for (let j = 0; j < node.annotations.length; j++) {
        const ann = node.annotations[j];
        if (!ann || typeof ann !== 'object' || ann.x === undefined || !ann.label) {
          errors.push({
            field: `annotations[${j}]`,
            message: `Annotazione all'indice ${j} priva di "x" o "label"`,
            code: 'INVALID_ANNOTATION_ITEM'
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateGraphSpec,
  ALLOWED_PROVENANCES_MVP,
  ALLOWED_CHART_TYPES_MVP
};
