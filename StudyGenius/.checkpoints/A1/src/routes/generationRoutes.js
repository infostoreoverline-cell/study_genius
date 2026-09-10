const express = require('express');
const router = express.Router();

const { orchestrateGeneration, continueSessionGeneration } = require('../services/orchestratorService');

/**
 * POST /api/generate
 * Genera riassunto / dispensa con pipeline parallela adattiva e streaming SSE
 */
router.post('/generate', async (req, res) => {
  const { extractedContent, subject, sessionTitle, customInstructions, studyMode, targetTopics, visualContracts } = req.body;

  if (!extractedContent) {
    return res.status(400).json({ error: 'Contenuto mancante' });
  }

  // Imposta header SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');

  let clientAborted = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      clientAborted = true;
    }
  });

  const sendSSE = (obj) => {
    try {
      if (!res.writableEnded && res.writable && !clientAborted) {
        res.write(`data: ${JSON.stringify(obj)}\n\n`);
      }
    } catch (e) { /* ignore client socket closes */ }
  };

  try {
    await orchestrateGeneration({
      extractedContent,
      subject,
      sessionTitle,
      customInstructions,
      studyMode,
      targetTopics,
      sendSSE,
      isClientAborted: () => clientAborted && !res.writable,
      visualContracts: Array.isArray(visualContracts) ? visualContracts : []
    });

    res.end();
  } catch (error) {
    console.error('Errore generazione parallela:', error);
    sendSSE({ type: 'error', message: error.message });
    res.end();
  }
});

/**
 * POST /api/sessions/:id/continue
 * Continua una sessione esistente (se troncata o incompleta)
 */
router.post('/sessions/:id/continue', async (req, res) => {
  const { id } = req.params;
  const { additionalInstructions } = req.body || {};

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  let clientAborted = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      clientAborted = true;
    }
  });

  const sendSSE = (obj) => {
    try {
      if (!res.writableEnded && res.writable && !clientAborted) {
        res.write(`data: ${JSON.stringify(obj)}\n\n`);
      }
    } catch (e) { /* ignore */ }
  };

  try {
    await continueSessionGeneration({
      sessionId: id,
      additionalInstructions,
      sendSSE
    });

    res.end();
  } catch (error) {
    console.error('Errore continuazione sessione:', error);
    sendSSE({ type: 'error', message: error.message });
    res.end();
  }
});

module.exports = router;
