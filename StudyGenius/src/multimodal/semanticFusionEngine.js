/**
 * StudyGenius Academic Intelligence System
 * src/multimodal/semanticFusionEngine.js
 * 
 * Motore di Fusione Semantica ed Epistemica tra Figure, Testo e Formule.
 * 
 * Principi di Governance Scientifica (Sezioni 6, 9, 10, 11 Specifica):
 * 1. Separazione formale delle 4 fasi: Riconoscimento, Trascrizione, Interpretazione, Ricostruzione.
 * 2. Risoluzione dei conflitti: se testo e figura discordano, non scegliere arbitrariamente ma dichiara CONFLICT_WITH_SOURCE.
 * 3. Assegnazione della strategia di ricostruzione (Conservare vs Ridisegnare vs Digitalizzare vs Concettualizzare).
 * 4. Generazione automatica di GraphSpec deterministici per grafici cartesiani con formule note.
 */

const {
  VISUAL_TAXONOMY,
  PROVENANCE_CLASSES,
  CONSISTENCY_STATES,
  RECONSTRUCTION_STRATEGIES
} = require('../core/schemas');

/**
 * Esegue la fusione semantica di un record VisualEvidence con il contesto testuale
 * 
 * @param {Object} evidence Record VisualEvidence
 * @param {string} localSurroundingText Testo della pagina/sezione estratto localmente
 * @param {Array<string>} knownFormulas Formule matematiche note dal testo
 * @returns {Object} FusedVisualArtifact pronto per DeepSeek e per il rendering
 */
