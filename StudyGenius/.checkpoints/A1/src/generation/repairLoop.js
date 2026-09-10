/**
 * StudyGenius Academic Intelligence System
 * src/generation/repairLoop.js
 * 
 * Surgical Repair Engine (Architettura Oltre 1000).
 * Riparazione chirurgica basata su Block ID e Repair Scope (INLINE, BLOCK, SECTION, CHAPTER, GLOBAL).
 * Sostituisce i fragili replace() globali con modifiche mirate sui singoli blocchi strutturali.
 */

const {
  parseBlocks,
  serializeBlocks,
  replaceBlock,
  insertBlock,
  moveBlock,
  formatBlock
} = require('./blockManager');

class RepairLoop {
  constructor(deepseekClient, callWithRetryFn) {
    this.client = deepseekClient;
    this.callWithRetry = callWithRetryFn;
  }

  /**
   * Tenta la riparazione mirata del testo in base alla violazione riscontrata e al suo scope
   * @param {string} originalText 
   * @param {Object|string} failedAudit Violazione o messaggio di errore
   * @param {string} subject Materia accademica
   * @param {Object} extra Contesto aggiuntivo (blueprint, knowledgeGraph, ecc.)
   * @returns {Promise<string>} Testo riparato
   */
  async attemptRepair(originalText, failedAudit, subject = 'Fisica', extra = {}) {
    return this.attemptScopeRepair(originalText, failedAudit, subject, extra);
  }

