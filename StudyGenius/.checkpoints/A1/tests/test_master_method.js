/**
 * StudyGenius Academic Intelligence System
 * tests/test_master_method.js
 * 
 * Suite di test per verificare la conformità con la specifica normativa:
 * descrizioni funzionamento/STUDY_GENIUS_METODO_DIDATTICO_MASTER.md
 */

const assert = require('assert');
const { PromptCompiler } = require('../src/core/promptCompiler');
const { AcademicContract } = require('../src/core/contract');
const { initJobState } = require('../src/core/jobState');
const { MASTER_METHOD_CHAPTER_SEQUENCE } = require('../src/planning/blueprint');

console.log('🧪 AVVIO TEST CONFORMITÀ METODO DIDATTICO MASTER...\n');

// 1. Test PromptCompiler con Direttiva Master e 5 Assi
console.log('1️⃣ Test PromptCompiler (Direttiva Master, 5 Assi, Ciclo Didattico)...');
const compiler = new PromptCompiler();

const physicsPrompt = compiler.compileSystemPrompt({
  subject: 'Fisica',
  studyMode: 'summary',
  customInstructions: 'Focus su onde stazionarie e risonanza acustica'
});

assert(physicsPrompt.includes('Rendimento di studio'), 'Deve contenere la formula del rendimento di studio');
assert(physicsPrompt.includes('Sezione 15 Master Method'), 'Deve includere il riferimento alla Sezione 15');
assert(physicsPrompt.includes('ORIENTA-COSTRUISCI-APPLICA-VERIFICA-CONSOLIDA'), 'Deve includere il ciclo didattico fondamentale a 5 fasi');
assert(physicsPrompt.includes('ridondanza minima'), 'Deve contenere la formula della densità concettuale per la modalità summary');
assert(physicsPrompt.includes('Focus su onde stazionarie e risonanza acustica'), 'Deve includere le istruzioni personalizzate nel Livello 5');
assert(physicsPrompt.includes('GATE PRIMO USO') || physicsPrompt.includes('Gate Primo Uso'), 'Deve includere i gate di qualità a soglie');

const mathPrompt = compiler.compileSystemPrompt({
  subject: 'Matematica',
  studyMode: 'theory',
  examForm: 'oral'
});
assert(mathPrompt.includes('FOCUS TEORIA & DIMOSTRAZIONI'), 'Deve includere la politica di modalità per focus teoria');
assert(mathPrompt.includes('Studio Sistematico dei Controesempi'), 'Deve richiedere i controesempi se cade un\'ipotesi');

const exercisesPrompt = compiler.compileSystemPrompt({
  subject: 'Fisica',
  studyMode: 'exercises',
  examForm: 'written'
});
assert(exercisesPrompt.includes('Protocollo Obbligatorio in 7 Passi'), 'Deve includere il protocollo in 7 passi per il focus esercizi');

console.log('   ✅ PromptCompiler verificato con successo.');

// 2. Test AcademicContract (I 7 Campi del Contratto d\'Uscita & Compito Finale)
console.log('\n2️⃣ Test AcademicContract (Contratto d\'Uscita a 7 Campi & Compito Finale)...');

const contractSummary = new AcademicContract({
  subject: 'Fisica',
  studyMode: 'summary',
  examForm: 'written',
  topic: 'Elettromagnetismo'
});

assert(contractSummary.exitContract, 'Deve esistere exitContract');
assert(contractSummary.exitContract.destinationOfUse, 'Deve contenere destinationOfUse');
assert(contractSummary.exitContract.finalPerformance, 'Deve contenere finalPerformance');
assert(contractSummary.exitContract.finalProduct, 'Deve contenere finalProduct');
assert(contractSummary.exitContract.requiredDepth, 'Deve contenere requiredDepth');
assert(contractSummary.exitContract.successEvidence, 'Deve contenere successEvidence');
assert(contractSummary.exitContract.timeConstraint, 'Deve contenere timeConstraint');
assert(contractSummary.exitContract.stoppingCriterion, 'Deve contenere stoppingCriterion');
assert(contractSummary.terminalTask.includes('WRITTEN'), 'Il compito finale deve includere la forma reale d\'esame');

