const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const { CONFIG } = require('../config');
const { getDeepSeekClient, callDeepSeekWithRetry, sanitizeForDeepSeek } = require('./aiService');
const { getPromptForSubject } = require('./promptService');
const { filterExtractedContentByTopics, extractTopicLedger } = require('./scopeService');
const { repairMarkdownMath } = require('./pdfExportService');
const { processDiagramsInMarkdown } = require('../rendering/diagramEngine');

const { AcademicContract } = require('../core/contract');
const {
  createGraph,
  upsertNode,
  saveGraph,
  loadSubjectKnowledgeBase,
  saveSubjectKnowledgeBase,
  mergeIntoSubjectKnowledgeBase,
  findCanonicalExplanation
} = require('../core/knowledgeGraph');
const { validateGraph } = require('../core/graphValidator');
const { QualityEngine } = require('../core/qualityEngine');
const {
  buildBlueprintFromGraphAndPlan,
  buildChapterPromptContext
} = require('../planning/blueprint');
const { evaluateCoverage, saveCoverageMatrix } = require('../core/coverageMatrix');
const {
  initJobState,
  transitionPhase,
  saveJobState
} = require('../core/jobState');
const { assignShardMission, calculateDynamicShards } = require('../generation/shardRoles');
const { SeamWelding2 } = require('../generation/seamWelding2');
const { RepairLoop } = require('../generation/repairLoop');
const {
  cleanConversationalPreamble,
  repairMathInCodeSpans,
  collapseDuplicateCanonicalSections
} = require('../core/textSanitizer');
const { VisualQualityAuditor } = require('../verification/visualQualityGates');
const { resetDefaultLedger } = require('../core/visualLedger');
const { visualObserver } = require('../core/visualObserver');

const qualityEngineInstance = new QualityEngine();
const visualAuditorInstance = new VisualQualityAuditor();

/**
 * Fase 1: Mappatura Globale Preventiva (Global Master Plan)
 */
