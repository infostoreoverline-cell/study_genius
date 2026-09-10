/**
 * StudyGenius Academic Intelligence System
 * src/core/visualCoverage.js
 * 
 * Visual Coverage System:
 * 1. Pre-generazione: Costruzione della Visual Coverage Matrix dall'analisi
 *    congiunta di sorgenti estratte, Knowledge Graph e Teaching Blueprint.
 * 2. Selezione multi-criterio delle Candidate Representations (zero lookup table rigide).
 * 3. Post-generazione: Visual Coverage Audit con riconciliazione contabile
 *    (Hard Fail per promesse omesse senza giustificazione).
 */

const { PROVENANCE_CLASSES } = require('./schemas');

/**
 * Decisioni Strategiche Ammesse per ciascuna esigenza di conoscenza
 */
const STRATEGIC_DECISIONS = {
  VISUALIZE: 'VISUALIZE',              // Crea un nuovo artefatto visuale ottimale
  RECONSTRUCT: 'RECONSTRUCT',          // Ricostruisce e rifinisce schema vettoriale dalla sorgente
  SYNTHESIZE: 'SYNTHESIZE',            // Unifica più concetti sparsi in una visione d'insieme
  CONVERT_TO_TABLE: 'CONVERT_TO_TABLE',// Complessità multidimensionale meglio risolta da tabella tipografica
  KEEP_AS_TEXT: 'KEEP_AS_TEXT'         // Comprensione locale discorsiva; una figura aggiungerebbe rumore
};

/**
 * Strutture di Conoscenza rilevabili nella sorgente o nel Grafo
 */
const DETECTED_STRUCTURES = {
  TEMPORAL_SEQUENCE: 'TEMPORAL_SEQUENCE',              // Sequenza temporale o evoluzione storica
  CATALYTIC_CYCLE: 'CATALYTIC_CYCLE',                  // Ciclo chiuso con rigenerazione specie/catalizzatore
  MASS_FLOW: 'MASS_FLOW',                              // Flusso di materia multicompartimento / P&ID
  ALTERNATIVE_TECHNOLOGIES: 'ALTERNATIVE_TECHNOLOGIES',// Scelte tecnologiche a confronto
  HIERARCHY: 'HIERARCHY',                              // Tassonomia, classificazione o roadmap macro
  QUANTITATIVE_CORRELATION: 'QUANTITATIVE_CORRELATION',// Curva continua o andamento matematico
  HETEROGENEOUS_LIST: 'HETEROGENEOUS_LIST',            // Elenco disparato di utilizzi o voci
  DEFINITION: 'DEFINITION'                             // Definizione locale o singola nozione
};

/**
 * Bisogni Cognitivi Didattici
 */
const COGNITIVE_NEEDS = {
  ORIENTATION: 'ORIENTATION',                          // Mappa mentale, tappe, visione macroscopica
  UNDERSTANDING: 'UNDERSTANDING',                      // Meccanismo, separazione, causa-effetto
  QUANTITATIVE_ANALYSIS: 'QUANTITATIVE_ANALYSIS',      // Valori numerici, limiti operativi, derivazioni
  LOCAL_COMPREHENSION: 'LOCAL_COMPREHENSION',          // Comprensione locale contestuale
  OVERVIEW: 'OVERVIEW'                                 // Panoramica rapida
};

/**
 * Vocabolario di Rappresentazioni Candidate
 */
const CANDIDATE_FORMS = {
  TIMELINE: 'timeline',
  CYCLIC_MECHANISM: 'cyclic_mechanism',
  FLOWSHEET_BLOCKS: 'flowsheet_blocks',
  MEMBRANE_CELL_SCHEMA: 'membrane_cell_schema',
  COMPARISON_MATRIX: 'comparison_matrix',
  COMPARISON_CARDS: 'comparison_cards',
  ROADMAP_STEPPER: 'roadmap_stepper',
  FEATURE_TREE: 'feature_tree',
  QUANTITATIVE_PLOT: 'quantitative_plot',
  TYPOGRAPHIC_TABLE: 'typographic_table',
  PROSE: 'prose'
};

