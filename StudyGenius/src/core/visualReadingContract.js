/**
 * StudyGenius — Visual Reading Contract (VRC) & Adaptive Epistemic Hermeneutics
 * 
 * Modulo normativo per la didattica visiva avanzata:
 * 1. 4 Classi di Profondità di Lettura (A: Glance, B: Conceptual, C: Quantitative, D: Problem-Solving)
 * 2. 4 Archetipi di Traiettoria Cognitiva (State Space, Transport Vector, Catalytic Cycle, Discriminant Branching)
 * 3. Principio della "Domanda Scientifica Sospesa" (il visuale risponde a una tensione teorica precedente)
 * 4. Ancoraggi Semantici Coordinate/Componenti (navigazione bidirezionale testo <-> grafica)
 * 5. Separazione netta Didascalia (tecnica/provenienza) vs Testo Circostante (ermeneutica fenomenologica)
 * 6. Bando sistematico dei cliché introduttivi passivi
 */

const READING_DEPTH_CLASSES = Object.freeze({
  CLASS_A_GLANCE: 'CLASS_A_GLANCE',             // Panoramica/Mappa: 2-4 righe, nessun trabocchetto forzato
  CLASS_B_CONCEPTUAL: 'CLASS_B_CONCEPTUAL',     // Meccanismo/Flusso: 1-2 paragrafi, causa fenomenologica, trabocchetto opzionale
  CLASS_C_QUANTITATIVE: 'CLASS_C_QUANTITATIVE', // Curve/Stato/Punti: 2-4 paragrafi, estrazione coordinate, calcolo, trabocchetto obbligatorio
  CLASS_D_PROBLEM_SOLVING: 'CLASS_D_PROBLEM_SOLVING' // Trattazione analitica d'esame completa: calcolo + difesa
});

const COGNITIVE_TRAJECTORIES = Object.freeze({
  STATE_SPACE: 'STATE_SPACE',                   // Assi/Unità -> Famiglie curve -> Dominio ammissibile -> Punto lavoro -> Derivata/Sensibilità -> Limiti
  TRANSPORT_VECTOR: 'TRANSPORT_VECTOR',         // Confine controllo -> Vettore flusso -> Barriera selettiva/reazione -> Ricicli/Spurghi/Bilanci
  CATALYTIC_CYCLE: 'CATALYTIC_CYCLE',           // Stato riposo -> Addizione/Feed -> Cambio ossidazione/coordinazione -> Rilascio prodotto -> Rigenerazione
  DISCRIMINANT_BRANCHING: 'DISCRIMINANT_BRANCHING' // Criterio discriminante radice -> Biforcazioni secondarie -> Casi limite -> Scelta tecnologica
});

const EXAM_COMPETENCIES = Object.freeze({
  READ_IT: 'READ_IT',       // Estrazione diretta coordinate, specie, flussi
  EXPLAIN_IT: 'EXPLAIN_IT', // Rationale fenomenologico del perché la curva/diagramma ha quella forma
  USE_IT: 'USE_IT',         // Applicazione del visuale per predire l'effetto di una perturbazione
  DEFEND_IT: 'DEFEND_IT'    // Difesa concettuale: identificazione trabocchetti d'esame e limiti di validità
});

// Cliché introduttivi generici banditi
const FORBIDDEN_VISUAL_CLICHES = [
  /come si evince chiaramente dalla figura/i,
  /la figura sottostante mostra/i,
  /la figura seguente illustra/i,
  /osservando la figura seguente/i,
  /il grafico qui sotto illustra/i,
  /come mostrato nel grafico seguente/i,
  /in questa immagine possiamo vedere/i,
  /la presente figura rappresenta/i
];

/**
 * Determina la classe di profondità didattica (A-D) in base alla rappresentazione e al bisogno cognitivo
 */
