/**
 * StudyGenius Academic Intelligence System
 * src/core/graphValidator.js
 * 
 * Validatore deterministico formale per il Knowledge Graph.
 * Verifica integrità referenziale, tipizzazione, assenza di nodi duplicati e cicli illegittimi.
 */

const VALID_NODE_TYPES = new Set([
  'CONCEPT',
  'DEFINITION',
  'LAW',
  'THEOREM',
  'FORMULA',
  'DERIVATION',
  'EXAMPLE',
  'EXERCISE',
  'ERROR',
  'APPROXIMATION',
  'CASE',
  'QUESTION',
  'FIGURE',
  'SOURCE',
  'GRAPH'
]);

const VALID_EDGE_TYPES = new Set([
  'REQUIRES',
  'DERIVES_FROM',
  'SPECIAL_CASE_OF',
  'CONTRASTS_WITH',
  'APPLIES',
  'DEFINED_BY',
  'SUPPORTED_BY',
  'ILLUSTRATED_BY',
  'HAS_ERROR',
  'TESTED_BY',
  'FOLLOWS',
  'DEPENDS_ON'
]);

// Tipi di relazioni che devono essere rigorosamente acicliche (DAG)
const ACYCLIC_EDGE_TYPES = new Set([
  'DERIVES_FROM',
  'REQUIRES',
  'DEPENDS_ON'
]);

/**
 * Valida un oggetto Knowledge Graph completo
 * @param {Object} graph 
 * @returns {{ valid: boolean, errors: Array<{ type: string, message: string, details?: any }> }}
 */
function validateGraph(graph) {
  const errors = [];

  if (!graph || typeof graph !== 'object') {
    return {
      valid: false,
      errors: [{ type: 'INVALID_GRAPH_OBJECT', message: 'Il grafo deve essere un oggetto definito' }]
    };
  }

  if (!Array.isArray(graph.nodes)) {
    errors.push({ type: 'MISSING_NODES_ARRAY', message: 'Il grafo deve contenere un array "nodes"' });
  }

  if (!Array.isArray(graph.edges)) {
    errors.push({ type: 'MISSING_EDGES_ARRAY', message: 'Il grafo deve contenere un array "edges"' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const nodeMap = new Map();
  const seenIds = new Set();

  // 1. Controllo Nodi
  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    if (!node || !node.id) {
      errors.push({
        type: 'INVALID_NODE_ID',
        message: `Nodo all'indice ${i} privo di ID valido`,
        details: { index: i }
      });
      continue;
    }

    if (seenIds.has(node.id)) {
      errors.push({
        type: 'DUPLICATE_NODE_ID',
        message: `ID nodo duplicato rilevato: "${node.id}"`,
        details: { nodeId: node.id }
      });
    } else {
      seenIds.add(node.id);
      nodeMap.set(node.id, node);
    }

    const upperType = (node.type || '').toUpperCase();
    if (!VALID_NODE_TYPES.has(upperType)) {
      errors.push({
        type: 'INVALID_NODE_TYPE',
        message: `Tipo nodo non riconosciuto: "${node.type}" per nodo "${node.id}"`,
        details: { nodeId: node.id, type: node.type }
      });
    }
  }

  // 2. Controllo Edges
  for (let j = 0; j < graph.edges.length; j++) {
    const edge = graph.edges[j];
    if (!edge || !edge.from || !edge.to) {
      errors.push({
        type: 'MALFORMED_EDGE',
        message: `Edge all'indice ${j} malformato (mancano "from" o "to")`,
        details: { edge }
      });
      continue;
    }

    // Edge pendenti (Missing Source o Target)
    if (!nodeMap.has(edge.from)) {
      errors.push({
        type: 'MISSING_SOURCE',
        message: `Edge punta da un nodo inesistente: "${edge.from}"`,
        details: { from: edge.from, to: edge.to }
      });
    }

    if (!nodeMap.has(edge.to)) {
      errors.push({
        type: 'MISSING_TARGET',
        message: `Edge punta verso un nodo inesistente: "${edge.to}"`,
        details: { from: edge.from, to: edge.to }
      });
    }

    // Self-dependency
    if (edge.from === edge.to) {
      errors.push({
        type: 'SELF_DEPENDENCY',
        message: `Self-dependency vietata sul nodo: "${edge.from}"`,
        details: { nodeId: edge.from, type: edge.type }
      });
    }

    // Tipo relazione
    const upperEdgeType = (edge.type || '').toUpperCase();
    if (!VALID_EDGE_TYPES.has(upperEdgeType)) {
      errors.push({
        type: 'INVALID_EDGE_TYPE',
        message: `Tipo relazione non riconosciuto: "${edge.type}"`,
        details: { edge }
      });
    }
  }

  // 3. Controllo Cicli su relazioni gerarchiche (DFS)
  const adjacency = new Map();
  for (const edge of graph.edges) {
    if (!edge.from || !edge.to || !nodeMap.has(edge.from) || !nodeMap.has(edge.to)) continue;
    const upperType = (edge.type || '').toUpperCase();
    if (ACYCLIC_EDGE_TYPES.has(upperType)) {
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
      adjacency.get(edge.from).push(edge.to);
    }
  }

  const visited = new Map(); // 0 = unvisited, 1 = visiting, 2 = visited
  for (const nodeId of nodeMap.keys()) {
    visited.set(nodeId, 0);
  }

  function detectCycleDFS(nodeId, pathStack) {
    visited.set(nodeId, 1);
    pathStack.push(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const state = visited.get(neighbor);
      if (state === 1) {
        // Ciclo rilevato!
        const cyclePath = pathStack.slice(pathStack.indexOf(neighbor)).concat(neighbor);
        errors.push({
          type: 'CYCLIC_DEPENDENCY',
          message: `Rilevato ciclo di dipendenza illegittimo: ${cyclePath.join(' ➔ ')}`,
          details: { cycle: cyclePath }
        });
        return;
      }
      if (state === 0) {
        detectCycleDFS(neighbor, pathStack);
      }
    }

    pathStack.pop();
    visited.set(nodeId, 2);
  }

  for (const nodeId of nodeMap.keys()) {
    if (visited.get(nodeId) === 0) {
      detectCycleDFS(nodeId, []);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateGraph,
  VALID_NODE_TYPES,
  VALID_EDGE_TYPES,
  ACYCLIC_EDGE_TYPES
};
