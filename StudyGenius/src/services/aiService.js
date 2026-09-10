/**
 * StudyGenius Academic Intelligence System
 * src/services/aiService.js
 * 
 * Sottosistema Gemini & DeepSeek ad Alta Resilienza (Versione 2.1).
 * - Migrazione completa all'SDK ufficiale @google/genai
 * - Discovery dinamica paginata (ai.models.list())
 * - Allowlist controllata Free Tier Standard (2026)
 * - Capability test minimi una tantum con caching dello stato
 * - Router per ruoli (DOCUMENT_TRIAGE, VISUAL_EXTRACTION, SCIENTIFIC_REVIEW)
 * - Gestione avanzata 500/503: retry locale (2-5s, 8-15s con jitter), Circuit Breaker a 90s, DEFERRED_RETRY
 * - AdaptiveConcurrencyController (max 2 globali, max 1 Tier C, max 1 Review, backpressure dinamica)
 * - Output token compatti, non ridondanti e tracciamento telemetrico
 * - Zero API key leakage nei log, errori e test
 */

const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');
const {
  CONFIG,
  FREE_TIER_ALLOWLIST,
  GEMINI_ROLE_HIERARCHIES,
  GEMINI_CONFIG
} = require('../config');
const {
  defaultAccessManager,
  GoogleAIStudioAccessManager,
  MODEL_STATUS,
  ALLOW_PAID_GEMINI
} = require('./googleAIStudioAccessManager');

// Singleton Clients
let deepseekClient = null;
let genAIClient = null;

// ============================================================================
// 1. SANIFICAZIONE E SICUREZZA ZERO-LEAK
// ============================================================================

/**
 * Rimuove qualsiasi occorrenza di chiavi API o identificatori riservati da stringhe ed errori
 */
function sanitizeString(str) {
  if (!str || typeof str !== 'string') return '';
  let sanitized = str;
  const geminiKey = process.env.GEMINI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  if (geminiKey && geminiKey.length > 5) {
    sanitized = sanitized.split(geminiKey).join('[REDACTED_GEMINI_KEY]');
  }
  if (deepseekKey && deepseekKey.length > 5) {
    sanitized = sanitized.split(deepseekKey).join('[REDACTED_DEEPSEEK_KEY]');
  }

  // Maschera pattern tipici di chiavi Google Cloud / AI Studio (AIza...)
  sanitized = sanitized.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY_PATTERN]');
  return sanitized;
}

function sanitizeError(err) {
  if (!err) return new Error('Unknown error');
  const cleanMsg = sanitizeString(err.message || String(err));
  const newErr = new Error(cleanMsg);
  newErr.status = err.status || (err.response && err.response.status);
  newErr.code = err.code;
  if (err.stack) {
    newErr.stack = sanitizeString(err.stack);
  }
  return newErr;
}

/**
 * Sanificazione Rigorosa Unicode per API DeepSeek
 * Risolve l'errore "unexpected end of hex escape" generato da surrogati orfani
 */
function sanitizeForDeepSeek(str) {
  if (!str || typeof str !== 'string') return '';
  let clean = typeof str.toWellFormed === 'function' ? str.toWellFormed() : str;
  clean = clean.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return clean;
}

// ============================================================================
// 2. GESTIONE CLIENT CENTRALIZZATI
// ============================================================================

function getDeepSeekClient() {
  if (!deepseekClient) {
    deepseekClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com'
    });
  }
  return deepseekClient;
}

function getGeminiClient() {
  if (!genAIClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'inserisci_qui_la_tua_chiave_gemini') {
      console.warn('  ⚠️ GEMINI_API_KEY non configurata o predefinita.');
    }
    genAIClient = new GoogleGenAI({ apiKey: key || '' });
  }
  return genAIClient;
}

// ============================================================================
// 3. CATALOGO MODELLI & ADAPTIVE CONCURRENCY CONTROLLER
// ============================================================================

/**
 * Stati possibili per ciascun endpoint candidato
 */