function determineReadingDepthClass(coverageItem = {}, evidence = {}) {
  const chosenForm = (coverageItem.chosenRepresentation || evidence.classification?.type || '').toLowerCase();
  const visualLevel = (coverageItem.visualLevel || '').toUpperCase();
  const hasQuantitativeAxes = Boolean(evidence.axes?.x && evidence.axes?.y);

  // Se è un problema o esame esplicito
  if (visualLevel === 'EXAM_PROBLEM' || /problem|esercizio|calcolo/i.test(chosenForm)) {
    return READING_DEPTH_CLASSES.CLASS_D_PROBLEM_SOLVING;
  }

  // Se ha assi quantitativi, curve parametriche, titolazioni o punti operativi
  if (hasQuantitativeAxes || /quantitative|plot|curve|state_space|titolazione|arrhenius/i.test(chosenForm)) {
    return READING_DEPTH_CLASSES.CLASS_C_QUANTITATIVE;
  }

  // Se è un meccanismo, ciclo, cella o flowsheet con interazioni fenomenologiche
  if (/cyclic_mechanism|membrane_cell|pfd|flusso|catalytic|trasporto/i.test(chosenForm) || visualLevel === 'COMPRENSIONE' || visualLevel === 'ANALISI') {
    return READING_DEPTH_CLASSES.CLASS_B_CONCEPTUAL;
  }

  // Default: orientamento/panoramica/roadmap
  return READING_DEPTH_CLASSES.CLASS_A_GLANCE;
}

/**
 * Determina l'archetipo di traiettoria cognitiva appropriato per la forma visuale
 */
function determineCognitiveTrajectory(coverageItem = {}, evidence = {}) {
  const chosenForm = (coverageItem.chosenRepresentation || evidence.classification?.type || '').toLowerCase();

  if (/cycl|ciclo|catalytic|catalisi|enzim/i.test(chosenForm)) {
    return COGNITIVE_TRAJECTORIES.CATALYTIC_CYCLE;
  }

  if (/pfd|flowsheet|membrane|cella|reattore|colonna|scambiatore|flusso/i.test(chosenForm)) {
    return COGNITIVE_TRAJECTORIES.TRANSPORT_VECTOR;
  }

  if (/tree|albero|roadmap|stepper|decision|taxonomy|confronto|matrix/i.test(chosenForm)) {
    return COGNITIVE_TRAJECTORIES.DISCRIMINANT_BRANCHING;
  }

  // Default su curve, plot, diagrammi cartesiani e di stato
  return COGNITIVE_TRAJECTORIES.STATE_SPACE;
}

/**
 * Genera i passi sequenziali del protocollo di lettura guidata secondo la traiettoria cognitiva
 */
