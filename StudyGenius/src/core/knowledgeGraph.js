/**
 * StudyGenius Academic Intelligence System
 * src/core/knowledgeGraph.js
 * 
 * Modello della Conoscenza Accademica (Academic Knowledge Model),
 * Grafo Strutturato delle Dipendenze, Evidence Layer e Operazioni di Querying.
 */

const fs = require('fs-extra');
const path = require('path');
const { validateGraph } = require('./graphValidator');

/**
 * Genera un ID stabile e deterministico per un concetto/nodo
 * @param {string} type 
 * @param {string} chapterId 
 * @param {string} label 
 * @returns {string}
 */
function stableIdentity(type, chapterId, label) {
  const normType = (type || 'node').toLowerCase().trim();
  const normChap = (chapterId || 'general')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const normLabel = (label || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);

  return `${normType}-${normChap}-${normLabel}`;
}

/**
 * Crea una nuova istanza di Knowledge Graph vuota
 * @param {string} sessionId 
 * @param {string} subject 
 * @returns {Object}
 */
function createGraph(sessionId = 'default-session', subject = 'Generale') {
  return {
    schemaVersion: '2.0.0',
    graphVersion: 1,
    sessionId: sessionId,
    subject: subject,
    nodes: [],
    edges: []
  };
}

/**
 * Carica un Knowledge Graph da file JSON
 * @param {string} filePath 
 * @returns {Object}
 */
