/**
 * StudyGenius - Test Suite: Operational Catalog Google AI Studio & Capabilities Engine
 * 
 * Verifica:
 * 1. Integrità e completezza del catalogo operativo versionato (9 settembre 2026).
 * 2. Rilevazione e blocco deterministico dei modelli ritirati/dismessi (ERR_MODEL_RETIRED).
 * 3. Adattamento dei parametri di thinking per-modello (proibizione di 'minimal' su 3.8/3.7 Flash).
 * 4. Salvaguardia economica del Free Tier contro modelli a pagamento esclusivo (ALLOW_PAID_GEMINI=false).
 * 5. Allineamento delle quote osservate del progetto (500 RPD su Flash-Lite vs 20 RPD su Flash).
 * 6. Gerarchia operativa dei ruoli (gemini-3.5-flash-lite primario per triage/estrazione ordinaria).
 */

require('dotenv').config();
const assert = require('assert');
const path = require('path');
const {
  OPERATIONAL_CATALOG,
  GEMINI_ROLE_HIERARCHIES,
  ALLOW_PAID_GEMINI
} = require('../src/config');
const {
  GoogleAIStudioAccessManager,
  defaultAccessManager,
  MODEL_QUOTA_SPECS
} = require('../src/services/googleAIStudioAccessManager');

console.log('===============================================================');
console.log('🧪 TEST SUITE: OPERATIONAL CATALOG GOOGLE AI STUDIO (09/2026)');
console.log('===============================================================\n');

let passedTests = 0;
const totalTests = 7;

function logPass(testName, details) {
  passedTests++;
  console.log(`👉 [TEST ${passedTests}]: ${testName}`);
  if (details) console.log(`   ✔ ${details}\n`);
}

// -------------------------------------------------------------
// TEST 1: Integrità e completezza del catalogo operativo
// -------------------------------------------------------------
try {
  assert(OPERATIONAL_CATALOG, 'OPERATIONAL_CATALOG deve essere caricato');
  assert.strictEqual(OPERATIONAL_CATALOG.catalog_version, '2026-09-09');
  assert(OPERATIONAL_CATALOG.models, 'La sezione models deve esistere');

  const modelKeys = Object.keys(OPERATIONAL_CATALOG.models);
  assert(modelKeys.length >= 25, `Attesi almeno 25 modelli nel catalogo, trovati ${modelKeys.length}`);

  // Verifica modelli cardine
  assert(OPERATIONAL_CATALOG.models['gemini-3.5-flash-lite'], 'gemini-3.5-flash-lite deve essere presente');
  assert(OPERATIONAL_CATALOG.models['gemini-3.8-flash'], 'gemini-3.8-flash deve essere presente');
  assert(OPERATIONAL_CATALOG.models['gemini-embedding-2'], 'gemini-embedding-2 deve essere presente');
  assert(OPERATIONAL_CATALOG.models['veo-3.1-generate-preview'], 'veo-3.1-generate-preview deve essere presente');

  // Verifica quote storiche osservate e sezioni di controllo
  assert(OPERATIONAL_CATALOG.historical_project_quota_observations, 'Quote storiche devono essere presenti');
  assert(OPERATIONAL_CATALOG.excluded_retirements, 'Lista ritiri esclusi deve essere presente');
  assert(OPERATIONAL_CATALOG.documentation_inconsistencies, 'Inconsistenze documentali devono essere tracciate');
  assert(OPERATIONAL_CATALOG.operational_rules, 'Regole operative devono essere presenti');
  assert(OPERATIONAL_CATALOG.media_constraints, 'Vincoli media devono essere presenti');

  logPass(
    'Integrità Catalogo Operativo',
    `Catalogo validato: ${modelKeys.length} modelli indicizzati con metadati, quote osservate, ritiri e vincoli media.`
  );
} catch (err) {
  console.error('❌ Fallimento TEST 1:', err);
  process.exit(1);
}