function getTrajectoryProtocolSteps(trajectory) {
  switch (trajectory) {
    case COGNITIVE_TRAJECTORIES.STATE_SPACE:
      return [
        { step: 1, name: 'Assi e Unità di Misura', directive: 'Identificare grandezze fisiche, unità SI e natura delle scale (lineare vs logaritmica).' },
        { step: 2, name: 'Fascio di Curve e Parametri', directive: 'Spiegare il significato di ciascuna curva o isoterma/isobara.' },
        { step: 3, name: 'Finestra Operativa Ammissibile', directive: 'Delimitare la regione in cui il sistema può fisicamente o economicamente operare.' },
        { step: 4, name: 'Punto di Lavoro Nominale', directive: 'Individuare le coordinate (x0, y0) del punto stazionario di progetto.' },
        { step: 5, name: 'Derivata Locale e Sensibilità', directive: 'Analizzare la pendenza dy/dx: stabilità locale e risposta a perturbazioni.' },
        { step: 6, name: 'Limiti Asintotici e Vincoli di Sicurezza', directive: 'Esplicitare cosa accade agli estremi del dominio (asintoti, saturazione, collasso).' }
      ];

    case COGNITIVE_TRAJECTORIES.TRANSPORT_VECTOR:
      return [
        { step: 1, name: 'Confine del Volume di Controllo', directive: 'Identificare dove entra la materia prima e dove escono i prodotti/scarti.' },
        { step: 2, name: 'Vettore di Flusso Principale', directive: 'Seguire il moto da monte verso valle (downstream gradient).' },
        { step: 3, name: 'Barriera Selettiva o Zona di Reazione', directive: 'Spiegare il principio fisico della separazione o conversione (es. membrana cationica).' },
        { step: 4, name: 'Ricicli, Spurghi e Bilanci di Conservazione', directive: 'Verificare la chiusura del bilancio di materia: nulla scompare, accumuli o ricicli chiusi.' }
      ];

    case COGNITIVE_TRAJECTORIES.CATALYTIC_CYCLE:
      return [
        { step: 1, name: 'Stato Catalitico a Riposo', directive: 'Identificare il centro catalitico attivo prima dell\'ingresso dei reagenti.' },
        { step: 2, name: 'Addizione Ossidativa / Coordinazione Substrato', directive: 'Tracciare l\'attivazione del legame chimico e l\'ingresso del reagente.' },
        { step: 3, name: 'Variazione dello Stato di Ossidazione', directive: 'Evidenziare i cambiamenti di geometria e stato formale di ossidazione del centro metallico.' },
        { step: 4, name: 'Eliminazione Riduttiva e Rilascio Prodotto', directive: 'Mostrare il distacco del prodotto finito ad alto valore.' },
        { step: 5, name: 'Rigenerazione e Turnover', directive: 'Spiegare come il catalizzatore ritorna al punto 1 garantendo ciclicità continua.' }
      ];

    case COGNITIVE_TRAJECTORIES.DISCRIMINANT_BRANCHING:
      return [
        { step: 1, name: 'Criterio Discriminante Radice', directive: 'Identificare la domanda tecnologica o termodinamica primaria che guida la scelta.' },
        { step: 2, name: 'Biforcazioni di Primo Livello', directive: 'Distinguere i grandi regimi operativi (es. omogeneo vs eterogeneo, continuo vs batch).' },
        { step: 3, name: 'Criteri Limite di Esclusione', directive: 'Chiarire le condizioni vincolanti che escludono categoricamente un ramo.' },
        { step: 4, name: 'Scelta Tecnologica Ottimale Finale', directive: 'Raggiungere la soluzione impiantistica terminale motivata.' }
      ];

    default:
      return [];
  }
}

/**
 * Costruisce il VisualReadingContract formale per un elemento visuale
 */
function buildReadingContract(coverageItem = {}, evidence = {}, options = {}) {
  const visualId = coverageItem.conceptId || coverageItem.sourceId || evidence.figureId || 'fig_target';
  const depthClass = options.depthClass || determineReadingDepthClass(coverageItem, evidence);
  const trajectory = options.trajectory || determineCognitiveTrajectory(coverageItem, evidence);
  const protocolSteps = getTrajectoryProtocolSteps(trajectory);

  // Ancoraggi semantici: punti/componenti che il testo deve esplicitamente nominare
  const semanticAnchors = options.semanticAnchors || extractDefaultAnchors(coverageItem, evidence, trajectory);

  // Competenze d'esame calibrate sulla classe di profondità
  const examCompetencies = {
    read: `Leggere direttamente coordinate, flussi o stati del visuale ${visualId}.`,
    explain: `Fornire il fondamento teorico/termodinamico che spiega la forma assunta dal visuale.`,
    use: depthClass === READING_DEPTH_CLASSES.CLASS_A_GLANCE
      ? null
      : `Predire il comportamento del sistema sotto perturbazione (es. variazione flusso, pressione o pH).`,
    defend: (depthClass === READING_DEPTH_CLASSES.CLASS_C_QUANTITATIVE || depthClass === READING_DEPTH_CLASSES.CLASS_D_PROBLEM_SOLVING)
      ? `Individuare trabocchetti concettuali d'esame e confini di validità del modello visuale.`
      : null
  };

  // Domanda scientifica sospesa (la tensione teorica che precede la figura)
  const precedingQuestion = options.precedingQuestion ||
    `Quale configurazione fisica o relazione funzionale governa il comportamento del sistema ${coverageItem.label || visualId}?`;

  return {
    visualId,
    depthClass,
    trajectory,
    precedingQuestion,
    semanticAnchors,
    protocolSteps,
    examCompetencies,
    forbiddenCliches: FORBIDDEN_VISUAL_CLICHES,
    captionSpec: {
      mustIncludeProvenance: true,
      mustIncludeBoundaryConditions: depthClass !== READING_DEPTH_CLASSES.CLASS_A_GLANCE,
      forbiddenNarrativeExplanation: true
    }
  };
}

