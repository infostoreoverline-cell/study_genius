/**
 * StudyGenius — Scope & Topic Ledger Service
 * Gestione dello scope mirato per lo studio di capitoli specifici ("Sono Quelli")
 * e ledger degli argomenti trattati per prevenire ridondanze.
 */

function sanitizeForDeepSeek(str) {
  if (!str || typeof str !== 'string') return '';
  let clean = typeof str.toWellFormed === 'function' ? str.toWellFormed() : str;
  clean = clean.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
  clean = clean.replace(/\0/g, '');
  return clean;
}

/**
 * Estrazione Mappa Argomenti Trattati (Topic Ledger Anti-Ridondanza)
 */
function extractTopicLedger(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const topics = [];
  const technicalHeadingRegex = /===|estratto da|documento digitale|libro\/manuale|modulo \d+|shard \d+|parte \d+\/\d+|presentazione powerpoint/i;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#{1,3}\s+/.test(trimmed)) {
      const clean = trimmed.replace(/^#+\s*/, '').replace(/\*+/g, '').trim();
      if (clean && clean.length > 3 && !technicalHeadingRegex.test(clean) && !topics.includes(clean)) {
        topics.push(clean);
      }
    }
  }
  return topics;
}

/**
 * Parsing e Matching Argomenti / Capitoli Target ("Sono Quelli")
 */
function parseTargetTopics(targetTopics) {
  if (!targetTopics) return [];
  const str = Array.isArray(targetTopics) ? targetTopics.join(', ') : String(targetTopics);
  const terms = [];

  // 1. Range numerici tipo "dal 2 al 5" o "capitoli 2-5"
  const rangeRegex = /(?:capitoli\s+)?(?:dal\s+)?(\d+)\s*(?:al|-)\s*(\d+)/gi;
  let rMatch;
  while ((rMatch = rangeRegex.exec(str)) !== null) {
    const start = parseInt(rMatch[1], 10);
    const end = parseInt(rMatch[2], 10);
    if (start <= end && end - start < 50) {
      for (let n = start; n <= end; n++) {
        if (!terms.some(t => t.type === 'chapter' && t.num === n)) {
          terms.push({ type: 'chapter', num: n, term: `Capitolo ${n}` });
        }
      }
    }
  }

  // Rimuovi i range già elaborati per non tokenizzarli come parole chiave residue
  const remainingStr = str.replace(/(?:capitoli\s+)?(?:dal\s+)?\d+\s*(?:al|-)\s*\d+/gi, ' ');

  // 2. Token separati da virgola, punto e virgola, newline o " e "
  const tokens = remainingStr
    .split(/[,;\n]+|\s+e\s+/i)
    .map(t => t.trim())
    .filter(Boolean);

  for (const tok of tokens) {
    const chapMatch = tok.match(/(?:capitol[io]|cap\.?|parte)\s*(\d+)/i);
    if (chapMatch) {
      const num = parseInt(chapMatch[1], 10);
      if (!terms.some(t => t.type === 'chapter' && t.num === num)) {
        terms.push({ type: 'chapter', num, term: `Capitolo ${num}` });
      }
      continue;
    }

    const pureNumMatch = tok.match(/^(\d+)$/);
    if (pureNumMatch) {
      const num = parseInt(pureNumMatch[1], 10);
      if (!terms.some(t => t.type === 'chapter' && t.num === num)) {
        terms.push({ type: 'chapter', num, term: `Capitolo ${num}` });
      }
      continue;
    }

    if (tok.length >= 2) {
      terms.push({ type: 'keyword', term: tok });
    }
  }

  return terms;
}

/**
 * Filtra il contenuto estratto isolando esclusivamente i capitoli o blocchi
 * che corrispondono agli argomenti richiesti dallo studente.
 */
function filterExtractedContentByTopics(content, targetTopics) {
  if (!content || !targetTopics) return { filteredContent: content, isFiltered: false, matchedCount: 0 };
  const parsed = parseTargetTopics(targetTopics);
  if (parsed.length === 0) return { filteredContent: content, isFiltered: false, matchedCount: 0 };

  const matchers = parsed.map(item => {
    if (item.type === 'chapter') {
      return {
        type: 'chapter',
        term: item.term,
        regex: new RegExp(`(?:capitolo|cap\\.?|parte)\\s*${item.num}\\b|\\b${item.num}\\.[0-9]?\\b`, 'i')
      };
    }
    const escaped = item.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return {
      type: 'keyword',
      term: item.term,
      regex: new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, 'iu')
    };
  });

  const sectionDelimRegex = /(?:\n\n---\n\n|\n(?=# ===|\n# Contenuto estratto da:|\n# Capitolo|\n## Capitolo))/;
  const sections = content.split(sectionDelimRegex).map(s => s.trim()).filter(Boolean);
  const matchedSections = sections.filter(sec => matchers.some(m => m.regex.test(sec)));

  if (matchedSections.length > 0) {
    console.log(`🎯 [Scope Filter]: Isolati ${matchedSections.length}/${sections.length} blocchi pertinenti agli argomenti richiesti: [${parsed.map(p => p.term).join(', ')}]`);
    return {
      filteredContent: matchedSections.join('\n\n---\n\n'),
      isFiltered: true,
      matchedCount: matchedSections.length,
      totalSections: sections.length,
      parsedTerms: parsed.map(p => p.term)
    };
  }

  console.log(`ℹ️ [Scope Filter]: Nessun blocco isolabile direttamente per "${parsed.map(p => p.term).join(', ')}". Il vincolo guiderà il prompt di generazione.`);
  return { filteredContent: content, isFiltered: false, matchedCount: 0, parsedTerms: parsed.map(p => p.term) };
}

module.exports = {
  sanitizeForDeepSeek,
  extractTopicLedger,
  parseTargetTopics,
  filterExtractedContentByTopics
};
