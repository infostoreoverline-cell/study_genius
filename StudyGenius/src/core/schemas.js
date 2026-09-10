/**
 * StudyGenius Academic Intelligence System
 * src/core/schemas.js
 * 
 * Specifiche dei dati e Schemi JSON formali (Step 0) per l'Architettura Oltre 1000.
 * Definisce i contratti e le funzioni di validazione deterministica per:
 * 1. KnowledgeGraph (v2.0.0)
 * 2. FirstUseContract
 * 3. TeachingBlueprint (v2.0.0)
 * 4. ConceptBlock
 * 5. Violation (Quality Engine Report)
 * 6. RepairRequest
 * 7. ChapterArtifact
 * 8. SemanticReference
 * 9. GraphSpec (v1.0.0)
 * 10. JobState (v3.0.0)
 */

// =============================================================================
// 1. SCHEMI JSON DEFINITIVI
// =============================================================================

const KNOWLEDGE_GRAPH_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "KnowledgeGraph",
  type: "object",
  required: ["schemaVersion", "sessionId", "subject", "nodes", "edges"],
  properties: {
    schemaVersion: { type: "string", enum: ["2.0.0"] },
    sessionId: { type: "string" },
    subject: { type: "string" },
    nodes: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "label", "type", "chapterId"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          type: {
            type: "string",
            enum: ["CONCEPT", "DEFINITION", "LAW", "THEOREM", "FORMULA", "DERIVATION", "EXAMPLE", "EXERCISE", "GRAPH", "SYMBOL"]
          },
          chapterId: { type: "string" },
          content: { type: "string" },
          firstUse: { $ref: "#/definitions/FirstUseContract" },
          sourceRefs: { type: "array" },
          attrs: { type: "object" }
        }
      }
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to", "type"],
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          type: {
            type: "string",
            enum: ["REQUIRES", "DERIVES_FROM", "SPECIAL_CASE_OF", "MOTIVATED_BY", "DEFINED_BY", "ILLUSTRATED_BY", "APPLIES", "DEPENDS_ON", "FOLLOWS"]
          }
        }
      }
    }
  }
};

const FIRST_USE_CONTRACT_SCHEMA = {
  title: "FirstUseContract",
  type: "object",
  required: ["conceptId", "firstUseChapter"],
  properties: {
    conceptId: { type: "string" },
    firstUseChapter: { type: "string" },
    symbol: { type: "string" },
    meaning: { type: "string" },
    requirements: {
      type: "object",
      properties: {
        mustMotivate: { type: "boolean", default: true },
        mustDefine: { type: "boolean", default: true },
        mustInterpret: { type: "boolean", default: true },
        mustExplainBeforeSymbolicUse: { type: "boolean", default: true },
        allowForwardMention: { type: "boolean", default: false }
      }
    },
    pedagogicalPattern: {
      type: "string",
      enum: ["PHENOMENON_FIRST", "PROBLEM_FIRST", "DEFINITION_FIRST_WITH_IMMEDIATE_EQ", "AXIOMATIC"],
      default: "PROBLEM_FIRST"
    }
  }
};

const TEACHING_BLUEPRINT_SCHEMA = {
  title: "TeachingBlueprint",
  type: "object",
  required: ["blueprintVersion", "chapterId", "conceptOrder", "conceptBlocks", "firstUseContracts"],
  properties: {
    blueprintVersion: { type: "string", enum: ["2.0.0"] },
    chapterId: { type: "string" },
    title: { type: "string" },
    learningObjectives: { type: "array", items: { type: "string" } },
    prerequisites: { type: "array", items: { type: "string" } },
    conceptOrder: { type: "array", items: { type: "string" } },
    conceptBlocks: { type: "array" },
    firstUseContracts: { type: "array" },
    notationRegistry: { type: "object" },
    mathRules: { type: "array" },
    derivationPlans: { type: "array" },
    graphPlans: { type: "array" },
    crossReferences: { type: "array" }
  }
};

const CONCEPT_BLOCK_SCHEMA = {
  title: "ConceptBlock",
  type: "object",
  required: ["blockId", "conceptId", "blockType", "content"],
  properties: {
    blockId: { type: "string", pattern: "^[a-zA-Z0-9_\\-]+$" },
    conceptId: { type: "string" },
    blockType: {
      type: "string",
      enum: [
        "MOTIVATION_BRIDGE",
        "FORMAL_DEPENDENCY_UNIT",
        "INTUITION",
        "DERIVATION_STEP",
        "GRAPH_INTERPRETATION",
        "APPLICATION_EXAM_TRAP",
        "CANONICAL_REVIEW",
        "GENERAL_PROSE"
      ]
    },
    stepSignificance: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
    mathOperation: {
      type: "string",
      enum: ["derivative", "integral", "algebra", "substitution", "trig_identity", "vector_identity", "limit"]
    },
    content: { type: "string" },
    references: { type: "array", items: { type: "string" } }
  }
};

