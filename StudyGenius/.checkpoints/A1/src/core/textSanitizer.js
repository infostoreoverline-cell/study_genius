/**
 * StudyGenius Academic Intelligence System
 * src/core/textSanitizer.js
 * 
 * Sanitizzazione deterministica post-processing:
 * 1. Rimozione preamboli conversazionali dei modelli linguistici (es. "Certamente. Ecco la sintesi...")
 * 2. Intercettazione e riparazione automatica di formule/notazioni matematico-chimiche
 *    scritte erroneamente come code span (backtick `...`) convertendole in LaTeX ($...$).
 */

let mathjaxDocInstance = null;
let mathjaxAdaptorInstance = null;

function getLocalMathJax() {
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
    } catch (e) {
      // mathjax-full opzionale
    }
  }
  return { doc: mathjaxDocInstance, adaptor: mathjaxAdaptorInstance };
}

/**
 * Valida la sintassi di una formula candidata con MathJax
 */
function isValidLatex(candidate) {
  const { doc, adaptor } = getLocalMathJax();
  if (!doc || !adaptor) return true; // Se MathJax non è caricabile, assumiamo valido
  try {
    const node = doc.convert(candidate, { display: false });
    const html = adaptor.outerHTML(node);
    if (html.includes('data-mjx-error') || html.includes('merror')) return false;
    const svgMatch = html.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
    const innerSvg = svgMatch ? svgMatch[1] : '';
    return /<(path|text|rect|line|use)/.test(innerSvg);
  } catch (e) {
    return false;
  }
}

/**
 * Rileva e rimuove frasi di apertura conversazionali/meta prima del primo heading (#)
 */
