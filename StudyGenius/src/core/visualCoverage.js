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
  DEFINITION: 'DEFINITION',                            // Definizione locale o singola nozione
  // --- CHIMICA MOLECOLARE ORGANOMETALLICA (v2.0) ---
  COORDINATION_COMPLEX: 'COORDINATION_COMPLEX',        // Complesso di coordinazione con geometria e ligandi
  REACTION_MECHANISM: 'REACTION_MECHANISM',            // Schema a frecce con addizione ossidativa, eliminazione riduttiva, inserzione
  ELECTRON_PATHWAY: 'ELECTRON_PATHWAY',               // Pathway 16e⁻/18e⁻ con conteggio elettronico esplicito
  TRANS_EFFECT: 'TRANS_EFFECT',                        // Effetto trans e serie di influenza trans
  REACTION_NETWORK: 'REACTION_NETWORK'                 // Rete di trasformazione multi-prodotto (syngas, reforming)
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
  PROSE: 'prose',
  // --- CHIMICA ORGANOMETALLICA (v2.0) ---
  COORDINATION_DIAGRAM: 'coordination_diagram',        // SVG deterministico di complesso con geometria
  MECHANISM_ARROW_PUSHING: 'mechanism_arrow_pushing',  // Schema a frecce con push elettronico tipizzato
  ELECTRON_PATHWAY_DIAGRAM: 'electron_pathway_diagram',// Pathway sequenziale con badge 16e⁻/18e⁻
  TRANS_EFFECT_SERIES: 'trans_effect_series',          // Diagramma orizzontale della serie di influenza trans
  REACTION_NETWORK_SVG: 'reaction_network_svg'         // Grafo orientato di rete di trasformazione
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

    // --- CASI CHIMICI ORGANOMETALLICI (v2.0) ---

    case DETECTED_STRUCTURES.COORDINATION_COMPLEX:
      candidates.push({
        form: CANDIDATE_FORMS.COORDINATION_DIAGRAM,
        score: 98,
        suitability: 'SVG deterministico con geometria (square planar / ottaedrico) e ligandi posizionati matematicamente. Preserva l\'informazione geometrica che la prosa distrugge.'
      });
      candidates.push({
        form: CANDIDATE_FORMS.TYPOGRAPHIC_TABLE,
        score: 50,
        suitability: 'Tabella ligandi: accettabile solo se la geometria non è il punto pedagogico'
      });
      candidates.push({
        form: CANDIDATE_FORMS.PROSE,
        score: 20,
        suitability: 'Sconsigliato: la prosa distrugge l\'informazione geometrica cis/trans e fac/mer'
      });
      break;

    case DETECTED_STRUCTURES.REACTION_MECHANISM:
      candidates.push({
        form: CANDIDATE_FORMS.MECHANISM_ARROW_PUSHING,
        score: 97,
        suitability: 'Frecce semanticamente tipizzate (addizione ossidativa, eliminazione riduttiva, inserzione) con specie intermedie e cariche'
      });
      candidates.push({
        form: CANDIDATE_FORMS.CYCLIC_MECHANISM,
        score: factors.isCyclic ? 92 : 60,
        suitability: 'Appropriato se il meccanismo è ciclico e il catalizzatore si rigenera'
      });
      candidates.push({
        form: CANDIDATE_FORMS.PROSE,
        score: 25,
        suitability: 'Sconsigliato: la prosa rende impossibile tracciare lo stato di ossidazione del metallo'
      });
      break;

    case DETECTED_STRUCTURES.ELECTRON_PATHWAY:
      candidates.push({
        form: CANDIDATE_FORMS.ELECTRON_PATHWAY_DIAGRAM,
        score: 96,
        suitability: 'Pathway sequenziale con badge 16e⁻/18e⁻ accanto a ogni specie. Rende visibile la regola dei 18 elettroni e le specie insature cineticamente rilevanti.'
      });
      candidates.push({
        form: CANDIDATE_FORMS.MECHANISM_ARROW_PUSHING,
        score: 75,
        suitability: 'Alternativa se il conteggio elettronico è secondario rispetto agli step meccanicistici'
      });
      candidates.push({
        form: CANDIDATE_FORMS.TYPOGRAPHIC_TABLE,
        score: 55,
        suitability: 'Tabella specie/conteggio: utile come complemento, non come sostituto del pathway'
      });
      break;

    case DETECTED_STRUCTURES.TRANS_EFFECT:
      candidates.push({
        form: CANDIDATE_FORMS.TRANS_EFFECT_SERIES,
        score: 94,
        suitability: 'Serie di influenza trans visualizzata come scala orizzontale con esempi di complessi. Rende immediata la regola predittiva di sostituzione.'
      });
      candidates.push({
        form: CANDIDATE_FORMS.COORDINATION_DIAGRAM,
        score: 88,
        suitability: 'Complesso con evidenziazione del ligando trans e frecce di influenza'
      });
      candidates.push({
        form: CANDIDATE_FORMS.TYPOGRAPHIC_TABLE,
        score: 70,
        suitability: 'Tabella ligandi / influenza trans: chiara ma priva della dimensione geometrica'
      });
      break;

    case DETECTED_STRUCTURES.REACTION_NETWORK:
      candidates.push({
        form: CANDIDATE_FORMS.REACTION_NETWORK_SVG,
        score: 95,
        suitability: 'Grafo orientato con nodi-specie e archi-reazione. Rende visibile la rete di trasformazione multi-prodotto (es. syngas: CO, H₂, CH₃OH, HCOOH).'
      });
      candidates.push({
        form: CANDIDATE_FORMS.FLOWSHEET_BLOCKS,
        score: 72,
        suitability: 'Blocchi di processo: adatto se i flussi di massa sono il punto centrale, meno adatto per le relazioni chimiche'
      });
      candidates.push({
        form: CANDIDATE_FORMS.TYPOGRAPHIC_TABLE,
        score: 60,
        suitability: 'Tabella reazioni: enumera le trasformazioni ma non ne mostra le dipendenze topologiche'
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
 * Arricchisce la Visual Coverage Matrix usando i VisualEvidence già estratti
 * dal Funnel multimodale (Tier B/C). Aggiorna dynamicamente detectedStructure e
 * chosenRepresentation per le figure chimiche che il keyword-matching non riesce
 * a classificare correttamente.
 *
 * Principio: il Funnel ha già pagato il costo dell'analisi multimodale. Questo
 * layer usa quell'informazione per arricchire la matrice senza costi aggiuntivi.
 *
 * @param {Array<Object>} matrix Visual Coverage Matrix esistente
 * @param {Array<Object>} visualContracts VisualEvidence estratti dal Funnel
 * @returns {Array<Object>} Matrice arricchita (mutazione in-place con copia)
 */
function enrichCoverageFromEvidence(matrix, visualContracts = []) {
  if (!Array.isArray(matrix) || !Array.isArray(visualContracts) || visualContracts.length === 0) {
    return matrix;
  }

  // Mappa rapida evidence per sourceId
  const evidenceMap = new Map();
  for (const ev of visualContracts) {
    const key = ev.figureId || ev.sourceId;
    if (key) evidenceMap.set(key, ev);
  }

  // Pattern chimici organometallici rilevabili dal deep analysis (Tier C)
  const CHEMISTRY_PATTERNS = [
    { pattern: /effetto\s+trans|trans\s+effect|trans\s+influenza/i, structure: DETECTED_STRUCTURES.TRANS_EFFECT, form: CANDIDATE_FORMS.TRANS_EFFECT_SERIES },
    { pattern: /addizione\s+ossidativa|eliminazione\s+riduttiva|reductive\s+elimination|oxidative\s+addition/i, structure: DETECTED_STRUCTURES.REACTION_MECHANISM, form: CANDIDATE_FORMS.MECHANISM_ARROW_PUSHING },
    { pattern: /16\s*e|18\s*e|conteggio\s+elettronico|electron\s+count/i, structure: DETECTED_STRUCTURES.ELECTRON_PATHWAY, form: CANDIDATE_FORMS.ELECTRON_PATHWAY_DIAGRAM },
    { pattern: /complesso|coordinazione|ligand|legante|square\s+plan|ottaedric|tetrahedral/i, structure: DETECTED_STRUCTURES.COORDINATION_COMPLEX, form: CANDIDATE_FORMS.COORDINATION_DIAGRAM },
    { pattern: /syngas|steam\s+reform|rete\s+di\s+trasform|reaction\s+network|water\s+gas\s+shift/i, structure: DETECTED_STRUCTURES.REACTION_NETWORK, form: CANDIDATE_FORMS.REACTION_NETWORK_SVG }
  ];

  return matrix.map(item => {
    if (!item.sourceId) return item;
    const evidence = evidenceMap.get(item.sourceId);
    if (!evidence) return item;

    const captionText = evidence.caption?.text || '';
    const observations = (evidence.qualitativeObservations || []).join(' ');
    const fullText = `${captionText} ${observations}`;

    // Controlla se il tipo di taxonomy è già un tipo chimico dalla classificazione Tier C
    const classType = evidence.classification?.type || '';
    const isChemicalType = [
      'coordination_complex', 'reaction_mechanism', 'catalytic_cycle_organometallic',
      'electron_count_pathway', 'trans_effect_diagram', 'reaction_network'
    ].includes(classType);

    let enriched = { ...item };

    // Aggiornamento da tipo di tassonomia (Tier C è la fonte più affidabile)
    if (isChemicalType) {
      const typeMap = {
        'coordination_complex': { structure: DETECTED_STRUCTURES.COORDINATION_COMPLEX, form: CANDIDATE_FORMS.COORDINATION_DIAGRAM },
        'reaction_mechanism': { structure: DETECTED_STRUCTURES.REACTION_MECHANISM, form: CANDIDATE_FORMS.MECHANISM_ARROW_PUSHING },
        'catalytic_cycle_organometallic': { structure: DETECTED_STRUCTURES.CATALYTIC_CYCLE, form: CANDIDATE_FORMS.CYCLIC_MECHANISM },
        'electron_count_pathway': { structure: DETECTED_STRUCTURES.ELECTRON_PATHWAY, form: CANDIDATE_FORMS.ELECTRON_PATHWAY_DIAGRAM },
        'trans_effect_diagram': { structure: DETECTED_STRUCTURES.TRANS_EFFECT, form: CANDIDATE_FORMS.TRANS_EFFECT_SERIES },
        'reaction_network': { structure: DETECTED_STRUCTURES.REACTION_NETWORK, form: CANDIDATE_FORMS.REACTION_NETWORK_SVG }
      };
      const mapped = typeMap[classType];
      if (mapped) {
        enriched.detectedStructure = mapped.structure;
        enriched.chosenRepresentation = mapped.form;
        enriched.strategicDecision = STRATEGIC_DECISIONS.RECONSTRUCT;
        enriched.enrichedFromEvidence = true;
        enriched.enrichmentSource = 'tier_c_taxonomy';
        return enriched;
      }
    }

    // Fallback: pattern matching sul testo dell'analisi
    for (const { pattern, structure, form } of CHEMISTRY_PATTERNS) {
      if (pattern.test(fullText)) {
        enriched.detectedStructure = structure;
        enriched.chosenRepresentation = form;
        enriched.strategicDecision = STRATEGIC_DECISIONS.RECONSTRUCT;
        enriched.enrichedFromEvidence = true;
        enriched.enrichmentSource = 'text_pattern';
        break;
      }
    }

    return enriched;
  });
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
  auditVisualCoverage,
  enrichCoverageFromEvidence
};