// -------------------------------------------------------------
// TEST 2: Rilevazione e blocco deterministico dei modelli ritirati
// -------------------------------------------------------------
try {
  const manager = new GoogleAIStudioAccessManager();

  // Test modelli ritirati
  const retired1 = manager.isModelRetired('gemini-2.0-flash');
  assert.strictEqual(retired1.isRetired, true, 'gemini-2.0-flash deve essere riconosciuto come ritirato');
  assert.strictEqual(retired1.retirementDate, '2026-06-01');

  const retired2 = manager.isModelRetired('gemini-1.5-pro');
  assert.strictEqual(retired2.isRetired, true, 'gemini-1.5-pro deve essere riconosciuto come ritirato');

  const retired3 = manager.isModelRetired('imagen-4.0-generate-001');
  assert.strictEqual(retired3.isRetired, true, 'imagen-4.0-generate-001 deve essere ritirato');
  assert(retired3.proposedReplacement.includes('gemini-3.1-flash-image'));

  const retired4 = manager.isModelRetired('veo-2.0-generate-001');
  assert.strictEqual(retired4.isRetired, true, 'veo-2.0-generate-001 deve essere ritirato');

  // Test modello attivo non ritirato
  const activeModel = manager.isModelRetired('gemini-3.5-flash-lite');
  assert.strictEqual(activeModel.isRetired, false, 'gemini-3.5-flash-lite non deve essere ritirato');

  logPass(
    'Blocco Deterministico Modelli Ritirati (ERR_MODEL_RETIRED)',
    'gemini-2.0-flash, gemini-1.5-pro, imagen-4.0 e veo-2.0 bloccati con data di ritiro e sostituto proposto.'
  );
} catch (err) {
  console.error('❌ Fallimento TEST 2:', err);
  process.exit(1);
}

// -------------------------------------------------------------
// TEST 3: Adattamento Thinking Parameters per-modello
// -------------------------------------------------------------
try {
  const manager = new GoogleAIStudioAccessManager();

  // 1. gemini-3.8-flash: minimal è proibito da documentazione Google. Deve essere convertito a low/medium.
  const cfg38Min = manager.adaptThinkingConfig('gemini-3.8-flash', 'minimal', 'SCIENTIFIC_REVIEW');
  assert(cfg38Min.thinkingLevel !== 'minimal', 'gemini-3.8-flash non deve ricevere minimal');
  assert.strictEqual(cfg38Min.thinkingLevel, 'low', 'minimal deve essere riadattato a low su 3.8 Flash');

  // 2. gemini-3.7-flash: minimal è proibito. Deve essere convertito a low.
  const cfg37Min = manager.adaptThinkingConfig('gemini-3.7-flash', 'minimal');
  assert.strictEqual(cfg37Min.thinkingLevel, 'low', 'minimal deve essere riadattato a low su 3.7 Flash');

  // 3. gemini-3.8-flash con high
  const cfg38High = manager.adaptThinkingConfig('gemini-3.8-flash', 'high');
  assert.strictEqual(cfg38High.thinkingLevel, 'high');

  // 4. gemini-3.5-flash-lite: default è minimal
  const cfgLiteDef = manager.adaptThinkingConfig('gemini-3.5-flash-lite');
  assert.strictEqual(cfgLiteDef.thinkingLevel, 'minimal', 'Default per gemini-3.5-flash-lite deve essere minimal');

  // 5. gemini-3.6-flash: minimal è supportato nativamente
  const cfg36Min = manager.adaptThinkingConfig('gemini-3.6-flash', 'minimal');
  assert.strictEqual(cfg36Min.thinkingLevel, 'minimal', 'gemini-3.6-flash supporta minimal');

  // 6. Test con thinkingBudget numerico
  const cfgBudget = manager.adaptThinkingConfig('gemini-3.5-flash', 2048);
  assert.strictEqual(cfgBudget.thinkingBudget, 2048, 'thinkingBudget numerico preservato');

  logPass(
    'Adattamento Parametri Thinking (Compliance Specifica Google)',
    'gemini-3.8 e 3.7 rimappano minimal -> low; gemini-3.5-flash-lite default -> minimal; budget numerico preservato.'
  );
} catch (err) {
  console.error('❌ Fallimento TEST 3:', err);
  process.exit(1);
}

