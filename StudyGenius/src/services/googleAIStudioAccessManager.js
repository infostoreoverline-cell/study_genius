/**
 * StudyGenius Academic Intelligence System
 * src/services/googleAIStudioAccessManager.js
 * 
 * Gestore Centralizzato dei Permessi, Disponibilità, Quote e Limiti di Google AI Studio.
 * 
 * Autorità Unica e Sovrana su:
 * 1. Credenziali sicure e Zero-Leakage (mascheramento API Key, identificativo progetto univoco)
 * 2. Profiling multistrato di sessione (`PermissionProfile`)
 * 3. Divieto assoluto di servizi a pagamento (`ALLOW_PAID_GEMINI = false`)
 * 4. Gestione Consenso Privacy Utente (Google Free Tier Data Policy)
 * 5. Discovery Paginata (`ai.models.list()`) e Capability Testing reale (Immagini / PDF)
 * 6. Intersezione tra realtà tecnica e Allowlist Amministrata Free Tier
 * 7. Accounting Quote su finestra Pacific Time (RPD, RPM, TPM con Soft e Hard Limits)
 * 8. Rilascio di `ExecutionPermit` temporanei prima di ogni chiamata a Gemini
 * 9. Classificazione rigorosa degli errori (401, 403, 404, 429, 500/503, Safety Blocks)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const { FREE_TIER_ALLOWLIST, GEMINI_ROLE_HIERARCHIES, OPERATIONAL_CATALOG } = require('../config');

// Vincolo Invalicabile di Sicurezza Economica: MAI passare al Paid Tier
const ALLOW_PAID_GEMINI = false;

// Stati dei modelli nel catalogo
const MODEL_STATUS = {
  AUTHORIZED: 'AUTHORIZED',                             // Visibile, in allowlist, budget disponibile
  SOFT_LIMIT_REACHED: 'SOFT_LIMIT_REACHED',             // 80% RPD consumato: riservato solo a richieste critiche/riparazioni (20% riserva)
  QUOTA_EXHAUSTED: 'QUOTA_EXHAUSTED',                   // 100% RPD o 429 ricevuto: sospeso fino al reset PT
  TEMPORARILY_OVERLOADED: 'TEMPORARILY_OVERLOADED',     // 503 / 500: Circuit breaker OPEN per 90s
  UNSUPPORTED: 'UNSUPPORTED',                           // Manca generateContent o capability multimodale
  POLICY_DISALLOWED: 'POLICY_DISALLOWED',               // Fuori allowlist (preview, experimental, latest, audio, ecc.)
  UNAUTHORIZED_AUTH: 'UNAUTHORIZED_AUTH',               // 401 / 403 irreversibile
  DEAD: 'DEAD'                                          // 404 Not Found
};

// Quote Free Tier basate sull'osservazione empirica del progetto Google AI Studio (9 settembre 2026)
// RPD: Requests/Day, RPM: Req/Min, TPM: Tokens/Min input, outputTokenLimit: Max Output, minIntervalMs per Call Pacing
const MODEL_QUOTA_SPECS = {
  // Modelli ad alto volume (Flash-Lite): 500 RPD osservati, 15 RPM, 250k TPM, distanziamento 4s, 65k output
  'gemini-3.5-flash-lite': { rpd: 500, rpm: 15, tpm: 250000, outputTokenLimit: 65536, softLimitRatio: 0.80, minIntervalMs: 4000, category: 'HIGH_VOLUME' },
  'gemini-3.1-flash-lite': { rpd: 500, rpm: 15, tpm: 250000, outputTokenLimit: 65536, softLimitRatio: 0.80, minIntervalMs: 4000, category: 'HIGH_VOLUME' },
  'gemini-2.5-flash-lite': { rpd: 250, rpm: 8,  tpm: 150000, outputTokenLimit: 65536, softLimitRatio: 0.80, minIntervalMs: 7500, category: 'RESERVE' },

  // Modelli di riserva Flash 2.5
  'gemini-2.5-flash':      { rpd: 150, rpm: 5,  tpm: 200000, outputTokenLimit: 65536, softLimitRatio: 0.75, minIntervalMs: 12000, category: 'RESERVE' },

  // Modelli Flash superiori: 20 RPD osservati, 5 RPM, 250k TPM, distanziamento 12s, 65k output.
  // Riservati rigorosamente per revisioni selettive, passaggi complessi o riparazioni grouped
  'gemini-3.8-flash':      { rpd: 20,  rpm: 5,  tpm: 250000, outputTokenLimit: 65536, softLimitRatio: 0.80, minIntervalMs: 12000, category: 'SELECTIVE_REVIEW' },
  'gemini-3.7-flash':      { rpd: 20,  rpm: 5,  tpm: 250000, outputTokenLimit: 65536, softLimitRatio: 0.80, minIntervalMs: 12000, category: 'SELECTIVE_REVIEW' },
  'gemini-3.6-flash':      { rpd: 20,  rpm: 5,  tpm: 250000, outputTokenLimit: 65536, softLimitRatio: 0.80, minIntervalMs: 12000, category: 'SELECTIVE_REVIEW' },
  'gemini-3.5-flash':      { rpd: 20,  rpm: 5,  tpm: 250000, outputTokenLimit: 65536, softLimitRatio: 0.80, minIntervalMs: 12000, category: 'SELECTIVE_REVIEW' },

  // Agente Sandbox
  'antigravity-preview-05-2026': { rpd: 100, rpm: 60, tpm: 100000, outputTokenLimit: 65536, softLimitRatio: 0.80, minIntervalMs: 1000, category: 'AGENT_SANDBOX' },

  // Modelli Pro: quota zero confermata nella console, esclusi dall'esecuzione operativa
  'gemini-2.5-pro':        { rpd: 0,   rpm: 0,  tpm: 0,      outputTokenLimit: 65536, softLimitRatio: 0.00, minIntervalMs: 60000, category: 'ZERO_QUOTA' }
};

// Fallback spec per modelli sconosciuti ma autorizzati
const DEFAULT_QUOTA_SPEC = { rpd: 100, rpm: 3, tpm: 150000, outputTokenLimit: 16384, softLimitRatio: 0.75, minIntervalMs: 20000, category: 'STANDARD' };

/**
 * Calcola il timestamp del prossimo reset della quota di Google (Mezzanotte Pacific Time)
 */
function getNextPacificMidnight() {
  const now = new Date();
  // Pacific Time e' tipicamente UTC-7 (PDT) o UTC-8 (PST). Calcolo esatto:
  const ptString = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const ptDate = new Date(ptString);
  const ptMidnight = new Date(ptDate);
  ptMidnight.setHours(24, 0, 0, 0);
  const diffMs = ptMidnight.getTime() - ptDate.getTime();
  return Date.now() + diffMs;
}

/**
 * Ottiene la chiave del giorno corrente in Pacific Time (YYYY-MM-DD)
 */
function getPacificDayKey() {
  const now = new Date();
  const ptString = now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }); // Formato YYYY-MM-DD
  return ptString;
}

