# STUDYGENIUS — METODO E ARCHITETTURA DI INTELLIGENZA VISUALE MASTER

> **Documento Normativo Ufficiale per la Rappresentazione Epistemica della Conoscenza**  
> *Versione 1.0 — 9 Settembre 2026*  
> *Autorità normativa complementare a `STUDY_GENIUS_METODO_DIDATTICO_MASTER.md`*

---

## 1. La Direttiva Fondamentale

StudyGenius **non è un motore per inserire grafici nelle dispense**.  
StudyGenius è un **sistema di intelligenza visuale epistemica** progettato per:
1. Identificare la struttura epistemica della conoscenza nel materiale sorgente;
2. Determinare se, dove e perché una rappresentazione visuale migliora concretamente il modello mentale dello studente;
3. Confrontare liberamente rappresentazioni candidate e scegliere quella con la massima efficacia didattica ed editoriale;
4. Produrre visuali rigorosamente evidence-grounded con strumenti controllabili o deterministici;
5. Verificare la qualità accademica attraverso gate specializzati (deterministico, scientifico/semantico, didattico e post-rendering sulla pagina A4 stampata);
6. Garantire la copertura visuale dell'intero corso mediante una matrice pre-generazione e un audit post-generazione.

> 📌 **Regola d'Oro:** La decisione di non produrre una figura e mantenere il testo a teoria parlata o una tabella tipografica è una decisione didattica pienamente valida. Nessun visuale è sempre preferibile a un visuale inutile o decorativo.

---

## 2. Il Visual Coverage System (Copertura Globale della Conoscenza)

L'intelligenza visuale non può essere applicata a macchia di leopardo o lasciata alla discrezionalità non vincolata del modello durante lo streaming. Opera attraverso un ciclo chiuso in due fasi:

### 2.1 Fase Pre-Generazione: La Visual Coverage Matrix
Prima che venga redatta la prima riga di testo, il motore di pianificazione didattica analizza congiuntamente le sorgenti estratte, il Knowledge Graph e il Teaching Blueprint, compilando la **Visual Coverage Matrix**:

| Campo | Descrizione | Valori Ammessi / Esempio |
| :--- | :--- | :--- |
| **Concept / Source ID** | Entità concettuale o figura sorgente identificata | `Cloro-Soda / Cella a Membrana` |
| **Detected Structure** | Struttura intrinseca dell'informazione nella sorgente | `Flusso di materia multicompartimento` |
| **Cognitive Need** | Bisogno di comprensione dello studente | `Comprendere migrazione selettiva e separazione prodotti` |
| **Visual Level** | Livello di astrazione didattica richiesto | `ORIENTAMENTO` \| `COMPRENSIONE` \| `ANALISI` |
| **Strategic Decision** | Azione deliberata del sistema | `VISUALIZE` \| `RECONSTRUCT` \| `SYNTHESIZE` \| `CONVERT_TO_TABLE` \| `KEEP_AS_TEXT` |
| **Candidate Representations** | Set di rappresentazioni idonee da valutare | `[Flowsheet P&ID a blocchi, Schema a membrana con frecce ioniche]` |
| **Chosen Representation** | Forma finale selezionata con motivazione | `Schema vettoriale a membrana: isola la barriera cationica` |
| **Provenance Intent** | Origine dell'informazione visuale | `SOURCE_RECONSTRUCTED` \| `FORMULA_DERIVED` \| `MODEL_SYNTHESIZED` |
| **Pedagogical Why** | Scopo didattico esplicito verificabile | `Evidenziare perché Na+ passa e Cl-/OH- sono respinti` |

### 2.2 Fase Post-Generazione: Il Visual Coverage Audit
A generazione ultimata, il Quality Engine confronta il documento prodotto con la matrice iniziale:
* **Esigenze visuali pianificate:** $N$
* **Esigenze soddisfatte con successo:** $K$
* **Esigenze convertite motivatamente in tabella o testo:** $M$
* **Esigenze ingiustificatamente omesse:** $J$

Se $J > 0$ (un visuale promesso dalla matrice è assente senza spiegazione formale), il documento riceve un **Hard Fail di Copertura Visuale** e viene inviato a riparazione mirata.

---

## 3. Selezione Multi-Criterio delle Rappresentazioni Candidate

È vietata qualsiasi associazione dogmatica rigida di tipo "lookup table" (`Bisogno X ➔ Grafico Y obbligatorio`).  
Uno stesso bisogno didattico ammette diverse **Candidate Representations**. La selezione della forma ottimale è una decisione multi-criterio ponderata su 6 fattori:

