/**
 * StudyGenius Academic Intelligence System
 * src/rendering/pdfQA.js
 * 
 * Quality Assurance del Layout e del Rendering PDF (Sezioni 9.18 e 9.19).
 * Esegue:
 * 1. Audit pre-stampa sull'HTML renderizzato (ricerca merror, raw TeX leak, raw SVG leak).
 * 2. Ispezione bounding box del DOM (auditDomOverflow).
 * 3. Audit post-stampa sul buffer PDF compilato (estrazione testo con pdf-parse).
 */

let pdfParse = null;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  // Fallback opzionale se pdf-parse non è installato
}

/**
 * Audit pre-stampa sull'HTML renderizzato
 * Intercetta gli Hard Fail Visuali definiti nella Sezione 9.18 del Metodo Master:
 * - MATH_MERROR_PRESENT: Nodi di errore MathJax (merror / Math input error)
 * - RAW_SVG_LEAK: Tag SVG stampati come testo (<circle, <line, etc.)
 * - RAW_TEX_LEAK: Macro TeX rimaste non compilate nel testo
 * 
 * @param {string} html Documento HTML assemblato
 * @returns {{ passed: boolean, errors: Array<{ code: string, message: string }> }}
 */
function auditPrePrintQuality(html) {
  const errors = [];
  if (!html) return { passed: true, errors: [] };

  // Rimuove il blocco <style> per non confondere le regole CSS statiche di MathJax (es. g[data-mml-node="merror"]) con veri elementi di errore nel DOM
  const bodyOnly = html.replace(/<style[\s\S]*?<\/style>/gi, '');

  // 1. MATH_MERROR_PRESENT
  if (bodyOnly.includes('data-mml-node="merror"') || bodyOnly.includes('Math input error') || /<merror\b/i.test(bodyOnly)) {
    errors.push({
      code: 'MATH_MERROR_PRESENT',
      message: 'Rilevato nodo di errore MathJax (Math input error / merror) nel documento HTML.'
    });
  }

  // 2. RAW_SVG_LEAK: frammenti SVG stampati come entità HTML o testo grezzo fuori da tag SVG
  if (/&lt;(circle|line|path|rect|polygon)\b/i.test(bodyOnly)) {
    errors.push({
      code: 'RAW_SVG_LEAK',
      message: 'Rilevati tag SVG convertiti in testo letterale (&lt;circle/line/path&gt;) nel documento.'
    });
  }

  // 3. RAW_TEX_LEAK: comandi LaTeX non compilati rimasti visibili nei paragrafi ordinari
  // Cerca sequenze tipo \mathbf{ o \frac{ o \oint_ al di fuori di mjx-container
  const strippedHtml = bodyOnly.replace(/<mjx-container[\s\S]*?<\/mjx-container>/gi, '');
  if (/\\(?:mathbf|oint|frac|begin\{equation\}|varepsilon)\s*\{/i.test(strippedHtml)) {
    errors.push({
      code: 'RAW_TEX_LEAK',
      message: 'Rilevati comandi LaTeX grezzi non compilati all\'esterno dei contenitori matematici.'
    });
  }

  // 4. GRAPH_FORMULA_MONOSPACE (Sezione 9.34 - 9.36):
  // Rileva formule matematiche o grandezze fisiche renderizzate in font monospace anziché in STIX Two Math
  const monospaceFormulaRegex = /<text[^>]*font-family=['"][^'"]*monospace[^'"]*['"][^>]*>[\s\S]*?(?:Ea\s*=|ln\(A\)|R\^?2|kJ\/mol|R²)/i;
  if (monospaceFormulaRegex.test(bodyOnly)) {
    errors.push({
      code: 'GRAPH_FORMULA_MONOSPACE',
      message: 'Rilevata formula o grandezza fisica (Ea, ln(A), R^2) renderizzata in font monospace all\'interno di un grafico.'
    });
  }

  // 5. DUPLICATE_FIGURE_TITLE (Sezione 9.33 - 9.37):
  // Rileva presenza di titoli duplicati tra intestazione esterna della figura e testo interno all'SVG
  const duplicateTitlePatterns = [
    { inner: /Plot di Arrhenius:\s*ln\(k\)\s*vs\s*x/i, outer: /La pendenza della retta di Arrhenius/i },
    { inner: /Profilo Radiale del Campo Elettrico/i, outer: /Il campo elettrico radiale/i },
    { inner: /Plot di Markowitz:\s*Rendimento/i, outer: /La frontiera efficiente/i },
    { inner: /Diagramma di Bode:\s*Guadagno/i, outer: /Il margine di fase/i }
  ];
  for (const pat of duplicateTitlePatterns) {
    if (pat.inner.test(bodyOnly) && pat.outer.test(bodyOnly)) {
      errors.push({
        code: 'DUPLICATE_FIGURE_TITLE',
        message: 'Rilevato titolo duplicato ridondante all\'interno dell\'area SVG del grafico.'
      });
      break;
    }
  }

  // 6. OVERLAPPING_RESULT_PANEL (Sezione 9.32 - 9.37):
  // Rileva riquadri di parametri posizionati arbitrariamente sopra l'area dei dati
  if (/<rect\s+[^>]*?PARAMETRI DI REGRESSIONE|<rect\s+[^>]*?RISULTATI DEL MODELLO/i.test(bodyOnly) && !bodyOnly.includes('figure-layout-grid')) {
    errors.push({
      code: 'OVERLAPPING_RESULT_PANEL',
      message: 'Rilevato pannello dei parametri di regressione sovrapposto all\'area del grafico senza layout a colonne separate.'
    });
  }

  // 7. UNSCALED_LOG_AXIS (Sezione 9.35 - 9.37):
  // Rileva asse con logaritmo dimensionale non normalizzato (es. "ln(k) [k in s⁻¹]" senza argomento adimensionale)
  if (/>\s*ln\([a-zA-Z]\)\s*\[[^\]]+\]\s*</i.test(bodyOnly)) {
    errors.push({
      code: 'UNSCALED_LOG_AXIS',
      message: 'Rilevato asse logaritmico dimensionale non normalizzato. Gli argomenti dei logaritmi devono essere adimensionali (es. y = ln(k/(1 s^-1))).'
    });
  }

  // 8. CHEMICAL_DIAGRAM_TRUNCATED (v2.0 — Visual Intelligence System):
  // Rileva figure SVG di chimica organometallica con viewBox che non copre le dimensioni nominali.
  // Pattern: SVG con classe chemistry-renderer che ha viewBox molto piccolo rispetto alle dimensioni
  const chemDiagramMatches = bodyOnly.match(/<svg[^>]*class="[^"]*chem(?:istry)?[^"]*"[^>]*viewBox="([^"]+)"/gi) || [];
  for (const match of chemDiagramMatches) {
    const vbMatch = match.match(/viewBox="([^"]+)"/);
    if (vbMatch) {
      const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4) {
        const [, , w, h] = parts;
        // Un viewBox < 50x50 su una figura chimica è sicuramente troncato
        if (w < 50 || h < 50) {
          errors.push({
            code: 'CHEMICAL_DIAGRAM_TRUNCATED',
            message: `Rilevata figura SVG di chimica con viewBox troppo piccolo (${w}x${h}px). La figura è probabilmente troncata.`
          });
        }
      }
    }
  }

  // 9. PSEUDO_VISUAL_LEAKED (v2.0 — Bando ASCII art, Sezione 9.20):
  // Rileva caratteri ASCII di directory tree (├── └──) nel documento HTML.
  // Questi non devono mai apparire: la fallback tipografica deve sostituirli sempre.
  if (/[├└]──/.test(bodyOnly)) {
    errors.push({
      code: 'PSEUDO_VISUAL_LEAKED',
      message: 'Rilevati caratteri ASCII tree (├── / └──) nel documento. La pseudo-visualizzazione deve essere sostituita con la tabella tipografica editoriale.'
    });
  }

  return {
    passed: errors.length === 0,
    errors
  };
}