  /**
   * Riparatore scope-aware per l'Architettura Oltre 1000
   */
  async attemptScopeRepair(originalText, failedAudit, subject = 'Fisica', extra = {}) {
    if (!originalText || !failedAudit) return originalText;

    const violation = typeof failedAudit === 'object' ? failedAudit : {
      type: 'UNKNOWN',
      message: String(failedAudit),
      scope: 'BLOCK'
    };

    const vType = violation.type || violation.secondaryType || '';
    const vMsg = violation.message || violation.reason || '';
    const scope = violation.scope || 'BLOCK';

    console.log(`\n🛠️ [Repair Engine - Scope: ${scope}]: Riparazione per violazione "${vType || vMsg}"`);

    // 1. Riparazione sintattica locale immediata per delimitatori LaTeX sbilanciati
    if (vMsg.includes('delimitatori $') || vMsg.includes('formula LaTeX') || vType === 'BROKEN_LATEX') {
      return this.repairLatexDelimiters(originalText);
    }

    // 2. Riparazione chirurgica per incoerenza testo↔grafico (GRAPH_TEXT_INCONSISTENCY)
    if (vType === 'GRAPH_TEXT_INCONSISTENCY' || vMsg.includes('GRAPH_TEXT_INCONSISTENCY') || vMsg.includes('Incoerenza numerica testo↔grafico')) {
      let details = violation.details || extra.details || {};
      if (!details.actual) {
        const match = vMsg.match(/per x=([^,]+), il testo indica y=([^,]+), ma il calcolo deterministico restituisce y=([^\s\(]+)/i);
        if (match) {
          details = {
            ...details,
            x: match[1].trim(),
            expected: parseFloat(match[2].trim()),
            actual: parseFloat(match[3].trim())
          };
        }
      }
      const repairedLocally = this.repairGraphTextInconsistency(originalText, details);
      if (repairedLocally !== originalText) {
        console.log(`  ✅ [Repair Engine] Riparazione numerica testo↔grafico applicata localmente.`);
        return repairedLocally;
      }
    }

    // 3. Riparazione per provenienza mancante (GRAPH_MISSING_PROVENANCE)
    if (vType === 'GRAPH_MISSING_PROVENANCE' || vMsg.includes('GRAPH_MISSING_PROVENANCE')) {
      const repairedProvenance = this.repairGraphProvenance(originalText);
      if (repairedProvenance !== originalText) {
        console.log(`  ✅ [Repair Engine] Provenienza grafico "FORMULA-derived" impostata.`);
        return repairedProvenance;
      }
    }

    // 4. Riparazione strutturale per PREREQUISITE_VIOLATION o UNRESOLVED_FIRST_USE
    // Utilizza blockManager per inserire un blocco ponte (MOTIVATION_BRIDGE) senza alterare il resto
    if (vType === 'PREREQUISITE_VIOLATION' || vType === 'UNRESOLVED_FIRST_USE') {
      const blocks = parseBlocks(originalText);
      const depName = violation.details?.dependentConcept || violation.details?.symbol || 'concetto avanzato';
      const reqName = violation.details?.prerequisiteConcept || 'prerequisito fondamentale';

      // Cerca il blocco target da antecedere
      const targetBlock = blocks.find(b =>
        (violation.targetId && b.blockId === violation.targetId) ||
        (b.content && b.content.includes(depName))
      );

      if (targetBlock) {
        const bridgeContent = `\n> 💡 **Ponte Didattico & Motivazione**: Prima di formalizzare "${depName}", è necessario chiarire il legame con "${reqName}". Quando il sistema presenta condizioni reali o reazioni secondarie, il modello semplice non è più sufficiente ed emerge l'esigenza di una trattazione estesa.\n`;
        const bridgeBlock = {
          blockId: `bridge-${Date.now().toString(36)}`,
          blockType: 'MOTIVATION_BRIDGE',
          content: bridgeContent
        };

        const repairedWithBridge = insertBlock(originalText, targetBlock.blockId, bridgeBlock, 'before');
        console.log(`  ✅ [Repair Engine] Blocco MOTIVATION_BRIDGE inserito chirurgicamente prima di "${targetBlock.blockId}".`);
        return repairedWithBridge;
      }
    }

    // 4.5 Riparazione chirurgica per passaggi matematici senza regola esplicitata (MISSING_MATH_RULE)
    if (vType === 'MISSING_MATH_RULE' || vMsg.includes('MISSING_MATH_RULE') || vMsg.includes('Mathematical Provenance Layer')) {
      if (this.client && this.callWithRetry) {
        const mathRepaired = await this.repairMissingMathRule(originalText, violation, subject);
        if (mathRepaired && mathRepaired !== originalText) {
          console.log(`  ✅ [Repair Engine] Riparazione Mathematical Provenance (MISSING_MATH_RULE) applicata con successo.`);
          return mathRepaired;
        }
      }
    }

    // 5. Riparazione chirurgica su singolo blocco via LLM (se disponibile)
    if (!this.client || !this.callWithRetry) {
      return originalText;
    }

    // Identifica se l'errore è isolabile a un blocco specifico
    const blocks = parseBlocks(originalText);
    const targetBlock = blocks.find(b =>
      (violation.targetId && b.blockId === violation.targetId) ||
      (b.content && b.content.includes(violation.details?.snippet || ''))
    );

    if (targetBlock && targetBlock.isExplicitBlock) {
      console.log(`  🎯 [Repair Engine] Isolato blocco target "${targetBlock.blockId}" (${targetBlock.blockType}). Invio a repair chirurgico mirato.`);
      const blockPrompt = `Sei un professore universitario di ${subject}.
Durante l'audit automatico, il seguente blocco concettuale ha evidenziato un'anomalia didattica:
Violazione: "${vType} - ${vMsg}"

Blocco originale da correggere:
---
${targetBlock.content}
---

VINCOLI DI RIPARAZIONE CHIRURGICA:
1. Azioni permesse (Allowed Edits): ${JSON.stringify(this._getAllowedEdits(vType))}
2. Azioni vietate (Forbidden Edits): ["CHANGE_FORMULA", "RENAME_SYMBOLS", "MODIFY_OTHER_BLOCKS"]
3. Restituisci SOLO il contenuto interno corretto per questo blocco, senza aggiungere commenti meta o riscrivere altre parti.`;

      try {
        const res = await this.callWithRetry(this.client, {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'Sei un professore universitario addetto alla correzione chirurgica di singoli blocchi didattici.' },
            { role: 'user', content: blockPrompt }
          ],
          max_tokens: 2000,
          temperature: 0.2
        });

        const repairedContent = res.choices[0]?.message?.content?.trim();
        if (repairedContent && repairedContent.length > 30) {
          const repairedDoc = replaceBlock(originalText, targetBlock.blockId, `\n${repairedContent}\n`);
          console.log(`  ✅ [Repair Engine] Blocco "${targetBlock.blockId}" sostituito chirurgicamente con successo.`);
          return repairedDoc;
        }
      } catch (err) {
        console.warn(`  ⚠️ [Repair Engine] Fallito repair del blocco (${err.message}). Fallback su intero testo.`);
      }
    }

