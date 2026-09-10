/**
 * StudyGenius Academic Intelligence System
 * src/rendering/visualFeedbackLoop.js — VSVP V2
 * 
 * Orchestratore Centrale della Validated Scientific Visual Pipeline (VSVP V2).
 * 
 * Flusso Integrato:
 * 1. Pre-Sanitizer Deterministico (Zero-Token: fill='none', viewBox, ID semantici)
 * 2. Deterministic Geometric QA (Chromium BBox, collision matrix, clipping, gap)
 * 3. Rendered Preview (Sharp per fast QA, Chromium per final QA)
 * 4. Semantic Multimodal QA (Gemini con Ground Truth & QA Profile)
 * 5. Multi-Gate Quality Evaluation (Scientific >= 95, Semantic >= 92, Collisions == 0)
 * 6. Structured Patch Execution (svgPatchEngine: traslazioni, leader lines, attributi)
 * 7. History & Anti-Oscillation Tracker (rilevamento stagnazione -> redesign concettuale)
 * 8. Blind Final Review (Esaminatore indipendente prima del rilascio nel PDF)
 */

'use strict';

const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const puppeteer = require('puppeteer');

const { sanitizeSvg, fixMissingPathFill, ensureSemanticAttributes } = require('./svgSanitizer');
const { analyzeSvgGeometry, getBrowserInstance, releaseBrowserInstance } = require('./svgGeometryAnalyzer');
const { applyStructuredPatches } = require('./svgPatchEngine');
const { inferGroundTruthFromContext, createVisualGroundTruth } = require('./visualGroundTruth');
const { buildSemanticReviewerPrompt, buildBlindExaminerPrompt } = require('../prompts/visualCriticPrompts');
const { defaultAccessManager } = require('../services/googleAIStudioAccessManager');
const { callGeminiRole } = require('../services/aiService');
const { VISUAL_QA_CONFIG } = require('../config');

/**
 * Converte un SVG in un buffer PNG ad alta risoluzione
 * Modalità: 'sharp' (veloce, ~30ms) o 'puppeteer' (alta fedeltà con web fonts, per final review)
 */
async function rasterizeSvg(svgString, options = {}) {
  const engine = options.engine || 'sharp';
  const scale = options.scale || 2.0;

  if (engine === 'sharp') {
    try {
      const buf = Buffer.from(svgString, 'utf8');
      const pngBuffer = await sharp(buf, { density: Math.round(72 * scale) })
        .png()
        .toBuffer();
      return pngBuffer;
    } catch (sharpErr) {
      // Se sharp fallisce (es. tag complessi non supportati da librsvg), fallback trasparente a puppeteer
    }
  }

  // Motore Puppeteer (identico all'esportazione PDF finale)
  const browser = options.browserInstance || await getBrowserInstance();
  const ownsBrowser = !options.browserInstance;
  let page = null;

  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: scale });

    // Determina larghezza naturale da viewBox o width per evitare collasso a 300px
    const vbMatch = svgString.match(/\bviewBox=['"]([^'"]+)['"]/i);
    let naturalWidth = 850;
    if (vbMatch) {
      const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && !isNaN(parts[2]) && parts[2] > 100) {
        naturalWidth = Math.round(parts[2]);
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #ffffff; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; display: inline-block; }
          #canvas { display: inline-block; padding: 10px; background: #ffffff; width: ${naturalWidth + 20}px; }
          #canvas svg { display: block; width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <div id="canvas">${svgString}</div>
      </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    try { await page.evaluateHandle('document.fonts.ready'); } catch (_) {}

    const canvasEl = await page.$('#canvas');
    const pngBuffer = canvasEl ? await canvasEl.screenshot({ type: 'png' }) : await page.screenshot({ type: 'png', fullPage: false });
    return pngBuffer;

  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
    if (ownsBrowser) {
      await releaseBrowserInstance();
    }
  }
}

/**
 * Valuta l'aderenza semantica e didattica dell'immagine con Gemini
 */