function fuseVisualWithContext(evidence, localSurroundingText = '', knownFormulas = []) {
  if (!evidence) return null;

  const textLower = (localSurroundingText || '').toLowerCase();
  const captionText = (evidence.caption?.text || '').toLowerCase();
  const fullContext = `${textLower} ${captionText}`;

  // =========================================================================
  // 1. VERIFICA CONSISTENZA E FUSIONE TRA FIGURA E TESTO (Sezione 10)
  // =========================================================================
  let consistencyState = CONSISTENCY_STATES.VISUAL_ONLY;
  const conflicts = [];
  const confirmedFormulas = [];

  // Controlla collegamenti alle formule dichiarate
  if (Array.isArray(evidence.formulaLinks) && evidence.formulaLinks.length > 0) {
    for (const link of evidence.formulaLinks) {
      const formulaStr = link.formula || '';
      // Ricerca riscontro nel testo locale o nelle formule estratte
      const isPresentInText = fullContext.includes(formulaStr.toLowerCase()) ||
        knownFormulas.some(f => f.includes(formulaStr) || formulaStr.includes(f));

      if (isPresentInText) {
        link.status = CONSISTENCY_STATES.CONFIRMED_BY_SOURCE;
        confirmedFormulas.push(formulaStr);
      } else if (evidence.axes?.x?.label && fullContext.includes(evidence.axes.x.label.toLowerCase())) {
        link.status = CONSISTENCY_STATES.SUPPORTED_BY_SOURCE;
      } else {
        link.status = CONSISTENCY_STATES.VISUAL_ONLY;
      }
    }
  }

  // Verifica concordanza scale assi (es. logaritmica vs lineare)
  const mentionsLog = fullContext.includes('logaritmic') || fullContext.includes('scala semi-log') || fullContext.includes('ln(');
  const mentionsLinear = fullContext.includes('lineare') || fullContext.includes('proporzionale');
  const xIsLog = evidence.axes?.x?.scale === 'log';
  const yIsLog = evidence.axes?.y?.scale === 'log';

  if ((xIsLog || yIsLog) && mentionsLinear && !mentionsLog) {
    conflicts.push('SCALA_CONFLITTO: La figura riporta scala logaritmica ma il testo menziona andamento lineare.');
  }

  if (conflicts.length > 0) {
    consistencyState = CONSISTENCY_STATES.CONFLICT_WITH_SOURCE;
  } else if (confirmedFormulas.length > 0) {
    consistencyState = CONSISTENCY_STATES.CONFIRMED_BY_SOURCE;
  } else if (captionText.length > 5 && textLower.includes(captionText.slice(0, 30))) {
    consistencyState = CONSISTENCY_STATES.SUPPORTED_BY_SOURCE;
  } else {
    consistencyState = CONSISTENCY_STATES.VISUAL_ONLY;
  }

  // =========================================================================
  // 2. DECISIONE STRATEGIA DI RICOSTRUZIONE (Sezione 11)
  // =========================================================================
  let selectedStrategy = RECONSTRUCTION_STRATEGIES.PRESERVE_ORIGINAL;
  const visualType = evidence.classification?.type;

  if (
    visualType === VISUAL_TAXONOMY.SCIENTIFIC_PHOTO ||
    visualType === VISUAL_TAXONOMY.DOCUMENTARY_IMAGE ||
    visualType === VISUAL_TAXONOMY.EXPERIMENTAL_APPARATUS ||
    visualType === VISUAL_TAXONOMY.SPECTRUM ||
    visualType === VISUAL_TAXONOMY.CHROMATOGRAM
  ) {
    // Foto, apparati e spettri complessi: conservare SEMPRE l'originale ad alta risoluzione
    selectedStrategy = RECONSTRUCTION_STRATEGIES.PRESERVE_ORIGINAL;
  } else if (
    visualType === VISUAL_TAXONOMY.CONCEPTUAL_DIAGRAM ||
    visualType === VISUAL_TAXONOMY.TIMELINE ||
    visualType === VISUAL_TAXONOMY.MAP
  ) {
    // Diagrammi concettuali e flussi: ricostruire schematicamente (Mermaid / SVG)
    selectedStrategy = RECONSTRUCTION_STRATEGIES.RECONSTRUCT_CONCEPTUAL;
  } else if (
    visualType === VISUAL_TAXONOMY.QUANTITATIVE_PLOT ||
    visualType === VISUAL_TAXONOMY.PHASE_DIAGRAM
  ) {
    // Grafici cartesiani quantitativi:
    // Se c'è una formula confermata o stimabile, ridisegna deterministico con D3/MathJax
    if (confirmedFormulas.length > 0 || (evidence.formulaLinks && evidence.formulaLinks.length > 0)) {
      selectedStrategy = RECONSTRUCTION_STRATEGIES.REDRAW_FROM_FORMULA_DATA;
    } else if (Array.isArray(evidence.series) && evidence.series.length > 0) {
      selectedStrategy = RECONSTRUCTION_STRATEGIES.DIGITIZE_APPROXIMATE;
    } else {
      selectedStrategy = RECONSTRUCTION_STRATEGIES.PRESERVE_ORIGINAL;
    }
  } else if (visualType === VISUAL_TAXONOMY.DECORATIVE) {
    selectedStrategy = RECONSTRUCTION_STRATEGIES.EXCLUDE;
  }

  // =========================================================================
  // 3. GENERAZIONE AUTOMATICA GRAPHSPEC DETERMINISTICO (Se applicabile)
  // =========================================================================
  let generatedGraphSpec = null;
  if (selectedStrategy === RECONSTRUCTION_STRATEGIES.REDRAW_FROM_FORMULA_DATA) {
    const rawFormula = confirmedFormulas[0] || (evidence.formulaLinks?.[0]?.formula) || '';
    generatedGraphSpec = buildDeterministicGraphSpec(evidence, rawFormula);
  }

  // =========================================================================
  // 4. DIRETTIVA DIDATTICA STRUTTURATA PER DEEPSEEK (Sezione 18)
  // =========================================================================
  const didacticDirective = generateDidacticMarkdownDirective(evidence, selectedStrategy, consistencyState, conflicts);

  return {
    figureId: evidence.figureId,
    source: evidence.source,
    classification: evidence.classification,
    consistencyState,
    conflicts,
    reconstructionStrategy: selectedStrategy,
    graphSpec: generatedGraphSpec,
    cropPath: evidence.cropPath || null,
    cropKey: evidence.cropKey || null,
    caption: evidence.caption,
    didacticDirective,
    evidence
  };
}

/**
 * Costruisce uno schema GraphSpec compatibile con graphRenderer.js
 */
