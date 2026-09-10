/**
 * StudyGenius Academic Intelligence System
 * src/planning/blueprint.js
 * 
 * Teaching Blueprint Engine: definisce il contratto pedagogico per ciascun capitolo,
 * specificando obiettivi, prerequisiti, nodi obbligatori del Knowledge Graph e sezioni richieste.
 */

const fs = require('fs-extra');
const path = require('path');
const { buildVisualCoverageMatrix } = require('../core/visualCoverage');
const { buildReadingContract } = require('../core/visualReadingContract');

const STANDARD_REQUIRED_SECTIONS = [
  'intuition',
  'formal-definition',
  'derivation',
  'applications',
  'errors',
  'exam'
];

// Sequenza didattica funzionale a 13 moduli (Sezione 10.2 STUDY_GENIUS_METODO_DIDATTICO_MASTER.md)
const MASTER_METHOD_CHAPTER_SEQUENCE = [
  'why_needed',           // 1. Perché serve (problema o fenomeno centrale)
  'learning_outcomes',     // 2. Che cosa saprai fare (competenze attese)
  'quick_prerequisites',   // 3. Prerequisiti rapidi
  'conceptual_map',        // 4. Mappa concettuale & dipendenze
  'main_explanation',      // 5. Spiegazione principale (teoria parlata)
  'formal_definitions',    // 6. Definizioni, formule o tesi formali
  'explicit_derivations',  // 7. Derivazioni e dimostrazioni esplicite (zero salti)
  'integrated_visuals',    // 8. Visuali integrate (grafici quantitativi, schemi)
  'examples_and_problems', // 9. Esempi ed esercizi guidati con schema mentale
  'traps_and_errors',      // 10. Errori tipici e trabocchetti d'esame
  'exam_questions',        // 11. Domande d'esame per lo scritto e l'orale
  'exit_check',            // 12. Controllo d'uscita e autovalutazione
  'active_review_card'     // 13. Scheda di ripasso attivo
];


/**
 * Crea un nuovo Teaching Blueprint strutturato
 * @param {string} sessionId 
 * @param {string} subject 
 * @param {Array<Object>} chapters 
 * @returns {Object}
 */
function createBlueprint(sessionId = 'default-session', subject = 'Generale', chapters = []) {
  return {
    blueprintVersion: 1,
    sessionId,
    subject,
    chapters: chapters.map(c => formatChapterBlueprint(c)),
    createdAt: new Date().toISOString()
  };
}

/**
 * Standardizza la struttura del blueprint di un capitolo
 * @param {Object} chapter 
 * @returns {Object}
 */
function formatChapterBlueprint(chapter = {}) {
  const normId = chapter.chapterId || chapter.id || `ch-${Date.now()}`;
  const needsGraph = Boolean(
    chapter.needsGraph ||
    chapter.graphId ||
    (Array.isArray(chapter.graphNodes) && chapter.graphNodes.length > 0)
  );

  const graphId = chapter.graphId || (Array.isArray(chapter.graphNodes) && chapter.graphNodes[0] ? chapter.graphNodes[0].id : null);

  const defaultSequence = needsGraph
    ? ['problema', 'definizione', 'derivazione', 'grafico', 'interpretazione', 'applicazioni', 'errori', 'exam']
    : ['problema', 'definizione', 'derivazione', 'applicazioni', 'errori', 'exam'];

  return {
    chapterId: normId,
    title: chapter.title || chapter.name || 'Capitolo',
    objectives: Array.isArray(chapter.objectives) ? chapter.objectives : [],
    learningObjectives: Array.isArray(chapter.learningObjectives) ? chapter.learningObjectives : (Array.isArray(chapter.objectives) ? chapter.objectives : []),
    prerequisites: Array.isArray(chapter.prerequisites) ? chapter.prerequisites : [],
    conceptOrder: Array.isArray(chapter.conceptOrder) ? chapter.conceptOrder : (Array.isArray(chapter.requiredNodes) ? chapter.requiredNodes : []),
    conceptBlocks: Array.isArray(chapter.conceptBlocks) ? chapter.conceptBlocks : [],
    firstUseContracts: Array.isArray(chapter.firstUseContracts) ? chapter.firstUseContracts : [],
    notationRegistry: chapter.notationRegistry || {},
    derivationPlans: Array.isArray(chapter.derivationPlans) ? chapter.derivationPlans : [],
    graphPlans: Array.isArray(chapter.graphPlans) ? chapter.graphPlans : [],
    visualCoverage: Array.isArray(chapter.visualCoverage) ? chapter.visualCoverage : [],
    crossReferences: Array.isArray(chapter.crossReferences) ? chapter.crossReferences : [],
    requiredNodes: Array.isArray(chapter.requiredNodes) ? chapter.requiredNodes : [],
    requiredSections: Array.isArray(chapter.requiredSections) && chapter.requiredSections.length > 0
      ? chapter.requiredSections
      : [...STANDARD_REQUIRED_SECTIONS],
    needsGraph,
    graphId,
    graphNodes: Array.isArray(chapter.graphNodes) ? chapter.graphNodes : [],
    sequence: Array.isArray(chapter.sequence) && chapter.sequence.length > 0
      ? chapter.sequence
      : defaultSequence
  };
}

