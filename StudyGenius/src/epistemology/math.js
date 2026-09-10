/**
 * StudyGenius Academic Intelligence System
 * src/epistemology/math.js
 * 
 * Epistemologia della Matematica e Geometria:
 * Definizione -> Ipotesi -> Costruzione -> Tesi -> Dimostrazione -> Corollario -> Controesempio
 */

class MathEpistemology {
  toPromptDirective() {
    return `### EPISTEMOLOGIA DELLA MATEMATICA E ANALISI (CATENA DELLA DIMOSTRAZIONE RIGOROSA)
1. **Separazione Cristallina di Ipotesi e Tesi:**
   - Per ciascun teorema o lemma, elenca chiaramente le ipotesi $H$ e la tesi $Th$.
2. **Dimostrazioni Senza Omissioni:**
   - Struttura: *Ipotesi $\\to$ Costruzione logica (diretta, per assurdo, per induzione) $\\to$ Passaggi algebrici/analitici espliciti $\\to$ Conclusione $\\blacksquare$*.
   - Vietato scrivere "è facile verificare che" o "si dimostra banalmente".
3. **Studio Critico delle Ipotesi e Controesempi:**
   - Mostra sistematicamente cosa accade se cade una delle ipotesi (es. Teorema di Rolle senza derivabilità, Teorema di Weierstrass senza intervallo compatto).
4. **Analisi Asintotica e Stime:**
   - Usa rigorosamente i simboli di Landau ($o$-piccolo, $\\mathcal{O}$-grande, equivalenza asintotica $\\sim$) definendone l'intorno di validità.
5. **Eserciziario d'Esame:**
   - Studio di funzioni, integrali complessi, serie numeriche ed equazioni differenziali svolti con tutti i passaggi algebrici e verifica dei risultati (es. verifica della primitiva mediante derivazione).`;
  }
}

module.exports = { MathEpistemology };
