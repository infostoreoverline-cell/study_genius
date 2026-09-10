const express = require('express');
const router = express.Router();

const { generatePdf } = require('../services/pdfExportService');

/**
 * POST /api/export-pdf
 * Esporta e scarica il PDF direttamente (Puppeteer headless + fallback)
 */
router.post('/export-pdf', async (req, res) => {
  try {
    const { html, markdown, title, subject, knowledgeGraph, visualQaMode, options: reqOptions } = req.body;
    console.log('📥 [/api/export-pdf] Richiesta ricevuta:', { hasMarkdown: !!markdown, hasHtml: !!html, title, subject, hasKg: !!knowledgeGraph, visualQaMode });

    const content = markdown || html;
    if (!content) {
      return res.status(400).json({ error: 'Contenuto (markdown o HTML) mancante' });
    }

    const isMarkdown = !!markdown;
    const effectiveOptions = {
      ...(reqOptions || {}),
      visualQaMode: visualQaMode || reqOptions?.visualQaMode || 'off'
    };

    const { buffer, filename } = await generatePdf({
      content,
      isMarkdown,
      title,
      subject,
      knowledgeGraph,
      options: effectiveOptions
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);

  } catch (err) {
    console.error('❌ [/api/export-pdf] Errore esportazione PDF:', err);
    res.status(500).json({ error: err.message || 'Errore durante la compilazione del PDF' });
  }
});

module.exports = router;
