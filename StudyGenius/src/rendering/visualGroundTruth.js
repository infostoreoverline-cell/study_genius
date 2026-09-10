/**
 * StudyGenius Academic Intelligence System
 * src/rendering/visualGroundTruth.js — VSVP V2
 * 
 * Modello Formale della Visual Ground Truth e Profili QA per Tipologia Didattica.
 * 
 * Principio Fondamentale:
 * Gemini non deve limitarsi a giudicare se una figura è genericamente "bella",
 * ma deve verificare se l'immagine soddisfa rigorosamente:
 * 1. Gli specifici concetti obbligatori (requiredConcepts)
 * 2. Le relazioni fisiche/strutturali attese (relationships)
 * 3. Il learning goal didattico (learningGoal)
 * 4. L'assenza di interpretazioni fuorvianti o vietate (forbiddenInterpretations)
 */

'use strict';

/**
 * Tipologia di Importanza Didattica dei Grafici (Visual Tiers conformi a STUDYGENIUS_SISTEMA_INTELLIGENZA_VISUALE_MASTER.md)
 */
const VISUAL_TIERS = {
  TIER_1_ORIENTATION: {
    level: 1,
    id: 'ORIENTATION',
    label: 'Livello 1: Orientamento',
    cognitiveGoal: 'Fornire la roadmap concettuale, tappe e visione macroscopica del capitolo.',
    minQualityThreshold: 88,
    badgeColor: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
    typicalForms: ['concept_map', 'timeline', 'roadmap_stepper', 'feature_tree']
  },
  TIER_2_UNDERSTANDING: {
    level: 2,
    id: 'UNDERSTANDING',
    label: 'Livello 2: Comprensione',
    cognitiveGoal: 'Chiarire meccanismi causali, cicli, trasporto ionico/molecolare e modelli fenomenologici.',
    minQualityThreshold: 92,
    badgeColor: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
    typicalForms: ['mechanical_process', 'biological_pathway', 'chemical_structure', 'pid', 'chemistry_apparatus']
  },
  TIER_3_QUANTITATIVE_ANALYSIS: {
    level: 3,
    id: 'QUANTITATIVE_ANALYSIS',
    label: 'Livello 3: Analisi Quantitativa',
    cognitiveGoal: 'Analizzare relazioni funzionali esatte, punti di lavoro, curve multi-parametro e limiti operativi.',
    minQualityThreshold: 95,
    badgeColor: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    typicalForms: ['scientific_plot', 'thermodynamic_cycle', 'circuit_schematic', 'mathematical_geometry']
  }
};

/**
 * Profili di valutazione qualitativa specifici per tipo di diagramma
 */
