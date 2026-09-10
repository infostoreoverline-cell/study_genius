const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../');
const SESSIONS_DIR = path.join(ROOT_DIR, 'sessions');
const PROMPTS_DIR = path.join(ROOT_DIR, 'prompts');
const PREFERENCES_FILE = path.join(ROOT_DIR, 'preferences.json');
const SAMPLES_DIR = path.join(ROOT_DIR, 'samples');

const PORT = parseInt(process.env.PORT, 10) || 3000;

const OPERATIONAL_CATALOG = require('./googleAIStudioOperationalCatalog.json');

// Vincolo invalicabile economico: nessun addebito/servizio a pagamento
const ALLOW_PAID_GEMINI = false;

// Allowlist controllata Free Tier Standard (aggiornata al 9 settembre 2026)
const FREE_TIER_ALLOWLIST = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro'
];

// Gerarchie di preferenza dei modelli per ruolo didattico
// Ordine operativo mirato: 3.5 Flash-Lite per alto volume (500 RPD), riservando 3.8 Flash per revisioni (20 RPD)
const GEMINI_ROLE_HIERARCHIES = {
  DOCUMENT_TRIAGE: [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite'
  ],
  VISUAL_EXTRACTION: [
    'gemini-3.5-flash-lite', // Prima scelta proposta: alto volume, 500 RPD, 15 RPM
    'gemini-3.1-flash-lite', // Alternativa compatibile: 500 RPD, 15 RPM
    'gemini-3.6-flash',      // Fallback Flash multimodale
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-2.5-flash'
  ],
  SCIENTIFIC_REVIEW: [
    'gemini-3.8-flash',      // Riservato per revisioni selettive, passaggi complessi o riparazioni grouped
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash'
  ],
  VISUAL_QA_FAST: [
    'gemini-3.5-flash-lite', // Veloce, multimodale ad alto volume (500 RPD)
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
  ],
  VISUAL_QA_DEEP: [
    'gemini-3.8-flash',      // Ragionamento visivo specialistico / Blind Final Review
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash'
  ]
};

const VISUAL_QA_CONFIG = {
  mode: process.env.VISUAL_QA_MODE || 'standard', // 'off' | 'standard' | 'high' | 'maximum'
  maxMicroRepairs: 3,
  maxRedesigns: 1,
  minScientificScore: 95,
  minSemanticScore: 92,
  minReadabilityScore: 90
};

const GEMINI_MODELS = FREE_TIER_ALLOWLIST;

const GEMINI_CONFIG = {
  initialConcurrency: 2,
  maxRetriesPerModel: 2,
  backoffInitialMs: 15000,
  timeoutMs: 90000
};

// Limiti per l'upload di documenti (PDF e PPTX) e payload HTTP
const UPLOAD_LIMITS = {
  maxFileSize: 500 * 1024 * 1024, // 500 MB
  maxFiles: 100,                  // Fino a 100 file contemporaneamente (supporta intere cartelle di slide)
  bodyJsonLimit: '250mb'
};

const PATHS = {
  ROOT_DIR,
  SESSIONS_DIR,
  PROMPTS_DIR,
  PREFERENCES_FILE,
  SAMPLES_DIR
};

const GENERATION = {
  MAX_CONCURRENT_WORKERS: parseInt(process.env.MAX_CONCURRENT_WORKERS, 10) || 120
};

const CONFIG = {
  PORT,
  ROOT_DIR,
  SESSIONS_DIR,
  PROMPTS_DIR,
  PREFERENCES_FILE,
  SAMPLES_DIR,
  PATHS,
  GEMINI_MODELS,
  FREE_TIER_ALLOWLIST,
  GEMINI_ROLE_HIERARCHIES,
  GEMINI_CONFIG,
  VISUAL_QA_CONFIG,
  UPLOAD_LIMITS,
  GENERATION,
  OPERATIONAL_CATALOG,
  ALLOW_PAID_GEMINI
};
CONFIG.CONFIG = CONFIG;

module.exports = {
  CONFIG,
  ROOT_DIR,
  SESSIONS_DIR,
  PROMPTS_DIR,
  PREFERENCES_FILE,
  SAMPLES_DIR,
  PORT,
  GEMINI_MODELS,
  FREE_TIER_ALLOWLIST,
  GEMINI_ROLE_HIERARCHIES,
  GEMINI_CONFIG,
  VISUAL_QA_CONFIG,
  UPLOAD_LIMITS,
  PATHS,
  GENERATION,
  OPERATIONAL_CATALOG,
  ALLOW_PAID_GEMINI
};

