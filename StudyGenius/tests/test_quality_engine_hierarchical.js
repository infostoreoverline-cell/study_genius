/**
 * Test unitario per Fase 2: Quality Engine Gerarchico (src/core/qualityEngine.js)
 */

const assert = require('assert');
const { QualityEngine } = require('../src/core/qualityEngine');
const { createGraph, addNode, addEdge } = require('../src/core/knowledgeGraph');

console.log('🧪 [Test Quality Engine Hierarchical]: Avvio test dei Quality Gates gerarchici...');

const qe = new QualityEngine();

// -----------------------------------------------------------------------------
// TEST 1: PREREQUISITE_VIOLATION
// -----------------------------------------------------------------------------
const kgChem = createGraph('sess-chem', 'Chimica Analitica');
addNode(kgChem, { id: 'concept-alpha', label: 'Coefficiente alpha', type: 'CONCEPT', chapterId: 'cap07' });
addNode(kgChem, { id: 'concept-cond-const', label: 'Costante Condizionale', type: 'LAW', chapterId: 'cap07' });
// La costante condizionale REQUIRES il coefficiente alpha
addEdge(kgChem, { from: 'concept-cond-const', to: 'concept-alpha', type: 'REQUIRES' });

// Testo in cui la Costante Condizionale viene spiegata all'inizio e il Coefficiente alpha centinaia di caratteri dopo
const badOrderText = `
# 1. Trattazione dei Complessi
In questa sezione analizziamo a fondo la Costante Condizionale per valutare la resa delle titolazioni complessometriche in presenza di tamponi o leganti ausiliari.
La Costante Condizionale permette di calcolare il pM al punto di equivalenza con grande precisione analitica.
$$ K'_{eff} = \\frac{K_f}{\\alpha_M \\alpha_L} $$
Come si nota, la costante apparente descrive l'effetto delle reazioni secondarie sul sistema complessometrico.
Per approfondire questa trattazione, è necessario a questo punto definire il Coefficiente alpha.
📌 **Definizione**: Definiamo il Coefficiente alpha come il rapporto tra concentrazione totale e libera.
$$ \\alpha = 1 + \\beta_1 [L] $$
dove $\\alpha$ misura la frazione di ione metallico libero.
🎓 **Domande d'Esame**: Qual è la differenza tra costante termodinamica e costante condizionale?
⚠️ **Attenzione**: Non confondere il pH con il pM.
💡 **Intuizione**: Intuitivamente il legante libero compete con il metallo.
`;

const res1 = qe.evaluateQuality(badOrderText, null, 'Chimica Analitica', kgChem);
const prereqFail = res1.hardFails.find(hf => hf.type === 'PREREQUISITE_VIOLATION');
assert(prereqFail, 'Deve scattare PREREQUISITE_VIOLATION se la costante condizionale compare prima di alpha!');
assert.strictEqual(res1.passed, false, 'Il documento NON deve passare se c\'è un PREREQUISITE_VIOLATION!');
console.log('  ✅ 1. PREREQUISITE_VIOLATION rilevato come Hard Fail bloccante (passed: false)');

// -----------------------------------------------------------------------------
// TEST 2: BARE_DEFINITION EVOLUTO IN FORMAL DEPENDENCY UNIT (FDU)
// -----------------------------------------------------------------------------
// Definizione compatta (< 200 caratteri) ma completa di equazione e interpretazione
const fduText = `
# 1. Costanti Fondamentali della Materia
Nel nostro percorso accademico affrontiamo adesso la quantificazione della materia su scala atomica.
La costante di Avogadro costituisce il cardine per collegare le grandezze macroscopiche misurabili in laboratorio con le proprietà microscopiche dei singoli atomi.
📌 **Definizione**: Il numero di Avogadro esprime il numero di particelle in una mole.
$$ N_A = 6.022 \\times 10^{23} \\text{ mol}^{-1} $$
dove $N_A$ rappresenta il fattore di conversione fondamentale tra scala atomica e macroscopica.
💡 **Intuizione**: Intuitivamente è il ponte tra grammi e unità di massa atomica.
⚠️ **Attenzione**: Non confondere moli e molecole durante i calcoli stechiometrici.
🎓 **Domande d'Esame**: Come si determina sperimentalmente la costante $N_A$?
`;

const res2 = qe.evaluateQuality(fduText, null, 'Chimica');
const bareDefFail2 = res2.hardFails.find(hf => hf.type === 'BARE_DEFINITION');
assert(!bareDefFail2, 'Una Formal Dependency Unit valida NON deve scatenare BARE_DEFINITION!');
console.log('  ✅ 2. Formal Dependency Unit (FDU) compatta accettata senza falsi positivi');

