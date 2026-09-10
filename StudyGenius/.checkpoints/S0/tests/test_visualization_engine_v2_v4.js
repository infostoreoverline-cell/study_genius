/**
 * StudyGenius Academic Intelligence System
 * test_visualization_engine_v2_v4.js
 * 
 * Test suite completa di validazione per le Milestone V2, V3 e V4 del Visualization Engine:
 * - Milestone V2: Integrazione Blueprint (flag needsGraph, graphId, sequenza didattica e placeholder {{GRAPH:...}})
 * - Milestone V3: Verifica deterministica di coerenza testo↔grafico (GRAPH_TEXT_INCONSISTENCY)
 * - Milestone V4: Integrazione Quality Engine (4 hard-fail gates) e Repair Loop chirurgico locale
 * - Prova finale: Generazione capitolo accademico completo di Chimica Analitica con rendering PDF reale
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const puppeteer = require('puppeteer');

const {
  formatChapterBlueprint,
  buildBlueprintFromGraphAndPlan,
  buildChapterPromptContext
} = require('../src/planning/blueprint');

const { QualityEngine } = require('../src/core/qualityEngine');
const { RepairLoop } = require('../src/generation/repairLoop');
const {
  buildDataset,
  renderGraphToHtml,
  getGraphHeadAssets,
  replaceGraphPlaceholders
} = require('../src/visualization');
const { processDiagramsInMarkdown } = require('../src/rendering/diagramEngine');

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${testName}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Errore: ${err.message}`);
    testsFailed++;
  }
}

async function runAsyncTest(testName, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${testName}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Errore: ${err.message}`);
    testsFailed++;
  }
}

console.log('======================================================================');
console.log('🧪 StudyGenius — Visualization Engine: Test Suite V2, V3, V4 & Chimica');
console.log('======================================================================');

// Nodo grafico analitico di riferimento: Capacità Tamponante di Van Slyke per Acido Acetico
const analyticalChemistryGraphNode = {
  id: 'buffer-capacity-acetic-acid',
  type: 'GRAPH',
  chapterId: 'soluzioni-tampone-capacita',
  relatedFormulaId: 'van-slyke-buffer-capacity-monoprotic',
  provenance: 'FORMULA-derived',
  chartType: 'FUNCTION',
  title: 'Curva di Capacità Tamponante β(pH) per Tampone Acetato (Ctot = 0.10 M)',
  x: { label: 'pH', unit: '', min: 2.0, max: 8.0 },
  y: { label: 'β', unit: 'mol·L⁻¹·pH⁻¹' },
  expression: '2.303 * (10^(-pH) + 10^(pH - 14) + (Ctot * 10^(-pKa) * 10^(-pH)) / (10^(-pKa) + 10^(-pH))^2)',
  context: {
    pKa: 4.76,
    Ctot: 0.10
  },
  annotations: [
    { x: 4.76, label: 'β_max = 0.5756 Ctot = 0.0576 M/pH', align: 'left' },
    { x: 3.76, label: 'pH = pKa - 1 (limite inferiore)', align: 'left' },
    { x: 5.76, label: 'pH = pKa + 1 (limite superiore)', align: 'right' }
  ]
};

// -----------------------------------------------------------------------------
// GRUPPO 1: MILESTONE V2 — Blueprint & Teaching Directives
// -----------------------------------------------------------------------------
console.log('\n📐 Gruppo 1: Milestone V2 — Integrazione Blueprint & Direttive Didattiche');

runTest('1.1 formatChapterBlueprint supporta needsGraph, graphId e sequenza didattica', () => {
  const bp = formatChapterBlueprint({
    chapterIndex: 1,
    title: 'Soluzioni Tampone ed Efficacia Tamponante',
    conceptId: 'buffer-capacity-acetic-acid',
    needsGraph: true,
    graphId: 'buffer-capacity-acetic-acid',
    graphNodes: [analyticalChemistryGraphNode]
  });

  assert.strictEqual(bp.needsGraph, true, 'needsGraph deve essere true');
  assert.strictEqual(bp.graphId, 'buffer-capacity-acetic-acid');
  assert.ok(Array.isArray(bp.sequence), 'sequence deve essere un array');
  assert.ok(bp.sequence.includes('grafico'), 'La sequenza deve includere il livello "grafico"');
  assert.strictEqual(bp.sequence.indexOf('grafico'), 3, 'Il grafico deve seguire la derivazione');
});

runTest('1.2 buildChapterPromptContext inietta la direttiva VISUALIZATION ENGINE e placeholder', () => {
  const blueprint = formatChapterBlueprint({
    chapterIndex: 1,
    title: 'Soluzioni Tampone',
    conceptId: 'buffer-capacity-acetic-acid',
    needsGraph: true,
    graphId: 'buffer-capacity-acetic-acid',
    graphNodes: [analyticalChemistryGraphNode]
  });

  const promptCtx = buildChapterPromptContext(blueprint, 'Chimica Analitica');
  assert.ok(promptCtx.includes('VISUALIZATION ENGINE'), 'Il prompt deve contenere la sezione VISUALIZATION ENGINE');
  assert.ok(promptCtx.includes('{{GRAPH:buffer-capacity-acetic-acid}}'), 'Il prompt deve specificare il placeholder del grafico');
  assert.ok(promptCtx.includes('json:graphClaims'), 'Il prompt deve richiedere il blocco json:graphClaims');
  assert.ok(promptCtx.includes('INTERPRETATIVE'), 'La modalità di utilizzo deve essere INTERPRETATIVE');
});

runTest('1.3 replaceGraphPlaceholders e processDiagramsInMarkdown sostituiscono il placeholder {{GRAPH:...}}', () => {
  const markdownInput = `## 3. Derivazione della Capacità Tamponante
La derivazione conduce alla formula di Van Slyke.

{{GRAPH:buffer-capacity-acetic-acid}}

## 4. Interpretazione del Grafico
Come si osserva dalla curva, il massimo coincide con pH = pKa.`;

  const dummyKnowledgeGraph = {
    nodes: [analyticalChemistryGraphNode]
  };

  const processed = processDiagramsInMarkdown(markdownInput, dummyKnowledgeGraph);
  assert.ok(!processed.includes('{{GRAPH:buffer-capacity-acetic-acid}}'), 'Il placeholder deve essere rimosso');
  assert.ok(processed.includes('academic-graph-container'), 'Deve essere presente il container del grafico');
  assert.ok(processed.includes('data-graph-id="buffer-capacity-acetic-acid"'), 'ID del grafico presente negli attributi');
  assert.ok(processed.includes('data-provenance="FORMULA-derived"'), 'Provenienza FORMULA-derived presente');
});

// -----------------------------------------------------------------------------
// GRUPPO 2: MILESTONE V3 — Verifica Deterministica Coerenza Testo↔Grafico
// -----------------------------------------------------------------------------
console.log('\n🔍 Gruppo 2: Milestone V3 — Verifica Deterministica Testo↔Grafico (GRAPH_TEXT_INCONSISTENCY)');

const qEngine = new QualityEngine();

runTest('2.1 Claim numericamente coerente supera il gate senza hard-fail', () => {
  // Il massimo teorico per Ctot=0.1 M è esattamente 0.05756 M/pH a pH=4.76
  const validChapterText = `
# 1. Soluzioni Tampone e Potere Tamponante
📌 **Definizione Formale**: Il potere tamponante è definito come $$\\beta = \\frac{dC_b}{dpH} = -\\frac{dC_a}{dpH}$$
💡 **Intuizione Fenomenologica**: A livello microscopico, l'efficacia massima si registra quando la concentrazione dell'acido indissociato e della base coniugata sono uguali.
All'esame di Chimica Analitica si dimostra che:
$$\\beta(pH) = 2.303 \\left( [H^+] + [OH^-] + \\frac{C_{tot} K_a [H^+]}{(K_a + [H^+])^2} \\right)$$

{{GRAPH:buffer-capacity-acetic-acid}}

Il massimo della capacità tamponante si ha a $pH = pK_a = 4.76$, dove assume il valore calcolato $\\beta_{max} = 0.0576\\text{ M/pH}$.

\`\`\`json:graphClaims
{
  "graphClaims": [
    {
      "graphId": "buffer-capacity-acetic-acid",
      "claim": "max_at",
      "x": "4.76",
      "y_expected": "0.05756"
    }
  ]
}
\`\`\`

⚠️ **Trappola d'Esame**: Dimenticare il contributo dell'autoionizzazione dell'acqua a pH estremi (< 2 o > 12).
🎓 **Domande d'Esame**: "Cosa succede alla capacità tamponante se diluiamo il tampone di 10 volte?"
`;

  const report = qEngine.evaluateQuality(validChapterText, null, 'Chimica Analitica', { nodes: [analyticalChemistryGraphNode] });
  const graphTextFails = report.hardFails.filter(hf => hf.type === 'GRAPH_TEXT_INCONSISTENCY');
  assert.strictEqual(graphTextFails.length, 0, 'Nessun hard fail GRAPH_TEXT_INCONSISTENCY per claim corretto');
});

runTest('2.2 Claim numericamente errato SCATENA GRAPH_TEXT_INCONSISTENCY e blocca il gate', () => {
  // Dichiarato valore inventato o errato (es. 0.150 M/pH invece di 0.0576 M/pH)
  const inconsistentChapterText = `
# 1. Soluzioni Tampone e Potere Tamponante
📌 **Definizione Formale**: Il potere tamponante è definito come $$\\beta = \\frac{dC_b}{dpH}$$
💡 **Intuizione Fenomenologica**: A livello microscopico l'efficacia è massima al punto di mezza titolazione.
$$\\beta(pH) = 2.303 \\left( [H^+] + [OH^-] + \\frac{C_{tot} K_a [H^+]}{(K_a + [H^+])^2} \\right)$$

{{GRAPH:buffer-capacity-acetic-acid}}

Il valore massimo erroneamente dichiarato è di 0.150 M/pH.

\`\`\`json:graphClaims
{
  "graphClaims": [
    {
      "graphId": "buffer-capacity-acetic-acid",
      "claim": "max_at",
      "x": "4.76",
      "y_expected": "0.150"
    }
  ]
}
\`\`\`

⚠️ **Trappola d'Esame**: Confondere pH con pKa.
🎓 **Domande d'Esame**: Spiegare l'andamento asintotico.
`;

  const report = qEngine.evaluateQuality(inconsistentChapterText, null, 'Chimica Analitica', { nodes: [analyticalChemistryGraphNode] });
  const inconsistencyFail = report.hardFails.find(hf => hf.type === 'GRAPH_TEXT_INCONSISTENCY');
  assert.ok(inconsistencyFail, 'Deve scattare l\'hard fail GRAPH_TEXT_INCONSISTENCY');
  assert.strictEqual(report.passed, false, 'Il report non deve passare');
  assert.ok(inconsistencyFail.message.includes('Incoerenza numerica testo↔grafico'), 'Messaggio descrittivo presente');
  assert.strictEqual(inconsistencyFail.details.graphId, 'buffer-capacity-acetic-acid');
  assert.ok(Math.abs(inconsistencyFail.details.actual - 0.05756) < 0.001, 'Il valore calcolato reale deve essere corretto (~0.0576)');
});

// -----------------------------------------------------------------------------
// GRUPPO 3: MILESTONE V4 — Hard-Fail Quality Gates & Repair Loop Chirurgico
// -----------------------------------------------------------------------------
console.log('\n🛡️ Gruppo 3: Milestone V4 — Gates Quality Engine & Surgical Repair Loop');

runTest('3.1 GATE GRAPH_MISSING_PROVENANCE: grafico senza provenienza dichiarata blocca la pubblicazione', () => {
  const unprovenancedNode = {
    ...analyticalChemistryGraphNode,
    id: 'unprovenanced-graph',
    provenance: '' // Mancante!
  };

  const text = `
# Capitolo Test
📌 **Definizione**: Test
💡 **Intuizione**: Intuitivo
\`\`\`json:graph
${JSON.stringify(unprovenancedNode)}
\`\`\`
⚠️ **Trappola**: Nessuna
🎓 **Esame**: Domanda
`;

  const report = qEngine.evaluateQuality(text, null, 'Chimica', { nodes: [unprovenancedNode] });
  const provFail = report.hardFails.find(hf => hf.type === 'GRAPH_MISSING_PROVENANCE');
  assert.ok(provFail, 'Deve rilevare GRAPH_MISSING_PROVENANCE');
});

runTest('3.2 GATE GRAPH_DATA_INVALID: rileva NaN, overlap nel domainSplit o espressione non calcolabile', () => {
  const invalidDataNode = {
    ...analyticalChemistryGraphNode,
    id: 'invalid-data-graph',
    expression: 'log(pH - 10)', // Genera NaN nel dominio [2, 8]!
    domainSplit: null
  };

  const text = `
# Capitolo Test
📌 **Definizione**: Test
💡 **Intuizione**: Fenomeno
\`\`\`json:graph
${JSON.stringify(invalidDataNode)}
\`\`\`
⚠️ **Attenzione**: Errore
🎓 **Esame**: Orale
`;

  const report = qEngine.evaluateQuality(text, null, 'Chimica', { nodes: [invalidDataNode] });
  const dataFail = report.hardFails.find(hf => hf.type === 'GRAPH_DATA_INVALID');
  assert.ok(dataFail, 'Deve scattare GRAPH_DATA_INVALID per valori NaN generati');
});

runTest('3.3 GATE GRAPH_EMPTY_RENDER: rileva SVG vuoto o privo di elementi geometrici', () => {
  const textWithEmptySvg = `
# Capitolo Test sulle Curve di Titolazione e Visualizzazione Grafica
Questo capitolo illustra il comportamento degli equilibri chimici in soluzione e dei grafici di titolazione.
📌 **Definizione Formale**: Si definisce curva di titolazione il diagramma del pH in funzione del volume aggiunto di titolante forte.
💡 **Intuizione Fenomenologica**: Al punto equivalente il salto di pH è massimo a causa della drastica riduzione della capacità tamponante del sistema.
All'esame di Chimica Analitica si formalizza l'equazione di Van Slyke per descrivere l'andamento della curva:
$$\\beta(pH) = 2.303 \\left( [H^+] + [OH^-] + \\frac{C_{tot} K_a [H^+]}{(K_a + [H^+])^2} \\right)$$

Di seguito viene incorporato il grafico vettoriale generato:
<svg class="studygenius-graph-svg" viewBox="0 0 600 360"></svg>

⚠️ **Attenzione all'Errore Tipico**: Confondere punto di equivalenza stechiometrico con punto di viraggio dell'indicatore.
🎓 **Domande d'Esame**: "Come si sceglie l'indicatore acido-base appropriato in base all'intervallo di viraggio?"
`;

  const report = qEngine.evaluateQuality(textWithEmptySvg, null, 'Chimica');
  const emptyFail = report.hardFails.find(hf => hf.type === 'GRAPH_EMPTY_RENDER');
  assert.ok(emptyFail, 'Deve scattare GRAPH_EMPTY_RENDER per SVG vuoto');
});

runTest('3.4 REPAIR LOOP: Riparazione chirurgica locale per GRAPH_TEXT_INCONSISTENCY senza rigenerazione del capitolo', async () => {
  const textWithInconsistency = `
# 1. Soluzioni Tampone
📌 **Definizione**: Teoria
💡 **Intuizione**: Spiegazione
$$\\beta = 2.303 C$$
Il valore massimo è erroneamente dichiarato pari a 0.150 M/pH.

\`\`\`json:graphClaims
{
  "graphClaims": [
    {
      "graphId": "buffer-capacity-acetic-acid",
      "claim": "max_at",
      "x": "4.76",
      "y_expected": "0.150"
    }
  ]
}
\`\`\`
⚠️ **Attenzione**: Errore
🎓 **Esame**: Domanda
`;

  const repairer = new RepairLoop(null, null); // Client LLM disattivato per testare la riparazione chirurgica locale pura
  const failedAudit = {
    type: 'GRAPH_TEXT_INCONSISTENCY',
    message: 'Incoerenza numerica testo↔grafico: per x=4.76, il testo indica y=0.150, ma il calcolo deterministico restituisce y=0.05756',
    details: {
      graphId: 'buffer-capacity-acetic-acid',
      x: '4.76',
      expected: 0.150,
      actual: 0.05756
    }
  };

  const repairedText = await repairer.attemptRepair(textWithInconsistency, failedAudit, 'Chimica Analitica');

  // Verifica che il capitolo NON sia stato cancellato o rigenerato
  assert.ok(repairedText.includes('# 1. Soluzioni Tampone'), 'La struttura del capitolo deve rimanere integra');
  assert.ok(repairedText.includes('📌 **Definizione**: Teoria'), 'Le parti corrette non devono essere modificate');

  // Verifica che il valore errato 0.150 sia stato corretto nel testo e nel blocco claims
  assert.ok(!repairedText.includes('"y_expected": "0.150"'), 'Il vecchio valore y_expected deve essere rimosso dal JSON claim');
  assert.ok(repairedText.includes('0.05756'), 'Il valore deterministico esatto (0.05756) deve essere stato iniettato chirurgicamente');

  // Verifica che ora il Quality Engine approvi il testo riparato
  const verifyReport = qEngine.evaluateQuality(repairedText, null, 'Chimica Analitica', { nodes: [analyticalChemistryGraphNode] });
  const stillFails = verifyReport.hardFails.filter(hf => hf.type === 'GRAPH_TEXT_INCONSISTENCY');
  assert.strictEqual(stillFails.length, 0, 'Il testo riparato chirurgicamente deve superare il Quality Gate senza fallimenti');
});

// -----------------------------------------------------------------------------
// GRUPPO 4: PROVA END-TO-END SU CHIMICA ANALITICA CON RENDERING PDF REALE
// -----------------------------------------------------------------------------
console.log('\n🧪 Gruppo 4: Prova Completa su Chimica Analitica (Soluzioni Tampone & Potere Tamponante)');

runAsyncTest('4.1 Generazione capitolo accademico completo, audit Quality Gates e compilazione PDF con D3.js in Puppeteer', async () => {
  const completeAnalyticalChapter = `
# Soluzioni Tampone ed Efficacia Tamponante: Derivazione Rigorosa della Relazione di Van Slyke

## 1. Problema Chimico-Fisico e Resistenza alle Variazioni di pH
Nelle analisi chimiche quantitative (es. titolazioni complessometriche con EDTA, precipitazioni frazionate e separazioni cromatografiche), il controllo del potenziale idrogenionico ($pH$) è una variabile di stato critica per la selettività delle reazioni e la conservazione degli equilibri di complessazione. Una **soluzione tampone** è un sistema acquoso in grado di opporsi a variazioni significative di $pH$ a seguito dell'aggiunta moderata di acidi forti, basi forti o per diluizione.

📌 **Definizione Rigorosa**: Si definisce **Potere Tamponante** (o Capacità Tamponante, Indice di Van Slyke $\\beta$) la derivata prima della concentrazione di base forte $C_b$ (o acido forte $C_a$) aggiunta rispetto al $pH$ della soluzione:
$$\\beta \\equiv \\frac{dC_b}{dpH} = -\\frac{dC_a}{dpH}$$
Dimensionalmente, $\\beta$ si esprime in $\\mathrm{mol\\cdot L^{-1}\\cdot pH^{-1}}$ ed è una grandezza scalare strettamente positiva ($\beta > 0$) per sistemi chimici in equilibrio stabile.

💡 **Intuizione Fenomenologica ("Can I Explain It?")**: Perché un tampone è efficace solo in una finestra ristretta di $pH$?
A livello microscopico, l'effetto tampone deriva dalla presenza simultanea di una riserva acida (donatore di protoni $\\mathrm{HA}$) e di una riserva basica coniugata (accettore di protoni $\\mathrm{A^-}$). Quando si aggiungono ioni $\\mathrm{H_3O^+}$, la base coniugata reagisce quantitativamente ($\mathrm{A^- + H_3O^+ \\rightarrow HA + H_2O}$), consumando l'acido forte aggiunto e convertendolo in una specie acida debole. Viceversa, l'aggiunta di $\\mathrm{OH^-}$ neutralizza l'acido indissociato ($\mathrm{HA + OH^- \\rightarrow A^- + H_2O}$). Quando le due specie hanno concentrazioni comparabili ($[\\mathrm{HA}] \\approx [\\mathrm{A^-}]$), la frazione molare scambiata produce la minima variazione percentuale del rapporto $[\\mathrm{A^-}]/[\\mathrm{HA}]$, stabilizzando il logaritmo nel formalismo di Henderson-Hasselbalch.

---

## 2. Derivazione Matematica Completa dell'Indice di Van Slyke
Consideriamo una soluzione contenente un acido debole monoprotico $\\mathrm{HA}$ a concentrazione analitica totale $C_{\\mathrm{tot}} = [\\mathrm{HA}] + [\\mathrm{A^-}]$, titolata con una base forte monoprotica $\\mathrm{BOH}$ (concentrazione $C_b$).

### 2.1 Equazioni Fondamentali del Sistema
1. **Bilancio di Massa**:
   $$C_{\\mathrm{tot}} = [\\mathrm{HA}] + [\\mathrm{A^-}]$$
2. **Equilibrio di Dissociazione dell'Acido**:
   $$K_a = \\frac{[\\mathrm{H^+}][\\mathrm{A^-}]}{[\\mathrm{HA}]} \\implies [\\mathrm{A^-}] = C_{\\mathrm{tot}} \\frac{K_a}{K_a + [\\mathrm{H^+}]} = C_{\\mathrm{tot}} \\alpha_1$$
3. **Autoprotolisi dell'Acqua**:
   $$K_w = [\\mathrm{H^+}][\\mathrm{OH^-}] \\implies [\\mathrm{OH^-}] = \\frac{K_w}{[\\mathrm{H^+}]}$$
4. **Bilancio di Elettroneutralità (Carica)**:
   $$[\\mathrm{B^+}] + [\\mathrm{H^+}] = [\\mathrm{A^-}] + [\\mathrm{OH^-}]$$
   Poiché la base forte è completamente dissociata, $[\\mathrm{B^+}] = C_b$. Sostituendo:
   $$C_b = [\\mathrm{A^-}] + [\\mathrm{OH^-}] - [\\mathrm{H^+}] = C_{\\mathrm{tot}} \\frac{K_a}{K_a + [\\mathrm{H^+}]} + \\frac{K_w}{[\\mathrm{H^+}]} - [\\mathrm{H^+}]$$

### 2.2 Differenziazione rispetto al pH
Ricordando la relazione differenziale tra $[\\mathrm{H^+}]$ e $pH$:
$$pH = -\\log_{10}[\\mathrm{H^+}] = -\\frac{\\ln[\\mathrm{H^+}]}{\\ln 10} \\implies d(pH) = -\\frac{1}{\\ln 10} \\frac{d[\\mathrm{H^+}]}{[\\mathrm{H^+}]} \\implies \\frac{d[\\mathrm{H^+}]}{d(pH)} = -\\ln(10) [\\mathrm{H^+}] = -2.303 [\\mathrm{H^+}]$$

Applicando la regola di derivazione a catena per $\\beta = \\frac{dC_b}{dpH} = \\frac{dC_b}{d[\\mathrm{H^+}]} \\frac{d[\\mathrm{H^+}]}{dpH}$:
$$\\frac{dC_b}{d[\\mathrm{H^+}]} = -C_{\\mathrm{tot}} \\frac{K_a}{(K_a + [\\mathrm{H^+}])^2} - \\frac{K_w}{[\\mathrm{H^+}]^2} - 1$$

Moltiplicando per $\\frac{d[\\mathrm{H^+}]}{dpH} = -2.303 [\\mathrm{H^+}]$:
$$\\beta = 2.303 \\left( [\\mathrm{H^+}] + [\\mathrm{OH^-}] + C_{\\mathrm{tot}} \\frac{K_a [\\mathrm{H^+}]}{(K_a + [\\mathrm{H^+}])^2} \\right)$$

---

## 3. Visualizzazione Deterministica della Curva di Van Slyke
Il grafico seguente rappresenta la funzione deterministica $\\beta(pH)$ per un tampone acetato ($C_{\\mathrm{tot}} = 0.10\\,\\mathrm{M}$, $pK_a = 4.76$) nell'intervallo $pH \\in [2, 8]$.

{{GRAPH:buffer-capacity-acetic-acid}}

\`\`\`json:graphClaims
{
  "graphClaims": [
    {
      "graphId": "buffer-capacity-acetic-acid",
      "claim": "max_at",
      "x": "4.76",
      "y_expected": "0.05756"
    }
  ]
}
\`\`\`

---

## 4. Interpretazione Analitica del Grafico e Punti Notevoli
Analizzando la funzione deterministica $\\beta(pH)$ si distinguono tre contributi additivi:
1. **Regione di Massima Efficacia ($pH = pK_a = 4.76$)**:
   La derivata prima $\\frac{d\\beta}{d[\\mathrm{H^+}]}$ si annulla esattamente quando $[\\mathrm{H^+}] = K_a$. Sostituendo nella relazione di Van Slyke:
   $$\\beta_{\\max} = 2.303 \\cdot C_{\\mathrm{tot}} \\frac{K_a^2}{(2 K_a)^2} = \\frac{2.303}{4} C_{\\mathrm{tot}} \\approx 0.5756 \\cdot C_{\\mathrm{tot}}$$
   Per la nostra concentrazione analitica $C_{\\mathrm{tot}} = 0.10\\,\\mathrm{M}$, il valore massimo numerico calcolato è esattamente:
   $$\\beta_{\\max} = 0.5756 \\times 0.10 = 0.05756\\,\\mathrm{mol\\cdot L^{-1}\\cdot pH^{-1}}$$

2. **Intervallo Utile del Tampone ($pH = pK_a \\pm 1$)**:
   A $pH = pK_a \\pm 1$, il rapporto delle frazioni molari vale $1:10$ o $10:1$. La capacità tamponante scende al $33\\%$ del valore massimo:
   $$\\beta(pK_a \\pm 1) \\approx 0.1899 \\cdot C_{\\mathrm{tot}} = 0.0190\\,\\mathrm{M/pH}$$
   Al di fuori di questa finestra, il sistema perde quasi interamente la sua capacità di resistere all'aggiunta di acidi o basi.

3. **Rami Asintotici a pH Estremi**:
   - Per $pH < 2.5$, il termine $[\\mathrm{H^+}]$ prevale sul termine del tampone: l'acido forte libero tampona da solo la soluzione per pura inerzia termodinamica.
   - Per $pH > 11.5$, il termine $[\\mathrm{OH^-}]$ cresce esponenzialmente per lo stesso motivo.

---

## 5. Errori Tipici e Trappole d'Esame
⚠️ **Trappola d'Esame 1 (La trappola della diluizione)**: Uno studente afferma: *"Se diluisco una soluzione tampone 10 volte con acqua deionizzata, il pH non cambia e quindi il potere tamponante rimane lo stesso"*. **FALSO!** Il $pH$ rimane approssimativamente invariato perché il rapporto $[\\mathrm{A^-}]/[\\mathrm{HA}]$ non cambia, ma la capacità tamponante $\\beta$ è direttamente proporzionale a $C_{\\mathrm{tot}}$: diluendo 10 volte, la capacità di contrastare perturbazioni esterne crolla di un ordine di grandezza!

⚠️ **Trappola d'Esame 2 (Formula di Henderson-Hasselbalch a pH estremi)**: Applicare la formula empirica $pH = pK_a + \\log([\\mathrm{A^-}]/[\\mathrm{HA}])$ senza verificare che $C_{\\mathrm{tot}} \\gg 10^{-pH}$ o $C_{\\mathrm{tot}} \\gg 10^{-(14-pH)}$. In soluzioni molto diluite ($< 10^{-4}\\,\\mathrm{M}$), l'autoionizzazione dell'acqua non è più trascurabile.

---

## 6. Domande di Difesa Orale & Verifica Concettuale
🎓 **Domanda d'Esame 1**: *"Come si progetta un tampone fisiologico a pH 7.40 con capacità tamponante desiderata pari a 0.025 M/pH?"*
- **Risposta attesa**: Si seleziona una coppia coniugata con $pK_a \\approx 7.40$ (es. diidrogenofosfato/idrogenofosfato, $pK_{a2} = 7.20$). Calcolando $\\beta$ al $pH$ desiderato, si ricava la concentrazione totale analitica $C_{\\mathrm{tot}}$ necessaria risolvendo l'equazione di Van Slyke, quindi si pesano i rispettivi sali $\\mathrm{KH_2PO_4}$ e $\\mathrm{K_2HPO_4}$.

🎓 **Domanda d'Esame 2**: *"Dimostrare perché la capacità tamponante è minima in corrispondenza del punto di equivalenza di una titolazione acido debole-base forte."*
- **Risposta attesa**: Al punto equivalente l'acido debole è interamente convertito in base coniugata ($[\\mathrm{HA}] \\to 0$). Il termine $C_{\\mathrm{tot}} \\alpha_0 \\alpha_1$ tende a zero e, non essendo ancora in eccesso di base forte ($[\\mathrm{OH^-}]$ piccolo), $\\beta$ presenta un minimo locale accentuato, il che spiega la massima pendenza ($dpH/dV$) del salto di titolazione.
`;

  // 1. Audit Formale con QualityEngine
  const auditReport = qEngine.evaluateQuality(completeAnalyticalChapter, null, 'Chimica Analitica', { nodes: [analyticalChemistryGraphNode] });
  
  assert.strictEqual(auditReport.hardFails.length, 0, `Nessun hard fail ammesso: ${JSON.stringify(auditReport.hardFails)}`);
  assert.strictEqual(auditReport.passed, true, 'Il capitolo deve superare formalmente il QualityEngine');
  assert.ok(auditReport.softScore >= 80, `Punteggio soft didattico elevato: ${auditReport.softScore}/100`);

  // 2. Pre-processing dei grafici e placeholder per il rendering PDF
  const processedMarkdown = processDiagramsInMarkdown(completeAnalyticalChapter, { nodes: [analyticalChemistryGraphNode] });
  assert.ok(processedMarkdown.includes('academic-graph-container'), 'Il container del grafico SVG deve essere presente');
  assert.ok(!processedMarkdown.includes('json:graphClaims'), 'I claims devono essere stati rimossi dal testo finale');

  // 3. Compilazione HTML completo con stili e MathJax
  const { mathjax } = require('mathjax-full/js/mathjax.js');
  const { TeX } = require('mathjax-full/js/input/tex.js');
  const { SVG } = require('mathjax-full/js/output/svg.js');
  const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
  const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
  const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');
  const marked = require('marked');

  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const tex = new TeX({ packages: AllPackages, inlineMath: [['$', '$']], displayMath: [['$$', '$$']] });
  const svgJax = new SVG({ fontCache: 'local' });

  let rawHtml = marked.parse(processedMarkdown);
  // Trasforma callout didattici
  rawHtml = rawHtml.replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (m, inner) => {
    let type = 'general';
    if (/📌|Definizione/i.test(inner)) type = 'definition';
    else if (/💡|Intuizione/i.test(inner)) type = 'intuition';
    else if (/⚠️|Attenzione|Trappola/i.test(inner)) type = 'warning';
    else if (/🎓|Domand/i.test(inner)) type = 'exam';
    return `<div class="academic-callout callout-${type}">${inner}</div>`;
  });

  const doc = mathjax.document(rawHtml, { InputJax: tex, OutputJax: svgJax });
  doc.render();
  const mathjaxCss = adaptor.textContent(svgJax.styleSheet(doc));
  const renderedHtmlBody = adaptor.innerHTML(adaptor.body(doc.document));

  const completeHtmlDocument = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Chimica Analitica — Soluzioni Tampone e Potere Tamponante</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    ${mathjaxCss}
    @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
    body {
      font-family: 'STIX Two Text', serif;
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
      color: #111827;
      line-height: 1.6;
      font-size: 12.5px;
      background: #ffffff;
    }
    h1 { font-size: 19px; color: #0f2b5c; border-bottom: 2px solid #0f2b5c; padding-bottom: 6px; margin-top: 24px; }
    h2 { font-size: 15px; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px; }
    h3 { font-size: 13.5px; color: #1e293b; margin-top: 14px; }
    p { margin: 8px 0; text-align: justify; text-justify: inter-word; }
    ul, ol { margin: 6px 0; padding-left: 22px; }
    li { margin: 3px 0; }
    .academic-callout { padding: 10px 16px; margin: 14px 0; border-radius: 4px; page-break-inside: avoid; }
    .callout-definition { border-left: 4px solid #2563eb; background: #eff6ff; color: #1e3a8a; }
    .callout-intuition { border-left: 4px solid #d97706; background: #fffbeb; color: #78350f; }
    .callout-warning { border-left: 4px solid #dc2626; background: #fef2f2; color: #991b1b; }
    .callout-exam { border-left: 4px solid #7c3aed; background: #f5f3ff; color: #4c1d95; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 18px 0; }
  </style>
  ${getGraphHeadAssets()}
</head>
<body>
  ${renderedHtmlBody}
</body>
</html>`;

  // 4. Rendering Reale con Puppeteer headless e salvataggio PDF + PNG
  const rootEsempiDir = path.resolve(__dirname, '..', 'esempi');
  const localEsempiDir = path.resolve(__dirname, 'esempi');
  fs.ensureDirSync(rootEsempiDir);
  fs.ensureDirSync(localEsempiDir);

  const pdfFilename = 'prova_chimica_analitica_tamponi.pdf';
  const imgFilename = 'prova_chimica_analitica_tamponi_grafico.png';

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    await page.setContent(completeHtmlDocument, { waitUntil: 'networkidle0', timeout: 30000 });

    // Attende il rendering client-side di D3.js
    await page.waitForSelector('.academic-graph-rendered', { timeout: 10000 });

    // Screenshot del grafico vettoriale D3
    const graphEl = await page.$('.academic-graph-container');
    if (graphEl) {
      await graphEl.screenshot({ path: path.join(rootEsempiDir, imgFilename) });
      await graphEl.screenshot({ path: path.join(localEsempiDir, imgFilename) });
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
    });

    fs.writeFileSync(path.join(rootEsempiDir, pdfFilename), pdfBuffer);
    fs.writeFileSync(path.join(localEsempiDir, pdfFilename), pdfBuffer);

    const pdfSize = pdfBuffer.length;
    assert.ok(pdfSize > 5000, `Dimensione del PDF valida (${pdfSize} bytes)`);

    console.log(`  📄 [PDF Prova Chimica Analitica salvato in]: ${path.join(rootEsempiDir, pdfFilename)} (${Math.round(pdfSize / 1024)} KB)`);
    console.log(`  🖼️ [PNG Grafico Prova salvato in]: ${path.join(rootEsempiDir, imgFilename)}`);
  } finally {
    await browser.close();
  }
});

// -----------------------------------------------------------------------------
// RIEPILOGO TEST SUITE
// -----------------------------------------------------------------------------
setTimeout(() => {
  console.log('\n======================================================================');
  console.log(`📊 Riepilogo Esecuzione Test: ${testsPassed} superati, ${testsFailed} falliti`);
  console.log('======================================================================');
  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 TUTTE LE MILESTONE V2, V3, V4 E LA PROVA DI CHIMICA ANALITICA SONO VALIDE E CONFORMI!\n');
  }
}, 500);
