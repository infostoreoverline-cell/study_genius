# PROTOCOLLO DI FUNZIONAMENTO: MATEMATICA & ANALISI
**Studio e Compilazione Didattica per Analisi Matematica, Geometria e Algebra Lineare**

---

## 1. Visione d'Insieme & Catena della Dimostrazione
Quando selezioni **Matematica** (o Analisi / Geometria), il sistema attiva la classe `MathEpistemology` (`src/epistemology/math.js`).

L'intero impianto matematico segue la **Catena della Dimostrazione Rigorosa**:

$$\text{Definizione Formale} \longrightarrow \text{Ipotesi } (H) \longrightarrow \text{Costruzione Logica} \longrightarrow \text{Tesi } (Th) \longrightarrow \text{Dimostrazione Punto per Punto} \longrightarrow \text{Controesempi} \longrightarrow \text{Corollari}$$

---

## 2. Separazione Cristallina tra Ipotesi e Tesi
Per ciascun teorema, proposizione o lemma, la formulazione didattica isola in modo categorico:
* **Ipotesi ($H$):** L'insieme completo e minimale delle condizioni di partenza (es. regolarità della funzione, compattezza del dominio, intervallo chiuso e limitato $[a, b]$, derivabilità in $(a, b)$).
* **Tesi ($Th$):** La proprietà geometrica o analitica che viene rigorosamente affermata.

---

## 3. Dimostrazioni Senza Omissioni (Zero Salti Logici)
Il sistema adotta uno standard privo di scorciatoie opache:
1. **Dichiarazione del Metodo di Dimostrazione:**
   - Dimostrazione diretta costruttiva;
   - Dimostrazione per assurdo (assunzione di $\neg Th$ e derivazione di una contraddizione con $H$);
   - Dimostrazione per induzione su $n \in \mathbb{N}$ (Base dell'induzione per $n_0 \to$ Passo induttivo $P(k) \implies P(k+1)$).
2. **Divieto Assoluto di Formule Magiche:**
   - È categoricamente vietato l'uso di formule liquidatorie quali: *"è banale"*, *"è facile verificare che"*, *"con ovvi passaggi"*.
   - Ogni manipolazione algebrica complessa, cambio di variabile, integrazione per parti o passaggio al limite viene mostrato passo-passo.

---

## 4. Studio Critico delle Ipotesi e Controesempi Didattici
Per preparare lo studente all'esame orale, dove i docenti testano la reale comprensione delle ipotesi, il sistema include sempre l'analisi dei controesempi:
* *Cosa accade se cade una sola ipotesi?*
  - Es. **Teorema di Rolle:** Se la funzione è continua in $[a, b]$ e $f(a)=f(b)$ ma NON è derivabile anche solo in un punto (es. $f(x) = |x|$ su $[-1, 1]$), il punto a tangente orizzontale non esiste (punto angoloso).
  - Es. **Teorema di Weierstrass:** Se l'intervallo è aperto o non limitato (es. $f(x) = \frac{1}{x}$ su $(0, 1]$), la funzione non ammette massimo.

---

## 5. Analisi Asintotica e Notazione di Landau
* Impiego rigoroso dei simboli di Landau:
  * **$o$-piccolo ($o(g(x))$):** Ordine di infinitesimo superiore;
  * **$\mathcal{O}$-grande ($\mathcal{O}(g(x))$):** Limitazione asintotica superiore;
  * **Equivalenza asintotica ($\sim$):** Rapporto tendente a 1.
* Ogni stima asintotica o sviluppo di Taylor specifica sempre l'intorno di validità esatto (es. per $x \to 0$ o per $x \to +\infty$).

---

## 6. Eserciziario d'Esame con Verifica a Ritroso
Negli esercizi analitici (studi di funzione, calcolo integrale, serie numeriche, EDO):
1. **Equazioni Differenziali:** Vengono calcolati separatamente l'integrale generale dell'omogenea associata ($y_0(x)$) e l'integrale particolare ($y_p(x)$) tramite metodo di somiglianza o variazione delle costanti di Lagrange.
2. **Controllo della Primitiva:** Per ogni integrale calcolato, viene eseguita e mostrata la verifica derivando a ritroso il risultato:
   $$\frac{d}{dx}\left[ F(x) \right] = f(x)$$
   per dare la certezza matematica del risultato ottenuto.
