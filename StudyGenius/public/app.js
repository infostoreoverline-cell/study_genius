// =====================================================================
// Study Genius — Frontend App Logic
// =====================================================================

// --- STATE ---
const state = {
  files: [],
  selectedSubject: 'Fisica',
  studyMode: 'summary', // 'summary' | 'complete' | 'theory' | 'exercises'
  subjects: [],
  currentSession: null,
  rawContent: '',
  extractedContent: '',
  extractedDataCache: null,
  isGenerating: false,
  viewMode: 'preview', // 'preview' | 'raw'
  currentPromptSubject: 'Fisica',
  pages: [],
  currentPageIndex: 0,
  isFullscreen: false,
  shardBuffers: {}
};

// =====================================================================
// REAL-TIME METRICS & HIGH-PERFORMANCE STREAMING COORDINATOR
// =====================================================================
function countWordsFast(text) {
  if (!text) return 0;
  let count = 0;
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 32) {
      if (!inWord) {
        inWord = true;
        count++;
      }
    } else {
      inWord = false;
    }
  }
  return count;
}

class RealtimeMetricsCoordinator {
  constructor() {
    this.displayedWords = 0;
    this.targetWords = 0;
    this.displayedChars = 0;
    this.targetChars = 0;
    this.targetSections = 0;
    this.targetFormulas = 0;
    this.animFrameId = null;
    this.throttleTimer = null;
  }

  reset() {
    this.displayedWords = 0;
    this.targetWords = 0;
    this.displayedChars = 0;
    this.targetChars = 0;
    this.targetSections = 0;
    this.targetFormulas = 0;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    this.updateDOM(false);
  }

  // Throttle loop durante streaming intensivo: raccoglie i buffer e calcola le metriche a intervalli di 250ms
  scheduleUpdateThrottled() {
    if (this.throttleTimer) return;
    this.throttleTimer = setTimeout(() => {
      this.throttleTimer = null;
      const sortedKeys = Object.keys(state.shardBuffers || {}).sort((a, b) => Number(a) - Number(b));
      const fullText = sortedKeys.map(k => state.shardBuffers[k]).join('\n\n---\n\n');
      state.rawContent = fullText;
      this.updateFromText(fullText);
    }, 250);
  }

  // Aggiornamento in tempo reale esatto e progressivo calcolato su tutto il testo generato
  updateFromText(fullText) {
    if (!fullText) return;
    this.targetChars = fullText.length;
    this.targetWords = countWordsFast(fullText);
    this.targetSections = (fullText.match(/^#{1,3} /gm) || []).length;
    const displayFormulas = (fullText.match(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]/g) || []).length;
    const inlineFormulas = (fullText.match(/\$(?!\s)[^\$\n]+?(?<!\s)\$|\\\([\s\S]*?\\\)/g) || []).length;
    this.targetFormulas = displayFormulas + inlineFormulas;

    this.startAnimationLoop();
  }

  recalculateExact(fullText) {
    if (!fullText) {
      this.reset();
      return;
    }
    this.targetChars = fullText.length;
    this.targetWords = countWordsFast(fullText);
    this.targetSections = (fullText.match(/^#{1,3} /gm) || []).length;
    const displayFormulas = (fullText.match(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]/g) || []).length;
    const inlineFormulas = (fullText.match(/\$(?!\s)[^\$\n]+?(?<!\s)\$|\\\([\s\S]*?\\\)/g) || []).length;
    this.targetFormulas = displayFormulas + inlineFormulas;

    this.startAnimationLoop();
  }

  startAnimationLoop() {
    if (this.animFrameId) return;

    const tick = () => {
      let active = false;

      // Parole: interpolazione reattiva e fluida a 60fps
      if (this.displayedWords < this.targetWords) {
        const diff = this.targetWords - this.displayedWords;
        const step = Math.max(1, Math.ceil(diff * 0.25));
        this.displayedWords = Math.min(this.targetWords, this.displayedWords + step);
        active = true;
      } else if (this.displayedWords > this.targetWords) {
        this.displayedWords = this.targetWords;
      }

      // Caratteri: interpolazione progressiva
      if (this.displayedChars < this.targetChars) {
        const diff = this.targetChars - this.displayedChars;
        const step = Math.max(2, Math.ceil(diff * 0.28));
        this.displayedChars = Math.min(this.targetChars, this.displayedChars + step);
        active = true;
      } else if (this.displayedChars > this.targetChars) {
        this.displayedChars = this.targetChars;
      }

      this.updateDOM(active);

      if (active) {
        this.animFrameId = requestAnimationFrame(tick);
      } else {
        this.animFrameId = null;
        this.updateDOM(false);
      }
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  updateDOM(isTicking = false) {
    const wStr = this.displayedWords.toLocaleString('it-IT');
    const cStr = this.displayedChars.toLocaleString('it-IT');
    const readingTime = Math.max(1, Math.ceil(this.displayedWords / 220));

    // Elementi interfaccia standard
    const elWordCount = document.getElementById('word-count');
    if (elWordCount) {
      elWordCount.textContent = `${wStr} parole`;
      elWordCount.classList.toggle('counter-ticking', isTicking);
    }

    const elWordPanel = document.getElementById('word-count-panel');
    if (elWordPanel) {
      elWordPanel.textContent = `${wStr} parole`;
      elWordPanel.classList.toggle('counter-ticking', isTicking);
    }

    const elStatWords = document.getElementById('stat-words');
    if (elStatWords) elStatWords.textContent = wStr;

    const elStatChars = document.getElementById('stat-chars');
    if (elStatChars) elStatChars.textContent = cStr;

    const elStatSections = document.getElementById('stat-sections');
    if (elStatSections) elStatSections.textContent = this.targetSections;

    const elStatFormulas = document.getElementById('stat-formulas');
    if (elStatFormulas) elStatFormulas.textContent = this.targetFormulas.toLocaleString('it-IT');

    // Elementi Schermo Intero (Fullscreen Dock)
    const fsWordCount = document.getElementById('fs-word-count');
    if (fsWordCount) fsWordCount.textContent = `${wStr} parole`;

    const fsWordPill = document.getElementById('fs-word-pill');
    if (fsWordPill) fsWordPill.classList.toggle('ticking', isTicking);

    const fsReadingTime = document.getElementById('fs-reading-time');
    if (fsReadingTime) fsReadingTime.textContent = `~${readingTime} min`;
  }
}

const metricsCoordinator = new RealtimeMetricsCoordinator();

class StreamingRenderThrottler {
  constructor() {
    this.pendingShards = new Set();
    this.timer = null;
    this.minIntervalMs = 75; // ~13 FPS per shard: fluidità assoluta, zero jank e zero lag CPU
    this.lastRender = 0;
  }

  scheduleShard(shardId) {
    this.pendingShards.add(shardId);
    if (this.timer) return;

    const now = performance.now();
    const elapsed = now - this.lastRender;

    if (elapsed >= this.minIntervalMs) {
      this.executeRender();
    } else {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.executeRender();
      }, this.minIntervalMs - elapsed);
    }
  }

  executeRender() {
    this.lastRender = performance.now();
    const shards = Array.from(this.pendingShards);
    this.pendingShards.clear();

    for (const sId of shards) {
      const text = (state.shardBuffers && state.shardBuffers[sId]) || '';
      renderShardStreaming(sId, text);
    }
  }

  renderNowAll() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingShards.clear();
    const ids = Object.keys(state.shardBuffers || {});
    for (const sId of ids) {
      renderShardStreaming(Number(sId), state.shardBuffers[sId] || '');
    }
  }
}

const streamingThrottler = new StreamingRenderThrottler();

// =====================================================================
// UI UTILITIES & USER-FRIENDLINESS HELPERS
// =====================================================================

function updateGeneratingUI(isGenerating) {
  state.isGenerating = isGenerating;

  const btnGen = document.getElementById('btn-generate');
  const btnStickyGen = document.getElementById('sticky-btn-generate');
  const btnStickyStop = document.getElementById('sticky-btn-stop');
  const btnTopbarStop = document.getElementById('btn-stop-generation');
  const btnPanelStop = document.getElementById('btn-stop-panel');

  if (isGenerating) {
    if (btnGen) {
      btnGen.disabled = true;
      btnGen.innerHTML = '<span>⏳</span> In generazione...';
    }
    if (btnStickyGen) btnStickyGen.style.display = 'none';
    if (btnStickyStop) btnStickyStop.style.display = 'inline-flex';
    if (btnTopbarStop) btnTopbarStop.style.display = 'inline-flex';
    if (btnPanelStop) btnPanelStop.style.display = 'inline-flex';
  } else {
    if (btnGen) {
      btnGen.disabled = false;
      btnGen.innerHTML = '<span>✨</span> Genera Riassunto';
    }
    if (btnStickyGen) btnStickyGen.style.display = 'inline-flex';
    if (btnStickyStop) btnStickyStop.style.display = 'none';
    if (btnTopbarStop) btnTopbarStop.style.display = 'none';
    if (btnPanelStop) btnPanelStop.style.display = 'none';
  }
}

window.stopGeneration = function() {
  if (state.abortController) {
    state.abortController.abort();
    state.abortController = null;
    showToast('Interruzione della generazione in corso...', 'info');
  }
};

window.copyMarkdown = async function() {
  const content = state.rawContent || '';
  if (!content.trim()) {
    showToast('Nessun testo da copiare', 'info');
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(content);
    } else {
      const ta = document.createElement('textarea');
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast('✓ Markdown copiato negli appunti!', 'success');
  } catch (err) {
    showToast('Errore durante la copia negli appunti', 'error');
  }
};

function updateStickyActionBar() {
  const stickyBar = document.getElementById('sticky-action-bar');
  if (!stickyBar) return;
  const fileCount = state.files.length;
  const fileCountEl = document.getElementById('sticky-file-count');
  if (fileCountEl) {
    if (fileCount === 0) {
      fileCountEl.textContent = 'Trascina PDF o slide per iniziare';
    } else {
      const totalMb = state.files.reduce((acc, f) => acc + (f.size || 0), 0) / (1024 * 1024);
      fileCountEl.textContent = `📄 ${fileCount} file ${fileCount === 1 ? 'pronto' : 'pronti'} (${totalMb.toFixed(1)} MB)`;
    }
  }
  const subjEl = document.getElementById('sticky-subject-badge');
  if (subjEl) subjEl.textContent = state.selectedSubject || 'Fisica';

  const modeMap = {
    summary: '📑 Sintesi Alta Densità',
    complete: '🎓 Completa',
    theory: '📖 Teoria & Dimostrazioni',
    exercises: '✍️ Eserciziario'
  };
  const modeEl = document.getElementById('sticky-mode-badge');
  if (modeEl) modeEl.textContent = modeMap[state.studyMode] || 'Sintesi';

  if (fileCount > 0) {
    stickyBar.classList.add('ready');
  } else {
    stickyBar.classList.remove('ready');
  }
}

function selectStudyMode(mode) {
  state.studyMode = mode;
  document.querySelectorAll('.study-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  updateStickyActionBar();
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
  setupDragDrop();
  await loadSubjects();
  await loadSessions();
  await checkApiHealth();
  initMarked();
  setupFullscreenListeners();
  updateStickyActionBar();
});

function initMarked() {
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }
}