    // Fallback: Riparazione su contesto intero se non è stato possibile isolare il singolo blocco
    const fullPrompt = `Sei un professore universitario di ${subject}.
Durante l'audit automatico è stato riscontrato il seguente difetto:
"${vType}: ${vMsg}"

Testo originale da revisionare:
---
${originalText.slice(0, 5000)}
---

COMPITO DI RIPARAZIONE CHIRURGICA:
1. Correggi ed espandi unicamente la parte specifica identificata dall'anomalia senza riscrivere il resto del capitolo.
2. Mantieni inalterate tutte le parti già corrette e lo stile tipografico (LaTeX $ e $$).
3. Restituisci il testo integrale con la sola correzione applicata.`;

    try {
      const res = await this.callWithRetry(this.client, {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Sei un professore universitario addetto alla correzione chirurgica.' },
          { role: 'user', content: fullPrompt }
        ],
        max_tokens: 6000,
        temperature: 0.2
      });

      const repaired = res.choices[0]?.message?.content?.trim();
      if (repaired && repaired.length > originalText.length * 0.7) {
        console.log(`  ✅ [Repair Engine] Riparazione fallback completata (${repaired.length} caratteri).`);
        return repaired;
      }
    } catch (err) {
      console.warn(`  ⚠️ [Repair Engine] Fallita riparazione fallback via LLM (${err.message}).`);
    }

    return originalText;
  }

  _getAllowedEdits(violationType) {
    switch (violationType) {
      case 'UNRESOLVED_FIRST_USE':
        return ['ADD_MOTIVATION', 'ADD_INTERPRETATION', 'DEFINE_PHYSICAL_MEANING'];
      case 'PREREQUISITE_VIOLATION':
        return ['INSERT_BRIDGE_BLOCK', 'MOVE_BLOCK'];
      case 'BARE_DEFINITION':
        return ['ADD_DEFINING_EQUATION', 'ADD_IMMEDIATE_INTERPRETATION'];
      case 'UNEXPLAINED_FORMAL_TRANSITION':
        return ['CLARIFY_TRANSITION', 'EXPLAIN_OPERATOR_CHOICE', 'ADD_WHY'];
      case 'MISSING_MATH_RULE':
        return ['EXPLICIT_MATH_RULE', 'ADD_CHAIN_RULE', 'ADD_INTERMEDIATE_SUBSTITUTION', 'EXPLICIT_OPERATION'];
      default:
        return ['CORRECT_LOCAL_TEXT'];
    }
  }

  /**
   * Riparazione chirurgica per passaggi matematici senza regola esplicitata
   * (Mathematical Provenance Layer)
   */
  async repairMissingMathRule(originalText, violation, subject = 'Fisica') {
    const blocks = parseBlocks(originalText);
    const targetBlock = blocks.find(b =>
      (violation.targetId && b.blockId === violation.targetId) ||
      (b.content && b.content.includes(violation.details?.snippet || ''))
    );

    let target = '';
    let startIndex = violation.details?.start;
    let endIndex = violation.details?.end;
    let isBlockBased = false;

    if (targetBlock && targetBlock.isExplicitBlock) {
      target = targetBlock.content;
      isBlockBased = true;
    } else if (startIndex !== undefined && endIndex !== undefined && startIndex >= 0 && endIndex <= originalText.length) {
      target = originalText.substring(startIndex, endIndex);
    } else if (violation.details?.snippet) {
      const idx = originalText.indexOf(violation.details.snippet);
      if (idx !== -1) {
        startIndex = idx;
        endIndex = idx + violation.details.snippet.length;
        target = violation.details.snippet;
      }
    }

    if (!target) return originalText;

    const prefixStart = Math.max(0, (startIndex ?? 0) - 1500);
    const prefix = originalText.substring(prefixStart, startIndex ?? 0);
    const suffixEnd = Math.min(originalText.length, (endIndex ?? (startIndex + target.length)) + 1500);
    const suffix = originalText.substring(endIndex ?? (startIndex + target.length), suffixEnd);

    const mathPrompt = `[RUOLO]
Sei un **esperto di didattica della matematica e della fisica**, specializzato nella scrittura di testi scientifici ricostruibili. Il tuo compito è riscrivere **solo i passaggi di calcolo** che ti vengono forniti, aggiungendo **la regola matematica esplicitamente utilizzata**, senza modificare le formule o il risultato finale.

[CONTESTO - DA NON MODIFICARE]
${prefix}

[SEZIONE DA RISCRIVERE – DEVE CONTENERE LA REGOLA MATEMATICA]
${target}

[CONTESTO SUCCESSIVO - DA NON MODIFICARE]
${suffix}

[ISTRUZIONI VINCOLANTI – DA SEGUIRE OBBLIGATORIAMENTE]
1. **Riscrivi SOLO la sezione \`${target}\`**. Non toccare nulla prima o dopo.
2. **Mantieni assolutamente invariate tutte le formule matematiche**, i simboli e le unità di misura.
3. **Per ogni passaggio che coinvolge una derivata, un integrale, un limite o un'identità vettoriale**, devi:
   - **Dichiarare l'operazione** (es. "Calcoliamo la derivata parziale rispetto a x").
   - **Citare la regola generale** (es. "La derivata di sin(u) rispetto a x è cos(u) · du/dx (regola della catena)").
   - **Mostrare la sostituzione concreta** (es. "Qui u = kx − ωt + δ, quindi du/dx = k").
   - **Scrivere il calcolo intermedio** (es. "∂ξ/∂x = ξ₀ · cos(u) · k").
   - **Chiudere con il risultato finale** (es. "∂ξ/∂x = ξ₀ k cos(kx − ωt + δ)").
4. **Se un passaggio è puramente algebrico** (es. raccoglimento a fattor comune), puoi descriverlo brevemente ma non devi forzare una regola se non è necessaria.
5. **Non aggiungere nuovi concetti fisici o nuove sezioni**. Limita il tuo intervento al calcolo matematico.
6. **La risposta deve contenere ESCLUSIVAMENTE il testo riscritto per la sezione target**, senza prefazioni (es. "Ecco il passaggio corretto:"), senza commenti, senza note personali.

[ESEMPIO DI PASSAGGIO CORRETTO (DA USARE COME RIFERIMENTO)]

❌ **Scritto male (mancano le regole):**
> Calcoliamo le derivate parziali rispetto a x:
> $$ \\frac{\\partial \\xi}{\\partial x} = \\xi_0 k \\cos(kx - \\omega t + \\delta) $$
> $$ \\frac{\\partial^2 \\xi}{\\partial x^2} = -\\xi_0 k^2 \\sin(kx - \\omega t + \\delta) $$

✅ **Scritto bene (con le regole esplicitate):**
> Calcoliamo le derivate parziali rispetto a $x$.  
> Applicando la regola della catena alla funzione seno, ricordando che $\\frac{d}{dx}\\sin(u) = \\cos(u) \\cdot \\frac{du}{dx}$, e ponendo $u = kx - \\omega t + \\delta$, otteniamo $\\frac{du}{dx} = k$.  
> Pertanto:
> $$ \\frac{\\partial \\xi}{\\partial x} = \\xi_0 \\cos(u) \\cdot k = \\xi_0 k \\cos(kx - \\omega t + \\delta). $$
> Deriviamo nuovamente rispetto a $x$, stavolta applicando la regola della catena alla derivata del coseno: $\\frac{d}{dx}\\cos(u) = -\\sin(u) \\cdot \\frac{du}{dx}$.  
> Quindi:
> $$ \\frac{\\partial^2 \\xi}{\\partial x^2} = -\\xi_0 k \\sin(u) \\cdot k = -\\xi_0 k^2 \\sin(kx - \\omega t + \\delta). $$

[SEZIONE TARGET DA RISCRIVERE]
${target}

[INIZIO DELLA TUA RISPOSTA – SOLO IL TESTO RISCRITTO]`;

    try {
      const res = await this.callWithRetry(this.client, {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Sei un esperto di didattica della matematica e della fisica addetto alla correzione chirurgica dei passaggi di calcolo.' },
          { role: 'user', content: mathPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.2
      });

      const repaired = res.choices[0]?.message?.content?.trim();
      if (repaired && repaired.length > 20) {
        if (isBlockBased) {
          return replaceBlock(originalText, targetBlock.blockId, `\n${repaired}\n`);
        } else if (startIndex !== undefined && endIndex !== undefined) {
          return originalText.substring(0, startIndex) + repaired + originalText.substring(endIndex);
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ [Repair Engine] Fallito repair Mathematical Provenance (${err.message}).`);
    }

    return originalText;
  }

  /**
   * Riparazione chirurgica locale per affermazioni testo↔grafico (GRAPH_TEXT_INCONSISTENCY)
   */
  repairGraphTextInconsistency(text, details = {}) {
    let repaired = text;
    const { graphId, expected, actual, x } = details;

    repaired = repaired.replace(/```(?:json:graphClaims|graphClaims|json)\s*\n([\s\S]*?)\n```/g, (match, body) => {
      try {
        const parsed = JSON.parse(body.trim());
        if (parsed && Array.isArray(parsed.graphClaims)) {
          let modified = false;
          for (const c of parsed.graphClaims) {
            if ((!graphId || c.graphId === graphId) && (x === undefined || String(c.x || c.xValue) === String(x))) {
              c.y_expected = typeof actual === 'number' ? Number(actual.toPrecision(4)) : actual;
              modified = true;
            }
          }
          if (modified) {
            return `\`\`\`json:graphClaims\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
          }
        }
      } catch (e) {
        // Fallback
      }
      return match;
    });

    if (expected !== undefined && actual !== undefined && !isNaN(expected) && !isNaN(actual)) {
      const expStr = String(expected);
      const actFormatted = Math.abs(actual) >= 1e4 || (Math.abs(actual) < 0.01 && actual !== 0)
        ? actual.toExponential(3)
        : Number(actual.toPrecision(4)).toString();

      if (repaired.includes(expStr)) {
        repaired = repaired.replaceAll(expStr, actFormatted);
      }
    }

    return repaired;
  }

  /**
   * Riparazione chirurgica per blocchi grafici privi di provenienza
   */
  repairGraphProvenance(text) {
    return text.replace(/("type"\s*:\s*"GRAPH"[\s\S]*?)("provenance"\s*:\s*"[^"]*"|(?=\}))/g, (match, p1, p2) => {
      if (p2 && p2.startsWith('"provenance"')) {
        return `${p1}"provenance": "FORMULA-derived"`;
      }
      return `${p1}"provenance": "FORMULA-derived",\n`;
    });
  }

  /**
   * Riparazione euristica rapida per delimitatori LaTeX dispari
   */
  repairLatexDelimiters(text) {
    const lines = text.split('\n');
    let fixed = [];
    for (let line of lines) {
      const count = (line.match(/(?<!\\)\$/g) || []).length;
      if (count % 2 !== 0 && !line.includes('$$')) {
        line += '$';
      }
      fixed.push(line);
    }
    return fixed.join('\n');
  }
}

module.exports = { RepairLoop };