const MODEL_STATES = {
  AVAILABLE: 'AVAILABLE',
  UNSUPPORTED_METHOD: 'UNSUPPORTED_METHOD',
  UNAUTHORIZED: 'UNAUTHORIZED',
  QUOTA_LIMITED: 'QUOTA_LIMITED',
  TEMPORARILY_UNAVAILABLE: 'TEMPORARILY_UNAVAILABLE',
  DEAD: 'DEAD',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Stato globale in-memory del catalogo e dei circuit breaker
 */
const catalogState = {
  initialized: false,
  lastDiscovery: null,
  discoveredRawModels: [],
  models: new Map(), // modelName -> { name, state, failureCount, nextAttemptTime, circuitState, lastError }
  roleAssignments: {
    DOCUMENT_TRIAGE: null,
    VISUAL_EXTRACTION: null,
    SCIENTIFIC_REVIEW: null
  }
};

/**
 * Controller di Concorrenza Adattivo per il Free Tier Standard
 * - maxGlobal: 2 richieste complessive
 * - maxTierC: 1 richiesta ad alta risoluzione alla volta
 * - maxReview: 1 revisione specialistica alla volta
 * - Backpressure automatica su picchi 503/429
 */
class AdaptiveConcurrencyController {
  constructor(options = {}) {
    this.maxGlobal = options.maxGlobal || (GEMINI_CONFIG && GEMINI_CONFIG.initialConcurrency) || 2;
    this.maxTierC = options.maxTierC || 1;
    this.maxReview = options.maxReview || 1;

    this.currentGlobal = 0;
    this.currentTierC = 0;
    this.currentReview = 0;

    this.queue = [];
    this.recentErrors = [];
    this.isThrottled = false;
  }

  get maxConcurrency() {
    return this.maxGlobal;
  }

  set maxConcurrency(val) {
    this.maxGlobal = Math.max(1, val);
  }

  setLimit(newLimit) {
    this.maxGlobal = Math.max(1, newLimit);
  }

  recordError(statusCode) {
    const now = Date.now();
    this.recentErrors.push(now);
    this.cleanOldErrors(now);
    if (statusCode === 429) {
      this.isThrottled = true;
      this.maxGlobal = 1;
      console.warn(`  📉 [CONCURRENCY_THROTTLE] Quota 429 rilevata. Concorrenza globale ridotta a 1.`);
    } else if ((statusCode === 500 || statusCode === 503) && this.recentErrors.length >= 2) {
      this.isThrottled = true;
      this.maxGlobal = 1;
      console.warn(`  📉 [CONCURRENCY_THROTTLE] Rilevati ${this.recentErrors.length} errori 503 recenti. Concorrenza globale ridotta a 1.`);
    }
  }

  recordSuccess() {
    const now = Date.now();
    this.cleanOldErrors(now);
    if (this.isThrottled && this.recentErrors.length === 0) {
      this.isThrottled = false;
      this.maxGlobal = 2;
      console.log(`  📈 [CONCURRENCY_RECOVERY] Servizio stabilizzato. Concorrenza globale ripristinata a 2.`);
    }
  }

  cleanOldErrors(now = Date.now()) {
    const windowMs = 45000;
    this.recentErrors = this.recentErrors.filter(t => now - t < windowMs);
  }

  canAcquire(role) {
    if (this.currentGlobal >= this.maxGlobal) return false;
    if (role === 'VISUAL_EXTRACTION' && this.currentTierC >= this.maxTierC) return false;
    if (role === 'SCIENTIFIC_REVIEW' && this.currentReview >= this.maxReview) return false;
    return true;
  }

  async acquire(role = 'DOCUMENT_TRIAGE') {
    if (this.canAcquire(role)) {
      this.currentGlobal++;
      if (role === 'VISUAL_EXTRACTION') this.currentTierC++;
      if (role === 'SCIENTIFIC_REVIEW') this.currentReview++;
      return;
    }

    await new Promise(resolve => {
      this.queue.push({ role, resolve });
    });

    this.currentGlobal++;
    if (role === 'VISUAL_EXTRACTION') this.currentTierC++;
    if (role === 'SCIENTIFIC_REVIEW') this.currentReview++;
  }

  release(role = 'DOCUMENT_TRIAGE') {
    this.currentGlobal = Math.max(0, this.currentGlobal - 1);
    if (role === 'VISUAL_EXTRACTION') this.currentTierC = Math.max(0, this.currentTierC - 1);
    if (role === 'SCIENTIFIC_REVIEW') this.currentReview = Math.max(0, this.currentReview - 1);

    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      if (this.canAcquire(item.role)) {
        this.queue.splice(i, 1);
        item.resolve();
        break;
      }
    }
  }
}

const adaptiveConcurrencyController = new AdaptiveConcurrencyController({
  maxGlobal: (GEMINI_CONFIG && GEMINI_CONFIG.initialConcurrency) || 2,
  maxTierC: 1,
  maxReview: 1
});

const concurrencyLimiter = adaptiveConcurrencyController; // retrocompatibilità per import esistenti

// ============================================================================
// 4. DISCOVERY DINAMICA E CAPABILITY TEST
// ============================================================================

/**
 * Normalizza il nome del modello rimuovendo prefissi come 'models/'
 */