const VIOLATION_SCHEMA = {
  title: "Violation",
  type: "object",
  required: ["type", "severity", "scope", "message"],
  properties: {
    type: {
      type: "string",
      enum: [
        "PREREQUISITE_VIOLATION",
        "UNRESOLVED_FIRST_USE",
        "BARE_DEFINITION",
        "UNEXPLAINED_FORMAL_TRANSITION",
        "MISSING_MATH_RULE",
        "INVALID_REFERENCE",
        "GRAPH_TEXT_INCONSISTENCY",
        "GRAPH_MISSING_PROVENANCE",
        "GRAPH_DATA_INVALID",
        "GRAPH_EMPTY_RENDER",
        "SCIENTIFIC_CORRECTION",
        "LATEX_SYNTAX_ERROR",
        "EMPTY_FORMULA_RENDER",
        "LLM_PREAMBLE_LEAK",
        "HIGH_COGNITIVE_DENSITY",
        "DUPLICATE_ACROSS_SESSIONS",
        "DUPLICATE_CANONICAL_EXPLANATION"
      ]
    },
    severity: { type: "string", enum: ["HARD_FAIL", "WARNING"] },
    scope: { type: "string", enum: ["INLINE", "BLOCK", "SECTION", "CHAPTER", "GLOBAL"] },
    targetId: { type: "string" },
    message: { type: "string" },
    details: { type: "object" }
  }
};

const REPAIR_REQUEST_SCHEMA = {
  title: "RepairRequest",
  type: "object",
  required: ["repairId", "scope", "violationType", "targetBlockId", "allowedEdits", "forbiddenEdits"],
  properties: {
    repairId: { type: "string" },
    scope: { type: "string", enum: ["INLINE", "BLOCK", "SECTION", "CHAPTER", "GLOBAL"] },
    violationType: { type: "string" },
    targetBlockId: { type: "string" },
    allowedEdits: { type: "array", items: { type: "string" } },
    forbiddenEdits: { type: "array", items: { type: "string" } },
    context: { type: "object" }
  }
};

const CHAPTER_ARTIFACT_SCHEMA = {
  title: "ChapterArtifact",
  type: "object",
  required: ["chapterId", "contentHash", "status", "blocks"],
  properties: {
    chapterId: { type: "string" },
    title: { type: "string" },
    contentHash: { type: "string" },
    renderHash: { type: "string" },
    status: { type: "string", enum: ["generated", "verified", "repaired", "rendered", "cached"] },
    blocks: { type: "array" },
    rawMarkdown: { type: "string" },
    pdfPath: { type: "string" },
    metrics: { type: "object" },
    pageOffset: { type: "integer" },
    pageCount: { type: "integer" }
  }
};

const SEMANTIC_REFERENCE_SCHEMA = {
  title: "SemanticReference",
  type: "object",
  required: ["refKey", "targetType", "targetId"],
  properties: {
    refKey: { type: "string" },
    targetType: { type: "string", enum: ["CONCEPT", "CHAPTER", "FORMULA", "GRAPH"] },
    targetId: { type: "string" },
    resolvedPresentation: { type: "object" }
  }
};

const GRAPH_SPEC_SCHEMA = {
  title: "GraphSpec",
  type: "object",
  required: ["id", "provenance", "domain", "series"],
  properties: {
    id: { type: "string" },
    provenance: { type: "string", enum: ["FORMULA-derived"] },
    chartType: { type: "string", enum: ["line", "scatter", "distribution"] },
    title: { type: "string" },
    xLabel: { type: "string" },
    yLabel: { type: "string" },
    domain: {
      type: "object",
      required: ["min", "max", "points"],
      properties: {
        min: { type: "number" },
        max: { type: "number" },
        points: { type: "integer" },
        scale: { type: "string", enum: ["linear", "log"] }
      }
    },
    series: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "expression"],
        properties: {
          name: { type: "string" },
          expression: { type: "string" },
          constants: { type: "object" },
          stroke: { type: "string" }
        }
      }
    },
    annotations: { type: "array" }
  }
};

// =============================================================================
// 1.1 VISUAL EVIDENCE & MULTIMODAL TAXONOMY (Pipeline Grafici & Immagini v1.0.0)
// =============================================================================

