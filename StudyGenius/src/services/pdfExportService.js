const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { marked } = require('marked');

// Precarica tutte le entità MathJax per evitare chiamate ad asyncLoad dinamico
require('mathjax-full/js/util/entities/all.js');

// MathJax per Server-side SVG rendering (qualità tipografica LaTeX pura)
const { mathjax } = require('mathjax-full/js/mathjax.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { SVG } = require('mathjax-full/js/output/svg.js');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');

const { processDiagramsInMarkdown } = require('../rendering/diagramEngine');
const { getGraphHeadAssets } = require('../visualization/graphRenderer');
const { auditDomOverflow, auditPrePrintQuality, auditPostPrintPdf } = require('../rendering/pdfQA');
const { visualObserver } = require('../core/visualObserver');

// ─── Compilation Barrier ─────────────────────────────────────────────────────
// Specifica: 1.md §62 (No silent loss), 2.md §106-108 (Hard stops),
//            markdown.md §14 (Compilation Barrier).
//
// Questa funzione blocca il PDF se il content contiene:
// 1. json:visual-spec non compilati (blocco `json:visual-spec` o `visual-spec`)
// 2. Mappe concettuali ASCII (├── o └── in sezioni mappa)
// 3. Riferimenti [[visual:...]] non risolti
//
// Restituisce { pass: boolean, violations: string[] }
function runCompilationBarrier(content) {
  const violations = [];

  if (!content || typeof content !== 'string') {
    return { pass: true, violations };
  }

  // 1. Raw VisualSpec non compilati (2.md §106)
  const rawSpecPattern = /```\s*json:visual-spec[\s\S]*?```|```\s*visual-spec[\s\S]*?```/gi;
  const rawSpecMatches = content.match(rawSpecPattern);
  if (rawSpecMatches && rawSpecMatches.length > 0) {
    violations.push(
      `RAW_VISUAL_SPEC_IN_CONTENT: ${rawSpecMatches.length} blocco/i json:visual-spec non compilato/i trovato/i nel documento. ` +
      `(2.md §106: "se compare nel document AST json:visual-spec non compilato → NO PDF")`
    );
  }

  // 2. ASCII Concept Maps (2.md §107)
  // Cerca ├── e └── in prossimità di intestazioni "mappa" o "concett" o "struttura"
  const asciiTreePattern = /[├└]─/g;
  const asciiMatches = content.match(asciiTreePattern);
  if (asciiMatches && asciiMatches.length > 3) {
    // Soglia 3 per evitare falsi positivi su singoli caratteri Unicode sparsi
    violations.push(
      `ASCII_CONCEPT_MAP_DETECTED: ${asciiMatches.length} occorrenze di caratteri ASCII tree (├── / └──). ` +
      `(2.md §107: "se un blocco con semantic role CONCEPT_MAP contiene ASCII tree → NO PDF"). ` +
      `Usa il conceptMapRenderer deterministico per le mappe concettuali.`
    );
  }

  // 3. Riferimenti [[visual:...]] non risolti (1.md §62)
  const unresolvedRefPattern = /\[\[visual:[^\]]+\]\]/g;
  const unresolvedMatches = content.match(unresolvedRefPattern);
  if (unresolvedMatches && unresolvedMatches.length > 0) {
    violations.push(
      `UNRESOLVED_VISUAL_REFERENCES: ${unresolvedMatches.length} riferimento/i [[visual:...]] non risolto/i: ` +
      unresolvedMatches.slice(0, 5).join(', ') +
      `. (1.md §62: DETECTED + ACCEPTED + NO OUTCOME = BUG)`
    );
  }

  const pass = violations.length === 0;
  return { pass, violations };
}

let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.warn('Puppeteer non disponibile come modulo nativo:', e.message);
}

const mathjaxAdaptor = liteAdaptor();
RegisterHTMLHandler(mathjaxAdaptor);
const mathjaxTex = new TeX({
  packages: AllPackages,
  inlineMath: [['$', '$'], ['\\(', '\\)']],
  displayMath: [['$$', '$$'], ['\\[', '\\]']],
  processEscapes: true
});
const mathjaxSvg = new SVG({ fontCache: 'local' });

function escapeHtmlServer(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Trasforma i blockquote Markdown che contengono prefissi o icone didattiche
 * nei corrispondenti callout accademici arricchiti
 */
function transformAcademicCallouts(html) {
  if (!html) return '';
  return html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (match, inner) => {
    let type = 'general';
    if (/📌|Definizione/i.test(inner)) type = 'definition';
    else if (/💡|Intuizione/i.test(inner)) type = 'intuition';
    else if (/📐|Teorema|Dimostrazione/i.test(inner)) type = 'theorem';
    else if (/⚠️|Attenzione|Errore Tipico|Trabocchetto/i.test(inner)) type = 'warning';
    else if (/🧠|Schema Mentale|Strategia/i.test(inner)) type = 'mental';
    else if (/🔍|Controllo di Coerenza|Verifica/i.test(inner)) type = 'coherence';
    else if (/📋|📊|Formula Contabile|Identità Contabile/i.test(inner)) type = 'accounting';
    else if (/📋|Formulario Ragionato/i.test(inner)) type = 'formulary';
    else if (/🎓|Domande d'Esame|All'Orale|Prova Scritta/i.test(inner)) type = 'exam';

    return `<div class="academic-callout callout-${type}">${inner}</div>`;
  });
}