function cleanConversationalPreamble(markdown) {
  if (!markdown || typeof markdown !== 'string') return markdown;

  let cleaned = markdown.trim();

  // 1. Rimuovi preambolo iniziale prima del primo heading Markdown (#)
  // Es: "Certamente. Ecco la sintesi...", "Certo! Di seguito la trattazione...", "Ecco a te...", ecc.
  const initialPreambleRegex = /^(?:Certamente|Certo|Ecco|Ecco a te|Va bene|Di seguito|Sicuramente|In qualità di|Come richiesto|Perfetto|D'accordo)[^\n#]*(?:\n[^\n#]*)*?(?:\n\s*---\s*)?\n+(?=#)/iu;
  cleaned = cleaned.replace(initialPreambleRegex, '').trim();

  // 2. Rimuovi preamboli residui inter-shard dopo separatori '---'
  const interShardPreambleRegex = /(\n\s*---\s*\n+)(?:Certamente|Certo|Ecco|Ecco a te|Va bene|Di seguito|Sicuramente|In qualità di|Come richiesto|Perfetto|D'accordo)[^\n#]*(?:\n[^\n#]*)*?(?:\n\s*---\s*)?\n+(?=#)/giu;
  cleaned = cleaned.replace(interShardPreambleRegex, '$1');

  // 3. Se dopo il taglio c'è un separatore --- orfano all'inizio prima di #, rimuovilo
  cleaned = cleaned.replace(/^---\s*\n+/m, '').trim();

  return cleaned;
}

/**
 * Individua code span sospetti che contengono formule o notazione
 */
function detectMathInCodeSpans(markdown) {
  if (!markdown || typeof markdown !== 'string') return [];
  // Escludi blocchi triplo backtick
  const stripped = markdown.replace(/```[\s\S]*?```/g, '');
  const codeSpans = stripped.match(/`[^`\n]+`/g) || [];
  const mathPatterns = /[_^']|log|ln|pH|pOH|pKa|pKb|pKps|Ka|Kb|Kw|Kps|Keq|Δ|Σ|∫|∂|√|±|×|÷|≠|≤|≥|≈|∝|∞|°|[λμαβγδεθφψω]|[A-Za-z0-9][⁺⁻\+\-]|[⁺⁻]|\[[A-Za-z0-9\+\-]+\]|=.*10\^?-?\d|[A-Za-z]\s*=\s*[^`]+|\b[A-Z][a-z]?[₀-₉0-9]+[A-Z]?[a-z]?|\b[A-Z][a-z]?[\^⁺⁻]/;
  return codeSpans.filter(span => mathPatterns.test(span.slice(1, -1)));
}

/**
 * Converte automaticamente code span contenenti notazione/formule in sintassi LaTeX ($...$)
 */
function repairMathInCodeSpans(markdown, subject = 'Generale') {
  if (!markdown || typeof markdown !== 'string') return markdown;

  const isComputerScience = ['informatica', 'computer science', 'programmazione', 'software'].some(
    s => (subject || '').toLowerCase().includes(s)
  );

  const mathPatterns = /[_^']|log|ln|pH|pOH|pKa|pKb|pKps|Ka|Kb|Kw|Kps|Keq|Δ|Σ|∫|∂|√|±|×|÷|≠|≤|≥|≈|∝|∞|°|[λμαβγδεθφψω]|[A-Za-z0-9][⁺⁻\+\-]|[⁺⁻]|\[[A-Za-z0-9\+\-]+\]|=.*10\^?-?\d|[A-Za-z]\s*=\s*[^`]+|\b[A-Z][a-z]?[₀-₉0-9]+[A-Z]?[a-z]?|\b[A-Z][a-z]?[\^⁺⁻]/;

  // Pattern per identificare definizioni di singoli simboli (es. `E`: Potenziale di cella)
  const symbolDefinitionPattern = /^[A-Za-z\u0370-\u03FF]$/;

  // Isola blocchi di codice a triplo backtick per non toccarli MAI
  const codeBlocks = [];
  let masked = markdown.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `@@@SG_CODEBLOCK_${codeBlocks.length}@@@`;
    codeBlocks.push(match);
    return placeholder;
  });

  // Sostituisci i code span inline `...`
  // Gestiamo anche il contesto successivo se è una definizione (: o = o – o —)
  masked = masked.replace(/`([^`\n]+)`(\s*[:=–—])?/g, (match, content, trailingSep) => {
    const trimmed = content.trim();
    if (!trimmed) return match;

    // Se materia scientifica non-informatica e il simbolo è una singola lettera/carattere seguita da separatore
    const isSymbolDef = !isComputerScience && trailingSep && symbolDefinitionPattern.test(trimmed);

    // Se corrisponde al pattern matematico (e per CS non è un semplice identificatore snake_case)
    let isMath = mathPatterns.test(trimmed);
    if (isComputerScience && isMath) {
      if (/^[a-zA-Z0-9_]+$/.test(trimmed) && !trimmed.includes('^')) {
        isMath = false;
      }
    }

    if (isMath || isSymbolDef) {
      let candidate = trimmed;
      // Normalizzazione sicura del simbolo percentuale se presente non escapato dentro la formula
      candidate = candidate.replace(/(?<!\\)%/g, '\\%');

      if (isValidLatex(candidate)) {
        return `$${candidate}$` + (trailingSep || '');
      }
    }

    return match;
  });

  // Ripristina i blocchi di codice triplo backtick intatti
  codeBlocks.forEach((block, idx) => {
    masked = masked.replace(`@@@SG_CODEBLOCK_${idx}@@@`, block);
  });

  return masked;
}

/**
 * Deduplicazione Semantica Post-Generazione (Canonical Collapser)
 * Rileva sezioni teoriche duplicate all'interno dello stesso documento o tra moduli,
 * e converte le occorrenze successive alla prima in blocchi di Canonical Review
 * preservando eventuali esercizi o applicazioni pratiche specifiche.
 */
function collapseDuplicateCanonicalSections(markdownText, subject = 'Chimica') {
  if (!markdownText || typeof markdownText !== 'string') return markdownText;

  // Suddivide il testo in sezioni basate su titoli # o ##
  const parts = markdownText.split(/(?=\n#{1,2}\s+)/g);
  if (parts.length <= 1) return markdownText;

  const seenHeadings = new Map();
  const collapsed = [];

  for (let i = 0; i < parts.length; i++) {
    const sec = parts[i];
    const match = sec.match(/^\s*(#{1,2})\s+([^\n]+)/m);

    if (!match) {
      collapsed.push(sec);
      continue;
    }

    const level = match[1];
    const rawTitle = match[2].trim();
    // Normalizza il titolo rimuovendo prefissi numerici ed emoji
    const normTitle = rawTitle
      .toLowerCase()
      .replace(/^[0-9\.\s\-:]+/, '')
      .replace(/[📚🎯🔬📌💡📐⚠️🧠🔍📋🎓✨⚡🧩]/g, '')
      .trim();

    // Filtra titoli generici che possono legittimamente ripetersi
    const isGeneric = /^(?:capitolo|modulo|parte|eserciz|domande|formulario|controlli|verifica|note|appendice)\b/i.test(normTitle);

    if (!isGeneric && normTitle.length > 8) {
      if (seenHeadings.has(normTitle)) {
        const firstOccurrenceRef = seenHeadings.get(normTitle);
        // Isola eventuali esercizi o applicazioni specifiche presenti nella sezione duplicata
        const exercisesPart = sec.match(/(?:###?\s*(?:Esercizio|Problema|Applicazione|Caso di Studio)[\s\S]+)/i);
        const retainedExercise = exercisesPart ? `\n\n${exercisesPart[0].trim()}` : '';

        const collapsedBody = `\n\n${level} ${rawTitle}\n\n> 📌 **Richiamo Didattico (Canonical Review):** I fondamenti teorici, le definizioni formali e le derivazioni analitiche di *${rawTitle}* sono già stati formalizzati in modo esaustivo nella sezione precedente (${firstOccurrenceRef}). Per consultare le equazioni di partenza e la dimostrazione completa, si rimanda a tale trattazione. Di seguito si procede direttamente con l'applicazione specifica e i calcoli d'esame.${retainedExercise}\n\n`;

        collapsed.push(collapsedBody);
        continue;
      } else {
        seenHeadings.set(normTitle, rawTitle);
      }
    }

    collapsed.push(sec);
  }

  return collapsed.join('');
}

module.exports = {
  cleanConversationalPreamble,
  detectMathInCodeSpans,
  repairMathInCodeSpans,
  collapseDuplicateCanonicalSections,
  isValidLatex
};