const directive = contractSummary.toPromptDirective();
assert(directive.includes('ACADEMIC EXIT-CONTRACT'), 'La direttiva di prompt deve includere l\'exit-contract');
assert(directive.includes('I 7 Parametri del Contratto d\'Uscita'), 'Deve includere i 7 parametri');

// Test validazione testo generato con AcademicContract
const validTestText = `
# Capitolo 1: Campo Elettrico
Partiamo dalla definizione formale del campo elettrico:
$$\\vec{E} = \\frac{\\vec{F}}{q}$$
Per derivare il potenziale elettrico, applichiamo la regola dell'integrazione di linea:
$$V(r) = -\\int_{\\infty}^r \\vec{E} \\cdot d\\vec{l} = \\frac{q}{4\\pi\\varepsilon_0 r}$$
> ⚠️ **Attenzione / Errore Tipico d'Esame:** Confondere il lavoro del campo con quello delle forze esterne.
Eseguiamo il controllo di coerenza: l'analisi dimensionale conferma $[E] = \\text{V/m}$.
Per $r \\to \\infty$, il campo tende a zero come atteso per una carica localizzata.
` + 'Testo accademico di approfondimento per soddisfare la lunghezza minima richiesta dal contratto didattico. '.repeat(30);

const valReport = contractSummary.validateGeneratedText(validTestText);
assert(valReport.score >= 70, `Il punteggio deve essere >= 70 (ottenuto: ${valReport.score})`);
assert.strictEqual(valReport.valid, true, 'Il testo valido deve superare la validazione del contratto');

console.log('   ✅ AcademicContract verificato con successo.');

// 3. Test JobState (Memoria di Padronanza & Tracciamento Pedagogico)
console.log('\n3️⃣ Test JobState (Memoria dell\'Apprendimento & Stato di Padronanza)...');

const jobState = initJobState('session_test_123', 'Fisica');
assert(jobState.masteryState, 'Deve contenere masteryState');
assert(Array.isArray(jobState.masteryState.masteredNodes), 'masteredNodes deve essere un array');
assert(Array.isArray(jobState.masteryState.reviewNeededNodes), 'reviewNeededNodes deve essere un array');
assert(Array.isArray(jobState.masteryState.prerequisiteGaps), 'prerequisiteGaps deve essere un array');
assert(Array.isArray(jobState.recurringErrors), 'recurringErrors deve essere un array');
assert(jobState.hasOwnProperty('activeContract'), 'Deve contenere activeContract');
assert(jobState.hasOwnProperty('nextRecommendedAction'), 'Deve contenere nextRecommendedAction');

console.log('   ✅ JobState verificato con successo.');

// 4. Test Blueprint Sequence (I 13 Moduli Funzionali della Sezione 10.2)
console.log('\n4️⃣ Test Blueprint (Sequenza Didattica a 13 Moduli Sezione 10.2)...');

assert.strictEqual(MASTER_METHOD_CHAPTER_SEQUENCE.length, 13, 'La sequenza del capitolo deve contenere 13 moduli');
assert.strictEqual(MASTER_METHOD_CHAPTER_SEQUENCE[0], 'why_needed', 'Il primo modulo deve essere "why_needed" (Perché serve)');
assert.strictEqual(MASTER_METHOD_CHAPTER_SEQUENCE[1], 'learning_outcomes', 'Il secondo modulo deve essere "learning_outcomes" (Che cosa saprai fare)');
assert.strictEqual(MASTER_METHOD_CHAPTER_SEQUENCE[12], 'active_review_card', 'L\'ultimo modulo deve essere "active_review_card" (Scheda di ripasso attivo)');

console.log('   ✅ Blueprint Sequenza verificata con successo.');

console.log('\n🎉 TUTTI I TEST DEL METODO DIDATTICO MASTER SONO STATI SUPERATI CON SUCCESSO!');
