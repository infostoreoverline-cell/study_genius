/**
 * StudyGenius Academic Intelligence System
 * src/visual/visualArchitect.js
 *
 * Scientific Visual Architect — Layer Intermediario LLM → Renderer
 *
 * Principio fondamentale: il LLM si comporta da "architetto semantico",
 * non da "disegnatore". Produce una VisualSpec strutturata (entità, leganti,
 * frecce tipizzate, geometrie, annotazioni) che il renderer deterministico
 * trasforma in SVG. Mai SVG grezzo dal LLM.
 *
 * Funnel di routing economico:
 * - QUANTITATIVE_PLOT → deterministico, zero token LLM
 * - TIMELINE, COMPARISON_MATRIX → Flash (basso costo)
 * - CATALYTIC_CYCLE, FLOWSHEET → Gemini Pro (medio)
 * - COORDINATION_COMPLEX, REACTION_MECHANISM, ELECTRON_PATHWAY → DeepSeek (alto)
 */

const crypto = require('crypto');
const { PROVENANCE_CLASSES } = require('../core/schemas');
const { DETECTED_STRUCTURES, CANDIDATE_FORMS, STRATEGIC_DECISIONS } = require('../core/visualCoverage');

// ============================================================================
// ROUTING ROLES
// ============================================================================

const ARCHITECT_ROLES = {
  DETERMINISTIC: 'deterministic',
  FLASH_ECONOMY: 'flash_economy',
  PRO_STANDARD: 'pro_standard',
  DEEPSEEK_CHEMISTRY: 'deepseek_chemistry'
};

