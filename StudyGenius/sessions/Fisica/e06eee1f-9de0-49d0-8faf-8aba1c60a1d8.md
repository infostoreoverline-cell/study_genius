# Dispensa Universitaria - Chimica Fisica II: Eserciziario Guidato e Risolto

## Esercizi sulla Radiazione del Corpo Nero e la Meccanica Quantistica

## Esercizio 1: Massimo di Emissione del Corpo Nero a Temperatura Ambiente

### Richiesta dell'esercizio

> Si calcoli la lunghezza d'onda $\lambda$ e la frequenza $\nu$ alle quali l'intensità di radiazione emessa da un corpo nero è massima se il corpo nero si trova alla temperatura $T = 298 \text{ K}$.

### 1. Dati

- $T = 298 \text{ K}$ (temperatura del corpo nero)
- Costante di Wien: $b = 2.9 \times 10^{-3} \text{ m}\cdot\text{K}$
- Velocità della luce: $c = 2.998 \times 10^8 \text{ m/s}$

### 2. Incognite

- $\lambda_{max}$: lunghezza d'onda del massimo di emissione (in metri)
- $\nu_{max}$: frequenza corrispondente al massimo di emissione (in Hz)

### 3. Geometria e ipotesi

Il problema riguarda un corpo nero ideale, quindi la radiazione emessa segue la legge di Planck. Il massimo di emissione è descritto dalla legge di spostamento di Wien.

### 4. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:** La legge di spostamento di Wien stabilisce che la lunghezza d'onda alla quale l'emissione di un corpo nero è massima è inversamente proporzionale alla temperatura:
> $$\lambda_{max} = \frac{b}{T}$$
> dove $b = 2.9 \times 10^{-3} \text{ m}\cdot\text{K}$ è la costante di Wien.

