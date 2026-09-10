/**
 * StudyGenius — Test Suite: Visual Pipeline Integration
 * tests/test_visual_pipeline_integration.js
 *
 * Copre:
 * - Integrazione della Visual Pipeline (Prompts)
 * - Assenza di chiamate ai renderizzatori diretti nel workflow principale
 * - Verifica che la pipeline esiga la generazione di blocchi json:visual-spec e non raw SVG
 *
 * Eseguire con: node tests/test_visual_pipeline_integration.js
 */

'use strict';

const path = require('path');
const fs = require('fs-extra');
const { PromptCompiler } = require('../src/core/promptCompiler');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✅ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${description}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function expect(val) {
  return {
    toBe: (exp) => { if (val !== exp) throw new Error(`Expected ${JSON.stringify(exp)}, got ${JSON.stringify(val)}`); },
    toBeTrue: () => { if (val !== true) throw new Error(`Expected true, got ${val}`); },
    toBeFalse: () => { if (val !== false) throw new Error(`Expected false, got ${val}`); },
    toContain: (sub) => { if (!String(val).includes(sub)) throw new Error(`Expected "${val}" to contain "${sub}"`); },
    notToContain: (sub) => { if (String(val).includes(sub)) throw new Error(`Expected "${val}" NOT to contain "${sub}"`); },
  };
}

console.log('\n🚀 SEZIONE 1 — Visual Pipeline Integration (Prompt Compiler)\n');

test('promptCompiler: getLevel6OutputArchitecture vieta SVG grezzo e richiede json:visual-spec', () => {
  const compiler = new PromptCompiler();
  const formatStr = compiler.getLevel6OutputArchitecture();
  
  expect(formatStr).toContain('```json:visual-spec');
  expect(formatStr).toContain('VIETATO produrre codice SVG grezzo');
});

test('promptCompiler: compileMinimalRuntimePrompt (deepseek_writer) vieta coordinate SVG raw e richiede visual-spec', () => {
  const compiler = new PromptCompiler();
  
  const prompt = compiler.compileMinimalRuntimePrompt({
    component: 'deepseek_writer',
    visualArtifacts: [{ didacticDirective: 'Una direttiva visuale fittizia.' }]
  });
  
  expect(prompt).toContain('```json:visual-spec```');
  expect(prompt).toContain('VIETATO produrre coordinate SVG raw');
});

console.log('\n🚀 SEZIONE 2 — Visual Pipeline Integration (Orchestrator)\n');

test('orchestratorService: Il prompt generato impone json:visual-spec invece di SVG vettoriale', () => {
  const orchestratorCode = fs.readFileSync(path.join(__dirname, '../src/services/orchestratorService.js'), 'utf-8');
  
  expect(orchestratorCode).toContain('ESCLUSIVAMENTE come specifica semantica');
  expect(orchestratorCode).toContain('json:visual-spec');
  expect(orchestratorCode).notToContain('in blocco vettoriale SVG puro');
  
  // Verifica update visualContractsContext
  expect(orchestratorCode).toContain('includere la definizione semantica ricostruita tramite blocco');
  
  // Verifica update MasterPlan
  expect(orchestratorCode).toContain('reso come specifica semantica');
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`  Risultato: ${passed} passati, ${failed} falliti`);
console.log('─'.repeat(50));

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n  ✅ Tutti i test Visual Pipeline Integration superati!\n');
}