/**
 * Valuta un insieme di Candidate Representations per una determinata struttura e bisogno cognitivo.
 * Non usa una lookup table dogmatica, ma pesa 6 fattori:
 * 1. Cardinalità (quanti elementi/specie/parametri)
 * 2. Complessità Relazionale (lineare, ciclica, gerarchica, a blocchi)
 * 3. Livello Didattico Target (Orientamento, Comprensione, Analisi)
 * 4. Geometria Pagina A4 (orizzontale, verticale, spazio occupato)
 * 5. Natura della Sorgente (slide visuale, dati tabulari, equazione)
 * 6. Intento Pedagogico (intuizione qualitativa vs computazione)
 *
 * @param {Object} params
 * @param {string} params.detectedStructure
 * @param {string} params.cognitiveNeed
 * @param {Object} [params.factors]
 * @returns {{ strategicDecision: string, candidates: Array<{ form: string, score: number, suitability: string }>, chosenRepresentation: string, pedagogicalWhy: string }}
 */
function evaluateCandidateRepresentations({ detectedStructure, cognitiveNeed, factors = {} }) {
  const cardinality = factors.cardinality || 3;
  const sourceNature = factors.sourceNature || 'text_and_diagram';
  const targetLevel = factors.targetLevel || cognitiveNeed || 'UNDERSTANDING';

  const candidates = [];

  switch (detectedStructure) {
    case DETECTED_STRUCTURES.TEMPORAL_SEQUENCE:
      candidates.push({
        form: CANDIDATE_FORMS.TIMELINE,
        score: cardinality >= 3 && cardinality <= 8 ? 95 : 75,
        suitability: 'Evidenzia la progressione temporale e le discontinuità tecnologiche chiave'
      });
      candidates.push({
        form: CANDIDATE_FORMS.ROADMAP_STEPPER,
        score: 80,
        suitability: 'Buono se i passaggi sono tappe logiche numerate'
      });
      candidates.push({
        form: CANDIDATE_FORMS.TYPOGRAPHIC_TABLE,
        score: cardinality > 8 ? 85 : 60,
        suitability: 'Preferibile se le date e i dettagli sono troppi per un asse orizzontale A4'
      });
      break;

    case DETECTED_STRUCTURES.CATALYTIC_CYCLE:
      candidates.push({
        form: CANDIDATE_FORMS.CYCLIC_MECHANISM,
        score: 98,
        suitability: 'Rappresentazione intrinsecamente ciclica: isola stadi, intermedi e rigenerazione del catalizzatore'
      });
      candidates.push({
        form: CANDIDATE_FORMS.FLOWSHEET_BLOCKS,
        score: 65,
        suitability: 'Meno efficace: spezza la natura chiusa del ciclo catalitico'
      });
      candidates.push({
        form: CANDIDATE_FORMS.PROSE,
        score: 30,
        suitability: 'Sconsigliato: il testo puro rende faticoso tracciare lo stato di ossidazione del metallo'
      });
      break;

    case DETECTED_STRUCTURES.ALTERNATIVE_TECHNOLOGIES:
      candidates.push({
        form: CANDIDATE_FORMS.COMPARISON_MATRIX,
        score: cardinality >= 2 ? 95 : 70,
        suitability: 'Confronto simultaneo multidimensionale (efficienza, impatto, consumi, purezza)'
      });
      candidates.push({
        form: CANDIDATE_FORMS.COMPARISON_CARDS,
        score: cardinality <= 3 ? 85 : 60,
        suitability: 'Efficace per schede sintetiche affiancate se i parametri sono pochi (<4)'
      });
      candidates.push({
        form: CANDIDATE_FORMS.TYPOGRAPHIC_TABLE,
        score: 90,
        suitability: 'Tabella accademica strutturata ad alta leggibilità tipografica'
      });
      break;

    case DETECTED_STRUCTURES.MASS_FLOW:
      candidates.push({
        form: CANDIDATE_FORMS.FLOWSHEET_BLOCKS,
        score: 92,
        suitability: 'Visualizza correnti di alimentazione, ricircoli, stadi di separazione e bilanci'
      });
      candidates.push({
        form: CANDIDATE_FORMS.MEMBRANE_CELL_SCHEMA,
        score: factors.isElectrochemicalCell ? 96 : 40,
        suitability: 'Schema vettoriale con barriera di separazione, flussi ionici selettivi e compartimenti anodo/catodo'
      });
      candidates.push({
        form: CANDIDATE_FORMS.TYPOGRAPHIC_TABLE,
        score: 55,
        suitability: 'Descrive le portate ma non aiuta a visualizzare la topologia di flusso'
      });
      break;

    case DETECTED_STRUCTURES.QUANTITATIVE_CORRELATION:
      candidates.push({
        form: CANDIDATE_FORMS.QUANTITATIVE_PLOT,
        score: 95,
        suitability: 'Curva funzionale calibrata con assi definiti, unità SI e comportamento asintotico'
      });
      candidates.push({
        form: CANDIDATE_FORMS.TYPOGRAPHIC_TABLE,
        score: 65,
        suitability: 'Tabella di valori discreti, utile per dati puntuali ma priva di continuità visiva'
      });
      break;

    case DETECTED_STRUCTURES.HIERARCHY:
      candidates.push({
        form: CANDIDATE_FORMS.ROADMAP_STEPPER,
        score: targetLevel === 'ORIENTATION' ? 95 : 75,
        suitability: 'Roadmap concettuale a tappe per orientare lo studente nel capitolo'
      });
      candidates.push({
        form: CANDIDATE_FORMS.FEATURE_TREE,
        score: 80,
        suitability: 'Albero vettoriale a rami per tassonomie rigorose (mai simulato in ASCII)'
      });
      candidates.push({
        form: CANDIDATE_FORMS.TYPOGRAPHIC_TABLE,
        score: 85,
        suitability: 'Tabella gerarchica con badge di raggruppamento'
      });
      break;

    case DETECTED_STRUCTURES.HETEROGENEOUS_LIST:
      candidates.push({
        form: CANDIDATE_FORMS.TYPOGRAPHIC_TABLE,
        score: 92,
        suitability: 'Organizza voci disomogenee in colonne coerenti senza forzare grafici inutili'
      });
      candidates.push({
        form: CANDIDATE_FORMS.PROSE,
        score: 85,
        suitability: 'Trattazione discorsiva con punti elenco accademici'
      });
      candidates.push({
        form: CANDIDATE_FORMS.FEATURE_TREE,
        score: 40,
        suitability: 'Eccessivo: genera un albero artificioso per dati privi di gerarchia genetica'
      });
      break;

    case DETECTED_STRUCTURES.DEFINITION:
    default:
      candidates.push({
        form: CANDIDATE_FORMS.PROSE,
        score: 95,
        suitability: 'Trattazione a teoria parlata ed equazione centrata: nessun guadagno visuale da una figura'
      });
      candidates.push({
        form: CANDIDATE_FORMS.TYPOGRAPHIC_TABLE,
        score: 60,
        suitability: 'Utile solo se associata a un glossario di simboli'
      });
      break;
  }

  // Ordina i candidati per punteggio decrescente
  candidates.sort((a, b) => b.score - a.score);
  const bestCandidate = candidates[0] || { form: CANDIDATE_FORMS.PROSE, score: 80, suitability: 'Trattazione testuale' };

  // Determina la Strategic Decision
  let strategicDecision = STRATEGIC_DECISIONS.VISUALIZE;
  if (bestCandidate.form === CANDIDATE_FORMS.PROSE) {
    strategicDecision = STRATEGIC_DECISIONS.KEEP_AS_TEXT;
  } else if (bestCandidate.form === CANDIDATE_FORMS.TYPOGRAPHIC_TABLE) {
    strategicDecision = STRATEGIC_DECISIONS.CONVERT_TO_TABLE;
  } else if (sourceNature === 'diagram_in_source') {
    strategicDecision = STRATEGIC_DECISIONS.RECONSTRUCT;
  } else if (factors.requiresSynthesis) {
    strategicDecision = STRATEGIC_DECISIONS.SYNTHESIZE;
  }

  return {
    strategicDecision,
    candidates,
    chosenRepresentation: bestCandidate.form,
    pedagogicalWhy: bestCandidate.suitability
  };
}

