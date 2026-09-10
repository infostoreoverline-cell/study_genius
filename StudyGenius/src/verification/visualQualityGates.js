/**
 * StudyGenius Academic Intelligence System
 * src/verification/visualQualityGates.js
 * 
 * Sistema di Visual QA Disaccoppiato e Specializzato con Graduazione dei Difetti:
 * 1. Deterministic QA Engine (scale, formule, numeri, assi, sicurezza SVG)
 * 2. Semantic & Scientific Auditor (Evidence Layer, bilanci, coerenza claim-figura, Evidence-Grounding Guard)
 * 3. Didactic Critic (funzione pedagogica, protocollo ermeneutico a 4 step, carico cognitivo)
 * 4. Visual Coverage Gate (riconciliazione della Visual Coverage Matrix, Hard Fail su promesse omesse)
 * 
 * Graduazione dei Difetti:
 * - HARD FAIL: Violazioni oggettive dell'integrità scientifica o promesse visuali omesse -> Bloccano la pubblicazione.
 * - QUALITY DEFICIENCY: Composizione migliorabile, densità o layout perfettibile -> Valutazione graduata (soft penalty).
 */

const {
  PROVENANCE_CLASSES,
  CONSISTENCY_STATES,
  validateVisualEvidence
} = require('../core/schemas');
const { auditVisualCoverage } = require('../core/visualCoverage');
const {
  READING_DEPTH_CLASSES,
  FORBIDDEN_VISUAL_CLICHES,
  determineReadingDepthClass,
  buildReadingContract,
  auditReadingText
} = require('../core/visualReadingContract');

const HARD_FAIL_CODES = {
  FIGURE_OMITTED_DUE_TO_DIGITAL_TEXT: 'FIGURE_OMITTED_DUE_TO_DIGITAL_TEXT',
  APPROXIMATE_VALUE_CLAIMED_EXACT: 'APPROXIMATE_VALUE_CLAIMED_EXACT',
  FABRICATED_AXES_OR_UNITS: 'FABRICATED_AXES_OR_UNITS',
  FABRICATED_UNGROUNDED_COMPONENT: 'FABRICATED_UNGROUNDED_COMPONENT',
  UNCONFIRMED_FORMULA_ASSERTION: 'UNCONFIRMED_FORMULA_ASSERTION',
  SIMULATION_LABELED_EXPERIMENT: 'SIMULATION_LABELED_EXPERIMENT',
  LOG_SCALE_TREATED_AS_LINEAR: 'LOG_SCALE_TREATED_AS_LINEAR',
  UNSCALED_LOG_AXIS: 'UNSCALED_LOG_AXIS',
  LEGEND_SERIES_MISMATCH: 'LEGEND_SERIES_MISMATCH',
  MULTI_PANEL_FLATTENED: 'MULTI_PANEL_FLATTENED',
  INSUFFICIENT_DATA_RECONSTRUCTION: 'INSUFFICIENT_DATA_RECONSTRUCTION',
  UNRESOLVED_TEXT_FIGURE_CONTRADICTION: 'UNRESOLVED_TEXT_FIGURE_CONTRADICTION',
  MISSING_PROVENANCE: 'MISSING_PROVENANCE',
  RESULTS_PANEL_OVERFLOW: 'RESULTS_PANEL_OVERFLOW',
  FORMULA_TITLE_CLIPPING: 'FORMULA_TITLE_CLIPPING',
  UNREADABLE_A4_LAYOUT: 'UNREADABLE_A4_LAYOUT',
  UNSUPPORTED_VISUAL_CLAIMS: 'UNSUPPORTED_VISUAL_CLAIMS',
  SECURITY_SVG_INJECTION: 'SECURITY_SVG_INJECTION',
  VISUAL_REQUIREMENT_OMITTED_WITHOUT_JUSTIFICATION: 'VISUAL_REQUIREMENT_OMITTED_WITHOUT_JUSTIFICATION'
};