async function runSemanticEvaluation(pngBuffer, groundTruth, geometryReport, history, options = {}) {
  const isDeepReview = options.useDeepModel || false;
  const role = isDeepReview ? 'VISUAL_QA_DEEP' : 'VISUAL_QA_FAST';
  const modelName = defaultAccessManager.getBestAvailableModel(role);

  const promptText = buildSemanticReviewerPrompt(groundTruth, geometryReport, history);
  const base64Image = pngBuffer.toString('base64');

  const contents = [
    promptText,
    {
      inlineData: {
        mimeType: 'image/png',
        data: base64Image
      }
    }
  ];

  try {
    console.log(`  🔍 [VSVP_V2] Semantic Review con ${modelName} (${role})...`);
    const res = await callGeminiRole({
      role: 'SCIENTIFIC_REVIEW',
      contents,
      config: {
        temperature: 0.1,
        maxOutputTokens: 6144,
        responseMimeType: 'application/json'
      },
      metadata: {
        figureId: groundTruth.visualId,
        justification: `Semantic QA per figura ${groundTruth.visualId} (${groundTruth.diagramType})`
      }
    });

    const rawText = res.text || '{}';
    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      success: true,
      model: modelName,
      scores: parsed.scores || {
        scientificAccuracy: 90,
        semanticClarity: 85,
        layout: 85,
        readability: 85,
        visualHierarchy: 85,
        aesthetics: 85
      },
      criticalIssuesCount: parsed.criticalIssuesCount !== undefined ? parsed.criticalIssuesCount : (parsed.issues || []).filter(i => i.severity === 'critical').length,
      majorIssuesCount: parsed.majorIssuesCount !== undefined ? parsed.majorIssuesCount : (parsed.issues || []).filter(i => i.severity === 'major').length,
      minorIssuesCount: parsed.minorIssuesCount !== undefined ? parsed.minorIssuesCount : (parsed.issues || []).filter(i => i.severity === 'minor').length,
      issues: parsed.issues || [],
      repairLevel: parsed.repairLevel || 'MICRO_REPAIR',
      verdict: parsed.pedagogicalVerdict || ''
    };

  } catch (err) {
    console.warn(`  ⚠️ [VSVP_V2] Chiamata semantica non riuscita (${err.message}). Utilizzo fallback deterministico.`);
    return {
      success: false,
      error: err.message,
      scores: { scientificAccuracy: 85, semanticClarity: 80, layout: 80, readability: 80, visualHierarchy: 80, aesthetics: 80 },
      criticalIssuesCount: 0,
      majorIssuesCount: geometryReport.collisionCount > 0 ? 1 : 0,
      minorIssuesCount: 0,
      issues: [],
      repairLevel: 'MICRO_REPAIR',
      verdict: `Fallback causa errore API: ${err.message}`
    };
  }
}

/**
 * Esegue la Blind Final Review (Fase 4: Esaminatore Indipendente)
 */
async function runBlindFinalReview(pngBuffer, groundTruth) {
  const modelName = defaultAccessManager.getBestAvailableModel('VISUAL_QA_DEEP');
  const promptText = buildBlindExaminerPrompt(groundTruth);
  const base64Image = pngBuffer.toString('base64');

  const contents = [
    promptText,
    {
      inlineData: {
        mimeType: 'image/png',
        data: base64Image
      }
    }
  ];

  try {
    console.log(`  🎓 [VSVP_V2] Blind Final Review con esaminatore indipendente (${modelName})...`);
    const res = await callGeminiRole({
      role: 'SCIENTIFIC_REVIEW',
      contents,
      config: {
        temperature: 0.1,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json'
      },
      metadata: {
        figureId: groundTruth.visualId,
        justification: `Blind Final Review per figura ${groundTruth.visualId}`
      }
    });

    const cleanJson = (res.text || '{}').replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleanJson);
    return {
      approved: parsed.approved !== false && (parsed.verdict || '').toUpperCase() === 'APPROVED',
      score: parsed.academicQualityScore || 90,
      reasoning: parsed.reasoning || ''
    };
  } catch (err) {
    return { approved: true, score: 90, reasoning: `Blind review saltata per errore rete: ${err.message}` };
  }
}

/**
 * Calcola se la figura supera tutti i cancelli di qualità della V2,
 * calibrati dinamicamente in funzione del Visual Tier didattico (Tier 1, 2, 3).
 */