/**
 * Rileva se una formula LaTeX rappresenta un'identità contabile o indice aziendale
 * che contiene parole e testo in lingua naturale, per evitare la compilazione fallace in MathJax SVG
 */
function isAccountingFormula(latex) {
  if (!latex) return false;
  const kwRegex = /(?:^|[^\p{L}\p{N}_])(Attivit[àa]|Passivit[àa]|Capitale|Netto|Immobilizz|Ricav|Cost[io]|Rimanenz|Scort|Crediti|Debiti|Debito|Cassa|Fatturato|Utile|Esercizio|Vendit|Acquist|Copertura|Liquidit[àa]|Reddit|Operativ|Oneri|Finanziari|Patrimonio|Turnover|Leverage|Gearing|EBITDA|EBIT|PFN|CCC|CINO|CIN|ROI|ROA|ROS|TMI|TMP|TMGS|ROCE|WACC|MOL|Equity|Intensit[àa])(?:[^\p{L}\p{N}_]|$)/iu;
  const hasKw = kwRegex.test(latex);
  const hasTextTag = /\\text\{[^}]*(?:Attiv|Passiv|Capitale|Netto|Crediti|Debiti|Debito|Cassa|Ricav|Cost|Fatturato|Utile|Scort|Rimanenz|Copertura|Liquidit|Operativ|Oneri|Finanziar|Equity|Turnover|Leverage|Gearing|Reddit|Intensit|giorni)/iu.test(latex);
  const hasAccountingBoxed = /\\boxed\{[^}]*(?:CCC|CINO|CIN|PFN|TMI|TMP|TMGS|ROI|ROA|ROS|EBIT|Fatturato|Leverage|Gearing|Liquidit|Copertura|Intensit)/iu.test(latex);
  return hasKw && (hasTextTag || hasAccountingBoxed);
}

function stripBoxed(str) {
  let isBoxed = false;
  let idx = str.indexOf('\\boxed{');
  while (idx !== -1) {
    isBoxed = true;
    let depth = 1;
    let endIdx = -1;
    for (let i = idx + 7; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    if (endIdx !== -1) {
      const inner = str.slice(idx + 7, endIdx);
      str = str.slice(0, idx) + inner + str.slice(endIdx + 1);
      idx = str.indexOf('\\boxed{');
    } else {
      break;
    }
  }
  return { str, isBoxed };
}

function processAccountingFracs(str) {
  let idx = str.indexOf('\\frac{');
  while (idx !== -1) {
    let depth = 1;
    let midIdx = -1;
    for (let i = idx + 6; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') {
        depth--;
        if (depth === 0) {
          midIdx = i;
          break;
        }
      }
    }
    if (midIdx === -1 || str[midIdx + 1] !== '{') break;

    depth = 1;
    let endIdx = -1;
    for (let i = midIdx + 2; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    if (endIdx === -1) break;

    const num = processAccountingFracs(str.slice(idx + 6, midIdx));
    const den = processAccountingFracs(str.slice(midIdx + 2, endIdx));
    const replacement = `<span class="formula-fraction"><span class="frac-num">${num.trim()}</span><span class="frac-den">${den.trim()}</span></span>`;
    str = str.slice(0, idx) + replacement + str.slice(endIdx + 1);
    idx = str.indexOf('\\frac{');
  }
  return str;
}

function parseAccountingFormulaToHtml(rawLatex) {
  let formula = rawLatex
    .replace(/^\$\$([\s\S]*)\$\$$/, '$1')
    .replace(/^\\\[([\s\S]*)\\\]$/, '$1')
    .trim();

  const { str: unboxedStr, isBoxed } = stripBoxed(formula);
  formula = unboxedStr;

  // Pre-clean macros
  formula = formula
    .replace(/\\quad/g, ' &nbsp; ')
    .replace(/\\qquad/g, ' &nbsp;&nbsp; ')
    .replace(/\\times/g, ' × ')
    .replace(/\\cdot/g, ' · ')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']');

  // Formatta operatori prima dell'inserimento dei tag
  formula = formula
    .replace(/(?<=\s)-(?=\s)/g, '−')
    .replace(/\s*=\s*/g, ' = ')
    .replace(/\s*\+\s*/g, ' + ');

  // Elabora frazioni ricorsive
  formula = processAccountingFracs(formula);

  // Sostituisce \text{...} con <strong>...</strong>
  formula = formula.replace(/\\text\{([^}]+)\}/g, (m, inner) => {
    return `<strong>${inner.trim()}</strong>`;
  });

  // Pulisce eventuali graffe residue
  formula = formula.replace(/[{}]/g, '').trim();

  return `<div class="formula-contabile${isBoxed ? ' formula-boxed' : ''}">${formula}</div>`;
}