// =====================================================================
// SUBJECTS
// =====================================================================
async function loadSubjects() {
  try {
    const res = await fetch('/api/subjects');
    state.subjects = await res.json();
    renderSubjectGrid();
    renderModalSubjects();
    renderPromptSubjectSelector();
  } catch (e) {
    console.error('Errore caricamento materie:', e);
  }
}

function renderSubjectGrid() {
  const grid = document.getElementById('subject-grid');
  grid.innerHTML = state.subjects.map(s => `
    <button 
      class="subject-btn ${state.selectedSubject === s.id ? 'selected' : ''}"
      onclick="selectSubject('${s.id}', '${s.icon}', '${s.name}')"
      title="${s.name}"
    >
      <span class="subject-emoji">${s.icon}</span>
      <span>${s.name}</span>
    </button>
  `).join('');
}

function renderModalSubjects() {
  const grid = document.getElementById('modal-subject-grid');
  grid.innerHTML = state.subjects.map(s => `
    <button 
      class="subject-btn ${state.selectedSubject === s.id ? 'selected' : ''}"
      onclick="selectSubject('${s.id}', '${s.icon}', '${s.name}'); closeModal()"
      title="${s.name}"
    >
      <span class="subject-emoji">${s.icon}</span>
      <span>${s.name}</span>
    </button>
  `).join('');
}

function selectSubject(id, icon, name) {
  state.selectedSubject = id;
  document.getElementById('current-subject-icon').textContent = icon;
  document.getElementById('current-subject-name').textContent = name;
  renderSubjectGrid();
  renderModalSubjects();
  updateStickyActionBar();
}

function openSubjectModal() {
  renderModalSubjects();
  document.getElementById('modal-overlay').classList.add('visible');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('visible');
}

// =====================================================================
// SESSIONS
// =====================================================================
async function loadSessions() {
  try {
    const res = await fetch('/api/sessions');
    const sessions = await res.json();
    renderSessions(sessions);
  } catch (e) {
    console.error('Errore caricamento sessioni:', e);
  }
}

function renderSessions(sessions) {
  const container = document.getElementById('sidebar-sessions');
  const empty = document.getElementById('sessions-empty');

  if (!sessions || sessions.length === 0) {
    container.innerHTML = '';
    container.appendChild(empty);
    empty.style.display = 'flex';
    return;
  }

  // Group by subject
  const grouped = {};
  for (const s of sessions) {
    if (!grouped[s.subject]) grouped[s.subject] = [];
    grouped[s.subject].push(s);
  }

  const subjectIcons = {};
  for (const s of state.subjects) subjectIcons[s.id] = s.icon;

  let html = '';
  for (const [subject, items] of Object.entries(grouped)) {
    html += `<div class="sessions-group-label">${subjectIcons[subject] || '📚'} ${subject}</div>`;
    for (const item of items) {
      const date = new Date(item.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
      html += `
        <div class="session-item ${state.currentSession?.id === item.id ? 'active' : ''}" 
             onclick="loadSession('${item.id}')">
          <div class="session-icon">${subjectIcons[item.subject] || '📚'}</div>
          <div class="session-info">
            <div class="session-title">${escapeHtml(item.title || 'Senza titolo')}</div>
            <div class="session-meta">${date}</div>
          </div>
          <button class="session-delete" onclick="event.stopPropagation(); deleteSession('${item.id}')" title="Elimina">✕</button>
        </div>
      `;
    }
  }

  container.innerHTML = html;
}

async function loadSession(id) {
  try {
    showLoading('Caricamento sessione...', '');
    const res = await fetch(`/api/sessions/${id}`);
    const session = await res.json();
    hideLoading();

    state.currentSession = session;
    state.rawContent = session.content;

    document.getElementById('session-title-input').value = session.title || 'Sessione';
    if (session.studyMode) {
      selectStudyMode(session.studyMode);
    }
    
    const subject = state.subjects.find(s => s.id === session.subject);
    if (subject) {
      document.getElementById('current-subject-icon').textContent = subject.icon;
      document.getElementById('current-subject-name').textContent = subject.name;
    }

    showGeneratePanel();
    renderMarkdown(session.content);
    updateStats(session.content);
    updateTopbarButtons(true);
    syncFullscreenDock();

    // Update active session in sidebar
    await loadSessions();
    state.currentSession = session;

  } catch (e) {
    hideLoading();
    showToast('Errore nel caricamento della sessione', 'error');
  }
}

async function deleteSession(id) {
  if (!confirm('Eliminare questa sessione?')) return;
  try {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    showToast('Sessione eliminata', 'success');
    if (state.currentSession?.id === id) {
      createNewSession();
    }
    loadSessions();
  } catch (e) {
    showToast('Errore eliminazione', 'error');
  }
}

// =====================================================================
// FILE HANDLING
// =====================================================================
function setupDragDrop() {
  const dropZone = document.getElementById('drop-zone');

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.pdf') || name.endsWith('.pptx') || name.endsWith('.ppt');
    });
    addFiles(files);
  });
}

function handleFileSelect(fileList) {
  addFiles(Array.from(fileList));
}

function addFiles(newFiles) {
  state.extractedDataCache = null;
  const detectedContainer = document.getElementById('detected-topics-container');
  if (detectedContainer) {
    detectedContainer.innerHTML = '';
    detectedContainer.style.display = 'none';
  }
  for (const file of newFiles) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf') || name.endsWith('.pptx') || name.endsWith('.ppt')) {
      if (!state.files.find(f => f.name === file.name)) {
        file.pageRange = '';
        state.files.push(file);
      }
    } else {
      showToast(`Formato non supportato: ${file.name}. Usa .pdf o .pptx`, 'error');
    }
  }

  // Auto-titolo intelligente dal primo file se il titolo è vuoto o default "Nuova Sessione"
  if (state.files.length > 0) {
    const titleInput = document.getElementById('session-title-input');
    if (titleInput && (!titleInput.value || titleInput.value.trim() === 'Nuova Sessione' || titleInput.value.trim() === '')) {
      const firstFileName = state.files[0].name;
      const cleanName = firstFileName
        .replace(/\.(pdf|pptx|ppt)$/i, '')
        .replace(/[_\-\.]+/g, ' ')
        .trim();
      if (cleanName) {
        titleInput.value = cleanName;
      }
    }
  }

  renderFileList();
  updateStickyActionBar();
}

function removeFile(index) {
  state.files.splice(index, 1);
  renderFileList();
  updateStickyActionBar();
}

function updateFilePageRange(index, value) {
  if (state.files[index]) {
    state.files[index].pageRange = value.trim();
  }
}

function renderFileList() {
  const container = document.getElementById('file-list');
  const counter = document.getElementById('file-counter');
  if (state.files.length === 0) {
    container.innerHTML = '';
    if (counter) counter.style.display = 'none';
    return;
  }
  container.innerHTML = state.files.map((f, i) => {
    const isPpt = f.name.toLowerCase().endsWith('.pptx') || f.name.toLowerCase().endsWith('.ppt');
    const icon = isPpt ? '📊' : '📄';
    const rangeBadge = !isPpt ? `
      <div class="file-range-badge" title="Lascia vuoto per elaborare l'intero file, oppure indica l'intervallo di pagine da includere (es. 10-60)">
        <span style="font-size:10px; color:var(--text-muted);">Pagg:</span>
        <input 
          type="text" 
          class="page-range-input" 
          placeholder="Tutto (es. 1-50)" 
          value="${f.pageRange || ''}" 
          onchange="updateFilePageRange(${i}, this.value)" 
          onclick="event.stopPropagation()"
        />
      </div>
    ` : `
      <span style="font-size:10px; padding:2px 6px; background:rgba(249,115,22,0.15); color:#f97316; border-radius:10px; font-weight:600;">Slide</span>
    `;

    return `
      <div class="file-chip">
        <span>${icon}</span>
        <span title="${escapeHtml(f.name)}">${escapeHtml(f.name.length > 25 ? f.name.substring(0,22)+'...' : f.name)}</span>
        <span style="color: var(--text-muted); font-size: 10px;">${(f.size / 1024 / 1024).toFixed(1)}MB</span>
        ${rangeBadge}
        <button class="file-chip-remove" onclick="removeFile(${i})" title="Rimuovi">✕</button>
      </div>
    `;
  }).join('');

  // Update counter badge
  if (counter) {
    counter.textContent = `${state.files.length} file`;
    counter.style.display = 'inline-flex';
  }
  // Show/hide the header row
  const header = document.getElementById('file-list-header');
  if (header) header.style.display = state.files.length > 0 ? 'flex' : 'none';
}

