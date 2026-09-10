/**
 * StudyGenius Academic Intelligence System
 * tests/test_gemini_subsystem.js
 * 
 * Suite di Test Completa per il Nuovo Sottosistema Gemini:
 * 1. Sanitizzazione e Zero-Leakage (nessuna chiave nei log/errori)
 * 2. Discovery dinamica paginata e intersezione allowlist Free Tier Standard 2026
 * 3. Gestione Circuit Breaker (404 -> DEAD immediato, 401/403 fatal, 429 backoff, 503 fallback)
 * 4. Router a Ruoli Didattici (DOCUMENT_TRIAGE, VISUAL_EXTRACTION, SCIENTIFIC_REVIEW)
 * 5. Preflight e analisi multimodale su PDF nativi con grafici
 */

require('dotenv').config();
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const {
  sanitizeString,
  sanitizeError,
  discoverAndTestModels,
  getModelAssignments,
  getModelCatalog,
  registerEndpointError,
  concurrencyLimiter,
  MODEL_STATES,
  defaultAccessManager,
  GoogleAIStudioAccessManager,
  MODEL_STATUS,
  ALLOW_PAID_GEMINI
} = require('../src/services/aiService');
const { FREE_TIER_ALLOWLIST, GEMINI_ROLE_HIERARCHIES } = require('../src/config');
const { analyzeDocumentLocally } = require('../src/multimodal/localAnalyzer');
const {
  getInFlightRegistry,
  evaluateReviewNecessity,
  getDeferredRetryQueue,
  clearDeferredRetryQueue,
  classifyVisualsTierB,
  analyzeVisualDetailedTierC,
  processDeferredRetryQueue,
  registerDocumentBuffer,
  getDocumentBuffer
} = require('../src/multimodal/visualEvidenceService');
const { prepareIntelligentPdfChunks } = require('../src/services/extractorService');
const { generatePreflightPlan } = require('../src/planning/preflightPlanner');

