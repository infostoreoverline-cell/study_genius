/**
 * StudyGenius Academic Intelligence System
 * src/epistemology/chemistry.js
 * 
 * Epistemologia della Chimica e Chimica Analitica:
 * Fenomeno microscopico -> Specie coinvolte -> Modello -> Equilibrio/Reazione -> 
 * Formalizzazione quantitativa -> Approssimazioni e verifica -> Interpretazione
 */

class ChemistryEpistemology {
  toPromptDirective() {
    return `### EPISTEMOLOGIA DELLA CHIMICA E CHIMICA ANALITICA (CATENA DEL RIGORE STECHIOMETRICO)
1. **Intuizione Microscopica:**
   - Spiega cosa accade a livello di ioni, legami, orbitali e solvatazione prima di scrivere le formule.
2. **Reazioni Stechiometriche e Stati Fisici:**
   - Riporta sempre gli stati di aggregazione esatti: $(s), (l), (g), (aq)$.
   - Usa $\\rightleftharpoons$ per reazioni reversibili all'equilibrio e $\\rightarrow$ per reazioni quantitative a completamento.
   - Mostra il bilanciamento redox completo con metodo ionico-elettronico (semireazioni di ossidazione e riduzione, bilancio di massa, elettroni scambiati).
3. **Equilibri Multipli e Chimica Analitica Rigorosa:**
   - Adotta il sistema delle 4 equazioni fondamentali per ogni sistema in soluzione acquosa:
     1. Equilibrio chimico ($K_a, K_b, K_{ps}, K_f$);
     2. Autoprotolisi dell'acqua ($K_w = [H_3O^+][OH^-]$);
     3. Bilancio di Massa (Conservazione degli atomi);
     4. Bilancio di Carica (Elettroneutralità).
   - In ogni esercizio, usa tabelle I.C.E. (Iniziale, Variazione, Equilibrio).
   - Dimostra e verifica sempre la validità delle approssimazioni adottate (regola del 5% per acidi deboli e precipitazioni).
4. **Elettrochimica:**
   - Distingui nettamente catodo (riduzione) e anodo (ossidazione).
   - Applica l'equazione di Nernst a $25^\\circ\\text{C}$ con quoziente di reazione $Q$ e potenziale standard $E^\\circ$.`;
  }
}

module.exports = { ChemistryEpistemology };