function loadGraph(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File del grafo non trovato: ${filePath}`);
  }
  return fs.readJsonSync(filePath);
}

/**
 * Salva un Knowledge Graph su file JSON (con validazione preliminare opzionale)
 * @param {string} filePath 
 * @param {Object} graph 
 */
function saveGraph(filePath, graph) {
  fs.ensureDirSync(path.dirname(filePath));
  fs.writeJsonSync(filePath, graph, { spaces: 2 });
}

/**
 * Aggiunge un nodo al grafo (se non già presente)
 * @param {Object} graph 
 * @param {Object} node 
 * @returns {Object}
 */
function addNode(graph, node) {
  if (!graph || !Array.isArray(graph.nodes)) {
    throw new Error('Oggetto graph non valido');
  }

  const existing = graph.nodes.find(n => n.id === node.id);
  if (existing) {
    throw new Error(`Nodo con ID "${node.id}" già presente nel grafo`);
  }

  const formattedNode = formatNodeData(node);
  graph.nodes.push(formattedNode);
  return formattedNode;
}

/**
 * Esegue l'upsert di un nodo: aggiorna o fonde se esiste, altrimenti inserisce.
 * Preserva provenance (sourceRefs) e unisce attributi.
 * @param {Object} graph 
 * @param {Object} node 
 * @returns {Object}
 */
function upsertNode(graph, node) {
  if (!graph || !Array.isArray(graph.nodes)) {
    throw new Error('Oggetto graph non valido');
  }

  const idx = graph.nodes.findIndex(n => n.id === node.id);
  if (idx === -1) {
    const formatted = formatNodeData(node);
    graph.nodes.push(formatted);
    return formatted;
  }

  const existing = graph.nodes[idx];
  const mergedSourceRefs = [...(existing.sourceRefs || [])];

  if (Array.isArray(node.sourceRefs)) {
    for (const ref of node.sourceRefs) {
      const alreadyIn = mergedSourceRefs.some(
        r => r.document === ref.document && r.page === ref.page && r.section === ref.section
      );
      if (!alreadyIn) {
        mergedSourceRefs.push(ref);
      }
    }
  }

  const updatedNode = {
    ...existing,
    ...node,
    label: node.label || existing.label,
    content: node.content !== undefined ? node.content : existing.content,
    chapterId: node.chapterId || existing.chapterId,
    type: (node.type || existing.type || 'CONCEPT').toUpperCase(),
    canonicalExplanationId: existing.canonicalExplanationId || node.canonicalExplanationId || null,
    isCanonical: existing.isCanonical || node.isCanonical || !!(existing.canonicalExplanationId || node.canonicalExplanationId),
    canonicalRef: existing.canonicalRef || node.canonicalRef || null,
    firstUse: existing.firstUse || node.firstUse || null,
    sourceRefs: mergedSourceRefs,
    derivedFrom: Array.from(new Set([...(existing.derivedFrom || []), ...(node.derivedFrom || [])])),
    status: node.status || existing.status || 'verified',
    attrs: {
      ...(existing.attrs || {}),
      ...(node.attrs || {}),
      canonicalExplanationId: existing.canonicalExplanationId || node.canonicalExplanationId || existing.attrs?.canonicalExplanationId || node.attrs?.canonicalExplanationId || null,
      canonicalRef: existing.canonicalRef || node.canonicalRef || existing.attrs?.canonicalRef || node.attrs?.canonicalRef || null
    },
    version: (existing.version || 1) + 1
  };

  graph.nodes[idx] = updatedNode;
  return updatedNode;
}

/**
 * Rimuove un nodo e tutti gli edge a esso collegati
 * @param {Object} graph 
 * @param {string} nodeId 
 * @returns {boolean}
 */
function removeNode(graph, nodeId) {
  if (!graph || !Array.isArray(graph.nodes)) return false;

  const initialLen = graph.nodes.length;
  graph.nodes = graph.nodes.filter(n => n.id !== nodeId);

  if (Array.isArray(graph.edges)) {
    graph.edges = graph.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
  }

  return graph.nodes.length < initialLen;
}

/**
 * Aggiunge una relazione (edge) al grafo se non già presente
 * @param {Object} graph 
 * @param {{ from: string, to: string, type: string }} edge 
 * @returns {Object}
 */
function addEdge(graph, edge) {
  if (!graph || !Array.isArray(graph.edges)) {
    throw new Error('Oggetto graph non valido');
  }

  const upperType = (edge.type || 'DEPENDS_ON').toUpperCase();
  const existing = graph.edges.find(
    e => e.from === edge.from && e.to === edge.to && (e.type || '').toUpperCase() === upperType
  );

  if (existing) return existing;

  const newEdge = {
    from: edge.from,
    to: edge.to,
    type: upperType
  };

  graph.edges.push(newEdge);
  return newEdge;
}

/**
 * Rimuove una relazione (edge) dal grafo
 * @param {Object} graph 
 * @param {{ from: string, to: string, type?: string }} edge 
 * @returns {boolean}
 */
function removeEdge(graph, edge) {
  if (!graph || !Array.isArray(graph.edges)) return false;

  const initialLen = graph.edges.length;
  const upperType = edge.type ? edge.type.toUpperCase() : null;

  graph.edges = graph.edges.filter(e => {
    if (e.from !== edge.from || e.to !== edge.to) return true;
    if (upperType && (e.type || '').toUpperCase() !== upperType) return true;
    return false;
  });

  return graph.edges.length < initialLen;
}

/**
 * Recupera un nodo per ID
 * @param {Object} graph 
 * @param {string} nodeId 
 * @returns {Object|null}
 */
function getNode(graph, nodeId) {
  if (!graph || !Array.isArray(graph.nodes)) return null;
  return graph.nodes.find(n => n.id === nodeId) || null;
}

/**
 * Restituisce la catena transitiva di tutti i nodi da cui `nodeId` dipende
 * (Prerequisiti e formule sorgente)
 * @param {Object} graph 
 * @param {string} nodeId 
 * @returns {Array<string>} elenco di ID dei nodi prerequisito
 */
function getDependencies(graph, nodeId) {
  if (!graph || !Array.isArray(graph.edges)) return [];

  const dependencyTypes = new Set([
    'REQUIRES', 'DERIVES_FROM', 'DEPENDS_ON', 'SPECIAL_CASE_OF',
    'TEACH_AFTER', 'MOTIVATED_BY', 'REVIEW_OF', 'FIRST_USE'
  ]);
  const visited = new Set();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift();
    for (const edge of graph.edges) {
      if (edge.from === current) {
        const type = (edge.type || '').toUpperCase();
        if (dependencyTypes.has(type) && !visited.has(edge.to) && edge.to !== nodeId) {
          visited.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
  }

  return Array.from(visited);
}

/**
 * Restituisce tutti i nodi che dipendono direttamente o transitivamente da `nodeId`
 * Fondamentale per il repair dipendenziale mirato (se Definition A cambia, chi ne risente?)
 * @param {Object} graph 
 * @param {string} nodeId 
 * @returns {Array<string>} elenco di ID dei nodi dipendenti
 */
function getDependents(graph, nodeId) {
  if (!graph || !Array.isArray(graph.edges)) return [];

  const dependencyTypes = new Set([
    'REQUIRES', 'DERIVES_FROM', 'DEPENDS_ON', 'SPECIAL_CASE_OF', 'APPLIES',
    'TEACH_AFTER', 'MOTIVATED_BY', 'REVIEW_OF', 'FIRST_USE'
  ]);
  const visited = new Set();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift();
    for (const edge of graph.edges) {
      if (edge.to === current) {
        const type = (edge.type || '').toUpperCase();
        if (dependencyTypes.has(type) && !visited.has(edge.from) && edge.from !== nodeId) {
          visited.add(edge.from);
          queue.push(edge.from);
        }
      }
    }
  }

  return Array.from(visited);
}

/**
 * Calcola l'ordinamento topologico (Learning Order) dei nodi per un capitolo o per l'intero grafo.
 * Garantisce che ogni prerequisito compaia prima del concetto dipendente.
 * @param {Object} graph 
 * @param {string} [chapterId] Opzionale: se fornito, filtra per i nodi del capitolo
 * @returns {Array<string>} Array di ID dei nodi in ordine didattico rigoroso
 */
function getTopologicalOrder(graph, chapterId = null) {
  if (!graph || !Array.isArray(graph.nodes)) return [];

  let nodes = graph.nodes;
  if (chapterId) {
    nodes = nodes.filter(n => n.chapterId === chapterId);
  }
  const nodeIds = new Set(nodes.map(n => n.id));

  const adj = new Map();
  const inDegree = new Map();

  for (const id of nodeIds) {
    adj.set(id, []);
    inDegree.set(id, 0);
  }

  const prereqTypes = new Set(['REQUIRES', 'DEPENDS_ON', 'DERIVES_FROM', 'MOTIVATED_BY']);

  for (const edge of (graph.edges || [])) {
    const type = (edge.type || '').toUpperCase();
    if (prereqTypes.has(type)) {
      const prereq = edge.to;
      const dependent = edge.from;
      if (nodeIds.has(prereq) && nodeIds.has(dependent)) {
        adj.get(prereq).push(dependent);
        inDegree.set(dependent, (inDegree.get(dependent) || 0) + 1);
      }
    }
  }

  const queue = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const order = [];
  while (queue.length > 0) {
    const current = queue.shift();
    order.push(current);

    for (const neighbor of (adj.get(current) || [])) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (order.length < nodes.length) {
    for (const n of nodes) {
      if (!order.includes(n.id)) {
        order.push(n.id);
      }
    }
  }

  return order;
}

/**
 * Individua tutti i capitoli impattati da una modifica a uno o più nodi del Knowledge Graph.
 * Abilita l'invalidation incrementale e la ricostruzione selettiva (Dependency-aware incremental rebuild).
 * @param {Object} graph 
 * @param {string|Array<string>} nodeIds 
 * @returns {Array<string>} elenco di chapterId impattati
 */
function getDependentChapters(graph, nodeIds) {
  if (!graph || !Array.isArray(graph.nodes)) return [];
  const targetIds = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
  const affectedNodes = new Set(targetIds);

  for (const id of targetIds) {
    const dependents = getDependents(graph, id);
    for (const depId of dependents) {
      affectedNodes.add(depId);
    }
  }

  const affectedChapters = new Set();
  for (const n of graph.nodes) {
    if (affectedNodes.has(n.id) && n.chapterId) {
      affectedChapters.add(n.chapterId);
    }
  }

  return Array.from(affectedChapters);
}

/**
 * Estrae il sottografo focalizzato per un singolo capitolo,
 * includendo i nodi interni del capitolo e i prerequisiti esterni indispensabili.
 * @param {Object} graph 
 * @param {string} chapterId 
 * @returns {{ chapterId: string, nodes: Array<Object>, edges: Array<Object>, externalDependencies: Array<Object> }}
 */
function getChapterSubgraph(graph, chapterId) {
  if (!graph || !Array.isArray(graph.nodes)) {
    return { chapterId, nodes: [], edges: [], externalDependencies: [] };
  }

  const chapterNodes = graph.nodes.filter(n => n.chapterId === chapterId);
  const chapterNodeIds = new Set(chapterNodes.map(n => n.id));

  const externalDepIds = new Set();
  for (const n of chapterNodes) {
    const deps = getDependencies(graph, n.id);
    for (const depId of deps) {
      if (!chapterNodeIds.has(depId)) {
        externalDepIds.add(depId);
      }
    }
  }

  const externalNodes = graph.nodes.filter(n => externalDepIds.has(n.id));
  const relevantIds = new Set([...chapterNodeIds, ...externalDepIds]);

  const chapterEdges = (graph.edges || []).filter(
    e => relevantIds.has(e.from) && relevantIds.has(e.to)
  );

  return {
    chapterId,
    nodes: chapterNodes,
    edges: chapterEdges,
    externalDependencies: externalNodes
  };
}

/**
 * Helper interno per standardizzare il formato dei nodi
 */
function formatNodeData(data) {
  const upperType = (data.type || 'CONCEPT').toUpperCase();
  const chapterId = data.chapterId || 'general';
  const label = data.label || data.name || 'Concetto';
  const id = data.id || stableIdentity(upperType, chapterId, label);

  const canonicalId = data.canonicalExplanationId || data.attrs?.canonicalExplanationId || null;
  const isCanonical = !!(data.isCanonical || canonicalId);
  const canonicalRef = data.canonicalRef || data.attrs?.canonicalRef || null;

  return {
    id,
    type: upperType,
    label,
    content: data.content || data.definition || '',
    chapterId,
    canonicalExplanationId: canonicalId,
    isCanonical,
    canonicalRef,
    firstUse: data.firstUse || null,
    sourceRefs: Array.isArray(data.sourceRefs)
      ? data.sourceRefs
      : (data.source ? [data.source] : []),
    derivedFrom: Array.isArray(data.derivedFrom) ? data.derivedFrom : [],
    requires_visual: !!(data.requires_visual || data.requiresVisual || data.attrs?.requires_visual),
    status: data.status || 'verified',
    attrs: {
      importance: data.attrs?.importance || 3,
      examRelevance: data.attrs?.examRelevance || (data.examRelevance === 'critical' ? 5 : 3),
      derivationValue: data.attrs?.derivationValue || 3,
      memorizationValue: data.attrs?.memorizationValue || 3,
      commonErrorRate: data.attrs?.commonErrorRate || 3,
      requires_visual: !!(data.requires_visual || data.requiresVisual || data.attrs?.requires_visual),
      canonicalExplanationId: canonicalId,
      isCanonical,
      canonicalRef,
      ...(data.attrs || {})
    },
    version: data.version || 1
  };
}

// =========================================================================
// CLASSI COMPATIBILI PER RETROCOMPATIBILITÀ CON LA CODEBASE ESISTENTE
// =========================================================================

class KnowledgeNode {
  constructor(data = {}) {
    const formatted = formatNodeData(data);
    Object.assign(this, formatted);
    // Aliases per compatibilità
    this.name = this.label;
    this.definition = this.content;
    this.prerequisites = data.prerequisites || [];
    this.examTraps = data.examTraps || [];
    this.examRelevance = data.examRelevance || 'medium';
  }
}

class AcademicKnowledgeGraph {
  constructor(sessionId = 'session_default', subject = 'Fisica') {
    this.graph = createGraph(sessionId, subject);
    this.equationLineages = new Map();
    this.evidenceLedger = [];
  }

  addNode(nodeData) {
    const node = upsertNode(this.graph, nodeData);
    return new KnowledgeNode(node);
  }

  getNode(id) {
    const n = getNode(this.graph, id);
    return n ? new KnowledgeNode(n) : undefined;
  }

  upsertNode(nodeData) {
    return upsertNode(this.graph, nodeData);
  }

  addEdge(edgeData) {
    return addEdge(this.graph, edgeData);
  }

  getDependencies(nodeId) {
    return getDependencies(this.graph, nodeId);
  }

  getDependents(nodeId) {
    return getDependents(this.graph, nodeId);
  }

  getChapterSubgraph(chapterId) {
    return getChapterSubgraph(this.graph, chapterId);
  }

  validate() {
    return validateGraph(this.graph);
  }

  toJSON() {
    return this.graph;
  }

  registerFormulaLineage(formulaData) {
    const id = formulaData.id || formulaData.name;
    this.equationLineages.set(id, {
      id,
      name: formulaData.name,
      latex: formulaData.latex,
      originLaw: formulaData.originLaw,
      assumptions: formulaData.assumptions || [],
      algebraicSteps: formulaData.algebraicSteps || [],
      validityConditions: formulaData.validityConditions || '',
      limits: formulaData.limits || [],
      derivedFrom: formulaData.derivedFrom || [],
      leadsTo: formulaData.leadsTo || []
    });

    // Registra anche nel grafo strutturato come nodo FORMULA
    this.addNode({
      id: `formula-${id}`,
      type: 'FORMULA',
      label: formulaData.name || id,
      content: formulaData.latex || '',
      derivedFrom: formulaData.derivedFrom || [],
      attrs: {
        derivationValue: 5,
        examRelevance: 5
      }
    });
  }

  getFormulaLineage(id) {
    return this.equationLineages.get(id);
  }

  addEvidence(evidence) {
    const ev = {
      id: `ev_${Date.now()}_${this.evidenceLedger.length}`,
      claim: evidence.claim,
      source: evidence.source,
      page: evidence.page || null,
      type: evidence.type || 'source-derived',
      confidence: evidence.confidence || 'high',
      timestamp: new Date().toISOString()
    };
    this.evidenceLedger.push(ev);
    return ev;
  }

  toMasterPlanContext() {
    if (this.graph.nodes.length === 0) return '';

    let text = '### Grafo della Conoscenza e Dipendenze Didattiche:\n';
    for (const node of this.graph.nodes) {
      text += `- **[${node.label}]** (Tipo: ${node.type}, Rilevanza: ${node.attrs?.examRelevance || 3})\n`;
      if (node.derivedFrom && node.derivedFrom.length > 0) {
        text += `  - Derivato da: ${node.derivedFrom.join(', ')}\n`;
      }
      if (node.content) {
        text += `  - Definizione/Enunciato: ${node.content.slice(0, 120)}\n`;
      }
    }
    return text;
  }
}

// =========================================================================
// GESTIONE DELLA KNOWLEDGE BASE PERSISTENTE PER MATERIA & CANONICAL REUSE
// =========================================================================

/**
 * Determina il percorso del Knowledge Base persistente per una specifica materia
 * @param {string} subject Nome materia (es. 'Chimica', 'Fisica')
 * @param {string} [sessionsDir] Cartella root delle sessioni (default: ../../sessions)
 * @returns {string} Percorso assoluto del file knowledgeGraph.json della materia
 */
function getSubjectKnowledgeBasePath(subject = 'Generale', sessionsDir = null) {
  const baseDir = sessionsDir || path.join(__dirname, '..', '..', 'sessions');
  const safeSubject = (subject || 'Generale').trim();
  return path.join(baseDir, safeSubject, 'knowledgeGraph.json');
}

/**
 * Carica il Knowledge Base persistente della materia (se esiste), altrimenti ne crea uno nuovo
 * @param {string} subject 
 * @param {string} [sessionsDir] 
 * @returns {Object} Graph instance
 */
function loadSubjectKnowledgeBase(subject = 'Generale', sessionsDir = null) {
  const filePath = getSubjectKnowledgeBasePath(subject, sessionsDir);
  if (fs.existsSync(filePath)) {
    try {
      const graph = fs.readJsonSync(filePath);
      if (graph && Array.isArray(graph.nodes)) {
        return graph;
      }
    } catch (err) {
      console.warn(`  ⚠️ Avviso lettura Knowledge Base per ${subject}: ${err.message}. Inizializzo nuovo.`);
    }
  }
  return createGraph(`subject-kb-${subject.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, subject);
}

