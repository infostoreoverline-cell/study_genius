# Protocollo Anti-Black-Box: Tabella di Conversione Epistemica

Nello spiegare qualsiasi concetto o passaggio analitico, le seguenti formule opache sono severamente vietate e devono essere obbligatoriamente sostituite con la loro motivazione causale o geometrica completa.

---

| Formula Opaca Vietata | Difetto Epistemico | Sostituzione Obbligatoria Richiesta |
|---|---|---|
| *"Per simmetria si ha..."* | Nasconde l'invarianza geometrica che giustifica la semplificazione. | Specificare il tipo di invarianza (rotazionale, traslazionale, riflessiva), la coordinata da cui la grandezza non può dipendere e perché le componenti ortogonali si annullano. |
| *"È evidente che..." / "È banale che..."* | Presume una conoscenza pregressa che spesso nasconde una trappola d'esame. | Esplicitare l'assioma, la definizione o il passaggio algebrico/logico che produce immediatamente tale conclusione. |
| *"Integrando si ottiene..."* | Omette gli estremi di integrazione, il cambio di variabile e le condizioni al contorno. | Mostrare l'integrale definito con estremi fisici, la primitiva e l'applicazione del teorema fondamentale del calcolo. |
| *"Analogamente per il caso Y..."* | Assume che le condizioni al contorno siano identiche quando spesso non lo sono. | Dichiarare quali ipotesi restano invariate e quale singola variazione di parametro o segno differenzia il caso Y. |
| *"Da cui segue facilmente..."* | Salta passaggi algebrici non banali in cui lo studente tipicamente sbaglia i segni o i coefficienti. | Mostrare il passaggio algebrico chiave (raccoglimento, razionalizzazione, sostituzione o semplificazione). |
| *"Trascurando i termini di ordine superiore..."* | Omette la giustificazione analitica dell'approssimazione (sviluppo in serie di Taylor). | Indicare la variabile adimensionale piccola ($\varepsilon \ll 1$) e l'ordine dello sviluppo troncato con notazione $o(\varepsilon^n)$. |
| *"Si vede chiaramente dal grafico..."* | Sostituisce una dimostrazione analitica con un'impressione visiva. | Indicare la proprietà della funzione (segno della derivata prima per la monotonia, derivata seconda per la concavità, asintoti) che determina la caratteristica della curva. |
| *"Applicando la formula nota..."* | Tratta la legge come una black-box mnemonica. | Richiamare il nome della legge, le ipotesi sotto cui è valida e il motivo per cui tali ipotesi sono verificate nel problema specifico. |

---

## Esempio di Applicazione

### ❌ Formulazione Black-Box Respinta:
> *"Consideriamo una sfera conduttrice carica. Per simmetria il campo elettrico è radiale. Applicando la legge di Gauss si ottiene subito $E = \frac{Q}{4\pi\varepsilon_0 r^2}$."*

### ✅ Formulazione Trasparente e Conforme:
> *"Consideriamo una sfera conduttrice carica di raggio $R$ con carica totale $Q$. La distribuzione superficiale di carica presenta simmetria sferica: è invariata rispetto a qualsiasi rotazione attorno al centro della sfera. Di conseguenza, nessuna direzione tangenziale $\hat{\theta}$ o $\hat{\phi}$ può essere fisicamente privilegiata. Il campo elettrostatico $\vec{E}$ deve essere puramente radiale lungo $\hat{r}$ e il suo modulo può dipendere unicamente dalla distanza radiale $r$: $\vec{E}(r) = E(r)\hat{r}$.*
>
> *Scegliamo come superficie gaussiana chiusa $\Sigma$ una sfera concentrica di raggio $r > R$. Il flusso del campo elettrico attraverso $\Sigma$ è:*
> $$\Phi_\Sigma(\vec{E}) = \oint_\Sigma \vec{E} \cdot d\vec{A} = \oint_\Sigma E(r)\hat{r} \cdot (\hat{n}\,dA)$$
> *Poiché sulla sfera la normale uscente coincide con il versore radiale ($\hat{n} = \hat{r}$), abbiamo $\hat{r} \cdot \hat{n} = 1$. Inoltre, poiché su tutti i punti della superficie gaussiana la distanza $r$ è costante, il modulo $E(r)$ è uniforme sulla superficie e può essere portato fuori dall'integrale:*
> $$\Phi_\Sigma(\vec{E}) = E(r) \oint_\Sigma dA = E(r) \cdot (4\pi r^2)$$
> *Per la Legge di Gauss nel vuoto, il flusso totale è pari alla carica interna divisa per $\varepsilon_0$:*
> $$E(r) \cdot 4\pi r^2 = \frac{Q}{\varepsilon_0} \implies E(r) = \frac{1}{4\pi\varepsilon_0}\frac{Q}{r^2}$$
> *Il risultato è valido per ogni $r > R$."*