// =====================================================================
// TOPIC DETECTION & SCOPE SELECTOR ("SONO QUELLI")
// =====================================================================
function renderDetectedTopics(topics) {
  const container = document.getElementById('detected-topics-container');
  if (!container || !topics || topics.length === 0) return;

  container.style.display = 'flex';
  container.innerHTML = `
    <div style="width:100%; font-size:11px; font-weight:700; color:var(--text-accent); margin-bottom:4px; display:flex; align-items:center; justify-content:space-between;">
      <span>📑 Capitoli / Argomenti rilevati nel libro (clicca per selezionare):</span>
      <button type="button" onclick="selectAllDetectedTopics()" style="background:none; border:none; color:var(--text-muted); font-size:10px; cursor:pointer; text-decoration:underline;">Tutti gli argomenti</button>
    </div>
  ` + topics.map(t => {
    const escapedTopic = escapeHtml(t).replace(/'/g, "\\'");
    return `
      <button type="button" class="topic-chip" onclick="toggleTopicChip(this, '${escapedTopic}')">
        <span>+</span> ${escapeHtml(t)}
      </button>
    `;
  }).join('');
}

function toggleTopicChip(btn, topic) {
  const input = document.getElementById('target-topics-input');
  if (!input) return;
  btn.classList.toggle('selected');
  const isSelected = btn.classList.contains('selected');
  const span = btn.querySelector('span');
  if (span) span.textContent = isSelected ? '✓' : '+';

  let currentTopics = input.value.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
  if (isSelected) {
    if (!currentTopics.includes(topic)) currentTopics.push(topic);
  } else {
    currentTopics = currentTopics.filter(t => t !== topic);
  }
  input.value = currentTopics.join(', ');
}

function selectAllDetectedTopics() {
  const input = document.getElementById('target-topics-input');
  const chips = document.querySelectorAll('.topic-chip');
  chips.forEach(btn => {
    btn.classList.remove('selected');
    const span = btn.querySelector('span');
    if (span) span.textContent = '+';
  });
  if (input) input.value = '';
  showToast('Sintesi estesa a tutti gli argomenti del documento', 'info');
}

async function extractBookTopicsOnly() {
  if (state.files.length === 0) {
    showToast('Aggiungi prima un file (PDF o PowerPoint) per analizzarne i capitoli!', 'error');
    return;
  }
  const btn = document.getElementById('btn-analyze-topics');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Analisi capitoli...';
  }
  showLoading('Analisi struttura libro in corso...', 'Riconoscimento capitoli e mappa argomenti didattici...');
  try {
    const formData = new FormData();
    const pageRangesMap = {};
    for (const file of state.files) {
      formData.append('pdfs', file);
      if (file.pageRange) pageRangesMap[file.name] = file.pageRange;
    }
    formData.append('pageRanges', JSON.stringify(pageRangesMap));

    const extractRes = await fetch('/api/extract', { method: 'POST', body: formData });
    if (!extractRes.ok) {
      const err = await extractRes.json();
      throw new Error(err.error || 'Errore analisi file');
    }
    const extractData = await extractRes.json();
    hideLoading();
    state.extractedDataCache = extractData;
    state.extractedContent = extractData.files.map(f =>
      `# Contenuto estratto da: ${f.filename}\n\n${f.content}`
    ).join('\n\n---\n\n');

    if (extractData.detectedTopics && extractData.detectedTopics.length > 0) {
      renderDetectedTopics(extractData.detectedTopics);
      showToast(`🎯 Rilevati ${extractData.detectedTopics.length} capitoli/argomenti! Clicca su quelli da studiare.`, 'success');
    } else {
      showToast('Estrazione completata. Puoi indicare gli argomenti specifici nel box dedicato.', 'info');
    }
  } catch (err) {
    hideLoading();
    showToast('Errore durante l\'analisi: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>🔍</span> Analizza Capitoli del Libro';
    }
  }
}