/**
 * Salva in modo persistente il Knowledge Base della materia
 * @param {string} subject 
 * @param {Object} graph 
 * @param {string} [sessionsDir] 
 * @returns {boolean}
 */
function saveSubjectKnowledgeBase(subject = 'Generale', graph = null, sessionsDir = null) {
  if (!graph || !Array.isArray(graph.nodes)) return false;
  const filePath = getSubjectKnowledgeBasePath(subject, sessionsDir);
  fs.ensureDirSync(path.dirname(filePath));
  fs.writeJsonSync(filePath, graph, { spaces: 2 });
  return true;
}

/**
 * Esegue il merge incrementale dei nodi e degli archi di una sessione
 * nel Knowledge Base cumulativo della materia, preservando le spiegazioni canoniche esistenti
 * @param {Object} subjectGraph 
 * @param {Object} sessionGraph 
 * @returns {Object}
 */
function mergeIntoSubjectKnowledgeBase(subjectGraph, sessionGraph) {
  if (!subjectGraph || !sessionGraph) return subjectGraph;

  if (Array.isArray(sessionGraph.nodes)) {
    for (const node of sessionGraph.nodes) {
      upsertNode(subjectGraph, node);
    }
  }

  if (Array.isArray(sessionGraph.edges)) {
    for (const edge of sessionGraph.edges) {
      addEdge(subjectGraph, edge);
    }
  }

  subjectGraph.graphVersion = (subjectGraph.graphVersion || 1) + 1;
  return subjectGraph;
}