async function generateGlobalMasterPlan(deepseekClient, shards, subject, studyMode, customInstructions, targetTopics = '') {
  try {
    console.log(`\n🗺️ [Fase 1]: Mappatura Globale Preventiva per ${shards.length} corsie parallele...`);

    let shardsOverview = '';
    if (shards.length <= 8) {
      shardsOverview = shards.map((s, idx) => {
        const sample = s.modules.map(m => m.slice(0, 450)).join('\n---\n');
        return `### CORSO / SHARD ${idx + 1} (Moduli ${s.startIndex + 1} - ${s.startIndex + s.modules.length}):\n${sample.slice(0, 1600)}`;
      }).join('\n\n====================\n\n');
    } else {
      const maxCharsPerShard = Math.max(120, Math.floor(14000 / shards.length));
      shardsOverview = shards.map((s, idx) => {
        const firstModule = s.modules[0] || '';
        const titleMatch = firstModule.match(/#+\s+([^\n]+)/);
        const heading = titleMatch ? titleMatch[1] : `Modulo ${s.startIndex + 1}`;
        const snippet = firstModule.replace(/#+\s+[^\n]+/g, '').replace(/\s+/g, ' ').trim().slice(0, maxCharsPerShard);
        return `### SHARD ${idx + 1} / ${shards.length}: "${heading}"\nContenuto chiave: ${snippet}...`;
      }).join('\n\n');
    }

    const prompt = `Sei l'architetto didattico universitario principale (Curriculum Compiler) per la materia: ${subject}.
Stiamo generando una dispensa magistrale universitaria strutturata secondo l'Academic Knowledge Model in ${shards.length} corsie parallele di scrittura.
${customInstructions ? `Istruzioni aggiuntive dello studente: ${customInstructions}\n` : ''}
${targetTopics ? `🎯 AMBITO DI TRATTAZIONE RIGOROSAMENTE LIMITATO AGLI ARGOMENTI RICHIESTI DALLO STUDENTE: ${targetTopics}. Pianifica la struttura coprendo ESCLUSIVAMENTE questi temi ed escludendo capitoli estranei.\n` : ''}
${studyMode === 'summary' ? `🎯 MODALITÀ ATTIVA: SINTESI ACCADEMICA AD ALTA DENSITÀ (RIASSUNTO D'ESAME). Pianifica un documento sintetico, organico e compatto ad altissima densità concettuale. Nessuna prolissità enciclopedica.\n` : ''}
Modalità didattica: ${studyMode || 'completa'}.

Ecco una panoramica del materiale didattico estratto per Shard:
${shardsOverview}

COMPITO DI COORDINAMENTO DIDATTICO:
Genera il Master Plan Accademico stabilendo per ciascuno Shard (da 1 a ${shards.length}):
1. **Titoli dei Capitoli e Mappa Concettuale Vettoriale**: Prerequisiti necessari, concetti cardine e progressione logica. Pianifica per ciascun capitolo lo schema concettuale, impiantistico o circuito che dovrà essere reso come specifica semantica (\`\`\`json:visual-spec\`\`\`), con divieto totale di caratteri ASCII tree (├──, └──) e divieto totale di generare SVG grezzo (\`\`\`svg\`\`\`).
2. **Formula Lineage**: Formule e teoremi chiave da dimostrare integralmente senza scorciatoie.
3. **Eserciziario d'Esame**: Elenco mirato degli esercizi chiave d'esame presenti da risolvere con schema mentale e controlli di coerenza.
4. **Trappole d'Esame**: Fraintendimenti tipici da evidenziare.
5. **Coordinamento e Continuità**: Istituisci la notazione globale comune (simboli, coordinate) e garantisci che gli Shard successivi non ripetano nozioni già introdotte, ma vi facciano riferimento naturale.
REGOLE TASSATIVE:
- Notazione dei simboli: Ogni simbolo, variabile o formula DEVE essere scritta in LaTeX con $ ... $ o $$ ... $$. NON usare MAI backtick o code span (\`C_X\`, \`[X]\`) per la notazione matematica/chimica, ma sempre LaTeX ($C_X$, $[X]$, $pH = -\\log[H^+]$).
- Divieto di preamboli: Inizia direttamente con il primo titolo Markdown (# ...), senza convenevoli né frasi introduttive conversazionali (es. vietato iniziare con "Certamente", "Ecco il piano").

Fornisci il Master Plan in formato Markdown strutturato, autorevole e chiaro.`;

    const response = await callDeepSeekWithRetry(deepseekClient, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Sei un coordinatore accademico di ateneo esperto nella pianificazione di manuali e dispense universitarie.' },
        { role: 'user', content: sanitizeForDeepSeek(prompt) }
      ],
      max_tokens: 2500,
      temperature: 0.2
    });

    const plan = response.choices[0]?.message?.content || '';
    console.log(`  ✅ Master Plan completato (${plan.length} caratteri)`);
    return plan;
  } catch (err) {
    console.warn(`  ⚠️ Mappatura globale saltata o parziale (${err.message}). Proseguo con partizione autonoma.`);
    return null;
  }
}

/**
 * Pipeline Principale di Generazione Parallela Multi-Shard con Streaming SSE
 */
async function orchestrateGeneration({
  extractedContent,
  subject,
  sessionTitle,
  customInstructions,
  studyMode,
  targetTopics,
  sendSSE,
  isClientAborted = () => false,
  visualContracts = []
}) {
  const deepseek = getDeepSeekClient();
  const sessionId = uuidv4();
  const isSummaryMode = studyMode === 'summary';
  const subjectName = subject || 'Generale';

  const sessionContract = new AcademicContract({
    moduleId: sessionId,
    subject: subjectName,
    topic: sessionTitle || subjectName || 'Dispensa Accademica',
    studyMode: studyMode || (isSummaryMode ? 'summary' : 'complete')
  });

  const jobState = initJobState(sessionId, subjectName);

  // Fase 0: Caricamento Knowledge Base Persistente
  const subjectKnowledgeGraph = loadSubjectKnowledgeBase(subjectName, CONFIG.PATHS.SESSIONS_DIR);
  const knowledgeGraph = createGraph(sessionId, subjectName);

  const systemPrompt = getPromptForSubject(subject || 'generic', studyMode || 'complete', customInstructions || '');

  let studyModeDirective = '';
  if (isSummaryMode) {
    studyModeDirective = `\n🎯 MODALITÀ DI STUDIO RICHIESTA: SINTESI ACCADEMICA AD ALTA DENSITÀ (RIASSUNTO D'ESAME PER MANUALI E LIBRI).
Sintetizza e riassumi i contenuti con la massima densità concettuale per riga. Elimina aneddoti storici, preamboli, convenevoli discorsivi e ripetizioni del libro. NON riscrivere il libro.
Mantieni il massimo rigore didattico: definizioni formali esatte, formule con spiegazione di tutti i simboli e condizioni di validità ($...$, $$...$$ o box per formule contabili), spina dorsale logica delle derivazioni e trappole d'esame. Limita gli esercizi a 1 solo problema/applicazione tipica d'esame risolto con schema mentale essenziale e controlli di coerenza.`;
  } else if (studyMode === 'theory') {
    studyModeDirective = `\n🎯 MODALITÀ DI STUDIO RICHIESTA: FOCUS TEORIA & DIMOSTRAZIONI DIDATTICHE APPROFONDITE.
Dedica la massima ampiezza alla spiegazione discorsiva e parlata dei concetti ("teoria parlata"), interpretazione critica dei modelli, derivazioni matematiche punto per punto e spiegazione intuitiva di ogni simbolo. Tratta ogni argomento senza sintetizzare né tagliare passaggi concettuali.`;
  } else if (studyMode === 'exercises') {
    studyModeDirective = `\n🎯 MODALITÀ DI STUDIO RICHIESTA: FOCUS ESERCIZIARIO D'ESAME GUIDATO & RISOLTO.
Massima enfasi su problemi tipici d'esame risolti integralmente. Per ogni esercizio includi schema di ragionamento mentale, impostazione analitica, passaggi algebrici/stechiometrici espliciti, tabelle ICE, verifica delle approssimazioni e spiegazione dei trabocchetti d'esame.`;
  } else {
    studyModeDirective = `\n🎯 MODALITÀ DI STUDIO RICHIESTA: COMPLETA (TEORIA PARLATA APPROFONDITA + ESERCIZI D'ESAME).
Sviluppa una dispensa magistrale integrale: spiegazione capillare e parlata della teoria + derivazioni matematiche complete + reazioni bilanciate + esercizi d'esame risolti con metodo guidato e trabocchetti tipici. Non omettere né condensare alcun aspetto.`;
  }

  // Filtro scope argomenti target
  let cleanExtractedContent = sanitizeForDeepSeek(extractedContent);
  const effectiveTargetTopics = targetTopics || '';

  if (effectiveTargetTopics) {
    const filterResult = filterExtractedContentByTopics(cleanExtractedContent, effectiveTargetTopics);
    if (filterResult.isFiltered) {
      cleanExtractedContent = filterResult.filteredContent;
      console.log(`🎯 [Scope Filter Attivo]: Contenuto filtrato su ${filterResult.matchedCount}/${filterResult.totalSections} blocchi (${cleanExtractedContent.length} car.) per: "${effectiveTargetTopics}"`);
      sendSSE({
        type: 'scope_filtered',
        message: `🎯 Filtro argomenti attivo: isolati ${filterResult.matchedCount} blocchi pertinenti su ${filterResult.totalSections} per gli argomenti richiesti.`,
        matchedCount: filterResult.matchedCount,
        totalSections: filterResult.totalSections,
        targetTopics: effectiveTargetTopics
      });
    }
  }

  transitionPhase(jobState, 'EXTRACT', { charCount: cleanExtractedContent.length });

  // Estrazione iniziale concetti nel Knowledge Graph
  const initialTopics = extractTopicLedger(cleanExtractedContent);
  for (let i = 0; i < Math.min(initialTopics.length, 30); i++) {
    const topic = initialTopics[i];
    const existingCanon = findCanonicalExplanation(subjectKnowledgeGraph, topic);
    const isAlreadyCanon = existingCanon.found;
    const canonId = isAlreadyCanon
      ? existingCanon.canonicalExplanationId
      : `canonical-${subjectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`;

    upsertNode(knowledgeGraph, {
      id: `concept-${sessionId.slice(0, 6)}-${i + 1}`,
      type: 'CONCEPT',
      label: topic,
      chapterId: `cap${Math.floor(i / 5) + 1}`,
      canonicalExplanationId: canonId,
      isCanonical: !isAlreadyCanon,
      canonicalRef: isAlreadyCanon ? existingCanon.canonicalRef : `Capitolo ${Math.floor(i / 5) + 1}`,
      attrs: {
        importance: i < 5 ? 5 : 3,
        examRelevance: 4,
        isReview: isAlreadyCanon,
        isFormallyDerived: !isAlreadyCanon,
        canonicalRef: isAlreadyCanon ? existingCanon.canonicalRef : `Capitolo ${Math.floor(i / 5) + 1}`,
        canonicalExplanationId: canonId
      }
    });
  }
  transitionPhase(jobState, 'MAP_GRAPH', { nodesCount: knowledgeGraph.nodes.length });
  const graphValidation = validateGraph(knowledgeGraph);
  if (!graphValidation.valid) {
    console.warn('  ⚠️ Avvisi validatore Knowledge Graph:', graphValidation.errors.length);
  }

  // Suddivisione modulare ottimizzata
  const CHUNK_THRESHOLD = isSummaryMode ? 70000 : 50000;
  let contentModules = [];

  if (cleanExtractedContent.length > CHUNK_THRESHOLD) {
    console.log(`📚 Attivazione Generazione Modulare Adattiva (${cleanExtractedContent.length} caratteri totali)`);
    const MODULE_TARGET = isSummaryMode ? 90000 : 38000;
    let cursor = 0;
    while (cursor < cleanExtractedContent.length) {
      if (cursor + MODULE_TARGET * 1.3 >= cleanExtractedContent.length) {
        contentModules.push(sanitizeForDeepSeek(cleanExtractedContent.slice(cursor).trim()));
        break;
      }
      let breakIdx = cleanExtractedContent.lastIndexOf('\n\n# ', cursor + MODULE_TARGET);
      if (breakIdx <= cursor) {
        breakIdx = cleanExtractedContent.lastIndexOf('\n\n---', cursor + MODULE_TARGET);
      }
      if (breakIdx <= cursor) {
        breakIdx = cleanExtractedContent.lastIndexOf('\n\n', cursor + MODULE_TARGET);
      }
      if (breakIdx <= cursor) {
        breakIdx = cursor + MODULE_TARGET;
      }
      contentModules.push(sanitizeForDeepSeek(cleanExtractedContent.slice(cursor, breakIdx).trim()));
      cursor = breakIdx;
    }
  } else {
    contentModules = [cleanExtractedContent];
  }

  const totalModules = contentModules.length;
  console.log(`🧩 Moduli totali preparati: ${totalModules}`);

  const maxWorkers = CONFIG.GENERATION.MAX_CONCURRENT_WORKERS;
  const { numShards, modulesPerShard } = calculateDynamicShards(totalModules, maxWorkers);

  const shards = [];
  for (let s = 0; s < numShards; s++) {
    const startIdx = s * modulesPerShard;
    const endIdx = Math.min(startIdx + modulesPerShard, totalModules);
    if (startIdx < totalModules) {
      shards.push({
        shardId: s + 1,
        startIndex: startIdx,
        modules: contentModules.slice(startIdx, endIdx)
      });
    }
  }

  console.log(`🚀 Turbo Concurrency: ${shards.length} Shard paralleli attivi per ${totalModules} moduli`);

  // Fase 1: Master Plan
  let masterPlan = null;
  if (shards.length > 1) {
    sendSSE({
      type: 'stage',
      stage: 'mapping',
      message: `Fase 1/3: Mappatura globale preventiva e coordinamento tra ${shards.length} corsie parallele...`,
      numShards: shards.length,
      totalModules
    });

    masterPlan = await generateGlobalMasterPlan(deepseek, shards, subject || 'Chimica', studyMode, customInstructions, effectiveTargetTopics);

    sendSSE({
      type: 'map_done',
      masterPlan: masterPlan ? masterPlan.slice(0, 800) + '...' : 'Pianificazione completata',
      numShards: shards.length,
      totalModules
    });
  }

  // Blueprint con Visual Coverage Matrix integrata
  const blueprint = buildBlueprintFromGraphAndPlan(sessionId, subject || 'Chimica', knowledgeGraph, masterPlan || '', {
    visualContracts
  });
  transitionPhase(jobState, 'PLAN_BLUEPRINT', { chaptersCount: blueprint.chapters.length });

  sendSSE({
    type: 'graph_ready',
    nodesCount: knowledgeGraph.nodes.length,
    blueprintChapters: blueprint.chapters.length
  });

  transitionPhase(jobState, 'GENERATE_CHAPTERS', { shardsCount: shards.length });

  // Fase 2: Generazione Parallela
  sendSSE({
    type: 'stage',
    stage: 'generating',
    message: `Fase 2/3: Generazione didattica ad alta velocità attiva (${shards.length} worker paralleli)...`,
    numShards: shards.length,
    totalModules
  });

  const executeShardWorker = async (shard) => {
    let shardFullText = '';
    let localTail = '';

    for (let mIdx = 0; mIdx < shard.modules.length; mIdx++) {
      if (isClientAborted()) break;

      const moduleContent = shard.modules[mIdx];
      const absModuleIdx = shard.startIndex + mIdx + 1;

      console.log(`  ⚡ [Shard ${shard.shardId}/${shards.length}] Avvio Modulo ${absModuleIdx}/${totalModules}...`);

      sendSSE({
        type: 'shard_progress',
        shardId: shard.shardId,
        totalShards: shards.length,
        moduleIdx: absModuleIdx,
        moduleInShard: mIdx + 1,
        totalInShard: shard.modules.length,
        percent: Math.round((mIdx / shard.modules.length) * 100)
      });

      let coordinationDirective = '';
      if (masterPlan) {
        coordinationDirective = `\n## 🗺️ MASTER PLAN DIDATTICO DI COORDINAMENTO:\n${masterPlan}\n\n---\n`;
      }

      let shardBlueprint = blueprint.chapters[shard.shardId - 1];
      if (!shardBlueprint) {
        const firstModText = shard.modules[0] || '';
        const modTitleMatch = firstModText.match(/^#+\s+([^\n]+)/m);
        const modTitle = modTitleMatch ? modTitleMatch[1].trim() : `Sezione Didattica ${shard.shardId}`;
        shardBlueprint = {
          chapterId: `cap${shard.shardId}`,
          title: modTitle,
          objectives: [`Trattazione analitica e rigorosa degli argomenti del modulo: ${modTitle}`],
          prerequisites: ['Fondamenti teorici delle sezioni precedenti'],
          requiredSections: ['formal-definition', 'derivation', 'applications', 'exam']
        };
      }
      const blueprintContext = buildChapterPromptContext(shardBlueprint);
      if (blueprintContext) {
        coordinationDirective += blueprintContext + '\n\n---\n';
      }

      const shardCanonicalReviews = [];
      for (const node of knowledgeGraph.nodes) {
        if (node.attrs?.isReview && node.canonicalExplanationId) {
          shardCanonicalReviews.push({
            label: node.label,
            ref: node.attrs?.canonicalRef || node.canonicalRef || 'Parte I — Fondamenti'
          });
        }
      }

      let canonicalReviewDirective = '';
      if (shardCanonicalReviews.length > 0) {
        canonicalReviewDirective = `\n## 📚 CONOSCENZA TEORICA PREGRESSA DELLO STUDENTE (CANONICAL REUSE - DIVIETO DI RISCRITTURA DA ZERO):
I seguenti argomenti teorici fondamentali sono già stati formalizzati in precedenza nel corso:
${shardCanonicalReviews.slice(0, 6).map(t => `- **${t.label}** (già formalizzato in: ${t.ref})`).join('\n')}

REGOLA TASSATIVA DI CANONICAL REUSE:
NON rispiegare da zero questi argomenti teorici e non riscrivere le loro derivazioni complete.
Inserisci un richiamo didattico formale (es. "> 📌 **Richiamo:** per la teoria fondamentale vedi ${shardCanonicalReviews[0].ref}") e procedi direttamente all'applicazione o all'esercizio specifico del tuo modulo.\n---\n`;
      }

      let localLedgerContext = '';
      if (shardFullText) {
        const coveredTopics = extractTopicLedger(shardFullText);
        if (coveredTopics.length > 0) {
          localLedgerContext = `\n## 📋 ARGOMENTI GIÀ SVILUPPATI IN QUESTA CORSIA:\n${coveredTopics.slice(-15).map(t => `- ${t}`).join('\n')}\n\n---\n`;
        }
      }

      if (Array.isArray(visualContracts) && visualContracts.length > 0) {
        visualContractsContext = `\n## 🎨 EVIDENZE E SCHEMI VISUALI ESTRATTI DALLA FONTE ORIGINALE:
Le seguenti evidenze visive sono state rilevate nel materiale originale e analizzate dal modello di visione artificiale:
${visualContracts.slice(0, 10).map((vc, idx) => {
  const cap = vc.caption?.text || vc.title || `Schema ${idx + 1}`;
  const desc = vc.qualitativeObservations?.[0] || vc.description || vc.didacticDirective || vc.motivation || 'Schema tecnico di processo/concettuale';
  return `- **[${vc.visualId || vc.figureId || `Figura_${idx + 1}`}] ${cap}**: ${desc} (Decisione: ${vc.decision || 'Sconosciuta'})`;
}).join('\n')}

DIRETTIVA VISUALE PER LO SHARD:
Se il tuo modulo tratta o sviluppa i concetti di una delle figure sopra indicate, DEVI includere la definizione semantica ricostruita tramite blocco \`\`\`json:visual-spec\`\`\`, spiegandone dettagliatamente tutti i flussi, i componenti e il significato scientifico prima e dopo. E' ASSOLUTAMENTE VIETATO produrre codice SVG grezzo.\n---\n`;
      }

      const shardRoleMission = assignShardMission(shard.shardId - 1, shards.length, subject || 'generic', studyMode || 'complete');

      const svgDirective = `\nOBBLIGO RENDERING GRAFICA E SCHEMI (VISUAL_SPEC):
Qualsiasi mappa concettuale, schema a blocchi, diagramma di flusso, flowsheet d'impianto, circuito o grafico DEVE essere generato ESCLUSIVAMENTE come specifica semantica \`\`\`json:visual-spec\`\`\`.
È ASSOLUTAMENTE VIETATO produrre codice SVG grezzo (\`\`\`svg\`). DeepSeek deve produrre la spiegazione e la VisualSpec semantica, non deve mai calcolare coordinate, né inventare topologie. Il rendering effettivo sarà gestito dal Visual Compiler.
BANDO TOTALE AGLI ALBERI ASCII: È severamente vietato qualsiasi albero di testo o carattere ASCII tree (come ├── o └──), la cui presenza attiva il blocco di compilazione del PDF.`;

      const finalGenerationDirective = isSummaryMode
        ? `Genera ora la SINTESI ACCADEMICA AD ALTA DENSITÀ per questa sezione conforme all'Academic Contract.
Direttive di sintesi e rigore:
1. Massima densità concettuale per riga: definizioni formali esatte, formule con spiegazione di tutti i simboli e condizioni di validità ($...$, $$...$$ o box per formule contabili).
2. Spina dorsale logica delle derivazioni e dimostrazioni: ometti passaggi algebrici intermedi ovvi o ripetitivi.
3. Zero convenevoli, zero aneddoti storici e zero testo narrativo superfluo del libro. NON riscrivere l'intero libro.
4. Un solo esercizio d'esame rappresentativo svolto con schema mentale essenziale e controlli di coerenza.
5. Box semantici mirati su concetti chiave e trappole d'esame.
6. DIVIETO ASSOLUTO DI PREAMBOLI: Inizia direttamente con il primo titolo Markdown (# ...), senza alcuna frase introduttiva, saluto o conferma (es. VIETATO "Certamente", "Ecco la sintesi").
7. NOTAZIONE RIGOROSAMENTE IN LATEX: Ogni simbolo, variabile o formula DEVE essere in LaTeX ($...$). NON usare mai backtick (\`...\`) per simboli o notazione (es. usa $C_X$, $[X]$, $pH = -\\log[H^+]$, mai \`C_X\`, \`[X]\`).
${effectiveTargetTopics ? `8. AMBITO ESCLUSIVO: Tratta solo ed esattamente gli argomenti indicati dallo studente (${effectiveTargetTopics}). Ignora qualsiasi altro argomento periferico del libro.` : ''}
9. ${svgDirective}`
        : `Genera ora la DISPENSA UNIVERSITARIA INTEGRALE ed ESAUSTIVA per questa sezione didattica conforme all'Academic Contract.
Direttive di rigore: non sintetizzare né saltare passaggi matematici. Sviluppa spiegazioni chiare a teoria parlata, anatomia delle formule con unità SI, schema mentale prima di ciascun esercizio e controlli di coerenza finali.
DIVIETO ASSOLUTO DI PREAMBOLI: Inizia direttamente con il primo titolo Markdown (# ...), senza alcuna frase introduttiva o saluto.
NOTAZIONE RIGOROSAMENTE IN LATEX: Formule e simboli rigorosamente in LaTeX ($...$ e $$...$$), MAI in backtick (\`...\`). Esempio corretto: $C_X$, $[X]$; esempio sbagliato: \`C_X\`, \`[X]\`.
${svgDirective}`;

      const moduleUserMessage = `
${customInstructions ? `## Istruzioni aggiuntive per questa sessione:\n${customInstructions}\n\n---\n` : ''}
${effectiveTargetTopics ? `## 🎯 Argomenti d'esame richiesti dallo studente (Scope esclusivo):\n${effectiveTargetTopics}\n\n---\n` : ''}
${studyModeDirective}

${sessionContract.toPromptDirective()}

## 🎯 RUOLO DIDATTICO ASSEGNATO ALLA CORSIA ${shard.shardId}:
${shardRoleMission}

${coordinationDirective}
${canonicalReviewDirective}
${localLedgerContext}
${visualContractsContext}
${localTail ? `## Raccordo con la pagina precedente di questo capitolo:\n[...]\n${localTail}\n\n---\n` : ''}

## Materiale didattico estratto (Modulo ${absModuleIdx} di ${totalModules} - Assegnato alla Corsia ${shard.shardId}):

${moduleContent}

---

${finalGenerationDirective}
`;

      const conversationMessages = [
        { role: 'system', content: sanitizeForDeepSeek(systemPrompt) },
        { role: 'user', content: sanitizeForDeepSeek(moduleUserMessage) }
      ];

      let moduleText = '';
      const maxTokensPerCall = 8192;
      try {
        const stream = await callDeepSeekWithRetry(deepseek, {
          model: 'deepseek-chat',
          messages: conversationMessages,
          stream: true,
          max_tokens: maxTokensPerCall,
          temperature: isSummaryMode ? 0.2 : 0.3
        });

        let finishReason = null;
        for await (const chunk of stream) {
          if (isClientAborted && isClientAborted()) {
            console.warn(`  ⚠️ [Shard ${shard.shardId}] Interruzione stream per disconnessione client.`);
            break;
          }
          const delta = chunk.choices[0]?.delta?.content || '';
          if (chunk.choices[0]?.finish_reason) {
            finishReason = chunk.choices[0].finish_reason;
          }
          if (delta) {
            moduleText += delta;
            sendSSE({
              type: 'shard_delta',
              shardId: shard.shardId,
              totalShards: shards.length,
              content: delta
            });
          }
        }

        // AUTO-CONTINUAZIONE DINAMICA (Se troncato a metà SVG o token esauriti)
        let continuationCount = 0;
        const MAX_AUTO_CONTINUATIONS = 2;
        while (continuationCount < MAX_AUTO_CONTINUATIONS) {
          if (isClientAborted && isClientAborted()) break;

          const fenceCount = (moduleText.match(/```/g) || []).length;
          const hasUnclosedSvg = /```(?:svg|xml:svg)[^`]*$/i.test(moduleText) ||
            (moduleText.lastIndexOf('<svg') > moduleText.lastIndexOf('</svg>'));
          const isLengthTruncated = finishReason === 'length';
          const isTruncated = isLengthTruncated || (fenceCount % 2 !== 0) || hasUnclosedSvg;

          if (!isTruncated) break;

          continuationCount++;
          console.log(`  🔄 [Shard ${shard.shardId}] Troncamento rilevato (finishReason=${finishReason}, unclosedSvg=${hasUnclosedSvg}, fenceDispari=${fenceCount % 2 !== 0}). Auto-ripresa #${continuationCount}...`);

          const continuationPrompt = hasUnclosedSvg
            ? 'Ti sei interrotto esattamente a metà del diagramma SVG. Continua ESATTAMENTE dal punto in cui ti sei fermato per completare il codice SVG, chiudendo </svg> e i delimitatori ```. Non ripetere nulla di ciò che hai già scritto.'
            : 'Ti sei interrotto a metà della trattazione. Continua ESATTAMENTE dal punto in cui ti sei fermato per completare la sezione e i blocchi aperti senza ripetere nulla di ciò che hai già scritto.';

          const continuationMessages = [
            ...conversationMessages,
            { role: 'assistant', content: moduleText },
            { role: 'user', content: continuationPrompt }
          ];

          finishReason = null;
          try {
            const contStream = await callDeepSeekWithRetry(deepseek, {
              model: 'deepseek-chat',
              messages: continuationMessages,
              stream: true,
              max_tokens: maxTokensPerCall,
              temperature: isSummaryMode ? 0.2 : 0.3
            });

            for await (const chunk of contStream) {
              if (isClientAborted && isClientAborted()) break;
              const delta = chunk.choices[0]?.delta?.content || '';
              if (chunk.choices[0]?.finish_reason) {
                finishReason = chunk.choices[0].finish_reason;
              }
              if (delta) {
                moduleText += delta;
                sendSSE({
                  type: 'shard_delta',
                  shardId: shard.shardId,
                  totalShards: shards.length,
                  content: delta
                });
              }
            }
          } catch (contErr) {
            console.warn(`  ⚠️ [Shard ${shard.shardId}] Errore durante auto-ripresa #${continuationCount}:`, contErr.message);
            break;
          }
        }

        moduleText = cleanConversationalPreamble(moduleText);
        moduleText = repairMathInCodeSpans(moduleText, subject || 'Chimica');

        localTail = sanitizeForDeepSeek(moduleText.slice(-1500));
        shardFullText += (shardFullText ? '\n\n---\n\n' : '') + moduleText;

        sendSSE({
          type: 'shard_progress',
          shardId: shard.shardId,
          totalShards: shards.length,
          moduleIdx: absModuleIdx,
          moduleInShard: mIdx + 1,
          totalInShard: shard.modules.length,
          percent: Math.round(((mIdx + 1) / shard.modules.length) * 100)
        });

        console.log(`  ✅ [Shard ${shard.shardId}/${shards.length}] Modulo ${absModuleIdx} completato (${moduleText.length} car.)`);

      } catch (err) {
        console.error(`  ❌ [Shard ${shard.shardId}] Errore modulo ${absModuleIdx}:`, err.message);
        shardFullText += `\n\n> ⚠️ *[Modulo ${absModuleIdx}: completamento parziale o anomalia temporanea (${err.message})]*\n\n`;
      }
    }

    shardFullText = cleanConversationalPreamble(shardFullText);
    shardFullText = repairMathInCodeSpans(shardFullText, subject || 'Chimica');
    return shardFullText;
  };

  const shardResults = await Promise.all(shards.map(shard => executeShardWorker(shard)));
  console.log(`\n🎉 Tutti i ${shards.length} Shard hanno completato la generazione in streaming!`);

  // Fase 3: Seam Welding
  let fullContent = '';
  if (shards.length > 1) {
    sendSSE({
      type: 'stage',
      stage: 'welding',
      message: 'Fase 3/4: Saldatura intelligente Seam Welding 2.0 (continuità notazionale & logica)...',
      numShards: shards.length
    });

    const seamWelder = new SeamWelding2(deepseek, callDeepSeekWithRetry);
    const weldedShards = await seamWelder.weldShards(shardResults, subject || 'Chimica');
    fullContent = weldedShards.join('\n\n---\n\n');
  } else {
    fullContent = shardResults[0] || '';
  }

  // Sanitizzazione finale globale
  fullContent = cleanConversationalPreamble(fullContent);
  fullContent = repairMathInCodeSpans(fullContent, subject || 'Chimica');
  fullContent = collapseDuplicateCanonicalSections(fullContent, subject || 'Chimica');

  // Pre-compilazione deterministica di diagrammi e mappe concettuali in SVG vettoriale
  try {
    fullContent = processDiagramsInMarkdown(fullContent, knowledgeGraph);
  } catch (diagErr) {
    console.warn('  ⚠️ [Orchestrator] Errore pre-compilazione diagrammi visuali:', diagErr.message);
  }

  if (shards.length > 1) {
    sendSSE({
      type: 'welding_done',
      message: 'Saldatura Seam Welding 2.0 completata con successo.',
      fullContent: fullContent
    });
  }

  // Fase 4: Quality Engine Audit & Coverage
  sendSSE({
    type: 'stage',
    stage: 'quality_audit',
    message: 'Fase 4/4: Verifica di conformità accademica (Quality Gates 0-7, Visual QA a 4 auditor & Coverage Matrix)...',
    numShards: shards.length
  });

  transitionPhase(jobState, 'VERIFY');
  const qualityReport = qualityEngineInstance.evaluateQuality(fullContent, sessionContract, subject || 'Chimica', knowledgeGraph);
  const coverageReport = evaluateCoverage(blueprint, knowledgeGraph, fullContent);

  // Esecuzione dell'Audit Visuale Disaccoppiato (Deterministic, Semantic, Didactic Critic, Coverage Gate)
  const visualAuditReport = visualAuditorInstance.auditPublication({
    visualEvidences: visualContracts || [],
    markdownContent: fullContent,
    visualCoverageMatrix: blueprint.visualCoverageMatrix || [],
    knowledgeGraph
  });

  console.log(`📊 [Quality Engine] Valutazione completata. Punteggio globale: ${qualityReport.overallScore}/100, Gate superato: ${qualityReport.gatePassed}, Coverage: ${Math.round(coverageReport.overallCoverage * 100)}%, Visual Score: ${visualAuditReport.visualScore}/100 (Passed: ${visualAuditReport.passed})`);

  if (!visualAuditReport.passed && visualAuditReport.hardFails.length > 0) {
    console.warn(`  ⚠️ [Visual QA] Rilevati ${visualAuditReport.hardFails.length} Hard Fail visuali:`, visualAuditReport.hardFails.map(f => f.code).join(', '));
    qualityReport.hardFails = (qualityReport.hardFails || []).concat(visualAuditReport.hardFails);
    qualityReport.gatePassed = false;
  }

  // ─ Visual Coverage Report (VisualLedger) ─────────────────────────────────
  // Specifica: 1.md §5, markdown.md §20. Stampa il report di copertura visuale
  // e verifica che nessun visual accepted sia andato perso silenziosamente.
  const jobLedger = resetDefaultLedger();
  // Nota: il ledger di questo job è quello usato da visualSpecCompiler se istanziato
  // durante questo ciclo. Il reset è per il prossimo job.
  try {
    // Il ledger globale potrebbe avere record del job appena completato
    const { getDefaultLedger } = require('../core/visualLedger');
    const activeLedger = getDefaultLedger();
    if (activeLedger.getAll().length > 0) {
      const coverageReportText = activeLedger.generateCoverageReport();
      visualObserver.coverageReport(coverageReportText);
      try { activeLedger.assertNoSilentLoss(); }
      catch (lossErr) { console.warn('  ⚠️ [VisualLedger]', lossErr.message); }
    }
  } catch (ledgerErr) {
    console.warn('  ⚠️ [VisualLedger] Coverage report non disponibile:', ledgerErr.message);
  }

  if (!qualityReport.gatePassed && qualityReport.failedGates.length > 0) {
    transitionPhase(jobState, 'REPAIR');
    const repairer = new RepairLoop(deepseek, callDeepSeekWithRetry);
    fullContent = await repairer.attemptRepair(fullContent, qualityReport.failedGates[0].reason, subject || 'Chimica');
  }

  sendSSE({
    type: 'quality_report',
    report: qualityReport,
    coverage: coverageReport,
    visualCoverage: visualAuditReport.coverageReport,
    visualScore: visualAuditReport.visualScore
  });

  // Fase 5: Salvataggio Sessione
  transitionPhase(jobState, 'COMPILE_MASTER', { fullLength: fullContent.length });
  transitionPhase(jobState, 'RENDER_PDF');

  const subjectDir = path.join(CONFIG.PATHS.SESSIONS_DIR, subject || 'Generale');
  fs.ensureDirSync(subjectDir);

  const sessionData = {
    id: sessionId,
    title: sessionTitle || `${subject || 'Sessione'} - ${new Date().toLocaleDateString('it-IT')}`,
    subject: subject || 'Generale',
    studyMode: studyMode || 'complete',
    createdAt: new Date().toISOString(),
    content: fullContent,
    extractedContent: extractedContent.substring(0, 500) + '...',
    shardsCount: shards.length,
    qualityScore: qualityReport.overallScore,
    qualityAudit: qualityReport.auditLog,
    coverageRatio: coverageReport.overallCoverage,
    visualScore: visualAuditReport.visualScore,
    visualCoverage: visualAuditReport.coverageReport,
    visualDeficiencies: visualAuditReport.deficiencies,
    hardFails: qualityReport.hardFails || []
  };

  const mdPath = path.join(subjectDir, `${sessionId}.md`);
  const metaPath = path.join(subjectDir, `${sessionId}.json`);
  const graphPath = path.join(subjectDir, `${sessionId}_knowledgeGraph.json`);
  const blueprintPath = path.join(subjectDir, `${sessionId}_blueprint.json`);
  const coveragePath = path.join(subjectDir, `${sessionId}_coverage.json`);
  const visualCoveragePath = path.join(subjectDir, `${sessionId}_visualCoverage.json`);
  const jobStatePath = path.join(subjectDir, `${sessionId}_jobState.json`);

  fs.writeFileSync(mdPath, fullContent, 'utf-8');
  fs.writeJsonSync(metaPath, { ...sessionData, content: undefined });
  saveGraph(graphPath, knowledgeGraph);
  fs.writeJsonSync(blueprintPath, blueprint, { spaces: 2 });
  saveCoverageMatrix(coveragePath, coverageReport);
  fs.writeJsonSync(visualCoveragePath, {
    matrix: blueprint.visualCoverageMatrix || [],
    audit: visualAuditReport.coverageReport || null,
    deficiencies: visualAuditReport.deficiencies || [],
    visualScore: visualAuditReport.visualScore || 100
  }, { spaces: 2 });
  saveJobState(jobStatePath, jobState);

  // Salva snapshot del VisualLedger per questo job (per audit post-hoc)
  try {
    const { getDefaultLedger } = require('../core/visualLedger');
    const activeLedger = getDefaultLedger();
    if (activeLedger.getAll().length > 0) {
      const ledgerPath = path.join(subjectDir, `${sessionId}_visualLedger.json`);
      fs.writeJsonSync(ledgerPath, activeLedger.toJSON(), { spaces: 2 });
    }
  } catch (e) { /* non bloccare il job per errori del ledger */ }

  // Aggiorna Knowledge Base per materia
  try {
    mergeIntoSubjectKnowledgeBase(subjectKnowledgeGraph, knowledgeGraph);
    saveSubjectKnowledgeBase(subjectName, subjectKnowledgeGraph, CONFIG.PATHS.SESSIONS_DIR);
  } catch (saveKbErr) {
    console.warn('  ⚠️ Impossibile salvare Knowledge Base per materia:', saveKbErr.message);
  }

  sendSSE({
    type: 'done',
    sessionId,
    title: sessionData.title,
    fullContent,
    qualityScore: qualityReport.overallScore,
    coverageRatio: coverageReport.overallCoverage
  });

  return sessionData;
}

