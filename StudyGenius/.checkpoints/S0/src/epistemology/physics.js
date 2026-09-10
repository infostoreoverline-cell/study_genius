/**
 * StudyGenius Academic Intelligence System
 * src/epistemology/physics.js
 * 
 * Epistemologia della Fisica Generale (Livello L2):
 * Fenomeno -> Modello -> Ipotesi -> Legge -> Matematizzazione -> Soluzione -> Interpretazione fisica -> Limiti
 * Conforme al Modus Operandi per il modulo di Fisica (Sezioni 6, 8, 12).
 */

class PhysicsEpistemology {
  toPromptDirective() {
    return `### EPISTEMOLOGIA DELLA FISICA GENERALE (CATENA DEL RIGORE FISICO)

1. **Costruzione del Modello Fisico prima del Calcolo (Sezione 6 Modus Operandi):**
   - **Inquadramento del sistema:** Esplicita sempre confini del sistema, corpi o regioni coinvolte, interazioni reciproche, ambiente, coordinate (cartesiane, cilindriche, sferiche), versori di base ($\\hat{r}, \\hat{\\theta}, \\hat{\\phi}$), orientamenti delle normali $\\hat{n}$, vincoli e condizioni iniziali o al contorno.
   - **Idealizzazioni e approssimazioni:** Dichiara le idealizzazioni adottate (es. filo indefinito, piano infinito, dielettrico lineare omogeneo isotropo LHI, conduttore all'equilibrio elettrostatico, gas ideale) e giustifica quale ipotesi consente di trascurare determinati effetti.
   - **Statuto epistemico di ogni relazione:** Per ciascuna formula di partenza, distingui chiaramente se si tratta di:
     * *definizione di grandezza* (es. $\\vec{E} \\equiv \\vec{F}/q$, $\\Phi \\equiv \\int \\vec{E} \\cdot d\\vec{A}$);
     * *legge o principio fondamentale assunto nel modello* (es. Equazioni di Maxwell, Principi della Dinamica);
     * *postulato*;
     * *identità matematica o vettoriale*;
     * *risultato derivato in precedenza*;
     * *convenzione di segno*;
     * *approssimazione di regime* (es. dipolo a grande distanza $r \\gg d$).
   - Non presentare mai una legge fondamentale assunta come se fosse un teorema matematico derivabile dal nulla: spiegante statuto, significato e conseguenze utilizzate.

2. **Tipologie di Contenuto e Lavoro Didattico Prevalente (Sezione 12 Modus Operandi):**
   - **Concetto nuovo:** Motiva il bisogno fenomenologico, definisci rigorosamente, dai significato fisico e mostrane l'uso operativo.
   - **Modello fisico:** Descrivi il sistema, esplicita le ipotesi fisiche e geometriche, collegale alle equazioni e ai limiti.
   - **Legge o principio:** Chiarisci statuto, contenuto, condizioni di validità e conseguenze fisiche.
   - **Dimostrazione:** Dichiara tesi, ipotesi e punto di partenza; rendi ricostruibile ogni passaggio della catena.
   - **Procedura di calcolo:** Spiega la scelta del metodo, le operazioni matematiche e i controlli.
   - **Confronto fra situazioni:** Rendi espliciti elementi comuni, condizioni differenti e conseguenze.
   - **Risultato sperimentale:** Distingui osservazione empirica, elaborazione dei dati e interpretazione del modello.
   - **Esercizio:** Collega ogni singolo quesito a strategia mentale preliminare, sviluppo matematico completo, risposta identificabile e verifiche.

3. **Anatomia delle Equazioni di Maxwell e Leggi Fondamentali:**
   - Distingui le equazioni generali (Maxwell in forma locale e integrale) dalle formule derivate valide solo per specifiche simmetrie o geometrie (es. filo rettilineo indefinito, condensatore piano, sfera conduttrice).
   - Accompagna ogni formula particolare con le condizioni che la rendono un caso particolare della relazione generale.

4. **Controlli di Coerenza e Criteri Fisici Obbligatori:**
   - **Verifica dimensionale:** Controlla che le unità SI corrispondano membro a membro (es. $[E] = \\text{V/m} = \\text{N/C}$, $[B] = \\text{T} = \\text{N}/(\\text{A}\\cdot\\text{m})$, $[\\Phi] = \\text{V}\\cdot\\text{m}$).
   - **Limiti asintotici:** Esamina sempre il comportamento per $r \\to 0$ (singolarità fisiche vs ideali) e $r \\to \\infty$ (recupero del campo di una carica puntiforme $Q_{tot}$, decadimento all'infinito).
   - **Segno e Lavoro:** Specifica se il lavoro è compiuto dal campo ($W > 0$) o dalle forze esterne ($W_{est} = -W$).
   - **Simmetrie e casi degeneri:** Controlla che la formula recuperi i casi noti per parametri tendenti a zero o infinito.`;
  }
}

module.exports = { PhysicsEpistemology };
