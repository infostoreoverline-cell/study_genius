/**
 * StudyGenius Academic Intelligence System
 * src/prompts/visualCriticPrompts.js — VSVP V2
 * 
 * Prompt Multimodali Specialistici per la Revisione Semantica e la Blind Final Review.
 * 
 * Principio Fondamentale:
 * "LLM = Mente, StudyGenius = Mano".
 * Gemini agisce come supervisore critico ed esaminatore didattico. Non emette codice SVG grezzo,
 * ma produce report analitici multidimensionali e riparazioni raccomandate astratte (Structured Patches).
 */

'use strict';

/**
 * Costruisce il prompt per la Semantic Visual Review (Fase 2 del loop)
 * 
 * @param {Object} groundTruth Istanza VisualGroundTruth
 * @param {Object} [geometryReport] Dati calcolati da svgGeometryAnalyzer
 * @param {Object} [history] Memoria delle iterazioni precedenti
 * @returns {string} Prompt testuale per Gemini
 */
function buildSemanticReviewerPrompt(groundTruth, geometryReport = null, history = null) {
  const collisionsStr = (geometryReport && geometryReport.collisions && geometryReport.collisions.length > 0)
    ? geometryReport.collisions.map(c => `- Collisione geometrica confermata: "${c.textA}" (${c.elementA}) si sovrappone a "${c.textB || c.elementB}" (overlap: ${c.overlapPercentage}%, area: ${c.intersectionArea}px)`).join('\n')
    : 'Nessuna collisione geometrica critica rilevata dal browser.';

  const clippingsStr = (geometryReport && geometryReport.clippings && geometryReport.clippings.length > 0)
    ? geometryReport.clippings.map(cl => `- Elemento tagliato fuori dai bordi (viewBox): ${cl.id} (${cl.tag})`).join('\n')
    : 'Nessun clipping rilevato (tutti gli elementi sono all\'interno del viewBox).';

  const historyStr = history && history.iterations > 0
    ? `\nSTORIA DELLE ITERAZIONI PRECEDENTI:
- Iterazione corrente: ${history.iterations}
- Problemi già risolti: ${JSON.stringify(history.resolvedIssues || [])}
- Problemi persistenti da sanare: ${JSON.stringify(history.persistentIssues || [])}
ATTENZIONE: Evita oscillazioni (es. non chiedere di spostare una label nella posizione da cui era appena stata rimossa).`
    : '';

  return `Sei il Revisore Accademico Didattico e Grafico di StudyGenius per il settore universitario.
Stai ispezionando l'immagine renderizzata di una figura scientifica per una dispensa universitaria di alto livello.

OBIETTIVO DIDATTICO DELLA FIGURA:
"${groundTruth.learningGoal}"

TIPO DI DIAGRAMMA:
${groundTruth.diagramType} (${groundTruth.profileName})

CONCETTI OBBLIGATORI CHE DEVONO ESSERE RAPPRESENTATI:
- ${groundTruth.requiredConcepts.join('\n- ')}

RELAZIONI E AREE CHIAVE DA VERIFICARE:
- ${groundTruth.focusAreas.join('\n- ')}

ARTEFATTI O INTERPRETAZIONI CATEGORICAMENTE VIETATE:
- ${groundTruth.forbiddenInterpretations.join('\n- ')}

DATI DEL CONTROLLO GEOMETRICO REALE (ESEGUITO DAL BROWSER CHROMIUM):
${collisionsStr}
${clippingsStr}
${historyStr}

REGOLE ASSOLUTE:
1. NON SCRIVERE CODICE SVG. Tu sei la MENTE, StudyGenius è la MANO.
2. Identifica gli elementi problematici tramite il loro testo o ID semantico.
3. Se rilevi difetti visivi (sovrapposizioni, forme nere parassite, testi illeggibili, frecce confuse), fornisci un'istruzione di riparazione astratta in "recommendedRepairs".
4. Classifica il livello di riparazione:
   - "MICRO_REPAIR": aggiustamenti locali (spostare un'etichetta, aggiungere una linea guida, impostare fill="none").
   - "LAYOUT_REPAIR": riorganizzazione dello spazio o espansione del viewBox.
   - "CONCEPTUAL_REDESIGN": il grafico è concettualmente incomprensibile o inadatto e richiede una nuova bozza dal Visual Architect.

Rispondi ESCLUSIVAMENTE in formato JSON conforme a questa struttura:
\`\`\`json
{
  "scores": {
    "scientificAccuracy": 95,
    "semanticClarity": 90,
    "layout": 85,
    "readability": 88,
    "visualHierarchy": 89,
    "aesthetics": 90
  },
  "criticalIssuesCount": 0,
  "majorIssuesCount": 1,
  "minorIssuesCount": 0,
  "issues": [
    {
      "id": "ISS_1",
      "severity": "major",
      "type": "LABEL_COLLISION",
      "targetText": "CAVITAZIONE CLASSICA",
      "description": "L'etichetta collide con la scritta OCCHIO GIRANTE.",
      "recommendedRepair": {
        "action": "REPOSITION_LABEL",
        "targetText": "CAVITAZIONE CLASSICA",
        "preferredRegion": "upper-left",
        "minimumClearance": 25,
        "addLeaderLine": true
      }
    }
  ],
  "repairLevel": "MICRO_REPAIR",
  "pedagogicalVerdict": "Sintetica spiegazione del giudizio didattico."
}
\`\`\``;
}

/**
 * Costruisce il prompt per la Blind Final Review (Fase 4: Esaminatore Indipendente)
 * 
 * @param {Object} groundTruth Istanza VisualGroundTruth
 * @returns {string} Prompt testuale
 */
function buildBlindExaminerPrompt(groundTruth) {
  return `Sei un Esaminatore Universitario Indipendente e Membro di Commissione di Laurea.
Il tuo compito è valutare questa figura scientifica in modo CIECO (senza conoscere la storia delle modifiche o i punteggi precedenti).

DOMANDA FONDAMENTALE:
Questa figura possiede la dignità grafica, l'accuratezza scientifica e la chiarezza pedagogica necessaria per essere pubblicata come diagramma principale in una dispensa didattica universitaria di livello avanzato?

OBIETTIVO DELLA FIGURA:
"${groundTruth.learningGoal}"

CONCETTI CHE DEVE RAPPRESENTARE CHIARAMENTE:
- ${groundTruth.requiredConcepts.join(', ')}

CRITERI DI REIEZIONE IMMEDIATA (HARD STOP):
- Testi sovrapposti tra loro o su tracciati in modo da risultare confusi o illeggibili.
- Glitch visivi macroscopici (forme nere anomale, elementi troncati ai bordi).
- Flussi che contraddicono le leggi fisiche o le convenzioni universitarie (es. ingresso/uscita scambiate).

Rispondi ESCLUSIVAMENTE in formato JSON:
\`\`\`json
{
  "approved": true,
  "academicQualityScore": 95,
  "verdict": "APPROVED",
  "reasoning": "Spiegazione sintetica della valutazione."
}
\`\`\`
(Nota: se la figura non è ancora degna di un manuale universitario, imposta "approved": false, "verdict": "REJECTED" con i motivi specifici).`;
}

module.exports = {
  buildSemanticReviewerPrompt,
  buildBlindExaminerPrompt
};
