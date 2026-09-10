# ARCHIVIO PROTOCOLLI DIDATTICI: STUDYGENIUS
**Manuali Operativi e Specifiche di Funzionamento per Categoria**

Questa cartella raccoglie i documenti tecnici e didattici che descrivono nel dettaglio il funzionamento di ogni singolo modulo e comportamento di **StudyGenius**.

---

## 📚 Indice dei Protocolli per Categoria

### Sezione 1: Le Epistemologie Disciplinari (Come Lavorano le Materie)
1. ⚛️ **[01_FISICA.md](01_FISICA.md)**  
   *Catena del rigore fisico, modello prima del calcolo, statuto epistemico delle formule, equazioni di Maxwell, controlli di coerenza dimensionale, asintotica e segno del lavoro.*
2. 📐 **[02_MATEMATICA.md](02_MATEMATICA.md)**  
   *Catena della dimostrazione rigorosa, separazione netta tra Ipotesi ($H$) e Tesi ($Th$), divieto di formule magiche ("è banale"), studio sistematico dei controesempi e Landau.*
3. 🧪 **[03_CHIMICA.md](03_CHIMICA.md)**  
   *Catena del rigore stechiometrico, intuizione microscopica, stati fisici obbligatori, bilanciamento redox ionico-elettronico, le 4 equazioni degli equilibri multipli, tabelle I.C.E. e regola del 5%.*
4. 💻 **[04_INFORMATICA.md](04_INFORMATICA.md)**  
   *Catena dell'invariante e della complessità, pre/post-condizioni, paradigmi algoritmici, dimostrazione di correttezza con invarianti di ciclo, complessità asintotica ($\mathcal{O}, \Omega, \Theta$) e Master Theorem.*
5. 📜 **[05_STORIA.md](05_STORIA.md)**  
   *Rifiuto della cronologia piatta, nessi causali profondi e processi di lungo periodo, critica delle fonti, dialettica storiografica comparata, estensioni al Diritto e all'Economia.*

---

### Sezione 2: Le Modalità di Studio & Focus Didattico
6. 📑 **[06_SINTESI_ACCADEMICA.md](06_SINTESI_ACCADEMICA.md)**  
   *Modalità ad alta densità per manuali e libri da 500+ pagine: eliminazione di digressioni e convenevoli del libro senza tagliare formule, dimostrazioni o rigore d'esame.*
7. 🎓 **[07_MODALITA_COMPLETA.md](07_MODALITA_COMPLETA.md)**  
   *Trattazione estesa per dispense e slide: teoria parlata, intuizione fenomenologica, derivazioni senza salti e svolgimento di tutti gli esercizi sorgente.*
8. 📖 **[08_MODALITA_FOCUS.md](08_MODALITA_FOCUS.md)**  
   *Confronto tra Focus Teoria & Dimostrazioni (esame orale, scomposizione formule, controesempi) e Focus Eserciziario Guidato (esame scritto, protocollo in 7 passi per ogni problema).*

---

### Sezione 3: Scope, Filtri e Personalizzazione
9. 🔍 **[09_FOCUS_ASSISTITO.md](09_FOCUS_ASSISTITO.md)**  
   *Funzionamento del pulsante "Analizza Capitoli del Libro", estrazione automatica dell'indice tramite Gemini Vision e selezione rapida con Topic Chips interattivi.*
10. 🎯 **[10_INSERIMENTO_ARGOMENTO_SCOPE.md](10_INSERIMENTO_ARGOMENTO_SCOPE.md)**  
    *Cosa accade quando indichi argomenti o capitoli: parsing di intervalli ("dal 3 al 6"), filtraggio chirurgico del testo estratto (`scopeService.js`) e vincolo di focalizzazione.*
11. ✏️ **[11_ISTRUZIONI_AGGIUNTIVE.md](11_ISTRUZIONI_AGGIUNTIVE.md)**  
    *Cosa accade quando aggiungi un'istruzione nel riquadro testo: iniezione nel Livello L5 del Prompt Compiler, ricalibrazione del focus e rispetto degli Invarianti di Livello 0.*

---

### Sezione 4: Persistenza e Gestione Dati
12. 💾 **[12_SALVATAGGIO_SESSIONI.md](12_SALVATAGGIO_SESSIONI.md)**  
    *Percorso sul filesystem (`StudyGenius/sessions/<Materia>/`), anatomia dei file (`.md`, `.json`, `_blueprint`, `_coverage`, `_knowledgeGraph`, `subject_kb.json`), autosave, sidebar ed esportazione PDF tipografica.*
