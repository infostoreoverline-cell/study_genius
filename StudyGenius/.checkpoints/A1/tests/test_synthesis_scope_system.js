/**
 * StudyGenius Academic Intelligence System
 * test_synthesis_scope_system.js
 * 
 * Verifiche automatizzate per:
 * 1. Filtro Scope Argomenti Target ("Sono Quelli")
 * 2. Parser di argomenti, range e capitoli
 * 3. Modalità Sintesi Accademica ad Alta Densità (Level 0 e Level 4)
 * 4. Topic Ledger Anti-Pollution (esclusione intestazioni tecniche)
 */

const assert = require('assert');
const path = require('path');
const { PromptCompiler } = require('../src/core/promptCompiler');

console.log('🧪 AVVIO TEST SINTESI ACCADEMICA & FILTRO SCOPE ARGOMENTI...\n');

// -----------------------------------------------------------------------------
// 1. Test PromptCompiler in modalità 'summary'
// -----------------------------------------------------------------------------
console.log('1️⃣ Test PromptCompiler in modalità summary (Sintesi ad Alta Densità)...');
const compiler = new PromptCompiler();
const summaryPrompt = compiler.compileSystemPrompt({
  subject: 'Economia',
  studyMode: 'summary',
  customInstructions: 'Solo argomenti d\'esame'
});

assert(summaryPrompt.includes('SINTESI ACCADEMICA AD ALTA DENSITÀ'), 'Il prompt deve includere la direttiva di sintesi ad alta densità');
assert(summaryPrompt.includes('Non riscrivere il libro'), 'Il prompt deve vietare di riscrivere il libro');
assert(summaryPrompt.includes('Densità Concettuale'), 'Il prompt deve richiamare il principio di densità concettuale');
assert(!summaryPrompt.includes('Il tuo obiettivo NON è riassumere o comprimere superficialmente'), 'Gli invarianti Level 0 devono essere stati aggiornati per consentire la sintesi accademica');
console.log('   ✅ PromptCompiler modalità summary verificato con successo.');

// -----------------------------------------------------------------------------
// 2. Test Parser Argomenti Target
// -----------------------------------------------------------------------------
console.log('\n2️⃣ Test parseTargetTopics (Capitoli, Range e Concetti)...');
function parseTargetTopics(targetTopics) {
  if (!targetTopics) return [];
  let str = Array.isArray(targetTopics) ? targetTopics.join(', ') : String(targetTopics);
  const terms = [];

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

  const remainingStr = str.replace(/(?:capitoli\s+)?(?:dal\s+)?\d+\s*(?:al|-)\s*\d+/gi, ' ');

  const tokens = remainingStr.split(/[,;\n]+|\s+e\s+/i).map(t => t.trim()).filter(Boolean);
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

const parsed1 = parseTargetTopics('Capitolo 3 e 5, WACC, ROI');
assert.strictEqual(parsed1.filter(p => p.type === 'chapter').length, 2, 'Deve identificare 2 capitoli');
assert(parsed1.some(p => p.num === 3), 'Deve includere Capitolo 3');
assert(parsed1.some(p => p.num === 5), 'Deve includere Capitolo 5');
assert(parsed1.some(p => p.term === 'WACC'), 'Deve includere keyword WACC');
assert(parsed1.some(p => p.term === 'ROI'), 'Deve includere keyword ROI');

const parsedRange = parseTargetTopics('Capitoli dal 4 al 7');
assert.strictEqual(parsedRange.length, 4, 'Il range dal 4 al 7 deve generare 4 capitoli (4, 5, 6, 7)');
console.log('   ✅ parseTargetTopics verificato con successo.');

// -----------------------------------------------------------------------------
// 3. Test filterExtractedContentByTopics ("Sono Quelli")
// -----------------------------------------------------------------------------
console.log('\n3️⃣ Test filterExtractedContentByTopics (Isolamento sezioni da libro)...');
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
    return {
      filteredContent: matchedSections.join('\n\n---\n\n'),
      isFiltered: true,
      matchedCount: matchedSections.length,
      totalSections: sections.length,
      parsedTerms: parsed.map(p => p.term)
    };
  }
  return { filteredContent: content, isFiltered: false, matchedCount: 0, parsedTerms: parsed.map(p => p.term) };
}

// Simuliamo un libro di 10 capitoli
const mockBook10 = Array.from({ length: 10 }, (_, i) => {
  const cap = i + 1;
  return `# === LIBRO/MANUALE: Finanza Aziendale [Parte ${cap}/10] ===\n## Capitolo ${cap}: Argomento del capitolo ${cap}\nContenuto dettagliato delle pagine del capitolo ${cap}...`;
}).join('\n\n---\n\n');

// L'utente richiede solo i capitoli 3 e 7
const filter10 = filterExtractedContentByTopics(mockBook10, 'Capitolo 3, 7');
assert(filter10.isFiltered, 'Il filtro deve essere attivo');
assert.strictEqual(filter10.matchedCount, 2, 'Deve isolare esattamente 2 capitoli su 10');
assert(filter10.filteredContent.includes('Capitolo 3'), 'Deve contenere il capitolo 3');
assert(filter10.filteredContent.includes('Capitolo 7'), 'Deve contenere il capitolo 7');
assert(!filter10.filteredContent.includes('Capitolo 1:'), 'NON deve contenere il capitolo 1');
assert(!filter10.filteredContent.includes('Capitolo 5:'), 'NON deve contenere il capitolo 5');
console.log('   ✅ filterExtractedContentByTopics ha isolato 2 capitoli su 10 scartando l\'80% del materiale non richiesto.');

// -----------------------------------------------------------------------------
// 4. Test Topic Ledger Anti-Pollution
// -----------------------------------------------------------------------------
console.log('\n4️⃣ Test extractTopicLedger (Esclusione intestazioni tecniche)...');
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

const textWithMetadata = `
# === DOCUMENTO DIGITALE: Finanza MIO.pdf (19 pagine) ===
# === LIBRO/MANUALE: Modulo 1 ===
# Riclassificazione dello Stato Patrimoniale
## Indici di Liquidità e Circolante
### Margine di Struttura
# === LIBRO/MANUALE: Modulo 2 ===
`;

const extractedTopics = extractTopicLedger(textWithMetadata);
assert(!extractedTopics.some(t => t.includes('DOCUMENTO DIGITALE')), 'Non deve includere DOCUMENTO DIGITALE');
assert(!extractedTopics.some(t => t.includes('LIBRO/MANUALE')), 'Non deve includere LIBRO/MANUALE');
assert(extractedTopics.includes('Riclassificazione dello Stato Patrimoniale'), 'Deve includere Riclassificazione');
assert(extractedTopics.includes('Indici di Liquidità e Circolante'), 'Deve includere Indici');
assert(extractedTopics.includes('Margine di Struttura'), 'Deve includere Margine di Struttura');
console.log('   ✅ Topic Ledger pulito: solo concetti didattici, zero artefatti tecnici.');

console.log('\n🎉 TUTTI I TEST DEL SISTEMA DI SINTESI E SCOPE MIRATO SONO STATI SUPERATI CON SUCCESSO!');