class GoogleAIStudioAccessManager {
  constructor() {
    this.clientInstance = null;
    this.currentApiKey = null;
    this.projectIdHash = null;
    this.maskedKey = null;

    // Policy operativa: 'FREE_TIER_PRUDENT' (default), 'LOCAL_ONLY', 'PAID_TIER_CONTROLLED' (rifiutata se billing=false)
    this.operationPolicy = 'FREE_TIER_PRUDENT';

    // Consenso privacy utente per Google Free Tier
    this.userPrivacyConsent = {
      granted: true, // Attivo di default per materiale didattico aperto, revocabile istantaneamente
      scope: ['ACADEMIC_STUDY_DOCUMENTS'],
      updatedAt: new Date().toISOString(),
      disclaimer: 'I documenti inviati nel Free Tier possono essere utilizzati da Google per il miglioramento dei prodotti. È vietato caricare dati personali, esami riservati o contenuti sensibili.'
    };

    // Registro dinamico dei modelli
    this.modelCatalog = new Map();
    this.lastDiscoveryTime = null;
    this.isDiscoveryRunning = false;

    // Tracciamento locale delle quote per modello e giorno PT
    this.currentDayKey = getPacificDayKey();
    this.dailyUsageCounters = new Map(); // modelName -> stats
    this.minuteWindowCounters = new Map(); // modelName -> timestamps[] per RPM
    this.minuteTokenCounters = new Map();  // modelName -> [{ timestamp, inputTokens }] per TPM scorrevole (60s)

    // Call Pacer e distanziamento temporale minimo (RPM)
    this.lastCallTimestampByModel = new Map();
    this.ledgerFilePath = path.join(__dirname, '../../sessions/quota_ledger.json');

    // Concorrenza adattiva globale per il Free Tier (avvio prudente a 1)
    this.maxGlobalConcurrency = 1;
    this.currentGlobalConcurrency = 0;
    this.currentRoleConcurrency = {
      DOCUMENT_TRIAGE: 0,
      VISUAL_EXTRACTION: 0,
      SCIENTIFIC_REVIEW: 0
    };
    this.concurrencyQueue = [];

    // Profilo operativo della sessione
    this.permissionProfile = null;
  }

  // ==========================================================================
  // 1. GESTIONE CREDENZIALI & PROFILO DI SESSIONE (ZERO LEAKAGE)
  // ==========================================================================

  /**
   * Maschera una chiave API per l'esposizione sicura nei log e nella UI
   */
  maskApiKey(key) {
    if (!key || typeof key !== 'string') return '[NESSUNA_CHIAVE]';
    if (key.length <= 8) return '****';
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
  }

  /**
   * Ricava un identificativo di progetto irreversibile (Hash SHA-256)
   */
  deriveProjectIdHash(key) {
    if (!key) return 'proj_unconfigured';
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return `proj_${hash.slice(0, 10)}`;
  }

  /**
   * Inizializza o aggiorna le credenziali di Google AI Studio
   */
  initializeCredentials(apiKey) {
    const rawKey = apiKey || process.env.GEMINI_API_KEY;

    if (!rawKey || rawKey === 'inserisci_qui_la_tua_chiave_gemini') {
      this.currentApiKey = null;
      this.maskedKey = '[NON_CONFIGURATA]';
      this.projectIdHash = 'proj_none';
      this.clientInstance = null;
      this.invalidateProfile('Chiave API mancante o placeholder.');
      return false;
    }

    // Se la chiave è cambiata, invalida il profilo precedente e ricrea il client SDK
    if (this.currentApiKey !== rawKey) {
      this.currentApiKey = rawKey;
      this.maskedKey = this.maskApiKey(rawKey);
      this.projectIdHash = this.deriveProjectIdHash(rawKey);
      this.clientInstance = new GoogleGenAI({ apiKey: rawKey });
      this.loadQuotaLedger();
      this.invalidateProfile('Nuova chiave API registrata. Profilo ricostruito.');
      console.log(`🔐 [ACCESS_MANAGER] Inizializzato progetto: ${this.projectIdHash} (Chiave: ${this.maskedKey})`);
    }

    return true;
  }

  /**
   * Restituisce l'istanza client sicura SDK
   */
  getClient() {
    if (!this.clientInstance) {
      this.initializeCredentials();
    }
    if (!this.clientInstance) {
      throw new Error('[GoogleAIStudioAccessManager] Client non inizializzabile: GEMINI_API_KEY non valida.');
    }
    return this.clientInstance;
  }

  /**
   * Invalida e forza la ricostruzione del PermissionProfile
   */
  invalidateProfile(reason = 'Richiesta esplicita') {
    this.permissionProfile = null;
    this.modelCatalog.clear();
    console.log(`🔄 [ACCESS_MANAGER] Profilo operativo invalidato (${reason}).`);
  }

  // ==========================================================================
  // 2. PRIVACY & CONSENSO UTENTE
  // ==========================================================================

  getPrivacyConsent() {
    return { ...this.userPrivacyConsent };
  }

  setPrivacyConsent(granted, scope = ['ACADEMIC_STUDY_DOCUMENTS']) {
    this.userPrivacyConsent.granted = !!granted;
    this.userPrivacyConsent.scope = scope;
    this.userPrivacyConsent.updatedAt = new Date().toISOString();

    if (!granted) {
      this.operationPolicy = 'LOCAL_ONLY';
      console.warn(`🛑 [PRIVACY_REVOCATION] Consenso documenti revocato dall'utente. Attivata forzatamente policy LOCAL_ONLY.`);
    } else {
      if (this.operationPolicy === 'LOCAL_ONLY') {
        this.operationPolicy = 'FREE_TIER_PRUDENT';
      }
      console.log(`✅ [PRIVACY_CONSENT] Consenso documenti registrato (Policy: ${this.operationPolicy}).`);
    }
    this.rebuildPermissionProfile();
    return this.getPrivacyConsent();
  }

  // ==========================================================================
  // 3. OPERATIONAL POLICY
  // ==========================================================================

  getOperationPolicy() {
    return this.operationPolicy;
  }

  setOperationPolicy(newPolicy) {
    if (newPolicy === 'PAID_TIER_CONTROLLED' && !ALLOW_PAID_GEMINI) {
      console.error(`❌ [POLICY_VIOLATION] Tentativo di attivare PAID_TIER_CONTROLLED respinto: ALLOW_PAID_GEMINI = false (Nessun addebito consentito).`);
      throw new Error('Impossibile attivare servizi a pagamento: Study Genius opera rigorosamente in Free Tier Standard.');
    }

    if (!['FREE_TIER_PRUDENT', 'LOCAL_ONLY'].includes(newPolicy)) {
      throw new Error(`Policy non valida: ${newPolicy}. Utilizzare FREE_TIER_PRUDENT o LOCAL_ONLY.`);
    }

    this.operationPolicy = newPolicy;
    console.log(`⚙️ [ACCESS_POLICY] Politica operativa impostata a: ${this.operationPolicy}`);
    this.rebuildPermissionProfile();
    return this.operationPolicy;
  }