/**
 * Cerca se un concetto ha già una spiegazione canonica formalizzata nel grafo
 * @param {Object} graph 
 * @param {string} labelOrQuery 
 * @returns {{ found: boolean, node?: Object, canonicalExplanationId?: string, canonicalRef?: string }}
 */
function findCanonicalExplanation(graph, labelOrQuery) {
  if (!graph || !Array.isArray(graph.nodes) || !labelOrQuery) {
    return { found: false };
  }

  const queryNorm = String(labelOrQuery).toLowerCase().trim();
  if (queryNorm.length < 3) return { found: false };

  for (const node of graph.nodes) {
    const nodeLabel = (node.label || '').toLowerCase();
    const isMatch = nodeLabel === queryNorm ||
      (queryNorm.length > 5 && nodeLabel.includes(queryNorm)) ||
      (nodeLabel.length > 5 && queryNorm.includes(nodeLabel));

    const canonicalId = node.canonicalExplanationId || node.attrs?.canonicalExplanationId;
    if (isMatch && canonicalId) {
      return {
        found: true,
        node,
        canonicalExplanationId: canonicalId,
        canonicalRef: node.canonicalRef || node.attrs?.canonicalRef || node.chapterId || 'Sezione Fondamenti'
      };
    }
  }

  return { found: false };
}

