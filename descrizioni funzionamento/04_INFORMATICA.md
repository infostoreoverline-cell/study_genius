# PROTOCOLLO DI FUNZIONAMENTO: INFORMATICA & ALGORITMI
**Studio e Compilazione Didattica per Teoria degli Algoritmi, Strutture Dati e Programmazione**

---

## 1. Visione d'Insieme & Catena dell'Invariante
Quando selezioni **Informatica** (o Algoritmi / Programmazione), il sistema attiva la classe `ComputerScienceEpistemology` (`src/epistemology/computerScience.js`).

Il modulo segue la **Catena dell'Invariante e della Complessità**:

$$\text{Problema Computazionale} \longrightarrow \text{Pre/Post-condizioni} \longrightarrow \text{Intuizione Strategica} \longrightarrow \text{Pseudocodice} \longrightarrow \text{Invariante di Ciclo} \longrightarrow \text{Complessità } \mathcal{O}, \Omega, \Theta \longrightarrow \text{Casi Limite}$$

---

## 2. Modellazione Formale del Problema
Prima di scrivere qualsiasi riga di codice, il sistema formalizza la specifica:
* **Input & Precondizioni:** Tipo di dati in ingresso, vincoli di dimensione, condizioni di ordinamento o connettività (es. *"Un grafo orientato $G=(V, E)$ privo di cicli negativi"*).
* **Output & Postcondizioni:** Proprietà esatta che la funzione deve garantire al termine dell'elaborazione (es. *"Un albero dei cammini minimi dalla sorgente $s$ a ogni vertice $v \in V$"*).

---

## 3. Intuizione Algoritmica & Paradigmi di Progettazione
Il sistema spiega l'idea concettuale prima del codice formale, inquadrandola nel rispettivo paradigma:
* **Greedy:** Criterio di scelta locale ottima e dimostrazione della proprietà della scelta greedy;
* **Divide et Impera:** Suddivisione del problema, risoluzione ricorsiva dei sottoproblemi e combinazione dei risultati;
* **Programmazione Dinamica (DP):** Sottostruttura ottima, sovrapposizione dei sottoproblemi, equazione di ricorrenza di Bellman e memoization / tabella bottom-up;
* **Backtracking:** Esplorazione dello spazio delle soluzioni con potatura dell'albero di ricerca.

---

## 4. Dimostrazione Formale di Correttezza (Invarianti di Ciclo)
Per ogni algoritmo iterativo fondamentale, viene formulato e dimostrato l'**Invariante di Ciclo**:
1. **Inizializzazione:** L'invariante è vero prima della prima iterazione del ciclo;
2. **Conservazione:** Se l'invariante è vero prima di un'iterazione, rimane vero prima dell'iterazione successiva;
3. **Terminazione:** All'uscita dal ciclo (dopo un numero finito di passi), l'invariante fornisce la proprietà richiesta dalla postcondizione.

---

## 5. Analisi Asintotica di Complessità Temporale e Spaziale
1. **Notazioni Asintotiche Rigorose:**
   * $\mathcal{O}(f(n))$: Limite superiore asintotico (caso peggiore);
   * $\Omega(f(n))$: Limite inferiore asintotico (caso migliore);
   * $\Theta(f(n))$: Delimitazione asintotica stretta (comportamento medio o costante).
2. **Risoluzione delle Equazioni di Ricorrenza:**  
   Per gli algoritmi ricorsivi (es. MergeSort, QuickSort, ricerca binaria), la complessità $T(n) = a T(n/b) + f(n)$ viene risolta esplicitando il metodo:
   * **Master Theorem (Teorema Principale):** Confronto tra $f(n)$ e $n^{\log_b a}$ nei 3 casi canonici;
   * **Albero di Ricorsione:** Somma del lavoro svolto ad ogni livello dell'albero e conteggio della profondità.
3. **Complessità Spaziale:** Distinzione tra memoria ausiliaria allocata (heap/array) e overhead dello stack di ricorsione.

---

## 6. Casi Limite e Trappole d'Esame
Ogni implementazione include il controllo dei casi limite classici d'esame:
* Strutture dati vuote o liste con un solo elemento ($n=0, n=1$);
* Elementi o chiavi duplicate;
* Grafi non connessi o grafi ciclici;
* Overflow di indici o tipi numerici interi.