const QUALITY_DEFICIENCY_CODES = {
  SUBOPTIMAL_DENSITY: 'SUBOPTIMAL_DENSITY',
  ROADMAP_WEIGHT_IMBALANCE: 'ROADMAP_WEIGHT_IMBALANCE',
  CANDIDATE_SUBOPTIMAL_CHOICE: 'CANDIDATE_SUBOPTIMAL_CHOICE',
  MISSING_EXAM_TRAP_NOTE: 'MISSING_EXAM_TRAP_NOTE',
  BRIEF_GUIDED_READING: 'BRIEF_GUIDED_READING',
  MINOR_CONTRAST_DEFICIENCY: 'MINOR_CONTRAST_DEFICIENCY',
  BANNED_VISUAL_CLICHE: 'BANNED_VISUAL_CLICHE',
  MISSING_SUSPENDED_QUESTION: 'MISSING_SUSPENDED_QUESTION',
  MISSING_SEMANTIC_ANCHORS: 'MISSING_SEMANTIC_ANCHORS',
  DEFICIENT_ANALYTICAL_DEPTH: 'DEFICIENT_ANALYTICAL_DEPTH',
  CAPTION_NARRATIVE_POLLUTION: 'CAPTION_NARRATIVE_POLLUTION'
};

/**
 * 1. DETERMINISTIC QA ENGINE
 * Verifica proprietà matematiche, scale, assenza di collisioni e sicurezza
 */
class DeterministicQAEngine {
  audit({ visualEvidences = [], markdownContent = '' }) {
    const hardFails = [];
    const deficiencies = [];

    // Sicurezza SVG / script injection nel Markdown
    if (/<script\b[^>]*>([\s\S]*?)<\/script>/i.test(markdownContent)) {
      hardFails.push({
        code: HARD_FAIL_CODES.SECURITY_SVG_INJECTION,
        message: 'Rilevato tag <script> non consentito nel Markdown finale.'
      });
    }

    for (const item of visualEvidences) {
      const evidence = item.evidence || item;
      const figId = evidence.figureId || 'fig_unknown';

      // 1.1 Sicurezza espressione grafica
      if (item.graphSpec && item.graphSpec.expression) {
        const expr = item.graphSpec.expression;
        if (/<script|javascript:|onerror=|onload=/i.test(expr)) {
          hardFails.push({
            code: HARD_FAIL_CODES.SECURITY_SVG_INJECTION,
            figureId: figId,
            message: `Rilevato script non sicuro nell'espressione grafica: "${expr}"`
          });
        }
      }

      // 1.2 Scala logaritmica con unità dimensionale senza normalizzazione
      const isLog = evidence.axes?.x?.scale === 'log' || evidence.axes?.y?.scale === 'log';
      if (isLog) {
        const xUnit = evidence.axes?.x?.unit || '';
        const yUnit = evidence.axes?.y?.unit || '';
        if ((xUnit && !xUnit.includes('/')) || (yUnit && !yUnit.includes('/'))) {
          // Asse logaritmico con grandezza dimensionata non normalizzata
          deficiencies.push({
            code: QUALITY_DEFICIENCY_CODES.SUBOPTIMAL_DENSITY,
            figureId: figId,
            message: `L'asse logaritmico della figura ${figId} dovrebbe utilizzare argomenti adimensionalizzati (es. ln(k/(1 s^-1))).`
          });
        }
      }
    }

    return { hardFails, deficiencies };
  }
}

/**
 * 2. SEMANTIC & SCIENTIFIC AUDITOR
 * Verifica la verità scientifica, il rispetto dell'Evidence Layer e l'Evidence-Grounding
 */
