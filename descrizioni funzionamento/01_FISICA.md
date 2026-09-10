# PROTOCOLLO DI FUNZIONAMENTO: FISICA
**Studio e Compilazione Didattica per la Fisica Generale e Sperimentale**

---

## 1. Visione d'Insieme & Catena del Rigore Fisico
Quando selezioni **Fisica** in StudyGenius, il sistema attiva la classe `PhysicsEpistemology` (`src/epistemology/physics.js`) e aggancia le regole del Modus Operandi di Fisica (`.agents/rules/modus_operandi_fisica.md`).

L'intero processo segue rigorosamente la **Catena del Rigore Fisico**:

$$\text{Fenomeno Sperimentale} \longrightarrow \text{Modello Fisico} \longrightarrow \text{Ipotesi \& Geometria} \longrightarrow \text{Statuto Epistemico} \longrightarrow \text{Matematizzazione Esplicita} \longrightarrow \text{Interpretazione} \longrightarrow \text{Controlli}$$

---

## 2. Costruzione del Modello Fisico prima del Calcolo
Il sistema non inizia mai un calcolo senza aver prima definito geometricamente e fisicamente il sistema:
1. **Confini e Corpi:** Vengono esplicitati i confini della regione in esame, i corpi coinvolti, le sorgenti e l'ambiente circostante.
2. **Sistema di Coordinate e Versori:** Vengono dichiarate le coordinate (cartesiane, cilindriche o sferiche) e i versori di riferimento ($\hat{r}, \hat{\theta}, \hat{\phi}, \hat{i}, \hat{j}, \hat{k}$), specificando l'orientamento delle normali alle superfici ($\hat{n}$) e le condizioni iniziali o al contorno.
3. **Idealizzazioni Fisiche:** Vengono dichiarate formalmente le idealizzazioni adottate (es. filo indefinito, piano infinito, dielettrico lineare omogeneo isotropo LHI, conduttore all'equilibrio elettrostatico, gas ideale, attrito trascurabile) con la giustificazione fisica del perché certi effetti secondari vengono trascurati.

---

## 3. Statuto Epistemico di ogni Relazione
Il sistema impedisce che una legge fondamentale sia spacciata per un teorema derivato dal nulla. Per ogni formula di partenza viene dichiarato il suo statuto:
* **Definizione di grandezza:** (es. $\vec{E} \equiv \frac{\vec{F}}{q_0}$, $\Phi \equiv \int \vec{E} \cdot d\vec{A}$).
* **Legge o principio fondamentale assunto nel modello:** (es. Equazioni di Maxwell, Principi di Newton, Legge di Coulomb).
* **Postulato:** (es. Invarianza della velocità della luce).
* **Identità vettoriale o geometrica:** (es. $\vec{\nabla} \times (\vec{\nabla} \phi) = \vec{0}$).
* **Approssimazione di regime:** (es. dipolo a grande distanza $r \gg d$, piccole oscillazioni $\sin\theta \approx \theta$).

---

## 4. Anatomia delle Leggi: Maxwell e Formule Derivate
* Distinzione rigorosa tra **equazioni generali** (Maxwell in forma locale/differenziale e integrale) e **formule particolari** valide solo per simmetrie specifiche (es. Teorema di Gauss applicato a filo rettilineo, lastra piana o sfera).
* Ogni formula derivata è sempre accompagnata dalle ipotesi geometriche necessarie per applicarla.

---

## 5. Controlli di Coerenza Obbligatori
Prima di concludere qualsiasi trattazione o problema, il sistema verifica:
1. **Verifica Dimensionale:** Controllo membro a membro delle unità di misura SI (es. $[E] = \text{V/m} = \text{N/C}$, $[B] = \text{T} = \text{N}/(\text{A}\cdot\text{m})$, $[\Phi_E] = \text{V}\cdot\text{m}$).
2. **Limiti Asintotici:** Comportamento per $r \to 0$ (singolarità fisiche vs ideali) e $r \to \infty$ (recupero del campo di una carica puntiforme $Q_{tot}$).
3. **Segno e Lavoro:** Distinzione esplicita tra lavoro compiuto dal campo ($W > 0$) e lavoro delle forze esterne ($W_{est} = -W$).
4. **Simmetrie e Casi Degeneri:** Coerenza della formula quando parametri geometrici tendono a zero o a infinito.

---

## 6. Esempio di Standard Didattico (Passaggio Matematico Conforme)
Nel derivare il potenziale da un campo centrale:
* **Vietato:** *"Integrando si ottiene $V = \frac{q}{4\pi\varepsilon_0 r}$"*.
* **Standard StudyGenius:**  
  > *Partiamo dalla definizione di potenziale come integrale di linea del campo: $V(r) = -\int_{\infty}^r \vec{E} \cdot d\vec{l}$. Poiché il campo radiale è $\vec{E} = \frac{q}{4\pi\varepsilon_0 r'^2}\hat{r}$ e lo spostamento radiale è $d\vec{l} = dr'\,\hat{r}$, il prodotto scalare si riduce a $\vec{E} \cdot d\vec{l} = \frac{q}{4\pi\varepsilon_0 r'^2}dr'$. Portando fuori le costanti e integrando la funzione potenza $\int r'^{-2} dr' = -r'^{-1}$, otteniamo:*
  > $$V(r) = -\frac{q}{4\pi\varepsilon_0} \left[ -\frac{1}{r'} \right]_{\infty}^r = \frac{q}{4\pi\varepsilon_0}\left( \frac{1}{r} - 0 \right) = \boxed{\frac{q}{4\pi\varepsilon_0 r}}$$