// =====================================================================
// GENERATION FLOW
// =====================================================================
async function startGeneration() {
  if (state.files.length === 0) {
    showToast('Aggiungi almeno un file (PDF o PowerPoint) prima di generare!', 'error');
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
      dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dropZone.classList.add('dragover');
      setTimeout(() => dropZone.classList.remove('dragover'), 1200);
    }
    return;
  }

  if (state.isGenerating) return;
  state.isGenerating = true;
  updateGeneratingUI(true);
  state.abortController = new AbortController();

  const btn = document.getElementById('btn-generate');

  try {
    let extractData = state.extractedDataCache;

    if (!extractData) {
      // STEP 1: Extract with Hybrid Extractor (Digital Books + PPTX + Gemini Vision)
      const totalFiles = state.files.length;
      showLoading(
        `Elaborazione di ${totalFiles} documenti in corso...`,
        `Riconoscimento intelligente: estrazione immediata dei libri digitali, slide PowerPoint con note e micro-chunking per appunti a mano.`
      );

      const formData = new FormData();
      const pageRangesMap = {};
      for (const file of state.files) {
        formData.append('pdfs', file);
        if (file.pageRange) {
          pageRangesMap[file.name] = file.pageRange;
        }
      }
      formData.append('pageRanges', JSON.stringify(pageRangesMap));

      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        signal: state.abortController.signal,
        body: formData
      });

      if (!extractRes.ok) {
        const err = await extractRes.json();
        throw new Error(err.error || 'Errore estrazione file');
      }

      extractData = await extractRes.json();
      hideLoading();
      state.extractedDataCache = extractData;

      // Notifica dei blocchi elaborati
      if (extractData.stats) {
        showToast(
          `⚡ Analisi completata: ${extractData.stats.blocks} blocchi elaborati (${(extractData.totalChars / 1000).toFixed(1)}k caratteri estratti)`,
          'success'
        );
      }

      // Avvisa se qualche file ha avuto errori
      if (extractData.stats && extractData.stats.failed > 0) {
        showToast(
          `⚠️ ${extractData.stats.failed} blocchi non estratti correttamente — continuo con i rimanenti`,
          'info'
        );
      }

      // Compile extracted content
      state.extractedContent = extractData.files.map(f =>
        `# Contenuto estratto da: ${f.filename}\n\n${f.content}`
      ).join('\n\n---\n\n');

      if (extractData.detectedTopics && extractData.detectedTopics.length > 0) {
        renderDetectedTopics(extractData.detectedTopics);
      }
    }

    document.getElementById('extracted-preview').textContent = state.extractedContent.substring(0, 3000) + 
      (state.extractedContent.length > 3000 ? '\n\n[... continua ...]' : '');

    // STEP 2: Generate with DeepSeek (streaming)
    showGeneratePanel();
    updateTopbarButtons(false);

    state.shardBuffers = {};
    const outputEl = document.getElementById('markdown-output');
    outputEl.innerHTML = '';
    
    const statusDot = document.getElementById('status-dot');
    const statusLabel = document.getElementById('status-label');
    statusDot.className = 'status-dot generating';
    statusLabel.textContent = 'Generazione in corso...';

    metricsCoordinator.reset();
    syncFullscreenDock();

    const title = document.getElementById('session-title-input').value;
    const customInstructions = document.getElementById('custom-instructions').value;
    const targetTopics = document.getElementById('target-topics-input')?.value?.trim() || '';

    let rawMarkdown = '';
    let startTime = Date.now();

    const generateRes = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: state.abortController.signal,
      body: JSON.stringify({
        extractedContent: state.extractedContent,
        subject: state.selectedSubject,
        studyMode: state.studyMode,
        sessionTitle: title || `${state.selectedSubject} - ${new Date().toLocaleDateString('it-IT')}`,
        customInstructions: customInstructions || undefined,
        targetTopics: targetTopics || undefined,
        visualContracts: state.extractedDataCache?.visualEvidences || []
      })
    });

    const reader = generateRes.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const eventBlocks = buffer.split(/\r?\n\r?\n/);
      buffer = eventBlocks.pop() || '';

      for (const block of eventBlocks) {
        if (!block.trim()) continue;
        const lines = block.split(/\r?\n/);
        for (let line of lines) {
          line = line.trim();
          if (!line || line.startsWith(':')) continue;
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.type === 'scope_filtered') {
              showToast(data.message, 'info');
              const sLabel = document.getElementById('status-label');
              if (sLabel) sLabel.textContent = `Filtro mirato (${data.matchedCount} blocchi)`;
              const fsLabel = document.getElementById('fs-status-label');
              if (fsLabel) fsLabel.textContent = `Filtro mirato (${data.matchedCount} blocchi)`;
            } else if (data.type === 'stage') {
              const sLabel = document.getElementById('status-label');
              const fsLabel = document.getElementById('fs-status-label');
              const progressLabel = document.getElementById('progress-label');
              let stageText = data.message || 'Elaborazione...';
              if (data.stage === 'mapping') {
                stageText = 'Mappatura preventiva...';
                document.getElementById('progress-bar').style.width = '10%';
              } else if (data.stage === 'generating') {
                stageText = `Generazione (${data.numShards || 1} corsie)...`;
                document.getElementById('progress-bar').style.width = '25%';
              } else if (data.stage === 'welding') {
                stageText = 'Saldatura giunzioni didattiche...';
                document.getElementById('progress-bar').style.width = '88%';
              }
              if (sLabel) sLabel.textContent = stageText;
              if (fsLabel) fsLabel.textContent = stageText;
              if (progressLabel) progressLabel.textContent = data.message;
            } else if (data.type === 'shard_progress') {
              const workersContainer = document.getElementById('parallel-workers-container');
              if (workersContainer) {
                workersContainer.style.display = 'grid';
                let pill = document.getElementById(`worker-pill-${data.shardId}`);
                if (!pill) {
                  pill = document.createElement('div');
                  pill.id = `worker-pill-${data.shardId}`;
                  pill.className = 'worker-pill active';
                  workersContainer.appendChild(pill);
                }
                const isDone = data.percent >= 100;
                pill.className = `worker-pill ${isDone ? 'done' : 'active'}`;
                pill.innerHTML = `
                  <div class="worker-pill-left">
                    <div class="worker-pulse"></div>
                    <span>Corsia ${data.shardId}: ${isDone ? 'Pronto' : `Mod. ${data.moduleInShard}/${data.totalInShard}`}</span>
                  </div>
                  <span style="font-weight:700; color: ${isDone ? 'var(--accent-green)' : 'var(--text-accent)'};">${data.percent}%</span>
                `;
              }
              const doneCount = workersContainer ? workersContainer.querySelectorAll('.worker-pill.done').length : 0;
              const total = data.totalShards || 1;
              const overall = Math.min(85, 25 + Math.round((doneCount / total) * 60));
              document.getElementById('progress-bar').style.width = `${overall}%`;
            } else if (data.type === 'shard_delta' || data.type === 'delta') {
              const shardId = data.shardId || 1;
              if (!state.shardBuffers[shardId]) {
                state.shardBuffers[shardId] = '';
              }
              state.shardBuffers[shardId] += data.content;

              // Render visuale dello shard specifico via throttler fluido
              streamingThrottler.scheduleShard(shardId);

              // Calcolo metriche aggregato throttled (nessun congelamento del main thread)
              metricsCoordinator.scheduleUpdateThrottled();

              const elapsed = Math.floor((Date.now() - startTime) / 1000);
              const liveStatusText = `Scrittura attiva (${elapsed}s)`;
              const sLabel = document.getElementById('status-label');
              if (sLabel) sLabel.textContent = liveStatusText;
              const fsLabel = document.getElementById('fs-status-label');
              if (fsLabel) fsLabel.textContent = liveStatusText;
              const pLabel = document.getElementById('progress-label');
              if (pLabel) pLabel.textContent = `Scrittura attiva (${elapsed}s)`;

            } else if (data.type === 'welding_done') {
              if (data.fullContent) {
                rawMarkdown = data.fullContent;
                state.rawContent = rawMarkdown;
                metricsCoordinator.recalculateExact(rawMarkdown);
                renderMarkdown(rawMarkdown);
              }

            } else if (data.type === 'quality_report') {
              if (data.report && data.report.overallScore) {
                const badge = data.report.gatePassed ? '✅' : '⚠️';
                showToast(`Qualità Accademica: ${data.report.overallScore}/100 ${badge}`, data.report.gatePassed ? 'success' : 'warning');
              }
            } else if (data.type === 'done') {
              statusDot.className = 'status-dot done';
              statusLabel.textContent = 'Riassunto completato!';
              const fsDot = document.getElementById('fs-status-dot');
              if (fsDot) fsDot.className = 'status-dot done';
              const fsLabel = document.getElementById('fs-status-label');
              if (fsLabel) fsLabel.textContent = 'Dispensa completata ✓';

              document.getElementById('progress-bar').style.width = '100%';
              document.getElementById('progress-label').textContent = 'Completato ✓';
              state.currentSession = { id: data.sessionId, title: data.title };
              updateTopbarButtons(true);
              showToast('Riassunto generato con successo! 🎉', 'success');
              await loadSessions();

              if (data.fullContent) {
                rawMarkdown = data.fullContent;
                state.rawContent = rawMarkdown;
              } else {
                const sortedKeys = Object.keys(state.shardBuffers).sort((a, b) => Number(a) - Number(b));
                rawMarkdown = sortedKeys.map(k => state.shardBuffers[k]).join('\n\n---\n\n');
                state.rawContent = rawMarkdown;
              }

              metricsCoordinator.recalculateExact(rawMarkdown);
              renderMarkdown(rawMarkdown);

            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (parseError) {
            // Ignora frammenti non completi
          }
        }
      }
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      showToast('Generazione interrotta dall\'utente', 'info');
      const sLabel = document.getElementById('status-label');
      if (sLabel) sLabel.textContent = 'Interrotto dall\'utente';
      const sDot = document.getElementById('status-dot');
      if (sDot) sDot.className = 'status-dot warning';

      // Recupera e visualizza comunque il contenuto generato finora
      const sortedKeys = Object.keys(state.shardBuffers || {}).sort((a, b) => Number(a) - Number(b));
      if (sortedKeys.length > 0) {
        rawMarkdown = sortedKeys.map(k => state.shardBuffers[k]).join('\n\n---\n\n');
        state.rawContent = rawMarkdown;
        metricsCoordinator.recalculateExact(rawMarkdown);
        renderMarkdown(rawMarkdown);
        updateTopbarButtons(true);
      }
    } else {
      hideLoading();
      showToast(`Errore: ${error.message}`, 'error');
      console.error(error);
    }
  } finally {
    state.isGenerating = false;
    state.abortController = null;
    updateGeneratingUI(false);
  }
}

// =====================================================================
// MARKDOWN RENDERING (CON PROTEZIONE FORMULE LATEX)
// =====================================================================

function repairMarkdownMathClient(text) {
  if (!text) return '';
  let cleaned = text.replace(/\\\$([^\$\n]+?)\\\$/g, '$$$1$$');

  const lines = cleaned.split('\n');
  let inDouble = false;
  const fixedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeading = /^#{1,6}\s+/.test(line.trim());

    // Se incontriamo un titolo Markdown dentro un blocco math non chiuso, chiudiamo $$ prima del titolo
    if (inDouble && isHeading) {
      fixedLines.push('$$');
      inDouble = false;
    }

    const count = (line.match(/\$\$/g) || []).length;
    if (count % 2 !== 0) {
      inDouble = !inDouble;
    }
    fixedLines.push(line);
  }

  if (inDouble) {
    fixedLines.push('$$');
  }

  let result = fixedLines.join('\n');
  const fenceCount = (result.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) {
    result += '\n```\n';
  }

  return result;
}