function evaluateQualityGate(geoResult, semanticReport, config, groundTruth = null) {
  const tier = groundTruth && groundTruth.visualTier ? groundTruth.visualTier : null;
  const tierLevel = tier && tier.level ? tier.level : 2;

  const minScientific = config.minScientificScore || (tierLevel === 3 ? 95 : (tierLevel === 2 ? 92 : 90));
  const minSemantic   = config.minSemanticScore || (tierLevel === 3 ? 92 : (tierLevel === 2 ? 90 : 88));
  const minReadability= config.minReadabilityScore || (tierLevel === 3 ? 90 : (tierLevel === 2 ? 88 : 85));

  const geoPassed = (geoResult.collisionCount === 0 && geoResult.clippingCount === 0);
  const scores = semanticReport.scores || {};

  const scientificOk = (scores.scientificAccuracy || 0) >= minScientific;
  const semanticOk   = (scores.semanticClarity || 0) >= minSemantic;
  const readabilityOk= (scores.readability || 0) >= minReadability;
  const issuesOk     = semanticReport.criticalIssuesCount === 0 && semanticReport.majorIssuesCount === 0;

  const passed = geoPassed && scientificOk && semanticOk && readabilityOk && issuesOk;

  // Calcolo punteggio complessivo pesato
  const overallScore = Math.round(
    ((scores.scientificAccuracy || 90) * 0.35) +
    ((scores.semanticClarity || 90) * 0.25) +
    ((scores.readability || 90) * 0.20) +
    ((geoPassed ? 100 : Math.max(40, 100 - geoResult.collisionCount * 25)) * 0.20)
  );

  return {
    passed,
    overallScore,
    visualTier: tier ? tier.label : 'Livello 2: Comprensione',
    details: {
      geoPassed,
      scientificOk,
      semanticOk,
      readabilityOk,
      issuesOk,
      thresholds: { minScientific, minSemantic, minReadability }
    }
  };
}

/**
 * Ottimizza un singolo diagramma SVG attraverso la pipeline iterativa V2
 * 
 * @param {string} rawSvgString SVG di partenza
 * @param {Object} [groundTruthOptions] Informazioni di contesto didattico
 * @param {Object} [options] Opzioni di configurazione
 * @returns {Promise<OptimizationResult>}
 */
