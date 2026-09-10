const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');

const { CONFIG } = require('../config');
const { getBuiltinSubjects } = require('../config/subjects');
const {
  getUserPreferences,
  saveUserPreferences,
  getPromptForSubject,
  saveCustomPrompt,
  getDefaultGenericPrompt
} = require('../services/promptService');

/**
 * GET /api/subjects
 * Ritorna le materie disponibili e se possiedono un prompt personalizzato
 */
router.get('/subjects', (req, res) => {
  try {
    const builtinSubjects = getBuiltinSubjects();

    for (const s of builtinSubjects) {
      const promptPath = path.join(CONFIG.PATHS.PROMPTS_DIR, `${s.id}.md`);
      s.hasCustomPrompt = fs.existsSync(promptPath);
    }

    if (fs.existsSync(CONFIG.PATHS.PROMPTS_DIR)) {
      const promptFiles = fs.readdirSync(CONFIG.PATHS.PROMPTS_DIR).filter(f => f.endsWith('.md'));
      for (const f of promptFiles) {
        const id = f.replace('.md', '');
        if (id !== 'base_skill' && id !== 'user_preferences' && !builtinSubjects.find(s => s.id === id)) {
          builtinSubjects.push({ id, name: id, icon: '📚', hasCustomPrompt: true });
        }
      }
    }

    res.json(builtinSubjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/preferences
 */
router.get('/preferences', (req, res) => {
  try {
    const prefs = getUserPreferences();
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/preferences
 */
router.post('/preferences', (req, res) => {
  try {
    const { globalPreferences, subjectPreferences } = req.body;
    saveUserPreferences({ globalPreferences, subjectPreferences });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/prompts/:subject
 */
router.get('/prompts/:subject', (req, res) => {
  try {
    const { subject } = req.params;
    const promptFile = path.join(CONFIG.PATHS.PROMPTS_DIR, `${subject}.md`);

    if (fs.existsSync(promptFile)) {
      res.json({ content: fs.readFileSync(promptFile, 'utf-8'), exists: true });
    } else {
      res.json({ content: getDefaultGenericPrompt(), exists: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/prompts/:subject
 */
router.post('/prompts/:subject', (req, res) => {
  try {
    const { subject } = req.params;
    const { content } = req.body;
    saveCustomPrompt(subject, content);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GOOGLE AI STUDIO ACCESS & PERMISSIONS ROUTES
// ============================================================================

const { defaultAccessManager } = require('../services/googleAIStudioAccessManager');

/**
 * GET /api/gemini/profile
 * Restituisce il PermissionProfile di sessione (progetto, tier, modelli, quote, privacy)
 */
router.get('/gemini/profile', async (req, res) => {
  try {
    const profile = defaultAccessManager.getPermissionProfile();
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/gemini/consent
 * Concede o revoca il consenso per l'elaborazione dei documenti su Google Free Tier
 */
router.post('/gemini/consent', (req, res) => {
  try {
    const { granted, scope } = req.body;
    const updated = defaultAccessManager.setPrivacyConsent(granted, scope);
    res.json({ success: true, consent: updated, profile: defaultAccessManager.getPermissionProfile() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/gemini/policy
 * Imposta la politica operativa: 'FREE_TIER_PRUDENT' o 'LOCAL_ONLY'
 */
router.post('/gemini/policy', (req, res) => {
  try {
    const { policy } = req.body;
    const current = defaultAccessManager.setOperationPolicy(policy);
    res.json({ success: true, policy: current, profile: defaultAccessManager.getPermissionProfile() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/gemini/refresh
 * Esegue la discovery dinamica forzata e ri-valida i modelli nel catalogo
 */
router.post('/gemini/refresh', async (req, res) => {
  try {
    const profile = await defaultAccessManager.discoverAndVerifyModels({
      forceRefresh: true,
      runCapabilityPing: true
    });
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/gemini/credentials
 * Aggiorna in modo sicuro la chiave API senza esposizione o leak
 */
router.post('/gemini/credentials', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const initialized = defaultAccessManager.initializeCredentials(apiKey);
    if (!initialized) {
      return res.status(400).json({ error: 'Chiave API non valida o vuota.' });
    }
    const profile = await defaultAccessManager.discoverAndVerifyModels({ forceRefresh: true });
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { checkApiHealthStatus } = require('../services/aiService');

/**
 * GET /api/health
 */
router.get('/health', (req, res) => {
  const health = checkApiHealthStatus();
  res.json({
    status: 'ok',
    version: '2.0.0',
    geminiKey: health.geminiKey,
    deepseekKey: health.deepseekKey,
    geminiRoles: health.geminiRoles,
    discoveryInitialized: health.discoveryInitialized
  });
});

module.exports = router;