```
                  ┌────────────────────────────────────────┐
                  │          FATTORE 1: CARDINALITÀ        │
                  │   Quanti nodi, parametri o specie?     │
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────┴─────────────────────┐
                  │     FATTORE 2: COMPLESSITÀ RELAZIONI   │
                  │  Lineare, ciclica, reticolare, gerarchica│
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────┴─────────────────────┐
                  │    FATTORE 3: LIVELLO DIDATTICO TARGET │
                  │  Orientamento | Comprensione | Analisi │
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────┴─────────────────────┐
                  │      FATTORE 4: GEOMETRIA PAGINA A4    │
                  │   Spazio verticale, orizzontale, break │
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────┴─────────────────────┐
                  │        FATTORE 5: NATURA SORGENTE      │
                  │  Slide con schema, testo, equazioni    │
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────┴─────────────────────┐
                  │     FATTORE 6: INTENTO PEDAGOGICO      │
                  │  Intuizione qualitativa vs calcolo esatto│
                  └──────────────────┬─────────────────────┘
                                     ▼
                      SCELTA DELLA RAPPRESENTAZIONE
```

### Esempio Operativo:
* *Bisogno didattico*: Classificare le tecnologie di cella cloro-alcali (mercurio, diaframma, membrana).
  * Se l'obiettivo è il confronto multidimensionale su 6 parametri ingegneristici $\rightarrow$ **Comparative Matrix tipografica**.
  * Se l'obiettivo è la separazione spaziale anolita/catolita $\rightarrow$ **Schema di Cella Vettoriale**.
  * Se l'obiettivo è l'evoluzione storica e la dismissione $\rightarrow$ **Timeline Evolutiva**.

---

## 4. Onestà Epistemica & Evidence-Grounding

Ogni elemento visuale deve dichiarare in modo inequivocabile la propria provenienza. È severamente vietato allucinare componenti impiantistici, frecce di flusso o curve funzionali basandosi su stereotipi generativi.

### Le 5 Classi di Provenienza:
1. **`SOURCE_EXACT`**: Dati, geometrie, valori numerici o strutture direttamente estratti dalla sorgente documentale.
2. **`FORMULA_DERIVED`**: Tracciati, curve e superfici calcolati deterministicamente da equazioni fisiche, chimiche o economiche verificate ($E = E^\circ - \frac{RT}{nF}\ln Q$, bilanci stechiometrici, leggi di conservazione).
3. **`SOURCE_RECONSTRUCTED`**: Figure, schemi a blocchi o flowcharts presenti nelle slide originali e ridisegnati vettorialmente secondo la grammatica editoriale StudyGenius.
4. **`MODEL_SYNTHESIZED`**: Nuove metafore didattiche, roadmap o matrici create dal sistema per colmare un vuoto pedagogico della sorgente.
5. **`MODEL_SIMULATED`**: Scenari parametrici simulati a scopo di esercitazione.

> ⚠️ **Regola Anti-Allucinazione:** Se un componente non compare nella sorgente (es. il "denuder", che appartiene alla cella a mercurio e NON alla cella a membrana), è vietato inserirlo nello schema della cella a membrana. Il modello deve disegnare unicamente ciò che è comprovato dalla fonte o dedotto per via termodinamica/stechiometrica.

---

## 5. Divieto Assoluto di Pseudo-Visualizzazioni

Non sono considerate visualizzazioni accademiche:
* Alberi gerarchici simulati in blocchi di codice monospace con caratteri ASCII (`├──`, `└──`, `│`);
* Diagrammi di flusso disegnati con frecce di testo e spaziature (`[ A ] ---> [ B ]`);
* Schemi a box ricavati da righe di trattini (`+------+`).

### Regola di Risoluzione:
Se il concetto richiede una visualizzazione, deve essere renderizzato come **vero artefatto visuale** (vettoriale SVG, diagramma formale o layout editoriale strutturato).  
Se non è possibile garantire una resa visuale impeccabile, si applica la **Degradazione Nobile**:
1. Conversione in **tabella accademica formattata con badge e gerarchie**;
2. Oppure conversione in **elenco strutturato a callout tematici**;
3. Oppure sviluppo discorsivo a **teoria parlata**.

---

## 6. Il Protocollo di Ermeneutica Integrata (Testo ⟷ Visuale)

Nessun artefatto visuale può essere introdotto in modo passivo o decorativo. Ogni figura deve formare un'unità logica indivisibile con il testo che la circonda, articolata in 4 passaggi:

1. **Introduzione Didattica Motivante:** Qual è il fenomeno o la domanda fondamentale a cui questo schema/grafico risponde?
2. **L'Artefatto Visuale:** Renderizzato con assi leggibili, notazione LaTeX uniforme, unità SI e badge di provenienza.
3. **Lettura Guidata dei Parametri:** Guida esplicita per lo studente: cosa guardare, quale asse seguire, cosa rappresenta ciascun colore/flusso, dove si trova il punto di lavoro o la transizione critica.
4. **Trabocchetto Interpretativo d'Esame:** Messa in guardia esplicita dall'errore concettuale più frequente che lo studente compie interpretando questo grafico.