function transformAccountingFormulas(text) {
  if (!text) return '';
  return text.replace(/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\])/g, (match) => {
    if (isAccountingFormula(match)) {
      return `\n\n${parseAccountingFormulaToHtml(match)}\n\n`;
    }
    return match;
  });
}

/**
 * Normalizza la spaziatura del markdown per garantire che heading, tabelle,
 * formule display e blocchi strutturali siano preceduti da una riga vuota.
 * Senza questa normalizzazione, `marked` tratta tutto come un unico paragrafo
 * e il contenuto successivo viene renderizzato come testo grezzo.
 */
function ensureMarkdownSpacing(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const prevLine = i > 0 ? result[result.length - 1] : '';
    const prevTrimmed = (prevLine || '').trim();

    // Se la riga precedente è già vuota, non serve aggiungerne un'altra
    if (prevTrimmed === '') {
      result.push(line);
      continue;
    }

    // Se la riga precedente è un separatore ---, non serve riga vuota
    if (/^---+\s*$/.test(prevTrimmed)) {
      result.push(line);
      continue;
    }

    let needsBlankBefore = false;

    // 1. Heading: deve avere riga vuota prima
    if (/^#{1,6}\s+/.test(trimmed)) {
      needsBlankBefore = true;
    }

    // 2. Tabella: prima riga della tabella (inizia con |) deve avere riga vuota prima,
    //    ma non se la riga precedente è anch'essa una riga di tabella o un heading
    if (/^\|/.test(trimmed) && !/^\|/.test(prevTrimmed) && !/^#{1,6}\s+/.test(prevTrimmed)) {
      needsBlankBefore = true;
    }

    // 3. Formula display su riga singola ($..$ non $$) che occupa l'intera riga,
    //    oppure placeholder MATHBLOCK che occupa l'intera riga
    const isMathPlaceholder = /^MATHBLOCK(DISP|INL)\d+END$/.test(trimmed);
    if (/^\$[^$]/.test(trimmed) && /[^$]\$$/.test(trimmed) && !trimmed.includes('$$')) {
      needsBlankBefore = true;
    }
    if (/^\$\$/.test(trimmed)) {
      needsBlankBefore = true;
    }
    if (isMathPlaceholder) {
      needsBlankBefore = true;
    }

    // 4. Blockquote (>) che segue direttamente testo non-blockquote
    if (/^>/.test(trimmed) && !/^>/.test(prevTrimmed) && prevTrimmed !== '') {
      needsBlankBefore = true;
    }

    if (needsBlankBefore) {
      result.push('');
    }
    result.push(line);

    // Aggiunge riga vuota DOPO formula display su riga singola o placeholder MATHBLOCK
    // (solo se la prossima riga non è vuota e non è un'altra formula/placeholder)
    if (i < lines.length - 1) {
      const nextTrimmed = lines[i + 1].trim();
      const isDisplayFormula = (/^\$[^$]/.test(trimmed) && /[^$]\$$/.test(trimmed) && !trimmed.includes('$$'))
                             || (/^\$\$/.test(trimmed) && /\$\$$/.test(trimmed))
                             || isMathPlaceholder;
      if (isDisplayFormula && nextTrimmed !== '' && !/^\$/.test(nextTrimmed) && !/^MATHBLOCK/.test(nextTrimmed) && nextTrimmed !== '---') {
        result.push('');
      }
    }
  }

  return result.join('\n');
}

function repairMarkdownMath(text) {
  if (!text) return '';

  let cleaned = text.replace(/\\\$([^\$\n]+?)\\\$/g, '$$$1$$');

  const lines = cleaned.split('\n');
  let inDouble = false;
  const fixedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeading = /^#{1,6}\s+/.test(line.trim());

    if (inDouble && isHeading) {
      fixedLines.push('$$');
      inDouble = false;
    }

    const count = (line.match(/\$\$/g) || []).length;
    if (count % 2 !== 0) {
      inDouble = !inDouble;
    }
    fixedLines.push(line);
  }

  if (inDouble) {
    fixedLines.push('$$');
  }

  return fixedLines.join('\n');
}