// -----------------------------------------------------------------------------
// TEST 3: BARE_DEFINITION REALE (VERO FALLIMENTO)
// -----------------------------------------------------------------------------
const realBareDefText = `
# 1. Principi Fondamentali della Dinamica Classica
In questo capitolo esaminiamo le leggi del moto formulate da Newton e la loro interpretazione moderna.
Analizziamo il concetto di massa inerziale e come essa si oppone alle variazioni dello stato di quiete.
📌 **Definizione**: L'inerzia è la tendenza dei corpi a perseverare nel loro stato.
# 2. Forze di Attrito e Sistemi Reali
Parliamo adesso di attrito statico e dinamico nei piani inclinati e nelle guide vincolate.
La forza resistente dipende dal coefficiente di attrito radente e dalla reazione normale del vincolo.
💡 **Intuizione**: Intuitivamente l'attrito frena e dissipa energia meccanica sotto forma di calore.
⚠️ **Attenzione**: Attenzione ai coefficienti statici e dinamici nei calcoli di equilibrio.
🎓 **Domande d'Esame**: Cos'è una forza conservativa e come si dimostra l'indipendenza dal cammino?
$$ F = m a $$
`;
const res3 = qe.evaluateQuality(realBareDefText, null, 'Fisica');
const bareDefFail3 = res3.hardFails.find(hf => hf.type === 'BARE_DEFINITION');
assert(bareDefFail3, 'Una definizione isolata priva di formula e interpretazione deve scatenare BARE_DEFINITION!');
console.log('  ✅ 3. Vera BARE_DEFINITION (isolata e muta) rilevata correttamente come Hard Fail');

// -----------------------------------------------------------------------------
// TEST 4: UNEXPLAINED_FORMAL_TRANSITION (stepSignificance: HIGH)
// -----------------------------------------------------------------------------
const unexplainedCurlText = `
# 1. Equazioni di Maxwell e Onde Elettromagnetiche
Nel formalismo differenziale dell'elettromagnetismo classico, consideriamo la propagazione nel vuoto.
Partiamo dalla legge di Faraday-Neumann per campi variabili nel tempo:
$$ \\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t} $$
$$ \\nabla \\times (\\nabla \\times \\vec{E}) = -\\frac{\\partial}{\\partial t} (\\nabla \\times \\vec{B}) $$
In questo modo otteniamo la forma differenziale d'onda cercata per le componenti spaziali.
💡 **Intuizione**: Intuitivamente il campo variabile genera un campo elettrico auto-sostenuto.
📌 **Definizione**: Il rotore indica la circuitazione infinitesima per unità di superficie.
$$ \\text{rot} \\vec{E} = \\nabla \\times \\vec{E} $$
dove il vettore rotore esprime la vorticità locale del campo vettoriale.
⚠️ **Attenzione**: Attenzione al segno meno di Lenz nelle relazioni differenziali.
🎓 **Domande d'Esame**: Quali sono le equazioni di Maxwell nel vuoto in assenza di sorgenti?
`;
const res4 = qe.evaluateQuality(unexplainedCurlText, null, 'Fisica');
const stepFail = res4.hardFails.find(hf => hf.type === 'UNEXPLAINED_FORMAL_TRANSITION');
assert(stepFail, 'Due rotori consecutivi senza spiegazione di WHY / WHAT CHANGED devono scatenare UNEXPLAINED_FORMAL_TRANSITION!');
console.log('  ✅ 4. UNEXPLAINED_FORMAL_TRANSITION rilevato su passaggio differenziale ad alta significatività');

// -----------------------------------------------------------------------------
// TEST 5: INVALID_REFERENCE
// -----------------------------------------------------------------------------
const invalidRefText = `
# 1. Teoria dei Campi Elettrostatici e Potenziali
Consideriamo una distribuzione discreta o continua di carica nello spazio tridimensionale.
Come abbiamo dimostrato in [REF:concept.inesistente-xyz], il potenziale elettrostatico decresce con la distanza.
Questo comportamento assicura che il lavoro necessario per portare una carica unitaria dall'infinito sia finito.
💡 **Intuizione**: Intuitivamente le cariche di segno opposto tendono a legarsi rilasciando energia potenziale.
📌 **Definizione**: Il potenziale è il lavoro per unità di carica compiuto dalle forze del campo.
$$ V = \\frac{q}{4\\pi \\epsilon_0 r} $$
dove $V$ rappresenta il potenziale scalare generato da una carica puntiforme $q$.
⚠️ **Attenzione**: Attenzione alla scelta convenzionale dello zero del potenziale all'infinito.
🎓 **Domande d'Esame**: Come si relaziona il campo vettoriale col gradiente del potenziale scalare?
`;
const res5 = qe.evaluateQuality(invalidRefText, null, 'Fisica', kgChem);
const refFail = res5.hardFails.find(hf => hf.type === 'INVALID_REFERENCE');
assert(refFail, 'Riferimento semantico inesistente deve scatenare INVALID_REFERENCE!');
console.log('  ✅ 5. INVALID_REFERENCE rilevato deterministicamente');