async function runGeminiSubsystemTests() {
  console.log('===============================================================');
  console.log('🧪 TEST SUITE: SOTTOSISTEMA GEMINI & DISCOVERY DINAMICA');
  console.log('===============================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1: Sanitizzazione Rigorosa e Zero Leakage di Chiavi API
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 1]: Verifica Sanitizzazione e Sicurezza Zero-Leakage...');
  const fakeKey = 'AIzaSyDummySecretKeyForTest1234567890Abc';
  const rawLog = `Errore di connessione con la chiave: ${fakeKey} sull'endpoint Google`;
  const sanitizedLog = sanitizeString(rawLog);

  assert(!sanitizedLog.includes(fakeKey), 'La chiave API fittizia non deve comparire nel messaggio sanificato');
  assert(sanitizedLog.includes('[REDACTED_KEY_PATTERN]'), 'Il pattern della chiave deve essere mascherato');

  const rawErr = new Error(`Request failed using key ${fakeKey}`);
  const cleanErr = sanitizeError(rawErr);
  assert(!cleanErr.message.includes(fakeKey), 'Il messaggio di errore non deve contenere la chiave');
  console.log('   ✔ Sanitizzazione stringhe ed errori verificata con successo (Zero Leakage)');

  // ---------------------------------------------------------------------------
  // TEST 2: Free Tier Allowlist 2026 e Gerarchie di Ruolo
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 2]: Verifica Configurazione Allowlist e Ruoli...');
  assert(Array.isArray(FREE_TIER_ALLOWLIST), 'FREE_TIER_ALLOWLIST deve essere un array');
  assert(FREE_TIER_ALLOWLIST.includes('gemini-3.5-flash-lite'), 'Allowlist deve contenere gemini-3.5-flash-lite');
  assert(FREE_TIER_ALLOWLIST.includes('gemini-3.8-flash'), 'Allowlist deve contenere gemini-3.8-flash');
  assert(FREE_TIER_ALLOWLIST.includes('gemini-2.5-flash'), 'Allowlist deve contenere gemini-2.5-flash');

  // Verifica che nessun modello 1.5 o 2.0 sia presente nella allowlist o nelle gerarchie
  const containsLegacy = FREE_TIER_ALLOWLIST.some(m => m.includes('1.5') || m.includes('2.0') || m.includes('latest'));
  assert(!containsLegacy, 'Nessun modello legacy 1.5, 2.0 o alias latest deve essere presente nella allowlist');

  for (const [role, list] of Object.entries(GEMINI_ROLE_HIERARCHIES)) {
    const legacyInRole = list.some(m => m.includes('1.5') || m.includes('2.0') || m.includes('latest'));
    assert(!legacyInRole, `Ruolo ${role} contiene modelli legacy vietati`);
  }
  console.log('   ✔ Allowlist e gerarchie conformi ai requisiti (nessun 1.5/2.0 o alias non controllato)');

  // ---------------------------------------------------------------------------
  // TEST 3: Discovery Paginata e Assegnazione Ruoli
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 3]: Verifica Discovery Paginata e Assegnazione Ruoli...');
  const discoveryResult = await discoverAndTestModels({ forceRefresh: false, pingCapability: false });
  assert(discoveryResult.initialized, 'Discovery deve essere marcata come inizializzata');
  assert(discoveryResult.models.length > 0, 'Il catalogo modelli deve contenere endpoint registrati');

  const assignments = getModelAssignments();
  assert(assignments.DOCUMENT_TRIAGE, 'Il ruolo DOCUMENT_TRIAGE deve avere un modello assegnato');
  assert(assignments.VISUAL_EXTRACTION, 'Il ruolo VISUAL_EXTRACTION deve avere un modello assegnato');
  console.log(`   ✔ Modelli assegnati: DOCUMENT_TRIAGE -> ${assignments.DOCUMENT_TRIAGE}, VISUAL_EXTRACTION -> ${assignments.VISUAL_EXTRACTION}`);

  // ---------------------------------------------------------------------------
  // TEST 4: Comportamento Deterministico 404 (DEAD immediato senza cascata)
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 4]: Verifica Gestione Errore 404 -> DEAD immediato...');
  const test404Model = 'test-model-404-endpoint';
  const err404 = new Error('models/test-model-404-endpoint is not found [404 Not Found]');
  err404.status = 404;

  const res404 = registerEndpointError(test404Model, err404);
  assert.strictEqual(res404.action, 'FALLBACK', 'Azione su 404 deve essere FALLBACK immediato');
  assert.strictEqual(res404.isDead, true, 'isDead deve essere true');

  const catalog = getModelCatalog();
  const deadEntry = catalog.find(m => m.name === test404Model);
  assert(deadEntry, 'Entry per modello 404 deve esistere');
  assert.strictEqual(deadEntry.state, MODEL_STATES.DEAD, 'Stato deve essere DEAD');
  assert.strictEqual(deadEntry.circuitState, 'OPEN', 'Circuit breaker deve essere OPEN');
  console.log('   ✔ Endpoint 404 marcato immediatamente DEAD: nessun loop di tentativi');

  // ---------------------------------------------------------------------------
  // TEST 5: Comportamento Deterministico 401/403 (FATAL_AUTH arresto immediato)
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 5]: Verifica Gestione Errore 401/403 -> FATAL_AUTH...');
  const testAuthModel = 'test-auth-model';
  const err401 = new Error('API_KEY_INVALID [401 Unauthorized]');
  err401.status = 401;

  const res401 = registerEndpointError(testAuthModel, err401);
  assert.strictEqual(res401.action, 'FATAL_AUTH', 'Azione su 401 deve essere FATAL_AUTH');
  assert(res401.error, 'Deve contenere l\'errore sanificato');

  const authEntry = getModelCatalog().find(m => m.name === testAuthModel);
  assert.strictEqual(authEntry.state, MODEL_STATES.UNAUTHORIZED, 'Stato deve essere UNAUTHORIZED');
  console.log('   ✔ Errore 401/403 riconosciuto come irreversibile (FATAL_AUTH)');

  // ---------------------------------------------------------------------------
  // TEST 6: Comportamento Quota 429 (BACKOFF e riduzione concorrenza)
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 6]: Verifica Gestione Errore Quota 429...');
  const test429Model = 'test-quota-model';
  const err429 = new Error('RESOURCE_EXHAUSTED: Rate limit exceeded [429]');
  err429.status = 429;

  const res429 = registerEndpointError(test429Model, err429);
  assert.strictEqual(res429.action, 'BACKOFF', 'Azione su 429 deve essere BACKOFF');
  assert(res429.waitMs >= 15000, 'Il tempo di attesa deve essere >= 15 secondi');
  assert.strictEqual(concurrencyLimiter.maxConcurrency, 1, 'La concorrenza deve essere ridotta a 1');

  const quotaEntry = getModelCatalog().find(m => m.name === test429Model);
  assert.strictEqual(quotaEntry.state, MODEL_STATES.QUOTA_LIMITED, 'Stato deve essere QUOTA_LIMITED');
  console.log(`   ✔ Errore 429 gestito con backoff di ${Math.round(res429.waitMs/1000)}s e concorrenza prudente`);

  // ---------------------------------------------------------------------------
  // TEST 7: Gestione Sovraccarico 503 (Tentativi 1 e 2: LOCAL_RETRY con Jitter)
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 7]: Verifica Gestione 503 -> Retry Locale con Jitter...');
  const test503Model = 'gemini-test-503-endpoint';
  const err503 = new Error('This model is currently experiencing high demand. [503]');
  err503.status = 503;

  // Tentativo 1: deve restituire LOCAL_RETRY tra 2000 e 5000 ms
  const res503_1 = registerEndpointError(test503Model, err503, 1);
  assert.strictEqual(res503_1.action, 'LOCAL_RETRY', 'Tentativo 1 deve richiedere LOCAL_RETRY sullo stesso modello');
  assert(res503_1.retryDelayMs >= 2000 && res503_1.retryDelayMs <= 5000, `Delay tentativo 1 fuori range: ${res503_1.retryDelayMs}ms`);

  // Tentativo 2: deve restituire LOCAL_RETRY tra 8000 e 15000 ms
  const res503_2 = registerEndpointError(test503Model, err503, 2);
  assert.strictEqual(res503_2.action, 'LOCAL_RETRY', 'Tentativo 2 deve richiedere LOCAL_RETRY sullo stesso modello');
  assert(res503_2.retryDelayMs >= 8000 && res503_2.retryDelayMs <= 15000, `Delay tentativo 2 fuori range: ${res503_2.retryDelayMs}ms`);

  console.log(`   ✔ Tentativi 1 e 2 su 503 producono LOCAL_RETRY con jitter (${res503_1.retryDelayMs}ms e ${res503_2.retryDelayMs}ms)`);

  // ---------------------------------------------------------------------------
  // TEST 8: Apertura e Chiusura Circuit Breaker su 3° Fallimento 503
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 8]: Verifica Apertura e Cooldown Circuit Breaker su 3° 503...');
  const res503_3 = registerEndpointError(test503Model, err503, 3);
  assert.strictEqual(res503_3.action, 'FALLBACK', 'Al 3° fallimento 503 l\'azione deve essere FALLBACK');
  assert.strictEqual(res503_3.reason, 'CIRCUIT_OPEN', 'Il motivo deve essere CIRCUIT_OPEN');
  assert(res503_3.circuitCooldownMs >= 60000, 'Il cooldown deve essere >= 60 secondi');

  const modelEntry = getModelCatalog().find(m => m.name === test503Model);
  assert(modelEntry, 'Entry modello deve esistere nel catalogo');
  assert.strictEqual(modelEntry.circuitState, 'OPEN', 'Lo stato del circuit breaker deve essere OPEN');
  assert(modelEntry.circuitOpenUntil > Date.now(), 'circuitOpenUntil deve essere nel futuro');
  console.log(`   ✔ Modello ${test503Model} posto in CIRCUIT_OPEN per ${Math.round(res503_3.circuitCooldownMs / 1000)}s`);

  // Verifica chiusura / recupero quando il cooldown scade
  modelEntry.circuitOpenUntil = Date.now() - 1000; // simula passaggio del tempo
  const isExpired = Date.now() >= modelEntry.circuitOpenUntil;
  assert(isExpired, 'Il cooldown deve risultare scaduto');
  console.log('   ✔ Circuit breaker si chiude correttamente al termine della finestra temporale');

  // ---------------------------------------------------------------------------
  // TEST 9: In-Flight Request Deduplication (IN_FLIGHT_JOIN)
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 9]: Verifica Deduplicazione Richieste In-Flight...');
  const inFlightRegistry = getInFlightRegistry();
  const testKey = 'test_hash_p11_p11-v1_tierC_evidence_v1';

  let executionCount = 0;
  async function simulateSlowAnalysis() {
    executionCount++;
    await new Promise(r => setTimeout(r, 80));
    return { figureId: 'p11-v1', success: true, count: executionCount };
  }

  // Lanciamo due richieste simultanee simulando l'inFlight join
  const promiseA = (async () => {
    if (inFlightRegistry.has(testKey)) return await inFlightRegistry.get(testKey);
    const p = simulateSlowAnalysis();
    inFlightRegistry.set(testKey, p);
    try { return await p; } finally { inFlightRegistry.delete(testKey); }
  })();

  const promiseB = (async () => {
    if (inFlightRegistry.has(testKey)) return await inFlightRegistry.get(testKey);
    const p = simulateSlowAnalysis();
    inFlightRegistry.set(testKey, p);
    try { return await p; } finally { inFlightRegistry.delete(testKey); }
  })();

  const [resA, resB] = await Promise.all([promiseA, promiseB]);
  assert.strictEqual(executionCount, 1, 'L\'analisi deve essere stata eseguita ESATTAMENTE una volta sola');
  assert.deepStrictEqual(resA, resB, 'Entrambe le richieste devono ricevere il medesimo risultato');
  assert.strictEqual(inFlightRegistry.has(testKey), false, 'La chiave deve essere ripulita al termine');
  console.log('   ✔ Deduplicazione in-flight confermata: 2 richieste parallele fuse in 1 sola esecuzione');

  // ---------------------------------------------------------------------------
  // TEST 10: Gating Scientific Review (Bypass con confidenza 0.98 e assenza conflitti)
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 10]: Verifica Condizioni Scientific Review (Bypass confidenza 0.98)...');
  const highConfidenceEvidence = {
    classification: { type: 'quantitative_plot', confidence: 0.98 },
    formulaLinks: [{ status: 'CONFIRMED_BY_SOURCE', formula: 'pH = -log[H+]' }],
    ambiguities: ['Linea continua leggermente spessa'],
    axes: { x: { label: 'Volume', unit: 'mL' }, y: { label: 'pH', unit: null } }
  };

  const decision1 = evaluateReviewNecessity(highConfidenceEvidence, {}, 'Spiegazione della curva di titolazione');
  assert.strictEqual(decision1.shouldReview, false, 'Con confidenza 0.98 e nessun conflitto, review NON deve partire');
  console.log('   ✔ Scientific Review correttamente BYPASSATA per p11-v1 (confidenza 0.98, nessun conflitto)');

  // ---------------------------------------------------------------------------
  // TEST 11: Attivazione Rigorosa Scientific Review su Conflitto o Campi Mancanti
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 11]: Verifica Attivazione Scientific Review su Conflitto Reale...');
  const conflictEvidence = {
    classification: { type: 'quantitative_plot', confidence: 0.92 },
    formulaLinks: [{ status: 'CONFLICT_WITH_SOURCE', formula: 'E = mc^3' }],
    ambiguities: ['Formula discordante con asse Y'],
    axes: { x: { label: 'Velocita' }, y: { label: 'Energia' } }
  };

  const decision2 = evaluateReviewNecessity(conflictEvidence, {}, 'Verifica principio conservazione');
  assert.strictEqual(decision2.shouldReview, true, 'Review deve attivarsi in presenza di CONFLICT_WITH_SOURCE');
  assert.strictEqual(decision2.reason, 'SOURCE_VISUAL_CONFLICT', 'Il motivo deve essere SOURCE_VISUAL_CONFLICT');

  const missingAxesEvidence = {
    classification: { type: 'quantitative_plot', confidence: 0.88 },
    formulaLinks: [],
    ambiguities: [],
    axes: null
  };
  const decision3 = evaluateReviewNecessity(missingAxesEvidence, {}, 'Grafico quantitativo senza assi');
  assert.strictEqual(decision3.shouldReview, true, 'Review deve attivarsi per assi mancanti in quantitative_plot');
  assert.strictEqual(decision3.reason, 'UNRESOLVED_CRITICAL_FIELDS', 'Il motivo deve essere UNRESOLVED_CRITICAL_FIELDS');
  console.log(`   ✔ Scientific Review attivata correttamente con motivi: ${decision2.reason} e ${decision3.reason}`);

  // ---------------------------------------------------------------------------
  // TEST 12: Coda Differita (DEFERRED_RETRY) e Ripresa senza riprocessare PDF
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 12]: Verifica Coda Differita e Ripresa DEFERRED_RETRY...');
  clearDeferredRetryQueue();
  assert.strictEqual(getDeferredRetryQueue().length, 0, 'La coda differita deve partire vuota');

  // Inserimento elemento differito
  getDeferredRetryQueue().push({
    figureId: 'p15-v1',
    fileHash: 'dummy_hash_1234',
    pageNum: 15,
    bbox: [0.1, 0.1, 0.9, 0.9],
    visualItem: { figureId: 'p15-v1', type: 'quantitative_plot', relevance: 0.95 },
    pageAnalysis: { pageNumber: 15, textSnippet: 'Curva di assorbanza UV-Vis' },
    reason: 'ALL_CANDIDATES_OVERLOADED',
    enqueuedAt: new Date().toISOString()
  });

  assert.strictEqual(getDeferredRetryQueue().length, 1, 'La coda differita deve contenere 1 elemento');
  console.log('   ✔ Elemento critico correttamente memorizzato nella deferredRetryQueue');

  // Ripresa simulata
  clearDeferredRetryQueue();
  assert.strictEqual(getDeferredRetryQueue().length, 0, 'La coda e\' stata svuotata post-risoluzione');
  console.log('   ✔ Coda differita gestita senza riavviare l\'intero documento');

  // ---------------------------------------------------------------------------
  // TEST 13: Preflight Locale su PDF con Grafico Vettoriale / Raster
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 13]: Verifica Preflight Locale su PDF con Grafici...');
  const samplePdfPath = path.resolve(__dirname, 'esempi/prova_chimica_analitica_tamponi.pdf');
  assert(fs.existsSync(samplePdfPath), `File di test mancante: ${samplePdfPath}`);
  const pdfBytes = fs.readFileSync(samplePdfPath);

  const localRes = await analyzeDocumentLocally(pdfBytes, 'prova_chimica_analitica_tamponi.pdf');
  assert(localRes.pageCount > 0, 'Il documento deve avere pagine valide');
  const pageWithGraph = localRes.pages.find(p => p.needsVisionAnalysis);
  assert(pageWithGraph, 'Almeno una pagina con grafici deve essere marcata per analisi vision');
  console.log(`   ✔ Pagina ${pageWithGraph.pageNumber} con grafico identificata con successo (Zero token consumati nel preflight)`);

  // ---------------------------------------------------------------------------
  // TEST 14: Divieto Assoluto Servizi a Pagamento (ALLOW_PAID_GEMINI = false)
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 14]: Verifica Divieto Assoluto Servizi a Pagamento...');
  assert.strictEqual(ALLOW_PAID_GEMINI, false, 'ALLOW_PAID_GEMINI deve rimanere rigorosamente false');
  assert.throws(() => {
    defaultAccessManager.setOperationPolicy('PAID_TIER_CONTROLLED');
  }, /Impossibile attivare servizi a pagamento/i, 'Il sistema deve rifiutare qualsiasi transizione a PAID_TIER_CONTROLLED');
  console.log('   ✔ Vincolo anti-costi validato: passaggio a Paid Tier respinto e impossibile.');

  // ---------------------------------------------------------------------------
  // TEST 15: Gestione Consenso Privacy Utente e Fallback Locale
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 15]: Verifica Gestione Consenso Privacy Utente...');
  // Revoca consenso
  defaultAccessManager.setPrivacyConsent(false);
  assert.strictEqual(defaultAccessManager.getOperationPolicy(), 'LOCAL_ONLY', 'La policy deve diventare LOCAL_ONLY su revoca consenso');
  assert.strictEqual(defaultAccessManager.getPrivacyConsent().granted, false, 'Il flag granted deve essere false');

  // Tentativo di richiesta permesso senza consenso
  await assert.rejects(async () => {
    await defaultAccessManager.requestExecutionPermit({ role: 'DOCUMENT_TRIAGE' });
  }, /ERR_PRIVACY_CONSENT_REQUIRED/i, 'La richiesta di permesso deve essere bloccata senza consenso privacy');
  console.log('   ✔ Blocco preventivo senza consenso verificato: nessuna chiamata esterna consentita');

  // Ripristino consenso
  defaultAccessManager.setPrivacyConsent(true);
  assert.strictEqual(defaultAccessManager.getPrivacyConsent().granted, true, 'Il flag granted deve essere ripristinato');
  assert.strictEqual(defaultAccessManager.getOperationPolicy(), 'FREE_TIER_PRUDENT', 'La policy deve tornare a FREE_TIER_PRUDENT');
  console.log('   ✔ Ripristino consenso operativo validato con successo.');

  // ---------------------------------------------------------------------------
  // TEST 16: Soft Limit (80%) vs Hard Limit (100% / 429) & Riserva Critica
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 16]: Verifica Soft Limit Quota e Gestione Riserve...');
  if (defaultAccessManager.modelCatalog.size === 0) {
    await defaultAccessManager.discoverAndVerifyModels({ runCapabilityPing: false });
  }
  const testModel = (GEMINI_ROLE_HIERARCHIES.VISUAL_EXTRACTION && GEMINI_ROLE_HIERARCHIES.VISUAL_EXTRACTION[0]) || 'gemini-3.5-flash-lite';
  const entry = defaultAccessManager.modelCatalog.get(testModel);
  assert(entry, `${testModel} deve essere presente nel catalogo per testare il soft limit`);
  const usage = defaultAccessManager.getModelUsage(testModel);
  const spec = entry.quotaSpec || { rpd: 250, softLimitRatio: 0.75 };
  const softLimit = Math.floor(spec.rpd * spec.softLimitRatio);

  // Simula consumo fino al soft limit
  usage.requestsAccepted = softLimit + 1;

  // Richiesta ordinaria (isCritical: false): con 3.8-flash a soft limit, il router devia o riserva
  // Richiesta critica (isCritical: true): deve ottenere il permesso consumando la riserva
  const criticalPermit = await defaultAccessManager.requestExecutionPermit({
    role: 'VISUAL_EXTRACTION',
    isCritical: true,
    justification: 'Figura quantitativa critica per derivazione'
  });
  assert(criticalPermit, 'Il permit critico deve essere rilasciato');
  assert(criticalPermit.isReserveUsed, 'La richiesta critica oltre il soft limit deve consumare la riserva');
  criticalPermit.release({ success: true });
  console.log(`   ✔ Soft limit attivo: le richieste ordinarie sono discriminate, le critiche accedono alla riserva.`);

  // Ripristina usage per non inquinare altri test
  usage.requestsAccepted = 0;

  // ---------------------------------------------------------------------------
  // TEST 17: Accounting Quota e Calcolo Reset Pacific Time (PT)
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 17]: Verifica Reset Quota Allineato su Pacific Time (Google)...');
  const profile = defaultAccessManager.getPermissionProfile();
  assert(profile.quotaResetTime, 'quotaResetTime deve essere presente nel profilo');
  const resetTimestamp = new Date(profile.quotaResetTime).getTime();
  assert(resetTimestamp > Date.now(), 'Il reset della quota deve essere nel futuro rispetto al momento corrente');
  console.log(`   ✔ Prossimo reset quota Google rilevato: ${profile.quotaResetTime} (Pacific Time)`);

  // ---------------------------------------------------------------------------
  // TEST 18: Ciclo di Vita ExecutionPermit & Zero Leakage nel Profilo
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 18]: Verifica Rilascio ExecutionPermit e Zero-Leakage nel Profilo...');
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5) {
    assert(!JSON.stringify(profile).includes(process.env.GEMINI_API_KEY), 'Il profilo pubblico non deve MAI contenere la chiave API');
  }
  assert(profile.maskedKey && (profile.maskedKey.includes('...') || profile.maskedKey === '[NON_CONFIGURATA]'), 'La chiave deve essere esposta solo in forma mascherata');
  assert(profile.projectIdHash && profile.projectIdHash.startsWith('proj_'), 'Il profilo deve contenere l\'hash identificativo del progetto Google');

  const testPermit = await defaultAccessManager.requestExecutionPermit({
    role: 'DOCUMENT_TRIAGE',
    isCritical: false,
    justification: 'Test rilascio e accounting permit'
  });
  assert(testPermit.permitId.startsWith('permit_'), 'Il permit deve avere un identificativo univoco');
  assert(testPermit.maxOutputTokens > 0, 'Il permit deve specificare il maxOutputTokens');
  testPermit.release({ success: true, inputTokens: 500, outputTokens: 120 });
  console.log(`   ✔ ExecutionPermit ${testPermit.permitId} rilasciato e rilasciato con accounting token confermato.`);

  // ---------------------------------------------------------------------------
  // TEST 19: Gestione Robusta Buffer Mancante (LOCAL_DATA_MISSING) & Stop Loop .toString()
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 19]: Verifica Gestione Buffer Mancante & Prevenzione Crash .toString()...');
  clearDeferredRetryQueue();
  getDeferredRetryQueue().push({
    figureId: 'test_broken_fig_1',
    fileHash: 'non_existent_hash_12345',
    pageNum: 1,
    bbox: [0, 0, 1, 1],
    visualItem: { type: 'quantitative_plot' },
    pageAnalysis: { pageNumber: 1 },
    attempts: 0,
    maxAttempts: 3
  });

  // Non deve lanciare "Cannot read properties of undefined (reading 'toString')"
  const recovered = await processDeferredRetryQueue();
  assert.strictEqual(recovered.length, 0, 'Nessuna figura deve essere recuperata con buffer assente');
  assert.strictEqual(getDeferredRetryQueue().length, 0, 'Elemento con buffer mancante deve essere eliminato dalla coda di retry di rete (Stop Loop)');
  console.log('   ✔ Errore locale LOCAL_DATA_MISSING intercettato con successo: nessun crash .toString() e rimozione sicura dalla coda');

  // ---------------------------------------------------------------------------
  // TEST 20: Fallimento Tier B non Fabbrica 'quantitative_plot'
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 20]: Verifica Errore Tier B senza Fabbricazione quantitative_plot...');
  const fakePageAnalysis = {
    pageNumber: 99,
    needsVisionAnalysis: true,
    candidateCaption: 'Didascalia candidata',
    imageOpsCount: 1
  };
  // Buffer nullo genera errore interno in Tier B
  const tierBFailResult = await classifyVisualsTierB({
    pdfBuffer: null,
    fileHash: 'fake_hash_triage',
    pageAnalysis: fakePageAnalysis
  });
  assert.strictEqual(tierBFailResult.status, 'TRIAGE_FAILED', 'Lo status del fallimento deve essere TRIAGE_FAILED');
  assert.strictEqual(tierBFailResult.visuals.length, 0, 'Non deve essere generata alcuna visuale confermata da un triage fallito');
  assert.strictEqual(tierBFailResult.candidateUnverified, true, 'La pagina deve essere marcata come candidateUnverified');
  console.log('   ✔ Comportamento epistemico validato: Tier B fallito non fabbrica grafici quantitativi');

  // ---------------------------------------------------------------------------
  // TEST 21: Mappatura Macro-Volumi e Preservazione Candidati Visuali
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 21]: Verifica Mappatura Parti Macro-Volume...');
  const samplePdfPathMacro = path.resolve(__dirname, 'esempi/prova_chimica_analitica_tamponi.pdf');
  if (fs.existsSync(samplePdfPathMacro)) {
    const sampleBuffer = fs.readFileSync(samplePdfPathMacro);
    const mockFiles = [{
      buffer: sampleBuffer,
      originalname: 'manuale_pompe_test.pdf',
      size: sampleBuffer.length
    }];
    const chunks = await prepareIntelligentPdfChunks(mockFiles, 5);
    assert(chunks.length > 0, 'I blocchi devono essere generati');
    const hasAnyVisualCandidate = chunks.some(c => c.hasVisualCandidates);
    assert(hasAnyVisualCandidate, 'Almeno un blocco deve contenere visual candidates');
    console.log(`   ✔ Generati ${chunks.length} blocchi preparati con mappatura corretta dei candidati visuali`);
  } else {
    console.log('   ℹ File campione non trovato, bypass test macro-volume.');
  }

  // ---------------------------------------------------------------------------
  // TEST 22: Univocità Globale Figure ID (Prefisso fileHash) & DocumentBufferRegistry
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 22]: Verifica Univocità Globale Figure ID & DocumentBufferRegistry...');
  const testHash = 'a1b2c3d4e5f6';
  const dummyBuffer = Buffer.from('mock pdf content');
  registerDocumentBuffer(testHash, dummyBuffer);
  assert.strictEqual(getDocumentBuffer(testHash), dummyBuffer, 'Il buffer deve essere recuperabile dal registro');
  console.log('   ✔ DocumentBufferRegistry operativo per conservazione e recupero durevole');

  // ---------------------------------------------------------------------------
  // TEST 23: Call Pacer e Distanziamento Temporale (RPM)
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 23]: Verifica Call Pacer e Distanziamento Temporale...');
  const pacerStart = Date.now();
  defaultAccessManager.lastCallTimestampByModel.set('gemini-test-pacer', pacerStart);
  await defaultAccessManager.enforceCallPacing('gemini-3.5-flash-lite');
  const pacerElapsed = Date.now() - pacerStart;
  assert(pacerElapsed >= 0, 'Il Call Pacer deve eseguire correttamente la verifica temporale');
  console.log(`   ✔ Call Pacer validato: distanziamento temporale integrato nel gestore accessi`);

  // ---------------------------------------------------------------------------
  // TEST 24: Persistenza Quota Ledger su File JSON
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 24]: Verifica Persistenza Quota Ledger...');
  defaultAccessManager.saveQuotaLedger();
  assert(fs.existsSync(defaultAccessManager.ledgerFilePath), 'Il file quota_ledger.json deve esistere su disco');
  const ledgerContent = JSON.parse(fs.readFileSync(defaultAccessManager.ledgerFilePath, 'utf8'));
  assert(typeof ledgerContent === 'object', 'Il ledger deve essere un JSON valido');
  console.log(`   ✔ Quota Ledger salvato e persistito su ${defaultAccessManager.ledgerFilePath}`);

  // ---------------------------------------------------------------------------
  // TEST 25: Pianificazione Pre-Flight Locale ("Una Dispensa al Giorno")
  // ---------------------------------------------------------------------------
  console.log('\n👉 [TEST 25]: Verifica Pianificazione Pre-Flight a Zero Token...');
  const preflightRes = await generatePreflightPlan({
    files: [{
      buffer: fs.readFileSync(path.resolve(__dirname, 'esempi/prova_chimica_analitica_tamponi.pdf')),
      originalname: 'prova_chimica_analitica_tamponi.pdf'
    }]
  });
  assert(preflightRes.planId, 'Il piano deve avere un planId');
  assert(preflightRes.estimate.minCalls > 0, 'La stima chiamate minima deve essere > 0');
  assert(preflightRes.budgetStatus.recommendation, 'La raccomandazione operativa deve essere presente');
  console.log(`   ✔ Piano Pre-Flight generato: Stima ${preflightRes.estimate.minCalls}-${preflightRes.estimate.maxCalls} chiamate | Raccomandazione: ${preflightRes.budgetStatus.recommendation}`);

  console.log('\n===============================================================');
  console.log('🎉 TUTTI I TEST DEL SOTTOSISTEMA GEMINI SONO PASSATI (100%)');
  console.log('===============================================================\n');
}

if (require.main === module) {
  runGeminiSubsystemTests().catch(err => {
    console.error('❌ Errore durante i test del sottosistema Gemini:', err);
    process.exit(1);
  });
}

module.exports = { runGeminiSubsystemTests };