/**
 * Registra o assegna una spiegazione canonica ufficiale a un concetto
 * Se il nodo non esiste nel grafo, lo crea automaticamente.
 * @param {Object} graph 
 * @param {string} nodeId 
 * @param {string} labelOrCanonId 
 * @param {string} [canonicalExplanationId] 
 * @param {string} [canonicalRef] 
 * @param {Object} [firstUse]
 * @returns {Object|null}
 */
function registerCanonicalExplanation(graph, nodeId, labelOrCanonId, canonicalExplanationId = '', canonicalRef = '', firstUse = null) {
  if (!graph || !Array.isArray(graph.nodes)) return null;

  let label = '';
  let canonId = '';
  let ref = '';
  let fUse = null;

  if (canonicalExplanationId && typeof canonicalExplanationId === 'string' && !canonicalExplanationId.startsWith('Capitolo')) {
    label = labelOrCanonId;
    canonId = canonicalExplanationId;
    ref = canonicalRef || '';
    fUse = firstUse || null;
  } else {
    canonId = labelOrCanonId;
    ref = canonicalExplanationId || '';
    fUse = canonicalRef && typeof canonicalRef === 'object' ? canonicalRef : null;
  }

  let node = getNode(graph, nodeId);
  if (!node) {
    node = {
      id: nodeId,
      type: 'CONCEPT',
      label: label || nodeId,
      chapterId: (fUse && fUse.chapter) ? fUse.chapter : 'cap1'
    };
    node = upsertNode(graph, node);
  } else if (label) {
    node.label = label;
  }

  node.canonicalExplanationId = canonId;
  node.isCanonical = true;
  node.canonicalRef = ref;
  if (fUse) node.firstUse = fUse;

  if (!node.attrs) node.attrs = {};
  node.attrs.canonicalExplanationId = canonId;
  node.attrs.canonicalRef = ref;
  if (fUse) node.attrs.firstUse = fUse;

  return node;
}

module.exports = {
  KnowledgeNode,
  AcademicKnowledgeGraph,
  createGraph,
  loadGraph,
  saveGraph,
  addNode,
  upsertNode,
  removeNode,
  addEdge,
  removeEdge,
  getNode,
  getDependencies,
  getDependents,
  getDependentChapters,
  getTopologicalOrder,
  getChapterSubgraph,
  stableIdentity,
  validateGraph,
  getSubjectKnowledgeBasePath,
  loadSubjectKnowledgeBase,
  saveSubjectKnowledgeBase,
  mergeIntoSubjectKnowledgeBase,
  findCanonicalExplanation,
  registerCanonicalExplanation
};