function selectArchitectRole(coverageItem = {}) {
  const form = (coverageItem.chosenRepresentation || '').toLowerCase();
  const structure = (coverageItem.detectedStructure || '').toUpperCase();

  if (form === CANDIDATE_FORMS.QUANTITATIVE_PLOT || form === 'quantitative_plot') {
    return ARCHITECT_ROLES.DETERMINISTIC;
  }
  if ([CANDIDATE_FORMS.TIMELINE, CANDIDATE_FORMS.ROADMAP_STEPPER, CANDIDATE_FORMS.COMPARISON_MATRIX,
       CANDIDATE_FORMS.COMPARISON_CARDS, CANDIDATE_FORMS.TYPOGRAPHIC_TABLE,
       CANDIDATE_FORMS.FEATURE_TREE, CANDIDATE_FORMS.TRANS_EFFECT_SERIES].includes(form)) {
    return ARCHITECT_ROLES.FLASH_ECONOMY;
  }
  if ([CANDIDATE_FORMS.CYCLIC_MECHANISM, CANDIDATE_FORMS.FLOWSHEET_BLOCKS,
       CANDIDATE_FORMS.MEMBRANE_CELL_SCHEMA, CANDIDATE_FORMS.REACTION_NETWORK_SVG].includes(form) ||
      [DETECTED_STRUCTURES.CATALYTIC_CYCLE, DETECTED_STRUCTURES.MASS_FLOW,
       DETECTED_STRUCTURES.REACTION_NETWORK].includes(structure)) {
    return ARCHITECT_ROLES.PRO_STANDARD;
  }
  if ([CANDIDATE_FORMS.COORDINATION_DIAGRAM, CANDIDATE_FORMS.MECHANISM_ARROW_PUSHING,
       CANDIDATE_FORMS.ELECTRON_PATHWAY_DIAGRAM].includes(form) ||
      [DETECTED_STRUCTURES.COORDINATION_COMPLEX, DETECTED_STRUCTURES.REACTION_MECHANISM,
       DETECTED_STRUCTURES.ELECTRON_PATHWAY, DETECTED_STRUCTURES.TRANS_EFFECT].includes(structure)) {
    return ARCHITECT_ROLES.DEEPSEEK_CHEMISTRY;
  }
  return ARCHITECT_ROLES.FLASH_ECONOMY;
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

function buildArchitectPrompt(coverageItem, evidence, sourceContext = '') {
  const form = coverageItem.chosenRepresentation || '';
  const concept = coverageItem.label || 'Concetto senza nome';
  const captionText = evidence?.caption?.text || '';
  const observations = (evidence?.qualitativeObservations || []).join('\n- ');

  const baseContext = [
    `CONCETTO: "${concept}"`,
    `RAPPRESENTAZIONE: ${form}`,
    captionText ? `CAPTION: "${captionText}"` : '',
    observations ? `OSSERVAZIONI TIER C:\n- ${observations}` : '',
    sourceContext ? `TESTO SORGENTE:\n${sourceContext}` : ''
  ].filter(Boolean).join('\n');

  const commonRules = `\nREGOLE ASSOLUTE:\n1. NON produrre SVG diretto. Solo JSON strutturato nel blocco \`\`\`json:visual-spec\`\`\`.\n2. Tutti i campi obbligatori devono essere presenti.\n3. La correttezza scientifica viene prima della completezza.`;

  if (form === CANDIDATE_FORMS.COORDINATION_DIAGRAM || form === 'coordination_diagram') {
    return `${baseContext}${commonRules}

COMPITO: Produci una VisualSpec per il complesso di coordinazione.
Serie trans influence: CO(9.5) > H(8) > PR3(7) > I(5) > Br(4.5) > Cl(4) > py(3.5) > NH3(3) > OH(2.5) > H2O(2)

\`\`\`json:visual-spec
{
  "specId": "coord_[SLUG]",
  "specType": "coordination_complex",
  "provenance": "SOURCE_RECONSTRUCTED",
  "didacticFocus": "[cosa capire sulla geometria/ligandi]",
  "examTrap": "[errore tipico d esame]",
  "entities": [{"id":"metal","label":"[Metallo(II/III)]","charge":null,"oxidationState":null,"electronCount":null,"geometry":"square_planar","role":"metal_center"}],
  "ligands": [{"id":"lig_1","formula":"Cl","denticity":1,"transInfluence":4.0,"position":"N"}],
  "arrows": [],
  "annotations": [],
  "readingOrder": ["metal","lig_1"]
}
\`\`\``;
  }

  if (form === CANDIDATE_FORMS.MECHANISM_ARROW_PUSHING || form === 'mechanism_arrow_pushing') {
    return `${baseContext}${commonRules}

COMPITO: Produci una VisualSpec per il meccanismo di reazione organometallica.
Tipi freccia validi: oxidative_addition, reductive_elimination, migratory_insertion, beta_hydride_elimination, ligand_substitution, coordination, decoordination, equilibrium

\`\`\`json:visual-spec
{
  "specId": "mech_[SLUG]",
  "specType": "reaction_mechanism",
  "provenance": "SOURCE_RECONSTRUCTED",
  "didacticFocus": "[meccanismo e cambiamento stato ossidazione]",
  "examTrap": "[errore tipico]",
  "entities": [{"id":"step_1","label":"[specie con carica]","charge":null,"oxidationState":null,"electronCount":null,"role":"intermediate"}],
  "arrows": [{"from":"step_1","to":"step_2","type":"oxidative_addition","label":"[reagente]","curved":false}],
  "annotations": [],
  "readingOrder": ["step_1","step_2"]
}
\`\`\``;
  }

  if (form === CANDIDATE_FORMS.ELECTRON_PATHWAY_DIAGRAM || form === 'electron_pathway_diagram') {
    return `${baseContext}${commonRules}

COMPITO: Produci una VisualSpec per il pathway 16e/18e.
electronCount è OBBLIGATORIO per ogni entità.

\`\`\`json:visual-spec
{
  "specId": "epathway_[SLUG]",
  "specType": "electron_count_pathway",
  "provenance": "SOURCE_RECONSTRUCTED",
  "didacticFocus": "[perche il conteggio governa la reattivita]",
  "examTrap": "[errore tipico sul conteggio]",
  "entities": [{"id":"sp1","label":"[formula]","charge":null,"oxidationState":null,"electronCount":16,"role":"intermediate"}],
  "arrows": [{"from":"sp1","to":"sp2","type":"ligand_substitution","label":"+L","curved":false}],
  "annotations": [{"entityId":"sp1","text":"16e - specie insatura","type":"electron_count"}],
  "readingOrder": ["sp1","sp2"]
}
\`\`\``;
  }

  if (form === CANDIDATE_FORMS.TRANS_EFFECT_SERIES || form === 'trans_effect_series') {
    return `${baseContext}${commonRules}

COMPITO: Produci una VisualSpec per la serie effetto trans.

\`\`\`json:visual-spec
{
  "specId": "trans_effect_[SLUG]",
  "specType": "trans_effect_diagram",
  "provenance": "MODEL_SYNTHESIZED",
  "didacticFocus": "[come predire la sostituzione con la serie]",
  "examTrap": "[confondere trans influence con trans effect cinematico]",
  "entities": [],
  "ligands": [
    {"id":"co","formula":"CO","denticity":1,"transInfluence":9.5,"position":"series_1"},
    {"id":"h","formula":"H-","denticity":1,"transInfluence":8.0,"position":"series_2"},
    {"id":"pr3","formula":"PR3","denticity":1,"transInfluence":7.0,"position":"series_3"},
    {"id":"cl","formula":"Cl-","denticity":1,"transInfluence":4.0,"position":"series_4"},
    {"id":"nh3","formula":"NH3","denticity":1,"transInfluence":3.0,"position":"series_5"},
    {"id":"h2o","formula":"H2O","denticity":1,"transInfluence":2.0,"position":"series_6"}
  ],
  "arrows": [],
  "annotations": [
    {"entityId":"co","text":"pi-accettore: indebolisce il legame trans","type":"trans_influence"}
  ]
}
\`\`\``;
  }

  if (form === CANDIDATE_FORMS.REACTION_NETWORK_SVG || form === 'reaction_network_svg') {
    return `${baseContext}${commonRules}

COMPITO: Produci una VisualSpec per la rete di trasformazione chimica.

\`\`\`json:visual-spec
{
  "specId": "rxnet_[SLUG]",
  "specType": "reaction_network",
  "provenance": "SOURCE_RECONSTRUCTED",
  "didacticFocus": "[topologia della rete e relazioni tra specie]",
  "examTrap": "[errore tipico su prodotti o condizioni]",
  "entities": [
    {"id":"n1","label":"[specie 1]","charge":0,"oxidationState":null,"electronCount":null,"role":"node"},
    {"id":"n2","label":"[specie 2]","charge":0,"oxidationState":null,"electronCount":null,"role":"node"}
  ],
  "arrows": [{"from":"n1","to":"n2","type":"reaction","label":"[condizioni]","curved":false}],
  "annotations": []
}
\`\`\``;
  }

  // Generic
  return `${baseContext}${commonRules}

COMPITO: Produci una VisualSpec per il visuale di tipo "${form}".
Includi entities, arrows, didacticFocus e examTrap nel blocco \`\`\`json:visual-spec\`\`\`.`;
}

// ============================================================================
// VALIDAZIONE DETERMINISTICA
// ============================================================================

function validateVisualSpec(spec) {
  const errors = [];
  const warnings = [];

  if (!spec || typeof spec !== 'object') {
    return { valid: false, errors: ['VisualSpec deve essere un oggetto'], warnings: [] };
  }
  if (!spec.specId) errors.push('specId mancante');
  if (!spec.specType) errors.push('specType mancante');
  if (!spec.provenance) errors.push('provenance mancante');
  if (!spec.didacticFocus) warnings.push('didacticFocus mancante');

  if (spec.specType === 'coordination_complex') {
    const metal = (spec.entities || []).find(e => e.role === 'metal_center');
    if (!metal) errors.push('coordination_complex richiede role=metal_center');
    const ligands = spec.ligands || [];
    if (ligands.length === 0) errors.push('coordination_complex richiede almeno un ligando');
    if (metal?.geometry === 'square_planar' && ligands.length !== 4) {
      warnings.push(`Square planar attende 4 ligandi, trovati: ${ligands.length}`);
    }
    if (metal?.geometry === 'octahedral' && ligands.length !== 6) {
      warnings.push(`Ottaedrico attende 6 ligandi, trovati: ${ligands.length}`);
    }
  }

  if (['reaction_mechanism', 'electron_count_pathway'].includes(spec.specType)) {
    const entities = spec.entities || [];
    const arrows = spec.arrows || [];
    if (entities.length < 2) errors.push('Richiede almeno 2 entità');
    if (arrows.length === 0) errors.push('Richiede almeno una freccia');
    const entityIds = new Set(entities.map(e => e.id));
    for (const a of arrows) {
      if (!entityIds.has(a.from)) errors.push(`Freccia from="${a.from}" punta a entità inesistente`);
      if (!entityIds.has(a.to)) errors.push(`Freccia to="${a.to}" punta a entità inesistente`);
    }
    if (spec.specType === 'electron_count_pathway') {
      const missing = entities.filter(e => e.electronCount == null);
      if (missing.length > 0) warnings.push(`${missing.length} entità senza electronCount`);
    }
  }

  if (spec.specType === 'trans_effect_diagram') {
    const ligands = spec.ligands || [];
    if (ligands.length < 3) warnings.push('Serie effetto trans con meno di 3 ligandi');
  }

  if (spec.specType === 'reaction_network') {
    const entities = spec.entities || [];
    const arrows = spec.arrows || [];
    if (entities.length < 2) errors.push('reaction_network richiede almeno 2 nodi');
    if (arrows.length === 0) errors.push('reaction_network richiede almeno una trasformazione');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// HASH PER CACHE
// ============================================================================

function hashVisualSpec(spec) {
  if (!spec) return 'null_spec';
  const canonical = {
    specType: spec.specType || '',
    entities: (spec.entities || []).map(e => ({ id: e.id, label: e.label, geometry: e.geometry, charge: e.charge })),
    ligands: (spec.ligands || []).map(l => ({ id: l.id, formula: l.formula, position: l.position })),
    arrows: (spec.arrows || []).map(a => ({ from: a.from, to: a.to, type: a.type }))
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex').slice(0, 16);
}

// ============================================================================
// DESIGNER
// ============================================================================

async function designVisualFromEvidence(coverageItem, evidence, aiService, sourceContext = '') {
  const role = selectArchitectRole(coverageItem);

  if (role === ARCHITECT_ROLES.DETERMINISTIC) {
    const spec = {
      specId: `det_${Date.now()}`,
      specType: 'quantitative_plot',
      provenance: PROVENANCE_CLASSES.FORMULA_DERIVED,
      didacticFocus: coverageItem.pedagogicalWhy || 'Analisi quantitativa',
      examTrap: null,
      entities: [],
      arrows: [],
      annotations: [],
      _deterministicSource: true
    };
    return { spec, role, hash: hashVisualSpec(spec), validation: { valid: true, errors: [], warnings: [] } };
  }

  const prompt = buildArchitectPrompt(coverageItem, evidence, sourceContext);

  let rawResponse = '';
  try {
    const modelRole = role === ARCHITECT_ROLES.DEEPSEEK_CHEMISTRY
      ? 'scientific_visual_architect_deepseek'
      : 'scientific_visual_architect';
    rawResponse = await aiService.callGeminiRole(modelRole, prompt);
  } catch (err) {
    return {
      spec: null, role, hash: 'failed',
      validation: { valid: false, errors: [`LLM Architect fallito: ${err.message}`], warnings: [] },
      error: err.message
    };
  }

  const specMatch = rawResponse.match(/```(?:json:visual-spec|visual-spec)\s*\n([\s\S]*?)\n```/);
  if (!specMatch) {
    return {
      spec: null, role, hash: 'parse_failed',
      validation: { valid: false, errors: ['Nessun blocco json:visual-spec nella risposta'], warnings: [] }
    };
  }

  let spec;
  try {
    spec = JSON.parse(specMatch[1].trim());
  } catch (e) {
    return {
      spec: null, role, hash: 'json_failed',
      validation: { valid: false, errors: [`JSON non valido: ${e.message}`], warnings: [] }
    };
  }

  const validation = validateVisualSpec(spec);
  const hash = hashVisualSpec(spec);
  return { spec, role, hash, validation };
}

module.exports = {
  ARCHITECT_ROLES,
  selectArchitectRole,
  designVisualFromEvidence,
  validateVisualSpec,
  hashVisualSpec,
  buildArchitectPrompt
};