/**
 * Estrae ancoraggi semantici di default da evidenze o coperture
 */
function extractDefaultAnchors(coverageItem, evidence, trajectory) {
  const anchors = [];

  // Se l'evidenza ha curve con etichette
  if (evidence.curves && Array.isArray(evidence.curves)) {
    evidence.curves.forEach(c => {
      if (c.id || c.label) anchors.push(c.id || c.label);
    });
  }

  // Se l'evidenza ha punti operativi
  if (evidence.points && Array.isArray(evidence.points)) {
    evidence.points.forEach(p => {
      if (p.id || p.label) anchors.push(p.id || p.label);
    });
  }

  // Se ha assi cartesiani
  if (evidence.axes?.x?.label) anchors.push(evidence.axes.x.label);
  if (evidence.axes?.y?.label) anchors.push(evidence.axes.y.label);

  // Fallback basati sulla traiettoria se nessun ancoraggio geometrico presente
  if (anchors.length === 0) {
    if (trajectory === COGNITIVE_TRAJECTORIES.TRANSPORT_VECTOR) {
      anchors.push('ingresso', 'uscita', 'barriera');
    } else if (trajectory === COGNITIVE_TRAJECTORIES.CATALYTIC_CYCLE) {
      anchors.push('catalizzatore', 'stato di ossidazione', 'prodotto');
    } else if (trajectory === COGNITIVE_TRAJECTORIES.STATE_SPACE) {
      anchors.push('punto di lavoro', 'andamento');
    } else {
      anchors.push('criterio', 'alternativa');
    }
  }

  return anchors;
}

/**
 * Verifica formale del testo circostante e della didascalia rispetto al Reading Contract
 */