function parseMarkdownSafely(md) {
  if (!md) return '';
  if (typeof marked === 'undefined') return md;

  // 1. Ripara e bilancia delimitatori non chiusi
  let text = repairMarkdownMathClient(md);

  const diagramTokens = [];

  // 1a. Compila i blocchi json:visual-spec o visual-spec (concept_map) in SVG vettoriali
  text = text.replace(/```(?:json:visual-spec|visual-spec)\s*\n([\s\S]*?)\n```/g, (match, jsonBody) => {
    try {
      const spec = JSON.parse(jsonBody.trim());
      if ((spec.kind === 'concept_map' || spec.type === 'concept_map') && typeof window.renderConceptMap === 'function') {
        const svg = window.renderConceptMap(spec);
        if (svg) {
          const ph = `<!-- SG_CLIENT_DIAG_${diagramTokens.length} -->`;
          diagramTokens.push(`<div class="academic-diagram academic-concept-map" style="page-break-inside: avoid; margin: 24px auto; max-width: 100%; text-align: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow-x: auto;">${svg}</div>`);
          return `\n\n${ph}\n\n`;
        }
      }
    } catch (e) {
      console.warn('Errore rendering client visual-spec:', e);
    }
    return match;
  });

  // 1b. Intercetta e isola blocchi svg o xml:svg affinché marked non li renda come testo/codice,
  // gestendo resilientemente anche blocchi non chiusi prima della fine del testo
  text = text.replace(/```(?:svg|xml:svg)\s*\n([\s\S]*?)(?:```|$)/g, (match, svgBody) => {
    let trimmed = svgBody.trim();
    if (trimmed.includes('<svg')) {
      const svgStart = trimmed.indexOf('<svg');
      let svgContent = trimmed.slice(svgStart);
      if (!svgContent.includes('</svg>')) {
        svgContent += '\n</svg>';
      }
      const ph = `<!-- SG_CLIENT_DIAG_${diagramTokens.length} -->`;
      diagramTokens.push(`<div class="academic-diagram academic-svg-asset" style="page-break-inside: avoid; margin: 24px auto; max-width: 100%; text-align: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow-x: auto;">${svgContent}</div>`);
      return `\n\n${ph}\n\n`;
    }
    return match;
  });

  // 1c. Intercetta e protegge contenitori <div class="academic-diagram...">...</div> già renderizzati dal server
  let isolatedDiagText = '';
  let diagCursor = 0;
  const diagMarker = '<div class="academic-diagram';
  while (diagCursor < text.length) {
    const startIdx = text.toLowerCase().indexOf(diagMarker, diagCursor);
    if (startIdx === -1) {
      isolatedDiagText += text.slice(diagCursor);
      break;
    }
    isolatedDiagText += text.slice(diagCursor, startIdx);
    let depth = 0;
    let endIdx = -1;
    let i = startIdx;
    while (i < text.length) {
      if (text.startsWith('<div', i) && /[\s>]/.test(text[i + 4] || '')) {
        depth++;
        i += 4;
      } else if (text.startsWith('</div>', i)) {
        depth--;
        i += 6;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      } else {
        i++;
      }
    }
    if (endIdx !== -1) {
      const block = text.slice(startIdx, endIdx);
      const ph = `<!-- SG_CLIENT_DIAG_${diagramTokens.length} -->`;
      diagramTokens.push(block);
      isolatedDiagText += `\n\n${ph}\n\n`;
      diagCursor = endIdx;
    } else {
      isolatedDiagText += text.slice(startIdx, startIdx + diagMarker.length);
      diagCursor = startIdx + diagMarker.length;
    }
  }
  text = isolatedDiagText;

  // 1d. Intercetta e protegge qualsiasi tag <svg ...>...</svg> isolato rimanente
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
    const ph = `<!-- SG_CLIENT_DIAG_${diagramTokens.length} -->`;
    diagramTokens.push(`<div class="academic-diagram academic-svg-asset" style="page-break-inside: avoid; margin: 24px auto; max-width: 100%; text-align: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow-x: auto;">${match}</div>`);
    return `\n\n${ph}\n\n`;
  });

  const mathTokens = [];

  // 2. Proteggi display math ($$...$$ e \[...\])
  text = text.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g, (match) => {
    const placeholder = `MATHBLOCKDISP${mathTokens.length}END`;
    mathTokens.push(match);
    return placeholder;
  });

  // 3. Proteggi inline math ($...$ e \(...\))
  text = text.replace(/(\$(?!\s)[^\$\n]+?(?<!\s)\$|\\\([\s\S]*?\\\))/g, (match) => {
    const placeholder = `MATHBLOCKINL${mathTokens.length}END`;
    mathTokens.push(match);
    return placeholder;
  });

  // 4. Esegui il parsing con marked.js sul testo protetto
  let html = marked.parse(text);

  // 5. Ripristina i blocchi matematici originali intatti
  html = html.replace(/MATHBLOCK(DISP|INL)(\d+)END/g, (match, type, idx) => {
    return mathTokens[parseInt(idx, 10)] || match;
  });

  // 5b. Ripristina i diagrammi SVG renderizzati
  for (let i = 0; i < diagramTokens.length; i++) {
    html = html.replace(`<!-- SG_CLIENT_DIAG_${i} -->`, diagramTokens[i]);
  }

  // 6. Trasforma blockquote nei callout del Design System Semantico Accademico
  html = transformAcademicCalloutsClient(html);

  return html;
}

function transformAcademicCalloutsClient(html) {
  if (!html) return '';
  return html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (match, inner) => {
    let type = 'general';
    if (/📌|Definizione/i.test(inner)) type = 'definition';
    else if (/💡|Intuizione/i.test(inner)) type = 'intuition';
    else if (/📐|Teorema|Dimostrazione/i.test(inner)) type = 'theorem';
    else if (/⚠️|Attenzione|Errore Tipico|Trabocchetto/i.test(inner)) type = 'warning';
    else if (/🧠|Schema Mentale|Strategia/i.test(inner)) type = 'mental';
    else if (/🔍|Controllo di Coerenza|Verifica/i.test(inner)) type = 'coherence';
    else if (/📋|Formulario Ragionato/i.test(inner)) type = 'formulary';
    else if (/🎓|Domande d'Esame|All'Orale|Prova Scritta/i.test(inner)) type = 'exam';

    return `<div class="academic-callout callout-${type}">${inner}</div>`;
  });
}

// =====================================================================
// PAGINATION
// =====================================================================
const PAGE_SIZE_LINES = 1500; 

function splitMarkdownIntoPages(md) {
  if (!md) return [];
  const lines = md.split('\n');
  const pages = [];
  let currentPageLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Split on H1 or H2 if page is reasonably sized, or if it gets too large
    if ((line.startsWith('# ') || line.startsWith('## ')) && currentPageLines.length > 500) {
      pages.push(currentPageLines.join('\n'));
      currentPageLines = [line];
    } else if (currentPageLines.length >= PAGE_SIZE_LINES) {
      pages.push(currentPageLines.join('\n'));
      currentPageLines = [line];
    } else {
      currentPageLines.push(line);
    }
  }
  if (currentPageLines.length > 0) {
    pages.push(currentPageLines.join('\n'));
  }
  return pages;
}

function updatePaginationUI() {
  const topCtrl = document.getElementById('pagination-top');
  const bottomCtrl = document.getElementById('pagination-bottom');
  const indTop = document.getElementById('page-indicator-top');
  const indBottom = document.getElementById('page-indicator-bottom');
  
  if (!topCtrl || !bottomCtrl || !indTop || !indBottom) return;

  if (state.pages.length <= 1) {
    topCtrl.style.display = 'none';
    bottomCtrl.style.display = 'none';
  } else {
    topCtrl.style.display = 'flex';
    bottomCtrl.style.display = 'flex';
    const text = `Pagina ${state.currentPageIndex + 1} di ${state.pages.length}`;
    indTop.textContent = text;
    indBottom.textContent = text;
  }
}

window.prevPage = function() {
  if (state.currentPageIndex > 0) {
    state.currentPageIndex--;
    renderPage(state.currentPageIndex);
    document.getElementById('markdown-output').scrollIntoView({ behavior: 'smooth' });
  }
};

window.nextPage = function() {
  if (state.currentPageIndex < state.pages.length - 1) {
    state.currentPageIndex++;
    renderPage(state.currentPageIndex);
    document.getElementById('markdown-output').scrollIntoView({ behavior: 'smooth' });
  }
};

function renderPage(index) {
  if (!state.pages || state.pages.length === 0) return;
  const md = state.pages[index] || '';
  const el = document.getElementById('markdown-output');
  el.innerHTML = parseMarkdownSafely(md);
  updatePaginationUI();
  
  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise([el]).catch(err => console.warn('MathJax error:', err));
  }
}

function renderShardStreaming(shardId, shardText) {
  const container = document.getElementById('markdown-output');
  if (!container) return;

  const empty = container.querySelector('.empty-state');
  if (empty) empty.remove();

  let block = document.getElementById(`shard-block-${shardId}`);
  if (!block) {
    block = document.createElement('div');
    block.id = `shard-block-${shardId}`;
    block.className = 'shard-stream-block';
    block.dataset.shardId = shardId;

    // Posizionamento rigorosamente ordinato per corsia didattica
    const existing = Array.from(container.querySelectorAll('.shard-stream-block'));
    const next = existing.find(b => parseInt(b.dataset.shardId, 10) > shardId);
    if (next) {
      container.insertBefore(block, next);
    } else {
      container.appendChild(block);
    }
  }

  // Parse Markdown del solo shard aggiornato
  block.innerHTML = parseMarkdownSafely(shardText) + '<div class="streaming-cursor"></div>';

  // Smart auto-scroll: se l'utente è vicino al fondo, segui la scrittura in tempo reale
  const scrollTarget = state.isFullscreen ? (document.querySelector('.generate-left') || container) : container;
  const isNearBottom = (scrollTarget.scrollHeight - scrollTarget.scrollTop - scrollTarget.clientHeight) < 320;
  if (isNearBottom) {
    scrollTarget.scrollTop = scrollTarget.scrollHeight;
  }
}

function renderMarkdownStreaming(md) {
  renderShardStreaming(1, md);
}

function renderMarkdown(md) {
  if (!md) return;
  state.pages = splitMarkdownIntoPages(md);
  state.currentPageIndex = 0;
  renderPage(0);
}

// =====================================================================
// STATS & REALTIME SYNC
// =====================================================================
function updateStats(content) {
  if (!content) {
    metricsCoordinator.reset();
    return;
  }
  metricsCoordinator.recalculateExact(content);
}

// =====================================================================
// FULLSCREEN CONTROLLER ("SCHERMO INTERO FIGO")
// =====================================================================
function setupFullscreenListeners() {
  const topBtn = document.getElementById('btn-fullscreen');
  if (topBtn) {
    topBtn.addEventListener('click', toggleFullscreenMode);
  }

  const panelBtn = document.getElementById('btn-fullscreen-panel');
  if (panelBtn) {
    panelBtn.addEventListener('click', toggleFullscreenMode);
  }

  const exitBtn = document.getElementById('fs-btn-exit');
  if (exitBtn) {
    exitBtn.addEventListener('click', exitFullscreenMode);
  }

  // Keyboard shortcut: Escape exits fullscreen, F or Alt+Enter toggles
  document.addEventListener('keydown', (e) => {
    const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    if (e.key === 'Escape' && state.isFullscreen) {
      e.preventDefault();
      exitFullscreenMode();
    } else if (!isInput && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      toggleFullscreenMode();
    }
  });

  // Native fullscreen change sync
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && state.isFullscreen) {
      // In case browser exited native mode, we keep CSS mode aligned or let user control
    }
  });
}

function toggleFullscreenMode() {
  if (state.isFullscreen) {
    exitFullscreenMode();
  } else {
    enterFullscreenMode();
  }
}

