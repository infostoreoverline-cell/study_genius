/**
 * StudyGenius Academic Intelligence System
 * tests/test_visual_architect.js
 *
 * Test Suite Ufficiale di Validazione per Scientific Visual Architect & Chemistry SVG Renderer:
 * 1. Mappa concettuale → roadmap SVG / zero pseudo-visuali ASCII
 * 2. Effetto trans Pt → coordination complex SVG deterministico
 * 3. Geometrie cis/trans, fac/mer → complex renderer
 * 4. Pathway 16e⁻/18e⁻ → electron pathway SVG con badge e color coding
 * 5. Rete di reazione (syngas) → reaction network SVG con nodi e pesi
 * 6. Performance map / Quantitative plot → determinismo e routing zero-token
 * 7. Comparison matrix → degradazione nobile e fallback tipografico
 * 8. Ciclo catalitico organometallico → catalytic cycle SVG circolare
 * 9. VisualArtifactManager: caching idempotente, deduplica per hash, checkpoint
 * 10. diagramEngine: parsing blocchi ```json:visual-spec``` e sostituzione SVG
 */

const assert = require('assert');
const {
  ARCHITECT_ROLES,
  selectArchitectRole,
  validateVisualSpec,
  hashVisualSpec,
  buildArchitectPrompt
} = require('../src/visual/visualArchitect');

const {
  renderFromVisualSpec,
  renderCoordinationComplex,
  renderElectronPathway,
  renderCatalyticCycle,
  renderReactionMechanism,
  renderTransEffectSeries,
  renderReactionNetwork,
  renderFallbackTypographic
} = require('../src/rendering/chemistryRenderer');

const { VisualArtifactManager } = require('../src/rendering/visualArtifactManager');
const { processDiagramsInMarkdown } = require('../src/rendering/diagramEngine');
const { DETECTED_STRUCTURES, CANDIDATE_FORMS } = require('../src/core/visualCoverage');
const { PROVENANCE_CLASSES } = require('../src/core/schemas');