---

## 7. Il Sistema di Visual QA Disaccoppiato

La verifica della qualità visuale non è un'operazione monolitica affidata a un singolo strumento. Si articola in **4 auditor specializzati**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. DETERMINISTIC QA ENGINE                                             │
│    • Valida scale, range numerici, unità SI, formule matematiche       │
│    • Verifica bounding box, assenza di collisioni testo-grafica        │
│    • Controlla che le curve rispettino i vincoli asintotici            │
├────────────────────────────────────────────────────────────────────────┤
│ 2. SEMANTIC & SCIENTIFIC AUDITOR                                       │
│    • Confronta l'artefatto con il Knowledge Graph e l'Evidence Layer   │
│    • Verifica che le reazioni chimiche e i bilanci di materia tornino   │
│    • Verifica la consistenza tra claims del testo e valori del grafico │
├────────────────────────────────────────────────────────────────────────┤
│ 3. DIDACTIC CRITIC                                                     │
│    • Valuta la riduzione del carico cognitivo estraneo                 │
│    • Controlla che sia presente la Lettura Guidata nel testo            │
│    • Verifica che l'artefatto risponda al Pedagogical Why dichiarato   │
├────────────────────────────────────────────────────────────────────────┤
│ 4. RENDERED ARTIFACT INSPECTOR (Post-Layout su Pagina A4)              │
│    • Valuta il layout reale nel documento compilato                    │
│    • Verifica font size effettivo (minimo 9pt per la stampa)           │
│    • Previene salti pagina anomali (page-break-inside: avoid)          │
│    • Controlla margini, contrasto cromatico e respiro tipografico      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Graduazione dei Difetti: Hard Fail vs Quality Deficiency

Il sistema distingue rigorosamente tra violazioni che compromettono la validità dell'opera e difetti migliorabili:

### 🔴 HARD FAIL (Rifiuto Categorico della Pubblicazione):
* Dati scientificamente, chimicamente o matematicamente falsi;
* Incoerenza e contraddizione palese tra testo e figura;
* Testo o tracciati tagliati (clipping / overflow) nella pagina A4;
* Font microscopici illeggibili (< 8pt nella stampa finale);
* Significato errato di frecce (es. freccia di equilibrio al posto di freccia irreversibile);
* Falsa attribuzione della provenienza (spacciare per esatto un dato approssimativo o simulato);
* Visuale pianificato nella *Visual Coverage Matrix* omesso senza motivazione registrata.

*Azione*: Il capitolo non viene pubblicato; il modulo interessato viene reinviato a generazione o riparazione chirurgica.

### 🟡 QUALITY DEFICIENCY (Miglioramento Graduato):
* Composizione grafica migliorabile o densità leggermente elevata;
* Roadmap buona ma migliorabile nel bilanciamento dei pesi;
* Scelta rappresentativa didatticamente valida ma non ottimale.

*Azione*: Valutazione di un'alternativa candidate; se il tempo o il budget computazionale non consentono il miglioramento, l'artefatto viene conservato con una nota di audit senza bloccare la dispensa.

---

## 9. I Tre Livelli Didattici del Visuale

Ogni visuale appartiene a uno specifico livello di profondità:

1. **Livello 1: Orientamento**
   * *Scopo*: Rispondere a «Quali sono i grandi blocchi e la direzione di questo argomento?».
   * *Forme tipiche*: Roadmap a tappe, panoramiche concettuali, percorsi numerati.
2. **Livello 2: Comprensione**
   * *Scopo*: Rispondere a «Come sono collegati i concetti, quali meccanismi avvengono e perché?».
   * *Forme tipiche*: Cicli catalitici, flowsheets a blocchi funzionali, matrici comparative, schemi di trasporto ionico.
3. **Livello 3: Analisi Quantitativa**
   * *Scopo*: Rispondere a «Quali valori numerici, derivazioni e parametri governano il sistema?».
   * *Forme tipiche*: Grafici scientifici multi-curva D3, diagrammi di stato, curve cinetiche con punti operativi e controlli dimensionali.

---

## 10. End-State Verificabile

Al termine del processo di compilazione di una dispensa universitaria StudyGenius:
1. Non esiste alcuna figura inserita per mero scopo decorativo;
2. Non esiste alcun diagramma monospace o albero ASCII;
3. Ogni visuale soddisfa un bisogno cognitivo esplicitato nella Coverage Matrix;
4. Ogni visuale è evidence-grounded con badge di provenienza trasparente;
5. Ogni visuale viene introdotto, letto nei dettagli e sfruttato per anticipare trabocchetti d'esame;
6. La qualità finale è certificata sul documento A4 renderizzato post-layout.