const QA_PROFILES = {
  concept_map: {
    name: 'Mappa Concettuale Gerarchica',
    defaultTier: VISUAL_TIERS.TIER_1_ORIENTATION,
    focusAreas: [
      'Gerarchia visiva chiara (nodo radice dominante, livelli progressivi)',
      'Assenza di incroci disordinati tra linee di collegamento (edge crossing)',
      'Spaziatura generosa tra nodi fratelli (sibling spacing)',
      'Frecce orientate con verbi di relazione leggibili e non sovrapposti',
      'Assenza di nodi orfani o relazioni circolari ambigue'
    ],
    prohibitedArtifacts: [
      'Linee che attraversano il testo di un altro nodo',
      'Testi di relazione troncati o appiccicati ai bordi dei rettangoli',
      'Rami dell\'albero disposti in ordine di lettura contro-intuitivo'
    ]
  },

  pid: {
    name: 'Schema di Marcia Strumentato (P&ID)',
    defaultTier: VISUAL_TIERS.TIER_2_UNDERSTANDING,
    focusAreas: [
      'Simbologia standard UNICHIM / ISA (cerchi per strumenti, farfalle/clessidre per valvole)',
      'Distinzione netta tra tubazione di processo (linea continua spessa) e segnali strumentali',
      'Tratteggio corretto: segnale elettrico (tratteggio blu o fine), segnale pneumatico (tratteggio con barre o rosso)',
      'Corretto allineamento e chiusura dei loop di controllo (es. LT -> LIC -> LV)',
      'Assenza totale di poligoni neri parassiti (path chiusi erroneamente senza fill="none")'
    ],
    prohibitedArtifacts: [
      'Triangoli o aree nere di riempimento su percorsi di tubazioni o segnali',
      'Etichette di pressione o portata (es. 0.2-1.0 bar) sovrapposte ad attuatori o valvole',
      'Inversione tra monte e valle del processo'
    ]
  },

  mechanical_process: {
    name: 'Schema Meccanico / Fluidodinamico',
    defaultTier: VISUAL_TIERS.TIER_2_UNDERSTANDING,
    focusAreas: [
      'Direzione naturale del flusso (convenzione da sinistra/ingresso verso destra/uscita)',
      'Distinzione geometrica chiara tra corpo macchina (voluta), organo mobile (girante) e condotti',
      'Identificazione univoca delle zone fisiche di fenomeno (es. cavitazione classica vs ricircoli)',
      'Legenda cromatica coerente con le etichette indicate sul disegno',
      'Clearance visiva: le etichette non devono sovrapporsi alle linee di flusso o alle palette'
    ],
    prohibitedArtifacts: [
      'Scritte compresse o sovrapposte dentro cerchi concentrici (es. OCCHIO GIRANTE con CAVITAZIONE)',
      'Frecce di flusso che tagliano a metà parole o descrizioni',
      'Zone colorate con opacità eccessiva che nascondono i dettagli meccanici sottostanti'
    ]
  },

  scientific_plot: {
    name: 'Grafico Scientifico Quantitativo',
    defaultTier: VISUAL_TIERS.TIER_3_QUANTITATIVE_ANALYSIS,
    focusAreas: [
      'Assi X e Y chiaramente etichettati con grandezza fisica e unità di misura SI tra parentesi quadre',
      'Scale numeriche leggibili, con tick regolari e proporzionati',
      'Curva della funzione continua e ben definita sul dominio operativo',
      'Pannello dei parametri riservato, mai sovrapposto all\'area del grafico'
    ],
    prohibitedArtifacts: [
      'Valori dei tick numerici sovrapposti all\'asse o tagliati a sinistra/in basso',
      'Titoli del grafico duplicati dentro e fuori dall\'SVG',
      'Font monospace usati per formule matematiche'
    ]
  },

  circuit_schematic: {
    name: 'Schema Circuitale / Elettronico',
    defaultTier: VISUAL_TIERS.TIER_3_QUANTITATIVE_ANALYSIS,
    focusAreas: [
      'Simbologia elettrotecnica standard IEC/IEEE (resistenze a zig-zag o rettangolo, condensatori, induttori, generatori)',
      'Identificazione chiara di nodi di connessione, rami e versi di correnti/tensioni',
      'Assenza di cortocircuiti visivi o incroci di fili senza pallino di giunzione',
      'Valori dei componenti (es. 10 kΩ, 4.7 µF) posizionati adiacenti al rispettivo simbolo'
    ],
    prohibitedArtifacts: [
      'Fili conduttori che tagliano il testo descrittivo del componente',
      'Etichette di polarità (+ / -) sovrapposte ai terminali'
    ]
  },

  thermodynamic_cycle: {
    name: 'Diagramma Termodinamico / Ciclo Energetico',
    defaultTier: VISUAL_TIERS.TIER_3_QUANTITATIVE_ANALYSIS,
    focusAreas: [
      'Assi termodinamici canonici (p-V, T-s, h-s, log p-h)',
      'Verso del ciclo chiaramente indicato con frecce direzionali lungo le trasformazioni',
      'Stati termodinamici numerati (1, 2, 3, 4) posizionati nei vertici senza sovrapposizioni',
      'Campana di saturazione o isoterme/isobare di riferimento tratteggiate chiaramente distinte'
    ],
    prohibitedArtifacts: [
      'Numeri di stato posizionati sopra le curve di trasformazione',
      'Ciclo percorso in senso errato (orario per motore, antiorario per frigorifero)'
    ]
  },

  biological_pathway: {
    name: 'Pathway Biologico / Biochimico / Anatomico',
    defaultTier: VISUAL_TIERS.TIER_2_UNDERSTANDING,
    focusAreas: [
      'Flusso ordinato del segnale o della cascata metabolica (monte -> valle)',
      'Compartimentazione cellulare visiva (es. membrana, nucleo, citoplasma)',
      'Frecce differenziate per attivazione (freccia a punta) e inibizione (freccia a T)',
      'Nomi di proteine/enzimi/geni chiaramente leggibili all\'interno o a fianco dei complessi'
    ],
    prohibitedArtifacts: [
      'Frecce di interazione che tagliano a metà le membrane o le vescicole',
      'Complessi molecolari sovrapposti tra loro in modo illeggibile'
    ]
  },

  chemical_structure: {
    name: 'Struttura Molecolare / Reazione Chimica',
    defaultTier: VISUAL_TIERS.TIER_2_UNDERSTANDING,
    focusAreas: [
      'Geometria di legame corretta (tetraedrica, planare, lineare)',
      'Frecce di reazione (singola, equilibrio, risonanza) chiaramente distinte',
      'Spaziature tra reagenti, frecce di reazione e prodotti proporzionate',
      'Condizioni di reazione (temperatura, catalizzatore, solvente) poste sopra/sotto la freccia principale'
    ],
    prohibitedArtifacts: [
      'Etichette degli atomi o cariche formali sovrapposte alle linee di legame',
      'Frecce di risonanza confuse con frecce di equilibrio'
    ]
  },

  mathematical_geometry: {
    name: 'Rappresentazione Geometrica / Spaziale',
    defaultTier: VISUAL_TIERS.TIER_3_QUANTITATIVE_ANALYSIS,
    focusAreas: [
      'Proporzioni geometriche coerenti con le ipotesi del teorema o problema',
      'Lettere dei vertici (A, B, C...) e angoli posizionati all\'esterno delle figure',
      'Vettori con verso, direzione e punto di applicazione inequivocabili',
      'Linee di costruzione tratteggiate distinte dai segmenti principali'
    ],
    prohibitedArtifacts: [
      'Lettere dei vertici che collidono con archi di cerchio o lati',
      'Quote dimensionali sovrapposte ai segmenti quotati'
    ]
  },

  chemistry_apparatus: {
    name: 'Apparecchiatura di Laboratorio / Impianto Chimico',
    defaultTier: VISUAL_TIERS.TIER_2_UNDERSTANDING,
    focusAreas: [
      'Connessioni fisiche corrette tra reattore, condensatore, colonne e ricevitori',
      'Indicazione chiara delle correnti di alimentazione, riciclo e spurgo',
      'Condizioni operative (T, P) posizionate in corrispondenza delle apparecchiature corrette'
    ],
    prohibitedArtifacts: [
      'Tubazioni fluttuanti non connesse ad alcuna apparecchiatura',
      'Etichette di specie chimiche sovrapposte a raccordi o valvole'
    ]
  },

  generic_scientific: {
    name: 'Diagramma Scientifico Generale',
    defaultTier: VISUAL_TIERS.TIER_2_UNDERSTANDING,
    focusAreas: [
      'Gerarchia visiva ordinata ed equilibrio spaziale',
      'Clearance visiva: assenza di sovrapposizioni tra testo e grafica',
      'Legenda e note informative chiare e distanziate dal corpo principale',
      'Coerenza cromatica e conformità alla palette accademica StudyGenius'
    ],
    prohibitedArtifacts: [
      'Collisioni tra etichette testuali',
      'Elementi tagliati o debordanti dai limiti del canvas (clipping)',
      'Aree parassite scure generate da percorsi non chiusi correttamente'
    ]
  }
};

