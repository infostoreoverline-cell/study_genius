const fs = require('fs-extra');
const path = require('path');
const { SESSIONS_DIR } = require('../config');

function listSessions() {
  const sessions = [];
  if (!fs.existsSync(SESSIONS_DIR)) {
    return sessions;
  }

  const subjects = fs.readdirSync(SESSIONS_DIR).filter(f => 
    fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory()
  );

  for (const subject of subjects) {
    const subjectDir = path.join(SESSIONS_DIR, subject);
    const files = fs.readdirSync(subjectDir).filter(f => 
      f.endsWith('.json') &&
      !f.includes('_blueprint') &&
      !f.includes('_coverage') &&
      !f.includes('_jobState') &&
      !f.includes('_knowledgeGraph') &&
      f !== 'knowledgeGraph.json' &&
      f !== 'subject_kb.json'
    );
    
    for (const file of files) {
      try {
        const meta = fs.readJsonSync(path.join(subjectDir, file));
        const validId = meta.id || meta.sessionId;
        if (validId) {
          sessions.push({
            ...meta,
            id: validId
          });
        }
      } catch (e) { /* ignora file corrotti */ }
    }
  }

  sessions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return sessions;
}

function getSession(id) {
  if (!fs.existsSync(SESSIONS_DIR)) return null;

  const subjects = fs.readdirSync(SESSIONS_DIR).filter(f =>
    fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory()
  );

  for (const subject of subjects) {
    const mdPath = path.join(SESSIONS_DIR, subject, `${id}.md`);
    const metaPath = path.join(SESSIONS_DIR, subject, `${id}.json`);
    
    if (fs.existsSync(mdPath)) {
      const content = fs.readFileSync(mdPath, 'utf-8');
      const meta = fs.existsSync(metaPath) ? fs.readJsonSync(metaPath) : {};
      return { ...meta, id, subject, content };
    }
  }

  return null;
}

function deleteSession(id) {
  if (!fs.existsSync(SESSIONS_DIR)) return false;

  const subjects = fs.readdirSync(SESSIONS_DIR).filter(f =>
    fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory()
  );

  for (const subject of subjects) {
    const mdPath = path.join(SESSIONS_DIR, subject, `${id}.md`);
    const metaPath = path.join(SESSIONS_DIR, subject, `${id}.json`);
    
    if (fs.existsSync(mdPath)) {
      fs.removeSync(mdPath);
      if (fs.existsSync(metaPath)) fs.removeSync(metaPath);

      // Rimuovi anche i file ausiliari associati a questo sessionId
      const auxFiles = [
        path.join(SESSIONS_DIR, subject, `${id}_blueprint.json`),
        path.join(SESSIONS_DIR, subject, `${id}_coverage.json`),
        path.join(SESSIONS_DIR, subject, `${id}_jobState.json`),
        path.join(SESSIONS_DIR, subject, `${id}_knowledgeGraph.json`)
      ];
      for (const aux of auxFiles) {
        if (fs.existsSync(aux)) fs.removeSync(aux);
      }

      return true;
    }
  }

  return false;
}

function updateSession(id, { content, title }) {
  if (!fs.existsSync(SESSIONS_DIR)) return false;

  const subjects = fs.readdirSync(SESSIONS_DIR).filter(f =>
    fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory()
  );

  for (const subject of subjects) {
    const mdPath = path.join(SESSIONS_DIR, subject, `${id}.md`);
    const metaPath = path.join(SESSIONS_DIR, subject, `${id}.json`);
    
    if (fs.existsSync(mdPath)) {
      if (content !== undefined) fs.writeFileSync(mdPath, content, 'utf-8');
      if (title !== undefined && fs.existsSync(metaPath)) {
        const meta = fs.readJsonSync(metaPath);
        meta.title = title;
        meta.updatedAt = new Date().toISOString();
        fs.writeJsonSync(metaPath, meta);
      }
      return true;
    }
  }

  return false;
}

function saveSessionData(subject, id, meta, markdownContent) {
  const subjectDir = path.join(SESSIONS_DIR, subject || 'Generale');
  fs.ensureDirSync(subjectDir);

  const mdPath = path.join(subjectDir, `${id}.md`);
  const metaPath = path.join(subjectDir, `${id}.json`);

  fs.writeFileSync(mdPath, markdownContent, 'utf-8');
  fs.writeJsonSync(metaPath, meta, { spaces: 2 });
}

module.exports = {
  listSessions,
  getSession,
  deleteSession,
  updateSession,
  saveSessionData
};
