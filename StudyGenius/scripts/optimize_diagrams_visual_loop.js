#!/usr/bin/env node
/**
 * StudyGenius Academic Intelligence System
 * scripts/optimize_diagrams_visual_loop.js — VSVP V2 CLI
 * 
 * Tool da riga di comando per testare e applicare l'ottimizzazione iterativa
 * dei diagrammi su qualsiasi file markdown o sessione.
 * 
 * Utilizzo:
 *   node scripts/optimize_diagrams_visual_loop.js --file sessions/Fisica/36a8f952-3189-463c-bef1-0d369da19b55.md --mode standard
 *   node scripts/optimize_diagrams_visual_loop.js --dry-run
 */

'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs-extra');
const { refineAllDiagramsInMarkdown, optimizeDiagram, rasterizeSvg } = require('../src/rendering/visualFeedbackLoop');

async function main() {
  const args = process.argv.slice(2);
  let filePath = null;
  let mode = 'standard'; // 'off' | 'standard' | 'high' | 'maximum'
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      filePath = path.resolve(process.cwd(), args[i + 1]);
      i++;
    } else if (args[i] === '--mode' && args[i + 1]) {
      mode = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  if (!filePath) {
    // Default: dispensa cavitazione fisica
    filePath = path.resolve(__dirname, '../sessions/Fisica/36a8f952-3189-463c-bef1-0d369da19b55.md');
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File non trovato: ${filePath}`);
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   StudyGenius Validated Scientific Visual Pipeline (V2)   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`📂 File target: ${filePath}`);
  console.log(`⚙️ Modalità QA: ${mode.toUpperCase()}`);
  console.log(`🛡️ Dry-run: ${dryRun ? 'ATTIVO (nessuna scrittura su disco)' : 'DISATTIVO'}`);

  const originalContent = await fs.readFile(filePath, 'utf8');
  const previewDir = path.resolve(__dirname, '../sessions/Fisica/vsvp_previews');
  await fs.ensureDir(previewDir);

  const startTime = Date.now();

  const { updatedMarkdown, optimizedCount, results } = await refineAllDiagramsInMarkdown(originalContent, {
    mode,
    previewDir,
    subject: 'Fisica'
  });

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n============================================================');
  console.log(`🏁 Pipeline completata in ${elapsedSec}s!`);
  console.log(`📊 Diagrammi processati: ${optimizedCount}`);
  
  results.forEach((r, idx) => {
    console.log(`   [Fig #${idx + 1}] Esito: ${r.passed ? 'PASSED ✅' : 'REVIEW NEEDED ⚠️'} | Punteggio: ${r.overallScore || r.bestScore}/100 | Giri: ${r.iterations}`);
  });

  if (!dryRun && updatedMarkdown !== originalContent) {
    await fs.writeFile(filePath, updatedMarkdown, 'utf8');
    console.log(`💾 Modifiche salvate con successo in: ${filePath}`);
  } else if (dryRun) {
    console.log(`ℹ️ [Dry-run] Nessuna modifica apportata al file originale.`);
  }

  console.log(`🖼️ Anteprime PNG salvate in: ${previewDir}`);
}

main().catch(err => {
  console.error('❌ Errore esecuzione script:', err);
  process.exit(1);
});
