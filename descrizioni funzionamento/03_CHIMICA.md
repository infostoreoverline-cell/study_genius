# PROTOCOLLO DI FUNZIONAMENTO: CHIMICA & CHIMICA ANALITICA
**Studio e Compilazione Didattica per Chimica Generale, Inorganica e Analitica**

---

## 1. Visione d'Insieme & Catena del Rigore Stechiometrico
Quando selezioni **Chimica**, il sistema attiva la classe `ChemistryEpistemology` (`src/epistemology/chemistry.js`).

Il modulo chimico applica la **Catena del Rigore Stechiometrico**:

$$\text{Fenomeno Microscopico} \longrightarrow \text{Specie Chimiche Reali} \longrightarrow \text{Reazione Bilanciata} \longrightarrow \text{Sistema delle 4 Equazioni} \longrightarrow \text{Tabella I.C.E.} \longrightarrow \text{Verifica Approssimazioni (5\%)}$$

---

## 2. Intuizione Microscopica prima delle Formule
Prima di introdurre equazioni numeriche, il sistema chiarisce il meccanismo microscopico:
* Comportamento di ioni, molecole e solvente (es. sfera di solvatazione dell'acqua attorno ai cationi);
* Rottura e formazione di legami chimici (covalenti, ionici, legami a idrogeno);
* Aspetti termodinamici ($\Delta H, \Delta S, \Delta G$) e cinetici della reazione.

---

## 3. Notazione Stechiometrica & Bilanciamento Redox
1. **Stati di Aggregazione Obbligatori:**  
   Ogni specie chimica deve essere accompagnata dal suo stato fisico esatto:
   * Solido: $(s)$
   * Liquido puro: $(l)$
   * Gassoso: $(g)$
   * In soluzione acquosa: $(aq)$
2. **Frecce di Reazione:**  
   * $\rightleftharpoons$ per equilibri dinamici e reazioni reversibili;
   * $\rightarrow$ per reazioni quantitative a completamento (es. titolazioni forti o precipitazioni complete).
3. **Metodo Ionico-Elettronico per le Reazioni Redox:**  
   Il bilanciamento viene sempre mostrato attraverso tutti i passaggi:
   * Scrittura delle due semireazioni separate (ossidazione all'anodo, riduzione al catodo);
   * Bilancio di massa degli elementi che cambiano stato di ossidazione;
   * Bilancio dell'ossigeno mediante aggiunta di molecole di $\text{H}_2\text{O}$;
   * Bilancio dell'idrogeno mediante $\text{H}^+$ (ambiente acido) o $\text{OH}^-$ (ambiente basico);
   * Bilancio di carica mediante aggiunta esplicita di elettroni ($e^-$);
   * Moltiplicazione per i minimi coefficienti per pareggiare gli elettroni scambiati e somma algebrica finale.

---

## 4. Equilibri Multipli in Soluzione (Le 4 Equazioni Fondamentali)
In Chimica Analitica (calcolo del pH di acidi poliprotici, miscele tampone, idrolisi, precipitazioni con complessamento), il sistema non ricorre a formule precotte, ma imposta il sistema rigoroso completo:
1. **Equilibri Chimici:** Relazioni di equilibrio con relative costanti termodinamiche ($K_a, K_b, K_{ps}, K_f$).
2. **Autoprotolisi dell'Acqua:**
   $$K_w = [\text{H}_3\text{O}^+][\text{OH}^-] = 1.0 \times 10^{-14} \quad (\text{a } 25^\circ\text{C})$$
3. **Bilancio di Massa (Conservazione della Materia):**  
   Uguaglianza tra la concentrazione analitica iniziale introdotta e la somma delle concentrazioni di tutte le specie chimiche all'equilibrio (es. $C_{HA} = [\text{HA}] + [\text{A}^-]$).
4. **Bilancio di Carica (Condizione di Elettroneutralità):**  
   La somma delle cariche positive in moli/litro deve eguagliare la somma delle cariche negative:
   $$\sum z_i [C_i^{z+}] = \sum z_j [A_j^{z-}]$$

---

## 5. Tabelle I.C.E. & Verifica delle Approssimazioni
* Per ogni equilibrio chimico quantitativo viene allestita la **tabella I.C.E.**:
  * **I (Iniziale):** Concentrazioni analitiche o moli prima della reazione;
  * **C (Variazione - Change):** Variazioni stechiometriche espresse in funzione dell'avanzamento $x$ (es. $-x, +2x$);
  * **E (Equilibrio):** Espressioni algebriche all'equilibrio da sostituire nella legge di azione di massa.
* **Verifica della Regola del 5%:** Quando si trascura la dissociazione rispetto alla concentrazione iniziale ($C_0 - x \approx C_0$), il sistema calcola sempre a fine esercizio il rapporto percentuale:
  $$\frac{x}{C_0} \times 100 < 5\%$$
  Se la percentuale supera il 5%, il sistema rigetta l'approssimazione e risolve l'equazione di secondo grado completa.

---

## 6. Elettrochimica & Equazione di Nernst
* Distinzione netta tra semielemento anodico (ossidazione) e catodico (riduzione).
* Formulazione rigorosa dell'**Equazione di Nernst** a $25^\circ\text{C}$ ($298.15\text{ K}$):
  $$E = E^\circ - \frac{0.0592\text{ V}}{n} \log_{10} Q$$
  dove $n$ è il numero di moli di elettroni scambiati e $Q$ è il quoziente di reazione (con concentrazioni di soluti in $\text{mol/L}$ e pressioni parziali di gas in $\text{bar}$, escludendo solidi e liquidi puri aventi attività unitaria).