> 💡 **Intuizione & Senso Fisico:** All'aumentare della temperatura, il massimo di emissione si sposta verso lunghezze d'onda più corte (verso l'ultravioletto). Questo spiega perché un metallo riscaldato prima emette nell'infrarosso (non visibile), poi diventa rosso, poi bianco.

### 5. Impostazione

**Schema Mentale:** 
1. Applicare direttamente la legge di Wien per trovare $\lambda_{max}$
2. Calcolare la frequenza usando la relazione $\nu = c/\lambda$
3. Verificare che il risultato sia nell'infrarosso (come previsto per temperatura ambiente)

### 6. Svolgimento

#### 6.1 Calcolo della lunghezza d'onda massima

**Teoria:** Applichiamo la legge di Wien.

**Applicazione:**
$$\lambda_{max} = \frac{b}{T} = \frac{2.9 \times 10^{-3} \text{ m}\cdot\text{K}}{298 \text{ K}}$$

**Calcolo:**
$$\lambda_{max} = \frac{2.9 \times 10^{-3}}{298} \text{ m} = 9.73 \times 10^{-6} \text{ m}$$

$$\boxed{\lambda_{max} = 9.7 \times 10^{-6} \text{ m} = 9.7 \text{ }\mu\text{m}}$$

#### 6.2 Calcolo della frequenza massima

**Teoria:** La frequenza è legata alla lunghezza d'onda dalla relazione $\nu = c/\lambda$.

**Applicazione:**
$$\nu_{max} = \frac{c}{\lambda_{max}} = \frac{2.998 \times 10^8 \text{ m/s}}{9.73 \times 10^{-6} \text{ m}}$$

**Calcolo:**
$$\nu_{max} = 3.08 \times 10^{13} \text{ Hz}$$

$$\boxed{\nu_{max} = 3.1 \times 10^{13} \text{ Hz}}$$

### 7. Controlli di coerenza

> 🔍 **Controllo di Coerenza (Dimensionale / Segno / Limiti):**
> - **Dimensionale:** $[\lambda_{max}] = \frac{[\text{m}\cdot\text{K}]}{[\text{K}]} = \text{m}$ ✓
> - **Limite fisico:** A temperatura ambiente (298 K ≈ 25°C), il massimo di emissione cade nell'infrarosso medio ($\sim 10 \text{ }\mu\text{m}$), come previsto. Un corpo a temperatura ambiente non emette luce visibile.
> - **Limite asintotico:** Se $T \to \infty$, allora $\lambda_{max} \to 0$ (il massimo si sposta verso l'ultravioletto). Se $T \to 0$, allora $\lambda_{max} \to \infty$ (il massimo si sposta verso le onde radio).

### 8. Interpretazione fisica

Il risultato mostra che un corpo a temperatura ambiente (298 K) emette radiazione con massima intensità nell'infrarosso medio. Questo è il motivo per cui non possiamo "vedere" gli oggetti a temperatura ambiente al buio: la loro emissione termica è nell'infrarosso, non nel visibile.

### 9. Risultati finali

$$\boxed{\lambda_{max} = 9.7 \times 10^{-6} \text{ m}}$$
$$\boxed{\nu_{max} = 3.1 \times 10^{13} \text{ Hz}}$$

## Esercizio 2: Determinazione della Temperatura dal Massimo di Emissione

### Richiesta dell'esercizio

> L'intensità di radiazione emessa da un oggetto ha un massimo a $2000 \text{ cm}^{-1}$. Assumendo che l'oggetto si comporti come un corpo nero si trovi la sua temperatura.

### 1. Dati

- Numero d'onda del massimo: $\tilde{\nu}_{max} = 2000 \text{ cm}^{-1} = 2000 \times 10^2 \text{ m}^{-1} = 2 \times 10^5 \text{ m}^{-1}$
- Costante di Wien: $b = 2.9 \times 10^{-3} \text{ m}\cdot\text{K}$

### 2. Incognite

- $T$: temperatura del corpo nero (in Kelvin)

### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:** Il numero d'onda $\tilde{\nu}$ è definito come il reciproco della lunghezza d'onda:
> $$\tilde{\nu} = \frac{1}{\lambda}$$
> L'unità di misura nel SI è $\text{m}^{-1}$, ma in spettroscopia si usa comunemente $\text{cm}^{-1}$.

### 4. Impostazione

**Schema Mentale:**
1. Convertire il numero d'onda da $\text{cm}^{-1}$ a $\text{m}^{-1}$
2. Calcolare la lunghezza d'onda corrispondente: $\lambda = 1/\tilde{\nu}$
3. Applicare la legge di Wien invertita: $T = b/\lambda_{max}$

### 5. Svolgimento

#### 5.1 Conversione del numero d'onda

**Teoria:** Per convertire da $\text{cm}^{-1}$ a $\text{m}^{-1}$, moltiplichiamo per $10^2$ (poiché $1 \text{ m} = 100 \text{ cm}$).

**Applicazione:**
$$\tilde{\nu}_{max} = 2000 \text{ cm}^{-1} = 2000 \times 10^2 \text{ m}^{-1} = 2 \times 10^5 \text{ m}^{-1}$$

#### 5.2 Calcolo della lunghezza d'onda

**Teoria:** La lunghezza d'onda è il reciproco del numero d'onda.

**Applicazione:**
$$\lambda_{max} = \frac{1}{\tilde{\nu}_{max}} = \frac{1}{2 \times 10^5 \text{ m}^{-1}} = 5 \times 10^{-6} \text{ m} = 5 \text{ }\mu\text{m}$$

#### 5.3 Applicazione della legge di Wien

**Teoria:** Dalla legge di Wien $\lambda_{max} = b/T$, ricaviamo $T = b/\lambda_{max}$.

**Applicazione:**
$$T = \frac{b}{\lambda_{max}} = \frac{2.9 \times 10^{-3} \text{ m}\cdot\text{K}}{5 \times 10^{-6} \text{ m}}$$

**Calcolo:**
$$T = \frac{2.9 \times 10^{-3}}{5 \times 10^{-6}} \text{ K} = 580 \text{ K}$$

$$\boxed{T = 580 \text{ K}}$$

### 6. Controlli di coerenza

> 🔍 **Controllo di Coerenza (Dimensionale / Segno / Limiti):**
> - **Dimensionale:** $[T] = \frac{[\text{m}\cdot\text{K}]}{[\text{m}]} = \text{K}$ ✓
> - **Verifica incrociata:** Se $T = 580 \text{ K}$, allora $\lambda_{max} = b/T = 2.9 \times 10^{-3}/580 = 5 \times 10^{-6} \text{ m} = 5 \text{ }\mu\text{m}$, che corrisponde a $\tilde{\nu} = 1/\lambda = 2 \times 10^5 \text{ m}^{-1} = 2000 \text{ cm}^{-1}$ ✓
> - **Senso fisico:** 580 K ≈ 307°C, una temperatura elevata ma ragionevole per un oggetto incandescente.

### 7. Interpretazione fisica

Un oggetto con massimo di emissione a $2000 \text{ cm}^{-1}$ (cioè $5 \text{ }\mu\text{m}$, nell'infrarosso medio) si trova a circa 580 K. Questa temperatura è tipica di superfici molto calde ma non ancora incandescenti nel visibile.

### 8. Risultati finali

$$\boxed{T = 580 \text{ K}}$$

## Esercizio 3: Densità di Energia in un Intervallo di Lunghezze d'Onda

### Richiesta dell'esercizio

> Si calcoli la densità di energia nel range da 650 nm a 655 nm all'interno di una cavità a (a) 25 °C; (b) 3000 °C. Per il calcolo si utilizzi la seguente formula valida nel caso in cui l'intervallo di lunghezze d'onda risulti particolarmente limitato (in questo caso $\Delta\lambda = 5 \text{ nm}$):
> $$u(\lambda_1, \lambda_2, T) = \int_{\lambda_1}^{\lambda_2} \rho(\lambda, T) d\lambda \approx \rho(\lambda_{centro}, T) \cdot (\lambda_2 - \lambda_1)$$

### 1. Dati

- Intervallo di lunghezze d'onda: da $\lambda_1 = 650 \text{ nm}$ a $\lambda_2 = 655 \text{ nm}$
- Lunghezza d'onda centrale: $\lambda_c = 652.5 \text{ nm} = 652.5 \times 10^{-9} \text{ m}$
- Ampiezza intervallo: $\Delta\lambda = 5 \text{ nm} = 5 \times 10^{-9} \text{ m}$
- Temperatura (a): $T_a = 25 \text{ °C} = 298 \text{ K}$
- Temperatura (b): $T_b = 3000 \text{ °C} = 3273 \text{ K}$
- Costante di Planck: $h = 6.6261 \times 10^{-34} \text{ J}\cdot\text{s}$
- Velocità della luce: $c = 2.9979 \times 10^8 \text{ m/s}$
- Costante di Boltzmann: $k_B = 1.3806 \times 10^{-23} \text{ J/K}$

### 2. Incognite

- $u(T_a)$: densità di energia nell'intervallo a 298 K (in $\text{J}/\text{m}^3$)
- $u(T_b)$: densità di energia nell'intervallo a 3273 K (in $\text{J}/\text{m}^3$)

### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:** La densità spettrale di energia di volume secondo Planck è:
> $$\rho(\lambda, T) = \frac{8\pi hc}{\lambda^5} \cdot \frac{1}{e^{hc/\lambda k_B T} - 1}$$
> dove:
> - $\rho(\lambda, T)$ è la densità di energia per unità di volume e per unità di lunghezza d'onda ($\text{J} \cdot \text{m}^{-4}$)
> - $h = 6.6261 \times 10^{-34} \text{ J}\cdot\text{s}$ è la costante di Planck
> - $c = 2.9979 \times 10^8 \text{ m/s}$ è la velocità della luce
> - $k_B = 1.3806 \times 10^{-23} \text{ J/K}$ è la costante di Boltzmann

> 💡 **Intuizione & Senso Fisico:** Quando l'intervallo $\Delta\lambda$ è molto piccolo rispetto a $\lambda$, la funzione $\rho(\lambda, T)$ varia poco nell'intervallo. Possiamo quindi approssimare l'integrale con il prodotto del valore al centro dell'intervallo per l'ampiezza dell'intervallo stesso. Questa è un'approssimazione del primo ordine (regola del punto medio).

### 4. Impostazione

**Schema Mentale:**
1. Calcolare l'esponente $hc/\lambda_c k_B T$ per entrambe le temperature
2. Valutare $\rho(\lambda_c, T)$ usando la formula di Planck
3. Moltiplicare per $\Delta\lambda = 5 \times 10^{-9} \text{ m}$
4. Confrontare i risultati: a temperatura più alta, la densità di energia deve essere molto maggiore

### 5. Svolgimento

#### 5.1 Calcolo del fattore esponenziale

**Teoria:** Calcoliamo il rapporto $hc/\lambda_c k_B T$ per entrambe le temperature.

**Applicazione per $T_a = 298 \text{ K}$:**

Prima calcoliamo il numeratore:
$$hc = (6.6261 \times 10^{-34} \text{ J}\cdot\text{s})(2.9979 \times 10^8 \text{ m/s}) = 1.9864 \times 10^{-25} \text{ J}\cdot\text{m}$$

Poi il denominatore per $T_a$:
$$\lambda_c k_B T_a = (652.5 \times 10^{-9} \text{ m})(1.3806 \times 10^{-23} \text{ J/K})(298 \text{ K})$$

$$\lambda_c k_B T_a = 652.5 \times 1.3806 \times 298 \times 10^{-32} \text{ J}\cdot\text{m}$$

$$\lambda_c k_B T_a = 2.685 \times 10^{-27} \text{ J}\cdot\text{m}$$

Quindi:
$$\frac{hc}{\lambda_c k_B T_a} = \frac{1.9864 \times 10^{-25}}{2.685 \times 10^{-27}} = 73.98 \approx 74$$

**Applicazione per $T_b = 3273 \text{ K}$:**

$$\lambda_c k_B T_b = (652.5 \times 10^{-9} \text{ m})(1.3806 \times 10^{-23} \text{ J/K})(3273 \text{ K})$$

$$\lambda_c k_B T_b = 652.5 \times 1.3806 \times 3273 \times 10^{-32} \text{ J}\cdot\text{m}$$

$$\lambda_c k_B T_b = 2.949 \times 10^{-26} \text{ J}\cdot\text{m}$$

Quindi:
$$\frac{hc}{\lambda_c k_B T_b} = \frac{1.9864 \times 10^{-25}}{2.949 \times 10^{-26}} = 6.736$$

#### 5.2 Calcolo della densità spettrale di energia

**Teoria:** Applichiamo la formula di Planck.

**Applicazione per $T_a = 298 \text{ K}$:**

$$\rho(\lambda_c, T_a) = \frac{8\pi hc}{\lambda_c^5} \cdot \frac{1}{e^{hc/\lambda_c k_B T_a} - 1}$$

Calcoliamo il coefficiente:
$$\frac{8\pi hc}{\lambda_c^5} = \frac{8\pi (1.9864 \times 10^{-25} \text{ J}\cdot\text{m})}{(652.5 \times 10^{-9} \text{ m})^5}$$

$$(652.5 \times 10^{-9})^5 = (652.5)^5 \times 10^{-45} = 1.183 \times 10^{14} \times 10^{-45} = 1.183 \times 10^{-31} \text{ m}^5$$

$$\frac{8\pi hc}{\lambda_c^5} = \frac{8\pi \times 1.9864 \times 10^{-25}}{1.183 \times 10^{-31}} = \frac{4.992 \times 10^{-24}}{1.183 \times 10^{-31}} = 4.22 \times 10^7 \text{ J}\cdot\text{m}^{-4}$$

Per $T_a = 298 \text{ K}$:
$$e^{74} - 1 \approx e^{74} = 1.25 \times 10^{32}$$

$$\rho(\lambda_c, T_a) = 4.22 \times 10^7 \times \frac{1}{1.25 \times 10^{32}} = 3.38 \times 10^{-25} \text{ J}\cdot\text{m}^{-4}$$

#### 5.3 Calcolo della densità di energia nell'intervallo

**Teoria:** Usiamo l'approssimazione $u \approx \rho(\lambda_c, T) \cdot \Delta\lambda$.

**Applicazione per $T_a = 298 \text{ K}$:**
$$u(T_a) = \rho(\lambda_c, T_a) \cdot \Delta\lambda = 3.38 \times 10^{-25} \times 5 \times 10^{-9} = 1.69 \times 10^{-33} \text{ J}/\text{m}^3$$

**Applicazione per $T_b = 3273 \text{ K}$:**

Per $T_b = 3273 \text{ K}$:
$$e^{6.736} - 1 = 842.5 - 1 = 841.5$$

$$\rho(\lambda_c, T_b) = 4.22 \times 10^7 \times \frac{1}{841.5} = 5.01 \times 10^4 \text{ J}\cdot\text{m}^{-4}$$

$$u(T_b) = \rho(\lambda_c, T_b) \cdot \Delta\lambda = 5.01 \times 10^4 \times 5 \times 10^{-9} = 2.51 \times 10^{-4} \text{ J}/\text{m}^3$$

### 6. Risultati

$$\boxed{u(298 \text{ K}) = 1.54 \times 10^{-33} \text{ J}/\text{m}^3}$$

$$\boxed{u(3273 \text{ K}) = 2.51 \times 10^{-4} \text{ J}/\text{m}^3}$$

### 7. Controlli di coerenza

> 🔍 **Controllo di Coerenza (Dimensionale / Segno / Limiti):**
> - **Dimensionale:** $[\rho] = \frac{[\text{J}\cdot\text{m}]}{[\text{m}^5]} = \text{J}/\text{m}^4$; $[u] = [\rho][\Delta\lambda] = \text{J}/\text{m}^4 \cdot \text{m} = \text{J}/\text{m}^3$ ✓
> - **Rapporto tra le due temperature:** $\frac{u(3273)}{u(298)} = \frac{2.51 \times 10^{-4}}{1.54 \times 10^{-33}} \approx 1.6 \times 10^{29}$. Questo rapporto enorme è dovuto al fattore esponenziale: a 298 K, $hc/\lambda k_B T \approx 74$, quindi la coda di Wien della distribuzione è estremamente soppressa.
> - **Senso fisico:** A temperatura ambiente, l'emissione a 650 nm (visibile) è praticamente nulla. A 3000 °C, l'emissione in questa regione diventa significativa.

### 8. Interpretazione fisica

La densità di energia nella regione del visibile (650-655 nm) aumenta di circa 29 ordini di grandezza quando la temperatura passa da 25 °C a 3000 °C. Questo spiega perché i corpi diventano incandescenti solo a temperature elevate: l'emissione nel visibile richiede temperature di migliaia di Kelvin.

### 9. Risultati finali

$$\boxed{u(25\text{ °C}) = 1.54 \times 10^{-33} \text{ J}/\text{m}^3}$$
$$\boxed{u(3000\text{ °C}) = 2.51 \times 10^{-4} \text{ J}/\text{m}^3}$$

---

## Esercizio 4: Colore del Sole e Legge di Wien

### Richiesta dell'esercizio

> La temperatura sulla superficie del sole è approssimativamente di 5800 K. Assumendo che l'occhio umano riveli con il massimo di sensibilità la lunghezza d'onda corrispondente al massimo di emissione del sole si indichi qual è il colore meglio percepito dall'occhio.

### 1. Dati

- Temperatura superficiale del Sole: $T = 5800 \text{ K}$
- Costante di Wien: $b = 2.9 \times 10^{-3} \text{ m}\cdot\text{K}$

### 2. Incognite

- $\lambda_{max}$: lunghezza d'onda del massimo di emissione solare
- Colore corrispondente

### 3. Impostazione

**Schema Mentale:**
1. Applicare la legge di Wien per trovare $\lambda_{max}$
2. Confrontare con lo spettro del visibile (380-750 nm)
3. Identificare il colore

### 4. Svolgimento

#### 4.1 Calcolo della lunghezza d'onda massima

**Teoria:** Applichiamo la legge di Wien.

**Applicazione:**
$$\lambda_{max} = \frac{b}{T} = \frac{2.9 \times 10^{-3} \text{ m}\cdot\text{K}}{5800 \text{ K}}$$

**Calcolo:**
$$\lambda_{max} = \frac{2.9 \times 10^{-3}}{5800} \text{ m} = 5 \times 10^{-7} \text{ m} = 500 \text{ nm}$$

$$\boxed{\lambda_{max} = 500 \text{ nm}}$$

#### 4.2 Identificazione del colore

**Teoria:** Lo spettro del visibile si estende approssimativamente da 380 nm (violetto) a 750 nm (rosso).

**Applicazione:** La lunghezza d'onda di 500 nm cade nella regione blu-verde (turchese) dello spettro visibile.

### 5. Risultato

$$\boxed{\text{Il massimo di emissione solare è a } \lambda = 500 \text{ nm, corrispondente al colore blu-verde (turchese)}}$$

### 6. Controlli di coerenza

> 🔍 **Controllo di Coerenza:**
> - **Verifica:** Il Sole appare bianco-giallastro dalla Terra perché l'occhio umano integra su tutto lo spettro visibile, ma il picco di emissione è effettivamente nel blu-verde.
> - **Senso fisico:** L'evoluzione ha adattato l'occhio umano al massimo di emissione solare, che cade nel centro dello spettro visibile.

### 7. Interpretazione fisica

Il Sole, con temperatura superficiale di 5800 K, ha il massimo di emissione a 500 nm, nella regione blu-verde. L'occhio umano si è evoluto per avere la massima sensibilità proprio in questa regione, ottimizzando la visione alla luce solare.

---

## Esercizio 5: Dalla Legge di Wien alla Legge di Stefan-Boltzmann (in Frequenza)

### Richiesta dell'esercizio

> Partendo dalla distribuzione di densità spettrale di energia di volume secondo le frequenze assunta da Wien si ricavi la legge di Stefan-Boltzmann.

### 1. Dati

- Distribuzione di Wien in frequenza: $\rho(\nu, T) = \nu^3 F\left(\frac{\nu}{T}\right)$

### 2. Incognite

- Dimostrare che $u = \sigma T^4$ (legge di Stefan-Boltzmann)

### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:** La prima legge di Wien (o legge di Wien in forma generale) afferma che la densità spettrale di energia può essere scritta nella forma:
> $$\rho(\nu, T) = \nu^3 F\left(\frac{\nu}{T}\right)$$
> dove $F$ è una funzione universale della variabile $\nu/T$.

### 4. Impostazione

**Schema Mentale:**
1. Scrivere la densità di energia totale come integrale su tutte le frequenze
2. Eseguire il cambio di variabile $x = \nu/T$
3. Mostrare che l'integrale risultante è una costante moltiplicata per $T^4$

### 5. Svolgimento

#### 5.1 Densità di energia totale

**Teoria:** La densità di energia totale si ottiene integrando la densità spettrale su tutte le frequenze.

**Applicazione:**
$$u = \int_0^{\infty} \rho(\nu, T) d\nu = \int_0^{\infty} \nu^3 F\left(\frac{\nu}{T}\right) d\nu$$

#### 5.2 Cambio di variabile

**Teoria:** Eseguiamo la sostituzione $x = \nu/T$, da cui $\nu = Tx$ e $d\nu = T dx$.

**Applicazione:**
$$u = \int_0^{\infty} (Tx)^3 F(x) \cdot T dx = T^4 \int_0^{\infty} x^3 F(x) dx$$

**Spiegazione matematica:** 
- $\nu^3 = (Tx)^3 = T^3 x^3$
- $d\nu = T dx$
- Il prodotto dà $T^3 \cdot T = T^4$

#### 5.3 Identificazione della costante

**Teoria:** L'integrale $\int_0^{\infty} x^3 F(x) dx$ è una costante indipendente dalla temperatura (dipende solo dalla forma della funzione $F$).

**Applicazione:**
$$u = T^4 \cdot \underbrace{\int_0^{\infty} x^3 F(x) dx}_{\text{costante } \sigma'}$$

Definendo $\sigma' = \int_0^{\infty} x^3 F(x) dx$, otteniamo:
$$u = \sigma' T^4$$

$$\boxed{u = \sigma T^4}$$

dove $\sigma$ è la costante di Stefan-Boltzmann.

### 6. Controlli di coerenza

> 🔍 **Controllo di Coerenza:**
> - **Dimensionale:** $[u] = \text{J}/\text{m}^3$; $[\sigma T^4] = \text{J}/(\text{m}^3\cdot\text{K}^4) \cdot \text{K}^4 = \text{J}/\text{m}^3$ ✓
> - **Senso fisico:** La densità di energia cresce con la quarta potenza della temperatura, il che spiega perché l'emissione termica diventa rapidamente dominante ad alte temperature.

### 7. Interpretazione fisica

La legge di Stefan-Boltzmann è una conseguenza diretta della forma funzionale della legge di Wien. Il cambio di variabile $x = \nu/T$ "estrae" il fattore $T^4$ dall'integrale, lasciando un integrale costante che definisce la costante di Stefan-Boltzmann.

---

## Esercizio 6: Dalla Legge di Wien alla Legge di Stefan-Boltzmann (in Lunghezza d'Onda)

### Richiesta dell'esercizio

> Partendo dalla distribuzione di densità spettrale di energia di volume secondo le lunghezze d'onda assunta da Wien si ricavi la legge di Stefan-Boltzmann.

### 1. Dati

- Distribuzione di Wien in frequenza: $\rho(\nu, T) = \nu^3 F\left(\frac{\nu}{T}\right)$

### 2. Incognite

- Dimostrare che $u = \sigma T^4$ partendo dalla distribuzione in lunghezza d'onda

### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:** Per passare dalla distribuzione in frequenza a quella in lunghezza d'onda, usiamo la relazione $\nu = c/\lambda$ e la regola di trasformazione delle densità:
> $$\rho(\lambda, T) = \rho(\nu, T) \cdot \left|\frac{d\nu}{d\lambda}\right|$$

### 4. Svolgimento

#### 4.1 Trasformazione da frequenza a lunghezza d'onda

**Teoria:** La relazione tra frequenza e lunghezza d'onda è $\nu = c/\lambda$. La derivata è:
$$\frac{d\nu}{d\lambda} = \frac{d}{d\lambda}\left(\frac{c}{\lambda}\right) = -\frac{c}{\lambda^2}$$

Il valore assoluto è $|d\nu/d\lambda| = c/\lambda^2$.

**Applicazione:**
$$\rho(\lambda, T) = \rho(\nu, T) \cdot \frac{c}{\lambda^2} = \left(\frac{c}{\lambda}\right)^3 F\left(\frac{c}{\lambda T}\right) \cdot \frac{c}{\lambda^2}$$

$$\rho(\lambda, T) = \frac{c^4}{\lambda^5} F\left(\frac{c}{\lambda T}\right)$$

#### 4.2 Densità di energia totale

**Teoria:** Integriamo su tutte le lunghezze d'onda.

**Applicazione:**
$$u = \int_0^{\infty} \rho(\lambda, T) d\lambda = \int_0^{\infty} \frac{c^4}{\lambda^5} F\left(\frac{c}{\lambda T}\right) d\lambda$$

#### 4.3 Cambio di variabile

**Teoria:** Eseguiamo la sostituzione $x = c/\lambda T$, da cui $\lambda = c/(xT)$ e $d\lambda = -c/(x^2 T) dx$.

**Applicazione:**
$$u = \int_{\infty}^{0} \frac{c^4}{(c/xT)^5} F(x) \cdot \left(-\frac{c}{x^2 T}\right) dx$$

Semplifichiamo:
$$\frac{c^4}{(c/xT)^5} = \frac{c^4 \cdot x^5 T^5}{c^5} = \frac{x^5 T^5}{c}$$

Quindi:
$$u = \int_{\infty}^{0} \frac{x^5 T^5}{c} F(x) \cdot \left(-\frac{c}{x^2 T}\right) dx$$

$$u = \int_{\infty}^{0} -x^3 T^4 F(x) dx$$

Invertendo gli estremi di integrazione (cambiando segno):
$$u = \int_0^{\infty} x^3 T^4 F(x) dx = T^4 \int_0^{\infty} x^3 F(x) dx$$

$$\boxed{u = \sigma T^4}$$

### 5. Controlli di coerenza

> 🔍 **Controllo di Coerenza:**
> - **Coerenza tra i due approcci:** Il risultato è identico a quello ottenuto nell'Esercizio 5, come deve essere poiché la densità di energia totale è indipendente dalla rappresentazione (in frequenza o in lunghezza d'onda).
> - **Attenzione al cambio di variabile:** Quando $\lambda \to 0$, allora $x \to \infty$; quando $\lambda \to \infty$, allora $x \to 0$. Gli estremi si invertono, introducendo un segno negativo che viene compensato dall'inversione degli estremi.

### 6. Interpretazione fisica

La legge di Stefan-Boltzmann può essere derivata sia dalla distribuzione in frequenza sia da quella in lunghezza d'onda. Il fattore Jacobiano $|d\nu/d\lambda| = c/\lambda^2$ è essenziale per la corretta trasformazione tra le due rappresentazioni.

---

## Esercizio 7: Integrazione della Distribuzione di Planck

### Richiesta dell'esercizio

> Si integri la distribuzione di densità spettrale di energia di volume di Planck su tutto il range di frequenze per trovare l'energia di volume totale emessa da un corpo nero alla temperatura $T$.

### 1. Dati

- Distribuzione di Planck in lunghezza d'onda: $\rho(\lambda, T) = \frac{8\pi hc}{\lambda^5} \cdot \frac{1}{e^{hc/\lambda k_B T} - 1}$

### 2. Incognite

- Dimostrare che $u = \sigma T^4$ con $\sigma = \frac{8\pi^5 k_B^4}{15 h^3 c^3}$

### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:** La distribuzione di Planck in lunghezza d'onda è:
> $$\rho(\lambda, T) = \frac{8\pi hc}{\lambda^5} \cdot \frac{1}{e^{hc/\lambda k_B T} - 1}$$

### 4. Svolgimento

#### 4.1 Integrale della distribuzione di Planck

**Teoria:** La densità di energia totale è:
$$u

---

## Eserciziario Guidato — Radiazione di Corpo Nero e Meccanica Quantistica

### Esercizio 7: Integrazione della Distribuzione di Planck

#### Richiesta dell'esercizio

> Si integri la distribuzione di densità spettrale di energia di volume di Planck su tutto il range di frequenze per trovare l'energia di volume totale emessa da un corpo nero alla temperatura $T$.

### 1. Dati

- Distribuzione di Planck in lunghezza d'onda: $\rho(\lambda, T) = \frac{8\pi hc}{\lambda^5} \cdot \frac{1}{e^{hc/\lambda k_B T} - 1}$

### 2. Incognite

- Dimostrare che $u = \sigma T^4$ con $\sigma = \frac{8\pi^5 k_B^4}{15 h^3 c^3}$

### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:** La distribuzione di Planck in lunghezza d'onda è:
> $$\rho(\lambda, T) = \frac{8\pi hc}{\lambda^5} \cdot \frac{1}{e^{hc/\lambda k_B T} - 1}$$

### 4. Svolgimento

#### 4.1 Integrale della distribuzione di Planck

**Teoria:** La densità di energia totale è:
$$u = \int_0^\infty \rho(\lambda, T) \, d\lambda$$

**Sostituzione:** Introduciamo la variabile adimensionale $x = \frac{hc}{\lambda k_B T}$, da cui $\lambda = \frac{hc}{x k_B T}$ e $d\lambda = -\frac{hc}{x^2 k_B T} dx$. L'inversione degli estremi di integrazione compensa il segno negativo, portando a:
$$u = \frac{8\pi hc}{k_B T} \int_0^\infty \frac{x^3}{e^x - 1} \, dx$$

L'integrale $\int_0^\infty \frac{x^3}{e^x - 1} dx = \frac{\pi^4}{15}$ è un risultato standard della teoria delle funzioni speciali. Sostituendo, si ottiene:
$$u = \frac{8\pi^5 k_B^4}{15 h^3 c^3} T^4 = \sigma T^4$$

---

### Esercizio 8: Ortogonalità delle Autofunzioni della Buca 1D (n=1 e n=2)

#### Richiesta dell'esercizio

> Un elettrone confinato in una buca 1-dimensionale di larghezza $L$ è descritto dalla funzione d'onda:
> $$ \psi_n(x) = \sqrt{\frac{2}{L}} \sin\left(\frac{n\pi x}{L}\right) $$
> definita nel dominio $0 \leq x \leq L$. Fuori dal dominio la funzione d'onda è nulla. Si dimostri che le funzioni d'onda caratterizzate dai numeri quantici $n=1$ e $n=2$ sono tra loro ortogonali.

### 1. Dati

- Larghezza della buca: $L$ (unità SI: m)
- Numeri quantici: $n_1 = 1$, $n_2 = 2$
- Funzioni d'onda: $\psi_1(x) = \sqrt{\frac{2}{L}} \sin\left(\frac{\pi x}{L}\right)$ e $\psi_2(x) = \sqrt{\frac{2}{L}} \sin\left(\frac{2\pi x}{L}\right)$
- Dominio: $0 \leq x \leq L$

### 2. Incognite

Dimostrare che:
$$ \int_0^L \psi_1^*(x) \psi_2(x) \, dx = 0 $$

### 3. Geometria e ipotesi

La buca è unidimensionale con pareti infinite di potenziale. Le funzioni d'onda sono reali, quindi $\psi_n^*(x) = \psi_n(x)$. Il dominio di integrazione è l'intervallo $[0, L]$ dove le funzioni sono definite.

## Esercizio 28 — Ortogonalità delle Autofunzioni della Buca 1D Centrata sull'Origine (n=1 e n=3)

### Richiesta dell'esercizio

> Un elettrone confinato in una buca 1-dimensionale di larghezza $L$ è descritto dalla funzione d'onda:
> $$ \psi_n(x) = \sqrt{\frac{2}{L}} \cos\left(\frac{n\pi x}{L}\right) $$
> definita nel dominio $-L/2 \leq x \leq +L/2$. Fuori dal dominio la funzione d'onda è nulla. Si dimostri che le funzioni d'onda caratterizzate dai numeri quantici $n=1$ e $n=3$ sono tra loro ortogonali. Per la dimostrazione si utilizzi il seguente integrale notevole:
> $$ \int_{-\pi/2}^{+\pi/2} \cos(u)\cos(3u) \, du = 0 $$

### 1. Dati

- Larghezza della buca: $L$ (unità SI: m)
- Numeri quantici: $n_1 = 1$, $n_3 = 3$
- Funzioni d'onda: $\psi_1(x) = \sqrt{\frac{2}{L}} \cos\left(\frac{\pi x}{L}\right)$ e $\psi_3(x) = \sqrt{\frac{2}{L}} \cos\left(\frac{3\pi x}{L}\right)$
- Dominio: $-L/2 \leq x \leq +L/2$
- Integrale notevole fornito: $\int_{-\pi/2}^{+\pi/2} \cos(u)\cos(3u) \, du = 0$

### 2. Incognite

Dimostrare che:
$$ \int_{-L/2}^{+L/2} \psi_1^*(x) \psi_3(x) \, dx = 0 $$

### 3. Geometria e ipotesi

La buca è centrata sull'origine, quindi il dominio è simmetrico rispetto a $x=0$. Le funzioni d'onda sono reali e pari (coseni). Questa simmetria semplifica i calcoli.

### 4. Teoria fisica necessaria

💡 **Intuizione & Senso Fisico:** Anche in questa configurazione (buca centrata sull'origine), le autofunzioni con $n$ dispari ($n=1, 3, 5, \ldots$) corrispondono a stati con energia diversa e devono essere ortogonali. La simmetria del problema rispetto all'origine rende le autofunzioni delle funzioni pari (coseni) per $n$ dispari.

### 5. Schema Mentale & Strategia

1. Scrivere esplicitamente le due funzioni d'onda.
2. Impostare l'integrale di sovrapposizione.
3. Semplificare le costanti.
4. Eseguire la sostituzione $u = \frac{\pi x}{L}$ e verificare che gli estremi diventino $\pm \pi/2$.
5. Applicare l'integrale notevole fornito per concludere.

### 6. Svolgimento

#### Passo 1 — Scrittura esplicita delle funzioni d'onda

$$ \psi_1(x) = \sqrt{\frac{2}{L}} \cos\left(\frac{\pi x}{L}\right) $$
$$ \psi_3(x) = \sqrt{\frac{2}{L}} \cos\left(\frac{3\pi x}{L}\right) $$

#### Passo 2 — Impostazione dell'integrale di ortogonalità

Poiché le funzioni sono reali, $\psi_1^*(x) = \psi_1(x)$:

$$ I = \int_{-L/2}^{+L/2} \psi_1(x) \psi_3(x) \, dx = \int_{-L/2}^{+L/2} \left[\sqrt{\frac{2}{L}} \cos\left(\frac{\pi x}{L}\right)\right] \left[\sqrt{\frac{2}{L}} \cos\left(\frac{3\pi x}{L}\right)\right] dx $$

**Applicazione:** Portiamo fuori la costante $\frac{2}{L}$:

$$ I = \frac{2}{L} \int_{-L/2}^{+L/2} \cos\left(\frac{\pi x}{L}\right) \cos\left(\frac{3\pi x}{L}\right) dx $$

#### Passo 3 — Sostituzione di variabile

Operiamo la sostituzione:
$$ u = \frac{\pi x}{L} $$

**Derivazione:** Differenziando: $\frac{du}{dx} = \frac{\pi}{L}$, quindi $dx = \frac{L}{\pi} du$.

**Cambio degli estremi di integrazione:**
- Quando $x = -L/2$: $u = \frac{\pi \cdot (-L/2)}{L} = -\frac{\pi}{2}$
- Quando $x = +L/2$: $u = \frac{\pi \cdot (+L/2)}{L} = +\frac{\pi}{2}$

**Sostituzione nell'integrale:**
$$ I = \frac{2}{L} \int_{-\pi/2}^{+\pi/2} \cos(u) \cos(3u) \cdot \frac{L}{\pi} \, du = \frac{2}{\pi} \int_{-\pi/2}^{+\pi/2} \cos(u) \cos(3u) \, du $$

#### Passo 4 — Applicazione dell'integrale notevole

L'integrale notevole fornito nel testo afferma che:
$$ \int_{-\pi/2}^{+\pi/2} \cos(u)\cos(3u) \, du = 0 $$

**Applicazione:** Sostituendo direttamente questo risultato:

$$ I = \frac{2}{\pi} \cdot 0 = 0 $$

### 7. Risultato

$$ \boxed{ \int_{-L/2}^{+L/2} \psi_1^*(x) \psi_3(x) \, dx = 0 } $$

Le funzioni $\psi_1(x)$ e $\psi_3(x)$ sono ortogonali.

### 8. Controlli di coerenza

🔍 **Controllo dimensionale:** Come nell'esercizio precedente, l'integrale è adimensionale. ✓

🔍 **Controllo della simmetria:** Le funzioni $\cos(u)$ e $\cos(3u)$ sono entrambe pari. Il loro prodotto è una funzione pari. L'integrale su un intervallo simmetrico $[-\pi/2, +\pi/2]$ di una funzione pari NON è automaticamente zero. Il risultato zero deriva dall'ortogonalità delle funzioni trigonometriche con frequenze diverse, non dalla simmetria. Questo è un punto sottile che merita attenzione.

### 9. Interpretazione fisica

Le autofunzioni con $n=1$ e $n=3$ corrispondono a energie diverse ($E_1 = \frac{\pi^2\hbar^2}{2mL^2}$ ed $E_3 = \frac{9\pi^2\hbar^2}{2mL^2}$) e sono ortogonali, come previsto dal formalismo della meccanica quantistica per autofunzioni di operatori Hermitiani con autovalori distinti.

### 10. Trabocchetti d'Esame

⚠️ **Attenzione / Errore Tipico d'Esame:**
1. **Errori nel cambio degli estremi**: Con la buca centrata in $[-L/2, +L/2]$, la sostituzione $u = \pi x/L$ porta a estremi $\pm \pi/2$, NON $0$ e $\pi$ come nell'esercizio precedente.
2. **Confondere le due configurazioni**: La buca in $[0, L]$ ha autofunzioni seno; la buca in $[-L/2, +L/2]$ ha autofunzioni coseno (per $n$ dispari). Non mescolare le due situazioni.
3. **Pensare che l'integrale sia nullo "per simmetria"**: Il prodotto di due funzioni pari è pari, quindi la simmetria da sola non basta. È l'ortogonalità delle funzioni trigonometriche a rendere nullo l'integrale.

## Esercizio 29 — Ortogonalità delle Autofunzioni su un Anello (Particella su un Cerchio)

### Richiesta dell'esercizio

> Un elettrone confinato a muoversi in un anello (spazio a simmetria assiale 1-dimensionale) è descritto dall'autofunzione:
> $$ \psi_{m_l}(\phi) = e^{im_l \phi} $$
> con $\phi$ coordinata spaziale ($0 \leq \phi \leq 2\pi$) che definisce la posizione della particella. Si dimostri che le funzioni d'onda caratterizzate dai numeri quantici $m_l = +1$ e $m_l = +2$ sono tra loro ortogonali.

### 1. Dati

- Dominio angolare: $0 \leq \phi \leq 2\pi$
- Numeri quantici: $m_{l,1} = +1$, $m_{l,2} = +2$
- Funzioni d'onda: $\psi_1(\phi) = e^{i\phi}$ e $\psi_2(\phi) = e^{2i\phi}$

### 2. Incognite

Dimostrare che:
$$ \int_0^{2\pi} \psi_1^*(\phi) \psi_2(\phi) \, d\phi = 0 $$

### 3. Geometria e ipotesi

La particella si muove su un anello di raggio qualsiasi (il raggio non compare nel problema perché la coordinata è l'angolo $\phi$). Le autofunzioni sono funzioni complesse esponenziali. La condizione di periodicità $\psi(\phi + 2\pi) = \psi(\phi)$ è automaticamente soddisfatta per $m_l$ intero.

### 4. Teoria fisica necessaria

📌 **Definizione Rigorosa di Ortogonalità per Funzioni Complesse:** Due funzioni complesse $\psi_i$ e $\psi_j$ sono ortogonali se:
$$ \int \psi_i^*(\phi) \psi_j(\phi) \, d\phi = 0 $$
dove $\psi_i^*$ è il complesso coniugato di $\psi_i$.

💡 **Intuizione & Senso Fisico:** Per funzioni complesse, è essenziale usare il complesso coniugato della prima funzione nell'integrale. Per $\psi_1(\phi) = e^{i\phi}$, il complesso coniugato è $\psi_1^*(\phi) = e^{-i\phi}$.

### 5. Schema Mentale & Strategia

1. Scrivere le funzioni d'onda e i loro complessi coniugati.
2. Impostare l'integrale di ortogonalità.
3. Semplificare l'esponenziale (prodotto di esponenziali = esponenziale della somma degli esponenti).
4. Calcolare l'integrale dell'esponenziale.
5. Usare la formula di Eulero per valutare agli estremi.

### 6. Svolgimento

#### Passo 1 — Scrittura delle funzioni d'onda e dei complessi coniugati

$$ \psi_1(\phi) = e^{i\phi}, \qquad \psi_1^*(\phi) = e^{-i\phi} $$
$$ \psi_2(\phi) = e^{2i\phi} $$

#### Passo 2 — Impostazione dell'integrale di ortogonalità

$$ I = \int_0^{2\pi} \psi_1^*(\phi) \psi_2(\phi) \, d\phi = \int_0^{2\pi} e^{-i\phi} \cdot e^{2i\phi} \, d\phi $$

#### Passo 3 — Semplificazione dell'esponenziale

**Regola degli esponenti:** $e^a \cdot e^b = e^{a+b}$. Applicando con $a = -i\phi$ e $b = 2i\phi$:
$$ e^{-i\phi} \cdot e^{2i\phi} = e^{-i\phi + 2i\phi} = e^{i\phi} $$

**Sostituzione:**
$$ I = \int_0^{2\pi} e^{i\phi} \, d\phi $$

#### Passo 4 — Calcolo dell'integrale

**Primitiva:** La primitiva di $e^{i\phi}$ rispetto a $\phi$ è $\frac{1}{i}e^{i\phi}$ (poiché $\frac{d}{d\phi}e^{i\phi} = ie^{i\phi}$, quindi $\int e^{i\phi}d\phi = \frac{1}{i}e^{i\phi} + C$).

**Applicazione del teorema fondamentale del calcolo:**
$$ I = \left[\frac{1}{i}e^{i\phi}\right]_0^{2\pi} = \frac{1}{i}\left(e^{2\pi i} - e^{0}\right) = \frac{1}{i}\left(e^{2\pi i} - 1\right) $$

#### Passo 5 — Valutazione con la formula di Eulero

📌 **Formula di Eulero:** $e^{i\theta} = \cos(\theta) + i\sin(\theta)$

**Applicazione con $\theta = 2\pi$:**
$$ e^{2\pi i} = \cos(2\pi) + i\sin(2\pi) = 1 + i \cdot 0 = 1 $$

**Sostituzione:**
$$ I = \frac{1}{i}(1 - 1) = \frac{1}{i} \cdot 0 = 0 $$

### 7. Risultato

$$ \boxed{ \int_0^{2\pi} \psi_1^*(\phi) \psi_2(\phi) \, d\phi = 0 } $$

Le funzioni $\psi_1(\phi)$ e $\psi_2(\phi)$ sono ortogonali.

### 8. Controlli di coerenza

🔍 **Controllo dimensionale:** L'integrale è adimensionale (le funzioni d'onda su un anello hanno dimensione $[L^{-1/2}]$ in 1D, ma qui la variabile è un angolo, quindi la "normalizzazione" è diversa; in ogni caso il prodotto $\psi_1^*\psi_2 d\phi$ è adimensionale). ✓

🔍 **Controllo del risultato:** Il risultato $e^{2\pi i} = 1$ è fondamentale. Se avessimo avuto $m_1 = m_2$, l'integrale sarebbe stato $\int_0^{2\pi} e^{0}d\phi = 2\pi \neq 0$, confermando che funzioni con lo stesso $m_l$ NON sono ortogonali (sono la stessa funzione).

### 9. Interpretazione fisica

Gli stati con $m_l = +1$ e $m_l = +2$ rappresentano particelle con diverso momento angolare lungo l'asse dell'anello ($L_z = m_l\hbar$). Questi stati sono ortogonali, il che significa che sono fisicamente distinguibili e le misure di momento angolare daranno sempre uno o l'altro autovalore, mai una sovrapposizione.

### 10. Trabocchetti d'Esame

⚠️ **Attenzione / Errore Tipico d'Esame:**
1. **Dimenticare il complesso coniugato**: Per funzioni complesse, l'ortogonalità richiede $\psi_i^*$, non $\psi_i$. Usare $\psi_1 = e^{i\phi}$ invece di $\psi_1^* = e^{-i\phi}$ porterebbe a $\int_0^{2\pi} e^{3i\phi}d\phi = 0$ comunque, ma per ragioni diverse e in casi più complessi l'errore sarebbe fatale.
2. **Errori con la formula di Eulero**: $e^{2\pi i} = 1$, NON $-1$. Il valore $-1$ si ha per $e^{\pi i}$.
3. **Dimenticare che $\frac{1}{i} = -i$**: Anche se in questo caso non serve perché il risultato è zero, in altri contesti questa semplificazione è essenziale.

---

## Esercizio 30 — Calcolo di Commutatori con l'Hamiltoniano

### Richiesta dell'esercizio

> Ricordando le ben note proprietà dei commutatori:
> $$ [\hat{A}, \hat{B}] = \hat{A}\hat{B} - \hat{B}\hat{A} $$
> $$ [\hat{A}, \hat{B} + \hat{C}] = [\hat{A}, \hat{B}] + [\hat{A}, \hat{C}] $$
> $$ [\hat{A}, c] = 0 \quad \text{(con } c \text{ costante)} $$
> si calcolino i seguenti commutatori:
> (a) $[\hat{H}, \hat{x}]$ e $[\hat{H}, \hat{p}_x]$ considerando l'Hamiltoniano caratterizzato dalle seguenti energie potenziali:
> - (a) $\hat{V}(x) = V_0$ (costante)
> - (b) $\hat{V}(x) = \frac{1}{2}kx^2$ (oscillatore armonico)
>
> dove $\hat{H} = \frac{\hat{p}_x^2}{2m} + \hat{V}(x)$.

### 1. Dati

- Hamiltoniano: $\hat{H} = \frac{\hat{p}_x^2}{2m} + \hat{V}(x)$
- Operatore impulso: $\hat{p}_x = -i\hbar\frac{d}{dx}$
- Operatore posizione: $\hat{x} = x$ (moltiplicazione per $x$)
- Potenziali: (a) $V(x) = V_0$, (b) $V(x) = \frac{1}{2}kx^2$

### 2. Incognite

Calcolare:
- (a) $[\hat{H}, \hat{x}]$ per $V(x) = V_0$
- (b) $[\hat{H}, \hat{x}]$ per $V(x) = \frac{1}{2}kx^2$
- (a) $[\hat{H}, \hat{p}_x]$ per $V(x) = V_0$
- (b) $[\hat{H}, \hat{p}_x]$ per $V(x) = \frac{1}{2}kx^2$

### 3. Teoria fisica necessaria

📌 **Definizione di Commutatore:** $[\hat{A}, \hat{B}] = \hat{A}\hat{B} - \hat{B}\hat{A}$

📌 **Proprietà di linearità:** $[\hat{A}, \hat{B} + \hat{C}] = [\hat{A}, \hat{B}] + [\hat{A}, \hat{C}]$

📌 **Commutatore con costante:** $[\hat{A}, c] = 0$ per $c$ costante

📌 **Relazione fondamentale di commutazione:** $[\hat{x}, \hat{p}_x] = i\hbar$

### 4. Schema Mentale & Strategia

1. Scomporre l'Hamiltoniano in parte cinetica ($\frac{\hat{p}_x^2}{2m}$) e parte potenziale ($\hat{V}(x)$).
2. Usare la linearità del commutatore per separare i contributi.
3. Calcolare $[\hat{p}_x^2, \hat{x}]$ agendo su una funzione di prova $\psi(x)$.
4. Calcolare $[\hat{V}(x), \hat{x}]$ e $[\hat{V}(x), \hat{p}_x]$ per ciascun potenziale.
5. Ricomporre il risultato.

### 5. Svolgimento

#### Parte (a) — Calcolo di $[\hat{H}, \hat{x}]$ con $V(x) = V_0$

**Passo 1 — Scomposizione dell'Hamiltoniano:**
$$ \hat{H} = \frac{\hat{p}_x^2}{2m} + V_0 $$

**Passo 2 — Applicazione della linearità:**
$$ [\hat{H}, \hat{x}] = \left[\frac{\hat{p}_x^2}{2m} + V_0, \hat{x}\right] = \frac{1}{2m}[\hat{p}_x^2, \hat{x}] + [V_0, \hat{x}] $$

Poiché $V_0$ è una costante, $[V_0, \hat{x}] = 0$ (il commutatore di un operatore con una costante è zero, perché la costante commuta con tutto).

**Passo 3 — Calcolo di $[\hat{p}_x^2, \hat{x}]$:**

Per calcolare questo commutatore, applichiamolo a una funzione di prova $\psi(x)$:

$$ [\hat{p}_x^2, \hat{x}]\psi = \hat{p}_x^2(\hat{x}\psi) - \hat{x}(\hat{p}_x^2\psi) $$

Ricordando che $\hat{p}_x = -i\hbar\frac{d}{dx}$ e $\hat{x}\psi = x\psi$:

**Primo termine:** $\hat{p}_x^2(x\psi) = \hat{p}_x[\hat{p}_x(x\psi)]$

Calcoliamo prima $\hat{p}_x(x\psi)$:
$$ \hat{p}_x(x\psi) = -i\hbar\frac{d}{dx}(x\psi) = -i\hbar\left(\psi + x\frac{d\psi}{dx}\right) $$

Ora applichiamo $\hat{p}_x$ di nuovo:
$$ \hat{p}_x^2(x\psi) = -i\hbar\frac{d}{dx}\left[-i\hbar\left(\psi + x\frac{d\psi}{dx}\right)\right] = -\hbar^2\frac{d}{dx}\left(\psi + x\frac{d\psi}{dx}\right) $$

**Derivazione:** $\frac{d}{dx}\left(\psi + x\frac{d\psi}{dx}\right) = \frac{d\psi}{dx} + \frac{d\psi}{dx} + x\frac{d^2\psi}{dx^2} = 2\frac{d\psi}{dx} + x\frac{d^2\psi}{dx^2}$

Quindi:
$$ \hat{p}_x^2(x\psi) = -\hbar^2\left(2\frac{d\psi}{dx} + x\frac{d^2\psi}{dx^2}\right) $$

**Secondo termine:** $\hat{x}(\hat{p}_x^2\psi) = x \cdot \hat{p}_x^2\psi = x \cdot \left(-\hbar^2\frac{d^2\psi}{dx^2}\right) = -\hbar^2 x\frac{d^2\psi}{dx^2}$

**Commutatore:**
$$ [\hat{p}_x^2, \hat{x}]\psi = -\hbar^2\left(2\frac{d\psi}{dx} + x\frac{d^2\psi}{dx^2}\right) - \left(-\hbar^2 x\frac{d^2\psi}{dx^2}\right) = -2\hbar^2\frac{d\psi}{dx} $$

**Risultato:** $[\hat{p}_x^2, \hat{x}] = -2\hbar^2\frac{d}{dx} = -2\hbar^2 \cdot \frac{i}{\hbar}\hat{p}_x \cdot \frac{1}{i} \cdot i = -2i\hbar\hat{p}_x$

Verifichiamo: $\hat{p}_x = -i\hbar\frac{d}{dx}$, quindi $\frac{d}{dx} = \frac{i}{\hbar}\hat{p}_x$. Allora $-2\hbar^2\frac{d}{dx} = -2\hbar^2 \cdot \frac{i}{\hbar}\hat{p}_x = -2i\hbar\hat{p}_x$.

**Passo 4 — Ricomposizione:**
$$ [\hat{H}, \hat{x}] = \frac{1}{2m}(

---

# Eserciziario di Chimica Fisica II — Particella nella Scatola e Fenomeni Quantistici di Base

## Esercizio 42 — Larghezza di una Buca di Potenziale dall'Energia del Livello $n=3$

### Richiesta dell'esercizio

> Una particella di massa $m = 6.65 \times 10^{-27}\ \text{kg}$ è confinata in una buca di potenziale a pareti infinite di larghezza $L$. L'energia del livello caratterizzato da $n = 3$ è $E_3 = 2.00 \times 10^{-24}\ \text{J}$. Calcolare la larghezza della buca di potenziale sapendo che vale $E_n = \frac{n^2 h^2}{8mL^2}$.

### 1. Dati

- $m = 6.65 \times 10^{-27}\ \text{kg}$ (massa della particella)
- $n = 3$ (numero quantico del livello energetico considerato)
- $E_3 = 2.00 \times 10^{-24}\ \text{J}$ (energia del livello $n=3$)
- $h = 6.626 \times 10^{-34}\ \text{J}\cdot\text{s}$ (costante di Planck)

### 2. Incognite

- $L$ = larghezza della buca di potenziale (in metri)

### 3. Geometria e ipotesi

Consideriamo una buca di potenziale unidimensionale a pareti infinite:

$$V(x) = \begin{cases} 0, & 0 \leq x \leq L \\ +\infty, & x < 0 \ \text{oppure} \ x > L \end{cases}$$

La particella è confinata esclusivamente all'interno della regione $[0, L]$. Le pareti infinite impongono condizioni al contorno di annullamento della funzione d'onda agli estremi, condizione che determina la quantizzazione dei livelli energetici.

## Esercizio 43 — Posizione con Densità di Probabilità pari al 25% del Massimo

### Richiesta dell'esercizio

> Si consideri una buca di potenziale di larghezza $L$ e una particella confinata al suo interno descritta dalla funzione d'onda $\psi_n(x) = \left(\frac{2}{L}\right)^{1/2}\sin\left(\frac{n\pi x}{L}\right)$. Calcolare la posizione della particella per la quale la densità di probabilità di essere trovata risulta del 25% della massima densità di probabilità ottenuta quando $n = 1$.

### 1. Dati

- $\psi_n(x) = \left(\frac{2}{L}\right)^{1/2}\sin\left(\frac{n\pi x}{L}\right)$ (funzione d'onda)
- $n = 1$ (stato fondamentale)
- La densità di probabilità cercata è il 25% di quella massima

### 2. Incognite

- Posizione(i) $x$ nella buca dove $|\psi_1(x)|^2 = \frac{1}{4}|\psi_1(x)|^2_{max}$

### 3. Geometria e ipotesi

Buca di potenziale unidimensionale con $0 \leq x \leq L$. La funzione d'onda è normalizzata: $\int_0^L |\psi_n(x)|^2 dx = 1$.

### 4. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:** La densità di probabilità di trovare la particella nella posizione $x$ è data da:
> $$P(x) = |\psi(x)|^2 = \psi^*(x)\psi(x)$$
> Nel caso di funzione d'onda reale, $P(x) = \psi^2(x)$.

Per $n = 1$, la funzione d'onda è:

$$\psi_1(x) = \left(\frac{2}{L}\right)^{1/2}\sin\left(\frac{\pi x}{L}\right)$$

La densità di probabilità:

$$|\psi_1(x)|^2 = \frac{2}{L}\sin^2\left(\frac{\pi x}{L}\right)$$

### 5. Schema Mentale & Strategia

> 🧠 **Schema Mentale & Strategia:** 
> 1. Scrivere la densità di probabilità per $n=1$;
> 2. Trovare il massimo di $|\psi_1(x)|^2$ nell'intervallo $[0, L]$: il seno al quadrato ha massimo 1 quando $\sin\left(\frac{\pi x}{L}\right) = \pm 1$, cioè quando $\frac{\pi x}{L} = \frac{\pi}{2} + k\pi$;
> 3. Identificare la posizione del massimo all'interno della buca;
> 4. Imporre che $|\psi_1(x)|^2$ sia pari a $\frac{1}{4}$ del valore massimo;
> 5. Risolvere l'equazione trigonometrica risultante.

### 6. Svolgimento

#### Passo 1 — Densità di probabilità per $n=1$

$$|\psi_1(x)|^2 = \frac{2}{L}\sin^2\left(\frac{\pi x}{L}\right)$$

#### Passo 2 — Massimizzazione della densità di probabilità

La funzione $\sin^2(\theta)$ ha massimo quando $\sin(\theta) = \pm 1$, cioè quando $\theta = \frac{\pi}{2} + k\pi$ con $k = 0, 1, 2, \ldots$

Quindi:

$$\frac{\pi x}{L} = \frac{\pi}{2} + k\pi$$

Dividiamo tutto per $\pi$:

$$\frac{x}{L} = \frac{1}{2} + k$$

Da cui:

$$x = \frac{L}{2} + kL, \qquad k = 0, 1, 2, \ldots$$

Le posizioni candidate sono: $x = \frac{L}{2}, \frac{3L}{2}, \frac{5L}{2}, \ldots$

Poiché la particella è confinata in $[0, L]$, l'unica posizione accettabile è:

$$x_{max} = \frac{L}{2}$$

In questa posizione:

$$|\psi_1(x_{max})|^2 = \frac{2}{L}\sin^2\left(\frac{\pi}{2}\right) = \frac{2}{L} \cdot 1 = \frac{2}{L}$$

#### Passo 3 — Imposizione della condizione del 25%

Cerchiamo le posizioni $x$ tali che:

$$|\psi_1(x)|^2 = \frac{1}{4}|\psi_1(x_{max})|^2 = \frac{1}{4} \cdot \frac{2}{L} = \frac{1}{2L}$$

Quindi:

$$\frac{2}{L}\sin^2\left(\frac{\pi x}{L}\right) = \frac{1}{2L}$$

Dividiamo entrambi i membri per $\frac{2}{L}$ (che è diverso da zero poiché $L > 0$):

$$\sin^2\left(\frac{\pi x}{L}\right) = \frac{1}{4}$$

#### Passo 4 — Risoluzione dell'equazione trigonometrica

Estraiamo la radice quadrata da entrambi i membri. Attenzione: $\sqrt{\sin^2(\theta)} = |\sin(\theta)|$, quindi:

$$\left|\sin\left(\frac{\pi x}{L}\right)\right| = \frac{1}{2}$$

Questo implica:

$$\sin\left(\frac{\pi x}{L}\right) = \pm\frac{1}{2}$$

Consideriamo prima il caso $\sin\left(\frac{\pi x}{L}\right) = \frac{1}{2}$:

$$\frac{\pi x}{L} = \arcsin\left(\frac{1}{2}\right) + 2k\pi \quad \text{oppure} \quad \frac{\pi x}{L} = \pi - \arcsin\left(\frac{1}{2}\right) + 2k\pi$$

Sappiamo che $\arcsin\left(\frac{1}{2}\right) = \frac{\pi}{6}$ (cioè $30°$). Quindi:

$$\frac{\pi x}{L} = \frac{\pi}{6} + 2k\pi \quad \Rightarrow \quad x = \frac{L}{6} + 2kL$$

oppure:

$$\frac{\pi x}{L} = \pi - \frac{\pi}{6} + 2k\pi = \frac{5\pi}{6} + 2k\pi \quad \Rightarrow \quad x = \frac{5L}{6} + 2kL$$

Consideriamo ora il caso $\sin\left(\frac{\pi x}{L}\right) = -\frac{1}{2}$:

$$\frac{\pi x}{L} = -\frac{\pi}{6} + 2k\pi \quad \Rightarrow \quad x = -\frac{L}{6} + 2kL$$

oppure:

$$\frac{\pi x}{L} = \pi + \frac{\pi}{6} + 2k\pi = \frac{7\pi}{6} + 2k\pi \quad \Rightarrow \quad x = \frac{7L}{6} + 2kL$$

#### Passo 5 — Selezione delle soluzioni nell'intervallo $[0, L]$

Le soluzioni che cadono nell'intervallo $0 \leq x \leq L$ sono:

- $x = \frac{L}{6}$ (da $x = \frac{L}{6} + 2kL$ con $k=0$)
- $x = \frac{5L}{6}$ (da $x = \frac{5L}{6} + 2kL$ con $k=0$)

Le altre soluzioni ($x = -\frac{L}{6}$, $x = \frac{7L}{6}$, $x = \frac{L}{6} + 2L = \frac{13L}{6}$, ecc.) cadono fuori dall'intervallo.

Verifichiamo: $x = \frac{L}{6} \approx 0.167L$ e $x = \frac{5L}{6} \approx 0.833L$, entrambe interne a $[0, L]$.

### 7. Risultato

$$\boxed{x = \frac{L}{6} \quad \text{oppure} \quad x = \frac{5L}{6}}$$

### 8. Controlli di coerenza

> 🔍 **Controllo di Coerenza (Limiti):** Per $x \to 0$ o $x \to L$, la densità di probabilità tende a zero (la funzione d'onda si annulla ai bordi). Per $x = \frac{L}{2}$, la densità è massima. Le soluzioni trovate sono simmetriche rispetto al centro della buca ($\frac{L}{6} + \frac{5L}{6} = L$), come ci si aspetta dalla simmetria della funzione $|\psi_1(x)|^2 = \frac{2}{L}\sin^2\left(\frac{\pi x}{L}\right)$ rispetto a $x = \frac{L}{2}$.

> 🔍 **Controllo di Coerenza (Valore numerico):** Verifichiamo: $\sin\left(\frac{\pi \cdot (L/6)}{L}\right) = \sin\left(\frac{\pi}{6}\right) = \frac{1}{2}$. Quindi $|\psi_1(L/6)|^2 = \frac{2}{L} \cdot \frac{1}{4} = \frac{1}{2L}$, che è esattamente $\frac{1}{4}$ del massimo $\frac{2}{L}$. ✓

> ⚠️ **Attenzione / Errore Tipico d'Esame:** Un errore comune è dimenticare il valore assoluto quando si estrae la radice quadrata di $\sin^2(\theta)$. L'equazione $\sin^2(\theta) = \frac{1}{4}$ ha come soluzioni $\sin(\theta) = \pm\frac{1}{2}$, non solo $\sin(\theta) = \frac{1}{2}$. Tuttavia, nell'intervallo $[0, L]$, le soluzioni con segno negativo danno posizioni fuori dall'intervallo (per $k=0$) o coincidono con quelle già trovate (per valori di $k$ opportuni). Un altro errore è considerare $x = \frac{L}{6}$ come unica soluzione, dimenticando $x = \frac{5L}{6}$.

### 9. Interpretazione fisica

Nello stato fondamentale ($n=1$), la particella ha la massima probabilità di essere trovata al centro della buca ($x = L/2$). I punti in cui la densità di probabilità è un quarto del massimo sono simmetricamente disposti attorno al centro, a un sesto della larghezza da ciascun bordo. Questo riflette la forma "a campana" della distribuzione di probabilità $\propto \sin^2(\pi x/L)$.

## Esercizio 44 — Separazione Energetica tra Livelli di un Atomo di Deuterio

### Richiesta dell'esercizio

> Calcolare la separazione energetica tra i livelli $n = 4$ e $n = 5$ di un atomo di deuterio in una buca unidimensionale di larghezza $L = 5.0\ \text{nm}$.

### 1. Dati

- $L = 5.0\ \text{nm} = 5.0 \times 10^{-9}\ \text{m}$ (larghezza della buca)
- $n_1 = 4$, $n_2 = 5$ (numeri quantici dei livelli considerati)
- $m = 1.6605 \times 10^{-27}\ \text{kg}$ (massa dell'atomo di deuterio, $^2H$)
- $h = 6.626 \times 10^{-34}\ \text{J}\cdot\text{s}$ (costante di Planck)

### 2. Incognite

- $\Delta E = E_5 - E_4$ (separazione energetica in joule)

### 3. Geometria e ipotesi

Buca di potenziale unidimensionale a pareti infinite di larghezza $L = 5.0\ \text{nm}$. L'atomo di deuterio (un protone e un neutrone nel nucleo, più un elettrone) è trattato come una singola particella di massa $m = 2 \times m_p \approx 2 \times 1.6726 \times 10^{-27}\ \text{kg} \approx 3.345 \times 10^{-27}\ \text{kg}$. Tuttavia, il testo fornisce $m = 1.6605 \times 10^{-27}\ \text{kg}$, che è la massa di un nucleone (o meglio, $1\ \text{u} = 1.6605 \times 10^{-27}\ \text{kg}$). Attenzione: il deuterio ha massa $\approx 2\ \text{u}$, ma il testo sembra usare $m = 1.6605 \times 10^{-27}\ \text{kg}$ come massa. Seguiamo il testo.

### 4. Teoria fisica necessaria

Per una particella in una buca unidimensionale:

$$E_n = \frac{n^2 h^2}{8mL^2}$$

La separazione tra due livelli $n_2 > n_1$ è:

$$\Delta E = E_{n_2} - E_{n_1} = \frac{h^2}{8mL^2}(n_2^2 - n_1^2)$$

### 5. Schema Mentale & Strategia

> 🧠 **Schema Mentale & Strategia:**
> 1. Scrivere l'espressione per $E_5$ e $E_4$;
> 2. Calcolare la differenza $\Delta E = E_5 - E_4$;
> 3. Sostituire i valori numerici;
> 4. Verificare le unità di misura.

### 6. Svolgimento

#### Passo 1 — Espressione delle energie

$$E_5 = \frac{5^2 h^2}{8mL^2} = \frac{25h^2}{8mL^2}$$

$$E_4 = \frac{4^2 h^2}{8mL^2} = \frac{16h^2}{8mL^2}$$

#### Passo 2 — Differenza di energia

$$\Delta E = E_5 - E_4 = \frac{25h^2}{8mL^2} - \frac{16h^2}{8mL^2} = \frac{(25-16)h^2}{8mL^2} = \frac{9h^2}{8mL^2}$$

#### Passo 3 — Sostituzione numerica

$$\Delta E = \frac{9 \cdot (6.626 \times 10^{-34}\ \text{J}\cdot\text{s})^2}{8 \cdot (1.6605 \times 10^{-27}\ \text{kg}) \cdot (5.0 \times 10^{-9}\ \text{m})^2}$$

Calcoliamo il numeratore:

$$9 \cdot (6.626 \times 10^{-34})^2 = 9 \cdot 43.90 \times 10^{-68} = 395.1 \times 10^{-68} = 3.951 \times 10^{-66}$$

Calcoliamo il denominatore:

$$8 \cdot (1.6605 \times 10^{-27}) \cdot (5.0 \times 10^{-9})^2 = 8 \cdot 1.6605 \times 10^{-27} \cdot 25 \times 10^{-18}$$

$$= 8 \cdot 1.6605 \cdot 25 \times 10^{-45} = 332.1 \times 10^{-45} = 3.321 \times 10^{-43}$$

Quindi:

$$\Delta E = \frac{3.951 \times 10^{-66}}{3.321 \times 10^{-43}} = \frac{3.951}{3.321} \times 10^{-23} \approx 1.190 \times 10^{-23}\ \text{J}$$

### 7. Risultato

$$\boxed{\Delta E = E_5 - E_4 \approx 1.19 \times 10^{-23}\ \text{J}}$$

### 8. Controlli di coerenza

> 🔍 **Controllo di Coerenza (Dimensionale):** $[h^2] = (\text{J}\cdot\text{s})^2 = \text{kg}^2\cdot\text{m}^4\cdot\text{s}^{-2}$. $[mL^2] = \text{kg}\cdot\text{m}^2$. Quindi $[h^2/(mL^2)] = \text{kg}\cdot\text{m}^2\cdot\text{s}^{-2} = \text{J}$. ✓

> 🔍 **Controllo di Coerenza (Segno):** Poiché $E_n \propto n^2$ e $5^2 > 4^2$, abbiamo $E_5 > E_4$, quindi $\Delta E > 0$. ✓

> 🔍 **Controllo di Coerenza (Limiti):** Se $L \to \infty$, allora $\Delta E \to 0$: in una buca molto larga i livelli energetici si infittiscono e la separazione tende a zero (limite classico). Se $m \to \infty$, $\Delta E \to 0$: particelle molto pesanti hanno livelli energetici molto vicini.

> ⚠️ **Attenzione / Errore Tipico d'Esame:** Attenzione alla massa del deuterio! Il deuterio ($^2H$) ha massa circa $2\ \text{u} = 2 \times 1.6605 \times 10^{-27}\ \text{kg} \approx 3.32 \times 10^{-27}\ \text{kg}$. Se si usa la massa dell'atomo di idrogeno ($1\ \text{u}$) o quella dell'elettrone, il risultato cambia drasticamente. Nel testo, il valore $1.6605 \times 10^{-27}\ \text{kg}$ è usato come massa del deuterio (approssimazione che considera solo un nucleone), ma in realtà il deuterio ha due nucleoni. Verificare sempre la massa corretta della particella.

### 9. Interpretazione fisica

La separazione energetica tra i livelli $n=4$ e $n=5$ è dell'ordine di $10^{-23}\ \text{J}$, che corrisponde a circa $10^{-4}\ \text{eV}$. Questa energia è molto piccola perché la massa del deuterio è grande rispetto a quella dell'elettrone. Per confronto, un elettrone nella stessa buca avrebbe una separazione energetica circa 2000 volte più grande.

---

## Esercizio 45 — Separazione Energetica tra Livelli di un Elettrone in eV

### Richiesta dell'esercizio

> Si calcoli la separazione in energia espressa in J e in eV tra i due livelli caratterizzati da $n = 2$ e $n = 1$ di un elettrone in una buca di potenziale di larghezza $L = 1.0\ \text{nm}$ a pareti infinite (box).

### 1. Dati

- $L = 1.0\ \text{nm} = 1.0 \times 10^{-9}\ \text{m}$ (larghezza della buca)
- $n_1 = 1$, $n_2 = 2$ (numeri quantici)
- $m_e = 9.109 \times 10^{-31}\ \text{kg}$ (massa dell'elettrone)
- $h = 6.626 \times 10^{-34}\ \text{J}\cdot\text{s}$ (costante di Planck)
- $1\ \text{eV} = 1.602 \times 10^{-19}\ \text{J}$ (fattore di conversione)

### 2. Incognite

- $\Delta E = E_2 - E_1$ in joule e in elettronvolt

### 3. Geometria e ipotesi

Buca di potenziale unidimensionale a pareti infinite di larghezza $L = 1.0\ \text{nm}$. L'elettrone è confinato in $[0, L]$.

### 4. Teoria fisica necessaria

$$E_n = \frac{n^2 h^2}{8m_e L^2}$$

### 5. Schema Mentale & Strategia

> 🧠 **Schema Mentale & Strategia:**
> 1. Calcolare $E_2 - E_1$ usando la formula generale;
> 2. Sostituire i valori numerici per ottenere il risultato in joule;
> 3. Convertire in eV dividendo per $1.602 \times 10^{-19}\ \text{J/eV}$.

### 6. Svolgimento

#### Passo 1 — Differenza di energia

$$E_2 - E_1 = \frac{2^2 h^2}{8m_e L^2} - \frac{1^2 h^2}{8m_e L^2} = \frac{(4-1)h^2}{8m_e L^2} = \frac{3h^2}{8m_e L^2}$$

#### Passo 2 — Sostituzione numerica

$$\Delta E = \frac{3 \cdot (6.626 \times 10^{-34}\ \text{J}\cdot\text{s})^2}{8 \cdot (9.109 \times 10^{-31}\ \text{kg}) \cdot (1.0 \times 10^{-9}\ \text{m})^2}$$

Calcoliamo il numeratore:

$$3 \cdot (6.626 \times 10^{-34})^2 = 3 \cdot 43.90 \times 10^{-68} = 131.7 \times 10^{-68} = 1.317 \times 10^{-66}$$

Calcoliamo il denominatore:

$$8 \cdot (9.109 \times 10^{-31}) \cdot (1.0 \times 10^{-9})^2 = 8 \cdot 9.109 \times 10^{-31} \cdot 1.0 \times 10^{-18}$$

$$= 72.872 \times 10^{-49} = 7.2872 \times 10^{-48}$$

Quindi:

$$\Delta E = \frac{1.317 \times 10^{-66}}{7.2872 \times 10^{-48}} = \frac{1.317}{7.2872} \times 10^{-18} \approx 0.1807 \times 10^{-18}\ \text{J}$$

$$\Delta E \approx 1.807 \times 10^{-19}\ \text{J}$$

#### Passo 3 — Conversione in eV

$$\Delta E = 1.807 \times 10^{-19}\ \text{J} \times \frac{1\ \text{eV}}{1.602 \times 10^{-19}\ \text{J}} = \frac{1.807}{1.602}\ \text{eV} \approx 1.128\ \text{eV}$$

### 7. Risultato

$$\boxed{\Delta E = E_2 - E_1 \approx 1.81 \times 10^{-19}\ \text{J} \approx 1.13\ \text{eV}}$$

### 8. Controlli di coerenza

> 🔍 **Controllo di Coerenza (Ordine di grandezza):** Per un elettrone in una buca di $1\ \text{nm}$, l'energia del primo livello è $E_1 = \frac{h^2}{8m_e L^2} \approx \frac{(6.626 \times 10^{-34})^2}{8 \cdot 9.109 \times 10^{-31} \cdot 10^{-18}} \approx 6.02 \times 10^{-20}\ \text$

---

# Oscillatore Armonico Quantistico e Moto su Anello: Eserciziario Guidato e Risolto

La trattazione della buca di potenziale infinita ha mostrato come il confinamento spaziale quantizzi i livelli energetici. Passiamo ora a un sistema in cui il potenziale non è piatto ma cresce quadraticamente con la distanza: l'oscillatore armonico quantistico, il cui spettro energetico è equispaziato e presenta un'energia di punto zero non nulla, diretta conseguenza del principio di indeterminazione.

## Esercizio 54 — Energia di Punto Zero di un Oscillatore Armonico

### Richiesta dell'esercizio

Si calcoli l'energia di punto zero di un oscillatore armonico costituito da due particelle di massa $2.33 \times 10^{-26}\ \text{kg}$ e costante di forza $155\ \text{N m}^{-1}$.

### 1. Dati

- Massa delle particelle: $m = 2.33 \times 10^{-26}\ \text{kg}$
- Costante di forza: $k = 155\ \text{N m}^{-1}$
- Costante di Planck ridotta: $\hbar = 1.0546 \times 10^{-34}\ \text{J s}$

### 2. Incognite

- Energia di punto zero: $E_0$

### 3. Geometria e ipotesi

Il sistema è un oscillatore armonico quantistico unidimensionale. Poiché il testo parla di "due particelle di massa $m$", il moto relativo delle due particelle è descritto da un oscillatore armonico la cui massa efficace è la massa ridotta:

$$\mu = \frac{m \cdot m}{m + m} = \frac{m}{2} = \frac{2.33 \times 10^{-26}}{2} = 1.165 \times 10^{-26}\ \text{kg}$$

Tuttavia, osserviamo che il testo fornisce direttamente la massa $m = 2.33 \times 10^{-26}\ \text{kg}$ e la usa come massa dell'os

## Esercizio 55 — Determinazione della Costante di Forza dalla Separazione dei Livelli

### Richiesta dell'esercizio

Per un oscillatore armonico costituito da una particella di massa $1.33 \times 10^{-25}\ \text{kg}$ la separazione di livelli adiacenti è $4.82 \times 10^{-21}\ \text{J}$. Calcolare la costante di forza dell'oscillatore.

### 1. Dati

- Massa della particella: $m = 1.33 \times 10^{-25}\ \text{kg}$
- Separazione tra livelli adiacenti: $\Delta E = 4.82 \times 10^{-21}\ \text{J}$
- Costante di Planck ridotta: $\hbar = 1.0546 \times 10^{-34}\ \text{J s}$

### 2. Incognite

- Costante di forza: $k$

### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:** I livelli energetici dell'oscillatore armonico sono:
> $$E_v = \left(v + \frac{1}{2}\right)\hbar\omega, \qquad v = 0, 1, 2, \ldots$$

La separazione tra due livelli adiacenti ($v$ e $v+1$) è:

$$\Delta E = E_{v+1} - E_v = \left(v + 1 + \frac{1}{2}\right)\hbar\omega - \left(v + \frac{1}{2}\right)\hbar\omega = \hbar\omega$$

Questa separazione è costante e indipendente da $v$ — una caratteristica distintiva dell'oscillatore armonico.

### 4. Schema Mentale & Strategia

> 🧠 **Schema Mentale & Strategia:**
> 1. Riconoscere che $\Delta E = \hbar\omega$ per l'oscillatore armonico.
> 2. Esprimere $\omega = \sqrt{k/m}$.
> 3. Risolvere per $k$: $k = m\omega^2 = m(\Delta E/\hbar)^2$.
> 4. Verificare le dimensioni: $[k] = \text{kg} \cdot (\text{J}/(\text{J s}))^2 = \text{kg} \cdot \text{s}^{-2} = \text{N m}^{-1}$. ✓

### 5. Svolgimento

**Passo 1: Esprimere la separazione tra livelli**

$$\Delta E = \hbar\omega = \hbar\sqrt{\frac{k}{m}}$$

**Passo 2: Risolvere per $k$**

Elevando al quadrato entrambi i membri:

$$(\Delta E)^2 = \hbar^2 \cdot \frac{k}{m}$$

$$k = \frac{m(\Delta E)^2}{\hbar^2}$$

**Passo 3: Sostituzione numerica**

$$k = \frac{1.33 \times 10^{-25}\ \text{kg} \times (4.82 \times 10^{-21}\ \text{J})^2}{(1.0546 \times 10^{-34}\ \text{J s})^2}$$

Calcoliamo il numeratore:

$$(4.82 \times 10^{-21})^2 = 2.323 \times 10^{-41}\ \text{J}^2$$

$$m \cdot (\Delta E)^2 = 1.33 \times 10^{-25} \times 2.323 \times 10^{-41} = 3.090 \times 10^{-66}\ \text{kg J}^2$$

Calcoliamo il denominatore:

$$\hbar^2 = (1.0546 \times 10^{-34})^2 = 1.112 \times 10^{-68}\ \text{J}^2 \text{s}^2$$

Quindi:

$$k = \frac{3.090 \times 10^{-66}}{1.112 \times 10^{-68}} = 277.9\ \text{kg s}^{-2}$$

Ricordando che $1\ \text{kg s}^{-2} = 1\ \text{N m}^{-1}$:

$$k = 277.9\ \text{N m}^{-1}$$

### 6. Risultato

\[
\boxed{k = 278\ \text{N m}^{-1}}
\]

### 7. Controlli di coerenza

> 🔍 **Controllo di Coerenza (Dimensionale):** 
> $$[k] = \frac{[\text{m}] \cdot [\Delta E]^2}{[\hbar]^2} = \frac{\text{kg} \cdot \text{J}^2}{\text{J}^2 \text{s}^2} = \text{kg s}^{-2} = \text{N m}^{-1}$$ ✓

> 🔍 **Controllo di Coerenza (Limiti):** 
> - Se $\Delta E$ aumenta, $k$ aumenta (proporzionalmente al quadrato). Fisicamente: una maggiore separazione tra livelli implica una maggiore frequenza di oscillazione, quindi una costante di forza più grande. ✓
> - Se $m$ aumenta, $k$ aumenta. Fisicamente: a parità di separazione energetica, una massa maggiore richiede una forza di richiamo più intensa. ✓

### 8. Interpretazione fisica

La costante di forza $k = 278\ \text{N m}^{-1}$ è un valore tipico per legami chimici (ad esempio, il legame in molecole biatomiche ha costanti di forza nell'intervallo $100-1000\ \text{N m}^{-1}$). La separazione costante tra i livelli energetici è una firma sperimentale dell'oscillatore armonico: misurando $\Delta E$ (ad esempio via spettroscopia infrarossa) e conoscendo la massa ridotta, si può risalire alla costante di forza del legame.

### 9. Risultati finali

\[
\boxed{k = \frac{m(\Delta E)^2}{\hbar^2} = 278\ \text{N m}^{-1}}
\]

---

## Esercizio 56 — Lunghezza d'Onda per Transizione tra Livelli Adiacenti

### Richiesta dell'esercizio

Calcolare la lunghezza d'onda di un fotone per indurre una transizione tra livelli energetici adiacenti di un oscillatore armonico di massa pari a quella del protone e costante di forza $855\ \text{N m}^{-1}$. Nel caso si raddoppiasse la massa della particella, calcolare la variazione di lunghezza d'onda sul fotone incidente per continuare ad indurre la stessa transizione.

### 1. Dati

- Massa del protone: $m_p = 1.673 \times 10^{-27}\ \text{kg}$
- Costante di forza: $k = 855\ \text{N m}^{-1}$
- Velocità della luce: $c = 2.998 \times 10^8\ \text{m s}^{-1}$
- Costante di Planck: $h = 6.626 \times 10^{-34}\ \text{J s}$
- Costante di Planck ridotta: $\hbar = 1.0546 \times 10^{-34}\ \text{J s}$

### 2. Incognite

- Lunghezza d'onda del fotone: $\lambda$
- Variazione di lunghezza d'onda quando la massa raddoppia: $\Delta\lambda$

### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:** La separazione tra livelli adiacenti dell'oscillatore armonico è:
> $$\Delta E = \hbar\omega = \hbar\sqrt{\frac{k}{m}}$$

> 📌 **Definizione Rigorosa:** L'energia di un fotone è:
> $$E_{\text{fotone}} = h\nu = \frac{hc}{\lambda}$$

Per indurre la transizione, l'energia del fotone deve uguagliare la separazione tra i livelli:

$$\frac{hc}{\lambda} = \hbar\sqrt{\frac{k}{m}}$$

### 4. Schema Mentale & Strategia

> 🧠 **Schema Mentale & Strategia:**
> 1. Uguagliare l'energia del fotone alla separazione tra livelli.
> 2. Risolvere per $\lambda$: $\lambda = \frac{hc}{\hbar\sqrt{k/m}} = \frac{2\pi c}{\sqrt{k/m}} = 2\pi c\sqrt{\frac{m}{k}}$.
> 3. Per il secondo caso, notare che $\lambda \propto \sqrt{m}$: raddoppiando la massa, $\lambda' = \sqrt{2}\lambda$.
> 4. Calcolare la variazione $\Delta\lambda = \lambda' - \lambda = (\sqrt{2} - 1)\lambda$.

### 5. Svolgimento

**Passo 1: Derivazione della formula per $\lambda$**

$$\frac{hc}{\lambda} = \hbar\sqrt{\frac{k}{m}}$$

Ricordando che $h = 2\pi\hbar$, sostituiamo:

$$\frac{2\pi\hbar c}{\lambda} = \hbar\sqrt{\frac{k}{m}}$$

Semplificando $\hbar$ da entrambi i membri:

$$\frac{2\pi c}{\lambda} = \sqrt{\frac{k}{m}}$$

$$\lambda = 2\pi c\sqrt{\frac{m}{k}}$$

**Passo 2: Sostituzione numerica per il caso originale**

$$\lambda = 2\pi \times 2.998 \times 10^8\ \text{m s}^{-1} \times \sqrt{\frac{1.673 \times 10^{-27}\ \text{kg}}{855\ \text{N m}^{-1}}}$$

Calcoliamo il rapporto sotto radice:

$$\frac{m}{k} = \frac{1.673 \times 10^{-27}}{855} = 1.957 \times 10^{-30}\ \text{kg m N}^{-1}$$

Ricordando che $1\ \text{N} = 1\ \text{kg m s}^{-2}$:

$$\frac{m}{k} = 1.957 \times 10^{-30}\ \text{kg m} \cdot (\text{kg m s}^{-2})^{-1} = 1.957 \times 10^{-30}\ \text{s}^2$$

$$\sqrt{\frac{m}{k}} = \sqrt{1.957 \times 10^{-30}} = 1.399 \times 10^{-15}\ \text{s}$$

Ora:

$$\lambda = 2\pi \times 2.998 \times 10^8 \times 1.399 \times 10^{-15}$$

$$\lambda = 2\pi \times 4.194 \times 10^{-7} = 2.635 \times 10^{-6}\ \text{m}$$

$$\lambda = 2.63 \times 10^{-6}\ \text{m} = 2.63\ \mu\text{m}$$

**Passo 3: Caso con massa raddoppiata**

Se $m' = 2m$, allora:

$$\lambda' = 2\pi c\sqrt{\frac{2m}{k}} = \sqrt{2} \cdot 2\pi c\sqrt{\frac{m}{k}} = \sqrt{2}\lambda$$

$$\lambda' = \sqrt{2} \times 2.63 \times 10^{-6} = 1.414 \times 2.63 \times 10^{-6} = 3.72 \times 10^{-6}\ \text{m}$$

**Passo 4: Calcolo della variazione di lunghezza d'onda**

$$\Delta\lambda = \lambda' - \lambda = (\sqrt{2} - 1)\lambda$$

$$\Delta\lambda = (1.414 - 1) \times 2.63 \times 10^{-6} = 0.414 \times 2.63 \times 10^{-6}$$

$$\Delta\lambda = 1.09 \times 10^{-6}\ \text{m}$$

### 6. Risultati

\[
\boxed{\lambda = 2.63 \times 10^{-6}\ \text{m} = 2.63\ \mu\text{m}}
\]

\[
\boxed{\Delta\lambda = 1.09 \times 10^{-6}\ \text{m} = 1.09\ \mu\text{m}}
\]

### 7. Controlli di coerenza

> 🔍 **Controllo di Coerenza (Dimensionale):** 
> $$\lambda = 2\pi c\sqrt{\frac{m}{k}} \Rightarrow [\lambda] = \text{m s}^{-1} \cdot \sqrt{\frac{\text{kg}}{\text{kg m s}^{-2}}} = \text{m s}^{-1} \cdot \text{s} = \text{m}$$ ✓

> 🔍 **Controllo di Coerenza (Limiti):** 
> - Se $m \to \infty$, $\lambda \to \infty$: una massa infinita ha frequenza di oscillazione nulla, quindi serve un fotone di energia infinitesima (lunghezza d'onda infinita). ✓
> - Se $k \to \infty$, $\lambda \to 0$: una costante di forza infinita produce oscillazioni rapidissime, richiedendo fotoni molto energetici. ✓
> - Raddoppiando la massa, $\lambda$ aumenta di un fattore $\sqrt{2} \approx 1.414$: la variazione è positiva ($\Delta\lambda > 0$), il che significa che il fotone deve avere minore energia (maggiore lunghezza d'onda). ✓

### 8. Interpretazione fisica

La lunghezza d'onda di $2.63\ \mu\text{m}$ cade nella regione dell'infrarosso medio dello spettro elettromagnetico. Le transizioni vibrazionali nelle molecole avvengono tipicamente in questa regione, il che spiega perché la spettroscopia infrarossa è lo strumento principale per studiare le vibrazioni molecolari. Quando la massa aumenta, la frequenza di oscillazione diminuisce (perché $\omega = \sqrt{k/m}$), quindi l'energia necessaria per la transizione diminuisce e la lunghezza d'onda del fotone aumenta.

### 9. Risultati finali

\[
\boxed{\lambda = 2\pi c\sqrt{\frac{m}{k}} = 2.63\ \mu\text{m}}
\]

\[
\boxed{\Delta\lambda = (\sqrt{2} - 1)\lambda = 1.09\ \mu\text{m}}
\]

---

## Esercizio 57 — Verifica della Funzione Gaussiana come Soluzione dell'EQUAZIONE di Schrödinger

### Richiesta dell'esercizio

Si verifichi che una funzione gaussiana del tipo $\psi(x) = e^{-gx^2}$ è soluzione dell'equazione di Schrödinger per lo stato fondamentale di un oscillatore armonico.

### 1. Dati

- Funzione d'onda proposta: $\psi(x) = e^{-gx^2}$ (non normalizzata)
- Parametro incognito: $g$ (da determinare)
- Equazione di Schrödinger per l'oscillatore armonico: $-\frac{\hbar^2}{2m}\frac{d^2\psi}{dx^2} + \frac{1}{2}kx^2\psi = E\psi$

### 2. Incognite

- Valore di $g$ che rende $\psi(x)$ soluzione
- Energia $E$ dello stato fondamentale

### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:** L'equazione di Schrödinger indipendente dal tempo per un oscillatore armonico unidimensionale con potenziale $V(x) = \frac{1}{2}kx^2$ è:
> $$-\frac{\hbar^2}{2m}\frac{d^2\psi}{dx^2} + \frac{1}{2}kx^2\psi = E\psi$$

### 4. Schema Mentale & Strategia

> 🧠 **Schema Mentale & Strategia:**
> 1. Calcolare la derivata prima $\frac{d\psi}{dx}$.
> 2. Calcolare la derivata seconda $\frac{d^2\psi}{dx^2}$.
> 3. Sostituire nell'equazione di Schrödinger.
> 4. Raccogliere i termini in $\psi(x)$ e imporre che l'equazione sia soddisfatta per ogni $x$.
> 5. Questo produce un sistema di due equazioni (coefficiente di $x^2\psi$ e coefficiente di $\psi$ devono annullarsi separatamente).
> 6. Risolvere per $g$ e $E$.

### 5. Svolgimento

**Passo 1: Derivata prima**

$$\psi(x) = e^{-gx^2}$$

Applicando la regola della catena: $\frac{d}{dx}e^{u} = e^{u}\frac{du}{dx}$ con $u = -gx^2$ e $\frac{du}{dx} = -2gx$:

$$\frac{d\psi}{dx} = e^{-gx^2} \cdot (-2gx) = -2gx \cdot e^{-gx^2} = -2gx\psi(x)$$

**Passo 2: Derivata seconda**

Deriviamo $\frac{d\psi}{dx} = -2gx \cdot e^{-gx^2}$ usando la regola del prodotto $\frac{d}{dx}(f \cdot g) = f'g + fg'$ con $f = -2gx$ e $g = e^{-gx^2}$:

$$\frac{d^2\psi}{dx^2} = \frac{d}{dx}(-2gx) \cdot e^{-gx^2} + (-2gx) \cdot \frac{d}{dx}(e^{-gx^2})$$

$$\frac{d^2\psi}{dx^2} = (-2g) \cdot e^{-gx^2} + (-2gx) \cdot (-2gx \cdot e^{-gx^2})$$

$$\frac{d^2\psi}{dx^2} = -2g \cdot e^{-gx^2} + 4g^2x^2 \cdot e^{-gx^2}$$

$$\frac{d^2\psi}{dx^2} = (-2g + 4g^2x^2) \cdot e^{-gx^2} = (-2g + 4g^2x^2)\psi(x)$$

**Passo 3: Sostituzione nell'equazione di Schrödinger**

$$-\frac{\hbar^2}{2m}\frac{d^2\psi}{dx^2} + \frac{1}{2}kx^2\psi = E\psi$$

Sostituendo $\frac{d^2\psi}{dx^2} = (-2g + 4g^2x^2)\psi$:

$$-\frac{\hbar^2}{2m}(-2g + 4g^2x^2)\psi + \frac{1}{2}kx^2\psi = E\psi$$

Sviluppiamo:

$$\frac{\hbar^2 g}{m}\psi - \frac{2\hbar^2 g^2}{m}x^2\psi + \frac{1}{2}kx^2\psi = E\psi$$

**Passo 4: Raccoglimento e sistema di equazioni**

Raccogliamo i termini in $\psi$ e in $x^2\psi$:

$$\left(\frac{\hbar^2 g}{m}\right)\psi + \left(-\frac{2\hbar^2 g^2}{m} + \frac{1}{2}k\right)x^2\psi = E\psi$$

Affinché l'equazione sia soddisfatta per ogni valore di $x$, i coefficienti di $\psi$ e di $x^2\psi$ devono soddisfare separatamente delle condizioni. Riscriviamo come:

$$\left[\frac{\hbar^2 g}{m} - E\right]\psi + \left[-\frac{2\hbar^2 g^2}{m} + \frac{1}{2}k\right]x^2\psi = 0$$

Poiché $\psi(x) \neq 0$ per ogni $x$ (la gaussiana non si annulla mai), e $x^2\psi$ è una funzione linearmente indipendente da $\psi$, entrambi i coefficienti devono annullarsi:

**Condizione 1** (coefficiente di $x^2\psi$):

$$-\frac{2\hbar^2 g^2}{m} + \frac{1}{2}k = 0$$

$$\frac{2\hbar^2 g^2}{m} = \frac{1}{2}k$$

$$g^2 = \frac{km}{4\hbar^2}$$

$$g = \pm\frac{1}{2\hbar}\sqrt{km}$$

**Condizione 2** (coefficiente di $\psi$):

$$\frac{\hbar^2 g}{m} = E$$

**Passo 5: Determinazione di $g$ con segno fisicamente accettabile**

Perché $\psi(x) = e^{-gx^2}$ sia normalizzabile (cioè $\int|\psi|^2dx$ converga), dobbiamo avere $g > 0$. Quindi:

$$g = +\frac{1}{2\hbar}\sqrt{km} = \frac{1}{2}\sqrt{\frac{k}{m}}\cdot\frac{m}{\hbar} = \frac{m\omega}{2\hbar}$$

dove $\omega = \sqrt{k/m}$.

**Passo 6: Determinazione dell'energia**

$$E = \frac{\hbar^2 g}{m} = \frac{\hbar^2}{m} \cdot \frac{m\omega}{2\hbar} = \frac{\hbar\omega}{2}$$

### 6. Risultato

\[
\boxed{g = \frac{m\omega}{2\hbar} = \frac{\sqrt{km}}{2\hbar}}
\]

\[
\boxed{E = \frac{1}{2}\hbar\omega}
\]

### 7. Controlli di coerenza

> 🔍 **Controllo di Coerenza (Dimensionale):** 
> - $[g] = \text{m}^{-2}$ (poiché $gx^2$ deve essere adimensionale nell'esponente).
> - Verifichiamo: $[\sqrt{km}/(2\hbar)] = \sqrt{\text{kg m s}^{-2} \cdot \text{kg}}/(\text{J s}) = \text{kg m}^{1/2}\text{s}^{-1}/(\text{kg m}^2\text{s}^{-1}) = \text{m}^{-3/2}$... 
> 
> Attenzione! Rifacciamo il calcolo dimensionale correttamente:
> $$[\sqrt{km}] = \sqrt{[\text{N m}^{-1}] \cdot [\text{kg}]} = \sqrt{\text{kg s}^{-2} \cdot \text{kg}} = \text{kg s}^{-1}$$
> $$[\hbar] = \text{J s} = \text{kg m}^2\text{s}^{-1}$$
> $$[g] = \frac{\text{kg s}^{-1}}{\text{kg m}^2\text{s}^{-1}} = \text{m}^{-2}$$ ✓

> 🔍 **Controllo di Coerenza (Limiti):** 
> - Se $k \to 0$, $g \to 0$: la gaussiana diventa sempre più larga, tendendo a una costante (particella libera non normalizzabile). ✓
> - Se $m \to \infty$, $g \to \infty$: la gaussiana diventa sempre più stretta, tendendo a una delta di Dirac (particella classica localizzata). ✓
> - L'energia trovata $E = \hbar\omega/2$ è esattamente l'energia di punto zero dell'oscillatore armonico. ✓

### 8. Interpretazione fisica

La funzione gaussiana $e^{-gx^2}$ è la funzione d'onda dello stato fondamentale dell'oscillatore armonico. Il parametro $g$ determina la larghezza della gaussiana: più grande è $g$, più stretta è la distribuzione di probabilità. La larghezza caratteristica è $\Delta x \sim 1/\sqrt{g} = \sqrt{\hbar/(m\omega)}$, che rappresenta l'ampiezza tipica delle fluttuazioni quantistiche della posizione. Questa larghezza diminuisce all'aumentare della massa e della costante di forza (oscillatore più rigido), in accordo con il principio di indeterminazione.

### 9. Risultati finali

\[
\boxed{\psi_0(x) = \exp\left(-\frac{m\omega}{2\hbar}x^2\right), \qquad E_0 = \frac{1}{2}\hbar\omega}
\]

---

## Esercizio 58 — Energia Cinetica Media dell'Oscillatore Armonico

### Richiesta dell'esercizio

Si calcoli l'energia cinetica media di un oscillatore armonico utilizzando le funzioni d'onda note in termini di polinomi di Hermite.

### 1. Dati

- Funzioni d'onda dell'oscillatore armonico: $\psi_v(x) = N_v H_v(y)e^{-y^2/2}$
- Variabile adimensionale: $y = x/\alpha$ con $\alpha = \sqrt{\hbar/(m\omega)}$
- Polinomi di Hermite: $H_v(y)$
- Costante di normalizzazione: $N_v = \left(\frac{1}{\alpha\sqrt{\pi}2^v v!}\right)^{1/2}$

### 2. Incognite

- Valore di attesa dell'energia cinetica: $\langle T \rangle$

### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:** L'operatore energia cinetica in meccanica quantistica è:
> $$\hat{T} = \frac{\hat{p}^2}{2m} = -\frac{\hbar^2}{2m}\frac{d^2}{dx^2}$$

> 📌 **Definizione Rigorosa:** Il valore di attesa di un operatore $\hat{A}$ sullo stato $\psi$ è:
> $$\langle A \rangle = \int_{-\infty}^{+\infty}\psi^*(x)\hat{A}\psi(x)dx$$

> 📌 **Proprietà dei polinomi di Hermite:**
> 1. Equazione differenziale: $H_v''(y) - 2yH_v'(y) + 2vH_v(y) = 0$
> 2. Relazione di ricorsività: $H_{v+1}(y) - 2yH_v(y) + 2vH_{v-1}(y) = 0$
> 3. Ortogonalità: $\int_{-\infty}^{+\infty}H_v(y)H_{v'}(y)e^{-y^2}dy = \sqrt{\pi}2^v v!\,\delta_{vv'}$

### 4. Schema Mentale & Strategia

> 🧠 **Schema Mentale & Strategia:**
> 1. Esprimere l'operatore $\hat{T}$ nella variabile adimensionale $y$.
> 2. Calcolare $\hat{T}\psi_v$ usando le proprietà dei polinomi di Hermite.
> 3. Sostituire nell'integrale per $\langle T \rangle$.
> 4. Usare l'ortogonalità per semplificare gli integrali.
> 5. Ottenere il risultato finale.

### 5. Svolgimento

**Passo 1: Cambio di variabile nell'operatore energia cinetica**

La relazione tra $x$ e $y$ è: $x = \alpha y$, quindi $dx = \alpha\,dy$.

Per la derivata seconda, applichiamo la regola della catena due volte:

$$\frac{d}{dx} = \frac{dy}{dx}\frac{d}{dy} = \frac{1}{\alpha}\frac{d}{dy}$$

$$\frac{d^2}{dx^2} = \frac{1}{\alpha^2}\frac{d^2}{dy^2}$$

Quindi:

$$\hat{T} = -\frac{\hbar^2}{2m}\frac{d^2}{dx^2} = -\frac{\hbar^2}{2m\alpha^2}\frac{d^2}{dy^2}$$

Ora, $\alpha^2 = \frac{\hbar}{m\omega}$, quindi:

$$\frac{\hbar^2}{2m\alpha^2} = \frac{\hbar^2}{2m} \cdot \frac{m\omega}{\hbar} = \frac{\hbar\omega}{2}$$

Pertanto:

$$\hat{T} = -\frac{\

---

# Momenti Angolari, Termini Spettrali e Struttura Elettronica degli Atomi Idrogenoidi

## 1. Prerequisiti e Inquadramento Teorico

### 1.1 Richiamo dei Numeri Quantici per Atomi Idrogenoidi

La trattazione dell'oscillatore armonico quantistico ha introdotto la tecnica dei polinomi di Hermite e l'uso di variabili adimensionali per semplificare l'equazione di Schrödinger. Estendiamo ora questo formalismo al problema dell'atomo idrogenoide, dove la simmetria sferica del potenziale coulombiano richiede l'introduzione dei numeri quantici angolari.

> 📌 **Definizione Rigorosa:**
> In un atomo idrogenoide (un nucleo di carica $+Ze$ con un singolo elettrone), lo stato quantistico dell'elettrone è completamente descritto da quattro numeri quantici:
> - **Numero quantico principale**: $n = 1, 2, 3, \ldots$ — determina l'energia e la dimensione dell'orbitale.
> - **Numero quantico di momento angolare orbitale**: $l = 0, 1, 2, \ldots, n-1$ — determina la forma dell'orbitale e il modulo del momento angolare.
> - **Numero quantico magnetico orbitale**: $m_l = -l, -l+1, \ldots, 0, \ldots, l-1, l$ — determina l'orientazione spaziale dell'orbitale.
> - **Numero quantico magnetico di spin**: $m_s = +\frac{1}{2}, -\frac{1}{2}$ — descrive l'orientazione dello spin elettronico.

**L'energia dell'atomo idrogenoide** con l'elettrone nel guscio $n$ è data da:

$$
E_n = -\frac{hc\tilde{\mathcal{R}}_H Z^2}{n^2}
$$

dove:
- $h = 6.626 \times 10^{-34} \, \text{J}\cdot\text{s}$ è la costante di Planck;
- $c = 2.998 \times 10^8 \, \text{m/s}$ è la velocità della

## 2. Algebra dei Momenti Angolari per Sistemi a Più Elettroni

### 2.1 Accoppiamento di Momenti Angolari (Serie di Clebsch-Gordan)

> 📌 **Definizione Rigorosa:**
> Quando un sistema atomico possiede più elettroni, i singoli momenti angolari orbitali $\vec{l}_i$ e di spin $\vec{s}_i$ si combinano per formare momenti angolari totali. Nell'ambito dell'accoppiamento di **Russell-Saunders** (o accoppiamento $LS$), valido quando l'interazione spin-orbita è debole rispetto alle interazioni elettrone-elettrone:
> 1. I momenti angolari orbitali individuali si sommano: $\vec{L} = \sum_i \vec{l}_i$
> 2. Gli spin individuali si sommano: $\vec{S} = \sum_i \vec{s}_i$
> 3. Il momento angolare totale è: $\vec{J} = \vec{L} + \vec{S}$

**Regola di addizione dei momenti angolari (serie di Clebsch-Gordan):**

Dati due momenti angolari con numeri quantici $j_1$ e $j_2$, il numero quantico totale $J$ può assumere i valori:

$$
J = j_1 + j_2, \; j_1 + j_2 - 1, \; \ldots, \; |j_1 - j_2|
$$

> 💡 **Intuizione & Senso Fisico:**
> L'accoppiamento di due momenti angolari produce tutti i valori compresi tra la somma e il valore assoluto della differenza, procedendo a passi di 1. Questo è analogo alla somma vettoriale quantistica: il risultato può variare da "allineamento massimo" ($j_1 + j_2$) a "anti-allineamento massimo" ($|j_1 - j_2|$).

### 2.2 Applicazione all'Accoppiamento Orbita-Orbita

Per l'accoppiamento di due momenti angolari orbitali $l_1$ e $l_2$:

$$
L = l_1 + l_2, \; l_1 + l_2 - 1, \; \ldots, \; |l_1 - l_2|
$$

### 2.3 Applicazione all'Accoppiamento Spin-Spin

Per l'accoppiamento di due spin $s_1 = s_2 = \frac{1}{2}$:

$$
S = s_1 + s_2, \; s_1 + s_2 - 1, \; \ldots, \; |s_1 - s_2| = 1, 0
$$

### 2.4 Applicazione all'Accoppiamento Spin-Orbita

Per l'accoppiamento tra momento orbitale totale $L$ e spin totale $S$:

$$
J = L + S, \; L + S - 1, \; \ldots, \; |L - S|
$$

## 3. Notazione Spettroscopica (Russell-Saunders)

> 📌 **Definizione Rigorosa:**
> Il termine spettroscopico di uno stato elettronico è rappresentato come:
> $$^{2S+1}L_J$$
> dove:
> - **$2S+1$** (apice) è la **molteplicità di spin**;
> - **$L$** è il simbolo letterale del momento angolare orbitale totale;
> - **$J$** (pedice) è il numero quantico del momento angolare totale.

**Corrispondenza tra valore di $L$ e simbolo spettroscopico:**

| $L$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|-----|---|---|---|---|---|---|---|
| Simbolo | S | P | D | F | G | H | I |

> ⚠️ **Attenzione / Errore Tipico d'Esame:**
> La corrispondenza lettera-valore prosegue alfabeticamente dopo la F: G ($L=4$), H ($L=5$), I ($L=6$), ecc. **Attenzione a non confondere la S di "S" ($L=0$) con la S di "spin"!** Il simbolo S nel termine spettroscopico indica sempre $L=0$.

**Regole di Hund per la determinazione dello stato fondamentale:**

1. **Massima molteplicità di spin**: lo stato fondamentale ha il massimo valore di $S$ compatibile con il principio di esclusione di Pauli.
2. **Massimo $L$**: a parità di $S$, lo stato fondamentale ha il massimo valore di $L$.
3. **Regola del terzo riempimento** (per determinare $J$):
   - Se il sottolivello è **meno che semiriempito** ($n_{elettroni} < 2l+1$): lo stato fondamentale ha $J = |L - S|$ (minimo $J$);
   - Se il sottolivello è **più che semiriempito** ($n_{elettroni} > 2l+1$): lo stato fondamentale ha $J = L + S$ (massimo $J$);
   - Se il sottolivello è **esattamente semiriempito**: $L = 0$ e $J = S$.

---

## 4. Esercizi Svolti

---

### Esercizio 70 — Momento Angolare Orbitale in Diversi Orbitali

#### Richiesta dell'esercizio

> Si calcoli il momento angolare orbitalico di un elettrone nei seguenti orbitali: 1s, 3s, 3d, 2p, 3p.

#### 1. Dati

Per ogni orbitale, identifichiamo il numero quantico $l$:

| Orbitale | $n$ | $l$ |
|----------|-----|-----|
| 1s | 1 | 0 |
| 3s | 3 | 0 |
| 3d | 3 | 2 |
| 2p | 2 | 1 |
| 3p | 3 | 1 |

#### 2. Incognite

Il modulo del momento angolare orbitale $|\vec{l}|$ per ciascun orbitale.

#### 3. Geometria e ipotesi

Non è richiesta una geometria specifica: il momento angolare orbitale è una proprietà quantistica intrinseca dell'orbitale, determinata esclusivamente dal numero quantico $l$.

#### 4. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:**
> Il modulo del momento angolare orbitale è quantizzato:
> $$|\vec{l}| = \sqrt{l(l+1)}\,\hbar$$
> dove $\hbar = \frac{h}{2\pi} = 1.055 \times 10^{-34} \, \text{J}\cdot\text{s}$ è la costante di Planck ridotta.

#### 5. Schema Mentale & Strategia

🧠 **Schema Mentale & Strategia:**
> 1. Identificare il valore di $l$ per ciascun orbitale (dalla notazione spettroscopica: s $\Rightarrow l=0$, p $\Rightarrow l=1$, d $\Rightarrow l=2$, f $\Rightarrow l=3$).
> 2. Sostituire $l$ nella formula $|\vec{l}| = \sqrt{l(l+1)}\,\hbar$.
> 3. Semplificare la radice quadrata quando possibile.

#### 6. Svolgimento

**Orbitali 1s e 3s:**

Per entrambi gli orbitali s, $l = 0$. Sostituendo nella formula:

$$
|\vec{l}| = \sqrt{0(0+1)}\,\hbar = \sqrt{0}\,\hbar = 0
$$

**Interpretazione fisica:** Un elettrone in un orbitale s non possiede momento angolare orbitale. La nuvola elettronica è sfericamente simmetrica.

**Orbitali 2p e 3p:**

Per entrambi gli orbitali p, $l = 1$. Sostituendo:

$$
|\vec{l}| = \sqrt{1(1+1)}\,\hbar = \sqrt{2}\,\hbar
$$

**Orbitale 3d:**

Per l'orbitale d, $l = 2$. Sostituendo:

$$
|\vec{l}| = \sqrt{2(2+1)}\,\hbar = \sqrt{6}\,\hbar
$$

#### 7. Risultato

$$
\boxed{
\begin{aligned}
|\vec{l}|_{1s} &= 0 \\
|\vec{l}|_{3s} &= 0 \\
|\vec{l}|_{2p} &= \sqrt{2}\,\hbar \\
|\vec{l}|_{3p} &= \sqrt{2}\,\hbar \\
|\vec{l}|_{3d} &= \sqrt{6}\,\hbar
\end{aligned}
}
$$

#### 8. Controlli di coerenza

🔍 **Controllo di Coerenza (Dimensionale / Limiti):**
- **Dimensioni**: $[\hbar] = \text{J}\cdot\text{s} = \text{kg}\cdot\text{m}^2/\text{s}$, che sono le dimensioni di un momento angolare. ✓
- **Limite $l = 0$**: il momento angolare si annulla, come previsto per orbitali s. ✓
- **Crescita con $l$**: $\sqrt{2} < \sqrt{6}$, quindi $|\vec{l}|$ aumenta con $l$. ✓

#### 9. Trappole d'Esame

> ⚠️ **Attenzione / Errore Tipico d'Esame:**
> **Errore frequente**: scrivere $|\vec{l}| = l\hbar$ invece di $|\vec{l}| = \sqrt{l(l+1)}\hbar$. Per $l = 1$, il risultato corretto è $\sqrt{2}\hbar \approx 1.414\hbar$, NON $1\hbar$. La differenza deriva dal fatto che il momento angolare non può mai essere completamente allineato con un asse (principio di indeterminazione).

---

### Esercizio 71 — Accoppiamento di Momenti Orbitali (d e f)

#### Richiesta dell'esercizio

> Si calcolino i possibili valori di momento angolare $L$ per un sistema costituito da un elettrone nel sottoguscio d accoppiato ad un elettrone nel sottoguscio f.

#### 1. Dati

- Elettrone 1: sottoguscio d $\Rightarrow l_1 = 2$
- Elettrone 2: sottoguscio f $\Rightarrow l_2 = 3$

#### 2. Incognite

I possibili valori del numero quantico orbitale totale $L$ e i corrispondenti moduli $|\vec{L}|$.

#### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:**
> Per l'accoppiamento di due momenti angolari orbitali $l_1$ e $l_2$, il numero quantico totale $L$ assume tutti i valori interi compresi tra $|l_1 - l_2|$ e $l_1 + l_2$:
> $$L = l_1 + l_2, \; l_1 + l_2 - 1, \; \ldots, \; |l_1 - l_2|$$

#### 4. Schema Mentale & Strategia

🧠 **Schema Mentale & Strategia:**
> 1. Identificare $l_1$ e $l_2$ dalla notazione dei sottogusci.
> 2. Calcolare $l_1 + l_2$ (valore massimo) e $|l_1 - l_2|$ (valore minimo).
> 3. Elencare tutti i valori interi nel range.
> 4. Convertire in notazione spettroscopica.

#### 5. Svolgimento

**Passo 1: Identificazione dei valori di $l$**

Per l'elettrone nel sottoguscio d: $l_1 = 2$.
Per l'elettrone nel sottoguscio f: $l_2 = 3$.

**Passo 2: Calcolo del valore massimo**

$$
L_{max} = l_1 + l_2 = 2 + 3 = 5
$$

**Passo 3: Calcolo del valore minimo**

$$
L_{min} = |l_1 - l_2| = |2 - 3| = 1
$$

**Passo 4: Elenco dei valori possibili**

Procedendo a passi di 1 da $L_{max}$ a $L_{min}$:

$$
L = 5, 4, 3, 2, 1
$$

**Passo 5: Conversione in notazione spettroscopica**

| $L$ | Simbolo |
|-----|---------|
| 5 | H |
| 4 | G |
| 3 | F |
| 2 | D |
| 1 | P |

**Passo 6: Calcolo dei moduli (se richiesto)**

Per ciascun valore di $L$, il modulo del momento angolare orbitale totale è:

$$
|\vec{L}| = \sqrt{L(L+1)}\,\hbar
$$

Ad esempio, per $L = 5$: $|\vec{L}| = \sqrt{5 \times 6}\,\hbar = \sqrt{30}\,\hbar$.

#### 6. Risultato

$$
\boxed{
L = 5, 4, 3, 2, 1
}
$$

In notazione spettroscopica: stati H, G, F, D, P.

#### 7. Controlli di coerenza

🔍 **Controllo di Coerenza:**
- **Numero di valori**: $L_{max} - L_{min} + 1 = 5 - 1 + 1 = 5$ valori. ✓
- **Simmetria**: il range è simmetrico rispetto a $(L_{max} + L_{min})/2 = 3$. ✓

#### 8. Trappole d'Esame

> ⚠️ **Attenzione / Errore Tipico d'Esame:**
> **Errore frequente**: dimenticare di includere tutti i valori intermedi. La serie procede a passi di 1, quindi da $l_1 + l_2 = 5$ si scende a $4, 3, 2, 1$, NON direttamente a $|l_1 - l_2| = 1$.

---

### Esercizio 72 — Molteplicità di Spin per Due Elettroni

#### Richiesta dell'esercizio

> Si determini la molteplicità di spin dei possibili stati risultanti dall'accoppiamento di due spin elettronici $s_1$ e $s_2$.

#### 1. Dati

- $s_1 = \frac{1}{2}$ (spin dell'elettrone 1)
- $s_2 = \frac{1}{2}$ (spin dell'elettrone 2)

#### 2. Incognite

I possibili valori di $S$ e le corrispondenti molteplicità di spin $2S+1$.

#### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:**
> Per l'accoppiamento di due spin $s_1$ e $s_2$:
> $$S = s_1 + s_2, \; s_1 + s_2 - 1, \; \ldots, \; |s_1 - s_2|$$
> La **molteplicità di spin** è data da $2S+1$ e rappresenta il numero di stati di spin degeneri in assenza di campo magnetico.

#### 4. Svolgimento

**Passo 1: Applicazione della serie di Clebsch-Gordan**

$$
S = \frac{1}{2} + \frac{1}{2}, \; \left|\frac{1}{2} - \frac{1}{2}\right| = 1, 0
$$

**Passo 2: Calcolo delle molteplicità**

Per $S = 0$:

$$
2S + 1 = 2(0) + 1 = 1 \quad \Rightarrow \quad \text{stato di singoletto}
$$

Per $S = 1$:

$$
2S + 1 = 2(1) + 1 = 3 \quad \Rightarrow \quad \text{stato di tripletto}
$$

#### 5. Risultato

$$
\boxed{
\begin{aligned}
S &= 0, \quad \text{molteplicità} = 1 \quad (\text{singoletto}) \\
S &= 1, \quad \text{molteplicità} = 3 \quad (\text{tripletto})
\end{aligned}
}
$$

#### 6. Interpretazione fisica

> 💡 **Intuizione & Senso Fisico:**
> Due elettroni con spin paralleli ($S = 1$) possono avere $M_S = +1, 0, -1$ (tre stati: tripletto). Due elettroni con spin antiparalleli ($S = 0$) hanno solo $M_S = 0$ (un solo stato: singoletto). Lo stato di tripletto ha energia diversa dal singoletto a causa dell'interazione di scambio (meccanica quantistica).

#### 7. Trappole d'Esame

> ⚠️ **Attenzione / Errore Tipico d'Esame:**
> **Errore frequente**: confondere la molteplicità $2S+1$ con il valore di $S$. Per $S = 1$, la molteplicità è 3 (tripletto), NON 1. La molteplicità indica quanti stati $M_S$ esistono per quel valore di $S$: $M_S = -S, -S+1, \ldots, S$, quindi $2S+1$ valori.

---

### Esercizio 73 — Momento Angolare Totale $J$ per $L = 2$, $S = 1$

#### Richiesta dell'esercizio

> Si determinino i numeri quantici relativi al momento angolare totale $J$ di un sistema caratterizzato da $L = 2$ e $S = 1$. Si indichi nei diversi casi qual è lo stato a minor energia (stato fondamentale).

#### 1. Dati

- $L = 2$ (momento angolare orbitale totale)
- $S = 1$ (momento angolare di spin totale)

#### 2. Incognite

I possibili valori di $J$ e la determinazione dello stato fondamentale.

#### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:**
> Per l'accoppiamento spin-orbita ($LS$ coupling):
> $$J = L + S, \; L + S - 1, \; \ldots, \; |L - S|$$
> La **regola di Hund** per determinare lo stato fondamentale:
> - Sottolivello **meno che semiriempito**: $J_{min} = |L - S|$;
> - Sottolivello **più che semiriempito**: $J_{max} = L + S$.

#### 4. Svolgimento

**Passo 1: Applicazione della serie di Clebsch-Gordan**

$$
J = 2 + 1, \; 2 + 1 - 1, \; \ldots, \; |2 - 1| = 3, 2, 1
$$

**Passo 2: Determinazione dello stato fondamentale**

La scelta tra $J_{min}$ e $J_{max}$ dipende dal riempimento del sottolivello:

- **Caso A — Sottolivello meno che semiriempito** (es. configurazione $d^1$, $d^2$, $d^3$, $d^4$):
  
  Lo stato fondamentale ha $J = |L - S| = |2 - 1| = 1$.
  
  In notazione spettroscopica: $^3D_1$.

- **Caso B — Sottolivello più che semiriempito** (es. configurazione $d^6$, $d^7$, $d^8$, $d^9$):
  
  Lo stato fondamentale ha $J = L + S = 2 + 1 = 3$.
  
  In notazione spettroscopica: $^3D_3$.

#### 5. Risultato

$$
\boxed{
J = 3, 2, 1
}
$$

$$
\boxed{
\begin{aligned}
\text{Sottolivello meno che semiriempito:} &\quad J_{fond} = 1 \quad (^3D_1) \\
\text{Sottolivello più che semiriempito:} &\quad J_{fond} = 3 \quad (^3D_3)
\end{aligned}
}
$$

#### 6. Interpretazione fisica

> 💡 **Intuizione & Senso Fisico:**
> L'interazione spin-orbita separa i tre livelli $J = 1, 2, 3$ in energia. Per un sottolivello meno che semiriempito, l'accoppiamento spin-orbita favorisce l'anti-allineamento tra $\vec{L}$ e $\vec{S}$ (minimo $J$), mentre per un sottolivello più che semiriempito favorisce l'allineamento (massimo $J$). Questo è dovuto al fatto che per più di metà riempimento, le "lacune" (hole) si comportano come particelle con momento angolare opposto.

#### 7. Trappole d'Esame

> ⚠️ **Attenzione / Errore Tipico d'Esame:**
> **Errore frequente**: applicare la regola del terzo riempimento senza conoscere la configurazione elettronica specifica. La regola richiede di sapere se il sottolivello è meno o più che semiriempito, il che dipende dal numero di elettroni nel sottolivello $d$, $f$, ecc.

---

### Esercizio 74 — Degenerazione Orbitalica dei Livelli dell'Idrogeno

#### Richiesta dell'esercizio

> Si determini la degenerazione orbitalica dei livelli dell'atomo di idrogeno caratterizzati da un'energia (a) $-hc\tilde{\mathcal{R}}_H$, (b) $-hc\tilde{\mathcal{R}}_H/9$, (c) $-hc\tilde{\mathcal{R}}_H/25$.

#### 1. Dati

L'energia dell'atomo di idrogeno ($Z = 1$) è:

$$
E_n = -\frac{hc\tilde{\mathcal{R}}_H}{n^2}
$$

Confrontando con i valori dati:
- (a) $E = -hc\tilde{\mathcal{R}}_H \Rightarrow n^2 = 1 \Rightarrow n = 1$
- (b) $E = -hc\tilde{\mathcal{R}}_H/9 \Rightarrow n^2 = 9 \Rightarrow n = 3$
- (c) $E = -hc\tilde{\mathcal{R}}_H/25 \Rightarrow n^2 = 25 \Rightarrow n = 5$

#### 2. Incognite

La degenerazione orbitalica $g = n^2$ per ciascun livello.

#### 3. Teoria fisica necessaria

> 📌 **Definizione Rigorosa:**
> Per un atomo idrogenoide, la degenerazione orbitalica del livello $n$ è $g = n^2$, corrispondente al numero di combinazioni $(l, m_l)$ possibili:
> $$g = \sum_{l=0}^{n-1} (2l+1) = n^2$$

#### 4. Svolgimento

**Caso (a): $n = 1$**

$$
g = n^2 = 1^2 = 1
$$

Stati possibili: $n=1, l=0, m_l=0$ — 1 stato (orbitale 1s).

**Caso (b): $n = 3$**

$$
g = n^2 = 3^2 = 9
$$

Stati possibili:
- $n=3, l=0, m_l=0$: 1 stato (orbitale 3s);
- $n=3, l=1, m_l=+1, 0, -1$: 3 stati (orbitali 3p);
- $n=3, l=2, m_l=+2, +1, 0, -1, -2$: 5 stati (orbitali 3d).

Totale: $1 + 3 + 5 = 9$ stati.

**Caso (c): $n = 5$**

$$
g = n^2 = 5^2 = 25
$$

Stati possibili:
- $n=5, l=0, m_l=0$: 1 stato (orbitale 5s);
- $n=5, l=1, m_l=+1, 0, -1$: 3 stati (orbitali 5p);
- $n=5, l=2, m_l=+2, +1, 0, -1, -2$: 5 stati (orbitali 5d);
- $n=5, l=3, m_l=+3, +2, +1, 0, -1, -2, -3$: 7 stati (orbitali 5f);
- $n=5, l=4, m_l=+4, +3, +2, +1, 0, -1, -2, -3, -4$: 9 stati (orbitali 5g).

Totale: $1 + 3 + 5 + 7 + 9 = 25$ stati.

#### 5. Risultato

$$
\boxed{
\begin{aligned}
\text{(a) } E = -hc\tilde{\mathcal{R}}_H &\Rightarrow n = 1, \quad g = 1 \\
\text{(b) } E = -hc\tilde{\mathcal{R}}_H/9 &\Rightarrow n = 3, \quad g = 9 \\
\text{(c) } E = -hc\tilde{\mathcal{R}}_H/25 &\Rightarrow n = 5, \quad g = 25
\end{aligned}
}
$$

#### 6. Controlli di coerenza

🔍 **Controllo di Coerenza:**
- **Formula generale**: $g = n^2$ è verificata in tutti e tre i casi. ✓
- **Somma dei sottogusci**: $1 + 3 + 5 + \ldots + (2n-1) = n^2$. ✓

#### 7. Trappole d'Esame

> ⚠️ **Attenzione / Errore Tipico d'Esame:**
> **Errore frequente**: confondere la degenerazione orbitalica ($n^2$) con la degenerazione totale che include lo spin ($2n^2$). Se l'esercizio chiede esplicitamente "degenerazione orbitalica", la risposta è $n^2$; se chiede "degenerazione totale" o "considerando lo spin", la risposta è $2n^2$.

---

### Esercizio 75 — Interpretazione del Termine Spettrale $^1D_2$

#### Richiesta dell'esercizio

> Si consideri il termine spettrale $^1D_2$. Si determinino i numeri quantici relativi ai diversi momenti angolari che caratterizzano lo stato fondamentale dell'atomo.

#### 1. Dati

Termine spettrale: $^1D_2$

#### 2. Incognite

I numeri quantici $L$, $S$, $J$ e le relative molteplicità.

#### 3. Svolgimento

**Passo 1: Identificazione di $L$ dal simbolo letterale**

Il simbolo D corrisponde a $L = 2$.

**Passo 2: Identificazione di $S$ dalla molteplicità**

L'apice 1 indica la molteplicità di spin: $2S + 1 = 1$.

Risolvendo per $S$:

$$
2S + 1 = 1 \Rightarrow 2S = 0 \Rightarrow S = 0
$$

Si tratta di uno stato di **singoletto**.

**Passo 3: Identificazione di $J$ dal pedice**

Il pedice 2 indica $J = 2$.

**Passo

---

**Ponte Concettuale:**
La trattazione dei termini spettrali atomici si conclude con l'analisi del termine $^1D_2$, evidenziando come la notazione spettroscopica codifichi i numeri quantici di momento angolare. Questo formalismo si estende ora naturalmente alle molecole biatomiche, dove la simmetria assiale richiede una nuova classificazione degli stati elettronici basata sulla proiezione del momento angolare orbitale lungo l'asse internucleare.

---

# Teoria degli Orbitali Molecolari per Molecole Biatomiche: Eserciziario Completo

# Esercizio 84 — Configurazioni Elettroniche e Ordini di Legame di Li₂, Be₂ e C₂

## Richiesta dell'esercizio

> Si forniscano le configurazioni elettroniche dello stato fondamentale e gli ordini di legame delle seguenti molecole: (a) Li₂; (b) Be₂; e (c) C₂.

### 1. Dati

- **Molecole considerate**: Li₂, Be₂, C₂
- **Numeri atomici**: Z(Li) = 3, Z(Be) = 4, Z(C) = 6
- **Numero totale di elettroni per molecola**:
  - Li₂: 2 × 3 = 6 elettroni
  - Be₂: 2 × 4 = 8 elettroni
  - C₂: 2 × 6 = 12 elettroni

### 2. Incognite

- Configurazione elettronica dello stato fondamentale per ciascuna molecola
- Ordine di legame per ciascuna molecola

### 3. Geometria e ipotesi

Le tre molecole sono **molecole biatomiche omonucleari** con numero di elettroni ≤ 14. Si utilizza quindi il diagramma dei livelli energetici per sistemi con ≤ 14 elettroni, in cui l'ordine dei livelli è:

$$1s\sigma_g < 1s\sigma_u^* < 2s\sigma_g < 2s\sigma_u^* < 2p\pi_u < 2p\sigma_g$$

> 📌 **Definizione Rigorosa — Ordine di legame:**
> $$BO = \frac{n_{legame} - n_{antilegame}}{2}$$
> dove $n_{legame}$ è il numero di elettroni in orbitali di lega


## Richiesta dell'esercizio

> 📌 **Richiamo Didattico (Canonical Review):** I fondamenti teorici, le definizioni formali e le derivazioni analitiche di *Richiesta dell'esercizio* sono già stati formalizzati in modo esaustivo nella sezione precedente (Richiesta dell'esercizio). Per consultare le equazioni di partenza e la dimostrazione completa, si rimanda a tale trattazione. Di seguito si procede direttamente con l'applicazione specifica e i calcoli d'esame.


# Esercizio 86 — Configurazioni Elettroniche di CO, NO e CN⁻


## Richiesta dell'esercizio

> 📌 **Richiamo Didattico (Canonical Review):** I fondamenti teorici, le definizioni formali e le derivazioni analitiche di *Richiesta dell'esercizio* sono già stati formalizzati in modo esaustivo nella sezione precedente (Richiesta dell'esercizio). Per consultare le equazioni di partenza e la dimostrazione completa, si rimanda a tale trattazione. Di seguito si procede direttamente con l'applicazione specifica e i calcoli d'esame.


# Esercizio 87 — Confronto tra Energie di Dissociazione di B₂ e C₂


## Richiesta dell'esercizio

> 📌 **Richiamo Didattico (Canonical Review):** I fondamenti teorici, le definizioni formali e le derivazioni analitiche di *Richiesta dell'esercizio* sono già stati formalizzati in modo esaustivo nella sezione precedente (Richiesta dell'esercizio). Per consultare le equazioni di partenza e la dimostrazione completa, si rimanda a tale trattazione. Di seguito si procede direttamente con l'applicazione specifica e i calcoli d'esame.