function normalizeModelName(rawName) {
  if (!rawName) return '';
  return rawName.replace(/^models\//, '');
}

/**
 * Esegue la discovery dinamica paginata via ai.models.list()
 * Interseca con la FREE_TIER_ALLOWLIST, esegue capability test minimi e assegna i ruoli
 */
async function discoverAndTestModels(options = {}) {
  const { forceRefresh = false, pingCapability = false } = options;

  if (catalogState.initialized && !forceRefresh) {
    return {
      models: Array.from(catalogState.models.values()),
      roleAssignments: { ...catalogState.roleAssignments },
      initialized: true
    };
  }

  const ai = getGeminiClient();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'inserisci_qui_la_tua_chiave_gemini') {
    console.warn('  ⚠️ Impossibile eseguire discovery Gemini: GEMINI_API_KEY non valida.');
    return {
      models: [],
      roleAssignments: { ...catalogState.roleAssignments },
      initialized: false,
      error: 'GEMINI_API_KEY mancante'
    };
  }

  console.log('\n🔍 [GEMINI DISCOVERY] Avvio interrogazione catalogo modelli via @google/genai...');

  const discoveredRaw = [];
  const supportedGenerateContent = new Set();

  try {
    const pager = await ai.models.list();
    for await (const m of pager) {
      discoveredRaw.push(m);
      const normName = normalizeModelName(m.name);
      const actions = m.supportedActions || [];
      if (actions.includes('generateContent')) {
        supportedGenerateContent.add(normName);
      }
    }
    catalogState.discoveredRawModels = discoveredRaw;
  } catch (listErr) {
    const cleanErr = sanitizeError(listErr);
    console.error(`  ❌ [GEMINI DISCOVERY] Errore durante ai.models.list(): ${cleanErr.message}`);
    const status = cleanErr.status;
    if (status === 401 || status === 403) {
      throw new Error(`[Fatal Gemini Auth Error: Autenticazione o autorizzazione non valida (${status}). Il job è stato interrotto per sicurezza.]`);
    }
    throw cleanErr;
  }

  const allowlist = FREE_TIER_ALLOWLIST || [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro'
  ];

  // Intersezione: Modelli nell'allowlist che supportano generateContent
  const candidates = allowlist.filter(modelName => supportedGenerateContent.has(modelName));

  console.log(`  📋 Modelli scoperti dal progetto: ${discoveredRaw.length} totali, ${supportedGenerateContent.size} con generateContent.`);
  console.log(`  🎯 Candidati intersecati con Free Tier Allowlist: [${candidates.join(', ')}]`);

  // Capability Testing leggero una tantum
  for (const modelName of allowlist) {
    if (!catalogState.models.has(modelName)) {
      catalogState.models.set(modelName, {
        name: modelName,
        state: supportedGenerateContent.has(modelName) ? MODEL_STATES.UNKNOWN : MODEL_STATES.UNSUPPORTED_METHOD,
        failureCount: 0,
        nextAttemptTime: 0,
        circuitState: supportedGenerateContent.has(modelName) ? 'CLOSED' : 'OPEN',
        lastError: supportedGenerateContent.has(modelName) ? null : 'Non supporta generateContent o non presente nel catalogo'
      });
    }
  }

  if (pingCapability && candidates.length > 0) {
    console.log('  ⚡ Esecuzione Capability Test minimi (1 richiesta testuale leggera per candidato)...');

    for (const candidate of candidates) {
      const entry = catalogState.models.get(candidate);
      try {
        const pingResult = await ai.models.generateContent({
          model: candidate,
          contents: 'ping'
        });
        if (pingResult && pingResult.text) {
          entry.state = MODEL_STATES.AVAILABLE;
          entry.circuitState = 'CLOSED';
          entry.failureCount = 0;
          entry.lastError = null;
        } else {
          entry.state = MODEL_STATES.AVAILABLE;
          entry.circuitState = 'CLOSED';
        }
      } catch (pingErr) {
        const cleanErr = sanitizeError(pingErr);
        const msg = cleanErr.message || '';
        const status = cleanErr.status;

        if (status === 404 || msg.includes('404') || msg.includes('not found') || msg.includes('no longer available')) {
          entry.state = MODEL_STATES.DEAD;
          entry.circuitState = 'OPEN';
          entry.lastError = '404 Not Found / No longer available';
          console.log(`    ⚠️ ${candidate}: Segnato come DEAD (404/non disponibile). Non verrà mai richiamato.`);
        } else if (status === 401 || status === 403 || msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
          entry.state = MODEL_STATES.UNAUTHORIZED;
          entry.circuitState = 'OPEN';
          entry.lastError = 'Autenticazione fallita';
          throw new Error(`[Fatal Gemini Auth Error: Verifica la tua GEMINI_API_KEY e i permessi del progetto (${candidate})].`);
        } else if (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
          entry.state = MODEL_STATES.QUOTA_LIMITED;
          entry.circuitState = 'OPEN';
          entry.nextAttemptTime = Date.now() + 15000;
          entry.lastError = 'Quota / Rate limit raggiunto (429)';
          console.log(`    ⏳ ${candidate}: Quota limited (429). Attivato backoff.`);
        } else if (status === 500 || status === 503 || msg.includes('503') || msg.includes('overloaded')) {
          entry.state = MODEL_STATES.TEMPORARILY_UNAVAILABLE;
          entry.circuitState = 'OPEN';
          entry.nextAttemptTime = Date.now() + 30000;
          entry.lastError = 'Server temporarily overloaded (503)';
          console.log(`    ⏳ ${candidate}: Temporaneamente non disponibile (503).`);
        } else {
          entry.state = MODEL_STATES.AVAILABLE;
          entry.circuitState = 'CLOSED';
        }
      }
    }
  }

  // Assegnazione Intelligente dei Ruoli basata sulla gerarchia
  const hierarchies = GEMINI_ROLE_HIERARCHIES || {
    DOCUMENT_TRIAGE: ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite'],
    VISUAL_EXTRACTION: ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'],
    SCIENTIFIC_REVIEW: ['gemini-2.5-pro', 'gemini-3.8-flash', 'gemini-3.7-flash']
  };

  const assignedRoles = {};

  for (const [role, preferredList] of Object.entries(hierarchies)) {
    let chosen = null;
    for (const modelName of preferredList) {
      const entry = catalogState.models.get(modelName);
      if (entry && (entry.state === MODEL_STATES.AVAILABLE || entry.state === MODEL_STATES.UNKNOWN) && entry.circuitState === 'CLOSED') {
        chosen = modelName;
        break;
      }
    }

    if (!chosen) {
      for (const modelName of candidates) {
        const entry = catalogState.models.get(modelName);
        if (entry && (entry.state === MODEL_STATES.AVAILABLE || entry.state === MODEL_STATES.UNKNOWN) && entry.circuitState === 'CLOSED') {
          chosen = modelName;
          break;
        }
      }
    }

    assignedRoles[role] = chosen;
  }

  catalogState.roleAssignments = assignedRoles;
  catalogState.initialized = true;
  catalogState.lastDiscovery = new Date().toISOString();

  // Stampa log iniziale chiaro e strutturato
  console.log('\n===============================================================');
  console.log('📊 ASSEGNAZIONE MODELLI AI RUOLI DIDATTICI (STUDY GENIUS)');
  console.log('===============================================================');
  for (const [role, model] of Object.entries(assignedRoles)) {
    console.log(`  🎯 [${role.padEnd(19)}]: ${model ? `✔ ${model}` : '❌ NESSUN MODELLO DISPONIBILE'}`);
  }
  console.log('===============================================================\n');

  if (!assignedRoles.DOCUMENT_TRIAGE && !assignedRoles.VISUAL_EXTRACTION) {
    throw new Error('Nessun modello Gemini idoneo è disponibile per i ruoli fondamentali (DOCUMENT_TRIAGE, VISUAL_EXTRACTION). Elaborazione arrestata.');
  }

  return {
    models: Array.from(catalogState.models.values()),
    roleAssignments: { ...catalogState.roleAssignments },
    initialized: true
  };
}

