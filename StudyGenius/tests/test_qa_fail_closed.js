/**
 * StudyGenius — Test Suite: Fail-Closed QA (Blocco 2A)
 * tests/test_qa_fail_closed.js
 */

'use strict';

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const exportRoutes = require('../src/routes/exportRoutes');
const pdfExportService = require('../src/services/pdfExportService');
const visualFeedbackLoop = require('../src/rendering/visualFeedbackLoop');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✅ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${description}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n🚀 SEZIONE 1 — Rifiuto "off" in Produzione (exportRoutes)\n');
  
  const app = express();
  app.use(bodyParser.json());
  app.use('/api', exportRoutes);

  // Avvia server temporaneo per testare le rotte HTTP
  const server = http.createServer(app);
  await new Promise(res => server.listen(0, res));
  const port = server.address().port;

  // Forza NODE_ENV
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)).catch(err => require('http').request(...args));
    
    const requestAsync = (path, body) => new Promise((resolve, reject) => {
      const req = http.request(`http://localhost:${port}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      });
      req.on('error', reject);
      req.write(JSON.stringify(body));
      req.end();
    });

    const res = await requestAsync('/api/export-pdf', { markdown: 'test', visualQaMode: 'off' });
    
    test('exportRoutes: HTTP 403 se visualQaMode="off" in produzione', () => {
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
      if (!res.body.error.includes('non è consentita in produzione')) {
        throw new Error(`Expected error message about 'off' not allowed, got: ${res.body.error}`);
      }
    });

    const res2 = await requestAsync('/api/export-pdf', { markdown: 'test', options: { visualQaMode: 'off' } });

    test('exportRoutes: HTTP 403 anche se "off" è passato in options', () => {
      if (res2.status !== 403) throw new Error(`Expected 403, got ${res2.status}`);
    });
  } finally {
    process.env.NODE_ENV = originalEnv;
    server.close();
  }

  console.log('\n🚀 SEZIONE 2 — Fail-Closed in PDF Export Service\n');

  // Stub di visualFeedbackLoop per simulare scenari
  const originalRefine = visualFeedbackLoop.refineAllDiagramsInMarkdown;

  try {
    // 1. Simula QA fallito (passed: false)
    visualFeedbackLoop.refineAllDiagramsInMarkdown = async () => ({
      updatedMarkdown: 'test',
      results: [{ passed: false }]
    });

    let errorThrown = false;
    try {
      await pdfExportService.generatePdf({ content: 'test', isMarkdown: true, options: { visualQaMode: 'strict' } });
    } catch (err) {
      errorThrown = true;
      test('pdfExportService: Deve lanciare errore bloccante se r.passed === false', () => {
        if (!err.message.includes('non ha/hanno superato i Quality Gates')) {
          throw new Error(`Messaggio di errore errato: ${err.message}`);
        }
      });
    }
    if (!errorThrown) test('pdfExportService: Deve lanciare errore bloccante se r.passed === false', () => { throw new Error('Nessun errore lanciato'); });

    // 2. Simula eccezione lanciata dal QA
    visualFeedbackLoop.refineAllDiagramsInMarkdown = async () => {
      throw new Error('Timeout API o Errore Rete');
    };

    let apiErrorThrown = false;
    try {
      await pdfExportService.generatePdf({ content: 'test', isMarkdown: true, options: { visualQaMode: 'strict' } });
    } catch (err) {
      apiErrorThrown = true;
      test('pdfExportService: Deve propagare errore se il QA lancia un\'eccezione', () => {
        if (!err.message.includes('QA Visuale fallito o errore di rendering')) {
          throw new Error(`Messaggio di eccezione errato: ${err.message}`);
        }
      });
    }
    if (!apiErrorThrown) test('pdfExportService: Deve propagare errore se il QA lancia un\'eccezione', () => { throw new Error('Nessuna eccezione propagata'); });

  } finally {
    // Ripristina stub
    visualFeedbackLoop.refineAllDiagramsInMarkdown = originalRefine;
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Risultato: ${passed} passati, ${failed} falliti`);
  console.log('─'.repeat(50));

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n  ✅ Tutti i test Fail-Closed superati!\n');
  }
}

runTests().catch(console.error);
