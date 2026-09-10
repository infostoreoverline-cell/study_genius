/**
 * StudyGenius Academic Intelligence System
 * tests/test_vsvp_v2.js
 * 
 * Test suite di verifica per la Validated Scientific Visual Pipeline V2 (VSVP V2):
 * 1. svgGeometryAnalyzer (Rilevamento reale delle collisioni e clearance in Chromium)
 * 2. svgPatchEngine (Applicazione deterministica patch geometriche e leader lines)
 * 3. Sanitizer Path Fill (Risoluzione bug triangolo nero nello schema P&ID)
 * 4. Risoluzione collisione etichette nel diagramma Cavitazione Pompa Centrifuga
 */

'use strict';

const assert = require('assert');
const { analyzeSvgGeometry, releaseBrowserInstance } = require('../src/rendering/svgGeometryAnalyzer');
const { applyStructuredPatches } = require('../src/rendering/svgPatchEngine');
const { fixMissingPathFill, ensureSemanticAttributes, sanitizeSvg } = require('../src/rendering/svgSanitizer');

async function runTests() {
  console.log('🧪 AVVIO TEST SUITE VSVP V2...\n');

  // --------------------------------------------------------------------------
  // TEST 1: Analisi geometrica deterministica (Chromium DOM)
  // --------------------------------------------------------------------------
  console.log('▶ TEST 1: Verifica collision detection su SVG sintetico...');
  const overlappingSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
      <text id="label-alpha" x="100" y="50" font-family="Arial" font-size="16">CONCETTO ALFA</text>
      <text id="label-beta" x="120" y="52" font-family="Arial" font-size="16">CONCETTO BETA</text>
      <text id="label-gamma" x="100" y="150" font-family="Arial" font-size="16">CONCETTO GAMMA</text>
    </svg>
  `;

  const geo1 = await analyzeSvgGeometry(overlappingSvg);
  assert.strictEqual(geo1.valid, true, 'L\'analisi geometrica deve restituire valid=true');
  assert.strictEqual(geo1.collisionCount, 1, 'Deve rilevare esattamente 1 collisione tra label-alpha e label-beta');
  assert.strictEqual(geo1.collisions[0].elementA, 'label-alpha');
  assert.strictEqual(geo1.collisions[0].elementB, 'label-beta');
  console.log('  ✔ Test 1 superato: collisione tra etichette rilevata con successo.\n');

  // --------------------------------------------------------------------------
  // TEST 2: Applicazione deterministica patch geometrica (svgPatchEngine)
  // --------------------------------------------------------------------------
  console.log('▶ TEST 2: Riparazione geometrica tramite svgPatchEngine...');
  const repairs = [
    {
      action: 'REPOSITION_LABEL',
      targetId: 'label-alpha',
      preferredRegion: 'north',
      minimumClearance: 30,
      addLeaderLine: true
    }
  ];

  const patchRes = applyStructuredPatches(overlappingSvg, repairs, geo1);
  assert.strictEqual(patchRes.appliedRepairs.length, 1, 'Deve applicare la patch REPOSITION_LABEL');
  assert.ok(patchRes.patchedSvg.includes('y="20"'), 'La coordinata Y di label-alpha deve essere traslata a y=20');
  assert.ok(patchRes.patchedSvg.includes('class="vsvp-leader-line"'), 'Deve iniettare la leader-line');

  // Verifichiamo che la nuova geometria NON abbia più collisioni!
  const geo2 = await analyzeSvgGeometry(patchRes.patchedSvg);
  assert.strictEqual(geo2.collisionCount, 0, 'Dopo la patch la collisione deve risultare azzerata');
  console.log('  ✔ Test 2 superato: patch geometrica applicata e collisione azzerata.\n');

  // --------------------------------------------------------------------------
  // TEST 3: Risoluzione del bug P&ID (Triangolo nero path mancante fill="none")
  // --------------------------------------------------------------------------
  console.log('▶ TEST 3: Verifica correzione automatica path aperto P&ID...');
  const pidPathGlitch = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
      <!-- Segnale Pneumatico LIC-01 -> Attuatore LV-01 -->
      <path d="M 360 110 L 415 110 L 415 178" stroke="#dc2626" stroke-width="1.6" stroke-dasharray="4 2"/>
    </svg>
  `;

  const fixedPid = fixMissingPathFill(pidPathGlitch);
  assert.ok(fixedPid.includes('fill="none"'), 'Deve aver iniettato fill="none" sul path di segnale');
  assert.ok(!fixedPid.includes('fill="black"'), 'Non deve mai avere fill="black"');
  console.log('  ✔ Test 3 superato: triangolo nero P&ID eliminato deterministicamente.\n');

  // --------------------------------------------------------------------------
  // TEST 4: Verifica sul diagramma reale della Girante Centrifuga (Cavitazione)
  // --------------------------------------------------------------------------
  console.log('▶ TEST 4: Ispezione e distanziamento sul diagramma della girante centrifuga...');
  const cavitationSvgSnippet = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 500" width="850" height="500">
      <circle id="occhio-girante" cx="425" cy="280" r="45" fill="#74b9ff" stroke="#0984e3" stroke-width="2"/>
      <text id="label-occhio" x="425" y="275" text-anchor="middle" font-family="Arial" font-size="11" fill="#0984e3" font-weight="bold">OCCHIO</text>
      <text id="label-girante" x="425" y="290" text-anchor="middle" font-family="Arial" font-size="10" fill="#0984e3">GIRANTE</text>
      <text id="label-cavitazione" x="395" y="275" text-anchor="middle" font-family="Arial" font-size="9" fill="#d63031" font-weight="bold">CAVITAZIONE CLASSICA</text>
    </svg>
  `;

  const geoCav1 = await analyzeSvgGeometry(cavitationSvgSnippet);
  assert.ok(geoCav1.collisionCount > 0, 'Deve rilevare la collisione tra CAVITAZIONE CLASSICA e OCCHIO');

  // Applichiamo la riparazione raccomandata
  const cavRepairs = [
    {
      action: 'REPOSITION_LABEL',
      targetId: 'label-cavitazione',
      preferredRegion: 'north-west',
      minimumClearance: 35,
      addLeaderLine: true
    }
  ];

  const cavPatched = applyStructuredPatches(cavitationSvgSnippet, cavRepairs, geoCav1);
  const geoCav2 = await analyzeSvgGeometry(cavPatched.patchedSvg);
  if (geoCav2.collisionCount > 0) {
    console.log('  Dettaglio collisioni residue:', JSON.stringify(geoCav2.collisions, null, 2));
  }
  assert.strictEqual(geoCav2.collisionCount, 0, 'La collisione nella girante deve essere completamente risolta');
  console.log('  ✔ Test 4 superato: collisione nella girante risolta con successo!\n');

  await releaseBrowserInstance();
  console.log('🎉 TUTTI I 4 TEST DELLA PIPELINE VSVP V2 SONO STATI SUPERATI CON SUCCESSO!');
}

runTests().catch(err => {
  console.error('❌ ERRORE TEST:', err);
  process.exit(1);
});