const VISUAL_TAXONOMY = {
  QUANTITATIVE_PLOT: 'quantitative_plot',
  CONCEPTUAL_DIAGRAM: 'conceptual_diagram',
  TECHNICAL_FIGURE: 'technical_figure',
  SCIENTIFIC_PHOTO: 'scientific_photo',
  DOCUMENTARY_IMAGE: 'documentary_image',
  TABLE: 'table',
  CHEMICAL_STRUCTURE: 'chemical_structure',
  SPECTRUM: 'spectrum',
  CHROMATOGRAM: 'chromatogram',
  MAP: 'map',
  TIMELINE: 'timeline',
  PHASE_DIAGRAM: 'phase_diagram',
  EXPERIMENTAL_APPARATUS: 'experimental_apparatus',
  SURFACE_2D_3D: 'surface_2d_3d',
  MULTI_PANEL: 'multi_panel',
  DECORATIVE: 'decorative',
  UNDETERMINED: 'undetermined',
  // --- CHEMICAL INTELLIGENCE TYPES (v2.0) ---
  COORDINATION_COMPLEX: 'coordination_complex',           // Complessi metallici con geometria (sq. planar, ottaedrico, tetraedrico)
  REACTION_MECHANISM: 'reaction_mechanism',               // Schema a frecce curvilinee con pushing elettronico
  CATALYTIC_CYCLE_ORGANOMETALLIC: 'catalytic_cycle_organometallic', // Ciclo catalitico con step di ossidazione/coordinazione
  ELECTRON_COUNT_PATHWAY: 'electron_count_pathway',       // Pathway 16e⁻/18e⁻ con badge conteggio
  TRANS_EFFECT_DIAGRAM: 'trans_effect_diagram',           // Diagramma effetto trans con serie di influenza
  REACTION_NETWORK: 'reaction_network'                    // Rete di trasformazione (syngas, steam reforming, etc.)
};

const PROVENANCE_CLASSES = {
  SOURCE_EXACT: 'SOURCE_EXACT',
  SOURCE_EXTRACTED: 'SOURCE_EXTRACTED',
  SOURCE_RECONSTRUCTED: 'SOURCE_RECONSTRUCTED',
  MODEL_SYNTHESIZED: 'MODEL_SYNTHESIZED',
  DIGITIZED_APPROXIMATE: 'DIGITIZED_APPROXIMATE',
  FORMULA_DERIVED: 'FORMULA_DERIVED',
  MODEL_SIMULATED: 'MODEL_SIMULATED',
  LLM_INFERRED: 'LLM_INFERRED',
  UNKNOWN: 'UNKNOWN'
};

const CONSISTENCY_STATES = {
  CONFIRMED_BY_SOURCE: 'CONFIRMED_BY_SOURCE',
  SUPPORTED_BY_SOURCE: 'SUPPORTED_BY_SOURCE',
  VISUAL_ONLY: 'VISUAL_ONLY',
  AMBIGUOUS: 'AMBIGUOUS',
  CONFLICT_WITH_SOURCE: 'CONFLICT_WITH_SOURCE'
};

const RECONSTRUCTION_STRATEGIES = {
  PRESERVE_ORIGINAL: 'PRESERVE_ORIGINAL',
  REDRAW_FROM_FORMULA_DATA: 'REDRAW_FROM_FORMULA_DATA',
  DIGITIZE_APPROXIMATE: 'DIGITIZE_APPROXIMATE',
  RECONSTRUCT_CONCEPTUAL: 'RECONSTRUCT_CONCEPTUAL',
  EXCLUDE: 'EXCLUDE'
};

/**
 * 6 strati di qualità visuale separati concettualmente.
 * Ogni violation porta questo strato nel campo `qualityLayer`.
 * Permette azioni di repair differenziate (hard-fail vs warning vs punteggio).
 */
const VISUAL_QUALITY_LAYER = {
  SCIENTIFIC_CORRECTNESS: 'SCIENTIFIC_CORRECTNESS',   // Carica sbagliata, formula errata, freccia semanticamente falsa
  SEMANTIC_CORRECTNESS: 'SEMANTIC_CORRECTNESS',       // Relazione concettuale sbagliata (es. freccia di addizione ossidativa invertita)
  DIDACTIC_QUALITY: 'DIDACTIC_QUALITY',               // Lettura guidata assente, integrazione figura-testo mancante
  EDITORIAL_QUALITY: 'EDITORIAL_QUALITY',             // Testo tagliato, collisioni, densità, page break
  SOURCE_FIDELITY: 'SOURCE_FIDELITY',                 // Figura sorgente distrutta senza giustificazione
  COVERAGE_COMPLETENESS: 'COVERAGE_COMPLETENESS'      // Visuale pianificato nella Coverage Matrix ma assente
};

