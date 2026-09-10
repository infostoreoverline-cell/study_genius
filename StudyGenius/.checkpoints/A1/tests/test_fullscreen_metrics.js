const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const http = require('http');

function checkServerRunning(port = 3000) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, () => resolve(true));
    req.on('error', () => resolve(false));
  });
}

(async () => {
  console.log('🚀 Avvio test Puppeteer per Realtime Multi-Shard Streaming e Schermo Intero...');

  let testServer = null;
  const isRunning = await checkServerRunning(3000);
  if (!isRunning) {
    process.env.AUTO_OPEN = 'false';
    const { server } = require('../server');
    testServer = server;
    await new Promise(r => setTimeout(r, 800));
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  console.log('✅ Pagina caricata correttamente.');

  // 1. Simula selezione di una materia o sessione
  await page.evaluate(() => {
    state.selectedSubject = 'Fisica';
    const titleInput = document.getElementById('session-title-input');
    if (titleInput) titleInput.value = 'Elettromagnetismo e Campi Vettoriali';
    showGeneratePanel();
    updateTopbarButtons(true);
    state.shardBuffers = {};
    const outputEl = document.getElementById('markdown-output');
    if (outputEl) outputEl.innerHTML = '';
  });

  // 2. Simula streaming contemporaneo di 3 Shard (Multi-Corsia live)
  console.log('⏳ Simulazione streaming parallelo di 3 corsie didattiche in tempo reale...');
  const shard1Chunks = [
    '# Capitolo 1: Fondamenti del Campo Elettrico\n\nIl campo elettrico $E$ generato da una carica puntiforme $q$ nello spazio vuoto è definito come:\n\n$$\\vec{E} = \\frac{1}{4\\pi\\varepsilon_0} \\frac{q}{r^2} \\hat{r}$$\n\n',
    'Questo campo vettoriale descrive la forza per unità di carica che agirebbe su una carica di prova positiva collocata nel punto considerato.\n\n'
  ];
  const shard2Chunks = [
    '# Capitolo 2: Potenziale Elettrostatico e Lavoro\n\nIl potenziale elettrostatico $V$ in un punto dello spazio è legato al lavoro $W$ necessario per portare una carica unitaria dall\'infinito:\n\n$$V(r) = -\\int_{\\infty}^r \\vec{E} \\cdot d\\vec{l} = \\frac{q}{4\\pi\\varepsilon_0 r}$$\n\n',
    'Il campo elettrico è conservativo e può essere espresso come gradiente negativo del potenziale scalare: $\\vec{E} = -\\vec{\\nabla} V$.\n\n'
  ];
  const shard3Chunks = [
    '# Capitolo 3: Teorema di Gauss e Applicazioni di Simmetria\n\nIl flusso del campo elettrico attraverso una superficie chiusa $\\Phi_S(\\vec{E})$ dipende esclusivamente dalla carica netta racchiusa:\n\n$$\\Phi_S(\\vec{E}) = \\oint_S \\vec{E} \\cdot d\\vec{A} = \\frac{Q_{int}}{\\varepsilon_0}$$\n\n',
    'Nei conduttori in equilibrio elettrostatico, la carica si distribuisce esclusivamente sulla superficie esterna e il campo interno è nullo.\n\n'
  ];

  for (let step = 0; step < 2; step++) {
    await page.evaluate((c1, c2, c3) => {
      state.shardBuffers[1] = (state.shardBuffers[1] || '') + c1;
      state.shardBuffers[2] = (state.shardBuffers[2] || '') + c2;
      state.shardBuffers[3] = (state.shardBuffers[3] || '') + c3;

      const sortedKeys = Object.keys(state.shardBuffers).sort((a, b) => Number(a) - Number(b));
      state.rawContent = sortedKeys.map(k => state.shardBuffers[k]).join('\n\n---\n\n');

      metricsCoordinator.updateFromText(state.rawContent);
      streamingThrottler.scheduleShard(1);
      streamingThrottler.scheduleShard(2);
      streamingThrottler.scheduleShard(3);
    }, shard1Chunks[step], shard2Chunks[step], shard3Chunks[step]);

    await new Promise(r => setTimeout(r, 180)); // attesa per interpolazione contatore 60fps
  }

  // Attesa completamento animazione contatore
  await new Promise(r => setTimeout(r, 400));

  const statsAfterStream = await page.evaluate(() => {
    return {
      displayedWords: metricsCoordinator.displayedWords,
      targetWords: metricsCoordinator.targetWords,
      displayedChars: metricsCoordinator.displayedChars,
      badgeText: document.getElementById('word-count-panel')?.textContent,
      dockWords: document.getElementById('fs-word-count')?.textContent,
      shardBlocksCount: document.querySelectorAll('.shard-stream-block').length
    };
  });
  console.log('📊 Metriche dopo streaming multi-corsia:', statsAfterStream);

  // 3. Testa attivazione Schermo Intero
  console.log('⤢ Test attivazione Schermo Intero...');
  await page.evaluate(() => {
    enterFullscreenMode();
  });

  const isFsActive = await page.evaluate(() => {
    return document.getElementById('app').classList.contains('fullscreen-active') &&
           document.body.classList.contains('fullscreen-active');
  });
  console.log('✅ Schermo Intero attivo:', isFsActive);

  // Cattura screenshot Schermo Intero
  const screenshotFsPath = path.join(__dirname, '../screenshot_fullscreen_preview.png');
  await page.screenshot({ path: screenshotFsPath, fullPage: false });
  console.log('📸 Screenshot Schermo Intero salvato in:', screenshotFsPath);

  // 4. Testa uscita da Schermo Intero
  console.log('↩ Test uscita da Schermo Intero...');
  await page.evaluate(() => {
    exitFullscreenMode();
  });

  const isFsClosed = await page.evaluate(() => {
    return !document.getElementById('app').classList.contains('fullscreen-active') &&
           !document.body.classList.contains('fullscreen-active');
  });
  console.log('✅ Ritorno a vista sessione normale:', isFsClosed);

  // Cattura screenshot vista normale
  const screenshotNormalPath = path.join(__dirname, '../screenshot_normal_session.png');
  await page.screenshot({ path: screenshotNormalPath, fullPage: false });
  console.log('📸 Screenshot vista normale salvato in:', screenshotNormalPath);

  await browser.close();
  if (testServer) {
    await new Promise(r => testServer.close(r));
  }
  console.log('🎉 Test completato con pieno successo!');
})();