function enterFullscreenMode() {
  state.isFullscreen = true;
  document.body.classList.add('fullscreen-active');
  const app = document.getElementById('app');
  if (app) app.classList.add('fullscreen-active');

  const topBtn = document.getElementById('btn-fullscreen');
  if (topBtn) {
    topBtn.innerHTML = '<span>⤓</span> Esci da Schermo Intero';
    topBtn.classList.add('active');
  }

  const panelBtn = document.getElementById('btn-fullscreen-panel');
  if (panelBtn) {
    panelBtn.innerHTML = '<span>⤓</span> Esci';
    panelBtn.classList.add('active');
  }

  showGeneratePanel();
  syncFullscreenDock();

  if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }

  showToast('Schermo intero attivo. Premi ESC o "Torna alla Sessione" per uscire.', 'info');
}

function exitFullscreenMode() {
  state.isFullscreen = false;
  document.body.classList.remove('fullscreen-active');
  const app = document.getElementById('app');
  if (app) app.classList.remove('fullscreen-active');

  const topBtn = document.getElementById('btn-fullscreen');
  if (topBtn) {
    topBtn.innerHTML = '<span>⤢</span> Schermo Intero';
    topBtn.classList.remove('active');
  }

  const panelBtn = document.getElementById('btn-fullscreen-panel');
  if (panelBtn) {
    panelBtn.innerHTML = '<span>⤢</span> Schermo Intero';
    panelBtn.classList.remove('active');
  }

  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

function syncFullscreenDock() {
  const titleInput = document.getElementById('session-title-input');
  const title = (titleInput && titleInput.value) || state.currentSession?.title || 'Dispensa di Studio';
  const fsTitle = document.getElementById('fs-title');
  if (fsTitle) fsTitle.textContent = title;

  const currentSubject = state.subjects.find(s => s.id === state.selectedSubject) || { name: state.selectedSubject || 'Studio', icon: '📚' };
  const fsSubjectName = document.getElementById('fs-subject-name');
  if (fsSubjectName) fsSubjectName.textContent = currentSubject.name;
  const fsSubjectIcon = document.getElementById('fs-subject-icon');
  if (fsSubjectIcon) fsSubjectIcon.textContent = currentSubject.icon;

  const statusLabel = document.getElementById('status-label');
  const statusDot = document.getElementById('status-dot');
  const fsStatusLabel = document.getElementById('fs-status-label');
  const fsStatusDot = document.getElementById('fs-status-dot');

  if (fsStatusLabel && statusLabel) {
    fsStatusLabel.textContent = statusLabel.textContent;
  }
  if (fsStatusDot && statusDot) {
    fsStatusDot.className = statusDot.className;
  }

  const fsToggleBtn = document.getElementById('fs-btn-toggle-view');
  if (fsToggleBtn) {
    if (state.viewMode === 'raw') {
      fsToggleBtn.innerHTML = '<span>👁️</span> Anteprima';
    } else {
      fsToggleBtn.innerHTML = '<span>✏️</span> Modifica';
    }
  }
}

// =====================================================================
// VIEW MANAGEMENT & SESSION RESET
// =====================================================================
function createNewSession() {
  if (state.isFullscreen) {
    exitFullscreenMode();
  }
  state.currentSession = null;
  state.files = [];
  state.rawContent = '';
  state.extractedContent = '';
  state.extractedDataCache = null;
  state.isGenerating = false;
  state.pages = [];
  state.currentPageIndex = 0;
  metricsCoordinator.reset();
  syncFullscreenDock();

  // Reset campi del form
  const titleInput = document.getElementById('session-title-input');
  if (titleInput) titleInput.value = 'Nuova Sessione';

  const customInstr = document.getElementById('custom-instructions');
  if (customInstr) customInstr.value = '';

  const targetTopics = document.getElementById('target-topics-input');
  if (targetTopics) targetTopics.value = '';

  const fileInput = document.getElementById('pdf-input');
  if (fileInput) fileInput.value = '';

  const detectedContainer = document.getElementById('detected-topics-container');
  if (detectedContainer) {
    detectedContainer.innerHTML = '';
    detectedContainer.style.display = 'none';
  }

  // Svuota lista file visibile
  renderFileList();

  // Reset area markdown e preview
  const outputEl = document.getElementById('markdown-output');
  if (outputEl) outputEl.innerHTML = '<div class="streaming-cursor"></div>';

  const rawOutput = document.getElementById('raw-markdown-output');
  if (rawOutput) rawOutput.value = '';

  const extractedPreview = document.getElementById('extracted-preview');
  if (extractedPreview) extractedPreview.textContent = '';

  // Reset status bar e progressi
  const statusDot = document.getElementById('status-dot');
  if (statusDot) statusDot.className = 'status-dot idle';

  const statusLabel = document.getElementById('status-label');
  if (statusLabel) statusLabel.textContent = 'Pronto';

  const progressBar = document.getElementById('progress-bar');
  if (progressBar) progressBar.style.width = '0%';

  const progressLabel = document.getElementById('progress-label');
  if (progressLabel) progressLabel.textContent = 'In attesa dei file';

  const workersContainer = document.getElementById('parallel-workers-container');
  if (workersContainer) {
    workersContainer.innerHTML = '';
    workersContainer.style.display = 'none';
  }

  // Reset bottone genera
  const genBtn = document.getElementById('btn-generate');
  if (genBtn) {
    genBtn.disabled = false;
    genBtn.innerHTML = '<span>✨</span> Genera Riassunto';
  }

  // Rimuovi evidenziazione attiva da tutte le sessioni nella sidebar
  document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));

  showUploadPanel();
  updateStickyActionBar();
  updateGeneratingUI(false);
  showToast('Nuova sessione inizializzata', 'info');
}

function showUploadPanel() {
  document.getElementById('panel-upload').classList.add('active');
  document.getElementById('panel-generate').classList.remove('active');
  document.getElementById('panel-settings').classList.remove('active');
  document.getElementById('nav-upload').classList.add('active');
  document.getElementById('nav-settings').classList.remove('active');
  updateTopbarButtons(false, true);
}

function showGeneratePanel() {
  document.getElementById('panel-upload').classList.remove('active');
  document.getElementById('panel-generate').classList.add('active');
  document.getElementById('panel-settings').classList.remove('active');
  document.getElementById('nav-upload').classList.remove('active');
  document.getElementById('nav-settings').classList.remove('active');
}

function showSettingsPanel() {
  document.getElementById('panel-upload').classList.remove('active');
  document.getElementById('panel-generate').classList.remove('active');
  document.getElementById('panel-settings').classList.add('active');
  document.getElementById('nav-upload').classList.remove('active');
  document.getElementById('nav-settings').classList.add('active');
  updateTopbarButtons(false, true);
  loadSettings();
}

function updateTopbarButtons(hasContent, hide = false) {
  const toggleBtn = document.getElementById('btn-toggle-view');
  const exportMd = document.getElementById('btn-export-md');
  const copyMd = document.getElementById('btn-copy-md');
  const downloadPdf = document.getElementById('btn-download-pdf');
  const printPdf = document.getElementById('btn-print-pdf');
  const continueBtn = document.getElementById('btn-continue-session');
  const fullscreenBtn = document.getElementById('btn-fullscreen');
  const show = hasContent && !hide;
  if (toggleBtn) toggleBtn.style.display = show ? 'flex' : 'none';
  if (exportMd) exportMd.style.display = show ? 'flex' : 'none';
  if (copyMd) copyMd.style.display = show ? 'flex' : 'none';
  if (downloadPdf) downloadPdf.style.display = show ? 'flex' : 'none';
  if (printPdf) printPdf.style.display = show ? 'flex' : 'none';
  if (continueBtn) continueBtn.style.display = (show && state.currentSession) ? 'flex' : 'none';
  if (fullscreenBtn) fullscreenBtn.style.display = show ? 'flex' : 'none';
}