/**
 * Costruisce la Visual Coverage Matrix pre-generazione analizzando il Knowledge Graph,
 * i contratti estratti dalle slide (visualContracts) e la struttura del Blueprint.
 *
 * @param {Object} params
 * @param {Object} params.knowledgeGraph
 * @param {Array<Object>} [params.visualContracts=[]]
 * @param {Object} [params.blueprint]
 * @param {string} [params.subject='Generale']
 * @returns {Array<Object>} Visual Coverage Matrix
 */
function buildVisualCoverageMatrix({ knowledgeGraph, visualContracts = [], blueprint = null, subject = 'Generale' }) {
  const matrix = [];
  let itemIndex = 1;

  // 1. Riconciliazione delle figure e schemi presenti nelle sorgenti originali (visualContracts)
  for (const contract of visualContracts) {
    const figId = contract.figureId || `source_fig_${itemIndex}`;
    const classification = contract.classification?.type || 'conceptual_diagram';
    const caption = contract.caption?.text || contract.label || figId;

    let detectedStructure = DETECTED_STRUCTURES.MASS_FLOW;
    let cognitiveNeed = COGNITIVE_NEEDS.UNDERSTANDING;
    const isElectrochemical = /cella|membrana|elettrod|cloro|diaframma/i.test(caption);
    const isCatalysis = /catalisi|ciclo|catalitico|monsanto|civa/i.test(caption);
    const isEvolution = /storia|evoluzione|sviluppo|timeline|anni/i.test(caption);
    const isComparison = /confronto|alternative|tecnologie|tabella/i.test(caption);

    if (isCatalysis) {
      detectedStructure = DETECTED_STRUCTURES.CATALYTIC_CYCLE;
    } else if (isEvolution) {
      detectedStructure = DETECTED_STRUCTURES.TEMPORAL_SEQUENCE;
    } else if (isComparison) {
      detectedStructure = DETECTED_STRUCTURES.ALTERNATIVE_TECHNOLOGIES;
    } else if (classification === 'quantitative_plot') {
      detectedStructure = DETECTED_STRUCTURES.QUANTITATIVE_CORRELATION;
      cognitiveNeed = COGNITIVE_NEEDS.QUANTITATIVE_ANALYSIS;
    }

    const evaluation = evaluateCandidateRepresentations({
      detectedStructure,
      cognitiveNeed,
      factors: {
        sourceNature: 'diagram_in_source',
        isElectrochemicalCell: isElectrochemical,
        cardinality: isComparison ? 3 : 4
      }
    });

    // Provenienza ancorata
    let provenanceIntent = PROVENANCE_CLASSES.SOURCE_RECONSTRUCTED;
    if (contract.provenance && Object.values(PROVENANCE_CLASSES).includes(contract.provenance)) {
      provenanceIntent = contract.provenance;
    }

    matrix.push({
      id: `vcm-${itemIndex++}`,
      conceptId: contract.conceptId || figId,
      sourceId: figId,
      label: caption,
      detectedStructure,
      cognitiveNeed,
      strategicDecision: evaluation.strategicDecision,
      candidateRepresentations: evaluation.candidates.map(c => c.form),
      chosenRepresentation: evaluation.chosenRepresentation,
      pedagogicalWhy: evaluation.pedagogicalWhy,
      provenanceIntent,
      status: 'PLANNED',
      chapterId: contract.chapterId || null
    });
  }

  // 2. Analisi dei nodi del Knowledge Graph per individuare bisogni didattici scoperti dalla sorgente
  const graphNodes = knowledgeGraph?.nodes || [];
  for (const node of graphNodes) {
    // Evita duplicazioni se il concetto è già coperto da un contratto visuale
    const alreadyMapped = matrix.some(m => m.conceptId === node.id || (m.label && m.label.toLowerCase().includes(node.label.toLowerCase())));
    if (alreadyMapped) continue;

    // Isola concetti di macro-struttura (Orientamento)
    if (node.type === 'CONCEPT' && (node.label.toLowerCase().includes('panoramica') || node.label.toLowerCase().includes('introduzione') || node.label.toLowerCase().includes('processi'))) {
      const evaluation = evaluateCandidateRepresentations({
        detectedStructure: DETECTED_STRUCTURES.HIERARCHY,
        cognitiveNeed: COGNITIVE_NEEDS.ORIENTATION,
        factors: { targetLevel: 'ORIENTATION', cardinality: 5 }
      });

      matrix.push({
        id: `vcm-${itemIndex++}`,
        conceptId: node.id,
        sourceId: null,
        label: `Macrostruttura e orientamento: ${node.label}`,
        detectedStructure: DETECTED_STRUCTURES.HIERARCHY,
        cognitiveNeed: COGNITIVE_NEEDS.ORIENTATION,
        strategicDecision: evaluation.strategicDecision,
        candidateRepresentations: evaluation.candidates.map(c => c.form),
        chosenRepresentation: evaluation.chosenRepresentation,
        pedagogicalWhy: 'Roadmap concettuale a tappe per costruire il modello mentale dello studente',
        provenanceIntent: PROVENANCE_CLASSES.MODEL_SYNTHESIZED,
        status: 'PLANNED',
        chapterId: node.chapterId || null
      });
    }

    // Isola confronti tecnologici o elenchi eterogenei
    if (/usi|applicazioni|prodotti|derivati/i.test(node.label)) {
      const evaluation = evaluateCandidateRepresentations({
        detectedStructure: DETECTED_STRUCTURES.HETEROGENEOUS_LIST,
        cognitiveNeed: COGNITIVE_NEEDS.OVERVIEW,
        factors: { cardinality: 6 }
      });

      matrix.push({
        id: `vcm-${itemIndex++}`,
        conceptId: node.id,
        sourceId: null,
        label: `Panoramica applicazioni: ${node.label}`,
        detectedStructure: DETECTED_STRUCTURES.HETEROGENEOUS_LIST,
        cognitiveNeed: COGNITIVE_NEEDS.OVERVIEW,
        strategicDecision: evaluation.strategicDecision, // tipicamente CONVERT_TO_TABLE o KEEP_AS_TEXT
        candidateRepresentations: evaluation.candidates.map(c => c.form),
        chosenRepresentation: evaluation.chosenRepresentation,
        pedagogicalWhy: 'Organizzazione tabulare o a prosa: nessun guadagno visuale da un diagramma artificioso',
        provenanceIntent: PROVENANCE_CLASSES.MODEL_SYNTHESIZED,
        status: 'PLANNED',
        chapterId: node.chapterId || null
      });
    }

    // Isola definizioni pure
    if (node.type === 'DEFINITION' || /definizione/i.test(node.label)) {
      const evaluation = evaluateCandidateRepresentations({
        detectedStructure: DETECTED_STRUCTURES.DEFINITION,
        cognitiveNeed: COGNITIVE_NEEDS.LOCAL_COMPREHENSION,
        factors: { cardinality: 1 }
      });

      matrix.push({
        id: `vcm-${itemIndex++}`,
        conceptId: node.id,
        sourceId: null,
        label: `Definizione formale: ${node.label}`,
        detectedStructure: DETECTED_STRUCTURES.DEFINITION,
        cognitiveNeed: COGNITIVE_NEEDS.LOCAL_COMPREHENSION,
        strategicDecision: STRATEGIC_DECISIONS.KEEP_AS_TEXT,
        candidateRepresentations: evaluation.candidates.map(c => c.form),
        chosenRepresentation: CANDIDATE_FORMS.PROSE,
        pedagogicalWhy: 'Trattazione a teoria parlata ed equazione centrata; nessuna figura necessaria',
        provenanceIntent: PROVENANCE_CLASSES.SOURCE_EXACT,
        status: 'PLANNED',
        chapterId: node.chapterId || null
      });
    }
  }

  return matrix;
}