function getModelAssignments() {
  return { ...catalogState.roleAssignments };
}

function getModelCatalog() {
  return Array.from(catalogState.models.values());
}

// ============================================================================
// 5. GESTIONE ERRORI, RETRY DETERMINISTICI & CIRCUIT BREAKER 500/503
// ============================================================================

/**
 * Gestione degli errori per endpoint specifico e aggiornamento del circuit breaker
 * Supporta retry locale sullo stesso modello con jitter prima di aprire il circuito
 */
function registerEndpointError(modelName, err, attempt = 1, maxAttempts = 3) {
  const cleanErr = sanitizeError(err);
  const msg = cleanErr.message || '';
  const status = cleanErr.status;

  let entry = catalogState.models.get(modelName);
  if (!entry) {
    entry = {
      name: modelName,
      state: MODEL_STATES.UNKNOWN,
      failureCount: 0,
      nextAttemptTime: 0,
      circuitState: 'CLOSED',
      lastError: null
    };
    catalogState.models.set(modelName, entry);
  }

  // 1. 404 NOT FOUND -> DEAD immediato, nessun retry
  if (status === 404 || msg.includes('404') || msg.includes('not found') || msg.includes('no longer available')) {
    entry.state = MODEL_STATES.DEAD;
    entry.circuitState = 'OPEN';
    entry.lastError = '404 Not Found / Obsoleto';
    console.log(`  ❌ [CIRCUIT_OPEN_DEAD] Endpoint ${modelName} ha restituito 404. Marcato DEAD permanentemente.`);
    return { action: 'FALLBACK', isDead: true, reason: '404_NOT_FOUND' };
  }

  // 2. 401 / 403 UNAUTHORIZED / FORBIDDEN -> Errore irreversibile autenticazione
  if (status === 401 || status === 403 || msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
    entry.state = MODEL_STATES.UNAUTHORIZED;
    entry.circuitState = 'OPEN';
    entry.lastError = 'Autenticazione / Autorizzazione fallita';
    console.error(`  ❌ [FATAL_AUTH] Errore irreversibile autenticazione/progetto su ${modelName}.`);
    return { action: 'FATAL_AUTH', error: cleanErr };
  }

  // 3. 429 RESOURCE_EXHAUSTED -> Rate limit con backoff e throttling
  if (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    entry.state = MODEL_STATES.QUOTA_LIMITED;
    entry.failureCount++;
    adaptiveConcurrencyController.recordError(429);
    const baseWait = 15000 * Math.pow(1.5, Math.min(entry.failureCount, 3));
    const jitter = Math.random() * 3000;
    const backoffTime = Math.min(60000, baseWait + jitter);
    entry.nextAttemptTime = Date.now() + backoffTime;
    console.log(`  ⏳ [RETRY_SCHEDULED_429] Quota 429 su ${modelName}. Attesa ${Math.round(backoffTime / 1000)}s con backoff.`);
    return { action: 'BACKOFF', waitMs: backoffTime, reason: '429_QUOTA' };
  }

  // 4. 500 / 503 UNAVAILABLE / HIGH DEMAND -> Retry locale con jitter sullo stesso modello, poi Circuit Open
  if (status === 500 || status === 503 || msg.includes('503') || msg.includes('overloaded') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
    entry.failureCount++;
    adaptiveConcurrencyController.recordError(503);

    if (attempt < maxAttempts) {
      // Retry sullo stesso modello con jitter
      // Tentativo 1 -> 2-5 secondi: 2000 + Math.random() * 3000
      // Tentativo 2 -> 8-15 secondi: 8000 + Math.random() * 7000
      const delayMs = attempt === 1
        ? Math.floor(2000 + Math.random() * 3000)
        : Math.floor(8000 + Math.random() * 7000);

      console.log(`  ⏳ [RETRY_SCHEDULED] Modello ${modelName} sovraccarico (503). Tentativo ${attempt}/${maxAttempts} tra ${(delayMs / 1000).toFixed(1)}s (jitter)...`);
      return {
        action: 'LOCAL_RETRY',
        waitMs: delayMs,
        retryDelayMs: delayMs,
        attempt: attempt + 1,
        reason: '503_HIGH_DEMAND'
      };
    }

    // Al 3° fallimento consecutivo: Circuit Open per 90 secondi
    const cooldown = 90000;
    entry.state = MODEL_STATES.TEMPORARILY_UNAVAILABLE;
    entry.circuitState = 'OPEN';
    entry.circuitOpenUntil = Date.now() + cooldown;
    entry.nextAttemptTime = Date.now() + cooldown;
    console.log(`  ⚡ [CIRCUIT_OPEN] Endpoint ${modelName} ha fallito ${attempt} volte consecutive (503). Circuito aperto per 90s. Fallback attivato.`);
    return {
      action: 'FALLBACK',
      isDead: false,
      reason: 'CIRCUIT_OPEN',
      circuitCooldownMs: cooldown
    };
  }

  // 5. 400 INVALID_ARGUMENT -> Richiesta malformata
  if (status === 400 || msg.includes('INVALID_ARGUMENT')) {
    console.warn(`  ⚠️ [BAD_REQUEST] Parametro non valido nella richiesta su ${modelName}: ${cleanErr.message}`);
    return { action: 'BAD_REQUEST', error: cleanErr };
  }

  // Altri errori generici
  entry.failureCount++;
  if (attempt < maxAttempts) {
    const delayMs = Math.floor(3000 + Math.random() * 2000);
    return { action: 'LOCAL_RETRY', waitMs: delayMs, attempt: attempt + 1, reason: 'GENERIC_ERROR' };
  }
  return { action: 'FALLBACK', isDead: false, reason: 'GENERIC_RETRY_EXHAUSTED' };
}