function renderMarkdownOrHtmlWithMath(content, isMarkdown = true, knowledgeGraph = null) {
  let html = '';
  const diagramPlaceholders = new Map();
  let diagCounter = 0;

  if (isMarkdown) {
    // Isola i blocchi diagramma/grafico/figura per evitare che i tag SVG/XML mandino in crash il liteAdaptor di MathJax
    let text = (content || '').replace(/```(?:json:visual-spec|visual-spec|json:scientific-figure|scientific-figure|json:plot|plot|json:graph|graph|json:figure|figure|svg|xml:svg|tikz|chemfig|circuitikz)[\s\S]*?```|\{\{GRAPH:[a-zA-Z0-9_\-]+\}\}/g, (block) => {
      const rendered = processDiagramsInMarkdown(block, knowledgeGraph);
      const ph = `<!-- SG_RENDERED_DIAGRAM_PH_${diagCounter++} -->`;
      diagramPlaceholders.set(ph, rendered);
      return `\n\n${ph}\n\n`;
    });

    // Isola anche eventuali blocchi academic-diagram già renderizzati
    let isolatedDiagText = '';
    let diagCursor = 0;
    const diagMarker = '<div class="academic-diagram';
    while (diagCursor < text.length) {
      const startIdx = text.toLowerCase().indexOf(diagMarker, diagCursor);
      if (startIdx === -1) {
        isolatedDiagText += text.slice(diagCursor);
        break;
      }
      isolatedDiagText += text.slice(diagCursor, startIdx);
      let depth = 0;
      let endIdx = -1;
      let i = startIdx;
      while (i < text.length) {
        if (text.startsWith('<div', i) && /[\s>]/.test(text[i + 4] || '')) {
          depth++;
          i += 4;
        } else if (text.startsWith('</div>', i)) {
          depth--;
          i += 6;
          if (depth === 0) {
            endIdx = i;
            break;
          }
        } else {
          i++;
        }
      }
      if (endIdx !== -1) {
        const block = text.slice(startIdx, endIdx);
        const ph = `<!-- SG_RENDERED_DIAGRAM_PH_${diagCounter++} -->`;
        diagramPlaceholders.set(ph, block);
        isolatedDiagText += `\n\n${ph}\n\n`;
        diagCursor = endIdx;
      } else {
        isolatedDiagText += text.slice(startIdx, startIdx + diagMarker.length);
        diagCursor = startIdx + diagMarker.length;
      }
    }
    text = isolatedDiagText;

    // Isola eventuali tag <svg>...</svg> liberi
    text = text.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
      const ph = `<!-- SG_RENDERED_DIAGRAM_PH_${diagCounter++} -->`;
      diagramPlaceholders.set(ph, `<div class="academic-diagram academic-svg-asset" style="page-break-inside: avoid; break-inside: avoid; margin: 20px auto; max-width: 650px; text-align: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px;">${match}</div>`);
      return `\n\n${ph}\n\n`;
    });

    text = repairMarkdownMath(text);
    text = transformAccountingFormulas(text);
    const mathTokens = [];
    text = text.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g, (match) => {
      const placeholder = `MATHBLOCKDISP${mathTokens.length}END`;
      mathTokens.push(match);
      return placeholder;
    });
    text = text.replace(/(\$(?!\s)[^\$\n]+?(?<!\s)\$|\\\([\s\S]*?\\\))/g, (match) => {
      const placeholder = `MATHBLOCKINL${mathTokens.length}END`;
      mathTokens.push(match);
      return placeholder;
    });
    text = ensureMarkdownSpacing(text);
    html = marked.parse(text);
    html = html.replace(/MATHBLOCK(DISP|INL)(\d+)END/g, (match, type, idx) => {
      return mathTokens[parseInt(idx, 10)] || match;
    });
    html = transformAcademicCallouts(html);
  } else {
    html = transformAcademicCallouts(content || '');
  }

  const doc = mathjax.document(html, {
    InputJax: mathjaxTex,
    OutputJax: mathjaxSvg
  });
  doc.render();

  const css = mathjaxAdaptor.textContent(mathjaxSvg.styleSheet(doc));
  let renderedBody = mathjaxAdaptor.innerHTML(mathjaxAdaptor.body(doc.document));

  // Re-inserisce i diagrammi SVG renderizzati al termine della compilazione MathJax,
  // compilando preventivamente qualsiasi formula TeX contenuta nei diagrammi o nei pannelli risultati
  if (diagramPlaceholders.size > 0) {
    for (const [ph, renderedDiag] of diagramPlaceholders.entries()) {
      const compiledDiag = renderMathInFragment(renderedDiag);
      renderedBody = renderedBody.replace(ph, compiledDiag);
    }
  }

  return { html: renderedBody, css };
}

/**
 * Compila eventuali formule TeX racchiuse tra $ o $$ all'interno di frammenti HTML/SVG
 * preservando l'integrità del DOM e sfruttando MathJax 4 con font STIX Two Math.
 * 
 * @param {string} fragment Frammento HTML o SVG
 * @returns {string} Frammento con formule compilate
 */
function renderMathInFragment(fragment) {
  if (!fragment || (!fragment.includes('$') && !fragment.includes('\\(') && !fragment.includes('\\['))) {
    return fragment;
  }
  try {
    const doc = mathjax.document(fragment, {
      InputJax: mathjaxTex,
      OutputJax: mathjaxSvg
    });
    doc.render();
    return mathjaxAdaptor.innerHTML(mathjaxAdaptor.body(doc.document));
  } catch (e) {
    console.warn('⚠️ [pdfExportService] Errore compilazione MathJax in frammento diagramma:', e.message);
    return fragment;
  }
}