// -------------------------------------------------------------
// TEST 4: Salvaguardia Economica Free Tier (ALLOW_PAID_GEMINI=false)
// -------------------------------------------------------------
try {
  const manager = new GoogleAIStudioAccessManager();

  // Modello a pagamento (es. veo-3.1 o gemini-3.1-flash-image) verificato con checkModelCapabilities
  const checkPaidImage = manager.checkModelCapabilities('gemini-3.1-flash-image', {});
  assert.strictEqual(checkPaidImage.eligible, false, 'Modello a pagamento deve essere bloccato in Free Tier');
  assert.strictEqual(checkPaidImage.reason, 'ERR_PAID_MODEL_BLOCKED');

  const checkVeo = manager.checkModelCapabilities('veo-3.1-generate-preview', {});
  assert.strictEqual(checkVeo.eligible, false);
  assert.strictEqual(checkVeo.reason, 'ERR_PAID_MODEL_BLOCKED');

  const checkPro = manager.checkModelCapabilities('gemini-3.1-pro-preview', {});
  assert.strictEqual(checkPro.eligible, false);
  assert.strictEqual(checkPro.reason, 'ERR_PAID_MODEL_BLOCKED');

  // Modello gratuito attivo
  const checkFree = manager.checkModelCapabilities('gemini-3.5-flash-lite', { requireJSON: true });
  assert.strictEqual(checkFree.eligible, true, 'gemini-3.5-flash-lite deve essere ammesso nel Free Tier');

  logPass(
    'Salvaguardia Economica Free Tier (ALLOW_PAID_GEMINI=false)',
    'gemini-3.1-flash-image, veo-3.1 e gemini-3.1-pro-preview determiniscamente respinti con ERR_PAID_MODEL_BLOCKED.'
  );
} catch (err) {
  console.error('❌ Fallimento TEST 4:', err);
  process.exit(1);
}

// -------------------------------------------------------------
// TEST 5: Allineamento Quote Progetto Osservate (500 RPD vs 20 RPD)
// -------------------------------------------------------------
try {
  // Verifica specifiche quote in MODEL_QUOTA_SPECS
  assert(MODEL_QUOTA_SPECS['gemini-3.5-flash-lite'], 'Spec per gemini-3.5-flash-lite richiesta');
  assert.strictEqual(MODEL_QUOTA_SPECS['gemini-3.5-flash-lite'].rpd, 500);
  assert.strictEqual(MODEL_QUOTA_SPECS['gemini-3.5-flash-lite'].rpm, 15);
  assert.strictEqual(MODEL_QUOTA_SPECS['gemini-3.5-flash-lite'].tpm, 250000);

  assert(MODEL_QUOTA_SPECS['gemini-3.8-flash'], 'Spec per gemini-3.8-flash richiesta');
  assert.strictEqual(MODEL_QUOTA_SPECS['gemini-3.8-flash'].rpd, 20);
  assert.strictEqual(MODEL_QUOTA_SPECS['gemini-3.8-flash'].rpm, 5);
  assert.strictEqual(MODEL_QUOTA_SPECS['gemini-3.8-flash'].tpm, 250000);

  // Verifica antigravity-preview-05-2026
  assert(MODEL_QUOTA_SPECS['antigravity-preview-05-2026'], 'Spec per antigravity agent richiesta');
  assert.strictEqual(MODEL_QUOTA_SPECS['antigravity-preview-05-2026'].rpm, 60);
  assert.strictEqual(MODEL_QUOTA_SPECS['antigravity-preview-05-2026'].rpd, 100);

  logPass(
    'Allineamento Quote Progetto Osservate (Console Verification)',
    'gemini-3.5-flash-lite configurato a 500 RPD / 15 RPM; gemini-3.8-flash configurato a 20 RPD / 5 RPM.'
  );
} catch (err) {
  console.error('❌ Fallimento TEST 5:', err);
  process.exit(1);
}

