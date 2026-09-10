/**
 * StudyGenius Academic Intelligence System
 * src/core/qualityEngine.js
 * 
 * Formal Quality Scoring, Hard-Fail Quality Gates & Pedagogical Soft Scoring.
 * Implementa la regola non negoziabile:
 *   PASSED = (hardFails.length === 0) && (softScore >= 75)
 */

let mathjaxDocInstance = null;
let mathjaxAdaptorInstance = null;

const {
  validateGraphSpec,
  ALLOWED_PROVENANCES_MVP
} = require('../visualization/graphSpec');
const { buildDataset } = require('../visualization/dataBuilder');
const {
  validateGraphData,
  checkClaimConsistency
} = require('../visualization/graphValidator');

function getMathJaxValidator() {
  if (!mathjaxDocInstance) {
    try {
      const { mathjax } = require('mathjax-full/js/mathjax.js');
      const { TeX } = require('mathjax-full/js/input/tex.js');
      const { SVG } = require('mathjax-full/js/output/svg.js');
      const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
      const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
      const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');

      mathjaxAdaptorInstance = liteAdaptor();
      RegisterHTMLHandler(mathjaxAdaptorInstance);
      const tex = new TeX({
        packages: AllPackages,
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true
      });
      const svg = new SVG();
      mathjaxDocInstance = mathjax.document('', { InputJax: tex, OutputJax: svg });
    } catch (err) {
      // Ignora se mathjax-full non è disponibile
    }
  }
  return { doc: mathjaxDocInstance, adaptor: mathjaxAdaptorInstance };
}

