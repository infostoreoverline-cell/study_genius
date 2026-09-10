/**
 * StudyGenius Academic Intelligence System
 * src/generation/seamWelding2.js
 * 
 * Seam Welding 2.0: Saldatura intelligente delle giunzioni didattiche tra Shard.
 * Garantisce continuità notazionale (Notation Manager), continuità logico-concettuale
 * e raccordo fluido delle equazioni tra sezioni adiacenti.
 */

class SeamWelding2 {
  constructor(deepseekClient, callWithRetryFn) {
    this.client = deepseekClient;
    this.callWithRetry = callWithRetryFn;
  }

  /**
   * Salda l'array dei testi prodotti dagli Shard in parallelo ad alta velocità
   */
  async weldShards(shardOutputs, subject = 'Fisica') {
    if (!shardOutputs || shardOutputs.length <= 1) {
      return shardOutputs || [];
    }

    console.log(`\n🔗 [Seam Welding 2.0]: Saldatura parallela ad alta concorrenza per ${shardOutputs.length - 1} giunzioni tra ${shardOutputs.length} Shard...`);
    const welded = [...shardOutputs];

    // Saldatura concorrente in parallelo di tutte le giunzioni
    const boundaryTasks = [];
    for (let i = 0; i < welded.length - 1; i++) {
      boundaryTasks.push(this.weldSingleBoundary(welded[i], welded[i + 1], i, subject));
    }

    const refinedHeads = await Promise.all(boundaryTasks);
    for (let i = 0; i < refinedHeads.length; i++) {
      if (refinedHeads[i]) {
        welded[i + 1] = refinedHeads[i];
      }
    }

    console.log(`  ✨ [Seam Welding 2.0]: Tutte le ${shardOutputs.length - 1} giunzioni sono state saldate con successo in parallelo.`);
    return welded;
  }

  /**
   * Salda una singola giunzione tra due Shard adiacenti
   */
  async weldSingleBoundary(prevText, nextText, index, subject = 'Fisica') {
    if (!prevText || !nextText) return nextText || '';

    const tail = prevText.slice(-1200);
    const head = nextText.slice(0, 1200);

    const prompt = `Sei un redattore capo ed editore accademico di manuali universitari di ${subject}.
Stiamo fondendo due sezioni adiacenti (Sezione A e Sezione B) di una dispensa magistrale.

FINALE ATTUALE DELLA SEZIONE A:
[...]
${tail}

ESORDIO ATTUALE DELLA SEZIONE B:
${head}
[...]

COMPITI OBBLIGATORI DI SEAM WELDING 2.0:
1. **Verifica della Notazione (Notation Manager):** Assicurati che i simboli (es. coordinate, masse, costanti, versori) rimangano rigorosamente coerenti. Se la Sezione A usava una convenzione e la Sezione B ne usa un'altra, allinea la Sezione B alla convenzione stabilita in A.
2. **Rimozione Aperture Disgiunte:** Elimina qualsiasi esordio colloquiale o disgiunto (es. "In questo modulo...", "Come abbiamo visto...", "Benvenuti a questo capitolo...").
3. **Ponte Concettuale:** Crea un paragrafo di transizione fluido (2-3 frasi) che raccordi naturalmente l'ultimo concetto di A con il primo nucleo di B.
4. Restituisci ESCLUSIVAMENTE la versione iniziale corretta e raccordata della Sezione B (i primi 400-800 caratteri) che andrà a sostituire l'esordio attuale. Mantieni il formato Markdown e LaTeX ($ e $$).`;

    try {
      if (!this.client || !this.callWithRetry) {
        return this.cleanDisjointHeadLocally(nextText);
      }

      const res = await this.callWithRetry(this.client, {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Sei un raffinato redattore di testi scientifici e manuali universitari.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.2
      });

      const refinedHead = res.choices[0]?.message?.content?.trim();
      if (refinedHead && refinedHead.length > 40) {
        let anchorIdx = nextText.indexOf('\n\n## ', 250);
        if (anchorIdx === -1) anchorIdx = nextText.indexOf('\n\n### ', 250);
        if (anchorIdx === -1) anchorIdx = Math.min(600, nextText.length);

        console.log(`  ✨ [Seam Welding 2.0] Giunzione Shard ${index + 1} ➔ Shard ${index + 2} saldata con successo.`);
        return `${refinedHead}\n\n${nextText.slice(anchorIdx).trim()}`;
      }
      return this.cleanDisjointHeadLocally(nextText);
    } catch (err) {
      console.warn(`  ⚠️ [Seam Welding 2.0] Transizione Shard ${index + 1} fallback locale: ${err.message}`);
      return this.cleanDisjointHeadLocally(nextText);
    }
  }

  /**
   * Pulizia euristica locale di aperture disgiunte
   */
  cleanDisjointHeadLocally(text) {
    if (!text) return '';
    return text.replace(/^(In questo modulo|In questa sezione|Benvenuti|Come accennato precedentemente)[^\n]*\n+/i, '');
  }
}

module.exports = { SeamWelding2 };
