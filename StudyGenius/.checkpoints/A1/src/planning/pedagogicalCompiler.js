/**
 * StudyGenius Academic Intelligence System
 * src/planning/pedagogicalCompiler.js
 * 
 * Il Pedagogical Compiler dell'Architettura Oltre 1000.
 * Trasforma il Knowledge Graph, i vincoli epistemologici e il contratto accademico
 * in un Teaching Blueprint deterministico e rigoroso prima della generazione.
 * 
 * Implementa:
 * - Ordinamento topologico didattico (Learning Order).
 * - Generazione e tracciamento dei FirstUseContract.
 * - Formal Dependency Units (FDU) e Motivation Bridges preventivi.
 * - Categorizzazione della significatività dei passaggi (stepSignificance: LOW, MEDIUM, HIGH).
 * - Direttive di generazione per marcatori di blocco (Block IDs).
 */

const { validateTeachingBlueprint, validateFirstUseContract } = require('../core/schemas');
const { getTopologicalOrder, getChapterSubgraph, getNode } = require('../core/knowledgeGraph');

const MATH_OP_TYPES = {
  DERIVATIVE: 'derivative',
  INTEGRAL: 'integral',
  ALGEBRA: 'algebra',
  SUBSTITUTION: 'substitution',
  TRIG_IDENTITY: 'trig_identity',
  VECTOR_IDENTITY: 'vector_identity',
  LIMIT: 'limit'
};

/**
 * Compila un Teaching Blueprint per un capitolo
 * @param {Object} params
 * @param {string} params.sessionId
 * @param {string} params.subject
 * @param {string} params.chapterId
 * @param {string} params.title
 * @param {Object} params.knowledgeGraph
 * @param {Object} [params.academicContract]
 * @param {Object} [params.epistemology]
 * @param {Object} [params.studentProfile]
 * @returns {Object} TeachingBlueprint conforme a schema v2.0.0
 */