function mapMediaResolution(res) {
  if (!res) return undefined;
  if (typeof res !== 'string') return res;
  const upper = res.toUpperCase();
  if (upper === 'HIGH' || upper === 'MEDIA_RESOLUTION_HIGH') return 'MEDIA_RESOLUTION_HIGH';
  if (upper === 'MEDIUM' || upper === 'MEDIA_RESOLUTION_MEDIUM') return 'MEDIA_RESOLUTION_MEDIUM';
  if (upper === 'LOW' || upper === 'MEDIA_RESOLUTION_LOW') return 'MEDIA_RESOLUTION_LOW';
  return undefined;
}

// ============================================================================
// 5.b TELEMETRIA GRANULARE CHIAMATE API E AUDITING CONSUMI
// ============================================================================

const TELEMETRY_DIR = path.resolve(__dirname, '../../sessions');
const TELEMETRY_FILE = path.join(TELEMETRY_DIR, 'call_telemetry.jsonl');

function recordCallTelemetry(record) {
  try {
    if (!fs.existsSync(TELEMETRY_DIR)) {
      fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
    }
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...record
    }) + '\n';
    fs.appendFileSync(TELEMETRY_FILE, line, 'utf8');
  } catch (err) {
    console.warn(`  ⚠️ [TELEMETRY] Impossibile salvare record telemetrico: ${err.message}`);
  }
}

function getCallTelemetrySummary({ sinceTimestamp = null, model = null, role = null } = {}) {
  const summary = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalThinkingTokens: 0,
    totalDurationMs: 0,
    truncationsCount: 0,
    repairsCount: 0,
    unitsProcessed: 0,
    records: []
  };

  try {
    if (!fs.existsSync(TELEMETRY_FILE)) return summary;
    const lines = fs.readFileSync(TELEMETRY_FILE, 'utf8').split('\n').filter(l => l.trim().length > 0);
    for (const l of lines) {
      try {
        const item = JSON.parse(l);
        if (sinceTimestamp && new Date(item.timestamp).getTime() < new Date(sinceTimestamp).getTime()) continue;
        if (model && item.model !== model) continue;
        if (role && item.role !== role) continue;

        summary.totalCalls++;
        if (item.success !== false) {
          summary.successfulCalls++;
        } else {
          summary.failedCalls++;
        }
        summary.totalInputTokens += (item.inTokens || 0);
        summary.totalOutputTokens += (item.outTokens || 0);
        summary.totalThinkingTokens += (item.thinkingTokens || 0);
        summary.totalDurationMs += (item.durationMs || 0);
        if (item.isTruncated || item.finishReason === 'MAX_TOKENS') summary.truncationsCount++;
        if (item.isRepair) summary.repairsCount++;
        summary.unitsProcessed += (item.unitsCount || (item.unitIds ? item.unitIds.length : 0));
        summary.records.push(item);
      } catch (_) {}
    }
  } catch (e) {
    console.warn(`  ⚠️ [TELEMETRY] Errore lettura sommario: ${e.message}`);
  }
  return summary;
}

