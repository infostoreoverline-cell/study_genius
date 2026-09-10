/**
 * StudyGenius Academic Intelligence System
 * src/core/jobState.js
 * 
 * State Machine & Persistent Checkpointing (Architettura Oltre 1000 - v3.0.0).
 * Garantisce la ripresa (resumability), osservabilità, rendering incrementale
 * e tracciamento dello stato per singolo capitolo sulla pipeline a 17 fasi.
 */

const fs = require('fs-extra');
const path = require('path');
const { validateJobState } = require('./schemas');

const PHASES = [
  'INSPECT',
  'EXTRACT',
  'EVIDENCE',
  'MAP_GRAPH',
  'VALIDATE_GRAPH',
  'BUILD_LEARNING_ORDER',
  'BUILD_TEACHING_BLUEPRINT',
  'GENERATE_CHAPTERS',
  'VERIFY_STRUCTURE',
  'VERIFY_SCIENCE',
  'VERIFY_DIDACTICS',
  'REPAIR',
  'REVERIFY',
  'RENDER_CHAPTER',
  'ASSEMBLE_DOCUMENT',
  'RESOLVE_REFERENCES',
  'GLOBAL_FINALIZATION',
  'PDF_QA',
  'DONE'
];

/**
 * Inizializza un nuovo stato di esecuzione per la sessione (v3.0.0)
 * @param {string} sessionId 
 * @param {string} subject 
 * @returns {Object}
 */
function initJobState(sessionId = 'default-session', subject = 'Generale') {
  const now = new Date().toISOString();
  const state = {
    pipelineVersion: '3.0.0',
    graphSchemaVersion: '2.0.0',
    sessionId,
    subject,
    currentPhase: 'INSPECT',
    completedPhases: [],
    phaseOutputs: {},
    chapters: {},
    invalidatedChapters: [],
    retries: {},
    timestamps: {
      startedAt: now,
      lastUpdatedAt: now
    },
    // Dati pedagogici e memoria di padronanza (Sezione 11 STUDY_GENIUS_METODO_DIDATTICO_MASTER.md)
    masteryState: {
      masteredNodes: [],
      reviewNeededNodes: [],
      prerequisiteGaps: []
    },
    recurringErrors: [],
    activeContract: null,
    nextRecommendedAction: null,
    status: 'running' // 'running' | 'completed' | 'failed' | 'paused'
  };

  const val = validateJobState(state);
  if (!val.valid) {
    throw new Error(`JobState non valido: ${val.errors.join('; ')}`);
  }

  return state;
}


/**
 * Esegue la transizione di stato verso una nuova fase, registrando l'output della fase precedente
 * @param {Object} jobState 
 * @param {string} nextPhase 
 * @param {any} currentPhaseOutput 
 * @returns {Object}
 */
function transitionPhase(jobState, nextPhase, currentPhaseOutput = null) {
  if (!jobState) throw new Error('JobState non valido');

  const now = new Date().toISOString();
  const prevPhase = jobState.currentPhase;

  if (prevPhase && !jobState.completedPhases.includes(prevPhase)) {
    jobState.completedPhases.push(prevPhase);
    if (currentPhaseOutput !== null && currentPhaseOutput !== undefined) {
      jobState.phaseOutputs[prevPhase] = currentPhaseOutput;
    }
  }

  jobState.currentPhase = nextPhase;
  jobState.timestamps.lastUpdatedAt = now;
  jobState.timestamps[nextPhase] = now;

  if (nextPhase === 'GLOBAL_FINALIZATION' || nextPhase === 'PDF_QA' || nextPhase === 'DONE') {
    if (nextPhase === 'DONE') {
      jobState.status = 'completed';
    }
  }

  return jobState;
}

/**
 * Aggiorna lo stato di avanzamento di uno specifico capitolo
 * @param {Object} jobState 
 * @param {string} chapterId 
 * @param {'pending'|'generating'|'verifying'|'repairing'|'rendered'|'completed'} status 
 * @param {Object} details 
 */
function setChapterStatus(jobState, chapterId, status, details = {}) {
  if (!jobState.chapters) jobState.chapters = {};

  const existing = jobState.chapters[chapterId] || { attempts: 0 };
  jobState.chapters[chapterId] = {
    ...existing,
    status,
    ...details,
    lastUpdatedAt: new Date().toISOString()
  };

  return jobState.chapters[chapterId];
}

/**
 * Invalida uno o più capitoli (es. a seguito di modifica a monte nel Knowledge Graph)
 * @param {Object} jobState 
 * @param {Array<string>} chapterIds 
 */
function invalidateChapters(jobState, chapterIds = []) {
  if (!Array.isArray(jobState.invalidatedChapters)) {
    jobState.invalidatedChapters = [];
  }

  for (const cId of chapterIds) {
    if (!jobState.invalidatedChapters.includes(cId)) {
      jobState.invalidatedChapters.push(cId);
    }
    if (jobState.chapters?.[cId]) {
      jobState.chapters[cId].status = 'pending';
    }
  }

  return jobState.invalidatedChapters;
}

/**
 * Registra un fallimento nella fase corrente
 * @param {Object} jobState 
 * @param {string} reason 
 */
function failJobState(jobState, reason) {
  jobState.status = 'failed';
  jobState.failureReason = reason;
  jobState.timestamps.failedAt = new Date().toISOString();
  return jobState;
}

/**
 * Incrementa il contatore di retry per una specifica fase
 * @param {Object} jobState 
 * @param {string} phase 
 * @returns {number}
 */
function recordRetry(jobState, phase) {
  const p = phase || jobState.currentPhase;
  jobState.retries[p] = (jobState.retries[p] || 0) + 1;
  return jobState.retries[p];
}

/**
 * Salva lo stato persistente su file JSON
 * @param {string} filePath 
 * @param {Object} jobState 
 */
function saveJobState(filePath, jobState) {
  fs.ensureDirSync(path.dirname(filePath));
  fs.writeJsonSync(filePath, jobState, { spaces: 2 });
}

/**
 * Carica lo stato persistente da file JSON
 * @param {string} filePath 
 * @returns {Object|null}
 */
function loadJobState(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readJsonSync(filePath);
}

/**
 * Verifica se una fase è già stata completata in una precedente esecuzione
 * @param {Object} jobState 
 * @param {string} phase 
 * @returns {boolean}
 */
function isPhaseCompleted(jobState, phase) {
  return jobState?.completedPhases?.includes(phase) || false;
}

module.exports = {
  PHASES,
  initJobState,
  transitionPhase,
  setChapterStatus,
  invalidateChapters,
  failJobState,
  recordRetry,
  saveJobState,
  loadJobState,
  isPhaseCompleted
};
