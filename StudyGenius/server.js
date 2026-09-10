require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');

const { CONFIG } = require('./src/config');
const apiRoutes = require('./src/routes');
const { discoverAndTestModels } = require('./src/services/aiService');

const app = express();
const PORT = CONFIG.PORT;

// --- Middleware Globali ---
app.use(cors());
app.use(express.json({ limit: CONFIG.UPLOAD_LIMITS.bodyJsonLimit }));
app.use(express.urlencoded({ limit: CONFIG.UPLOAD_LIMITS.bodyJsonLimit, extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Montaggio Router Modulare API ---
app.use('/api', apiRoutes);

// --- Gestione Errori Globale ---
app.use((err, req, res, next) => {
  console.error('❌ Errore applicazione non gestito:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: err.message || 'Errore interno del server' });
  }
});

process.on('uncaughtException', (err) => {
  console.error('❌ [CRITICAL] uncaughtException:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ [CRITICAL] unhandledRejection:', reason);
});

// --- Avvio Server HTTP ---
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n===========================================`);
  console.log(`🚀 STUDY GENIUS — SERVER ATTIVO CON SUCCESSO`);
  console.log(`===========================================`);
  console.log(`📖 Apri il browser su: http://localhost:${PORT}`);
  console.log(`   (Alternativa:       http://127.0.0.1:${PORT})`);
  console.log(`🔑 Gemini API:   ${process.env.GEMINI_API_KEY ? '✅ Configurata' : '❌ Mancante'}`);
  console.log(`🤖 DeepSeek API: ${process.env.DEEPSEEK_API_KEY ? '✅ Configurata' : '❌ Mancante'}`);
  console.log(`\nPremi Ctrl+C nella finestra per fermare il server.\n`);

  // Esegui la Discovery dinamica dei modelli Gemini all'avvio in background (solo metadati, zero consumo quote di generazione)
  if (process.env.NODE_ENV !== 'test' && process.env.GEMINI_API_KEY) {
    discoverAndTestModels({ pingCapability: false }).catch(err => {
      console.warn('  ⚠️ Discovery Gemini all\'avvio non riuscita:', err.message);
    });
  }

  if (process.env.AUTO_OPEN !== 'false') {
    const openCmd = process.platform === 'win32'
      ? `start http://localhost:${PORT}`
      : (process.platform === 'darwin' ? `open http://localhost:${PORT}` : `xdg-open http://localhost:${PORT}`);
    exec(openCmd, () => {});
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERRORE: La porta ${PORT} è già occupata da un processo precedente!`);
    console.error(`👉 Esegui "CHIUDI SERVER.bat" per terminare il vecchio processo, poi riavvia.\n`);
  } else {
    console.error('\n❌ Errore critico server:', err.message);
  }
});

module.exports = { app, server };