function generateAcademicHtmlDoc({ title, subject, renderedHtml, renderedCss }) {
  const docTitle = title || 'Dispensa Universitaria';
  const docSubject = subject || 'Studio Universitario';
  const formattedDate = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtmlServer(docTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=Source+Sans+3:ital,wght@0,400..700;1,400..700&family=Inter:wght@400;500;600;700&family=STIX+Two+Text:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  
  <style>
    ${renderedCss}

    @page {
      size: A4;
      margin: 20mm 18mm 20mm 18mm;
    }
    body {
      font-family: 'Source Serif 4', 'STIX Two Text', 'Times New Roman', 'Cambria', Georgia, serif;
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
      color: #111827;
      line-height: 1.65;
      font-size: 13px;
      text-rendering: optimizeLegibility;
      background: #ffffff;
    }

    /* FRONTESPIZIO UNIVERSITARIO ACCADEMICO */
    .frontespizio {
      min-height: 86vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      border: 2px solid #0f172a;
      padding: 45px 35px;
      margin-bottom: 25px;
      page-break-after: always;
      break-after: page;
      background: #fafafa;
    }
    .frontespizio-uni {
      font-size: 14px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-weight: 700;
      color: #334155;
      margin-bottom: 24px;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 8px;
      width: 100%;
    }
    .frontespizio-title {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.25;
      margin: 25px 0 15px 0;
    }
    .frontespizio-subtitle {
      font-size: 16px;
      color: #1e3a8a;
      font-style: italic;
      margin-bottom: 35px;
    }
    .frontespizio-meta-box {
      width: 100%;
      max-width: 520px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      padding: 18px 24px;
      border-radius: 4px;
      text-align: left;
      font-size: 12.5px;
      margin-top: 25px;
    }
    .frontespizio-meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 7px;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 5px;
    }
    .frontespizio-meta-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .frontespizio-meta-label {
      font-weight: 600;
      color: #475569;
    }
    .frontespizio-meta-val {
      color: #0f172a;
      font-weight: 500;
    }

    /* CORPO DELLA DISPENSA */
    .dispensa-content {
      margin-top: 10px;
    }
    h1, h2, h3, h4 {
      font-family: 'STIX Two Text', serif;
      page-break-after: avoid;
      break-after: avoid;
      color: #0f172a;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 6px;
      margin-top: 30px;
      margin-bottom: 14px;
    }
    h2 {
      font-size: 17px;
      color: #1e3a8a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 24px;
      margin-bottom: 10px;
    }
    h3 {
      font-size: 14.5px;
      color: #1e293b;
      margin-top: 18px;
      margin-bottom: 6px;
    }
    h4 {
      font-size: 13px;
      font-style: italic;
      margin-top: 12px;
      margin-bottom: 4px;
    }
    p {
      margin: 8px 0;
      text-align: justify;
      text-justify: inter-word;
    }
    ul, ol {
      margin: 8px 0;
      padding-left: 24px;
    }
    li { margin: 4px 0; }
    blockquote {
      border-left: 4px solid #2563eb;
      padding: 10px 18px;
      background: #f8fafc;
      margin: 14px 0;
      border-radius: 0 4px 4px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    /* CALLOUT SEMANTICI ACCADEMICI (DESIGN SYSTEM UNIFICATO) */
    .academic-callout {
      padding: 12px 18px;
      margin: 16px 0;
      border-radius: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
      font-size: 12.5px;
      line-height: 1.6;
    }
    .academic-callout p { margin: 4px 0; }
    .callout-definition { border-left: 4px solid #2563eb; background: #eff6ff; color: #1e3a8a; }
    .callout-intuition { border-left: 4px solid #d97706; background: #fffbeb; color: #78350f; }
    .callout-theorem { border-left: 4px solid #4f46e5; background: #eef2ff; color: #312e81; }
    .callout-warning { border-left: 4px solid #dc2626; background: #fef2f2; color: #991b1b; }
    .callout-mental { border-left: 4px solid #059669; background: #ecfdf5; color: #064e3b; }
    .callout-coherence { border-left: 4px solid #0d9488; background: #f0fdfa; color: #134e4a; }
    .callout-accounting { border-left: 4px solid #0f172a; background: #f8fafc; color: #0f172a; }
    .callout-formulary { border-left: 4px solid #334155; background: #f8fafc; color: #0f172a; }
    .callout-exam { border-left: 4px solid #7c3aed; background: #f5f3ff; color: #4c1d95; }
    .callout-general { border-left: 4px solid #2563eb; background: #f8fafc; color: #1e293b; }

    /* FORMULA CONTABILE SEMANTICA ACCADEMICA */
    .formula-contabile {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 6px 10px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #0f172a;
      border-radius: 4px;
      padding: 12px 18px;
      margin: 16px 0;
      font-family: 'STIX Two Text', 'Times New Roman', Georgia, serif;
      font-size: 14px;
      line-height: 1.5;
      color: #0f172a;
      page-break-inside: avoid;
      break-inside: avoid;
      text-align: center;
    }
    .formula-contabile.formula-boxed {
      border: 1.5px solid #1e293b;
      border-left: 4px solid #1e3a8a;
      background: #f8fafc;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .formula-contabile strong {
      font-weight: 700;
      color: #0f172a;
    }
    .formula-fraction {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      vertical-align: middle;
      padding: 0 4px;
      margin: 0 2px;
    }
    .frac-num {
      display: block;
      text-align: center;
      border-bottom: 1.5px solid #0f172a;
      padding: 0 4px 2px 4px;
      width: 100%;
    }
    .frac-den {
      display: block;
      text-align: center;
      padding: 2px 4px 0 4px;
      width: 100%;
    }

    mjx-container[jax="SVG"][display="true"] {
      display: block;
      text-align: center;
      margin: 1.2em 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    mjx-container[jax="SVG"]:not([display="true"]) {
      display: inline-block;
      vertical-align: middle;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
      font-size: 12px;
      line-height: 1.5;
      page-break-inside: avoid;
      break-inside: avoid;
      border: 1px solid #94a3b8;
    }
    thead {
      display: table-header-group;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      border-bottom: 2px solid #64748b;
      letter-spacing: 0.02em;
    }
    tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }
    code {
      font-family: 'JetBrains Mono', monospace;
      background: #f1f5f9;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 11px;
    }
    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 12px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 22px 0;
    }
    /* PROTEZIONE INDIVISIBILITA FIGURE E GRAFICI (SEZIONE 9.21 - 9.36) */
    .academic-diagram,
    .academic-technical-figure,
    .academic-scientific-figure,
    .academic-function-plot,
    .academic-svg-asset,
    .academic-graph-wrapper {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin: 22px auto;
    }

    /* ARCHITETTURA DELLA FIGURA SCIENTIFICA A REGIONI INDIPENDENTI (SEZIONI 9.32 - 9.36) */
    .academic-scientific-figure {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin: 24px auto;
      max-width: 660px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 18px 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      box-sizing: border-box;
    }
    .figure-header {
      margin-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 8px;
      text-align: left;
    }
    .figure-title {
      font-family: 'Source Serif 4', 'STIX Two Text', Georgia, serif;
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.35;
      margin-bottom: 4px;
    }
    .figure-subtitle {
      font-family: 'Source Sans 3', 'Inter', system-ui, sans-serif;
      font-size: 10px;
      color: #475569;
      line-height: 1.4;
    }
    .figure-layout-grid {
      display: flex;
      gap: 14px;
      align-items: stretch;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .figure-plot-col {
      flex: 0 0 69%;
      max-width: 69%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .figure-result-panel {
      flex: 0 0 29%;
      max-width: 29%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      text-align: left;
      box-sizing: border-box;
    }
    .figure-result-panel .panel-heading {
      font-family: 'Source Sans 3', 'Inter', system-ui, sans-serif;
      font-size: 10.5px;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 6px;
      border-bottom: 1.5px solid #bfdbfe;
      padding-bottom: 3px;
    }
    .figure-result-panel .panel-equations {
      font-size: 10px;
      margin: 4px 0 6px 0;
      color: #0f172a;
    }
    .figure-result-panel .panel-equations mjx-container {
      text-align: left !important;
      margin: 3px 0 !important;
      display: block !important;
    }
    .figure-result-panel .panel-note {
      font-family: 'Source Sans 3', 'Inter', system-ui, sans-serif;
      font-size: 8.8px;
      color: #64748b;
      line-height: 1.35;
      margin-top: auto;
      border-top: 1px dashed #cbd5e1;
      padding-top: 5px;
    }
    .figure-diagnostics {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
    }
    .figure-takeaway {
      margin-top: 10px;
      background: #eff6ff;
      border-left: 3.5px solid #2563eb;
      border-radius: 0 4px 4px 0;
      padding: 8px 12px;
      font-family: 'Source Sans 3', 'Inter', system-ui, sans-serif;
      font-size: 10px;
      color: #1e3a8a;
      line-height: 1.45;
      text-align: left;
    }
    .figure-caption {
      margin-top: 10px;
      font-family: 'Source Sans 3', 'Inter', system-ui, sans-serif;
      font-size: 9px;
      color: #475569;
      line-height: 1.4;
      text-align: justify;
    }
  </style>
  ${getGraphHeadAssets()}
</head>
<body>
  <!-- FRONTESPIZIO -->
  <div class="frontespizio">
    <div class="frontespizio-uni">Università degli Studi · StudyGenius</div>
    <div class="frontespizio-title">${escapeHtmlServer(docTitle)}</div>
    <div class="frontespizio-subtitle">Dispensa universitaria ragionata e derivata</div>
    <div class="frontespizio-meta-box">
      <div class="frontespizio-meta-row">
        <span class="frontespizio-meta-label">Materia:</span>
        <span class="frontespizio-meta-val">${escapeHtmlServer(docSubject)}</span>
      </div>
      <div class="frontespizio-meta-row">
        <span class="frontespizio-meta-label">Metodo didattico:</span>
        <span class="frontespizio-meta-val">Teoria motivata + derivazioni matematiche + controlli</span>
      </div>
      <div class="frontespizio-meta-row">
        <span class="frontespizio-meta-label">Notazione:</span>
        <span class="frontespizio-meta-val">Standard SI, Formule LaTeX vettoriali ad alta precisione</span>
      </div>
      <div class="frontespizio-meta-row">
        <span class="frontespizio-meta-label">Data di generazione:</span>
        <span class="frontespizio-meta-val">${formattedDate}</span>
      </div>
    </div>
  </div>

  <!-- CONTENUTO DISPENSA -->
  <div class="dispensa-content">
    ${renderedHtml}
  </div>
</body>
</html>`;
}

/**
 * Genera PDF da Markdown o HTML utilizzando Puppeteer headless con fallback multi-piattaforma.
 */
async function generatePdf({ content, isMarkdown = true, title, subject, knowledgeGraph = null, options = {} }) {
  let tempHtmlPath = null;
  let tempPdfPath = null;
  let tempUserDataDir = null;
  let browser = null;

  try {
    let exportContent = content;
    const qaMode = (options && options.visualQaMode) || (process.env.VISUAL_QA_MODE);
    if (isMarkdown && qaMode && qaMode !== 'off') {
      try {
        const { refineAllDiagramsInMarkdown } = require('../rendering/visualFeedbackLoop');
        console.log(`🎨 [PDF_EXPORT] Esecuzione Visual QA Pipeline (Modo: ${qaMode})...`);
        const refined = await refineAllDiagramsInMarkdown(exportContent, { mode: qaMode, subject });
        exportContent = refined.updatedMarkdown;
      } catch (err) {
        console.warn(`  ⚠️ [VSVP_V2] Ottimizzazione visuale pre-stampa saltata: ${err.message}`);
      }
    }

    // ─ COMPILATION BARRIER (1.md §62, 2.md §106-108, markdown.md §14) ─────────
    // Hard stop: compila preventivamente diagrammi e visual-spec in SVG deterministici
    // e blocca il PDF solo se vi sono VisualSpec malformati non compilabili o mappe ASCII.
    const precompiledForBarrier = isMarkdown ? processDiagramsInMarkdown(exportContent, knowledgeGraph) : exportContent;
    const barrierResult = runCompilationBarrier(precompiledForBarrier);
    if (!barrierResult.pass) {
      const violationSummary = barrierResult.violations.map((v, i) => `  ${i + 1}. ${v}`).join('\n');
      visualObserver.warn('', `COMPILATION_BARRIER_FAIL: ${barrierResult.violations.length} violazione/i bloccano il PDF`);
      barrierResult.violations.forEach(v => visualObserver.warn('PDF_EXPORT', v.slice(0, 120)));
      console.error(`\n🚫 [COMPILATION BARRIER] PDF BLOCCATO — ${barrierResult.violations.length} violazione/i:\n${violationSummary}\n`);
      throw new Error(
        `[COMPILATION BARRIER] Il documento non può essere esportato in PDF:\n${violationSummary}\n` +
        `Correggi le violazioni sopra per procedere.`
      );
    }

    const rendered = renderMarkdownOrHtmlWithMath(exportContent, isMarkdown, knowledgeGraph);
    const fullHtml = generateAcademicHtmlDoc({
      title,
      subject,
      renderedHtml: rendered.html,
      renderedCss: rendered.css
    });

    // QA Pre-Stampa Deterministico (Sezione 9.18 del Metodo Master)
    const preAudit = auditPrePrintQuality(fullHtml);
    if (!preAudit.passed) {
      const errCodes = preAudit.errors.map(e => e.code).join(', ');
      const errDetails = preAudit.errors.map(e => `[${e.code}] ${e.message}`).join('\n');
      console.error(`❌ [pdfExportService] Hard fail visuale pre-stampa (${errCodes}):\n${errDetails}`);
      throw new Error(`Hard fail visuale pre-stampa (${errCodes}):\n${errDetails}`);
    }

    const safeTitle = (title || subject || 'Dispensa_Universitaria')
      .replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_')
      .substring(0, 50);
    const filename = `${safeTitle}.pdf`;

    let pdfBuffer = null;

    // --- STRATEGIA 1: PUPPETEER HEADLESS ---
    if (puppeteer) {
      try {
        console.log('🚀 [pdfExportService] Generazione PDF con Puppeteer headless...');
        const launchArgs = [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ];

        const launchOptions = {
          headless: true,
          args: launchArgs
        };

        if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
          launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        const hasGraphs = fullHtml.includes('academic-graph-container') || fullHtml.includes('renderStudyGeniusGraph');
        if (hasGraphs) {
          await page.setJavaScriptEnabled(true);
        } else {
          await page.setJavaScriptEnabled(false);
        }

        await page.setContent(fullHtml, {
          waitUntil: ['domcontentloaded', 'networkidle0'],
          timeout: 45000
        }).catch(err => {
          console.warn('Avviso caricamento font esterni Puppeteer (proseguo comunque):', err.message);
        });

        if (hasGraphs) {
          try {
            await page.waitForSelector('.academic-graph-rendered', { timeout: 10000 });
          } catch (e) {
            console.warn('Avviso attesa rendering grafici D3 (proseguo comunque):', e.message);
          }
        }

        const layoutAudit = await auditDomOverflow(page);
        if (!layoutAudit.passed) {
          console.warn(`⚠️ [PDF Layout QA Livello 1] Rilevati ${layoutAudit.overflowElements.length} elementi debordanti:`, layoutAudit.overflowElements);
        }

        try {
          await page.evaluateHandle('document.fonts.ready');
        } catch (e) {}

        pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            bottom: '20mm',
            left: '18mm',
            right: '18mm'
          },
          preferCSSPageSize: true
        });

        await browser.close();
        browser = null;
        console.log(`✅ [pdfExportService] PDF generato con successo via Puppeteer (${pdfBuffer.length} bytes)`);
      } catch (pupErr) {
        console.warn('⚠️ Errore con Puppeteer, avvio fallback con browser di sistema:', pupErr.message);
        if (browser) {
          try { await browser.close(); } catch (e) {}
          browser = null;
        }
      }
    }

    // --- STRATEGIA 2: FALLBACK CON BROWSER DI SISTEMA ---
    if (!pdfBuffer) {
      console.log('🔄 [pdfExportService] Ricerca browser di sistema installato per fallback...');
      const possibleBrowsers = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/snap/bin/chromium',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
      ];
      const browserPath = possibleBrowsers.find(p => p && fs.existsSync(p));

      if (!browserPath) {
        throw new Error('Nessun motore PDF trovato (Puppeteer o Chrome/Edge di sistema).');
      }

      const tempId = uuidv4();
      tempHtmlPath = path.join(os.tmpdir(), `dispensa_${tempId}.html`);
      tempPdfPath = path.join(os.tmpdir(), `dispensa_${tempId}.pdf`);
      tempUserDataDir = path.join(os.tmpdir(), `browser_pdf_${tempId}`);

      fs.writeFileSync(tempHtmlPath, fullHtml, 'utf-8');

      const cmd = `"${browserPath}" --headless=new --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu --user-data-dir="${tempUserDataDir}" --no-pdf-header-footer --print-to-pdf="${tempPdfPath}" "${tempHtmlPath}"`;

      await new Promise((resolve, reject) => {
        exec(cmd, { timeout: 120000 }, (error) => {
          if (error) return reject(error);
          resolve();
        });
      });

      if (!fs.existsSync(tempPdfPath)) {
        throw new Error('Il file PDF temporaneo non è stato generato dal browser di sistema.');
      }

      pdfBuffer = fs.readFileSync(tempPdfPath);
      console.log(`✅ [pdfExportService] PDF generato con successo via browser di sistema (${pdfBuffer.length} bytes)`);
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generazione PDF fallita: buffer vuoto restituito da tutti i motori.');
    }

    // QA Post-Stampa Deterministico su Testo Estratto (Sezione 9.19 del Metodo Master)
    const postAudit = await auditPostPrintPdf(pdfBuffer);
    if (!postAudit.passed) {
      const errCodes = postAudit.errors.map(e => e.code).join(', ');
      const errDetails = postAudit.errors.map(e => `[${e.code}] ${e.message}`).join('\n');
      console.error(`❌ [pdfExportService] Hard fail visuale post-stampa PDF (${errCodes}):\n${errDetails}`);
      throw new Error(`Hard fail visuale post-stampa PDF (${errCodes}):\n${errDetails}`);
    }
    console.log(`🎯 [pdfExportService] QA post-stampa superato: ${postAudit.pageCount} pagine, 0 anomalie visuali.`);

    return {
      buffer: Buffer.from(pdfBuffer),
      filename
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    if (tempHtmlPath) { try { fs.unlinkSync(tempHtmlPath); } catch (e) {} }
    if (tempPdfPath) { try { fs.unlinkSync(tempPdfPath); } catch (e) {} }
    if (tempUserDataDir) { try { fs.rmSync(tempUserDataDir, { recursive: true, force: true }); } catch (e) {} }
  }
}

module.exports = {
  escapeHtmlServer,
  transformAcademicCallouts,
  isAccountingFormula,
  stripBoxed,
  processAccountingFracs,
  parseAccountingFormulaToHtml,
  transformAccountingFormulas,
  repairMarkdownMath,
  renderMarkdownOrHtmlWithMath,
  renderMathInFragment,
  generateAcademicHtmlDoc,
  generatePdf,
  runCompilationBarrier,
};
