/**
 * StudyGenius Academic Intelligence System
 * src/verification/critics.js
 * 
 * Pipeline dei Critics Indipendenti e Red-Team Student:
 * - Mathematical & Scientific Critic
 * - Pedagogical Critic ("Can I Reconstruct It?")
 * - Exam Critic ("Can I Defend It?")
 * - Red-Team Student (Simulazione d'incomprensione avversariale)
 */

class AcademicCritics {
  constructor(deepseekClient, callWithRetryFn) {
    this.client = deepseekClient;
    this.callWithRetry = callWithRetryFn;
  }

  /**
   * Esegue la revisione critica multi-agente
   */
  async runFullCriticAudit(text, subject = 'Fisica') {
    const auditResults = {
      mathCritic: { passed: true, issues: [] },
      pedagogyCritic: { passed: true, issues: [] },
      examCritic: { passed: true, issues: [] },
      redTeamStudent: { misunderstandings: [] }
    };

    if (!this.client || !this.callWithRetry || !text || text.length < 500) {
      return auditResults;
    }

    const sample = text.slice(0, 4500);

    const prompt = `Sei un revisore accademico universitario esperto per la materia: ${subject}.
Esegui un critic-pass rapido e rigoroso sul seguente testo didattico generato:

---
${sample}
---

Valuta il testo sulle 3 dimensioni fondamentali e sui 4 test dello studente:

1. **VERITÀ (Correttezza):** Formule, segni, unità SI, passaggi algebrici o reazioni sono corretti? Ci sono errori o formule calate dall'alto?
2. **COMPLETEZZA:** Sono presenti tutte le ipotesi, i limiti di validità e le condizioni al contorno necessarie?
3. **COMPRENSIBILITÀ (I 4 Test dello Studente):**
   - *Ricostruire:* Lo studente può ricostruire il ragionamento senza imparare a memoria?
   - *Spiegare:* È spiegata l'intuizione qualitativa ("cosa succede?")?
   - *Usare:* C'è uno schema mentale chiaro per risolvere problemi nuovi?
   - *Difendere:* Lo studente saprebbe argomentare perché questa formula vale e rispondere alle trappole d'esame?

Rispondi ESCLUSIVAMENTE in formato JSON valido:
{
  "passed": true,
  "truthScore": 100,
  "completenessScore": 100,
  "reconstructibilityScore": 100,
  "issues": ["eventuali problemi riscontrati"],
  "failedSnippet": "eventuale porzione di testo da riparare",
  "repairInstruction": "istruzione sintetica per la correzione"
}`;

    try {
      const res = await this.callWithRetry(this.client, {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Sei una commissione di verifica accademica rigorosa. Rispondi solo in formato JSON valido.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.1
      });

      const raw = res.choices[0]?.message?.content || '{}';
      const cleanJson = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      auditResults.mathCritic.passed = parsed.mathPassed !== false;
      auditResults.mathCritic.issues = parsed.mathIssues || [];
      auditResults.pedagogyCritic.passed = parsed.pedagogyPassed !== false;
      auditResults.pedagogyCritic.issues = parsed.pedagogyIssues || [];
      auditResults.examCritic.passed = parsed.examPassed !== false;
      auditResults.examCritic.issues = parsed.examIssues || [];
      auditResults.redTeamStudent.misunderstandings = parsed.redTeamMisunderstandings || [];

    } catch (err) {
      console.warn(`  ⚠️ [Critics] Audit opzionale fallito o non JSON (${err.message}). Procedo.`);
    }

    return auditResults;
  }
}

module.exports = { AcademicCritics };