  // ==========================================================================
  // 3.b CATALOGO OPERATIVO, VERIFICA RITIRI E ADATTAZIONE THINKING
  // ==========================================================================

  /**
   * Restituisce il catalogo operativo completo versionato (9 settembre 2026)
   */
  getOperationalCatalog() {
    return OPERATIONAL_CATALOG || {};
  }

  /**
   * Verifica se un modello è stato dismesso/ritirato secondo il calendario ufficiale Google
   */
  isModelRetired(modelName) {
    if (!modelName) return { retired: false, isRetired: false };
    const clean = modelName.replace(/^models\//, '');
    const retired = OPERATIONAL_CATALOG.excluded_retirements?.[clean];
    if (retired) {
      return {
        retired: true,
        isRetired: true,
        model: clean,
        retiredDate: retired.retired_date,
        retirementDate: retired.retired_date,
        replacement: retired.replacement,
        proposedReplacement: retired.replacement
      };
    }
    // Pattern matching per famiglie storiche ritirate
    if (/gemini-1\.5/i.test(clean)) {
      return {
        retired: true,
        isRetired: true,
        model: clean,
        retiredDate: 'obsolete',
        retirementDate: 'obsolete',
        replacement: 'gemini-3.5-flash-lite / gemini-3.8-flash',
        proposedReplacement: 'gemini-3.5-flash-lite / gemini-3.8-flash'
      };
    }
    if (/gemini-2\.0/i.test(clean)) {
      return {
        retired: true,
        isRetired: true,
        model: clean,
        retiredDate: '2026-06-01',
        retirementDate: '2026-06-01',
        replacement: 'gemini-3.5-flash-lite / gemini-3.8-flash',
        proposedReplacement: 'gemini-3.5-flash-lite / gemini-3.8-flash'
      };
    }
    return { retired: false, isRetired: false };
  }

  /**
   * Verifica la rispondenza delle capacità del modello ai requisiti del job e vincoli Free Tier
   */
  checkModelCapabilities(modelName, requirements = {}) {
    const clean = (modelName || '').replace(/^models\//, '');
    const retired = this.isModelRetired(clean);
    if (retired.isRetired) {
      return {
        capable: false,
        eligible: false,
        reason: 'ERR_MODEL_RETIRED',
        details: `Modello ${clean} dismesso (${retired.retirementDate}). Sostituzione proposta: ${retired.proposedReplacement}`
      };
    }

    const entry = OPERATIONAL_CATALOG.models?.[clean];
    if (!entry) {
      return {
        capable: false,
        eligible: false,
        reason: 'ERR_MODEL_NOT_FOUND',
        details: `Modello ${clean} non presente nel catalogo operativo.`
      };
    }

    // Salvaguardia economica: blocco modelli a pagamento se ALLOW_PAID_GEMINI=false
    if (!ALLOW_PAID_GEMINI && entry.free_tier_publicly_exposed === false) {
      return {
        capable: false,
        eligible: false,
        reason: 'ERR_PAID_MODEL_BLOCKED',
        details: `Modello ${clean} è classificato a pagamento (Free Tier non disponibile).`
      };
    }

    const reqJson = requirements.requiresJson || requirements.requireJSON;
    if (reqJson && entry.capabilities?.json === false) {
      return { capable: false, eligible: false, reason: 'ERR_CAPABILITY_JSON_UNSUPPORTED' };
    }

    const reqVision = requirements.requiresVision || requirements.requireVision;
    if (reqVision && !entry.accepts?.includes('image') && !entry.accepts?.includes('pdf')) {
      return { capable: false, eligible: false, reason: 'ERR_CAPABILITY_VISION_UNSUPPORTED' };
    }

    const reqPdf = requirements.requiresPdf || requirements.requirePdf;
    if (reqPdf && !entry.accepts?.includes('pdf')) {
      return { capable: false, eligible: false, reason: 'ERR_CAPABILITY_PDF_UNSUPPORTED' };
    }

    return { capable: true, eligible: true, entry };
  }

  /**
   * Adatta i parametri di thinking in base alle regole specifiche del modello
   * (rispettando che minimal non è ammesso su gemini-3.8-flash e 3.7-flash, e che 3.5 Flash-Lite usa minimal)
   */
  adaptThinkingConfig(modelName, requestedLevelOrBudget = null, role = '') {
    const clean = (modelName || '').replace(/^models\//, '');
    const catalogEntry = OPERATIONAL_CATALOG.models?.[clean];
    const thinkingSpec = catalogEntry?.thinking;

    if (!thinkingSpec) {
      if (typeof requestedLevelOrBudget === 'number' && requestedLevelOrBudget > 0) {
        return {
          thinkingBudget: requestedLevelOrBudget,
          thinkingConfig: { thinkingBudget: requestedLevelOrBudget }
        };
      }
      return {};
    }

    const { supported_levels = [], default_level = 'medium', supports_minimal = false } = thinkingSpec;

    // Regola critica documentata Google: gemini-3.8-flash e 3.7-flash NON supportano minimal
    if (!supports_minimal && (requestedLevelOrBudget === 'minimal' || requestedLevelOrBudget === 0)) {
      console.warn(`  ⚠️ [THINKING_ADAPT] Modello ${clean} non supporta 'minimal'. Adattato a 'low'.`);
      return {
        thinkingLevel: 'low',
        thinkingConfig: { thinkingLevel: 'low' }
      };
    }

    if (typeof requestedLevelOrBudget === 'string' && supported_levels.includes(requestedLevelOrBudget)) {
      return {
        thinkingLevel: requestedLevelOrBudget,
        thinkingConfig: { thinkingLevel: requestedLevelOrBudget }
      };
    }

    if (typeof requestedLevelOrBudget === 'number') {
      if (requestedLevelOrBudget === 0 && !supports_minimal) {
        return {
          thinkingLevel: 'low',
          thinkingConfig: { thinkingLevel: 'low' }
        };
      }
      return {
        thinkingBudget: requestedLevelOrBudget,
        thinkingConfig: { thinkingBudget: requestedLevelOrBudget }
      };
    }

    // Default ottimali per ruolo didattico o modello
    if (role === 'DOCUMENT_TRIAGE' || role === 'VISUAL_EXTRACTION') {
      const level = supports_minimal ? 'minimal' : 'low';
      return {
        thinkingLevel: level,
        thinkingConfig: { thinkingLevel: level }
      };
    }

    const effectiveDefault = default_level || (supports_minimal ? 'minimal' : 'medium');
    return {
      thinkingLevel: effectiveDefault,
      thinkingConfig: { thinkingLevel: effectiveDefault }
    };
  }

  /**
   * Helper per inizializzazione esplicita del progetto
   */
  initializeProject(projectId, apiKey) {
    if (apiKey) {
      this.initializeCredentials(apiKey);
    }
    if (projectId) {
      this.projectIdHash = projectId;
    }
    return true;
  }

  /**
   * Helper con alias per consenso privacy documenti didattici
   */
  setDocumentPrivacyConsent(granted, policy = 'FREE_TIER_PRUDENT') {
    if (policy && policy !== this.operationPolicy) {
      try {
        this.setOperationPolicy(policy);
      } catch (_) {}
    }
    return this.setPrivacyConsent(granted);
  }

  // ==========================================================================
  // 4. DISCOVERY DINAMICA E CAPABILITY TEST REALE
  // ==========================================================================

  /**
   * Esegue la discovery dinamica paginata e verifica le capability reali dei modelli
   */
  async discoverAndVerifyModels(options = {}) {
    const { forceRefresh = false, runCapabilityPing = true } = options;

    if (this.isDiscoveryRunning) {
      console.log('  ⏳ [DISCOVERY] Discovery già in corso. Attendo completamento.');
      return this.permissionProfile;
    }

    if (this.permissionProfile && this.modelCatalog.size > 0 && !forceRefresh) {
      return this.permissionProfile;
    }

    this.isDiscoveryRunning = true;

    try {
      if (!this.initializeCredentials()) {
        return this.buildDegradedProfile('Credenziali non configurate');
      }

      console.log(`\n🔍 [ACCESS_MANAGER] Interrogazione catalogo modelli Google AI Studio per progetto ${this.projectIdHash}...`);
      const ai = this.getClient();
      const discoveredRaw = [];

      try {
        const pager = await ai.models.list();
        for await (const m of pager) {
          discoveredRaw.push(m);
        }
      } catch (listErr) {
        const status = listErr.status || (listErr.message && listErr.message.includes('401') ? 401 : (listErr.message && listErr.message.includes('403') ? 403 : null));
        if (status === 401) {
          throw new Error('401_UNAUTHORIZED: Chiave API non valida o revocata.');
        }
        if (status === 403) {
          throw new Error('403_FORBIDDEN: API Gemini non abilitata per questo progetto o restrizioni di chiave attive.');
        }
        throw listErr;
      }

      console.log(`  📋 Modelli rilevati da Google: ${discoveredRaw.length} totali.`);
      this.modelCatalog.clear();

      for (const rawModel of discoveredRaw) {
        const normName = (rawModel.name || '').replace(/^models\//, '');
        const actions = rawModel.supportedActions || [];
        const supportsGenerateContent = actions.includes('generateContent');

        // Solo modelli che supportano generateContent
        if (!supportsGenerateContent) {
          this.modelCatalog.set(normName, {
            name: normName,
            status: MODEL_STATUS.UNSUPPORTED,
            reason: 'Manca generateContent',
            actions,
            circuitState: 'CLOSED'
          });
          continue;
        }

        // Verifica Allowlist Amministrata
        const isAllowed = FREE_TIER_ALLOWLIST.includes(normName);
        if (!isAllowed) {
          this.modelCatalog.set(normName, {
            name: normName,
            status: MODEL_STATUS.POLICY_DISALLOWED,
            reason: 'Non presente nella allowlist Free Tier Standard (escluso preview/experimental/audio/ecc.)',
            actions,
            circuitState: 'CLOSED'
          });
          continue;
        }

        // Il modello soddisfa sia la visibilita' tecnica che la policy
        const spec = MODEL_QUOTA_SPECS[normName] || DEFAULT_QUOTA_SPEC;

        this.modelCatalog.set(normName, {
          name: normName,
          status: MODEL_STATUS.AUTHORIZED,
          actions,
          inputTokenLimit: rawModel.inputTokenLimit || 1000000,
          outputTokenLimit: rawModel.outputTokenLimit || 8192,
          quotaSpec: spec,
          circuitState: 'CLOSED',
          circuitOpenUntil: 0,
          failureCount: 0,
          capabilities: {
            generateContent: true,
            imageVision: true,
            pdfVision: true
          },
          lastChecked: new Date().toISOString()
        });
      }

      // Capability ping minimo sui modelli primari se richiesto
      if (runCapabilityPing && this.operationPolicy !== 'LOCAL_ONLY') {
        await this.runMinimalCapabilityTests();
      }

      this.lastDiscoveryTime = new Date().toISOString();
      return this.rebuildPermissionProfile();

    } finally {
      this.isDiscoveryRunning = false;
    }
  }

  /**
   * Esegue un capability test minimale con micro-pixel per accertare che l'endpoint accetti payload visuali
   */
  async runMinimalCapabilityTests() {
    const candidatesToTest = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    const ai = this.getClient();
    const transparent1pxPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    for (const modelName of candidatesToTest) {
      const entry = this.modelCatalog.get(modelName);
      if (!entry || entry.status !== MODEL_STATUS.AUTHORIZED) continue;

      try {
        await ai.models.generateContent({
          model: modelName,
          contents: [
            'Ping test',
            { inlineData: { mimeType: 'image/png', data: transparent1pxPngBase64 } }
          ],
          config: { maxOutputTokens: 5, temperature: 0.0 }
        });
        entry.capabilities.imageVision = true;
      } catch (err) {
        if (err.status === 404) {
          entry.status = MODEL_STATUS.DEAD;
          entry.reason = '404 durante capability test';
        } else if (err.status === 429) {
          // Non è un problema di capability ma di quota momentanea
          entry.status = MODEL_STATUS.QUOTA_EXHAUSTED;
          entry.reason = 'Quota limit raggiunto durante ping';
        }
      }
    }
  }

  // ==========================================================================
  // 5. ACCOUNTING QUOTE (PACIFIC TIME, LEDGER PERSISTENTE & CALL PACING)
  // ==========================================================================

  /**
   * Carica lo storico quote persistente dal file sessions/quota_ledger.json
   */
  loadQuotaLedger() {
    try {
      if (fs.existsSync(this.ledgerFilePath)) {
        const raw = fs.readFileSync(this.ledgerFilePath, 'utf8');
        const ledger = JSON.parse(raw);
        const pId = this.projectIdHash || 'proj_default';
        const dayData = ledger?.[pId]?.[this.currentDayKey];
        if (dayData && typeof dayData === 'object') {
          for (const [mName, stats] of Object.entries(dayData)) {
            this.dailyUsageCounters.set(mName, {
              booked: stats.booked || 0,
              sent: stats.sent || 0,
              succeeded: stats.succeeded || 0,
              failedRemote: stats.failedRemote || 0,
              failedLocal: stats.failedLocal || 0,
              requestsAttempted: stats.requestsAttempted || stats.sent || 0,
              requestsAccepted: stats.requestsAccepted || stats.booked || 0,
              requestsSuccess: stats.requestsSuccess || stats.succeeded || 0,
              requestsFailed: stats.requestsFailed || stats.failedRemote || 0,
              tokensInput: stats.tokensInput || 0,
              tokensOutput: stats.tokensOutput || 0
            });
          }
          console.log(`📖 [QUOTA_LEDGER] Caricato storico quote persistente per ${pId} (${this.currentDayKey}): ${this.dailyUsageCounters.size} modelli registrati.`);
        }
      }
    } catch (e) {
      console.warn(`  ⚠️ [QUOTA_LEDGER] Impossibile caricare il ledger delle quote (${e.message}).`);
    }
  }

  /**
   * Salva atomicamente i contatori locali nel file sessions/quota_ledger.json
   */
  saveQuotaLedger() {
    try {
      let ledger = {};
      if (fs.existsSync(this.ledgerFilePath)) {
        try {
          ledger = JSON.parse(fs.readFileSync(this.ledgerFilePath, 'utf8'));
        } catch (_) {
          ledger = {};
        }
      }
      const pId = this.projectIdHash || 'proj_default';
      if (!ledger[pId]) ledger[pId] = {};
      if (!ledger[pId][this.currentDayKey]) ledger[pId][this.currentDayKey] = {};

      for (const [mName, stats] of this.dailyUsageCounters.entries()) {
        ledger[pId][this.currentDayKey][mName] = { ...stats, lastUpdated: new Date().toISOString() };
      }

      const dir = path.dirname(this.ledgerFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.ledgerFilePath, JSON.stringify(ledger, null, 2), 'utf8');
    } catch (e) {
      console.warn(`  ⚠️ [QUOTA_LEDGER] Impossibile salvare il ledger delle quote: ${e.message}`);
    }
  }

  /**
   * Call Pacer: distanziamento temporale minimo obbligatorio per rispettare i limiti RPM
   * e attesa intelligente a finestra mobile per rispettare i limiti TPM senza frammentare i pacchetti.
   */
  async enforceCallPacing(modelName, estimatedInputTokens = 0) {
    const spec = MODEL_QUOTA_SPECS[modelName] || DEFAULT_QUOTA_SPEC;

    // 1. Pacing RPM: distanziamento minimo tra chiamate consecutive
    const minIntervalMs = spec.minIntervalMs || 6700;
    const lastTimestamp = this.lastCallTimestampByModel.get(modelName) || 0;
    const elapsed = Date.now() - lastTimestamp;

    if (elapsed < minIntervalMs) {
      const waitMs = minIntervalMs - elapsed;
      console.log(`⏳ [CALL_PACER]: Pacing rate limit su ${modelName}: attesa pianificata di ${(waitMs / 1000).toFixed(1)}s (rispetto limite ${spec.rpm} RPM)...`);
      await new Promise(r => setTimeout(r, waitMs));
    }

    // 2. Pacing TPM: controllo della finestra scorrevole a 60 secondi
    // Se l'invio del pacchetto superasse il budget TPM prudenziale, attendiamo che i token più vecchi escano dalla finestra.
    const prudentialTpmLimit = Math.floor((spec.tpm || 150000) * (spec.softLimitRatio || 0.85));
    let attempts = 0;
    const maxTpmWaitAttempts = 12; // Massimo ~60s di attesa

    while (attempts < maxTpmWaitAttempts && estimatedInputTokens > 0) {
      const currentTpm = this.getMinuteTpm(modelName);
      if (currentTpm + estimatedInputTokens <= prudentialTpmLimit || currentTpm === 0) {
        break; // Budget sufficiente per inviare il pacchetto intero!
      }

      const tokenEntries = this.minuteTokenCounters.get(modelName) || [];
      const now = Date.now();
      const oldestEntry = tokenEntries[0];
      // Calcolo esatto in millisecondi del rilascio dei token dalla finestra scorrevole
      const exactTimeToExpiryMs = oldestEntry ? Math.max(0, 60000 - (now - oldestEntry.timestamp) + 500) : 1000;
      const waitMs = Math.min(Math.max(exactTimeToExpiryMs, 500), 15000);

      console.log(`⏳ [TPM_PACER]: Token nel minuto per ${modelName} (${currentTpm} attuali + stimati ${estimatedInputTokens} > limite prudenziale ${prudentialTpmLimit} TPM). Attesa attiva esatta di ${(waitMs / 1000).toFixed(1)}s per inviare il blocco intero senza frammentazione...`);
      await new Promise(r => setTimeout(r, waitMs));
      attempts++;
    }

    this.lastCallTimestampByModel.set(modelName, Date.now());
  }

  /**
   * Restituisce il bilancio di quota disponibile per la pianificazione pre-flight
   */
  getRemainingBudget() {
    this.checkAndResetDailyCounters();
    const result = {
      pacificDay: this.currentDayKey,
      nextResetTime: new Date(getNextPacificMidnight()).toISOString(),
      models: {}
    };

    let totalRemaining = 0;
    let totalSoftRemaining = 0;

    for (const [name, spec] of Object.entries(MODEL_QUOTA_SPECS)) {
      if (spec.rpd === 0) continue;
      const usage = this.getModelUsage(name);
      const used = usage.requestsAccepted || 0;
      const remaining = Math.max(0, spec.rpd - used);
      const softLimit = Math.floor(spec.rpd * (spec.softLimitRatio || 0.8));
      const softRemaining = Math.max(0, softLimit - used);

      totalRemaining += remaining;
      totalSoftRemaining += softRemaining;

      result.models[name] = {
        rpdMax: spec.rpd,
        rpmMax: spec.rpm,
        used,
        remaining,
        softLimit,
        softRemaining,
        isSoftLimitReached: used >= softLimit,
        isExhausted: used >= spec.rpd
      };
    }

    result.totalRemaining = totalRemaining;
    result.totalSoftRemaining = totalSoftRemaining;
    return result;
  }

  checkAndResetDailyCounters() {
    const today = getPacificDayKey();
    if (this.currentDayKey !== today) {
      console.log(`🌅 [QUOTA_RESET] Inizio nuova giornata di quota Google (Pacific Time: ${today}). Reset contatori locali.`);
      this.currentDayKey = today;
      this.dailyUsageCounters.clear();
      this.minuteWindowCounters.clear();
      this.minuteTokenCounters.clear();
      this.loadQuotaLedger();

      // Riabilita modelli che erano in QUOTA_EXHAUSTED
      for (const [name, entry] of this.modelCatalog.entries()) {
        if (entry.status === MODEL_STATUS.QUOTA_EXHAUSTED || entry.status === MODEL_STATUS.SOFT_LIMIT_REACHED) {
          entry.status = MODEL_STATUS.AUTHORIZED;
          entry.failureCount = 0;
        }
      }
      this.saveQuotaLedger();
    }
  }

  getModelUsage(modelName) {
    this.checkAndResetDailyCounters();
    if (!this.dailyUsageCounters.has(modelName)) {
      this.dailyUsageCounters.set(modelName, {
        booked: 0,
        sent: 0,
        succeeded: 0,
        failedRemote: 0,
        failedLocal: 0,
        requestsAttempted: 0,
        requestsAccepted: 0,
        requestsSuccess: 0,
        requestsFailed: 0,
        tokensInput: 0,
        tokensOutput: 0
      });
    }
    return this.dailyUsageCounters.get(modelName);
  }

  getMinuteRpm(modelName) {
    const now = Date.now();
    const timestamps = this.minuteWindowCounters.get(modelName) || [];
    const valid = timestamps.filter(t => now - t < 60000);
    this.minuteWindowCounters.set(modelName, valid);
    return valid.length;
  }

  getMinuteTpm(modelName) {
    const now = Date.now();
    const entries = this.minuteTokenCounters.get(modelName) || [];
    const valid = entries.filter(e => now - e.timestamp < 60000);
    this.minuteTokenCounters.set(modelName, valid);
    return valid.reduce((sum, e) => sum + (e.inputTokens || 0), 0);
  }

  recordMinuteRequest(modelName, inputTokens = 0) {
    const now = Date.now();
    const timestamps = this.minuteWindowCounters.get(modelName) || [];
    timestamps.push(now);
    this.minuteWindowCounters.set(modelName, timestamps);

    const tokenEntries = this.minuteTokenCounters.get(modelName) || [];
    tokenEntries.push({ timestamp: now, inputTokens: inputTokens || 0 });
    this.minuteTokenCounters.set(modelName, tokenEntries);
  }

  // ==========================================================================
  // 6. COSTRUZIONE DEL PERMISSION PROFILE
  // ==========================================================================

  rebuildPermissionProfile() {
    if (!this.maskedKey) {
      this.initializeCredentials();
    }
    this.checkAndResetDailyCounters();

    const assignedRoles = this.resolveRoleAssignments();
    const visibleSummary = [];

    for (const [name, entry] of this.modelCatalog.entries()) {
      const usage = this.getModelUsage(name);
      const spec = entry.quotaSpec || DEFAULT_QUOTA_SPEC;
      visibleSummary.push({
        name,
        status: entry.status,
        reason: entry.reason || null,
        circuitState: entry.circuitState,
        usage: {
          rpdUsed: usage.requestsAccepted,
          rpdMax: spec.rpd,
          rpdSoftLimit: Math.floor(spec.rpd * spec.softLimitRatio),
          rpmCurrent: this.getMinuteRpm(name),
          rpmMax: spec.rpm
        }
      });
    }

    this.permissionProfile = {
      credentialsValid: !!this.currentApiKey,
      projectIdHash: this.projectIdHash,
      maskedKey: this.maskedKey,
      tier: 'FREE_TIER_STANDARD',
      billingAllowed: ALLOW_PAID_GEMINI,
      operationPolicy: this.operationPolicy,
      privacyConsent: { ...this.userPrivacyConsent },
      roleAssignments: assignedRoles,
      models: visibleSummary,
      quotaResetTime: new Date(getNextPacificMidnight()).toISOString(),
      limits: {
        maxGlobalConcurrency: this.maxGlobalConcurrency,
        maxTierC: 1,
        maxReview: 1
      },
      updatedAt: new Date().toISOString()
    };

    return this.permissionProfile;
  }

  buildDegradedProfile(reason) {
    return {
      credentialsValid: false,
      projectIdHash: 'proj_unauthorized',
      maskedKey: '[NON_CONFIGURATA]',
      tier: 'FREE_TIER_STANDARD',
      billingAllowed: false,
      operationPolicy: 'LOCAL_ONLY',
      privacyConsent: { ...this.userPrivacyConsent },
      roleAssignments: { DOCUMENT_TRIAGE: null, VISUAL_EXTRACTION: null, SCIENTIFIC_REVIEW: null },
      models: [],
      error: reason,
      updatedAt: new Date().toISOString()
    };
  }

  getPermissionProfile() {
    if (!this.permissionProfile) {
      return this.rebuildPermissionProfile();
    }
    return this.permissionProfile;
  }

  // ==========================================================================
  // 7. RISOLUZIONE DEI RUOLI DIDATTICI
  // ==========================================================================

  resolveRoleAssignments() {
    const roles = ['DOCUMENT_TRIAGE', 'VISUAL_EXTRACTION', 'SCIENTIFIC_REVIEW', 'VISUAL_QA_FAST', 'VISUAL_QA_DEEP'];
    const result = {};

    for (const role of roles) {
      const preferred = GEMINI_ROLE_HIERARCHIES[role] || [];
      let selected = null;

      for (const mName of preferred) {
        const entry = this.modelCatalog.get(mName);
        if (!entry) continue;

        const spec = entry.quotaSpec || MODEL_QUOTA_SPECS[mName] || DEFAULT_QUOTA_SPEC;
        if (spec.rpd === 0) continue; // Salta modelli con quota zero (es. Pro)

        // Modello deve essere autorizzato e con circuito chiuso
        const isCircuitClosed = entry.circuitState === 'CLOSED' || (entry.circuitOpenUntil && Date.now() >= entry.circuitOpenUntil);
        const hasBudget = entry.status === MODEL_STATUS.AUTHORIZED || entry.status === MODEL_STATUS.SOFT_LIMIT_REACHED;

        if (entry.status !== MODEL_STATUS.DEAD && entry.status !== MODEL_STATUS.POLICY_DISALLOWED && isCircuitClosed && hasBudget) {
          selected = mName;
          break;
        }
      }

      result[role] = selected;
    }

    return result;
  }

  /**
   * Restituisce dinamicamente il miglior modello attualmente autorizzato e disponibile per un dato ruolo
   * 
   * @param {string} role Ruolo didattico (es. 'VISUAL_QA_FAST', 'VISUAL_QA_DEEP')
   * @returns {string} Nome del modello (es. 'gemini-3.5-flash-lite', 'gemini-3.8-flash')
   */
  getBestAvailableModel(role = 'VISUAL_QA_FAST') {
    const profile = this.getPermissionProfile();
    if (profile && profile.roleAssignments && profile.roleAssignments[role]) {
      return profile.roleAssignments[role];
    }
    const preferred = GEMINI_ROLE_HIERARCHIES[role] || GEMINI_ROLE_HIERARCHIES.VISUAL_QA_FAST || [];
    for (const mName of preferred) {
      const entry = this.modelCatalog.get(mName);
      if (entry && (entry.status === MODEL_STATUS.AUTHORIZED || entry.status === MODEL_STATUS.SOFT_LIMIT_REACHED)) {
        return mName;
      }
    }
    return preferred[0] || 'gemini-3.5-flash-lite';
  }

  // ==========================================================================
  // 8. RILASCIO DI EXECUTION PERMIT (GATING RIGOROSO PRE-CHIAMATA)
  // ==========================================================================

  /**
   * Richiede un permesso temporaneo prima di effettuare una chiamata a Gemini
   */
  async requestExecutionPermit({
    role = 'DOCUMENT_TRIAGE',
    model = null,
    preferredModel = null,
    isCritical = false,
    estimatedInputTokens = 1000,
    estimatedOutputTokens = 0,
    justification = 'Operazione ordinaria',
    targetScope = '',
    requiresJson = false,
    requiresVision = false,
    requiresPdf = false
  } = {}) {
    // 1. Controllo Consenso Privacy
    if (!this.userPrivacyConsent.granted) {
      throw new Error('ERR_PRIVACY_CONSENT_REQUIRED: Impossibile contattare Gemini senza il consenso al trattamento dei documenti Free Tier.');
    }

    // 2. Controllo Policy
    if (this.operationPolicy === 'LOCAL_ONLY') {
      throw new Error('ERR_POLICY_LOCAL_ONLY: La policy attiva esclude chiamate esterne. Consentita solo elaborazione locale.');
    }

    // 3. Controllo Divieto Assoluto Billing
    if (ALLOW_PAID_GEMINI) {
      throw new Error('ERR_SECURITY_VIOLATION: ALLOW_PAID_GEMINI deve rimanere false.');
    }

    // 4. Reset Quota Quotidiana se passata mezzanotte PT
    this.checkAndResetDailyCounters();

    // 5. Verifica Modelli Ruolo Popolati nel Catalogo
    const targetExplicitModel = model || preferredModel;
    const preferredList = targetExplicitModel ? [targetExplicitModel] : (GEMINI_ROLE_HIERARCHIES[role] || []);
    const hasAnyPreferred = preferredList.some(m => this.modelCatalog.has(m));
    if (!hasAnyPreferred) {
      await this.discoverAndVerifyModels({ runCapabilityPing: false });
    }

    // Se un modello specifico è stato richiesto esplicitamente, controlliamo ritiri e capabilities
    if (targetExplicitModel) {
      const ret = this.isModelRetired(targetExplicitModel);
      if (ret.isRetired || ret.retired) {
        return {
          granted: false,
          code: 'ERR_MODEL_RETIRED',
          message: `Il modello '${targetExplicitModel}' è stato dismesso (${ret.retirementDate || ret.retiredDate}). Sostituzione proposta: ${ret.proposedReplacement || ret.replacement}`,
          proposedReplacement: ret.proposedReplacement || ret.replacement,
          modelName: targetExplicitModel
        };
      }
      const cap = this.checkModelCapabilities(targetExplicitModel, { requiresJson, requiresVision, requiresPdf });
      if (!cap.capable && !cap.eligible) {
        return {
          granted: false,
          code: cap.reason || 'ERR_MODEL_INCAPABLE',
          message: cap.details || cap.reason,
          modelName: targetExplicitModel
        };
      }
    }

    // 6. Selezione Modello Idoneo
    let chosenModel = null;
    let chosenEntry = null;

    for (const mName of preferredList) {
      // Controllo esclusioni ritiri pubblicati
      const ret = this.isModelRetired(mName);
      if (ret.retired) continue;

      // Controllo capabilities minime richieste
      const cap = this.checkModelCapabilities(mName, { requiresJson, requiresVision, requiresPdf });
      if (!cap.capable) continue;

      const entry = this.modelCatalog.get(mName);
      if (!entry) continue;

      const spec = entry.quotaSpec || MODEL_QUOTA_SPECS[mName] || DEFAULT_QUOTA_SPEC;
      if (spec.rpd === 0) continue; // Salta modelli a quota zero (es. Pro)

      // Circuit Breaker check
      if (entry.circuitState === 'OPEN') {
        if (Date.now() < entry.circuitOpenUntil) {
          continue; // Ancora in cooldown
        }
        // Cooldown terminato: circuito si richiude
        entry.circuitState = 'CLOSED';
        entry.failureCount = 0;
        console.log(`  ⚡ [CIRCUIT_CLOSED] Cooldown terminato per ${mName}. Modello riammesso.`);
      }

      // Quota check
      const usage = this.getModelUsage(mName);
      const isHardExhausted = usage.requestsAccepted >= spec.rpd || entry.status === MODEL_STATUS.QUOTA_EXHAUSTED;
      if (isHardExhausted) continue;

      const isSoftReached = usage.requestsAccepted >= Math.floor(spec.rpd * spec.softLimitRatio);
      if (isSoftReached && !isCritical) {
        // Se siamo oltre il soft limit, riserviamo questo modello superiore solo a richieste critiche / riparazioni
        continue;
      }

      chosenModel = mName;
      chosenEntry = entry;
      break;
    }

    if (!chosenModel) {
      const err = new Error(`ALL_CANDIDATES_OVERLOADED: Nessun modello disponibile per il ruolo ${role} (tutti sovraccarichi o quota esaurita).`);
      err.code = 'ALL_CANDIDATES_OVERLOADED';
      throw err;
    }

    // 6. Concorrenza Adattiva Free Tier
    await this.acquireConcurrency(role);

    // 6.b Distanziamento Temporale Call Pacer (rispetto limiti RPM e TPM)
    await this.enforceCallPacing(chosenModel, estimatedInputTokens);

    // 7. Registra autorizzazione e aggiorna contatori preventivi
    const usage = this.getModelUsage(chosenModel);
    usage.booked = (usage.booked || 0) + 1;
    usage.sent = (usage.sent || 0) + 1;
    usage.requestsAttempted++;
    usage.requestsAccepted++;
    this.recordMinuteRequest(chosenModel, estimatedInputTokens);
    this.saveQuotaLedger();

    const permitId = `permit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const spec = chosenEntry.quotaSpec || DEFAULT_QUOTA_SPEC;
    const isReserveUsed = usage.requestsAccepted > Math.floor(spec.rpd * spec.softLimitRatio);

    // Calcolo dinamico di maxOutputTokens in base al fabbisogno stimato (fino a 65.536 tokens supportati)
    let defaultBase = role === 'DOCUMENT_TRIAGE' ? 1024 : (role === 'VISUAL_EXTRACTION' ? 4096 : 2048);
    let maxOutputTokens = defaultBase;
    if (estimatedOutputTokens > 0) {
      maxOutputTokens = Math.max(defaultBase, Math.round(estimatedOutputTokens * 1.5));
    }
    const modelCeiling = spec.outputTokenLimit || spec.maxOutputTokens || 65536;
    maxOutputTokens = Math.min(modelCeiling, maxOutputTokens);

    console.log(`🎟️ [EXECUTION_PERMIT] Rilasciato ${permitId} | Ruolo: ${role} | Modello: ${chosenModel} | Riserva: ${isReserveUsed ? 'SÌ' : 'NO'} | Motivo: "${justification}"`);

    // Permesso restituito al chiamante
    return {
      granted: true,
      permitId,
      model: chosenModel,
      modelName: chosenModel,
      role,
      maxOutputTokens,
      isReserveUsed,
      justification,
      release: (metrics = {}) => {
        this.releaseConcurrency(role);
        if (metrics.success) {
          usage.succeeded = (usage.succeeded || 0) + 1;
          usage.requestsSuccess++;
          usage.tokensInput += metrics.inputTokens || 0;
          usage.tokensOutput += metrics.outputTokens || 0;
        } else {
          if (metrics.isLocalError) {
            usage.failedLocal = (usage.failedLocal || 0) + 1;
          } else {
            usage.failedRemote = (usage.failedRemote || 0) + 1;
            usage.requestsFailed++;
          }
        }
        this.saveQuotaLedger();
      }
    };
  }

  async acquireConcurrency(role) {
    if (this.canAcquireConcurrency(role)) {
      this.currentGlobalConcurrency++;
      this.currentRoleConcurrency[role] = (this.currentRoleConcurrency[role] || 0) + 1;
      return;
    }

    await new Promise(resolve => {
      this.concurrencyQueue.push({ role, resolve });
    });

    this.currentGlobalConcurrency++;
    this.currentRoleConcurrency[role] = (this.currentRoleConcurrency[role] || 0) + 1;
  }

  canAcquireConcurrency(role) {
    if (this.currentGlobalConcurrency >= this.maxGlobalConcurrency) return false;
    if (role === 'VISUAL_EXTRACTION' && (this.currentRoleConcurrency.VISUAL_EXTRACTION || 0) >= 1) return false;
    if (role === 'SCIENTIFIC_REVIEW' && (this.currentRoleConcurrency.SCIENTIFIC_REVIEW || 0) >= 1) return false;
    return true;
  }

  releaseConcurrency(role) {
    this.currentGlobalConcurrency = Math.max(0, this.currentGlobalConcurrency - 1);
    this.currentRoleConcurrency[role] = Math.max(0, (this.currentRoleConcurrency[role] || 1) - 1);

    for (let i = 0; i < this.concurrencyQueue.length; i++) {
      const item = this.concurrencyQueue[i];
      if (this.canAcquireConcurrency(item.role)) {
        this.concurrencyQueue.splice(i, 1);
        item.resolve();
        break;
      }
    }
  }

  // ==========================================================================
  // 9. CLASSIFICAZIONE RIGOROSA DEGLI ERRORI
  // ==========================================================================

  classifyAndHandleError(modelName, err, attempt = 1, maxAttempts = 3) {
    const status = err.status || (err.message && err.message.includes('401') ? 401 :
      (err.message && err.message.includes('403') ? 403 :
      (err.message && err.message.includes('404') ? 404 :
      (err.message && err.message.includes('429') ? 429 :
      (err.message && (err.message.includes('500') || err.message.includes('503')) ? 503 : null)))));

    const entry = this.modelCatalog.get(modelName);

    // 1. 401 Unauthorized
    if (status === 401) {
      if (entry) entry.status = MODEL_STATUS.UNAUTHORIZED_AUTH;
      this.invalidateProfile('401 Unauthorized');
      return {
        action: 'FATAL_AUTH',
        code: 'ERR_UNAUTHORIZED',
        message: 'Chiave API non valida o revocata. Impossibile proseguire.'
      };
    }

    // 2. 403 Forbidden
    if (status === 403) {
      if (entry) entry.status = MODEL_STATUS.UNAUTHORIZED_AUTH;
      return {
        action: 'FATAL_AUTH',
        code: 'ERR_FORBIDDEN',
        message: 'Permessi negati (403): verifica abilitazione Generative Language API o restrizioni progetto.'
      };
    }

    // 3. 404 Not Found
    if (status === 404) {
      if (entry) {
        entry.status = MODEL_STATUS.DEAD;
        entry.circuitState = 'OPEN';
        entry.circuitOpenUntil = Infinity;
      }
      return {
        action: 'FALLBACK',
        code: 'ERR_NOT_FOUND',
        isDead: true,
        message: `Modello ${modelName} non trovato (404). Rimosso permanentemente dal catalogo.`
      };
    }

    // 4. 429 Resource Exhausted (Quota limit)
    if (status === 429) {
      if (entry) {
        entry.status = MODEL_STATUS.QUOTA_EXHAUSTED;
      }
      this.maxGlobalConcurrency = 1; // Riduzione prudente della concorrenza
      return {
        action: 'BACKOFF',
        code: 'ERR_QUOTA_EXHAUSTED',
        retryDelayMs: 25000,
        message: `Quota o rate limit raggiunto su ${modelName}. Sospeso fino al reset.`
      };
    }

    // 5. 500 / 503 High Demand / Unavailable
    if (status === 500 || status === 503 || (err.message && /high demand|overloaded|unavailable/i.test(err.message))) {
      if (attempt < maxAttempts) {
        const delayMs = attempt === 1
          ? Math.floor(2000 + Math.random() * 3000)
          : Math.floor(8000 + Math.random() * 7000);

        return {
          action: 'LOCAL_RETRY',
          code: 'ERR_PROVIDER_OVERLOAD',
          retryDelayMs: delayMs,
          attempt: attempt + 1,
          message: `Endpoint ${modelName} temporaneamente sovraccarico (503). Riprovo tra ${(delayMs / 1000).toFixed(1)}s (jitter).`
        };
      }

      // Al 3° tentativo fallito: apre il circuito per 90s
      if (entry) {
        entry.status = MODEL_STATUS.TEMPORARILY_OVERLOADED;
        entry.circuitState = 'OPEN';
        entry.circuitOpenUntil = Date.now() + 90000;
      }

      return {
        action: 'FALLBACK',
        code: 'CIRCUIT_OPEN',
        circuitCooldownMs: 90000,
        isDead: false,
        message: `Endpoint ${modelName} ha fallito 3 tentativi consecutivi (503). Circuito aperto per 90s. Fallback attivato.`
      };
    }

    // 6. Content Safety Block
    if (err.message && /safety|blocked|violation/i.test(err.message)) {
      return {
        action: 'SAFETY_BLOCK',
        code: 'ERR_SAFETY_BLOCK',
        message: 'Contenuto bloccato dai filtri di sicurezza epistemica di Google AI Studio.'
      };
    }

    // 7. Empty Model Output (SDK-level: no text, no tool calls)
    // Lanciato da @google/genai quando il modello restituisce una risposta vuota
    // (es. finish_reason=RECITATION, safety silenzioso, glitch transiente).
    // Strategia: LOCAL_RETRY se ci sono ancora tentativi, EMPTY_OUTPUT altrimenti
    // in modo che i caller possano skippare questa unità anziché crashare.
    if (err.message && /model output (must|error|must contain)/i.test(err.message)) {
      if (attempt < maxAttempts) {
        const delayMs = Math.floor(3000 + Math.random() * 4000);
        return {
          action: 'LOCAL_RETRY',
          code: 'ERR_EMPTY_MODEL_OUTPUT',
          retryDelayMs: delayMs,
          attempt: attempt + 1,
          message: `Risposta vuota dal modello ${modelName} (output vuoto). Riprovo tra ${(delayMs / 1000).toFixed(1)}s (tentativo ${attempt + 1}/${maxAttempts}).`
        };
      }
      return {
        action: 'EMPTY_OUTPUT',
        code: 'ERR_EMPTY_MODEL_OUTPUT',
        isDead: false,
        message: `Modello ${modelName} ha restituito output vuoto dopo ${maxAttempts} tentativi. Unità saltata.`
      };
    }

    // Fallback generico
    return {
      action: 'FALLBACK',
      code: 'ERR_GENERIC',
      message: err.message
    };
  }
}

// Singleton condiviso
const defaultAccessManager = new GoogleAIStudioAccessManager();

module.exports = {
  GoogleAIStudioAccessManager,
  defaultAccessManager,
  MODEL_STATUS,
  MODEL_QUOTA_SPECS,
  ALLOW_PAID_GEMINI
};