/**
 * Crea o normalizza una struttura VisualGroundTruth formale
 */
function createVisualGroundTruth({
  visualId,
  diagramType = 'generic_scientific',
  visualTier = null,
  learningGoal = '',
  requiredConcepts = [],
  relationships = [],
  requiredLabels = [],
  forbiddenInterpretations = [],
  sourceContext = ''
}) {
  const normType = QA_PROFILES[diagramType] ? diagramType : 'generic_scientific';
  const profile = QA_PROFILES[normType];
  const assignedTier = visualTier || profile.defaultTier || VISUAL_TIERS.TIER_2_UNDERSTANDING;

  return {
    visualId: visualId || `V_GT_${Date.now()}`,
    diagramType: normType,
    profileName: profile.name,
    visualTier: assignedTier,
    learningGoal: learningGoal || 'Illustrare chiaramente la struttura e le relazioni del fenomeno didattico.',
    requiredConcepts: Array.isArray(requiredConcepts) ? requiredConcepts : [],
    relationships: Array.isArray(relationships) ? relationships : [],
    requiredLabels: Array.isArray(requiredLabels) ? requiredLabels : [],
    forbiddenInterpretations: Array.isArray(forbiddenInterpretations) ? forbiddenInterpretations : profile.prohibitedArtifacts,
    focusAreas: profile.focusAreas,
    sourceContext: (sourceContext || '').trim().slice(0, 3000)
  };
}

