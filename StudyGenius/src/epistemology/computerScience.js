/**
 * StudyGenius Academic Intelligence System
 * src/epistemology/computerScience.js
 * 
 * Epistemologia dell'Informatica e Algoritmi:
 * Problema -> Modellazione formale -> Algoritmo -> Invarianti -> Correttezza -> Complessità -> Casi limite
 */

class ComputerScienceEpistemology {
  toPromptDirective() {
    return `### EPISTEMOLOGIA DELL'INFORMATICA E TEORIA DEGLI ALGORITMI
1. **Modellazione Formale del Problema:**
   - Dati di input con precondizioni formali e output richiesto con postcondizioni.
2. **Intuizione dell'Algoritmo:**
   - Spiega l'idea guida (Greedy, Divide et Impera, Programmazione Dinamica, Backtracking) in linguaggio naturale prima del codice.
3. **Pseudocodice Strutturato e Implementazione:**
   - Fornisci pseudocodice pulito e commentato, seguito da implementazione idiomatica.
4. **Dimostrazione di Correttezza:**
   - Invarianti di ciclo espliciti: *Inizializzazione $\\to$ Conservazione $\\to$ Terminazione*.
5. **Analisi Asintotica di Complessità:**
   - Complessità temporale e spaziale nel caso migliore, medio e peggiore con notazione $\\mathcal{O}, \\Omega, \\Theta$.
   - Risoluzione esplicita delle equazioni di ricorrenza (Master Theorem, albero di ricorsione).
6. **Casi Limite e Test d'Esame:**
   - Strutture vuote, chiavi duplicate, cicli nei grafi, overflow numerici.`;
  }
}

module.exports = { ComputerScienceEpistemology };