async function continueCurrentSession() {
  if (!state.currentSession) return showToast('Nessuna sessione attiva da continuare', 'error');
  if (state.isGenerating) return showToast('Generazione già in corso!', 'info');

  state.isGenerating = true;
  updateGeneratingUI(true);
  state.abortController = new AbortController();

  const continueBtn = document.getElementById('btn-continue-session');
  if (continueBtn) {
    continueBtn.disabled = true;
    continueBtn.innerHTML = '<span>⏳</span> Continuazione...';
  }

  showToast('Avvio continuazione automatica della dispensa...', 'info');

  const statusDot = document.getElementById('status-dot');
  const statusLabel = document.getElementById('status-label');
  if (statusDot) statusDot.className = 'status-dot generating';
  if (statusLabel) statusLabel.textContent = 'Continuazione in corso...';

  try {
    const res = await fetch(`/api/sessions/${state.currentSession.id}/continue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: state.abortController.signal,
      body: JSON.stringify({})
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    state.shardBuffers = { 1: state.rawContent };
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const eventBlocks = buffer.split(/\r?\n\r?\n/);
      buffer = eventBlocks.pop() || '';

      for (const block of eventBlocks) {
        if (!block.trim()) continue;
        const lines = block.split(/\r?\n/);
        for (let line of lines) {
          line = line.trim();
          if (!line || line.startsWith(':')) continue;
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'delta' || data.type === 'shard_delta') {
              state.rawContent += data.content;
              state.shardBuffers[1] = state.rawContent;
              metricsCoordinator.scheduleUpdateThrottled();
              streamingThrottler.scheduleShard(1);
            } else if (data.type === 'done') {
              if (statusDot) statusDot.className = 'status-dot done';
              if (statusLabel) statusLabel.textContent = 'Dispensa aggiornata!';
              metricsCoordinator.recalculateExact(state.rawContent);
              syncFullscreenDock();
              showToast('Dispensa continuata con successo!', 'success');
              renderMarkdown(state.rawContent);
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (e) { /* skip SSE parse errors */ }
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      showToast('Continuazione interrotta dall\'utente', 'info');
      if (statusDot) statusDot.className = 'status-dot warning';
      if (statusLabel) statusLabel.textContent = 'Interrotto dall\'utente';
      metricsCoordinator.recalculateExact(state.rawContent);
      renderMarkdown(state.rawContent);
    } else {
      showToast(`Errore: ${err.message}`, 'error');
      console.error(err);
    }
  } finally {
    state.isGenerating = false;
    state.abortController = null;
    updateGeneratingUI(false);
    if (continueBtn) {
      continueBtn.disabled = false;
      continueBtn.innerHTML = '<span>⏩</span> Continua Dispensa';
    }
  }
}

function toggleView() {
  const output = document.getElementById('markdown-output');
  const rawEditor = document.getElementById('raw-editor');
  const btn = document.getElementById('btn-toggle-view');
  const fsToggleBtn = document.getElementById('fs-btn-toggle-view');

  if (state.viewMode === 'preview') {
    state.viewMode = 'raw';
    output.style.display = 'none';
    rawEditor.style.display = 'block';
    rawEditor.value = state.rawContent;
    btn.innerHTML = '<span>👁️</span> Anteprima';
    if (fsToggleBtn) fsToggleBtn.innerHTML = '<span>👁️</span> Anteprima';
  } else {
    state.viewMode = 'preview';
    state.rawContent = rawEditor.value;
    output.style.display = 'block';
    rawEditor.style.display = 'none';
    renderMarkdown(state.rawContent);
    btn.innerHTML = '<span>✏️</span> Modifica';
    if (fsToggleBtn) fsToggleBtn.innerHTML = '<span>✏️</span> Modifica';

    // Save changes
    if (state.currentSession) {
      fetch(`/api/sessions/${state.currentSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: state.rawContent })
      });
    }
  }
}

function switchTab(tab) {
  document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel-tab-content').forEach(c => c.classList.remove('active'));

  const tabIndex = tab === 'stats' ? 0 : 1;
  document.querySelectorAll('.panel-tab')[tabIndex].classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
}

// =====================================================================
// EXPORT
// =====================================================================
function exportMarkdown() {
  const content = state.rawContent;
  if (!content) return showToast('Nessun contenuto da esportare', 'error');
  
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const title = document.getElementById('session-title-input').value || 'riassunto';
  a.href = url;
  a.download = `${sanitizeFilename(title)}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('File Markdown scaricato!', 'success');
}

async function downloadPDFDirectly() {
  if (!state.rawContent) return showToast('Nessun contenuto da esportare', 'error');

  const title = document.getElementById('session-title-input').value || 'Dispensa';
  const subject = document.getElementById('current-subject-name').textContent;

  showToast('Compilazione PDF vettoriale ad alta definizione in corso...', 'info');

  const downloadBtn = document.getElementById('btn-download-pdf');
  const originalHtml = downloadBtn ? downloadBtn.innerHTML : '';
  if (downloadBtn) {
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<span>⏳</span> Compilazione PDF...';
  }

  try {
    // Inviamo il markdown originale: il backend compilerà le formule in SVG vettoriale LaTeX puro
    const res = await fetch('/api/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: state.rawContent,
        title: title,
        subject: subject,
        visualQaMode: 'strict'
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Errore nella generazione del PDF');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (title || subject || 'Dispensa').replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_');
    a.download = `${safeTitle}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    showToast('PDF scaricato con successo sul tuo PC! 📥', 'success');
  } catch (err) {
    console.error('Errore download PDF:', err);
    showToast(`Errore compilazione PDF: ${err.message}`, 'error');
  } finally {
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = originalHtml || '<span>📥</span> Scarica PDF';
    }
  }
}

function exportPDF() {
  if (!state.rawContent) return showToast('Nessun contenuto da esportare', 'error');

  showToast('Preparazione PDF universitario in corso...', 'info');

  const title = document.getElementById('session-title-input').value || 'Dispensa';
  const subject = document.getElementById('current-subject-name').textContent;
  const parsedBody = parseMarkdownSafely(state.rawContent);

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(title)} — ${escapeHtml(subject)}</title>
      <script>
        window.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
            displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
            processEscapes: true,
            processEnvironments: true,
            packages: { '[+]': ['ams', 'boldsymbol', 'textcomp'] }
          },
          options: {
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
          },
          startup: {
            ready() {
              MathJax.startup.defaultReady();
              MathJax.startup.promise
                .then(() => MathJax.typesetPromise())
                .then(() => {
                  setTimeout(() => {
                    window.focus();
                    window.print();
                  }, 600);
                })
                .catch(e => {
                  console.error('MathJax print error:', e);
                  window.print();
                });
            }
          }
        };
      <\/script>
      <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" id="MathJax-script" async><\/script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 18mm 16mm 18mm 16mm;
        }
        body {
          font-family: 'STIX Two Text', 'Times New Roman', serif;
          max-width: 840px;
          margin: 0 auto;
          padding: 24px;
          color: #111827;
          line-height: 1.68;
          font-size: 13.5px;
          text-rendering: optimizeLegibility;
        }
        .dispensa-header {
          border-bottom: 2.5px solid #1e293b;
          padding-bottom: 14px;
          margin-bottom: 24px;
        }
        .dispensa-header h1 {
          font-size: 26px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px 0;
          letter-spacing: -0.01em;
          border: none;
        }
        .header-meta {
          color: #475569;
          font-size: 12px;
          font-style: italic;
          display: flex;
          gap: 20px;
        }
        h1, h2, h3, h4 {
          font-family: 'STIX Two Text', serif;
          page-break-after: avoid;
          break-after: avoid;
        }
        h2 {
          font-size: 18px;
          color: #1e3a8a;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 4px;
          margin-top: 28px;
          margin-bottom: 12px;
        }
        h3 {
          font-size: 15px;
          color: #1e293b;
          margin-top: 20px;
          margin-bottom: 8px;
        }
        p {
          margin: 9px 0;
          text-align: justify;
        }
        ul, ol {
          margin: 8px 0;
          padding-left: 24px;
        }
        li {
          margin: 4px 0;
        }
        /* Box stile LaTeX tcolorbox per esempi e formule */
        blockquote {
          border-left: 3.5px solid #2563eb;
          padding: 10px 16px;
          background: #f8fafc;
          margin: 14px 0;
          border-radius: 0 6px 6px 0;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        /* Tabelle accademiche */
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 12px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 7px 10px;
          text-align: left;
        }
        th {
          background-color: #f1f5f9;
          font-weight: 600;
        }
        /* Formule Matematiche */
        mjx-container {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        code {
          font-family: 'JetBrains Mono', monospace;
          background: #f1f5f9;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 11.5px;
        }
        pre {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 12px;
          border-radius: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 24px 0;
        }
        @media print {
          body {
            padding: 0;
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="dispensa-header">
        <h1>${escapeHtml(title)}</h1>
        <div class="header-meta">
          <span>🏛️ Dispensa Universitaria · ${escapeHtml(subject)}</span>
          <span>📅 ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
      <div class="dispensa-body">
        ${parsedBody}
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// =====================================================================
// SETTINGS
// =====================================================================
async function loadSettings() {
  try {
    const res = await fetch('/api/preferences');
    const prefs = await res.json();
    document.getElementById('global-prefs-input').value = prefs.globalPreferences || '';
    renderPromptSubjectSelector();
    loadPromptForSubject(state.currentPromptSubject);
  } catch (e) { console.error(e); }
}

async function saveGlobalPrefs() {
  const globalPreferences = document.getElementById('global-prefs-input').value;
  try {
    await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ globalPreferences })
    });
    showToast('Preferenze salvate! Saranno applicate dalla prossima sessione.', 'success');
  } catch (e) {
    showToast('Errore nel salvataggio', 'error');
  }
}

function renderPromptSubjectSelector() {
  const container = document.getElementById('prompt-subject-selector');
  container.innerHTML = state.subjects.map(s => `
    <div 
      class="prompt-subject-chip ${state.currentPromptSubject === s.id ? 'active' : ''}"
      onclick="selectPromptSubject('${s.id}', '${s.name}')"
    >${s.icon} ${s.name}</div>
  `).join('');
}

function selectPromptSubject(id, name) {
  state.currentPromptSubject = id;
  renderPromptSubjectSelector();
  loadPromptForSubject(id, name);
}

async function loadPromptForSubject(id, name) {
  try {
    const res = await fetch(`/api/prompts/${id}`);
    const data = await res.json();
    document.getElementById('prompt-editor').value = data.content;
    document.getElementById('prompt-editor-label').textContent = `Prompt per: ${name || id} ${data.exists ? '(personalizzato)' : '(default)'}`;
  } catch (e) { console.error(e); }
}