function compileChapterBlueprint({
  sessionId = 'default-session',
  subject = 'Fisica',
  chapterId = 'cap01',
  title = 'Capitolo Accademico',
  knowledgeGraph,
  academicContract = null,
  epistemology = null,
  studentProfile = null
}) {
  if (!knowledgeGraph || !Array.isArray(knowledgeGraph.nodes)) {
    throw new Error('KnowledgeGraph valido obbligatorio per la compilazione pedagogica');
  }

  // 1. Estrazione sottografo capitolo e dipendenze esterne
  const subgraph = getChapterSubgraph(knowledgeGraph, chapterId);
  const internalNodes = subgraph.nodes;

  // 2. Calcolo Learning Order topologico
  let conceptOrder = getTopologicalOrder(knowledgeGraph, chapterId);
  if (conceptOrder.length === 0 && internalNodes.length > 0) {
    conceptOrder = internalNodes.map(n => n.id);
  }

  // 3. Prerequisiti esterni del capitolo
  const prerequisites = Array.from(new Set(subgraph.externalDependencies.map(n => n.label || n.id)));

  // 4. Analisi e compilazione dei FirstUseContracts
  const firstUseContracts = [];
  const notationRegistry = {};

  for (const nodeId of conceptOrder) {
    const node = internalNodes.find(n => n.id === nodeId) || getNode(knowledgeGraph, nodeId);
    if (!node) continue;

    // Registra simboli
    const symbol = node.attrs?.symbol || (node.label.match(/[α-ωΑ-Ω\vec{E}\vec{B}pHa-zA-Z_0-9]+/)?.[0]) || null;
    if (symbol) {
      notationRegistry[symbol] = node.attrs?.meaning || node.label;
    }

    // Se il nodo ha firstUse o è la prima occorrenza
    const isFirstUse = !node.attrs?.isReview && (node.firstUse || node.chapterId === chapterId);
    if (isFirstUse) {
      const contract = {
        conceptId: node.id,
        firstUseChapter: chapterId,
        symbol: symbol || node.label,
        meaning: node.attrs?.meaning || node.label,
        requirements: {
          mustMotivate: node.attrs?.mustMotivate !== false,
          mustDefine: true,
          mustInterpret: true,
          mustExplainBeforeSymbolicUse: true,
          allowForwardMention: node.attrs?.allowForwardMention || false
        },
        pedagogicalPattern: node.attrs?.pedagogicalPattern || (
          subject.toLowerCase().includes('chim') ? 'PROBLEM_FIRST' :
          subject.toLowerCase().includes('fisic') ? 'PHENOMENON_FIRST' : 'AXIOMATIC'
        )
      };

      firstUseContracts.push(contract);
    }
  }

  // 5. Sintesi dei ConceptBlocks preventivi (struttura didattica programmata)
  const conceptBlocks = [];
  let blockIndex = 1;

  for (const nodeId of conceptOrder) {
    const node = internalNodes.find(n => n.id === nodeId) || getNode(knowledgeGraph, nodeId);
    if (!node) continue;

    const baseId = node.id.replace(/[^a-zA-Z0-9_\-]/g, '-');

    // Se richiede motivazione, programma un blocco MOTIVATION_BRIDGE
    if (node.attrs?.mustMotivate !== false && node.type === 'CONCEPT') {
      conceptBlocks.push({
        blockId: `block-${blockIndex++}-bridge-${baseId}`,
        conceptId: node.id,
        blockType: 'MOTIVATION_BRIDGE',
        stepSignificance: 'MEDIUM',
        content: `Spiegazione del perché i concetti precedenti non sono sufficienti e motivazione del bisogno di introdurre "${node.label}".`,
        references: node.derivedFrom || []
      });
    }

    // Programma la Formal Dependency Unit (Definizione + Equazione + Interpretazione)
    conceptBlocks.push({
      blockId: `block-${blockIndex++}-fdu-${baseId}`,
      conceptId: node.id,
      blockType: 'FORMAL_DEPENDENCY_UNIT',
      stepSignificance: node.type === 'LAW' || node.type === 'THEOREM' ? 'HIGH' : 'MEDIUM',
      content: `Formal Dependency Unit per "${node.label}": Definizione rigorosa, equazione formalizzante e significato fisico/applicativo immediato.`,
      references: [node.id]
    });

    // Se è una legge o teorema, programma un blocco DERIVATION_STEP o INTUITION
    if (node.type === 'LAW' || node.type === 'THEOREM' || node.type === 'DERIVATION') {
      const mathOp = node.attrs?.mathOperation || (
        /rotore|gradiente|divergenza|maxwell|vettor/i.test(node.label) ? MATH_OP_TYPES.VECTOR_IDENTITY :
        /derivat|differenzia/i.test(node.label) ? MATH_OP_TYPES.DERIVATIVE :
        /integral/i.test(node.label) ? MATH_OP_TYPES.INTEGRAL :
        /limite|asintot/i.test(node.label) ? MATH_OP_TYPES.LIMIT :
        MATH_OP_TYPES.ALGEBRA
      );

      conceptBlocks.push({
        blockId: `block-${blockIndex++}-deriv-${baseId}`,
        conceptId: node.id,
        blockType: 'DERIVATION_STEP',
        stepSignificance: 'HIGH',
        mathOperation: mathOp,
        content: `Dimostrazione/derivazione passo-passo di "${node.label}" [mathOperation: ${mathOp}]. Protocollo vincolante: esplicitare la regola matematica (es. regola della catena, derivata del seno, integrazione per parti), mostrare la sostituzione e i calcoli intermedi prima del risultato finale.`,
        references: [node.id]
      });
    }

    // Se ha un grafico associato
    if (node.requires_visual || node.attrs?.requires_visual || node.type === 'GRAPH') {
      conceptBlocks.push({
        blockId: `block-${blockIndex++}-graph-${baseId}`,
        conceptId: node.id,
        blockType: 'GRAPH_INTERPRETATION',
        stepSignificance: 'HIGH',
        content: `Grafico deterministico e lettura guidata di "${node.label}".`,
        references: [node.id]
      });
    }

    // Blocco applicativo e trappola d'esame
    conceptBlocks.push({
      blockId: `block-${blockIndex++}-trap-${baseId}`,
      conceptId: node.id,
      blockType: 'APPLICATION_EXAM_TRAP',
      stepSignificance: 'LOW',
      content: `Errori tipici, fraintendimenti comuni e domande d'esame su "${node.label}".`,
      references: [node.id]
    });
  }

  // 6. Obiettivi didattici
  const learningObjectives = [
    `Comprensione profonda e applicativa dei concetti: ${internalNodes.slice(0, 4).map(n => n.label).join(', ')}`,
    'Padronanza dei passaggi formali di derivazione con motivazione di ogni transizione',
    'Capacità di difesa concettuale in sede d\'esame su trappole ed errori tipici'
  ];

  // 7. Graph Plans (grafici deterministici collegati)
  const graphPlans = [];
  const graphNodes = internalNodes.filter(n => n.type === 'GRAPH' || n.requires_visual || n.attrs?.requires_visual);
  for (const gn of graphNodes) {
    graphPlans.push({
      id: gn.id,
      provenance: 'FORMULA-derived',
      chartType: gn.attrs?.chartType || 'line',
      title: gn.label,
      xLabel: gn.attrs?.xLabel || 'x',
      yLabel: gn.attrs?.yLabel || 'f(x)',
      domain: gn.attrs?.domain || { min: 0, max: 10, points: 100 },
      series: gn.attrs?.series || [{ name: gn.label, expression: gn.content || 'x' }]
    });
  }

  // 8. Math Rules per il Mathematical Provenance Layer
  const mathRules = [
    ...(academicContract?.mathRules || []),
    ...internalNodes.flatMap(n => n.attrs?.mathRules || [])
  ];

  const blueprint = {
    blueprintVersion: '2.0.0',
    chapterId,
    title,
    learningObjectives,
    prerequisites,
    conceptOrder,
    conceptBlocks,
    firstUseContracts,
    notationRegistry,
    mathRules,
    derivationPlans: [],
    graphPlans,
    crossReferences: []
  };

  // Validazione di sicurezza prima della restituzione
  const val = validateTeachingBlueprint(blueprint);
  if (!val.valid) {
    throw new Error(`TeachingBlueprint compilato non valido: ${val.errors.join('; ')}`);
  }

  return blueprint;
}