const VISUAL_EVIDENCE_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "VisualEvidence",
  type: "object",
  required: ["figureId", "source", "classification", "provenance"],
  properties: {
    figureId: { type: "string" },
    source: {
      type: "object",
      required: ["fileHash", "page", "bbox"],
      properties: {
        fileHash: { type: "string" },
        page: { type: "integer", minimum: 1 },
        bbox: {
          type: "array",
          items: { type: "number" },
          minItems: 4,
          maxItems: 4
        }
      }
    },
    classification: {
      type: "object",
      required: ["type", "confidence"],
      properties: {
        type: {
          type: "string",
          enum: Object.values(VISUAL_TAXONOMY)
        },
        subtype: { type: ["string", "null"] },
        confidence: { type: "number", minimum: 0, maximum: 1 }
      }
    },
    caption: {
      type: "object",
      properties: {
        text: { type: ["string", "null"] },
        source: { type: "string", enum: ["page_text", "adjacent_caption", "llm_inferred", "none"] },
        confidence: { type: "number", minimum: 0, maximum: 1 }
      }
    },
    axes: {
      type: ["object", "null"],
      properties: {
        x: {
          type: "object",
          properties: {
            label: { type: ["string", "null"] },
            unit: { type: ["string", "null"] },
            scale: { type: "string", enum: ["linear", "log", "qualitative", "unspecified"] },
            confidence: { type: "number", minimum: 0, maximum: 1 }
          }
        },
        y: {
          type: "object",
          properties: {
            label: { type: ["string", "null"] },
            unit: { type: ["string", "null"] },
            scale: { type: "string", enum: ["linear", "log", "qualitative", "unspecified"] },
            confidence: { type: "number", minimum: 0, maximum: 1 }
          }
        }
      }
    },
    series: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          representation: { type: "string", enum: ["points", "line", "bars", "surface", "region", "other"] },
          provenance: { type: "string", enum: Object.values(PROVENANCE_CLASSES) },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        }
      }
    },
    qualitativeObservations: {
      type: "array",
      items: { type: "string" }
    },
    explicitValues: { type: "array" },
    estimatedValues: { type: "array" },
    formulaLinks: {
      type: "array",
      items: {
        type: "object",
        required: ["formula", "status"],
        properties: {
          formula: { type: "string" },
          status: { type: "string", enum: Object.values(CONSISTENCY_STATES) },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        }
      }
    },
    uncertainty: {
      type: "object",
      properties: {
        errorBarsPresent: { type: "boolean" },
        confidenceBandPresent: { type: "boolean" },
        notes: { type: ["string", "null"] }
      }
    },
    ambiguities: {
      type: "array",
      items: { type: "string" }
    },
    reconstructionStrategy: {
      type: "string",
      enum: Object.values(RECONSTRUCTION_STRATEGIES),
      default: "PRESERVE_ORIGINAL"
    },
    provenance: {
      type: "string",
      enum: Object.values(PROVENANCE_CLASSES)
    },
    requiresReview: { type: "boolean" }
  }
};

// =============================================================================
// 1.2 VISUAL SPEC — Contratto intermediario LLM → Renderer (v1.0.0)
// =============================================================================

/**
 * VisualSpec: struttura semantica prodotta dal Scientific Visual Architect.
 * Il LLM produce questo oggetto (mai SVG grezzo) che il renderer deterministico
 * trasforma nell'artefatto grafico finale.
 */
const VISUAL_SPEC_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'VisualSpec',
  type: 'object',
  required: ['specId', 'specType', 'provenance', 'didacticFocus'],
  properties: {
    specId: { type: 'string' },
    specType: {
      type: 'string',
      enum: [
        'coordination_complex', 'reaction_mechanism', 'catalytic_cycle_organometallic',
        'electron_count_pathway', 'trans_effect_diagram', 'reaction_network',
        'quantitative_plot', 'flowsheet_blocks', 'timeline', 'comparison_matrix',
        'conceptual_roadmap', 'cyclic_mechanism'
      ]
    },
    // --- Entità chimiche/concettuali ---
    entities: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },            // es. "[Pt(Cl)₂(NH₃)₂]"
          charge: { type: ['number', 'null'] }, // es. +2, -1, 0
          oxidationState: { type: ['number', 'null'] }, // es. 0, +2, +4
          electronCount: { type: ['number', 'null'] }, // es. 14, 16, 18
          geometry: { type: ['string', 'null'],
            enum: ['square_planar', 'octahedral', 'tetrahedral', 'linear', 'trigonal_bipyramidal', 'square_pyramidal', null]
          },
          role: { type: 'string', enum: ['metal_center', 'ligand', 'substrate', 'product', 'intermediate', 'catalyst', 'node'] }
        }
      }
    },
    // --- Ligandi per complessi di coordinazione ---
    ligands: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          formula: { type: 'string' },          // es. "Cl", "PPh₃", "CO"
          denticity: { type: 'integer', minimum: 1 }, // monodentato=1, bidentato=2...
          transInfluence: { type: 'number', minimum: 0, maximum: 10 }, // 0=basso, 10=altissimo
          position: { type: 'string' }          // 'N'|'S'|'E'|'W'|'axial_1'|'axial_2'|'equatorial_1'...
        }
      }
    },
    // --- Frecce semantiche ---
    arrows: {
      type: 'array',
      items: {
        type: 'object',
        required: ['from', 'to', 'type'],
        properties: {
          from: { type: 'string' },             // entity id
          to: { type: 'string' },               // entity id
          type: { type: 'string', enum: [
            'oxidative_addition', 'reductive_elimination', 'migratory_insertion',
            'beta_hydride_elimination', 'ligand_substitution', 'coordination',
            'decoordination', 'reaction', 'equilibrium', 'catalytic_step',
            'trans_influence', 'electron_flow', 'feeds', 'produces', 'depends_on'
          ]},
          label: { type: ['string', 'null'] },
          curved: { type: 'boolean', default: false }
        }
      }
    },
    // --- Annotazioni semantiche ---
    annotations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          entityId: { type: 'string' },
          text: { type: 'string' },
          type: { type: 'string', enum: ['electron_count', 'oxidation_state', 'trans_influence', 'energy', 'label', 'warning'] }
        }
      }
    },
    // --- Didattica ---
    didacticFocus: { type: 'string' },          // Cosa il lettore deve capire
    examTrap: { type: ['string', 'null'] },     // Errore tipico d'esame da evitare
    readingOrder: { type: 'array', items: { type: 'string' } }, // Sequenza di lettura (entity ids)
    // --- Provenienza ---
    provenance: { type: 'string', enum: Object.values(PROVENANCE_CLASSES) },
    sourceEvidenceId: { type: ['string', 'null'] }
  }
};

