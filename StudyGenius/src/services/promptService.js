const fs = require('fs-extra');
const path = require('path');
const { PROMPTS_DIR, PREFERENCES_FILE } = require('../config');
const { PromptCompiler } = require('../core/promptCompiler');
const { getDefaultGenericPrompt } = require('../config/subjects');

const promptCompilerInstance = new PromptCompiler({ promptsDir: PROMPTS_DIR });

function getPromptForSubject(subject, studyMode = 'complete', customInstructions = '') {
  try {
    return promptCompilerInstance.compileSystemPrompt({
      subject: subject || 'generic',
      studyMode: studyMode || 'complete',
      customInstructions: customInstructions || ''
    });
  } catch (err) {
    console.warn('Errore PromptCompiler, fallback su lettura diretta:', err.message);
    const promptFile = path.join(PROMPTS_DIR, `${subject}.md`);
    const basePromptFile = path.join(PROMPTS_DIR, 'base_skill.md');
    const genericFile = path.join(PROMPTS_DIR, 'generic.md');

    if (fs.existsSync(promptFile)) return fs.readFileSync(promptFile, 'utf-8');
    if (fs.existsSync(basePromptFile)) return fs.readFileSync(basePromptFile, 'utf-8');
    if (fs.existsSync(genericFile)) return fs.readFileSync(genericFile, 'utf-8');
    return getDefaultGenericPrompt();
  }
}

function loadSubjectPrompt(subject) {
  const promptFile = path.join(PROMPTS_DIR, `${subject}.md`);
  if (fs.existsSync(promptFile)) {
    return { content: fs.readFileSync(promptFile, 'utf-8'), exists: true };
  }
  return { content: getDefaultGenericPrompt(), exists: false };
}

function saveSubjectPrompt(subject, content) {
  fs.ensureDirSync(PROMPTS_DIR);
  const promptFile = path.join(PROMPTS_DIR, `${subject}.md`);
  fs.writeFileSync(promptFile, content, 'utf-8');
  return { success: true };
}

function loadGlobalPreferences() {
  if (fs.existsSync(PREFERENCES_FILE)) {
    try {
      return fs.readJsonSync(PREFERENCES_FILE);
    } catch (e) {
      return { globalPrompt: '' };
    }
  }
  return { globalPrompt: '' };
}

function saveGlobalPreferences(prefs) {
  fs.writeJsonSync(PREFERENCES_FILE, prefs, { spaces: 2 });
  return { success: true };
}

module.exports = {
  promptCompilerInstance,
  getPromptForSubject,
  loadSubjectPrompt,
  saveSubjectPrompt,
  loadGlobalPreferences,
  saveGlobalPreferences
};