// -------------------------------------------------------------
// TEST 6: Gerarchia Operativa e Ruolo Assegnato per Profilo
// -------------------------------------------------------------
try {
  // DOCUMENT_TRIAGE deve avere gemini-3.5-flash-lite al vertice
  assert.strictEqual(
    GEMINI_ROLE_HIERARCHIES.DOCUMENT_TRIAGE[0],
    'gemini-3.5-flash-lite',
    'Triage ordinario deve usare gemini-3.5-flash-lite in primis'
  );

  // VISUAL_EXTRACTION deve avere gemini-3.5-flash-lite al vertice per sostenere 500 RPD
  assert.strictEqual(
    GEMINI_ROLE_HIERARCHIES.VISUAL_EXTRACTION[0],
    'gemini-3.5-flash-lite',
    'Estrazione visiva deve usare gemini-3.5-flash-lite in primis'
  );

  // SCIENTIFIC_REVIEW deve avere gemini-3.8-flash al vertice (revisione selettiva su 20 RPD)
  assert.strictEqual(
    GEMINI_ROLE_HIERARCHIES.SCIENTIFIC_REVIEW[0],
    'gemini-3.8-flash',
    'Revisione scientifica selettiva deve usare gemini-3.8-flash'
  );

  logPass(
    'Gerarchia Operativa dei Ruoli Didattici',
    'VISUAL_EXTRACTION e DOCUMENT_TRIAGE calibrati su gemini-3.5-flash-lite; SCIENTIFIC_REVIEW riservato a gemini-3.8-flash.'
  );
} catch (err) {
  console.error('❌ Fallimento TEST 6:', err);
  process.exit(1);
}

// -------------------------------------------------------------
// TEST 7: Integrazione RequestExecutionPermit con Rifiuto Ritirati
// -------------------------------------------------------------
(async () => {
  try {
    const manager = new GoogleAIStudioAccessManager();
    manager.setPrivacyConsent(true);

    // Tentativo di richiedere permit su modello ritirato
    const retiredPermit = await manager.requestExecutionPermit({
      role: 'VISUAL_EXTRACTION',
      preferredModel: 'gemini-2.0-flash',
      estimatedInputTokens: 5000,
      estimatedOutputTokens: 2000,
      purpose: 'Test chiamata su modello dismesso'
    });

    assert.strictEqual(retiredPermit.granted, false, 'Permit per modello ritirato non deve essere concesso');
    assert.strictEqual(retiredPermit.code, 'ERR_MODEL_RETIRED');
    assert(retiredPermit.proposedReplacement, 'Deve essere suggerito il modello sostitutivo');

    // Tentativo su modello attivo consentito
    const validPermit = await manager.requestExecutionPermit({
      role: 'VISUAL_EXTRACTION',
      estimatedInputTokens: 5000,
      estimatedOutputTokens: 2000,
      purpose: 'Test chiamata su modello attivo consentito'
    });

    assert.strictEqual(validPermit.granted, true, 'Permit su modello attivo deve essere concesso');
    assert.strictEqual(validPermit.modelName, 'gemini-3.5-flash-lite');

    logPass(
      'Integrazione RequestExecutionPermit con Rifiuto Deterministico',
      'Permit su modello ritirato rifiutato con codice ERR_MODEL_RETIRED; permit su modello valido emesso per gemini-3.5-flash-lite.'
    );

    console.log('===============================================================');
    console.log(`🎉 TUTTI I ${totalTests} TEST DEL CATALOGO OPERATIVO SONO PASSATI (100%)`);
    console.log('===============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Fallimento TEST 7:', err);
    process.exit(1);
  }
})();