// -----------------------------------------------------------------------------
// TEST 6: MISSING_MATH_RULE (MATHEMATICAL PROVENANCE LAYER)
// -----------------------------------------------------------------------------
const missingMathRuleText = `
# 1. Propagazione delle Onde Piane Unidimensionali
In questo capitolo studiamo le soluzioni dell'equazione delle onde di d'Alembert nel continuo unidimensionale.
Consideriamo una perturbazione armonica longitudinale lungo l'asse delle ascisse caratterizzata da ampiezza costante.
La funzione d'onda assume la forma canonica $\\xi(x,t) = \\xi_0 \\sin(kx - \\omega t + \\delta)$.
Calcoliamo le derivate parziali rispetto a x:
$$ \\frac{\\partial \\xi}{\\partial x} = \\xi_0 k \\cos(kx - \\omega t + \\delta) $$
Derivando nuovamente rispetto a x:
$$ \\frac{\\partial^2 \\xi}{\\partial x^2} = -\\xi_0 k^2 \\sin(kx - \\omega t + \\delta) $$
Questo risultato permette di collegare la curvatura spaziale alla derivata seconda temporale per verificare l'equazione d'onda.
📌 **Definizione**: Il numero d'onda $k$ quantifica la periodicità spaziale della perturbazione.
$$ k = \\frac{2\\pi}{\\lambda} $$
dove $k$ ha le dimensioni dell'inverso di una lunghezza.
💡 **Intuizione**: Intuitivamente il vettore d'onda scandisce quante oscillazioni spaziali complete avvengono nell'unità di lunghezza.
⚠️ **Attenzione**: Attenzione alla differenza tra velocità di fase $v_p = \\omega/k$ e velocità delle particelle del mezzo.
🎓 **Domande d'Esame**: Come si dimostra che $\\xi(x,t)$ soddisfa l'equazione di d'Alembert?
`;

const res6 = qe.evaluateQuality(missingMathRuleText, null, 'Fisica');
const mathRuleFail = res6.hardFails.find(hf => hf.type === 'MISSING_MATH_RULE');
assert(mathRuleFail, 'Deve scattare MISSING_MATH_RULE se un calcolo di derivata non cita la regola matematica!');
assert.strictEqual(res6.passed, false, 'Il documento NON deve passare se c\'è un MISSING_MATH_RULE!');
console.log('  ✅ 6. MISSING_MATH_RULE rilevato deterministicamente come Hard Fail su derivazione senza regole');

// -----------------------------------------------------------------------------
// TEST 7: MATHEMATICAL PROVENANCE RISPETTATA (CON REGOLA DELLA CATENA)
// -----------------------------------------------------------------------------
const correctMathProvenanceText = `
# 1. Propagazione delle Onde Piane Unidimensionali
In questo capitolo studiamo le soluzioni dell'equazione delle onde di d'Alembert nel continuo unidimensionale.
Consideriamo una perturbazione armonica longitudinale lungo l'asse delle ascisse caratterizzata da ampiezza costante.
La funzione d'onda assume la forma canonica $\\xi(x,t) = \\xi_0 \\sin(kx - \\omega t + \\delta)$.
Calcoliamo le derivate parziali rispetto a x.
Applicando la regola della catena alla funzione seno, ricordando che $\\frac{d}{dx}\\sin(u) = \\cos(u) \\cdot \\frac{du}{dx}$, e ponendo $u = kx - \\omega t + \\delta$, otteniamo $\\frac{du}{dx} = k$.
Pertanto:
$$ \\frac{\\partial \\xi}{\\partial x} = \\xi_0 \\cos(u) \\cdot k = \\xi_0 k \\cos(kx - \\omega t + \\delta) $$
Derivando nuovamente rispetto a x, applicando la regola della catena alla derivata del coseno $\\frac{d}{dx}\\cos(u) = -\\sin(u) \\cdot \\frac{du}{dx}$:
$$ \\frac{\\partial^2 \\xi}{\\partial x^2} = -\\xi_0 k \\sin(u) \\cdot k = -\\xi_0 k^2 \\sin(kx - \\omega t + \\delta) $$
Questo risultato permette di collegare la curvatura spaziale alla derivata seconda temporale per verificare l'equazione d'onda.
📌 **Definizione**: Il numero d'onda $k$ quantifica la periodicità spaziale della perturbazione.
$$ k = \\frac{2\\pi}{\\lambda} $$
dove $k$ ha le dimensioni dell'inverso di una lunghezza.
💡 **Intuizione**: Intuitivamente il vettore d'onda scandisce quante oscillazioni spaziali complete avvengono nell'unità di lunghezza.
⚠️ **Attenzione**: Attenzione alla differenza tra velocità di fase $v_p = \\omega/k$ e velocità delle particelle del mezzo.
🎓 **Domande d'Esame**: Come si dimostra che $\\xi(x,t)$ soddisfa l'equazione di d'Alembert?
`;

const res7 = qe.evaluateQuality(correctMathProvenanceText, null, 'Fisica');
const mathRuleFail7 = res7.hardFails.find(hf => hf.type === 'MISSING_MATH_RULE');
assert(!mathRuleFail7, 'Un passaggio che cita esplicitamente la regola della catena e la derivata del seno NON deve scatenare MISSING_MATH_RULE!');
console.log('  ✅ 7. Mathematical Provenance rispettata: la derivazione con regola della catena passa il Quality Engine');

console.log('\n🎉 TEST FASE 2 (QUALITY ENGINE GERARCHICO) SUPERATO CON SUCCESSO!');