// ============================================================================
// 6. ROUTER A RUOLI DIDATTICI
// ============================================================================

/**
 * Chiamata Gemini autorizzata guidata dal ruolo didattico tramite ExecutionPermit
 */
async function callGeminiRole({ role = 'VISUAL_EXTRACTION', contents, config = {}, metadata = {} }) {
  if (!catalogState.initialized && !defaultAccessManager.permissionProfile) {
    await discoverAndTestModels({ pingCapability: false });
  }

  // Acquisizione autorizzata dell'ExecutionPermit tramite GoogleAIStudioAccessManager
  const estimatedInput = metadata.estimatedTokens || metadata.estimatedInputTokens || 1200;
  const estimatedOutput = metadata.estimatedOutputTokens || 0;

  const permit = await defaultAccessManager.requestExecutionPermit({
    role,
    isCritical: metadata.isCritical || false,
    estimatedInputTokens: estimatedInput,
    estimatedOutputTokens: estimatedOutput,
    justification: metadata.justification || `Chiamata per ruolo didattico ${role}`,
    targetScope: metadata.targetScope || metadata.documentScope || ''
  });

  const modelName = permit.model;
  let lastError = null;
  const maxAttemptsPerModel = 3;
  let attempt = 1;

  while (attempt <= maxAttemptsPerModel) {
    const startTime = Date.now();
    try {
      const ai = defaultAccessManager.getClient();
      const callConfig = { ...config };

      // Risoluzione adattiva
      if (role === 'VISUAL_EXTRACTION' && !callConfig.mediaResolution) {
        callConfig.mediaResolution = 'MEDIA_RESOLUTION_HIGH';
      } else if (callConfig.mediaResolution) {
        callConfig.mediaResolution = mapMediaResolution(callConfig.mediaResolution);
      }

      // Limiti token di output per ruolo governati dal permit (dinamico e adattivo)
      if (!callConfig.maxOutputTokens) {
        callConfig.maxOutputTokens = permit.maxOutputTokens;
      }

      // Configurazione Thinking dinamica specifica per modello dal catalogo operativo
      const requestedThinking = callConfig.thinkingLevel || callConfig.thinkingBudget || metadata.thinkingLevel || metadata.thinkingBudget;
      const adapted = defaultAccessManager.adaptThinkingConfig(modelName, requestedThinking, role);
      if (adapted && adapted.thinkingConfig) {
        callConfig.thinkingConfig = adapted.thinkingConfig;
      }

      const callPromise = ai.models.generateContent({
        model: modelName,
        contents,
        config: callConfig
      });

      const timeoutMs = (GEMINI_CONFIG && GEMINI_CONFIG.timeoutMs) || 90000;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout chiamata Gemini (${timeoutMs / 1000}s su ${modelName})`)), timeoutMs)
      );

      const response = await Promise.race([callPromise, timeoutPromise]);
      const elapsedMs = Date.now() - startTime;

      const responseText = typeof response.text === 'string' ? response.text : (typeof response.text === 'function' ? response.text() : '');
      const inTokens = response.usageMetadata?.promptTokenCount || 0;
      const outTokens = response.usageMetadata?.candidatesTokenCount || 0;

      // Estrazione accurata token di thinking/ragionamento
      let thinkingTokens = response.usageMetadata?.thoughtsTokenCount || 0;
      if (!thinkingTokens && Array.isArray(response.usageMetadata?.candidatesTokensDetails)) {
        const thoughtItem = response.usageMetadata.candidatesTokensDetails.find(d => 
          d.modality === 'THINKING' || d.modality === 'REASONING' || d.modality === 'THOUGHT'
        );
        if (thoughtItem && thoughtItem.tokenCount) {
          thinkingTokens = thoughtItem.tokenCount;
        }
      }

      const candidate = (response.candidates && response.candidates[0]) || {};
      const finishReason = candidate.finishReason || 'STOP';
      const finishMessage = candidate.finishMessage || null;
      const isTruncated = finishReason === 'MAX_TOKENS';
      const jsonChars = responseText.length;

      const unitIds = Array.isArray(metadata.unitIds) ? metadata.unitIds : [];
      const docScope = metadata.documentScope || metadata.targetScope || '';
      const isRepair = metadata.isRepair || false;

      const figTag = metadata.figureId ? ` [${metadata.figureId}]` : (unitIds.length > 0 ? ` [${unitIds.length} unità]` : '');
      const truncTag = isTruncated ? ' ⚠️ [TRUNCATED:MAX_TOKENS]' : '';
      console.log(`  ✔ [COMPLETED]${figTag}${truncTag} [Role:${role}] [Model:${modelName}] [Permit:${permit.permitId}] [Attempt:${attempt}/${maxAttemptsPerModel}] (${elapsedMs}ms, in:${inTokens}, out:${outTokens}, think:${thinkingTokens}, chars:${jsonChars})`);

      // Rilascio del permesso con contabilizzazione quote reali
      permit.release({ success: true, inputTokens: inTokens, outputTokens: outTokens });

      // Registrazione telemetrica dettagliata
      recordCallTelemetry({
        success: true,
        permitId: permit.permitId,
        model: modelName,
        role,
        durationMs: elapsedMs,
        inTokens,
        outTokens,
        thinkingTokens,
        finishReason,
        finishMessage,
        isTruncated,
        documentScope: docScope,
        unitIds,
        unitsCount: unitIds.length,
        isRepair,
        attempt,
        jsonChars
      });

      return {
        text: responseText,
        response: {
          text: () => responseText,
          usageMetadata: response.usageMetadata,
          candidates: response.candidates
        },
        usageMetadata: response.usageMetadata,
        candidates: response.candidates,
        model: modelName,
        role,
        elapsedMs,
        inTokens,
        outTokens,
        thinkingTokens,
        finishReason,
        finishMessage,
        isTruncated,
        documentScope: docScope,
        unitIds,
        isRepair,
        attempt,
        permitId: permit.permitId
      };

    } catch (err) {
      lastError = sanitizeError(err);
      const errAction = defaultAccessManager.classifyAndHandleError(modelName, err, attempt, maxAttemptsPerModel);

      if (errAction.action === 'FATAL_AUTH') {
        permit.release({ success: false });
        recordCallTelemetry({
          success: false,
          permitId: permit.permitId,
          model: modelName,
          role,
          inTokens: 0,
          outTokens: 0,
          finishReason: 'FATAL_AUTH',
          errorMessage: errAction.message,
          attempt
        });
        throw new Error(`[Fatal Gemini Auth Error: ${errAction.message}]`);
      }

      if (errAction.action === 'LOCAL_RETRY') {
        await new Promise(r => setTimeout(r, errAction.retryDelayMs));
        attempt = errAction.attempt;
        continue; // Riprova LO STESSO MODELLO con jitter
      }

      if (errAction.action === 'BACKOFF') {
        permit.release({ success: false });
        recordCallTelemetry({
          success: false,
          permitId: permit.permitId,
          model: modelName,
          role,
          inTokens: 0,
          outTokens: 0,
          finishReason: 'BACKOFF_429',
          errorMessage: errAction.message,
          attempt
        });
        await new Promise(r => setTimeout(r, errAction.retryDelayMs || 25000));
        break;
      }

      if (errAction.action === 'EMPTY_OUTPUT') {
        permit.release({ success: false });
        recordCallTelemetry({
          success: false,
          permitId: permit.permitId,
          model: modelName,
          role,
          inTokens: 0,
          outTokens: 0,
          finishReason: 'EMPTY_OUTPUT',
          errorMessage: errAction.message,
          attempt
        });
        console.warn(`  ⚠️ [EMPTY_OUTPUT] ${errAction.message}`);
        const emptyErr = new Error(errAction.message);
        emptyErr.isEmptyOutput = true;
        emptyErr.code = 'ERR_EMPTY_MODEL_OUTPUT';
        throw emptyErr;
      }

      permit.release({ success: false });
      recordCallTelemetry({
        success: false,
        permitId: permit.permitId,
        model: modelName,
        role,
        inTokens: 0,
        outTokens: 0,
        finishReason: 'ERROR',
        errorMessage: lastError?.message,
        attempt
      });
      break;
    }
  }

  throw lastError || new Error(`Chiamata per il ruolo ${role} non riuscita sul modello autorizzato.`);
}

/**
 * Cascade Fallback retrocompatibile con segnature esistenti:
 * - callGeminiWithCascade(genAI, modelNames, parts, maxRetriesPerModel)
 * - callGeminiWithCascade(parts, modelNames, maxRetriesPerModel, client)
 */
async function callGeminiWithCascade(arg1, arg2, arg3, arg4) {
  let modelNames, parts, maxRetriesPerModel;

  if (arg1 && typeof arg1.models === 'object') {
    modelNames = Array.isArray(arg2) ? arg2 : FREE_TIER_ALLOWLIST;
    parts = arg3;
    maxRetriesPerModel = arg4 || 3;
  } else if (arg1 && typeof arg1.getGenerativeModel === 'function') {
    modelNames = Array.isArray(arg2) ? arg2 : FREE_TIER_ALLOWLIST;
    parts = arg3;
    maxRetriesPerModel = arg4 || 3;
  } else {
    parts = arg1;
    modelNames = Array.isArray(arg2) ? arg2 : FREE_TIER_ALLOWLIST;
    maxRetriesPerModel = typeof arg3 === 'number' ? arg3 : 3;
  }

  if (!catalogState.initialized) {
    await discoverAndTestModels({ pingCapability: false });
  }

  // Filtra escludendo modelli morti (404)
  const candidateModels = modelNames.filter(m => {
    const entry = catalogState.models.get(m);
    return !entry || entry.state !== MODEL_STATES.DEAD;
  });

  if (candidateModels.length === 0) {
    const activeVisual = catalogState.roleAssignments.VISUAL_EXTRACTION || catalogState.roleAssignments.DOCUMENT_TRIAGE;
    if (activeVisual) candidateModels.push(activeVisual);
  }

  let lastError = null;

  for (const modelName of candidateModels) {
    const entry = catalogState.models.get(modelName);
    if (entry && entry.circuitState === 'OPEN' && entry.nextAttemptTime > Date.now()) {
      continue;
    }

    let attempt = 1;
    while (attempt <= maxRetriesPerModel) {
      await adaptiveConcurrencyController.acquire('VISUAL_EXTRACTION');
      try {
        console.log(`    Tentativo con ${modelName} (giro ${attempt}/${maxRetriesPerModel})...`);
        const ai = getGeminiClient();

        const result = await ai.models.generateContent({
          model: modelName,
          contents: parts
        });

        if (entry) {
          entry.failureCount = 0;
          entry.circuitState = 'CLOSED';
          entry.state = MODEL_STATES.AVAILABLE;
        }

        const responseText = typeof result.text === 'string' ? result.text : (typeof result.text === 'function' ? result.text() : '');

        return {
          text: responseText,
          response: {
            text: () => responseText,
            usageMetadata: result.usageMetadata
          },
          usageMetadata: result.usageMetadata,
          model: modelName
        };

      } catch (err) {
        lastError = sanitizeError(err);
        const errAction = registerEndpointError(modelName, err, attempt, maxRetriesPerModel);

        if (errAction.action === 'FATAL_AUTH') {
          throw errAction.error;
        }

        if (errAction.action === 'LOCAL_RETRY') {
          await new Promise(r => setTimeout(r, errAction.waitMs));
          attempt = errAction.attempt;
          continue;
        }

        if (errAction.action === 'FALLBACK') {
          break;
        }

        if (errAction.action === 'BACKOFF') {
          await new Promise(r => setTimeout(r, errAction.waitMs));
          break;
        }

        break;
      } finally {
        adaptiveConcurrencyController.release('VISUAL_EXTRACTION');
      }
    }
  }

  throw lastError || new Error('Tutti i modelli candidati hanno fallito la chiamata multimodale.');
}

// ============================================================================
// 7. CHIAMATA DEEPSEEK
// ============================================================================

async function callDeepSeekWithRetry(arg1, arg2, arg3) {
  let client, payload, maxRetries;

  if (arg1 && typeof arg1.chat === 'object') {
    client = arg1;
    payload = arg2;
    maxRetries = arg3 || 5;
  } else {
    payload = arg1;
    maxRetries = typeof arg2 === 'number' ? arg2 : 5;
    client = arg3 || getDeepSeekClient();
  }

  let lastErr;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.chat.completions.create(payload);
    } catch (err) {
      lastErr = sanitizeError(err);
      const status = err.status || (err.response && err.response.status);
      const isRateLimit = status === 429 || (err.message && err.message.includes('429'));
      const isServerErr = status >= 500 && status < 600;

      if ((isRateLimit || isServerErr) && attempt < maxRetries) {
        const backoffMs = Math.min(12000, Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000));
        console.warn(`  ⚠️ DeepSeek API HTTP ${status || 'Errore'} (tentativo ${attempt}/${maxRetries}). Attesa di sicurezza: ${Math.round(backoffMs)}ms...`);
        await new Promise(r => setTimeout(r, backoffMs));
      } else {
        throw lastErr;
      }
    }
  }
  throw lastErr;
}

// ============================================================================
// 8. STATO SALUTE API
// ============================================================================

function checkApiHealthStatus() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  return {
    geminiKey: !!geminiKey && geminiKey !== 'inserisci_qui_la_tua_chiave_gemini',
    deepseekKey: !!deepseekKey && deepseekKey !== 'inserisci_qui_la_tua_chiave_deepseek',
    geminiRoles: { ...catalogState.roleAssignments },
    discoveryInitialized: catalogState.initialized,
    concurrencyThrottled: adaptiveConcurrencyController.isThrottled,
    maxGlobalConcurrency: adaptiveConcurrencyController.maxGlobal
  };
}

module.exports = {
  getDeepSeekClient,
  getGeminiClient,
  sanitizeForDeepSeek,
  sanitizeString,
  sanitizeError,
  callDeepSeekWithRetry,
  callGeminiWithCascade,
  callGeminiRole,
  discoverAndTestModels,
  getModelAssignments,
  getModelCatalog,
  checkApiHealthStatus,
  registerEndpointError,
  adaptiveConcurrencyController,
  concurrencyLimiter,
  MODEL_STATES,
  defaultAccessManager,
  GoogleAIStudioAccessManager,
  MODEL_STATUS,
  ALLOW_PAID_GEMINI,
  recordCallTelemetry,
  getCallTelemetrySummary
};