/**
 * VisualArtifact: artefatto visuale indipendente, versionabile, cacheabile.
 * Separato dal capitolo in cui compare. Un errore nel capitolo non invalida
 * artefatti già resi e cachati.
 */
const VISUAL_ARTIFACT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'VisualArtifact',
  type: 'object',
  required: ['artifactId', 'specHash', 'status'],
  properties: {
    artifactId: { type: 'string' },
    specHash: { type: 'string' },              // Hash della VisualSpec (cache key)
    renderHash: { type: ['string', 'null'] }, // Hash dell'SVG prodotto
    chapterId: { type: ['string', 'null'] },
    conceptId: { type: ['string', 'null'] },
    coverageItemId: { type: ['string', 'null'] },
    status: {
      type: 'string',
      enum: ['PLANNED', 'RENDERING', 'READY', 'FAILED', 'REPAIRED', 'CACHED']
    },
    specJson: { type: ['object', 'null'] },   // La VisualSpec originale
    svgResult: { type: ['string', 'null'] },  // SVG prodotto (inline)
    fallbackUsed: { type: 'boolean', default: false },
    fallbackReason: { type: ['string', 'null'] },
    qualityLayers: { type: 'object' },        // { SCIENTIFIC_CORRECTNESS: 'pass'|'fail'|'warn', ... }
    renderedAt: { type: ['string', 'null'] }, // ISO timestamp
    repairAttempts: { type: 'integer', default: 0 }
  }
};

const JOB_STATE_SCHEMA = {
  title: "JobState",
  type: "object",
  required: ["pipelineVersion", "sessionId", "currentPhase", "completedPhases", "chapters"],
  properties: {
    pipelineVersion: { type: "string", enum: ["3.0.0"] },
    sessionId: { type: "string" },
    subject: { type: "string" },
    currentPhase: {
      type: "string",
      enum: [
        "INSPECT", "EXTRACT", "EVIDENCE", "MAP_GRAPH", "VALIDATE_GRAPH",
        "BUILD_LEARNING_ORDER", "BUILD_TEACHING_BLUEPRINT", "GENERATE_CHAPTERS",
        "VERIFY_STRUCTURE", "VERIFY_SCIENCE", "VERIFY_DIDACTICS", "REPAIR", "REVERIFY",
        "RENDER_CHAPTER", "ASSEMBLE_DOCUMENT", "RESOLVE_REFERENCES", "GLOBAL_FINALIZATION", "PDF_QA", "DONE"
      ]
    },
    completedPhases: { type: "array", items: { type: "string" } },
    chapters: { type: "object" },
    invalidatedChapters: { type: "array", items: { type: "string" } }
  }
};

// =============================================================================
// 2. FUNZIONI DI VALIDAZIONE DETERMINISTICA CON DIAGNOSTICA DETTAGLIATA
// =============================================================================

function isObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * Valida un KnowledgeGraph v2.0.0
 */