/**
 * Genera le direttive formali di prompt da inviare al generatore del capitolo
 * @param {Object} blueprint TeachingBlueprint v2.0.0
 * @returns {string} testo del prompt pedagogico
 */
function buildTeachingPromptDirective(blueprint) {
  if (!blueprint) return '';

  let text = `\n═══════════════════════════════════════════════════════════════════════════════\n`;
  text += `📋 DIRETTIVA DIDATTICA TEACHING BLUEPRINT (ARCHITETTURA OLTRE 1000)\n`;
  text += `═══════════════════════════════════════════════════════════════════════════════\n`;
  text += `Titolo Capitolo: ${blueprint.title} [${blueprint.chapterId}]\n\n`;

  if (blueprint.learningObjectives?.length > 0) {
    text += `🎯 OBIETTIVI DIDATTICI IRRINUNCIABILI:\n`;
    blueprint.learningObjectives.forEach(obj => { text += `  • ${obj}\n`; });
    text += `\n`;
  }

  if (blueprint.prerequisites?.length > 0) {
    text += `🧱 PREREQUISITI ACQUISITI (usali senza ri-derivare da zero):\n`;
    text += `  ${blueprint.prerequisites.join(', ')}\n\n`;
  }

  text += `📐 LEARNING ORDER TOPOLOGICO (ORDINE CRONOLOGICO OBBLIGATORIO DEI CONCETTI):\n`;
  text += `Devi introdurre e spiegare i concetti rigorosamente in questo ordine:\n`;
  text += `  ${blueprint.conceptOrder.join(' ➔ ')}\n`;
  text += `⚠️ VIETATO invertire l'ordine o utilizzare una quantità prima che ne sia stato motivato il bisogno (Hard Fail: PREREQUISITE_VIOLATION).\n\n`;

  if (blueprint.firstUseContracts?.length > 0) {
    text += `📜 CONTRATTI DI PRIMO UTILIZZO (FIRST_USE_CONTRACTS):\n`;
    for (const fuc of blueprint.firstUseContracts) {
      text += `  • Concetto/Simbolo: "${fuc.symbol}" [${fuc.conceptId}]\n`;
      text += `    - Sequenza pedagogica richiesta: ${fuc.pedagogicalPattern}\n`;
      text += `    - Vincoli: Prima di usarlo, devi spiegare il limite del concetto precedente (Motivazione), definirlo formalmente e darne l'interpretazione fenomenologica.\n`;
    }
    text += `\n`;
  }

  text += `🧱 REGOLA STRUTTURALE DEI BLOCCHI (BLOCK IDs):\n`;
  text += `Ogni unità concettuale deve essere racchiusa tra commenti di blocco per consentire il repair chirurgico:\n`;
  text += `Esempio:\n`;
  text += `<!-- BLOCK:fdu:nome-concetto -->\n`;
  text += `Definizione formale, formula e interpretazione fisica.\n`;
  text += `<!-- /BLOCK:fdu:nome-concetto -->\n\n`;

  text += `⚖️ SIGNIFICATIVITÀ DEI PASSAGGI MATEMATICI (stepSignificance):\n`;
  text += `  • LOW (Algebra locale): non inserire prosa inutile, mantieni il calcolo compatto.\n`;
  text += `  • MEDIUM (Sostituzioni/trasformazioni): indica chiaramente WHAT CHANGED.\n`;
  text += `  • HIGH (Ipotesi fisiche, cambi di base, operatori scelti): spiega obbligatoriamente WHY, WHAT CHANGED e CONSEQUENCE.\n\n`;

  text += `📐 PROTOCOLLO PER I PASSAGGI MATEMATICI (MATHEMATICAL PROVENANCE LAYER):\n`;
  text += `Per ogni passaggio matematico che coinvolge derivate, integrali, sostituzioni o identità vettoriali (stepSignificance >= MEDIUM o tipo DERIVATIVE, INTEGRAL, VECTOR_IDENTITY):\n`;
  text += `  1. Dichiarazione dell'operazione: Esplicita cosa si sta calcolando (es. "Calcoliamo la derivata parziale rispetto a x").\n`;
  text += `  2. Regola generale utilizzata: Cita la regola formale (es. "La derivata di sin(u) rispetto a x è cos(u) · du/dx (regola della catena)").\n`;
  text += `  3. Sostituzione concreta: Identifica le variabili (es. "Qui u = kx - ωt + δ, quindi du/dx = k").\n`;
  text += `  4. Calcolo intermedio: Mostra l'applicazione (es. "∂ξ/∂x = ξ₀ · cos(u) · k").\n`;
  text += `  5. Risultato finale: Scrivi la forma finale semplificata (es. "∂ξ/∂x = ξ₀ k cos(kx - ωt + δ)").\n`;
  text += `⚠️ VIETATO saltare direttamente al risultato senza citare la regola matematica (Hard Fail: MISSING_MATH_RULE).\n\n`;

  if (blueprint.mathRules?.length > 0) {
    text += `📚 REGOLE MATEMATICHE ATTESE (MATH RULES REGISTRY):\n`;
    for (const mr of blueprint.mathRules) {
      text += `  • [${mr.concept}] ${mr.rule}\n`;
    }
    text += `Quando esegui i passaggi corrispondenti, cita esplicitamente queste regole formali.\n\n`;
  }

  if (blueprint.graphPlans?.length > 0) {
    text += `📊 GRAFICI DETERMINISTICI INTEGRATI (VISUALIZATION ENGINE):\n`;
    for (const gp of blueprint.graphPlans) {
      text += `  • Grafico "${gp.id}": posiziona il segnaposto {{GRAPH:${gp.id}}} subito dopo la derivazione matematica correlata.\n`;
      text += `    Includi una lettura guidata e la dichiarazione dei claim numerici:\n`;
      text += `    \`\`\`json:graphClaims\n    {\n      "graphClaims": [\n        { "graphId": "${gp.id}", "claim": "descrizione", "x": 1.0, "y_expected": 2.0 }\n      ]\n    }\n    \`\`\`\n`;
    }
    text += `\n`;
  }

  return text;
}

module.exports = {
  MATH_OP_TYPES,
  compileChapterBlueprint,
  buildTeachingPromptDirective
};