/**
 * Aggiunge un capitolo al blueprint
 * @param {Object} blueprint 
 * @param {Object} chapterData 
 * @returns {Object}
 */
function addChapterToBlueprint(blueprint, chapterData) {
  if (!blueprint || !Array.isArray(blueprint.chapters)) {
    throw new Error('Blueprint non valido');
  }

  const formatted = formatChapterBlueprint(chapterData);
  const existingIdx = blueprint.chapters.findIndex(c => c.chapterId === formatted.chapterId);
  if (existingIdx >= 0) {
    blueprint.chapters[existingIdx] = formatted;
  } else {
    blueprint.chapters.push(formatted);
  }
  return formatted;
}

/**
 * Recupera il blueprint di uno specifico capitolo
 * @param {Object} blueprint 
 * @param {string} chapterId 
 * @returns {Object|null}
 */
function getChapterBlueprint(blueprint, chapterId) {
  if (!blueprint || !Array.isArray(blueprint.chapters)) return null;
  return blueprint.chapters.find(c => c.chapterId === chapterId) || null;
}

/**
 * Deriva un Teaching Blueprint combinando il Knowledge Graph e i titoli/argomenti estratti dal Master Plan
 * @param {string} sessionId 
 * @param {string} subject 
 * @param {Object} knowledgeGraph 
 * @param {string} masterPlanText 
 * @returns {Object}
 */