function validateKnowledgeGraph(graph) {
  const errors = [];
  if (!isObject(graph)) return { valid: false, errors: ['KnowledgeGraph deve essere un oggetto'] };

  if (graph.schemaVersion !== '2.0.0' && graph.schemaVersion !== 2) {
    errors.push(`schemaVersion non valido: atteso "2.0.0", trovato "${graph.schemaVersion}"`);
  }
  if (!graph.sessionId || typeof graph.sessionId !== 'string') {
    errors.push('sessionId mancante o non valido');
  }
  if (!graph.subject || typeof graph.subject !== 'string') {
    errors.push('subject mancante o non valido');
  }
  if (!Array.isArray(graph.nodes)) {
    errors.push('nodes deve essere un array');
  } else {
    const nodeIds = new Set();
    graph.nodes.forEach((n, idx) => {
      if (!isObject(n)) {
        errors.push(`node[${idx}] non è un oggetto valido`);
        return;
      }
      if (!n.id || typeof n.id !== 'string') errors.push(`node[${idx}]: id mancante`);
      if (nodeIds.has(n.id)) errors.push(`node[${idx}]: id duplicato "${n.id}"`);
      nodeIds.add(n.id);
      if (!n.label || typeof n.label !== 'string') errors.push(`node[${idx}] ("${n.id}"): label mancante`);
      if (!n.type || typeof n.type !== 'string') errors.push(`node[${idx}] ("${n.id}"): type mancante`);
      if (!n.chapterId || typeof n.chapterId !== 'string') errors.push(`node[${idx}] ("${n.id}"): chapterId mancante`);

      if (n.firstUse) {
        const fuVal = validateFirstUseContract(n.firstUse);
        if (!fuVal.valid) {
          errors.push(`node[${idx}] firstUse contract non valido: ${fuVal.errors.join('; ')}`);
        }
      }
    });
  }

  if (!Array.isArray(graph.edges)) {
    errors.push('edges deve essere un array');
  } else {
    const validEdgeTypes = new Set([
      'REQUIRES', 'DERIVES_FROM', 'SPECIAL_CASE_OF', 'MOTIVATED_BY',
      'DEFINED_BY', 'ILLUSTRATED_BY', 'APPLIES', 'DEPENDS_ON', 'FOLLOWS'
    ]);
    graph.edges.forEach((e, idx) => {
      if (!isObject(e)) {
        errors.push(`edge[${idx}] non è un oggetto`);
        return;
      }
      if (!e.from || typeof e.from !== 'string') errors.push(`edge[${idx}]: from mancante`);
      if (!e.to || typeof e.to !== 'string') errors.push(`edge[${idx}]: to mancante`);
      if (!e.type || !validEdgeTypes.has(e.type.toUpperCase())) {
        errors.push(`edge[${idx}]: tipo "${e.type}" non riconosciuto`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Valida un FirstUseContract
 */
function validateFirstUseContract(contract) {
  const errors = [];
  if (!isObject(contract)) return { valid: false, errors: ['FirstUseContract deve essere un oggetto'] };

  if (!contract.conceptId || typeof contract.conceptId !== 'string') {
    errors.push('conceptId mancante o non valido');
  }
  if (!contract.firstUseChapter || typeof contract.firstUseChapter !== 'string') {
    errors.push('firstUseChapter mancante o non valido');
  }
  if (contract.pedagogicalPattern) {
    const validPatterns = new Set(['PHENOMENON_FIRST', 'PROBLEM_FIRST', 'DEFINITION_FIRST_WITH_IMMEDIATE_EQ', 'AXIOMATIC']);
    if (!validPatterns.has(contract.pedagogicalPattern)) {
      errors.push(`pedagogicalPattern non valido: "${contract.pedagogicalPattern}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Valida un TeachingBlueprint v2.0.0
 */
function validateTeachingBlueprint(blueprint) {
  const errors = [];
  if (!isObject(blueprint)) return { valid: false, errors: ['TeachingBlueprint deve essere un oggetto'] };

  if (blueprint.blueprintVersion !== '2.0.0' && blueprint.blueprintVersion !== 2) {
    errors.push(`blueprintVersion non valido: "${blueprint.blueprintVersion}"`);
  }
  if (!blueprint.chapterId || typeof blueprint.chapterId !== 'string') {
    errors.push('chapterId mancante');
  }
  if (!Array.isArray(blueprint.conceptOrder)) {
    errors.push('conceptOrder deve essere un array');
  }
  if (!Array.isArray(blueprint.conceptBlocks)) {
    errors.push('conceptBlocks deve essere un array');
  }
  if (!Array.isArray(blueprint.firstUseContracts)) {
    errors.push('firstUseContracts deve essere un array');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Valida un ConceptBlock
 */
function validateConceptBlock(block) {
  const errors = [];
  if (!isObject(block)) return { valid: false, errors: ['ConceptBlock deve essere un oggetto'] };

  if (!block.blockId || typeof block.blockId !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(block.blockId)) {
    errors.push(`blockId non valido: "${block.blockId}"`);
  }
  if (!block.conceptId || typeof block.conceptId !== 'string') {
    errors.push('conceptId mancante');
  }
  const validTypes = new Set([
    'MOTIVATION_BRIDGE', 'FORMAL_DEPENDENCY_UNIT', 'INTUITION',
    'DERIVATION_STEP', 'GRAPH_INTERPRETATION', 'APPLICATION_EXAM_TRAP',
    'CANONICAL_REVIEW', 'GENERAL_PROSE'
  ]);
  if (!block.blockType || !validTypes.has(block.blockType)) {
    errors.push(`blockType non valido: "${block.blockType}"`);
  }
  if (typeof block.content !== 'string') {
    errors.push('content deve essere una stringa');
  }
  if (block.stepSignificance && !['LOW', 'MEDIUM', 'HIGH'].includes(block.stepSignificance)) {
    errors.push(`stepSignificance non valido: "${block.stepSignificance}"`);
  }
  if (block.mathOperation) {
    const validOps = new Set(['derivative', 'integral', 'algebra', 'substitution', 'trig_identity', 'vector_identity', 'limit']);
    if (!validOps.has(block.mathOperation)) {
      errors.push(`mathOperation non valido: "${block.mathOperation}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Valida un Violation report del Quality Engine
 */
function validateViolation(violation) {
  const errors = [];
  if (!isObject(violation)) return { valid: false, errors: ['Violation deve essere un oggetto'] };

  if (!violation.type || typeof violation.type !== 'string') errors.push('type mancante');
  if (!['HARD_FAIL', 'WARNING'].includes(violation.severity)) {
    errors.push(`severity non valida: "${violation.severity}"`);
  }
  if (!['INLINE', 'BLOCK', 'SECTION', 'CHAPTER', 'GLOBAL'].includes(violation.scope)) {
    errors.push(`scope non valido: "${violation.scope}"`);
  }
  if (!violation.message || typeof violation.message !== 'string') {
    errors.push('message mancante');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Valida una RepairRequest
 */
function validateRepairRequest(request) {
  const errors = [];
  if (!isObject(request)) return { valid: false, errors: ['RepairRequest deve essere un oggetto'] };

  if (!request.repairId) errors.push('repairId mancante');
  if (!['INLINE', 'BLOCK', 'SECTION', 'CHAPTER', 'GLOBAL'].includes(request.scope)) {
    errors.push(`scope non valido: "${request.scope}"`);
  }
  if (!request.violationType) errors.push('violationType mancante');
  if (!request.targetBlockId) errors.push('targetBlockId mancante');
  if (!Array.isArray(request.allowedEdits)) errors.push('allowedEdits deve essere un array');
  if (!Array.isArray(request.forbiddenEdits)) errors.push('forbiddenEdits deve essere un array');

  return { valid: errors.length === 0, errors };
}

/**
 * Valida un ChapterArtifact
 */
function validateChapterArtifact(artifact) {
  const errors = [];
  if (!isObject(artifact)) return { valid: false, errors: ['ChapterArtifact deve essere un oggetto'] };

  if (!artifact.chapterId) errors.push('chapterId mancante');
  if (!artifact.contentHash) errors.push('contentHash mancante');
  if (!['generated', 'verified', 'repaired', 'rendered', 'cached'].includes(artifact.status)) {
    errors.push(`status non valido: "${artifact.status}"`);
  }
  if (!Array.isArray(artifact.blocks)) errors.push('blocks deve essere un array');

  return { valid: errors.length === 0, errors };
}

/**
 * Valida un SemanticReference
 */
function validateSemanticReference(ref) {
  const errors = [];
  if (!isObject(ref)) return { valid: false, errors: ['SemanticReference deve essere un oggetto'] };

  if (!ref.refKey || typeof ref.refKey !== 'string') errors.push('refKey mancante');
  if (!['CONCEPT', 'CHAPTER', 'FORMULA', 'GRAPH'].includes(ref.targetType)) {
    errors.push(`targetType non valido: "${ref.targetType}"`);
  }
  if (!ref.targetId || typeof ref.targetId !== 'string') errors.push('targetId mancante');

  return { valid: errors.length === 0, errors };
}

/**
 * Valida un GraphSpec
 */
function validateGraphSpec(spec) {
  const errors = [];
  if (!isObject(spec)) return { valid: false, errors: ['GraphSpec deve essere un oggetto'] };

  if (!spec.id || typeof spec.id !== 'string') errors.push('id mancante');
  if (spec.provenance !== 'FORMULA-derived') {
    errors.push(`provenance deve essere "FORMULA-derived", trovato: "${spec.provenance}"`);
  }
  if (!isObject(spec.domain)) {
    errors.push('domain deve essere un oggetto con min, max, points');
  } else {
    if (typeof spec.domain.min !== 'number') errors.push('domain.min deve essere un numero');
    if (typeof spec.domain.max !== 'number') errors.push('domain.max deve essere un numero');
    if (typeof spec.domain.points !== 'number' || spec.domain.points <= 0) {
      errors.push('domain.points deve essere un intero positivo');
    }
  }
  if (!Array.isArray(spec.series) || spec.series.length === 0) {
    errors.push('series deve essere un array con almeno una serie');
  } else {
    spec.series.forEach((s, idx) => {
      if (!isObject(s)) errors.push(`series[${idx}] non valido`);
      else {
        if (!s.name) errors.push(`series[${idx}].name mancante`);
        if (!s.expression) errors.push(`series[${idx}].expression mancante`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Valida un JobState v3.0.0
 */
function validateJobState(state) {
  const errors = [];
  if (!isObject(state)) return { valid: false, errors: ['JobState deve essere un oggetto'] };

  if (state.pipelineVersion !== '3.0.0') {
    errors.push(`pipelineVersion non valido: atteso "3.0.0", trovato: "${state.pipelineVersion}"`);
  }
  if (!state.sessionId) errors.push('sessionId mancante');
  const validPhases = new Set([
    'INSPECT', 'EXTRACT', 'EVIDENCE', 'MAP_GRAPH', 'VALIDATE_GRAPH',
    'BUILD_LEARNING_ORDER', 'BUILD_TEACHING_BLUEPRINT', 'GENERATE_CHAPTERS',
    'VERIFY_STRUCTURE', 'VERIFY_SCIENCE', 'VERIFY_DIDACTICS', 'REPAIR', 'REVERIFY',
    'RENDER_CHAPTER', 'ASSEMBLE_DOCUMENT', 'RESOLVE_REFERENCES', 'GLOBAL_FINALIZATION', 'PDF_QA', 'DONE'
  ]);
  if (!validPhases.has(state.currentPhase)) {
    errors.push(`currentPhase non valido: "${state.currentPhase}"`);
  }
  if (!Array.isArray(state.completedPhases)) errors.push('completedPhases deve essere un array');
  if (!isObject(state.chapters)) errors.push('chapters deve essere un oggetto');

  return { valid: errors.length === 0, errors };
}

/**
 * Valida un record VisualEvidence v1.0.0
 */
function validateVisualEvidence(evidence) {
  const errors = [];
  if (!isObject(evidence)) return { valid: false, errors: ['VisualEvidence deve essere un oggetto'] };

  if (!evidence.figureId || typeof evidence.figureId !== 'string') {
    errors.push('figureId mancante o non valido');
  }

  if (!isObject(evidence.source)) {
    errors.push('source mancante o non valido');
  } else {
    if (!evidence.source.fileHash || typeof evidence.source.fileHash !== 'string') {
      errors.push('source.fileHash mancante');
    }
    if (typeof evidence.source.page !== 'number' || evidence.source.page < 1) {
      errors.push('source.page non valido (atteso intero >= 1)');
    }
    if (!Array.isArray(evidence.source.bbox) || evidence.source.bbox.length !== 4) {
      errors.push('source.bbox deve essere un array di 4 numeri [x0, y0, x1, y1]');
    }
  }

  if (!isObject(evidence.classification)) {
    errors.push('classification mancante o non valido');
  } else {
    const validTaxonomy = new Set(Object.values(VISUAL_TAXONOMY));
    if (!validTaxonomy.has(evidence.classification.type)) {
      errors.push(`classification.type non valido: "${evidence.classification.type}"`);
    }
    if (typeof evidence.classification.confidence !== 'number' || evidence.classification.confidence < 0 || evidence.classification.confidence > 1) {
      errors.push('classification.confidence deve essere un numero tra 0 e 1');
    }
  }

  const validProvenance = new Set(Object.values(PROVENANCE_CLASSES));
  if (!evidence.provenance || !validProvenance.has(evidence.provenance)) {
    errors.push(`provenance non valida o non dichiarata: "${evidence.provenance}"`);
  }

  if (evidence.formulaLinks && Array.isArray(evidence.formulaLinks)) {
    const validConsistency = new Set(Object.values(CONSISTENCY_STATES));
    evidence.formulaLinks.forEach((link, idx) => {
      if (!isObject(link) || !link.formula || !validConsistency.has(link.status)) {
        errors.push(`formulaLinks[${idx}] non valido (status atteso tra: ${Array.from(validConsistency).join(', ')})`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  KNOWLEDGE_GRAPH_SCHEMA,
  FIRST_USE_CONTRACT_SCHEMA,
  TEACHING_BLUEPRINT_SCHEMA,
  CONCEPT_BLOCK_SCHEMA,
  VIOLATION_SCHEMA,
  REPAIR_REQUEST_SCHEMA,
  CHAPTER_ARTIFACT_SCHEMA,
  SEMANTIC_REFERENCE_SCHEMA,
  GRAPH_SPEC_SCHEMA,
  JOB_STATE_SCHEMA,

  VISUAL_TAXONOMY,
  PROVENANCE_CLASSES,
  CONSISTENCY_STATES,
  RECONSTRUCTION_STRATEGIES,
  VISUAL_QUALITY_LAYER,
  VISUAL_EVIDENCE_SCHEMA,
  VISUAL_SPEC_SCHEMA,
  VISUAL_ARTIFACT_SCHEMA,

  validateKnowledgeGraph,
  validateFirstUseContract,
  validateTeachingBlueprint,
  validateConceptBlock,
  validateViolation,
  validateRepairRequest,
  validateChapterArtifact,
  validateSemanticReference,
  validateGraphSpec,
  validateJobState,
  validateVisualEvidence
};