async function runTests() {
  console.log('🧪 AVVIO TEST SUITE: Scientific Visual Architect & Chemistry SVG Renderer\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Errore: ${err.message}\n`);
    }
  }

  // =========================================================================
  // TEST 1: Mappa concettuale e routing deterministico / flash
  // =========================================================================
  test('1. Architectural Routing: Assegnazione corretta dei ruoli AI ed esclusione zero-token', () => {
    const rolePlot = selectArchitectRole({
      chosenRepresentation: CANDIDATE_FORMS.QUANTITATIVE_PLOT
    });
    assert.strictEqual(rolePlot, ARCHITECT_ROLES.DETERMINISTIC, 'Plot quantitativo deve essere deterministico');

    const roleRoadmap = selectArchitectRole({
      chosenRepresentation: CANDIDATE_FORMS.ROADMAP_STEPPER
    });
    assert.strictEqual(roleRoadmap, ARCHITECT_ROLES.FLASH_ECONOMY, 'Roadmap deve usare Flash');

    const roleCycle = selectArchitectRole({
      chosenRepresentation: CANDIDATE_FORMS.CYCLIC_MECHANISM,
      detectedStructure: DETECTED_STRUCTURES.CATALYTIC_CYCLE
    });
    assert.strictEqual(roleCycle, ARCHITECT_ROLES.PRO_STANDARD, 'Ciclo catalitico deve usare Pro Standard');

    const roleCoord = selectArchitectRole({
      chosenRepresentation: CANDIDATE_FORMS.COORDINATION_DIAGRAM,
      detectedStructure: DETECTED_STRUCTURES.COORDINATION_COMPLEX
    });
    assert.strictEqual(roleCoord, ARCHITECT_ROLES.DEEPSEEK_CHEMISTRY, 'Complesso di coordinazione richiede DeepSeek/High reasoning');
  });

  // =========================================================================
  // TEST 2: Effetto trans Pt e serie di influenza trans
  // =========================================================================
  test('2. Effetto Trans Pt(II): VisualSpec e rendering della serie di influenza trans', () => {
    const spec = {
      specId: 'trans_effect_pt',
      specType: 'trans_effect_diagram',
      provenance: PROVENANCE_CLASSES.SOURCE_RECONSTRUCTED,
      didacticFocus: 'La forte influenza trans del CO indebolisce il legame Pt-Cl opposto',
      examTrap: 'Confondere influenza trans (termodinamica) con effetto trans (cinetico)',
      entities: [
        { id: 'CO', label: 'CO', transInfluence: 9.5, position: 0 },
        { id: 'PR3', label: 'PR₃', transInfluence: 7.0, position: 1 },
        { id: 'Cl', label: 'Cl⁻', transInfluence: 4.0, position: 2 },
        { id: 'NH3', label: 'NH₃', transInfluence: 3.0, position: 3 }
      ],
      annotations: [
        { entity: 'CO', text: 'Forte π-accettore', type: 'trans_influence' }
      ]
    };

    const validation = validateVisualSpec(spec);
    assert.strictEqual(validation.valid, true, 'VisualSpec per trans effect deve essere valida');

    const svg = renderTransEffectSeries(spec);
    assert(svg.includes('<svg'), 'Deve produrre un elemento SVG');
    assert(svg.includes('CO'), 'Deve contenere il ligando CO');
    assert(svg.includes('Influenza alta'), 'Deve visualizzare l etichetta dell influenza');
  });

  // =========================================================================
  // TEST 3: Complesso di coordinazione cis/trans e fac/mer
  // =========================================================================
  test('3. Complessi di Coordinazione: Geometria square planar per Cisplatino con ligandi corretti', () => {
    const spec = {
      specId: 'cisplatin_complex',
      specType: 'coordination_complex',
      provenance: PROVENANCE_CLASSES.SOURCE_RECONSTRUCTED,
      didacticFocus: 'Struttura cis-[PtCl2(NH3)2] attiva vs trans inattiva',
      examTrap: 'Disegnare i cloruri in trans porta al farmaco inattivo',
      entities: [
        { id: 'pt', label: 'Pt(II)', geometry: 'square_planar', electronCount: 16, role: 'metal_center' }
      ],
      ligands: [
        { id: 'lig_cl1', formula: 'Cl', denticity: 1, transInfluence: 4.0, position: 'N' },
        { id: 'lig_cl2', formula: 'Cl', denticity: 1, transInfluence: 4.0, position: 'W' },
        { id: 'lig_nh3_1', formula: 'NH₃', denticity: 1, transInfluence: 3.0, position: 'E' },
        { id: 'lig_nh3_2', formula: 'NH₃', denticity: 1, transInfluence: 3.0, position: 'S' }
      ],
      annotations: [
        { entity: 'pt', text: '16e⁻, d⁸', type: 'electron_count' }
      ]
    };

    const validation = validateVisualSpec(spec);
    assert.strictEqual(validation.valid, true, 'VisualSpec cisplatino deve essere valida');

    const svg = renderCoordinationComplex(spec);
    assert(svg.includes('<svg'), 'Deve generare SVG inline');
    assert(svg.includes('Pt(II)'), 'Deve contenere il centro metallico');
    assert(svg.includes('Cl'), 'Deve contenere il ligando cloruro');
    assert(svg.includes('NH₃') || svg.includes('NH3'), 'Deve contenere il ligando ammoniaca');
    assert(svg.includes('16e⁻'), 'Deve visualizzare il badge di conteggio elettronico');
  });

  // =========================================================================
  // TEST 4: Pathway Elettronico (16e⁻ / 18e⁻) con badge colorati
  // =========================================================================
  test('4. Pathway Elettronico: Sequenza 16e⁻ / 18e⁻ con badge e step tipizzati', () => {
    const spec = {
      specId: 'pathway_wilkinson',
      specType: 'electron_count_pathway',
      provenance: PROVENANCE_CLASSES.SOURCE_RECONSTRUCTED,
      didacticFocus: 'Dissociazione ligandistica 16e⁻ -> 14e⁻ prima dell addizione ossidativa di H2',
      examTrap: 'Addizione ossidativa non avviene direttamente sul complesso 16e⁻ saturo',
      entities: [
        { id: 'sp1', label: 'RhCl(PPh₃)₃', electronCount: 16, oxidationState: '+1' },
        { id: 'sp2', label: 'RhCl(PPh₃)₂', electronCount: 14, oxidationState: '+1' },
        { id: 'sp3', label: 'RhH₂Cl(PPh₃)₂', electronCount: 16, oxidationState: '+3' }
      ],
      arrows: [
        { from: 'sp1', to: 'sp2', type: 'ligand_dissociation', label: '- PPh₃' },
        { from: 'sp2', to: 'sp3', type: 'oxidative_addition', label: '+ H₂ (Add. Oss.)' }
      ]
    };

    const validation = validateVisualSpec(spec);
    assert.strictEqual(validation.valid, true, 'VisualSpec pathway deve essere valida');

    const svg = renderElectronPathway(spec);
    assert(svg.includes('<svg'), 'Deve produrre SVG');
    assert(svg.includes('16e⁻'), 'Deve includere badge 16e⁻');
    assert(svg.includes('14e⁻'), 'Deve includere badge 14e⁻');
    assert(svg.includes('RhCl(PPh₃)₃') || svg.includes('RhCl'), 'Deve contenere la specie RhCl');
    assert(svg.includes('chem-arrow-oa') || svg.includes('ea580c'), 'Deve colorare l addizione ossidativa');
  });

  // =========================================================================
  // TEST 5: Rete di Reazione (Syngas / Reforming)
  // =========================================================================
  test('5. Rete di Reazione: Grafo orientato multi-prodotto per Syngas', () => {
    const spec = {
      specId: 'syngas_network',
      specType: 'reaction_network',
      provenance: PROVENANCE_CLASSES.SOURCE_RECONSTRUCTED,
      didacticFocus: 'Bivio cinetico tra metanolo e idrocarburi Fischer-Tropsch in funzione del rapporto H2/CO',
      entities: [
        { id: 'syngas', label: 'CO + H₂ (Syngas)', role: 'feed' },
        { id: 'meoh', label: 'CH₃OH (Metanolo)', role: 'target' },
        { id: 'ft', label: 'Idrocarburi FT', role: 'target' }
      ],
      arrows: [
        { from: 'syngas', to: 'meoh', type: 'main_reaction', label: 'Cu/ZnO/Al₂O₃' },
        { from: 'syngas', to: 'ft', type: 'side_reaction', label: 'Co / Fe' }
      ]
    };

    const svg = renderReactionNetwork(spec);
    assert(svg.includes('<svg'), 'Deve generare SVG');
    assert(svg.includes('Syngas'), 'Deve contenere il nodo di partenza');
    assert(svg.includes('Metanolo') || svg.includes('CH₃OH'), 'Deve contenere il prodotto target');
  });

  // =========================================================================
  // TEST 6: Ciclo Catalitico Organometallico Circolare
  // =========================================================================
  test('6. Ciclo Catalitico Organometallico: Rendering circolare con specie e step', () => {
    const spec = {
      specId: 'cycle_monsanto',
      specType: 'catalytic_cycle_organometallic',
      provenance: PROVENANCE_CLASSES.SOURCE_RECONSTRUCTED,
      didacticFocus: 'L addizione ossidativa di CH3I su [Rh(CO)2I2]- è il rate-determining step',
      examTrap: 'Credere che il CO entri prima dello ioduro di metile',
      entities: [
        { id: 'spA', label: '[Rh(CO)₂I₂]⁻', electronCount: 16, oxidationState: '+1' },
        { id: 'spB', label: '[Rh(CO)₂I₃(CH₃)]⁻', electronCount: 18, oxidationState: '+3' },
        { id: 'spC', label: '[Rh(CO)I₃(COCH₃)]⁻', electronCount: 16, oxidationState: '+3' }
      ],
      arrows: [
        { from: 'spA', to: 'spB', type: 'oxidative_addition', label: '+ CH₃I (RDS)' },
        { from: 'spB', to: 'spC', type: 'insertion', label: 'Migrazione CO' },
        { from: 'spC', to: 'spA', type: 'reductive_elimination', label: '- CH₃COI' }
      ]
    };

    const validation = validateVisualSpec(spec);
    assert.strictEqual(validation.valid, true, 'VisualSpec del ciclo deve essere valida');

    const svg = renderCatalyticCycle(spec);
    assert(svg.includes('<svg'), 'Deve generare SVG');
    assert(svg.includes('circle') || svg.includes('path'), 'Deve includere percorsi geometrici');
    assert(svg.includes('RDS'), 'Deve indicare il rate-determining step');
  });

  // =========================================================================
  // TEST 7: Degradazione Nobile e Fallback Tipografico (NEVER ASCII)
  // =========================================================================
  test('7. Fallback Tipografico: Genera tabella accademica senza codice ASCII né box monospace', () => {
    const brokenSpec = {
      specId: 'spec_corrupted',
      specType: 'coordination_complex',
      didacticFocus: 'Spiegazione del complesso di coordinazione',
      entities: [{ label: 'Specie A' }, { label: 'Specie B' }]
    };

    const fallbackHtml = renderFallbackTypographic(brokenSpec);
    assert(fallbackHtml.includes('academic-noble-degradation') || fallbackHtml.includes('academic-table'), 'Deve usare tabella tipografica accademica');
    assert(!fallbackHtml.includes('├──'), 'Non deve MAI contenere caratteri ASCII ├──');
    assert(!fallbackHtml.includes('└──'), 'Non deve MAI contenere caratteri ASCII └──');
    assert(fallbackHtml.includes('Specie A'), 'Deve preservare il contenuto informativo');
  });

  // =========================================================================
  // TEST 8: VisualArtifactManager Caching e Deduplica Idempotente
  // =========================================================================
  test('8. VisualArtifactManager: Registrazione, deduplica idempotente per hash e stato', () => {
    const manager = new VisualArtifactManager();
    const spec = {
      specId: 'test_hash_1',
      specType: 'coordination_complex',
      entities: [{ id: 'm', label: 'Pt' }]
    };
    const hash = hashVisualSpec(spec);

    // 1. Registra primo artefatto
    const art1 = manager.registerPlanned('item-1', 'capitolo-1', hash, spec);
    assert.strictEqual(art1.status, 'PLANNED');
    assert.strictEqual(art1.specHash, hash);

    // 2. Mark Ready con SVG
    manager.markReady(art1.artifactId, '<svg id="test-ready"></svg>', 'render_hash_abc');
    const updated = manager.get(art1.artifactId);
    assert.strictEqual(updated.status, 'READY');
    assert.strictEqual(typeof updated.renderHash, 'string', 'Deve calcolare l hash del render');
    assert.strictEqual(updated.renderHash.length, 12, 'Hash render atteso di 12 caratteri');

    // 3. Secondo capitolo richiede la stessa figura con stesso hash -> CACHE HIT!
    const art2 = manager.registerPlanned('item-2', 'capitolo-2', hash, spec);
    assert.strictEqual(art2.artifactId, art1.artifactId, 'Deve riutilizzare lo stesso artefatto');
    assert.strictEqual(art2._cacheHit, true, 'Deve segnalare cache hit');

    // 4. Verifica indicizzazione per capitolo
    const chap1Artifacts = manager.getArtifactsForChapter('capitolo-1');
    const chap2Artifacts = manager.getArtifactsForChapter('capitolo-2');
    assert.strictEqual(chap1Artifacts.length, 1);
    assert.strictEqual(chap2Artifacts.length, 1);
  });

  // =========================================================================
  // TEST 9: Dispatcher renderFromVisualSpec con tutti i tipi chimici
  // =========================================================================
  test('9. Dispatcher Centrale renderFromVisualSpec: Riconosce e renderizza tutti i tipi supportati', () => {
    const types = [
      'coordination_complex',
      'electron_count_pathway',
      'catalytic_cycle_organometallic',
      'trans_effect_diagram',
      'reaction_network'
    ];

    for (const specType of types) {
      const spec = {
        specId: `spec_${specType}`,
        specType,
        provenance: PROVENANCE_CLASSES.SOURCE_RECONSTRUCTED,
        didacticFocus: `Test focus for ${specType}`,
        entities: [{ id: 'e1', label: 'E1', geometry: 'square_planar', electronCount: 16 }]
      };

      const result = renderFromVisualSpec(spec);
      assert(result !== null && typeof result === 'string', `Dispatcher deve produrre stringa SVG per ${specType}`);
      assert(result.includes('<svg') || result.includes('academic-table'), `Output deve essere SVG o tabella accademica per ${specType}`);
    }
  });

  // =========================================================================
  // TEST 10: diagramEngine elabora blocchi ```json:visual-spec in Markdown
  // =========================================================================
  test('10. diagramEngine Integrazione: Converte blocchi ```json:visual-spec``` direttamente in SVG inline', () => {
    const rawMarkdown = `
# Sintesi Chimica

Di seguito la struttura del complesso:

\`\`\`json:visual-spec
{
  "specId": "inline_complex",
  "specType": "coordination_complex",
  "provenance": "SOURCE_RECONSTRUCTED",
  "didacticFocus": "Geometria quadrata piana",
  "entities": [
    { "id": "pt", "label": "Pt(II)", "geometry": "square_planar", "electronCount": 16, "role": "metal_center" }
  ],
  "ligands": [
    { "id": "l1", "formula": "Cl", "position": "N" },
    { "id": "l2", "formula": "Cl", "position": "S" },
    { "id": "l3", "formula": "NH3", "position": "E" },
    { "id": "l4", "formula": "NH3", "position": "W" }
  ]
}
\`\`\`

Testo successivo di spiegazione.
    `;

    const processed = processDiagramsInMarkdown(rawMarkdown);
    assert(!processed.includes('```json:visual-spec'), 'Il blocco json:visual-spec non deve rimanere come testo sorgente');
    assert(processed.includes('<svg'), 'Il blocco deve essere sostituito con SVG inline');
    assert(processed.includes('Pt(II)'), 'SVG inline deve contenere Pt(II)');
    assert(processed.includes('Testo successivo di spiegazione'), 'Il markdown circostante deve essere preservato');
  });

  console.log(`\n🏁 RISULTATO TEST SUITE: ${passedTests}/${totalTests} test superati con successo.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
