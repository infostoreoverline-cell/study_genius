/**
 * StudyGenius Academic Intelligence System
 * diff_regression.js
 * 
 * Script di regressione leggero per confrontare due versioni di output
 * prima e dopo una modifica ai prompt o al pipeline.
 * 
 * Uso:
 *   node diff_regression.js [fileVecchio.md] [fileNuovo.md]
 */

const fs = require('fs');
const path = require('path');

function analyzeText(text) {
  const words = (text.match(/\b\w+\b/g) || []).length;
  const chars = text.length;
  const displayMath = (text.match(/\$\$[\s\S]+?\$\$/g) || []).length;
  const inlineMath = (text.match(/\$[^$\n]+\$/g) || []).length;
  
  // Conteggio espressioni opache (black-box)
  const blackBoxRegexes = [
    /\bè ovvio che\b/gi,
    /\bè evidente che\b/gi,
    /\bè banale\b/gi,
    /\bper simmetria si ha\b/gi,
    /\bfacendo i calcoli\b/gi,
    /\bsi ottiene facilmente\b/gi
  ];
  let blackBoxHits = 0;
  for (const r of blackBoxRegexes) {
    const m = text.match(r);
    if (m) blackBoxHits += m.length;
  }

  // Conteggio callout semantici
  const callouts = {
    definizione: (text.match(/📌|\*\*Definizione/gi) || []).length,
    intuizione: (text.match(/💡|\*\*Intuizione/gi) || []).length,
    teorema: (text.match(/📐|\*\*Teorema/gi) || []).length,
    trappola: (text.match(/⚠️|\*\*Attenzione|\btrappol/gi) || []).length,
    schemaMentale: (text.match(/🧠|\*\*Schema Mentale/gi) || []).length,
    coerenza: (text.match(/🔍|\*\*Controllo di Coerenza/gi) || []).length,
    formulario: (text.match(/📋|\*\*Formulario/gi) || []).length,
    domandeEsame: (text.match(/🎓|\*\*Domande d'Esame/gi) || []).length
  };

  const totalCallouts = Object.values(callouts).reduce((a, b) => a + b, 0);

  return {
    words,
    chars,
    displayMath,
    inlineMath,
    totalMath: displayMath + inlineMath,
    blackBoxHits,
    callouts,
    totalCallouts
  };
}

function compareTexts(nameA, textA, nameB, textB) {
  const statA = analyzeText(textA);
  const statB = analyzeText(textB);

  console.log(`\n📊 CONFRONTO DI REGRESSIONE DIDATTICA:`);
  console.log(`   [A] ${nameA}`);
  console.log(`   [B] ${nameB}\n`);

  console.log('Metrica                          [A] Vecchio      [B] Nuovo        Differenza');
  console.log('-----------------------------------------------------------------------------');
  printRow('Caratteri totali', statA.chars, statB.chars);
  printRow('Parole totali', statA.words, statB.words);
  printRow('Formule in blocco ($$)', statA.displayMath, statB.displayMath);
  printRow('Formule in linea ($)', statA.inlineMath, statB.inlineMath);
  printRow('Frasi Black-Box (vietate)', statA.blackBoxHits, statB.blackBoxHits, true);
  printRow('Callout Didattici Totali', statA.totalCallouts, statB.totalCallouts);
  printRow('  - Definizioni (📌)', statA.callouts.definizione, statB.callouts.definizione);
  printRow('  - Intuizioni (💡)', statA.callouts.intuizione, statB.callouts.intuizione);
  printRow('  - Trappole d\'Esame (⚠️)', statA.callouts.trappola, statB.callouts.trappola);
  printRow('  - Schemi Mentali (🧠)', statA.callouts.schemaMentale, statB.callouts.schemaMentale);
  printRow('  - Controlli Coerenza (🔍)', statA.callouts.coerenza, statB.callouts.coerenza);
  printRow('  - Domande d\'Esame (🎓)', statA.callouts.domandeEsame, statB.callouts.domandeEsame);
  console.log('-----------------------------------------------------------------------------');

  if (statB.blackBoxHits < statA.blackBoxHits) {
    console.log('✅ Miglioramento: Frasi black-box ridotte.');
  } else if (statB.blackBoxHits > statA.blackBoxHits) {
    console.log('⚠️ Attenzione: Aumento di frasi opache black-box nel nuovo output.');
  }

  if (statB.totalCallouts > statA.totalCallouts) {
    console.log('✅ Miglioramento: Maggiore densità di box didattici accademici.');
  }
}

function printRow(label, valA, valB, invertGood = false) {
  const diff = valB - valA;
  let diffStr = diff > 0 ? `+${diff}` : `${diff}`;
  if (diff === 0) diffStr = '=';
  console.log(`${label.padEnd(32)} ${String(valA).padEnd(16)} ${String(valB).padEnd(16)} ${diffStr}`);
}

// Esecuzione CLI
const args = process.argv.slice(2);
if (args.length >= 2) {
  const fileA = args[0];
  const fileB = args[1];
  if (fs.existsSync(fileA) && fs.existsSync(fileB)) {
    const textA = fs.readFileSync(fileA, 'utf-8');
    const textB = fs.readFileSync(fileB, 'utf-8');
    compareTexts(path.basename(fileA), textA, path.basename(fileB), textB);
  } else {
    console.error('File non trovati:', fileA, fileB);
  }
} else {
  // Test sintetico dimostrativo
  const sampleOld = `
# Legge di Gauss
Per simmetria si vede che il campo è radiale.
Applicando la formula nota: E = Q / (4 pi eps0 r^2).
Facendo i calcoli si ottiene facilmente il risultato.
`;

  const sampleNew = `
# Legge di Gauss
> 💡 **Intuizione & Senso Fisico:** La simmetria rotazionale sferica attorno al centro impone che il campo non possa avere componenti tangenziali privilegiate.
> 📌 **Definizione Rigorosa:** Il flusso attraverso una sfera di raggio r è definito come:
$$ \\Phi = \\oint_S \\vec{E} \\cdot d\\vec{A} = E(r) 4\\pi r^2 $$
Per la legge di Gauss:
$$ E(r) 4\\pi r^2 = \\frac{Q}{\\varepsilon_0} \\implies E(r) = \\frac{1}{4\\pi\\varepsilon_0}\\frac{Q}{r^2} $$
> ⚠️ **Attenzione / Errore Tipico d'Esame:** Non estrarre E dall'integrale se manca simmetria geometrica.
> 🔍 **Controllo di Coerenza (Dimensionale / Segno / Limiti):** Per $r \\to \\infty$, $E \\to 0$, coerente con una carica isolata.
`;

  compareTexts('Testo Vecchio (Compressivo/Black-Box)', sampleOld, 'Testo Nuovo (Academic Intelligence)', sampleNew);
}