function buildBlueprintFromGraphAndPlan(sessionId, subject, knowledgeGraph, masterPlanText = '') {
  const blueprint = createBlueprint(sessionId, subject);
  const graphNodes = knowledgeGraph?.nodes || [];

  // Raggruppa i nodi per capitolo se specificato, altrimenti assegna a capitoli logici
  const chapterGroups = new Map();

  for (const node of graphNodes) {
    const chapId = node.chapterId || 'cap1';
    if (!chapterGroups.has(chapId)) {
      chapterGroups.set(chapId, {
        title: node.label || 'Argomento Principale',
        nodes: []
      });
    }
    chapterGroups.get(chapId).nodes.push(node);
  }

  // Se non ci sono capitoli definiti nei nodi, estraili dal Master Plan text o crea capitolo unificato
  if (chapterGroups.size === 0) {
    const headings = (masterPlanText.match(/^#{1,3}\s+(.+)$/gm) || [])
      .map(h => h.replace(/^#+\s*/, '').trim())
      .slice(0, 6);

    if (headings.length > 0) {
      headings.forEach((h, idx) => {
        const chapId = `cap${idx + 1}`;
        const nodesSlice = graphNodes.slice(idx * 3, (idx + 1) * 3);
        const graphNode = nodesSlice.find(n => n.type === 'GRAPH' || n.requires_visual || n.attrs?.requires_visual);
        const graphNodesList = nodesSlice.filter(n => n.type === 'GRAPH');
        blueprint.chapters.push(formatChapterBlueprint({
          chapterId: chapId,
          title: h,
          objectives: [`Padronanza teorica e applicativa di: ${h}`],
          prerequisites: idx > 0 ? [`cap${idx}`] : [],
          requiredNodes: nodesSlice.map(n => n.id),
          requiredSections: [...STANDARD_REQUIRED_SECTIONS],
          needsGraph: Boolean(graphNode),
          graphId: graphNode ? graphNode.id : null,
          graphNodes: graphNodesList
        }));
      });
    } else {
      // Capitolo unico predefinito
      const graphNode = graphNodes.find(n => n.type === 'GRAPH' || n.requires_visual || n.attrs?.requires_visual);
      const graphNodesList = graphNodes.filter(n => n.type === 'GRAPH');
      blueprint.chapters.push(formatChapterBlueprint({
        chapterId: 'cap1-trattazione-integrale',
        title: `${subject} — Trattazione Magistrale`,
        objectives: [
          'Padronanza dei primi principi teorici',
          'Ricostruibilità delle derivazioni matematiche',
          'Risoluzione rigorosa dei problemi d\'esame con schema mentale'
        ],
        prerequisites: [],
        requiredNodes: graphNodes.map(n => n.id),
        requiredSections: [...STANDARD_REQUIRED_SECTIONS],
        needsGraph: Boolean(graphNode),
        graphId: graphNode ? graphNode.id : null,
        graphNodes: graphNodesList
      }));
    }
  } else {
    for (const [chapId, group] of chapterGroups.entries()) {
      const graphNode = group.nodes.find(n => n.type === 'GRAPH' || n.requires_visual || n.attrs?.requires_visual);
      const graphNodesList = group.nodes.filter(n => n.type === 'GRAPH');
      blueprint.chapters.push(formatChapterBlueprint({
        chapterId: chapId,
        title: group.title,
        objectives: [
          `Comprendere a fondo l'argomento ${group.title}`,
          'Saper dimostrare le formule chiave e risolvere gli esercizi tipici'
        ],
        prerequisites: [],
        requiredNodes: group.nodes.map(n => n.id),
        requiredSections: [...STANDARD_REQUIRED_SECTIONS],
        needsGraph: Boolean(graphNode),
        graphId: graphNode ? graphNode.id : null,
        graphNodes: graphNodesList
      }));
    }
  }

  // Costruzione della Visual Coverage Matrix per il Blueprint
  const visualContracts = options.visualContracts || [];
  blueprint.visualCoverageMatrix = buildVisualCoverageMatrix({
    knowledgeGraph,
    visualContracts,
    blueprint,
    subject
  });

  // Assegna le righe di copertura visiva ai singoli capitoli
  if (Array.isArray(blueprint.chapters)) {
    blueprint.chapters.forEach((chap, idx) => {
      chap.visualCoverage = blueprint.visualCoverageMatrix.filter(
        item => item.chapterId === chap.chapterId || (!item.chapterId && idx === 0)
      );
    });
  }

  return blueprint;
}

/**
 * Costruisce il prompt contestuale per il worker del capitolo fondendo il Blueprint e il sottografo
 * @param {Object} chapterBlueprint 
 * @param {Object} chapterSubgraph 
 * @returns {string}
 */
function buildChapterPromptContext(chapterBlueprint, chapterSubgraph) {
  if (!chapterBlueprint) return '';

  let text = `\n📋 CONTRATTO TEACHING BLUEPRINT PER QUESTO CAPITOLO:\n`;
  text += `- **Titolo Capitolo**: ${chapterBlueprint.title} (${chapterBlueprint.chapterId})\n`;
  if (chapterBlueprint.objectives?.length > 0) {
    text += `- **Obiettivi Didattici Irrinunciabili**:\n  * ${chapterBlueprint.objectives.join('\n  * ')}\n`;
  }
  if (chapterBlueprint.prerequisites?.length > 0) {
    text += `- **Prerequisiti Noti** (non rispiegare da zero, fanne uso): ${chapterBlueprint.prerequisites.join(', ')}\n`;
  }
  if (chapterBlueprint.requiredSections?.length > 0) {
    text += `- **Sezioni Strutturali Obbligatorie**: ${chapterBlueprint.requiredSections.join(', ')}\n`;
  }
  if (chapterBlueprint.sequence?.length > 0) {
    text += `- **Sequenza Pedagogica Obbligatoria**: ${chapterBlueprint.sequence.join(' ➔ ')}\n`;
  }

  if (chapterBlueprint.needsGraph && chapterBlueprint.graphId) {
    text += `\n📊 DIRETTIVA VISUALIZATION ENGINE (GRAFICO DETERMINISTICO OBBLIGATORIO):\n`;
    text += `Questo capitolo include un grafico deterministico FORMULA-derived (ID: "${chapterBlueprint.graphId}").\n`;
    text += `1. Posizionamento didattico (usageMode: "INTERPRETATIVE"): Inserisci il segnaposto {{GRAPH:${chapterBlueprint.graphId}}} IMMEDIATAMENTE DOPO la derivazione matematica formale della formula corrispondente. NON inserirlo a fine capitolo.\n`;
    text += `2. Lettura Guidata: Subito dopo il segnaposto del grafico, descrivi analiticamente: estremi/asintoti, punti notevoli (massimi/minimi/flessi) e dimostrazione geometrica dei limiti di validità della formula.\n`;
    text += `3. Dichiarazione Strutturata di Coerenza (graphClaims): Alla fine della sezione del grafico, inserisci obbligatoriamente il blocco strutturato di verifica numerica:\n`;
    text += `\`\`\`json:graphClaims\n{\n  "graphClaims": [\n    { "graphId": "${chapterBlueprint.graphId}", "claim": "valore_o_massimo", "x": <valore_x>, "y_expected": <valore_y> }\n  ]\n}\n\`\`\`\n`;
  }

  if (Array.isArray(chapterBlueprint.visualCoverage) && chapterBlueprint.visualCoverage.length > 0) {
    text += `\n🎨 PIANO DI COPERTURA VISUALE & CONTRATTI DI LETTURA (VISUAL READING CONTRACTS) PER QUESTO CAPITOLO:\n`;
    for (const vItem of chapterBlueprint.visualCoverage) {
      const vrc = buildReadingContract(vItem);
      text += `- **${vItem.label}**:\n`;
      text += `  * Decisione Didattica: ${vItem.strategicDecision}\n`;
      text += `  * Rappresentazione Scelta: ${vItem.chosenRepresentation} (Candidati valutati: ${vItem.candidateRepresentations.join(', ')})\n`;
      text += `  * Scopo Pedagogico: ${vItem.pedagogicalWhy}\n`;
      text += `  * Provenienza: [${vItem.provenanceIntent}]\n`;
      text += `  * Traiettoria Cognitiva: ${vrc.trajectory} (Profondità didattica: ${vrc.depthClass})\n`;
      text += `  * Domanda Scientifica Sospesa: Inserisci il visuale come risposta diretta alla tensione teorica ("${vrc.precedingQuestion}").\n`;
      if (vrc.semanticAnchors && vrc.semanticAnchors.length > 0) {
        text += `  * Ancoraggi Semantici da citare esplicitamente nel testo: ${vrc.semanticAnchors.join(', ')}\n`;
      }
      if (vrc.examCompetencies.defend) {
        text += `  * Competenza d'Esame: Includi un trabocchetto d'esame concettuale o limite di validità.\n`;
      } else {
        text += `  * Competenza d'Esame: Non forzare trabocchetti artificiali su mappe/panoramiche di orientamento.\n`;
      }
    }
    text += `DIVIETO PSEUDO-VISUALI: NON simulare diagrammi o alberi con caratteri ASCII monospace (vietati \`├──\`, \`└──\`). Usa tabelle tipografiche Markdown oppure figure vettoriali.\n`;
    text += `DIVIETO CLICHÉ INTRODUTTIVI: MAI introdurre il visuale con formule passive banali ("Come si evince dalla figura seguente...", "Osserviamo il grafico qui sotto..."). Apri sempre prima la domanda scientifica sospesa.\n`;
    text += `SEPARAZIONE DIDASCALIA: La didascalia (caption) deve contenere esclusivamente ID, condizioni limite, convenzioni di legenda e provenienza. La spiegazione fenomenologica completa deve risiedere nel testo circostante.\n`;
    text += `PROTOCOLLO ERMENEUTICO INTEGRATO: Per ogni visuale sviluppa: Introduzione fenomenologica ➔ Figura/Tabella ➔ Lettura Guidata dei flussi/parametri ➔ Trabocchetto d'esame.\n`;
  }

  if (chapterSubgraph?.nodes?.length > 0) {
    text += `- **Nodi e Concetti del Knowledge Graph da Sviluppare Obbligatoriamente**:\n`;
    for (const n of chapterSubgraph.nodes) {
      text += `  * [${n.type}] **${n.label}**${n.content ? `: ${n.content.slice(0, 100)}` : ''}\n`;
    }
  }

  return text;
}

const { compileChapterBlueprint, buildTeachingPromptDirective } = require('./pedagogicalCompiler');

module.exports = {
  createBlueprint,
  addChapterToBlueprint,
  getChapterBlueprint,
  formatChapterBlueprint,
  buildBlueprintFromGraphAndPlan,
  buildChapterPromptContext,
  compileChapterBlueprint,
  buildTeachingPromptDirective,
  STANDARD_REQUIRED_SECTIONS,
  MASTER_METHOD_CHAPTER_SEQUENCE
};