async function savePrompt() {
  const content = document.getElementById('prompt-editor').value;
  try {
    await fetch(`/api/prompts/${state.currentPromptSubject}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    showToast(`Prompt per ${state.currentPromptSubject} salvato!`, 'success');
    await loadSubjects();
    renderPromptSubjectSelector();
  } catch (e) {
    showToast('Errore nel salvataggio del prompt', 'error');
  }
}

async function resetPrompt() {
  if (!confirm('Ripristinare il prompt di default per questa materia? Perderai le personalizzazioni.')) return;
  try {
    await fetch(`/api/prompts/${state.currentPromptSubject}`, {
      method: 'DELETE'
    }).catch(() => {}); // DELETE might not exist, just clear editor
    loadPromptForSubject(state.currentPromptSubject);
    showToast('Prompt ripristinato al default', 'success');
  } catch (e) {
    showToast('Errore', 'error');
  }
}

// =====================================================================
// API HEALTH CHECK
// =====================================================================
async function checkApiHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    const geminiDot = document.getElementById('gemini-dot');
    const deepseekDot = document.getElementById('deepseek-dot');
    const settingsGeminiDot = document.getElementById('settings-gemini-dot');
    const settingsDeepseekDot = document.getElementById('settings-deepseek-dot');
    const settingsGeminiStatus = document.getElementById('settings-gemini-status');
    const settingsDeepseekStatus = document.getElementById('settings-deepseek-status');

    if (data.geminiKey) {
      geminiDot.className = 'api-status-dot ok';
      settingsGeminiDot.className = 'api-status-dot ok';
      settingsGeminiStatus.textContent = '✓ Configurata';
    } else {
      geminiDot.className = 'api-status-dot error';
      settingsGeminiDot.className = 'api-status-dot error';
      settingsGeminiStatus.textContent = '✗ Mancante';
    }

    if (data.deepseekKey) {
      deepseekDot.className = 'api-status-dot ok';
      settingsDeepseekDot.className = 'api-status-dot ok';
      settingsDeepseekStatus.textContent = '✓ Configurata';
    } else {
      deepseekDot.className = 'api-status-dot error';
      settingsDeepseekDot.className = 'api-status-dot error';
      settingsDeepseekStatus.textContent = '✗ Mancante';
    }

    // Carica anche il profilo Google AI Studio Access Manager
    loadGeminiAccessProfile();
  } catch (e) {
    console.warn('Server non raggiungibile per health check');
  }
}

// =====================================================================
// GOOGLE AI STUDIO ACCESS MANAGER FRONTEND COORDINATOR
// =====================================================================
let pacificCountdownInterval = null;

async function loadGeminiAccessProfile() {
  try {
    const res = await fetch('/api/gemini/profile');
    const data = await res.json();
    if (data.success && data.profile) {
      renderGeminiAccessProfile(data.profile);
    }
  } catch (err) {
    console.warn('Errore caricamento profilo Google AI Studio:', err.message);
  }
}

function renderGeminiAccessProfile(profile) {
  if (!profile) return;

  const projEl = document.getElementById('profile-project-id');
  const keyEl = document.getElementById('profile-masked-key');
  const consentEl = document.getElementById('profile-consent-status');
  const consentDesc = document.getElementById('profile-consent-desc');
  const toggleConsentBtn = document.getElementById('btn-toggle-consent');
  const policySelect = document.getElementById('select-operation-policy');

  if (projEl) projEl.textContent = profile.projectIdHash || 'proj_unconfigured';
  if (keyEl) keyEl.textContent = `Chiave: ${profile.maskedKey || '****'}`;

  if (consentEl) {
    if (profile.privacyConsent && profile.privacyConsent.granted) {
      consentEl.innerHTML = '<span class="badge-status authorized">Accettato</span>';
      if (consentDesc) consentDesc.textContent = 'Documenti accademici consentiti';
      if (toggleConsentBtn) {
        toggleConsentBtn.className = 'btn btn-ghost btn-sm';
        toggleConsentBtn.innerHTML = '<span>🚫</span> Revoca Consenso';
      }
    } else {
      consentEl.innerHTML = '<span class="badge-status dead">Revocato</span>';
      if (consentDesc) consentDesc.textContent = 'Solo elaborazione locale attiva';
      if (toggleConsentBtn) {
        toggleConsentBtn.className = 'btn btn-primary btn-sm';
        toggleConsentBtn.innerHTML = '<span>✅</span> Concedi Consenso';
      }
    }
  }

  if (policySelect && profile.operationPolicy) {
    policySelect.value = profile.operationPolicy;
  }

  // Ruoli didattici assegnati
  const roles = profile.roleAssignments || {};
  const roleTriageEl = document.getElementById('role-model-triage');
  const roleExtEl = document.getElementById('role-model-extraction');
  const roleRevEl = document.getElementById('role-model-review');

  if (roleTriageEl) roleTriageEl.textContent = roles.DOCUMENT_TRIAGE || 'Nessuno';
  if (roleExtEl) roleExtEl.textContent = roles.VISUAL_EXTRACTION || 'Nessuno';
  if (roleRevEl) roleRevEl.textContent = roles.SCIENTIFIC_REVIEW || 'Nessuno';

  // Tabella modelli & quote
  const tbody = document.getElementById('models-table-body');
  if (tbody && Array.isArray(profile.models)) {
    tbody.innerHTML = '';
    for (const m of profile.models) {
      const tr = document.createElement('tr');

      let badgeClass = 'authorized';
      let badgeText = 'AUTORIZZATO';

      if (m.status === 'SOFT_LIMIT_REACHED') {
        badgeClass = 'soft-limit';
        badgeText = 'QUOTA QUASI ESAURITA';
      } else if (m.status === 'QUOTA_EXHAUSTED') {
        badgeClass = 'exhausted';
        badgeText = 'QUOTA ESAURITA';
      } else if (m.circuitState === 'OPEN') {
        badgeClass = 'overloaded';
        badgeText = 'SOVRACCARICO TEMPORANEO';
      } else if (m.status === 'POLICY_DISALLOWED') {
        badgeClass = 'disallowed';
        badgeText = 'NON CONSENTITO (Allowlist)';
      } else if (m.status === 'DEAD') {
        badgeClass = 'dead';
        badgeText = 'MODELLO NON SUPPORTATO';
      }

      const rpdText = m.usage ? `${m.usage.rpdUsed} / ${m.usage.rpdMax}` : '--';
      const rpmText = m.usage ? `${m.usage.rpmCurrent} / ${m.usage.rpmMax}` : '--';
      const reasonText = m.reason ? escapeHtml(m.reason) : 'Pienamente operativo';

      tr.innerHTML = `
        <td style="font-weight: 600; font-family: 'JetBrains Mono', monospace;">${escapeHtml(m.name)}</td>
        <td><span class="badge-status ${badgeClass}">${badgeText}</span></td>
        <td>${rpdText}</td>
        <td>${rpmText}</td>
        <td style="font-size: 11px; color: var(--text-muted);">${reasonText}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  // Timer reset PT
  if (profile.quotaResetTime) {
    startPacificCountdown(profile.quotaResetTime);
  }
}

function startPacificCountdown(resetIsoString) {
  if (pacificCountdownInterval) clearInterval(pacificCountdownInterval);
  const targetTime = new Date(resetIsoString).getTime();

  function update() {
    const diff = targetTime - Date.now();
    const countdownEl = document.getElementById('profile-reset-countdown');
    if (!countdownEl) return;

    if (diff <= 0) {
      countdownEl.textContent = 'Reset in corso...';
      return;
    }
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    countdownEl.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  update();
  pacificCountdownInterval = setInterval(update, 1000);
}

async function changeOperationPolicy(newPolicy) {
  try {
    const res = await fetch('/api/gemini/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy: newPolicy })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Politica operativa impostata a: ${newPolicy}`, 'success');
      renderGeminiAccessProfile(data.profile);
    } else {
      showToast(data.error || 'Errore cambio policy', 'error');
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function togglePrivacyConsent() {
  const currentGranted = document.getElementById('profile-consent-status')?.textContent?.includes('Accettato');
  const targetGranted = !currentGranted;

  if (!targetGranted) {
    const confirmed = confirm("Revocando il consenso, Study Genius non invierà alcun documento a Google AI Studio e utilizzerà esclusivamente l'elaborazione locale offline. Confermi?");
    if (!confirmed) return;
  }

  try {
    const res = await fetch('/api/gemini/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ granted: targetGranted })
    });
    const data = await res.json();
    if (data.success) {
      showToast(targetGranted ? 'Consenso privacy attivato' : 'Consenso privacy revocato (Solo Locale attivo)', 'info');
      renderGeminiAccessProfile(data.profile);
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function refreshGeminiProfile() {
  showToast('Aggiornamento catalogo modelli in corso...', 'info');
  try {
    const res = await fetch('/api/gemini/refresh', { method: 'POST' });
    const data = await res.json();
    if (data.success && data.profile) {
      renderGeminiAccessProfile(data.profile);
      showToast('Catalogo Google AI Studio sincronizzato con successo', 'success');
    } else {
      showToast(data.error || 'Errore sincronizzazione', 'error');
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// =====================================================================
// UI HELPERS
// =====================================================================
function showLoading(text, subtext) {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading-subtext').textContent = subtext;
  document.getElementById('loading-overlay').classList.add('visible');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.remove('visible');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: '💡' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '💡'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9\-_àèìòùÀÈÌÒÙáéíóúÁÉÍÓÚ ]/g, '_').trim().replace(/\s+/g, '_');
}

// Auto-save session title
document.getElementById('session-title-input')?.addEventListener('blur', async () => {
  if (state.currentSession?.id) {
    const title = document.getElementById('session-title-input').value;
    try {
      await fetch(`/api/sessions/${state.currentSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      state.currentSession.title = title;
      await loadSessions();
    } catch (e) { /* silent */ }
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    if (state.rawContent) toggleView();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (state.rawContent) exportMarkdown();
  }
});