function buildDeterministicGraphSpec(evidence, formulaStr) {
  const xLabel = evidence.axes?.x?.label ? `${evidence.axes.x.label} ${evidence.axes.x.unit ? `[${evidence.axes.x.unit}]` : ''}` : 'x';
  const yLabel = evidence.axes?.y?.label ? `${evidence.axes.y.label} ${evidence.axes.y.unit ? `[${evidence.axes.y.unit}]` : ''}` : 'y';

  return {
    id: evidence.figureId,
    type: 'GRAPH',
    provenance: 'FORMULA-derived',
    chartType: 'FUNCTION',
    chapterId: `ch_${evidence.source?.page || 1}`,
    title: evidence.caption?.text || 'Grafico Quantitativo',
    x: {
      label: xLabel.trim(),
      min: 0,
      max: 10
    },
    y: {
      label: yLabel.trim(),
      min: 0,
      max: 10
    },
    expression: sanitizeFormulaToExpression(formulaStr),
    annotations: (evidence.qualitativeObservations || []).slice(0, 2).map((obs, i) => ({
      x: 3 + i * 3,
      label: obs.slice(0, 40)
    }))
  };
}

/**
 * Converte formule TeX comuni in espressioni valutabili matematicamente da safeEvaluateMath
 */
function sanitizeFormulaToExpression(formula) {
  if (!formula || typeof formula !== 'string') return 'x';

  let expr = formula
    .replace(/\\ln/g, 'ln')
    .replace(/\\exp/g, 'exp')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\^/g, '**')
    .replace(/[\\]/g, '');

  if (expr.includes('=')) {
    const parts = expr.split('=');
    expr = parts[1] || parts[0];
  }

  return expr.trim() || 'x';
}

/**
 * Genera la guida didattica per DeepSeek conforme alla Sezione 18
 */
function generateDidacticMarkdownDirective(evidence, strategy, consistencyState, conflicts) {
  const figId = evidence.figureId;
  const caption = evidence.caption?.text || 'Figura scientifica';

  let strategyText = '';
  if (strategy === RECONSTRUCTION_STRATEGIES.REDRAW_FROM_FORMULA_DATA) {
    strategyText = `Incorpora il grafico deterministico inserendo il segnaposto: {{GRAPH:${figId}}}`;
  } else if (strategy === RECONSTRUCTION_STRATEGIES.PRESERVE_ORIGINAL) {
    strategyText = `Fai riferimento alla figura originale estratta dalla fonte: ![${caption}](${evidence.cropKey || figId}) e ricostruiscine lo schema concettuale/funzionale in blocco vettoriale \`\`\`svg ... \`\`\` per massima chiarezza accademica.`;
  } else if (strategy === RECONSTRUCTION_STRATEGIES.RECONSTRUCT_CONCEPTUAL) {
    strategyText = `Genera uno schema vettoriale SVG puro in blocco \`\`\`svg\\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ...">...</svg>\\n\`\`\` (oppure specifica deterministica \`\`\`json:visual-spec\\n{...}\\n\`\`\`). VIETATO usare alberi ASCII (├──, └──).`;
  } else {
    strategyText = `Descrivi analiticamente la figura nel testo e genera uno schema vettoriale in blocco \`\`\`svg ... \`\`\` per i collegamenti logici.`;
  }

  let conflictWarning = '';
  if (consistencyState === CONSISTENCY_STATES.CONFLICT_WITH_SOURCE) {
    conflictWarning = `\n> ⚠️ **AVVISO DI DISCORDANZA DIDATTICA**: ${conflicts.join(' ')} Evidenzia allo studente questa ambiguità tra testo e rappresentazione grafica.`;
  }

  return `### DIRETTIVA PER ${figId} ("${caption}"):
- **Strategia Visuale**: ${strategyText}
- **Che cosa rappresenta**: ${evidence.qualitativeObservations?.[0] || 'Relazione tra le grandezze'}
- **Assi e Unità**: X = ${evidence.axes?.x?.label || 'non indicato'} (${evidence.axes?.x?.unit || 'adimensionale'}), Y = ${evidence.axes?.y?.label || 'non indicato'} (${evidence.axes?.y?.unit || 'adimensionale'})
- **Provenienza**: ${evidence.provenance} (Stato: ${consistencyState})
${conflictWarning}`;
}

module.exports = {
  fuseVisualWithContext,
  buildDeterministicGraphSpec,
  generateDidacticMarkdownDirective
};