function detectMissingMathRule(text) {
  const violations = [];
  if (!text || typeof text !== 'string') return violations;

  // Cerca passaggi che iniziano con dichiarazioni di calcolo o derivazione
  const operationRegex = /(?:calcoliamo\s+(?:la|le)\s+derivat[ae]|calcoliamo\s+(?:l'integrale|gli\s+integrali)|derivando(?:\s+\w+)?|applichiamo\s+la\s+derivata|integrando(?:\s+\w+)?|differenziando(?:\s+\w+)?|eseguiamo\s+la\s+derivata)/gi;
  const ruleRegex = /(regola della catena|chain rule|derivata del (?:seno|coseno|prodotto|quoziente|rapporto|polinomio|somma|logaritmo|la potenza)|derivata dell'(?:esponenziale|inversa)|integrazione per (?:parti|sostituzione)|metodo di sostituzione|identit[aà] vettoriale|teorema fondamentale|sviluppo in serie|sviluppo di taylor|regola di leibniz|regola di derivazione|regola di integrazione|derivat[ae] notevol[ie]|integral[ie] notevol[ie]|derivat[ae] fondamental[ie]|integral[ie] fondamental[ie])/i;
  const formulaIndicatorRegex = /(\$\$|\\\[|\\frac\{\\partial|\\frac\{d|\\int|=)/;

  const matches = [...text.matchAll(operationRegex)];
  for (const match of matches) {
    const startIndex = match.index;
    const windowStart = Math.max(0, startIndex - 120);
    const windowEnd = Math.min(text.length, startIndex + 350);
    const snippet = text.substring(startIndex, windowEnd);
    const contextWindow = text.substring(windowStart, windowEnd);

    // Se c'è una formula o simbolo di calcolo nel snippet ma la regola non è citata nel contesto locale
    if (formulaIndicatorRegex.test(snippet) && !ruleRegex.test(contextWindow)) {
      violations.push({
        type: 'MISSING_MATH_RULE',
        message: `Passaggio matematico privo di regola esplicitata (Mathematical Provenance Layer): "${match[0]}..."`,
        details: {
          start: startIndex,
          end: windowEnd,
          snippet: snippet.trim().slice(0, 150)
        }
      });
    }
  }

  return violations;
}

class QualityEngine {
  constructor(thresholds = {}) {
    this.thresholds = {
      minimumSoftScore: thresholds.minimumSoftScore || 75,
      contentAccuracy: thresholds.contentAccuracy || 90,
      mathematicalRigor: thresholds.mathematicalRigor || 85,
      completeness: thresholds.completeness || 85,
      pedagogicalQuality: thresholds.pedagogicalQuality || 85,
      examPreparation: thresholds.examPreparation || 80,
      consistency: thresholds.consistency || 90
    };
  }

  /**
   * Valuta un testo didattico separando rigorosamente gli Hard-Fail (vincoli bloccanti)
   * dai Soft Score (qualità pedagogica, chiarezza, stile).
   * 
   * @param {string} text Contenuto generato
   * @param {Object} contract AcademicContract opzionale
   * @param {string} subject Materia di studio
   * @param {Object} knowledgeGraph KnowledgeGraph strutturato opzionale
   * @returns {{
   *   hardFails: Array<{ type: string, message: string, details?: any }>,
   *   warnings: Array<{ type: string, message: string }>,
   *   softScore: number,
   *   passed: boolean,
   *   scores: Object,
   *   auditLog: Array<string>,
   *   overallScore: number,
   *   gatePassed: boolean,
   *   failedGates: Array<any>
   * }}
   */
  evaluateQuality(text, contract = null, subject = 'Fisica', knowledgeGraph = null, blueprint = null) {
    const hardFails = [];
    const warnings = [];
    const auditLog = [];

    const teachingBlueprint = blueprint || (contract && contract.blueprintVersion ? contract : contract?.blueprint) || null;
    const kg = knowledgeGraph || teachingBlueprint?.knowledgeGraph || null;

    const scores = {
      contentAccuracy: 100,
      mathematicalRigor: 100,
      completeness: 100,
      pedagogicalQuality: 100,
      examPreparation: 100,
      consistency: 100
    };

    // -------------------------------------------------------------------------
    // GATE 0: PARSING & MINIMUM LENGTH (HARD-FAIL)
    // -------------------------------------------------------------------------
    if (!text || typeof text !== 'string' || text.trim().length < 500) {
      hardFails.push({
        type: 'INVALID_OR_EMPTY_TEXT',
        message: 'Testo vuoto o inferiore alla soglia minima di comprensibilità accademica (< 500 caratteri)'
      });
      return this._formatReport(hardFails, warnings, 0, scores, auditLog);
    }

    // -------------------------------------------------------------------------
    // GATE 0B: LLM_PREAMBLE_LEAK (HARD-FAIL)
    // Intercetta aperture conversazionali meta non accademiche prima del primo titolo
    // -------------------------------------------------------------------------
    const preambleRegex = /^(?:Certamente|Certo|Ecco|Ecco a te|Va bene|Di seguito|Sicuramente|In qualità di|Come richiesto|Perfetto|D'accordo)[^\n#]*(?:\n[^\n#]*)*?(?:\n\s*---\s*)?\n+(?=#)/iu;
    const preambleMatch = text.trim().match(preambleRegex);
    if (preambleMatch) {
      hardFails.push({
        type: 'LLM_PREAMBLE_LEAK',
        message: `Rilevato preambolo conversazionale LLM residuo prima del primo titolo: "${preambleMatch[0].trim().slice(0, 80)}"`,
        details: { snippet: preambleMatch[0].trim() }
      });
      auditLog.push('HARD-FAIL: LLM preamble leak');
    }

    // -------------------------------------------------------------------------
    // GATE 1: BROKEN_LATEX & LATEX_SYNTAX_ERROR (HARD-FAIL)
    // Delimitatori LaTeX non bilanciati e validazione sintattica rigorosa MathJax
    // -------------------------------------------------------------------------
    // 1.1 Conteggio delimitatori $ isolati (non preceduti da backslash)
    const singleDollarMatches = text.match(/(?<!\\)\$/g) || [];
    if (singleDollarMatches.length % 2 !== 0) {
      hardFails.push({
        type: 'BROKEN_LATEX',
        message: 'Numero dispari di delimitatori $ rilevato: formula LaTeX aperta e non chiusa corretta'
      });
      auditLog.push('HARD-FAIL: Delimitatore LaTeX $ sbilanciato');
    }

    // 1.2 Validazione sintattica formale via MathJax (merror / data-mjx-error)
    const { doc, adaptor } = getMathJaxValidator();
    if (doc && adaptor) {
      // Verifica formule display $$...$$
      const displayFormulas = text.match(/\$\$([\s\S]+?)\$\$/g) || [];
      for (const raw of displayFormulas) {
        const formula = raw.slice(2, -2).trim();
        if (!formula) continue;
        try {
          const node = doc.convert(formula, { display: true });
          const html = adaptor.outerHTML(node);
          if (html.includes('data-mjx-error') || html.includes('merror')) {
            const errMatch = html.match(/data-mjx-error="([^"]+)"/);
            const reason = errMatch ? errMatch[1] : 'Errore di sintassi MathJax';
            hardFails.push({
              type: 'BROKEN_LATEX',
              secondaryType: 'LATEX_SYNTAX_ERROR',
              message: `Errore sintattico MathJax: "${reason}" nella formula: ${formula.slice(0, 70)}`,
              details: { formula, error: reason }
            });
            hardFails.push({
              type: 'LATEX_SYNTAX_ERROR',
              message: `Errore sintattico MathJax: "${reason}" nella formula: ${formula.slice(0, 70)}`,
              details: { formula, error: reason }
            });
            auditLog.push(`HARD-FAIL: MathJax parse error: ${reason}`);
            break;
          }

          // Controllo EMPTY_FORMULA_RENDER per formule display
          const svgMatch = html.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
          const innerSvg = svgMatch ? svgMatch[1] : '';
          const hasContent = /<(path|text|rect|line|use)/.test(innerSvg);
          const viewBoxMatch = html.match(/viewBox="([^"]+)"/);
          let viewBoxWidth = 0;
          if (viewBoxMatch) {
            const parts = viewBoxMatch[1].trim().split(/\s+/);
            if (parts.length === 4) {
              viewBoxWidth = parseFloat(parts[2]) || 0;
            }
          }
          if (formula.length > 3 && (!hasContent || viewBoxWidth < 30)) {
            hardFails.push({
              type: 'EMPTY_FORMULA_RENDER',
              message: `Formula LaTeX con rendering vuoto o invisibile (viewBoxWidth: ${viewBoxWidth}): "${formula.slice(0, 70)}"`,
              details: { formula, viewBoxWidth, hasContent }
            });
            auditLog.push(`HARD-FAIL: Empty formula render: ${formula.slice(0, 40)}`);
            break;
          }
        } catch (e) {
          hardFails.push({
            type: 'BROKEN_LATEX',
            message: `Eccezione compilazione MathJax: "${e.message}" nella formula: ${formula.slice(0, 70)}`,
            details: { formula, error: e.message }
          });
          break;
        }
      }

      // Verifica formule inline $...$ (fino a 40 campioni)
      if (!hardFails.some(hf => hf.type === 'BROKEN_LATEX' || hf.type === 'EMPTY_FORMULA_RENDER')) {
        const inlineFormulas = text.match(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g) || [];
        for (const raw of inlineFormulas.slice(0, 40)) {
          const formula = raw.slice(1, -1).trim();
          if (!formula) continue;
          try {
            const node = doc.convert(formula, { display: false });
            const html = adaptor.outerHTML(node);
            if (html.includes('data-mjx-error') || html.includes('merror')) {
              const errMatch = html.match(/data-mjx-error="([^"]+)"/);
              const reason = errMatch ? errMatch[1] : 'Errore di sintassi MathJax';
              hardFails.push({
                type: 'BROKEN_LATEX',
                secondaryType: 'LATEX_SYNTAX_ERROR',
                message: `Errore sintattico MathJax: "${reason}" nella formula inline: ${formula.slice(0, 70)}`,
                details: { formula, error: reason }
              });
              hardFails.push({
                type: 'LATEX_SYNTAX_ERROR',
                message: `Errore sintattico MathJax: "${reason}" nella formula inline: ${formula.slice(0, 70)}`,
                details: { formula, error: reason }
              });
              auditLog.push(`HARD-FAIL: MathJax inline parse error: ${reason}`);
              break;
            }

            // Controllo EMPTY_FORMULA_RENDER per formule inline
            const svgMatch = html.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
            const innerSvg = svgMatch ? svgMatch[1] : '';
            const hasContent = /<(path|text|rect|line|use)/.test(innerSvg);
            const viewBoxMatch = html.match(/viewBox="([^"]+)"/);
            let viewBoxWidth = 0;
            if (viewBoxMatch) {
              const parts = viewBoxMatch[1].trim().split(/\s+/);
              if (parts.length === 4) {
                viewBoxWidth = parseFloat(parts[2]) || 0;
              }
            }
            if (formula.length > 2 && (!hasContent || viewBoxWidth < 20)) {
              hardFails.push({
                type: 'EMPTY_FORMULA_RENDER',
                message: `Formula inline con rendering vuoto o invisibile (viewBoxWidth: ${viewBoxWidth}): "${formula.slice(0, 70)}"`,
                details: { formula, viewBoxWidth, hasContent }
              });
              auditLog.push(`HARD-FAIL: Empty inline formula render: ${formula.slice(0, 40)}`);
              break;
            }
          } catch (e) {
            // Ignora
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // GATE 2: SCIENTIFIC_CORRECTNESS & ANTI-BLACK-BOX (HARD-FAIL per salti opachi gravi)
    // -------------------------------------------------------------------------
    const isScientific = ['fisica', 'chimica', 'matematica', 'informatica', 'ingegneria'].some(
      s => (subject || '').toLowerCase().includes(s)
    );

    if (isScientific) {
      // Formule matematiche
      const mathBlocks = (text.match(/\$\$[\s\S]+?\$\$/g) || []).length;
      const inlineMath = (text.match(/\$[^$\n]+\$/g) || []).length;
      if (mathBlocks === 0 && inlineMath < 3) {
        scores.mathematicalRigor -= 30;
        warnings.push({
          type: 'LOW_MATH_DENSITY',
          message: 'Bassa densità di formalismo matematico per una materia scientifica quantitativa'
        });
        auditLog.push('Warning: Bassa densità di formule matematiche');
      }

      // Rilevamento espressioni black-box vietate
      const severeBlackBoxRegex = /\b(è ovvio che|è evidente che|facendo i calcoli si trova facilmente|è banale verificare)\b/gi;
      const blackBoxHits = text.match(severeBlackBoxRegex) || [];
      if (blackBoxHits.length > 2) {
        hardFails.push({
          type: 'SCIENTIFIC_CORRECTNESS',
          message: `Rilevati molteplici salti concettuali opachi non documentati (${blackBoxHits.length} espressioni black-box vietate)`,
          details: { hits: blackBoxHits.slice(0, 5) }
        });
        auditLog.push(`HARD-FAIL: Eccesso di scorciatoie epistemiche black-box (${blackBoxHits.length})`);
      } else if (blackBoxHits.length > 0) {
        scores.mathematicalRigor -= (blackBoxHits.length * 10);
        warnings.push({
          type: 'BLACK_BOX_WARNING',
          message: `Trovate ${blackBoxHits.length} formule opache ("${blackBoxHits.join(', ')}")`
        });
        auditLog.push(`Warning: ${blackBoxHits.length} formule opache rilevate`);
      }

      // Rilevamento formule e notazioni chimico/matematiche intrappolate nei code span
      const rawCodeSpans = (text.replace(/```[\s\S]*?```/g, '').match(/`[^`\n]+`/g) || []);
      const suspiciousMathSpans = rawCodeSpans.filter(span =>
        /[_^']|log|ln|pH|pOH|pKa|pKb|pKps|Ka|Kb|Kw|Kps|Keq|Δ|Σ|∫|∂|√|±|×|÷|≠|≤|≥|≈|∝|∞|°|[λμαβγδεθφψω]|\[[A-Za-z0-9\+\-]+\]|=.*10\^?-?\d/.test(span.slice(1, -1))
      );
      if (suspiciousMathSpans.length > 0) {
        scores.mathematicalRigor -= Math.min(20, suspiciousMathSpans.length * 2);
        hardFails.push({
          type: 'MATH_AS_CODE_SPAN',
          message: `Rilevati ${suspiciousMathSpans.length} simboli o formule matematiche/chimiche scritti in code span anziché in LaTeX ($...$): ${suspiciousMathSpans.slice(0, 5).join(', ')}`,
          details: { sample: suspiciousMathSpans.slice(0, 10), count: suspiciousMathSpans.length }
        });
        warnings.push({
          type: 'MATH_IN_CODE_SPANS',
          message: `Rilevati ${suspiciousMathSpans.length} simboli o formule matematiche in code span anziché LaTeX ($...$)`,
          details: { sample: suspiciousMathSpans.slice(0, 5) }
        });
        auditLog.push(`HARD-FAIL: ${suspiciousMathSpans.length} formule o simboli in code span (MATH_AS_CODE_SPAN)`);
      }
    }

    // -------------------------------------------------------------------------
    // GATE 2B: MISSING_MATH_RULE (HARD-FAIL - Mathematical Provenance Layer)
    // -------------------------------------------------------------------------
    const missingMathViolations = detectMissingMathRule(text);
    if (missingMathViolations.length > 0) {
      scores.mathematicalRigor -= Math.min(30, missingMathViolations.length * 15);
      for (const viol of missingMathViolations) {
        hardFails.push(viol);
        auditLog.push(`HARD-FAIL: MISSING_MATH_RULE ad indice ${viol.details.start}: ${viol.details.snippet.slice(0, 50)}`);
      }
    }

    // -------------------------------------------------------------------------
    // GATE 3: MISSING_CRITICAL_CONCEPT (HARD-FAIL rispetto a Graph o Contract)
    // -------------------------------------------------------------------------
    if (knowledgeGraph && Array.isArray(knowledgeGraph.nodes)) {
      const criticalNodes = knowledgeGraph.nodes.filter(
        n => (n.attrs?.importance >= 4 || n.attrs?.examRelevance >= 4) && n.label
      );

      const missingCritical = [];
      for (const node of criticalNodes) {
        // Cerca la presenza del label o del contenuto nel testo generato
        const searchTerms = [node.label];
        const hasTerm = searchTerms.some(term => {
          const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(escaped, 'i').test(text);
        });

        if (!hasTerm) {
          missingCritical.push(node.label);
        }
      }

      if (missingCritical.length > 0) {
        hardFails.push({
          type: 'MISSING_CRITICAL_CONCEPT',
          message: `Concetti critici obbligatori mancanti nella trattazione: ${missingCritical.join(', ')}`,
          details: { missing: missingCritical }
        });
        auditLog.push(`HARD-FAIL: Mancano ${missingCritical.length} concetti critici dal Knowledge Graph`);
      }

      // -----------------------------------------------------------------------
      // GATE 3B: MISSING_REQUIRED_VISUAL (HARD-FAIL per grafici/schemi obbligatori)
      // -----------------------------------------------------------------------
      const visualRequiredNodes = knowledgeGraph.nodes.filter(
        n => (n.requires_visual || n.attrs?.requires_visual) && n.label
      );

      if (visualRequiredNodes.length > 0) {
        // Verifica presenza di grafici SVG deterministici o schemi nella trattazione
        const hasVisualDiagram = /<svg[\s\S]*?<\/svg>|<div class="academic-diagram"|```(?:json:plot|plot|tikz|chemfig)/i.test(text);
        if (!hasVisualDiagram) {
          hardFails.push({
            type: 'MISSING_REQUIRED_VISUAL',
            message: `Nodi concettuali con requisito visuale obbligatorio (${visualRequiredNodes.map(n => n.label).join(', ')}) privi di grafico o diagramma SVG nella trattazione`,
            details: { nodes: visualRequiredNodes.map(n => n.id) }
          });
          auditLog.push(`HARD-FAIL: Mancano grafici/schemi per ${visualRequiredNodes.length} nodi con requires_visual`);
        }
      }

      // -----------------------------------------------------------------------
      // GATE 3C: CANONICAL REUSE & ANTI-DUPLICATION (HARD-FAIL)
      // -----------------------------------------------------------------------
      // 1. DUPLICATE_ACROSS_SESSIONS: Concetto già formalizzato in una sessione precedente ri-derivato da zero
      for (const node of knowledgeGraph.nodes) {
        const canonicalId = node.canonicalExplanationId || node.attrs?.canonicalExplanationId;
        const isReviewNode = node.attrs?.isReview || node.type === 'REVIEW_OF' || (!node.isCanonical && node.canonicalRef);
        if (canonicalId && isReviewNode) {
          const nodeLabelClean = (node.label || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const fullReDerivationRegex = new RegExp(`(^#{1,3}[\\s\\S]{0,80}?${nodeLabelClean}[\\s\\S]{0,500}?(?:Definizione Rigorosa|Definiamo|Teorema & Dimostrazione))`, 'mi');
          if (fullReDerivationRegex.test(text)) {
            const hasReviewCallout = /(?:>\s*📌\s*\*\*Richiamo|\bcome visto in|\bvedi Sezione|\bREVIEW_OF\b)/i.test(text);
            if (!hasReviewCallout) {
              hardFails.push({
                type: 'DUPLICATE_ACROSS_SESSIONS',
                message: `Rilevata re-derivazione integrale del concetto canonico "${node.label}" (ID: ${canonicalId}). È obbligatorio un blocco di richiamo (REVIEW/REFERENCE) anziché ri-derivare da zero.`,
                details: { nodeId: node.id, canonicalExplanationId: canonicalId, concept: node.label }
              });
              auditLog.push(`HARD-FAIL: DUPLICATE_ACROSS_SESSIONS per "${node.label}"`);
              break;
            }
          }
        }
      }

      // 2. DUPLICATE_CANONICAL_EXPLANATION: Sezioni identiche ripetute dentro lo stesso documento
      const substantiveHeadings = (text.match(/^#{1,3}\s+([^\n]+)/gm) || [])
        .map(h => h.replace(/^#{1,3}\s+/, '').trim())
        .filter(h => h.length > 10 && !/^(?:capitolo\s+\d+|introduzione|conclusione|formulario|eserciz|domande|controlli di coerenza)/i.test(h));

      const headingCounts = new Map();
      for (const h of substantiveHeadings) {
        const norm = h.toLowerCase().replace(/^[0-9\.\s]+/, '').trim();
        if (norm.length > 8) {
          headingCounts.set(norm, (headingCounts.get(norm) || 0) + 1);
        }
      }

      for (const [titleNorm, count] of headingCounts.entries()) {
        if (count >= 2) {
          hardFails.push({
            type: 'DUPLICATE_CANONICAL_EXPLANATION',
            message: `Rilevata duplicazione interna di sezione teorica: "${titleNorm}" compare ${count} volte nel documento anziché essere formalizzata una volta e richiamata`,
            details: { title: titleNorm, occurrences: count }
          });
          auditLog.push(`HARD-FAIL: DUPLICATE_CANONICAL_EXPLANATION per "${titleNorm}" (${count}x)`);
          break;
        }
      }
    }

    // -------------------------------------------------------------------------
    // GATE 3D: PREREQUISITE_VIOLATION (HARD-FAIL DI PRIMO LIVELLO)
    // Se B richiede A come prerequisito, A deve precedere B nell'esposizione.
    // -------------------------------------------------------------------------
    if (kg && Array.isArray(kg.edges)) {
      const prereqEdges = kg.edges.filter(e => {
        const t = (e.type || '').toUpperCase();
        return t === 'REQUIRES' || t === 'DEPENDS_ON' || t === 'MOTIVATED_BY';
      });

      for (const edge of prereqEdges) {
        const nodeDep = (kg.nodes || []).find(n => n.id === edge.from);
        const nodeReq = (kg.nodes || []).find(n => n.id === edge.to);

        if (nodeDep && nodeReq && nodeDep.label && nodeReq.label) {
          const cleanLabelDep = nodeDep.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const cleanLabelReq = nodeReq.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          const regexDep = new RegExp(`(?:#+\\s+[^\\n]*?${cleanLabelDep}|\\b${cleanLabelDep}\\b|📌[^\\n]*?${cleanLabelDep})`, 'i');
          const regexReq = new RegExp(`(?:#+\\s+[^\\n]*?${cleanLabelReq}|\\b${cleanLabelReq}\\b|📌[^\\n]*?${cleanLabelReq})`, 'i');

          const matchDep = text.search(regexDep);
          const matchReq = text.search(regexReq);

          if (matchDep !== -1 && matchReq !== -1 && matchDep < matchReq - 150) {
            hardFails.push({
              type: 'PREREQUISITE_VIOLATION',
              severity: 'HARD_FAIL',
              scope: 'SECTION',
              targetId: nodeDep.id,
              message: `Violazione dell'ordine didattico dei prerequisiti: il concetto "${nodeDep.label}" viene introdotto o formalizzato prima del suo prerequisito necessario "${nodeReq.label}".`,
              details: {
                dependentConcept: nodeDep.label,
                prerequisiteConcept: nodeReq.label,
                depIndex: matchDep,
                reqIndex: matchReq
              }
            });
            auditLog.push(`HARD-FAIL: PREREQUISITE_VIOLATION ("${nodeDep.label}" prima di "${nodeReq.label}")`);
            break;
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // GATE 3E: UNRESOLVED_FIRST_USE (HARD-FAIL)
    // Verifica che prima dell'esordio simbolico di una nuova quantità ci sia motivazione e definizione
    // -------------------------------------------------------------------------
    const firstUseContracts = [];
    if (teachingBlueprint && Array.isArray(teachingBlueprint.firstUseContracts)) {
      firstUseContracts.push(...teachingBlueprint.firstUseContracts);
    }
    if (kg && Array.isArray(kg.nodes)) {
      for (const n of kg.nodes) {
        if (n.firstUse && !firstUseContracts.some(c => c.conceptId === n.id)) {
          firstUseContracts.push(n.firstUse);
        }
      }
    }

    for (const contractItem of firstUseContracts) {
      const sym = contractItem.symbol || contractItem.conceptId;
      if (!sym) continue;

      const escapedSym = sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mathUsageRegex = new RegExp(`(?:\\$[^$]*?${escapedSym}[^$]*?\\$|\\$\\$[\\s\\S]*?${escapedSym}[\\s\\S]*?\\$\\$)`, 'i');
      const matchPos = text.search(mathUsageRegex);

      if (matchPos > 0) {
        const textBefore = text.slice(0, matchPos);
        const hasMotivation = /perché|esigenz|limite|necessit|introduc|misur|senso fisico|intuitiv|definiamo|rapporto tra|frazione/i.test(textBefore);
        const mentionsConcept = new RegExp(`\\b${escapedSym}\\b|${contractItem.meaning ? contractItem.meaning.slice(0, 20) : escapedSym}`, 'i').test(textBefore);

        if (!hasMotivation && !mentionsConcept && contractItem.requirements?.mustExplainBeforeSymbolicUse !== false) {
          hardFails.push({
            type: 'UNRESOLVED_FIRST_USE',
            severity: 'HARD_FAIL',
            scope: 'BLOCK',
            targetId: contractItem.conceptId,
            message: `Violazione First Use Contract: il simbolo "${sym}" compare in una formula formale prima che sia stato spiegato il motivo per cui è necessario o definito il suo significato fisico.`,
            details: { symbol: sym, conceptId: contractItem.conceptId }
          });
          auditLog.push(`HARD-FAIL: UNRESOLVED_FIRST_USE per "${sym}"`);
          break;
        }
      }
    }

    // -------------------------------------------------------------------------
    // GATE 3F: INVALID_REFERENCE (HARD-FAIL DETERMINISTICO)
    // Verifica che ogni riferimento logico [REF:...] punti a un'entità esistente
    // -------------------------------------------------------------------------
    const semanticRefs = text.matchAll(/\[REF:([a-zA-Z0-9_\-\.]+)\]/g);
    const knownIds = new Set();
    if (kg && Array.isArray(kg.nodes)) {
      kg.nodes.forEach(n => {
        knownIds.add(n.id);
        if (n.attrs?.symbol) knownIds.add(n.attrs.symbol);
        const cleanLabel = (n.label || '').toLowerCase().replace(/[^a-z0-9\-]+/g, '-');
        knownIds.add(cleanLabel);
      });
    }
    if (teachingBlueprint) {
      if (teachingBlueprint.chapterId) knownIds.add(teachingBlueprint.chapterId);
      if (Array.isArray(teachingBlueprint.conceptOrder)) {
        teachingBlueprint.conceptOrder.forEach(id => knownIds.add(id));
      }
    }

    for (const refMatch of semanticRefs) {
      const fullKey = refMatch[1];
      const targetId = fullKey.includes('.') ? fullKey.split('.').slice(1).join('.') : fullKey;
      if (knownIds.size > 0 && !knownIds.has(targetId) && !knownIds.has(fullKey)) {
        hardFails.push({
          type: 'INVALID_REFERENCE',
          severity: 'HARD_FAIL',
          scope: 'GLOBAL',
          message: `Riferimento logico-semantico non valido: "[REF:${fullKey}]" punta a un'entità concettuale o capitolo inesistente.`,
          details: { reference: fullKey, targetId }
        });
        auditLog.push(`HARD-FAIL: INVALID_REFERENCE per "[REF:${fullKey}]"`);
        break;
      }
    }

    // -------------------------------------------------------------------------
    // GATE 4: LOGICAL STRUCTURE & HEADINGS (SOFT SCORE)
    // -------------------------------------------------------------------------
    const headings = (text.match(/^#{1,4}\s+/gm) || []).length;
    if (headings < 3) {
      scores.pedagogicalQuality -= 25;
      scores.completeness -= 15;
      warnings.push({
        type: 'SHALLOW_STRUCTURE',
        message: 'Struttura gerarchica superficiale (meno di 3 titoli di sezione)'
      });
      auditLog.push('Struttura didattica debole (< 3 sezioni)');
    }

    // -------------------------------------------------------------------------
    // GATE 5: PEDAGOGY (Intuizione Fenomenologica & Callout)
    // -------------------------------------------------------------------------
    const hasIntuition = /💡|\*\*Intuizione|senso fisico|intuitivamente|significato del|a livello microscopico/i.test(text);
    if (!hasIntuition) {
      scores.pedagogicalQuality -= 20;
      warnings.push({
        type: 'MISSING_INTUITION',
        message: 'Manca la spiegazione fenomenologica/intuitiva del fenomeno ("Can I Explain It?")'
      });
      auditLog.push('Manca callout o sezione di intuizione fenomenologica');
    }

    const hasDefinitions = /📌|\*\*Definizione|\bDefiniamo\b|\bdefinizione di\b|enunciato/i.test(text);
    if (!hasDefinitions) {
      scores.completeness -= 20;
      warnings.push({
        type: 'MISSING_DEFINITION',
        message: 'Mancano enunciati formali o definizioni rigide'
      });
      auditLog.push('Mancano definizioni formali esplicite');
    }

    // -------------------------------------------------------------------------
    // GATE 5B: BARE_DEFINITION con Formal Dependency Unit (FDU)
    // Non boccia a priori se < 250 caratteri: verifica se costituisce una FDU
    // (Definizione + Formula + Interpretazione immediata)
    // -------------------------------------------------------------------------
    const defMatches = text.matchAll(/(?:📌\s*\*\*Definizione|\*\*Definizione\*\*|Definiamo\s+[^:\n]+:?)([\s\S]{0,350}?)(?=\n#{1,3}\s+|\n📌|\n🎓|\n⚠️|\n\n\n|$)/gi);
    for (const dMatch of defMatches) {
      const body = dMatch[1] || '';
      const totalLen = body.trim().length;

      const textOnly = body.replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$/g, '').trim();
      if (textOnly.length < 80 && totalLen < 220) {
        const hasFormula = /\$[^$]+\$|\$\$[\s\S]+?\$\$/.test(body);
        const hasInterpretation = /dove|indica|misura|rappresenta|significa|unità|esprime/i.test(body);

        if (hasFormula && hasInterpretation) {
          auditLog.push('Detector BARE_DEFINITION: validata come Formal Dependency Unit (FDU)');
        } else {
          hardFails.push({
            type: 'BARE_DEFINITION',
            severity: 'HARD_FAIL',
            scope: 'BLOCK',
            message: `Definizione isolata priva di formula formalizzante e di interpretazione del significato fisico ("Bare Definition"): "${body.slice(0, 100).trim()}..."`,
            details: { snippet: body.slice(0, 120) }
          });
          auditLog.push('HARD-FAIL: BARE_DEFINITION isolata senza equazione né interpretazione');
          break;
        }
      }
    }

    // -------------------------------------------------------------------------
    // GATE 5C: UNEXPLAINED_FORMAL_TRANSITION (stepSignificance)
    // Transizioni ad alta significatività (rotori, integrali di linea, derivate seconde)
    // richiedono esplicitazione di WHY, WHAT CHANGED o conseguenze.
    // -------------------------------------------------------------------------
    const highSignificanceMathRegex = /(?:\\nabla\s*\\times|\\oint|\\iint|\\frac\{\\partial\^2\}\{\\partial\s*t\^2\}|\\Delta\s*\\vec)/;
    const derivationBlocks = text.matchAll(/\$\$([\s\S]+?)\$\$\s*([\s\S]{0,250}?)\s*\$\$([\s\S]+?)\$\$/g);

    for (const derivMatch of derivationBlocks) {
      const step1 = derivMatch[1];
      const transitionProse = derivMatch[2].trim();
      const step2 = derivMatch[3];

      const isHighStep = highSignificanceMathRegex.test(step1) || highSignificanceMathRegex.test(step2);
      if (isHighStep) {
        const hasWhyOrChange = /applic|calcol|deriv|poiché|in virtù|sostitu|operatore|rotore|teorema di|identità|equazion/i.test(transitionProse);
        if (transitionProse.length < 20 || !hasWhyOrChange) {
          hardFails.push({
            type: 'UNEXPLAINED_FORMAL_TRANSITION',
            severity: 'HARD_FAIL',
            scope: 'BLOCK',
            message: `Passaggio formale ad alta significatività (stepSignificance: HIGH) tra equazioni senza spiegazione della motivazione o dell'operatore applicato: "${step1.slice(0, 40)}" ➔ "${step2.slice(0, 40)}"`,
            details: { step1: step1.slice(0, 60), step2: step2.slice(0, 60), transitionText: transitionProse }
          });
          auditLog.push('HARD-FAIL: UNEXPLAINED_FORMAL_TRANSITION per passaggio ad alta significatività');
          break;
        }
      }
    }

    // -------------------------------------------------------------------------
    // GATE 6: EXAM PREPARATION (Trappole d'Esame & Difesa Orale)
    // -------------------------------------------------------------------------
    const hasTraps = /⚠️|\*\*Attenzione|trappol|errore tipico|trabocchetto|fraintendimento/i.test(text);
    const hasExam = /🎓|\*\*Domande d'Esame|all'esame|in sede d'esame|colloquio|orale/i.test(text);

    if (!hasTraps) {
      scores.examPreparation -= 20;
      warnings.push({
        type: 'MISSING_EXAM_TRAPS',
        message: 'Nessun box dedicato agli errori ricorrenti o trappole d\'esame'
      });
      auditLog.push('Mancano le trappole d\'esame');
    }

    if (!hasExam) {
      scores.examPreparation -= 15;
      warnings.push({
        type: 'MISSING_EXAM_QUESTIONS',
        message: 'Mancano domande di verifica orale o difesa delle ipotesi'
      });
      auditLog.push('Mancano domande di difesa d\'esame');
    }

    // -------------------------------------------------------------------------
    // GATE 7: DETERMINISTIC GRAPH VERIFICATION & INTEGRITY (HARD-FAIL)
    // Quality Gates: GRAPH_MISSING_PROVENANCE, GRAPH_DATA_INVALID,
    //                GRAPH_TEXT_INCONSISTENCY, GRAPH_EMPTY_RENDER
    // -------------------------------------------------------------------------
    const graphNodes = [];
    if (knowledgeGraph) {
      if (Array.isArray(knowledgeGraph.nodes)) {
        graphNodes.push(...knowledgeGraph.nodes.filter(n => n.type === 'GRAPH'));
      }
      if (Array.isArray(knowledgeGraph.graphNodes)) {
        graphNodes.push(...knowledgeGraph.graphNodes);
      }
    }
    if (contract && Array.isArray(contract.graphNodes)) {
      graphNodes.push(...contract.graphNodes);
    }

    // Estrazione nodi grafici incorporati direttamente in blocchi json:graph
    const embeddedGraphBlocks = text.matchAll(/```(?:json:graph|graph)\s*\n([\s\S]*?)\n```/g);
    for (const blockMatch of embeddedGraphBlocks) {
      try {
        const parsedNode = JSON.parse(blockMatch[1].trim());
        if (parsedNode && (parsedNode.type === 'GRAPH' || parsedNode.chartType || parsedNode.expression)) {
          graphNodes.push(parsedNode);
        }
      } catch (err) {
        hardFails.push({
          type: 'GRAPH_DATA_INVALID',
          message: `Blocco json:graph non valido (errore di parsing JSON): ${err.message}`,
          details: { error: err.message }
        });
        auditLog.push('HARD-FAIL: GRAPH_DATA_INVALID (JSON syntax error in embedded graph)');
      }
    }

    // De-duplicazione nodi grafici per id
    const uniqueGraphMap = new Map();
    for (const g of graphNodes) {
      const gId = g.id || g.graphId || `graph-${uniqueGraphMap.size + 1}`;
      if (!uniqueGraphMap.has(gId)) {
        uniqueGraphMap.set(gId, { ...g, id: gId });
      }
    }
    const uniqueGraphNodes = Array.from(uniqueGraphMap.values());

    // 7.1 Validazione di ogni nodo grafico (PROVENANCE, DATA, EMPTY_RENDER)
    for (const gNode of uniqueGraphNodes) {
      // 7.1.a GRAPH_MISSING_PROVENANCE
      if (!gNode.provenance || typeof gNode.provenance !== 'string' || !gNode.provenance.trim()) {
        hardFails.push({
          type: 'GRAPH_MISSING_PROVENANCE',
          message: `Il grafico "${gNode.id}" non ha una provenienza dichiarata (obbligatorio "FORMULA-derived" nel MVP)`,
          details: { graphId: gNode.id }
        });
        auditLog.push(`HARD-FAIL: GRAPH_MISSING_PROVENANCE per "${gNode.id}"`);
      } else if (gNode.provenance !== 'FORMULA-derived') {
        hardFails.push({
          type: 'GRAPH_MISSING_PROVENANCE',
          message: `Provenienza "${gNode.provenance}" non consentita per il grafico "${gNode.id}" nel MVP (ammesso solo "FORMULA-derived")`,
          details: { graphId: gNode.id, provenance: gNode.provenance }
        });
        auditLog.push(`HARD-FAIL: GRAPH_MISSING_PROVENANCE (valore non valido: "${gNode.provenance}")`);
      }

      // 7.1.b GRAPH_DATA_INVALID (Schema Spec)
      const specValidation = validateGraphSpec(gNode);
      if (!specValidation.valid) {
        hardFails.push({
          type: 'GRAPH_DATA_INVALID',
          message: `Specifica strutturale del grafico "${gNode.id}" non valida: ${specValidation.errors.join('; ')}`,
          details: { graphId: gNode.id, errors: specValidation.errors }
        });
        auditLog.push(`HARD-FAIL: GRAPH_DATA_INVALID (schema) per "${gNode.id}"`);
      }

      // 7.1.c GRAPH_DATA_INVALID (Dataset Calculation & Bounds)
      let dataset = null;
      try {
        dataset = buildDataset(gNode);
      } catch (calcErr) {
        hardFails.push({
          type: 'GRAPH_DATA_INVALID',
          message: `Impossibile calcolare il dataset numerico per il grafico "${gNode.id}": ${calcErr.message}`,
          details: { graphId: gNode.id, error: calcErr.message }
        });
        auditLog.push(`HARD-FAIL: GRAPH_DATA_INVALID (calcolo) per "${gNode.id}"`);
      }

      if (dataset) {
        const dataValidation = validateGraphData(dataset, gNode);
        if (!dataValidation.valid) {
          for (const dErr of dataValidation.errors) {
            hardFails.push({
              type: 'GRAPH_DATA_INVALID',
              message: `Dataset numerico non valido per "${gNode.id}": ${dErr.message}`,
              details: { graphId: gNode.id, error: dErr }
            });
            auditLog.push(`HARD-FAIL: GRAPH_DATA_INVALID per "${gNode.id}": ${dErr.message}`);
          }
        }

        // 7.1.d GRAPH_EMPTY_RENDER (Dataset vuoto o senza punti)
        if (!dataset.points || dataset.points.length === 0) {
          hardFails.push({
            type: 'GRAPH_EMPTY_RENDER',
            message: `Rendering del grafico "${gNode.id}" vuoto o degenere: nessun punto campionato nel dataset`,
            details: { graphId: gNode.id }
          });
          auditLog.push(`HARD-FAIL: GRAPH_EMPTY_RENDER per "${gNode.id}"`);
        }
      }
    }

    // 7.1.e GRAPH_EMPTY_RENDER su SVG incorporati nel testo
    const embeddedSvgs = text.matchAll(/<svg[^>]*class="[^"]*studygenius-graph-svg[^"]*"[^>]*>([\s\S]*?)<\/svg>/gi);
    for (const svgMatch of embeddedSvgs) {
      const inner = svgMatch[1] || '';
      const hasGraphElements = /<(path|circle|line|rect)/i.test(inner);
      if (!hasGraphElements) {
        hardFails.push({
          type: 'GRAPH_EMPTY_RENDER',
          message: 'Rilevato elemento SVG per grafico vuoto o privo di tracciati geometrici',
          details: { snippet: svgMatch[0].slice(0, 120) }
        });
        auditLog.push('HARD-FAIL: GRAPH_EMPTY_RENDER (SVG degenere nel testo)');
      }
    }

    // 7.2 GRAPH_TEXT_INCONSISTENCY: Verifica deterministica coerenza testo↔grafico (Sezione 9)
    const allClaims = [];
    if (contract && Array.isArray(contract.graphClaims)) {
      allClaims.push(...contract.graphClaims);
    }
    if (knowledgeGraph && Array.isArray(knowledgeGraph.graphClaims)) {
      allClaims.push(...knowledgeGraph.graphClaims);
    }

    const claimBlocks = text.matchAll(/```(?:json:graphClaims|graphClaims|json)\s*\n([\s\S]*?)\n```/g);
    for (const cBlock of claimBlocks) {
      try {
        const parsedBlock = JSON.parse(cBlock[1].trim());
        if (parsedBlock && Array.isArray(parsedBlock.graphClaims)) {
          allClaims.push(...parsedBlock.graphClaims);
        }
      } catch (err) {
        // Ignora blocchi JSON non relativi a graphClaims
      }
    }

    for (const claim of allClaims) {
      const matchingGraph = uniqueGraphNodes.find(n => n.id === claim.graphId || n.graphId === claim.graphId);
      if (!matchingGraph) {
        hardFails.push({
          type: 'GRAPH_TEXT_INCONSISTENCY',
          message: `Il claim fa riferimento al grafico "${claim.graphId}" che non è presente nel Knowledge Graph o nella specifica`,
          details: { claim }
        });
        auditLog.push(`HARD-FAIL: GRAPH_TEXT_INCONSISTENCY (grafico "${claim.graphId}" non trovato)`);
        continue;
      }

      let ds = null;
      try {
        ds = buildDataset(matchingGraph);
      } catch (e) {
        continue; // Errore già segnalato da GRAPH_DATA_INVALID
      }

      const tolerance = claim.tolerance !== undefined ? Number(claim.tolerance) : 0.02;
      const consistencyReport = checkClaimConsistency(claim, ds, tolerance, matchingGraph.context || {});
      if (!consistencyReport.valid) {
        hardFails.push({
          type: 'GRAPH_TEXT_INCONSISTENCY',
          message: consistencyReport.message || `Incoerenza numerica testo↔grafico per "${claim.graphId}"`,
          details: {
            graphId: claim.graphId,
            claim: claim.claim,
            x: claim.x !== undefined ? claim.x : claim.xValue,
            actual: consistencyReport.actual,
            expected: consistencyReport.expected,
            relError: consistencyReport.relError,
            tolerance
          }
        });
        auditLog.push(`HARD-FAIL: GRAPH_TEXT_INCONSISTENCY per "${claim.graphId}": ${consistencyReport.message}`);
      }
    }

    // -------------------------------------------------------------------------
    // CALCOLO SOFT SCORE & VERDETTO FINALE
    // -------------------------------------------------------------------------
    // Normalizza ciascun punteggio tra 0 e 100
    for (const key of Object.keys(scores)) {
      scores[key] = Math.max(0, Math.min(100, scores[key]));
    }

    const softScore = Math.round(
      (scores.contentAccuracy +
       scores.mathematicalRigor +
       scores.completeness +
       scores.pedagogicalQuality +
       scores.examPreparation +
       scores.consistency) / 6
    );

    return this._formatReport(hardFails, warnings, softScore, scores, auditLog);
  }

  _formatReport(hardFails, warnings, softScore, scores, auditLog) {
    const hasHardFails = hardFails.length > 0;
    const passed = !hasHardFails && softScore >= this.thresholds.minimumSoftScore;

    // Struttura retrocompatibile per server.js e test esistenti
    const failedGates = hardFails.map(hf => ({
      gate: hf.type,
      type: hf.type,
      reason: hf.message,
      message: hf.message
    }));

    return {
      timestamp: new Date().toISOString(),
      hardFails,
      warnings,
      softScore,
      scores,
      passed,
      auditLog,
      // Retrocompatibilità
      overallScore: softScore,
      gatePassed: passed,
      failedGates,
      currentGate: hasHardFails ? hardFails[0].type : 'PASSED'
    };
  }
}

module.exports = { QualityEngine, getMathJaxValidator, detectMissingMathRule };