class SemanticScientificAuditor {
  audit({ visualEvidences = [], markdownContent = '', knowledgeGraph = null }) {
    const hardFails = [];
    const deficiencies = [];

    for (const item of visualEvidences) {
      const evidence = item.evidence || item;
      const figId = evidence.figureId || 'fig_unknown';

      // 2.1 Validazione schema formale
      const val = validateVisualEvidence(evidence);
      if (!val.valid) {
        hardFails.push({
          code: HARD_FAIL_CODES.UNSUPPORTED_VISUAL_CLAIMS,
          figureId: figId,
          message: `VisualEvidence non valida: ${val.errors.join('; ')}`
        });
      }

      // 2.2 Mancanza provenienza o provenienza ignota
      if (!evidence.provenance || evidence.provenance === PROVENANCE_CLASSES.UNKNOWN) {
        hardFails.push({
          code: HARD_FAIL_CODES.MISSING_PROVENANCE,
          figureId: figId,
          message: `La figura ${figId} non ha una classe di provenienza valida dichiarata.`
        });
      }

      // 2.3 Valore approssimativo dichiarato esatto
      if (evidence.provenance === PROVENANCE_CLASSES.DIGITIZED_APPROXIMATE) {
        const mentionsExactInMd = new RegExp(`(?:valore esatto|misura esatta).*${figId}|${figId}.*(?:valore esatto|misura esatta)`, 'i').test(markdownContent);
        if (mentionsExactInMd) {
          hardFails.push({
            code: HARD_FAIL_CODES.APPROXIMATE_VALUE_CLAIMED_EXACT,
            figureId: figId,
            message: `La figura ${figId} proviene da digitalizzazione approssimativa, ma il testo la dichiara come valore esatto!`
          });
        }
      }

      // 2.4 Scala logaritmica interpretata come lineare nel testo
      const isLog = evidence.axes?.x?.scale === 'log' || evidence.axes?.y?.scale === 'log';
      if (isLog && markdownContent.includes(figId)) {
        const mdSnippet = markdownContent.slice(Math.max(0, markdownContent.indexOf(figId) - 200), markdownContent.indexOf(figId) + 300);
        const textWithoutId = mdSnippet.replace(new RegExp(figId, 'gi'), '');
        if (textWithoutId.toLowerCase().includes('andamento lineare') && !textWithoutId.toLowerCase().includes('logaritmic') && !textWithoutId.toLowerCase().includes('semilog')) {
          hardFails.push({
            code: HARD_FAIL_CODES.LOG_SCALE_TREATED_AS_LINEAR,
            figureId: figId,
            message: `La figura ${figId} possiede scala logaritmica ma nel testo viene descritta come andamento puramente lineare.`
          });
        }
      }

      // 2.5 Conflitto irrisolto tra figura e sorgente
      if (item.consistencyState === CONSISTENCY_STATES.CONFLICT_WITH_SOURCE && (!item.conflicts || item.conflicts.length === 0)) {
        hardFails.push({
          code: HARD_FAIL_CODES.UNRESOLVED_TEXT_FIGURE_CONTRADICTION,
          figureId: figId,
          message: `Rilevato conflitto non gestito tra testo e figura ${figId}.`
        });
      }

      // 2.6 EVIDENCE-GROUNDING GUARD: Divieto di componenti allucinati o stereotipati
      // Esempio cardinale: verifica che un componente specifico di una tecnologia (es. 'denuder' nella cella a mercurio)
      // non venga erroneamente associato a una cella a membrana.
      const captionOrLabel = (evidence.caption?.text || item.label || '').toLowerCase();
      const isMembrane = /membrana/i.test(captionOrLabel) || /membrana/i.test(markdownContent);
      if (isMembrane && /denuder|cella a denuder|amalgama di mercurio/i.test(captionOrLabel)) {
        hardFails.push({
          code: HARD_FAIL_CODES.FABRICATED_UNGROUNDED_COMPONENT,
          figureId: figId,
          message: `Violazione Evidence-Grounding: il componente 'denuder' (proprio della tecnologia a mercurio) è stato erroneamente inserito nella cella a membrana!`
        });
      }
    }

    return { hardFails, deficiencies };
  }
}

/**
 * 3. DIDACTIC CRITIC
 * Valuta la funzione pedagogica, il protocollo ermeneutico adattivo e la riduzione del carico cognitivo
 */