/**
 * Continuazione di una sessione esistente
 */
async function continueSessionGeneration({ sessionId, additionalInstructions, sendSSE }) {
  const deepseek = getDeepSeekClient();
  const subjects = fs.existsSync(CONFIG.PATHS.SESSIONS_DIR)
    ? fs.readdirSync(CONFIG.PATHS.SESSIONS_DIR).filter(f =>
        fs.statSync(path.join(CONFIG.PATHS.SESSIONS_DIR, f)).isDirectory()
      )
    : [];

  let mdPath = null;
  let metaPath = null;
  let sessionMeta = null;

  for (const sub of subjects) {
    const candidateMd = path.join(CONFIG.PATHS.SESSIONS_DIR, sub, `${sessionId}.md`);
    const candidateMeta = path.join(CONFIG.PATHS.SESSIONS_DIR, sub, `${sessionId}.json`);
    if (fs.existsSync(candidateMd)) {
      mdPath = candidateMd;
      metaPath = candidateMeta;
      sessionMeta = fs.existsSync(candidateMeta) ? fs.readJsonSync(candidateMeta) : { subject: sub };
      break;
    }
  }

  if (!mdPath) {
    throw new Error('Sessione non trovata');
  }

  const currentContent = fs.readFileSync(mdPath, 'utf-8');
  const systemPrompt = getPromptForSubject(sessionMeta.subject || 'generic');

  const continuationPrompt = `
Ecco la dispensa universitaria generata fino a questo punto:
${currentContent.length > 25000 ? currentContent.substring(currentContent.length - 25000) : currentContent}

${additionalInstructions ? `Istruzioni aggiuntive: ${additionalInstructions}\n` : ''}
Continua ora direttamente ed esattamente da dove ti sei fermato. Tratta in modo completo, analitico e rigoroso tutte le lezioni, formule ed esercizi rimanenti del programma, senza riassumere e senza tralasciare nulla. Concludi con il formulario e la checklist d'esame.
`;

  console.log(`🤖 Continuazione richiesta per sessione ${sessionId} (${sessionMeta.subject})`);

  const stream = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: continuationPrompt }
    ],
    stream: true,
    max_tokens: 8000,
    temperature: 0.3,
  });

  let appendContent = '\n\n';

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (delta) {
      appendContent += delta;
      sendSSE({ type: 'delta', content: delta });
    }
  }

  const safeBase = repairMarkdownMath(currentContent);
  const updatedContent = repairMarkdownMath(safeBase + appendContent);
  fs.writeFileSync(mdPath, updatedContent, 'utf-8');

  sendSSE({ type: 'done', sessionId, title: sessionMeta.title || 'Sessione' });
  return { updatedContent, sessionMeta };
}

module.exports = {
  generateGlobalMasterPlan,
  orchestrateGeneration,
  continueSessionGeneration
};