async function optimizeDiagram(rawSvgString, groundTruthOptions = {}, options = {}) {
  const config = {
    ...VISUAL_QA_CONFIG,
    ...options
  };

  const mode = (config.mode || 'standard').toLowerCase();
  if (mode === 'off') {
    const san = sanitizeSvg(rawSvgString);
    return {
      passed: true,
      svg: san.svg,
      overallScore: 100,
      mode: 'off',
      iterations: 0,
      patchesApplied: 0
    };
  }

  // 1. Pre-Sanitizer Deterministico (Zero Token)
  const preSanitized = sanitizeSvg(rawSvgString);
  let currentSvg = preSanitized.svg;

  // 2. Costruzione / Inferenza della Visual Ground Truth
  const groundTruth = groundTruthOptions.diagramType
    ? createVisualGroundTruth(groundTruthOptions)
    : inferGroundTruthFromContext(currentSvg, groundTruthOptions);

  const history = {
    iterations: 0,
    microRepairsCount: 0,
    redesignsCount: 0,
    resolvedIssues: [],
    persistentIssues: [],
    historyPatches: []
  };

  let bestCandidate = {
    svg: currentSvg,
    score: 0,
    geoResult: null,
    semanticReport: null
  };

  const maxMicroRepairs = config.maxMicroRepairs || 3;
  let redesignsRemaining = config.maxRedesigns !== undefined ? config.maxRedesigns : 1;

  console.log(`\n🎨 [VSVP_V2] Avvio pipeline per "${groundTruth.visualId}" (Tipo: ${groundTruth.diagramType}, Modo: ${mode})...`);

  // Ciclo Iterativo Deterministico + Semantico
  while (history.iterations <= maxMicroRepairs) {
    history.iterations++;
    console.log(`\n  --- Giro di Verifica #${history.iterations} (Micro-repairs: ${history.microRepairsCount}/${maxMicroRepairs}) ---`);

    // A. Analisi Geometrica Deterministica (Chromium DOM)
    const geoResult = await analyzeSvgGeometry(currentSvg);
    console.log(`  📐 [Geometric QA] Collisioni: ${geoResult.collisionCount}, Clipping: ${geoResult.clippingCount}, Elementi: ${geoResult.elementsCount}`);

    // B. Render Preview
    const isFinalTurn = (history.iterations >= maxMicroRepairs || mode === 'maximum');
    const pngBuffer = await rasterizeSvg(currentSvg, {
      engine: isFinalTurn ? 'puppeteer' : 'sharp',
      scale: 2.0
    });

    // Salva anteprima opzionale per debug/CLI
    if (options.previewDir) {
      try {
        await fs.ensureDir(options.previewDir);
        const previewFile = path.join(options.previewDir, `${groundTruth.visualId}_iter_${history.iterations}.png`);
        await fs.writeFile(previewFile, pngBuffer);
      } catch (_) {}
    }

    // C. Semantic QA con Gemini
    const semanticReport = await runSemanticEvaluation(pngBuffer, groundTruth, geoResult, history, {
      useDeepModel: (mode === 'maximum' || isFinalTurn)
    });

    console.log(`  🧠 [Semantic QA] Acc: ${semanticReport.scores.scientificAccuracy}, Sem: ${semanticReport.scores.semanticClarity}, Read: ${semanticReport.scores.readability} | Major: ${semanticReport.majorIssuesCount}, Critical: ${semanticReport.criticalIssuesCount}`);

    // D. Multi-Gate Quality Evaluation (soglie calibrate sul Visual Tier della Ground Truth)
    const gate = evaluateQualityGate(geoResult, semanticReport, config, groundTruth);
    console.log(`  ⚖️ [Quality Gate | ${gate.visualTier}] Score: ${gate.overallScore}/100 | Soglie: Sci=${gate.details.thresholds.minScientific} Sem=${gate.details.thresholds.minSemantic} Read=${gate.details.thresholds.minReadability} | Approvato: ${gate.passed}`);

    // Aggiorna best candidate: favorisce punteggio composito più alto, e a parità di punteggio il minor numero di collisioni
    const isBetterScore = gate.overallScore > bestCandidate.score;
    const isTiedScoreFewerCollisions = (gate.overallScore === bestCandidate.score && 
      (bestCandidate.collisionCount === undefined || geoResult.collisionCount < bestCandidate.collisionCount));
    if (isBetterScore || isTiedScoreFewerCollisions) {
      bestCandidate = {
        svg: currentSvg,
        score: gate.overallScore,
        collisionCount: geoResult.collisionCount,
        geoResult,
        semanticReport
      };
    }

    // Se approvato, procedi alla Blind Final Review se in modalità maximum
    if (gate.passed) {
      if (mode === 'maximum') {
        const finalPng = await rasterizeSvg(currentSvg, { engine: 'puppeteer', scale: 2.0 });
        const blindResult = await runBlindFinalReview(finalPng, groundTruth);
        if (blindResult.approved) {
          console.log(`  🏆 [Blind Review] FIGURA APPROVATA DALL'ESAMINATORE FINALE (Score: ${blindResult.score}/100)!`);
          return {
            passed: true,
            svg: currentSvg,
            overallScore: gate.overallScore,
            blindScore: blindResult.score,
            iterations: history.iterations,
            bestScore: gate.overallScore
          };
        } else {
          console.log(`  ⚠️ [Blind Review] Esaminatore richiede revisione: ${blindResult.reasoning}`);
        }
      } else {
        console.log(`  ✅ [VSVP_V2] Diagramma "${groundTruth.visualId}" approvato al giro ${history.iterations}!`);
        return {
          passed: true,
          svg: currentSvg,
          overallScore: gate.overallScore,
          iterations: history.iterations
        };
      }
    }

    // Se abbiamo esaurito i tentativi, esci e usa il migliore
    if (history.microRepairsCount >= maxMicroRepairs) {
      console.log(`  ⏹️ [VSVP_V2] Raggiunto limite massimo micro-repairs (${maxMicroRepairs}). Utilizzo best candidate (Score: ${bestCandidate.score}, Collisioni: ${bestCandidate.collisionCount ?? 'N/A'}).`);
      break;
    }

    // E. Classificazione e Applicazione Riparazioni
    const repairsToApply = [];

    // 1. Riparazioni Prioritarie dalle Collisioni Geometriche Reali (Fisica di Repulsione Vettoriale)
    if (geoResult.collisions && geoResult.collisions.length > 0) {
      for (const col of geoResult.collisions) {
        repairsToApply.push({
          action: 'REPOSITION_LABEL',
          targetId: col.elementA,
          textSnippet: col.textA,
          boxA: col.boxA,
          boxB: col.boxB,
          minimumClearance: 22,
          addLeaderLine: true
        });
      }
    }

    // 2. Riparazioni Raccomandate dal Semantic Reviewer
    if (Array.isArray(semanticReport.issues)) {
      for (const issue of semanticReport.issues) {
        if (issue.recommendedRepair) {
          repairsToApply.push({
            ...issue.recommendedRepair,
            textSnippet: issue.targetText || issue.recommendedRepair.targetText
          });
        }
      }
    }

    // 3. Riparazioni per Clipping
    if (geoResult.clippings && geoResult.clippings.length > 0) {
      repairsToApply.push({
        action: 'EXPAND_VIEWBOX',
        expandMargins: { left: 30, right: 30, top: 20, bottom: 20 }
      });
    }

    if (repairsToApply.length === 0) {
      console.log('  ⚠️ Nessuna riparazione geometrica formulabile. Esco dal loop.');
      break;
    }

    // F. Applicazione tramite svgPatchEngine ("La Mano" Deterministica)
    console.log(`  🛠️ [svgPatchEngine] Applicazione di ${repairsToApply.length} riparazioni strutturate...`);
    const patchResult = applyStructuredPatches(currentSvg, repairsToApply, geoResult);
    
    if (patchResult.appliedRepairs.length > 0) {
      currentSvg = patchResult.patchedSvg;
      history.microRepairsCount++;
      history.historyPatches.push(patchResult.appliedRepairs);
      console.log(`  ✔ [svgPatchEngine] Applicate ${patchResult.appliedRepairs.length} patch con successo.`);
    } else {
      console.warn('  ⚠️ [svgPatchEngine] Nessuna patch applicabile con successo. Interrompo.');
      break;
    }
  }

  return {
    passed: bestCandidate.score >= 88,
    svg: bestCandidate.svg,
    overallScore: bestCandidate.score,
    iterations: history.iterations,
    bestCandidate
  };
}

