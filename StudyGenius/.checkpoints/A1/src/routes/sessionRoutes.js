const express = require('express');
const router = express.Router();

const {
  listSessions,
  getSession,
  deleteSession,
  updateSession
} = require('../services/sessionService');

/**
 * GET /api/sessions
 * Lista di tutte le sessioni salvate
 */
router.get('/sessions', (req, res) => {
  try {
    const sessions = listSessions();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sessions/:id
 * Ottieni contenuto e metadati della sessione
 */
router.get('/sessions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const session = getSession(id);
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/sessions/:id
 * Elimina sessione e file ausiliari
 */
router.delete('/sessions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteSession(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/sessions/:id
 * Aggiorna manualmente il contenuto o il titolo di una sessione
 */
router.put('/sessions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { content, title } = req.body;
    const updated = updateSession(id, { content, title });
    if (!updated) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