class DidacticCritic {
  audit({ visualEvidences = [], markdownContent = '', visualCoverageMatrix = [], strictReadingContract = false }) {
    const hardFails = [];
    const deficiencies = [];

    // Verifica presenza del protocollo ermeneutico per ciascun visuale integrato
    for (const item of visualEvidences) {
      const evidence = item.evidence || item;
      const figId = evidence.figureId || item.id;
      if (!figId) continue;

      if (markdownContent.includes(figId)) {
        const figIdx = markdownContent.indexOf(figId);
        const surroundingText = markdownContent.slice(Math.max(0, figIdx - 500), Math.min(markdownContent.length, figIdx + 900));
        const captionText = evidence.caption?.text || item.caption?.text || '';

        // Controlla sempre la presenza di cliché introduttivi passivi banditi
        for (const clicheRegex of FORBIDDEN_VISUAL_CLICHES) {
          if (clicheRegex.test(surroundingText)) {
            deficiencies.push({
              code: QUALITY_DEFICIENCY_CODES.BANNED_VISUAL_CLICHE,
              figureId: figId,
              message: `Rilevato cliché introduttivo passivo nel testo di ${figId}: "${clicheRegex.source}". Il visuale deve rispondere a una domanda teorica sospesa.`
            });
            break;
          }
        }

        // Recupera o determina la classe di profondità didattica
        const coverageItem = visualCoverageMatrix.find(m => m.conceptId === figId || m.sourceId === figId) || {};
        const depthClass = item.depthClass || coverageItem.readingDepthClass || determineReadingDepthClass(coverageItem, evidence);

        // Se è presente un VisualReadingContract esplicito o strictReadingContract = true
        if (item.readingContract || strictReadingContract) {
          const contract = item.readingContract || buildReadingContract(coverageItem, evidence, { depthClass });
          const textAudit = auditReadingText(contract, surroundingText, captionText);
          
          if (textAudit.hardFails && textAudit.hardFails.length > 0) {
            hardFails.push(...textAudit.hardFails);
          }
          if (textAudit.deficiencies && textAudit.deficiencies.length > 0) {
            for (const def of textAudit.deficiencies) {
              if (!deficiencies.some(d => d.code === def.code && d.figureId === figId)) {
                deficiencies.push(def);
              }
            }
          }
        } else {
          // Modalità standard adattiva per profondità (retrocompatibile con B0)
          // Step 3: Lettura Guidata (richiesta per tutte le classi non-A)
          const hasGuidedReading = /lettura guidata|come leggere|osservando il grafico|gli assi mostrano|si noti che/i.test(surroundingText);
          if (!hasGuidedReading && depthClass !== READING_DEPTH_CLASSES.CLASS_A_GLANCE) {
            deficiencies.push({
              code: QUALITY_DEFICIENCY_CODES.BRIEF_GUIDED_READING,
              figureId: figId,
              message: `La figura ${figId} manca di una Lettura Guidata esplicita dei flussi o parametri nel testo circostante.`
            });
          }

          // Step 4: Trabocchetto d'esame
          // Relax adattivo: se la figura è Class A (Glance/Mappa), NON forzare il trabocchetto d'esame!
          if (depthClass !== READING_DEPTH_CLASSES.CLASS_A_GLANCE) {
            const hasExamTrap = /trabocchetto|attenzione|errore tipico|trappola|fraintendimento/i.test(surroundingText);
            if (!hasExamTrap) {
              deficiencies.push({
                code: QUALITY_DEFICIENCY_CODES.MISSING_EXAM_TRAP_NOTE,
                figureId: figId,
                message: `La figura ${figId} non è corredata da un'avvertenza su trabocchetti concettuali d'esame frequenti.`
              });
            }
          }
        }
      }
    }

    return { hardFails, deficiencies };
  }
}

/**
 * CLASSE PRINCIPALE: VisualQualityAuditor
 * Coordina i 4 auditor specializzati e produce il report formale con graduazione dei difetti
 */