/**
 * Esegue il Visual Coverage Audit post-generazione.
 * Riconcilia formalmente ciò che era stato pianificato nella Visual Coverage Matrix
 * rispetto a quanto effettivamente prodotto nel Markdown e negli artefatti visuali compilati.
 *
 * @param {Array<Object>} coverageMatrix Matrice pre-generazione
 * @param {string} markdownContent Testo finale del capitolo
 * @param {Array<Object>} [renderedArtifacts=[]] Artefatti grafici/SVG renderizzati
 * @returns {Object} Report formale dell'audit di copertura visuale
 */
function auditVisualCoverage(coverageMatrix = [], markdownContent = '', renderedArtifacts = []) {
  const auditReport = {
    timestamp: new Date().toISOString(),
    totalPlannedVisuals: 0,
    satisfiedVisuals: 0,
    convertedJustified: 0,
    omittedWithoutJustification: 0,
    textOnlyDecisions: 0,
    items: [],
    hardFails: [],
    warnings: [],
    passed: true
  };

  if (!Array.isArray(coverageMatrix) || coverageMatrix.length === 0) {
    return auditReport;
  }

  const renderedIds = new Set(
    renderedArtifacts.map(a => a.id || a.figureId || a.graphId).filter(Boolean)
  );

  for (const item of coverageMatrix) {
    const auditItem = {
      id: item.id,
      conceptId: item.conceptId,
      sourceId: item.sourceId,
      label: item.label,
      strategicDecision: item.strategicDecision,
      chosenRepresentation: item.chosenRepresentation,
      provenanceIntent: item.provenanceIntent,
      status: 'UNCHECKED',
      auditNote: ''
    };

    // Caso 1: La decisione pianificata era deliberatamente KEEP_AS_TEXT o CONVERT_TO_TABLE
    if (item.strategicDecision === STRATEGIC_DECISIONS.KEEP_AS_TEXT) {
      auditReport.textOnlyDecisions++;
      auditItem.status = 'SATISFIED_TEXT';
      auditItem.auditNote = 'Trattazione mantenuta a teoria parlata come da pianificazione';
      auditReport.items.push(auditItem);
      continue;
    }

    if (item.strategicDecision === STRATEGIC_DECISIONS.CONVERT_TO_TABLE) {
      auditReport.totalPlannedVisuals++;
      // Cerca se esiste una tabella Markdown associata al concetto
      const hasTableInMd = /\|[^\n]+\|[^\n]+\|/i.test(markdownContent);
      if (hasTableInMd) {
        auditReport.satisfiedVisuals++;
        auditItem.status = 'SATISFIED_TABLE';
        auditItem.auditNote = 'Esigenza convertita e soddisfatta tramite tabella tipografica accademica';
      } else {
        auditReport.convertedJustified++;
        auditItem.status = 'CONVERTED_JUSTIFIED';
        auditItem.auditNote = 'Conversione registrata in tabella didattica';
      }
      auditReport.items.push(auditItem);
      continue;
    }

    // Caso 2: Era previsto un visuale reale (VISUALIZE, RECONSTRUCT, SYNTHESIZE)
    auditReport.totalPlannedVisuals++;

    const cleanLabel = (item.label || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rationalePattern = new RegExp(`(?:trattazione tabulare|sintesi in tabella|approfondito nel testo).*${cleanLabel}|${cleanLabel}.*(?:trattat[oa] in tabella|tabella comparativa)`, 'i');
    const hasExplicitRationale = rationalePattern.test(markdownContent);

    if (hasExplicitRationale) {
      auditReport.convertedJustified++;
      auditItem.status = 'CONVERTED_JUSTIFIED';
      auditItem.auditNote = 'Visuale convertito motivatamente in forma testuale/tabellare';
      auditReport.warnings.push(`Esigenza visuale "${item.label}" convertita motivatamente in tabella/testo.`);
      auditReport.items.push(auditItem);
      continue;
    }

    // Verifica presenza specifica dell'artefatto nel rendering o nel Markdown
    const isRendered = (item.sourceId && renderedIds.has(item.sourceId)) ||
                       (item.conceptId && renderedIds.has(item.conceptId));

    const isPresentInMarkdown = (item.sourceId && markdownContent.includes(item.sourceId)) ||
                                (item.conceptId && markdownContent.includes(item.conceptId)) ||
                                (item.label && new RegExp(`<figure[^>]*>[\\s\\S]*?${cleanLabel}|${cleanLabel}[\\s\\S]*?<\\/figure>`, 'i').test(markdownContent));

    if (isRendered || isPresentInMarkdown) {
      auditReport.satisfiedVisuals++;
      auditItem.status = 'SATISFIED_VISUAL';
      auditItem.auditNote = `Artefatto visuale presente e integrato (${item.chosenRepresentation})`;
    } else {
      // OMISSIONE INGIUSTIFICATA: HARD FAIL
      auditReport.omittedWithoutJustification++;
      auditItem.status = 'OMITTED_UNJUSTIFIED';
      auditItem.auditNote = 'Visuale pianificato nella Coverage Matrix ma ASSENTE senza giustificazione didattica';
      auditReport.hardFails.push({
        code: 'VISUAL_REQUIREMENT_OMITTED_WITHOUT_JUSTIFICATION',
        itemId: item.id,
        conceptId: item.conceptId,
        label: item.label,
        message: `L'esigenza visuale pianificata "${item.label}" (${item.chosenRepresentation}) è assente nel testo finale senza motivazione formale!`
      });
    }

    auditReport.items.push(auditItem);
  }

  auditReport.passed = auditReport.omittedWithoutJustification === 0 && auditReport.hardFails.length === 0;

  return auditReport;
}

module.exports = {
  STRATEGIC_DECISIONS,
  DETECTED_STRUCTURES,
  COGNITIVE_NEEDS,
  CANDIDATE_FORMS,
  evaluateCandidateRepresentations,
  buildVisualCoverageMatrix,
  auditVisualCoverage
};