/**
 * Inferisce la VisualGroundTruth dal contesto del Markdown o dal testo dell'SVG
 * in modo completamente agnostico rispetto alla disciplina accademica.
 */
function inferGroundTruthFromContext(svgString, options = {}) {
  const subject = options.subject || 'Scienze';
  const sectionTitle = options.sectionTitle || '';
  const contextText = options.contextText || '';

  const lowerSvg = (svgString || '').toLowerCase();
  const lowerTitle = (sectionTitle || '').toLowerCase();
  const lowerContext = (contextText || '').toLowerCase();
  const combined = `${lowerSvg} ${lowerTitle} ${lowerContext}`;

  // Classificatore semantico disciplinare agnostico
  let diagramType = 'generic_scientific';

  if (combined.includes('p&id') || combined.includes('tubazion') || combined.includes('lic-') || combined.includes('valvol') || combined.includes('flusso di processo')) {
    diagramType = 'pid';
  } else if (combined.includes('concept-map') || combined.includes('mappa') || combined.includes('albero gerarchico') || combined.includes('tassonomia')) {
    diagramType = 'concept_map';
  } else if (combined.includes('circuito') || combined.includes('resistenz') || combined.includes('condensator') || combined.includes('transistor') || combined.includes('volt') || combined.includes('ohm') || combined.includes('kirchhoff')) {
    diagramType = 'circuit_schematic';
  } else if (combined.includes('ciclo') && (combined.includes('termodinamic') || combined.includes('carnot') || combined.includes('rankine') || combined.includes('brayton') || combined.includes('entalpia') || combined.includes('entropia'))) {
    diagramType = 'thermodynamic_cycle';
  } else if (combined.includes('cellul') || combined.includes('membrana') || combined.includes('dna') || combined.includes('rna') || combined.includes('proteina') || combined.includes('enzim') || combined.includes('recettore')) {
    diagramType = 'biological_pathway';
  } else if (combined.includes('molecol') || combined.includes('reazion') || combined.includes('legame') || combined.includes('struttura di lewis') || combined.includes('orbitale')) {
    diagramType = 'chemical_structure';
  } else if (combined.includes('plot') || combined.includes('cartesiano') || combined.includes('grafico') || combined.includes('asciss') || combined.includes('ordinat') || combined.includes('asse x') || combined.includes('asse y')) {
    diagramType = 'scientific_plot';
  } else if (combined.includes('triangol') || combined.includes('cerchio') || combined.includes('angolo') || combined.includes('vettore') || combined.includes('geometric')) {
    diagramType = 'mathematical_geometry';
  } else if (combined.includes('distillaz') || combined.includes('reattore chimico') || combined.includes('colonna di frazionamento') || combined.includes('beuta') || combined.includes('condensatore di liebig')) {
    diagramType = 'chemistry_apparatus';
  } else if (combined.includes('pompa') || combined.includes('girante') || combined.includes('turbina') || combined.includes('pistone') || combined.includes('meccanic') || combined.includes('cavitazione')) {
    diagramType = 'mechanical_process';
  }

  // Estrai etichette presenti nell'SVG
  const labelMatches = svgString.match(/<text\b[^>]*>([\s\S]*?)<\/text>/gi) || [];
  const extractedLabels = labelMatches
    .map(m => m.replace(/<[^>]+>/g, '').trim())
    .filter(t => t.length > 0 && !t.includes('{') && !t.includes('<'));

  const profile = QA_PROFILES[diagramType] || QA_PROFILES.generic_scientific;

  return createVisualGroundTruth({
    visualId: options.visualId || `V_auto_${Date.now()}`,
    diagramType,
    visualTier: options.visualTier || profile.defaultTier,
    learningGoal: sectionTitle ? `Comprendere l'argomento: "${sectionTitle}"` : `Rappresentare accuratamente i concetti di ${subject}`,
    requiredLabels: extractedLabels.slice(0, 15),
    requiredConcepts: extractedLabels.filter(l => l.length > 3).slice(0, 8),
    sourceContext: contextText.slice(0, 2000)
  });
}

module.exports = {
  createVisualGroundTruth,
  inferGroundTruthFromContext,
  QA_PROFILES,
  VISUAL_TIERS
};