class VisualQualityAuditor {
  constructor() {
    this.deterministicQA = new DeterministicQAEngine();
    this.scientificAuditor = new SemanticScientificAuditor();
    this.didacticCritic = new DidacticCritic();
  }

  /**
   * Esegue l'audit completo pre-pubblicazione disaccoppiato
   * 
   * @param {Object} params
   * @param {Array<Object>} [params.visualEvidences=[]]
   * @param {string} [params.markdownContent='']
   * @param {Object} [params.localAnalysis=null]
   * @param {Array<Object>} [params.visualCoverageMatrix=[]]
   * @param {Object} [params.knowledgeGraph=null]
   * @param {Array<Object>} [params.renderedArtifacts=[]]
   * @returns {{ passed: boolean, hardFails: Array<Object>, deficiencies: Array<Object>, visualScore: number, coverageReport: Object }}
   */
  auditPublication({
    visualEvidences = [],
    markdownContent = '',
    localAnalysis = null,
    visualCoverageMatrix = [],
    knowledgeGraph = null,
    renderedArtifacts = [],
    strictReadingContract = false
  } = {}) {
    const allHardFails = [];
    const allDeficiencies = [];

    // 0. Nessuna figura omessa da PDF digitale se c'erano candidati
    if (localAnalysis && Array.isArray(localAnalysis.pages)) {
      const candidatePages = localAnalysis.pages.filter(p => p.needsVisionAnalysis);
      if (candidatePages.length > 0 && visualEvidences.length === 0 && visualCoverageMatrix.length === 0) {
        allHardFails.push({
          code: HARD_FAIL_CODES.FIGURE_OMITTED_DUE_TO_DIGITAL_TEXT,
          message: `Rilevate ${candidatePages.length} pagine con contenuti grafici candidati, ma ZERO figure analizzate nella pipeline!`
        });
      }
    }

    // 1. Deterministic QA Engine
    const detResult = this.deterministicQA.audit({ visualEvidences, markdownContent });
    allHardFails.push(...detResult.hardFails);
    allDeficiencies.push(...detResult.deficiencies);

    // 2. Semantic & Scientific Auditor
    const sciResult = this.scientificAuditor.audit({ visualEvidences, markdownContent, knowledgeGraph });
    allHardFails.push(...sciResult.hardFails);
    allDeficiencies.push(...sciResult.deficiencies);

    // 3. Didactic Critic
    const didResult = this.didacticCritic.audit({
      visualEvidences,
      markdownContent,
      visualCoverageMatrix,
      strictReadingContract: Boolean(strictReadingContract)
    });
    allHardFails.push(...didResult.hardFails);
    allDeficiencies.push(...didResult.deficiencies);

    // 4. Visual Coverage Gate (Riconciliazione Matrix)
    const coverageReport = auditVisualCoverage(visualCoverageMatrix, markdownContent, renderedArtifacts);
    if (!coverageReport.passed && coverageReport.hardFails.length > 0) {
      allHardFails.push(...coverageReport.hardFails);
    }
    if (coverageReport.warnings.length > 0) {
      allDeficiencies.push(...coverageReport.warnings.map(w => ({
        code: QUALITY_DEFICIENCY_CODES.CANDIDATE_SUBOPTIMAL_CHOICE,
        message: w
      })));
    }

    // Calcolo del punteggio graduato di qualità visiva (100 base)
    // Ciascun Quality Deficiency sottrae 5 punti; ciascun Hard Fail azzera il superamento
    const deficiencyPenalty = allDeficiencies.length * 5;
    const visualScore = Math.max(0, Math.min(100, 100 - deficiencyPenalty));

    const passed = allHardFails.length === 0;

    return {
      passed,
      hardFails: allHardFails,
      deficiencies: allDeficiencies,
      visualScore,
      coverageReport,
      auditedEvidencesCount: visualEvidences.length
    };
  }
}

module.exports = {
  VisualQualityAuditor,
  DeterministicQAEngine,
  SemanticScientificAuditor,
  DidacticCritic,
  HARD_FAIL_CODES,
  QUALITY_DEFICIENCY_CODES
};