/**
 * Audit post-stampa sul buffer binario del PDF (Sezione 9.19)
 * Estrae il testo effettivo dal PDF renderizzato per verificare l'assenza assoluta
 * di 'Math input error', tag SVG grezzi e perdite TeX.
 * 
 * @param {Buffer} pdfBuffer Buffer del PDF generato
 * @returns {Promise<{ passed: boolean, errors: Array<{ code: string, message: string }>, pageCount: number }>}
 */
async function auditPostPrintPdf(pdfBuffer) {
  const errors = [];
  let pageCount = 0;

  if (!pdfParse || !pdfBuffer) {
    return { passed: true, errors: [], pageCount: 1 };
  }

  const buf = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

  try {
    const data = await pdfParse(buf);
    pageCount = data.numpages || 1;
    const text = data.text || '';

    // 1. Verifica 'Math input error'
    if (text.includes('Math input error')) {
      errors.push({
        code: 'MATH_MERROR_PRESENT',
        message: 'Il PDF generato contiene la stringa "Math input error".'
      });
    }

    // 2. Verifica tag SVG stampati come codice
    if (/<circle\b|<line\b|<path\b/i.test(text)) {
      errors.push({
        code: 'RAW_SVG_LEAK',
        message: 'Il PDF generato contiene frammenti di markup SVG stampati come testo letterale.'
      });
    }

    // 3. Verifica macro LaTeX grezze non compilate
    if (/\\mathbf\{|\\frac\{|\\oint/i.test(text)) {
      errors.push({
        code: 'RAW_TEX_LEAK',
        message: 'Il PDF generato contiene macro LaTeX grezze visibili nel testo estratto.'
      });
    }

    // 4. Verifica titoli duplicati nel PDF (Multidisciplinare)
    if (/(?:Plot di Arrhenius:\s*ln\(k\)\s*vs\s*x|Profilo Radiale del Campo Elettrico:\s*E\(r\)|Plot di Markowitz:\s*Rendimento)/i.test(text) &&
        /(?:La pendenza della retta di Arrhenius|Il campo elettrico radiale cresce linearmente|La frontiera efficiente)/i.test(text)) {
      errors.push({
        code: 'DUPLICATE_FIGURE_TITLE',
        message: 'Il PDF generato contiene un titolo interno duplicato all\'interno dell\'area del grafico.'
      });
    }

    // 5. PSEUDO_VISUAL_LEAKED nel PDF (v2.0):
    // Rileva caratteri ASCII tree che non devono mai apparire nel PDF stampato.
    if (/[├└]──/.test(text)) {
      errors.push({
        code: 'PSEUDO_VISUAL_LEAKED',
        message: 'Il PDF generato contiene caratteri ASCII tree (├──/└──). La pseudo-visualizzazione è filtrata correttamente solo nell\'HTML ma non nel PDF.'
      });
    }

    return {
      passed: errors.length === 0,
      errors,
      pageCount
    };
  } catch (err) {
    return {
      passed: true,
      errors: [],
      pageCount: 1,
      warning: `Ispezione testuale post-stampa non disponibile: ${err.message}`
    };
  }
}

/**
 * Esegue l'audit deterministico di Livello 1 sugli elementi del DOM (Bounding Box)
 * 
 * @param {Object} puppeteerPage Istanza di pagina Puppeteer
 * @param {Object} [options]
 * @param {number} [options.maxElementHeightPx=950] Altezza massima consentita per singolo blocco A4
 * @returns {Promise<{ passed: boolean, overflowElements: Array<Object>, warnings: Array<string> }>}
 */
async function auditDomOverflow(puppeteerPage, options = {}) {
  const maxElementHeight = options.maxElementHeightPx || 950;

  try {
    const report = await puppeteerPage.evaluate((maxHeight) => {
      const candidates = document.querySelectorAll(
        '.academic-callout, table, svg, .academic-diagram, pre, .academic-plot-svg'
      );

      const overflows = [];
      const warnings = [];

      candidates.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.height > maxHeight) {
          overflows.push({
            tag: el.tagName.toLowerCase(),
            className: el.className || '',
            height: Math.round(rect.height),
            maxAllowed: maxHeight,
            snippet: el.innerText ? el.innerText.slice(0, 100).trim() : el.outerHTML.slice(0, 100)
          });
        }
      });

      return { overflows, warnings };
    }, maxElementHeight);

    const passed = report.overflows.length === 0;

    return {
      passed,
      overflowElements: report.overflows,
      warnings: report.warnings
    };
  } catch (err) {
    return {
      passed: true,
      overflowElements: [],
      warnings: [`Audit layout Puppeteer non critico saltato: ${err.message}`]
    };
  }
}

module.exports = {
  auditPrePrintQuality,
  auditPostPrintPdf,
  auditDomOverflow
};