function auditReadingText(readingContract, surroundingText = '', captionText = '') {
  const deficiencies = [];
  const hardFails = [];
  const figId = readingContract.visualId;

  // 1. Verifica Bando Cliché Introduttivi
  const detectedCliches = [];
  for (const clicheRegex of readingContract.forbiddenCliches) {
    if (clicheRegex.test(surroundingText)) {
      detectedCliches.push(clicheRegex.source);
      deficiencies.push({
        code: 'BANNED_VISUAL_CLICHE',
        figureId: figId,
        message: `Rilevato cliché introduttivo passivo nel testo di ${figId}: "${clicheRegex.source}". Il visuale deve essere introdotto come risposta a una domanda teorica sospesa.`
      });
    }
  }

  // 2. Verifica Domanda Scientifica Sospesa (Tensione teorica precedente)
  // Il testo che precede il visuale deve contenere un'interrogazione, un dilemma o un problema da risolvere
  const hasPrecedingQuestion = /\?|perché|come è possibile|quale configurazione|il dilemma|il problema fondamentale|la sfida teorica|sorge la necessità/i.test(surroundingText);
  if (!hasPrecedingQuestion && readingContract.depthClass !== READING_DEPTH_CLASSES.CLASS_A_GLANCE) {
    deficiencies.push({
      code: 'MISSING_SUSPENDED_QUESTION',
      figureId: figId,
      message: `La figura ${figId} (Profondità ${readingContract.depthClass}) non è preceduta da una domanda scientifica sospesa o tensione teorica esplicita.`
    });
  }

  // 3. Verifica Ancoraggi Semantici
  const matchedAnchors = [];
  const missingAnchors = [];
  for (const anchor of readingContract.semanticAnchors) {
    const anchorRegex = new RegExp(escapeRegex(anchor), 'i');
    if (anchorRegex.test(surroundingText)) {
      matchedAnchors.push(anchor);
    } else {
      missingAnchors.push(anchor);
    }
  }

  // Se mancano tutti gli ancoraggi semantici per una figura quantitativa o concettuale
  if (readingContract.semanticAnchors.length > 0 && matchedAnchors.length === 0 && readingContract.depthClass !== READING_DEPTH_CLASSES.CLASS_A_GLANCE) {
    deficiencies.push({
      code: 'MISSING_SEMANTIC_ANCHORS',
      figureId: figId,
      message: `Il testo di ${figId} non menziona nessuno degli ancoraggi semantici previsti (${readingContract.semanticAnchors.join(', ')}). Navigazione bidirezionale testo<->grafica assente.`
    });
  }

  // 4. Verifica Competenze d'Esame calibrate sulla Profondità
  // Per Classe C (Quantitativo) e Classe D: obbligatorio Trabocchetto d'Esame / Difesa
  if (readingContract.depthClass === READING_DEPTH_CLASSES.CLASS_C_QUANTITATIVE || readingContract.depthClass === READING_DEPTH_CLASSES.CLASS_D_PROBLEM_SOLVING) {
    const hasDefend = /trabocchetto|errore tipico|attenzione|fraintendimento|confine di validità|non confondere|insidia/i.test(surroundingText);
    if (!hasDefend) {
      deficiencies.push({
        code: 'MISSING_EXAM_TRAP_NOTE',
        figureId: figId,
        message: `La figura ${figId} (Profondità ${readingContract.depthClass}) richiede l'esplicitazione della competenza DEFEND_IT (trabocchetto concettuale d'esame).`
      });
    }

    const hasUse = /se aumentiamo|perturbando|all'aumentare di|spostando|calcolando|punto di lavoro|variazione/i.test(surroundingText);
    if (!hasUse) {
      deficiencies.push({
        code: 'DEFICIENT_ANALYTICAL_DEPTH',
        figureId: figId,
        message: `La figura ${figId} non include l'applicazione predittiva (USE_IT): analizzare cosa accade modificando i parametri operativi.`
      });
    }
  }

  // 5. Verifica Separazione Didascalia vs Testo Circostante
  if (captionText) {
    // La didascalia non deve contenere spiegazioni narrative prolisse (> 300 caratteri)
    if (captionText.length > 300 && /spieghiamo|infatti|possiamo notare che|questo accade perché/i.test(captionText)) {
      deficiencies.push({
        code: 'CAPTION_NARRATIVE_POLLUTION',
        figureId: figId,
        message: `La didascalia della figura ${figId} contiene spiegazioni narrative prolisse. La didascalia deve limitarsi a identificatore, condizioni limite, convenzioni di legenda e provenienza accademica.`
      });
    }
  }

  const passed = hardFails.length === 0 && deficiencies.length === 0;
  const score = Math.max(0, 100 - (deficiencies.length * 5) - (hardFails.length * 50));

  return {
    passed,
    hardFails,
    deficiencies,
    matchedAnchors,
    missingAnchors,
    detectedCliches,
    score
  };
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  READING_DEPTH_CLASSES,
  COGNITIVE_TRAJECTORIES,
  EXAM_COMPETENCIES,
  FORBIDDEN_VISUAL_CLICHES,
  determineReadingDepthClass,
  determineCognitiveTrajectory,
  getTrajectoryProtocolSteps,
  buildReadingContract,
  auditReadingText
};