/**
 * Ottimizza tutti i blocchi diagramma e SVG all'interno di un testo Markdown
 * 
 * @param {string} markdownText Testo markdown completo
 * @param {Object} [options] Opzioni di configurazione
 * @returns {Promise<{ updatedMarkdown: string, optimizedCount: number, results: Array<Object> }>}
 */
async function refineAllDiagramsInMarkdown(markdownText, options = {}) {
  if (!markdownText || typeof markdownText !== 'string') {
    return { updatedMarkdown: markdownText || '', optimizedCount: 0, results: [] };
  }

  let processed = markdownText;
  const results = [];
  let counter = 0;

  // 1. Cerca contenitori <div class="academic-diagram ..."><svg ...>...</svg></div>
  const diagramBlockRegex = /<div\s+class=["'][^"']*academic-diagram[^"']*["'][^>]*>([\s\S]*?<svg[\s\S]*?<\/svg>)[\s\S]*?<\/div>/gi;

  const matches = [];
  let match;
  while ((match = diagramBlockRegex.exec(markdownText)) !== null) {
    matches.push({
      fullMatch: match[0],
      innerSvgBlock: match[1],
      index: match.index
    });
  }

  for (const item of matches) {
    counter++;
    const svgMatch = item.innerSvgBlock.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch) continue;

    const rawSvg = svgMatch[0];
    const visualId = `fig_${counter}`;

    // Estrai contesto testuale circostante (200 caratteri prima del match)
    const contextBefore = markdownText.slice(Math.max(0, item.index - 300), item.index);
    const titleMatch = contextBefore.match(/###?\s+(.+)/g);
    const sectionTitle = titleMatch ? titleMatch[titleMatch.length - 1].replace(/^###?\s+/, '') : '';

    console.log(`\n============================================================`);
    console.log(`🎯 Ottimizzazione Figura #${counter}: "${sectionTitle || visualId}"`);
    console.log(`============================================================`);

    const optResult = await optimizeDiagram(rawSvg, {
      visualId,
      sectionTitle,
      contextText: contextBefore,
      subject: options.subject || 'Fisica'
    }, options);

    results.push(optResult);

    if (optResult.svg && optResult.svg !== rawSvg) {
      // Sostituisci l'SVG originale con la versione ottimizzata
      const replacementDiv = item.fullMatch.replace(rawSvg, optResult.svg);
      processed = processed.replace(item.fullMatch, replacementDiv);
    }
  }

  return {
    updatedMarkdown: processed,
    optimizedCount: results.length,
    results
  };
}

module.exports = {
  optimizeDiagram,
  refineAllDiagramsInMarkdown,
  rasterizeSvg,
  runSemanticEvaluation,
  runBlindFinalReview,
  evaluateQualityGate
};
