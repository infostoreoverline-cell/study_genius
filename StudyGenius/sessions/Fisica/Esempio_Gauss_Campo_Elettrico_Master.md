# Elettrostatica: Teorema di Gauss e Campo Elettrico di Distribuzioni Sferiche

## 1. Motivazione Fondazionale e Inquadramento del Problema

Nella trattazione elettrostatica dei sistemi continui di carica, l'integrazione diretta della legge di Coulomb:

$$\mathbf{E}(\mathbf{r}) = \frac{1}{4\pi \varepsilon_0} \int_{V'} \frac{\rho(\mathbf{r}')}{|\mathbf{r} - \mathbf{r}'|^3} (\mathbf{r} - \mathbf{r}') \, dV'$$

presenta una complessità algebrica e computazionale elevatissima per distribuzioni estese, a causa della natura vettoriale e tridimensionale dell'integrando. 

Tuttavia, quando il sistema presenta un'alta simmetria (sferica, cilindrica o planare), il **Teorema di Gauss** consente di calcolare la topologia e l'intensità del campo elettrico attraverso una procedura algebrica scalare immediata, sfruttando la relazione fondamentale tra flusso uscente e sorgenti di carica interne.

> 📌 **Definizione Formale (Flusso Elettrostatico)**:
> Dato un campo vettoriale $\mathbf{E}(\mathbf{r})$ continuo e differenziabile su una regione dello spazio e una superficie chiusa orientata $\Sigma$, si definisce flusso di $\mathbf{E}$ attraverso $\Sigma$ la quantità scalare:
> 
> $$\Phi_{\Sigma}(\mathbf{E}) \equiv \oint_{\Sigma} \mathbf{E} \cdot d\mathbf{A} = \oint_{\Sigma} (\mathbf{E} \cdot \hat{n}) \, dA$$
> 
> dove $\hat{n}$ rappresenta il versore normale uscente in ogni punto infinitesimo $dA$ della superficie.

> 💡 **Intuizione Fisica**:
> Il flusso non misura un moto materiale di particelle, ma la densità e il numero netto di linee di forza che attraversano la superficie orientata. Se una sorgente (carica positiva) risiede all'interno, le linee divergono verso l'esterno producendo un flusso netto positivo; al contrario, un pozzo (carica negativa) produce un flusso netto negativo.

---

## 2. Il Teorema di Gauss: Forma Integrale e Differenziale

Il legame analitico tra il flusso elettrostatico e le cariche sorgenti è sancito dal primo grande pilastro dell'elettromagnetismo classico (Prima Equazione di Maxwell).

> 📐 **Teorema di Gauss (Forma Integrale)**:
> Il flusso del campo elettrostatico $\mathbf{E}$ attraverso una qualunque superficie chiusa $\Sigma$ è pari alla carica totale netta $Q_{\text{int}}$ racchiusa all'interno di $\Sigma$, divisa per la costante dielettrica del vuoto $\varepsilon_0$:
> 
> $$\oint_{\Sigma} \mathbf{E} \cdot \hat{n} \, dA = \frac{Q_{\text{int}}}{\varepsilon_0}$$
> 
> indipendentemente dalla forma geometrica della superficie $\Sigma$ e dalla specifica distribuzione spaziale delle cariche all'interno di essa.

Applicando il **Teorema della Divergenza** (o di Gauss-Green):

$$\oint_{\Sigma} \mathbf{E} \cdot \hat{n} \, dA = \int_{V} (\nabla \cdot \mathbf{E}) \, dV$$

ed esprimendo la carica interna in termini di densità volumica di carica $\rho(\mathbf{r})$, si ha:

$$\int_{V} (\nabla \cdot \mathbf{E}) \, dV = \frac{1}{\varepsilon_0} \int_{V} \rho(\mathbf{r}) \, dV \implies \int_{V} \left( \nabla \cdot \mathbf{E} - \frac{\rho}{\varepsilon_0} \right) dV = 0$$

Data l'arbitrarietà del volume di integrazione $V$, l'integrando deve annullarsi identicamente in ogni punto dello spazio, pervenendo alla **Forma Differenziale**:

$$\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}$$

---

## 3. Geometria del Sistema: Sfera Dielettrica Uniformemente Carica

Consideriamo un solido dielettrico sferico di raggio $R$ centrato nell'origine, caratterizzato da una densità volumica di carica uniforme e costante:

$$\rho(\mathbf{r}) = \begin{cases} \rho_0 > 0 & \text{se } r \le R \\ 0 & \text{se } r > R \end{cases}$$

La carica totale associata al corpo è:

$$Q_{\text{tot}} = \int_0^R \rho_0 \, (4\pi r'^2 \, dr') = \rho_0 \left( \frac{4}{3}\pi R^3 \right)$$

```json:figure
{
  "id": "sphere-gauss-geometry",
  "title": "Figura 1: Schema Geometrico Quotato della Sfera Carica e Superfici Gaussiane Concentriche",
  "svg": "<svg viewBox=\"0 0 560 260\" xmlns=\"http://www.w3.org/2000/svg\" width=\"100%\" height=\"auto\" style=\"max-width: 560px; margin: 0 auto; display: block;\"><defs><radialGradient id=\"spGrad\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0%\" stop-color=\"#bfdbfe\" stop-opacity=\"0.9\"/><stop offset=\"70%\" stop-color=\"#93c5fd\" stop-opacity=\"0.7\"/><stop offset=\"100%\" stop-color=\"#60a5fa\" stop-opacity=\"0.85\"/></radialGradient><marker id=\"spArrow\" viewBox=\"0 0 10 10\" refX=\"6\" refY=\"5\" markerWidth=\"6\" markerHeight=\"6\" orient=\"auto-start-reverse\"><path d=\"M 0 1.5 L 8 5 L 0 8.5 z\" fill=\"#1e3a8a\"/></marker></defs><circle cx=\"280\" cy=\"130\" r=\"85\" fill=\"url(#spGrad)\" stroke=\"#2563eb\" stroke-width=\"2\"/><text x=\"280\" y=\"105\" text-anchor=\"middle\" font-family=\"'STIX Two Text', serif\" font-size=\"13\" font-weight=\"600\" fill=\"#1e3a8a\">Distribuzione Sferica (ρ = cost)</text><circle cx=\"280\" cy=\"130\" r=\"3.5\" fill=\"#0f172a\"/><text x=\"270\" y=\"142\" font-family=\"Inter, sans-serif\" font-size=\"11\" font-weight=\"bold\" fill=\"#0f172a\">O</text><line x1=\"280\" y1=\"130\" x2=\"340\" y2=\"70\" stroke=\"#0f172a\" stroke-width=\"1.5\" stroke-dasharray=\"3,3\"/><text x=\"315\" y=\"95\" font-family=\"'JetBrains Mono', monospace\" font-size=\"11.5\" font-weight=\"bold\" fill=\"#0f172a\">R</text><circle cx=\"280\" cy=\"130\" r=\"45\" fill=\"none\" stroke=\"#d97706\" stroke-width=\"1.8\" stroke-dasharray=\"4,4\"/><text x=\"280\" y=\"165\" text-anchor=\"middle\" font-family=\"Inter, sans-serif\" font-size=\"10.5\" fill=\"#b45309\" font-weight=\"600\">Σ₁ (r &lt; R)</text><circle cx=\"280\" cy=\"130\" r=\"118\" fill=\"none\" stroke=\"#059669\" stroke-width=\"1.8\" stroke-dasharray=\"5,5\"/><text x=\"280\" y=\"238\" text-anchor=\"middle\" font-family=\"Inter, sans-serif\" font-size=\"10.5\" fill=\"#047857\" font-weight=\"600\">Σ₂ (r &gt; R)</text><line x1=\"398\" y1=\"130\" x2=\"448\" y2=\"130\" stroke=\"#1e3a8a\" stroke-width=\"2\" marker-end=\"url(#spArrow)\"/><text x=\"458\" y=\"134\" font-family=\"'STIX Two Text', serif\" font-size=\"12\" font-weight=\"bold\" fill=\"#1e3a8a\">E(r)</text><line x1=\"398\" y1=\"130\" x2=\"428\" y2=\"130\" stroke=\"#dc2626\" stroke-width=\"1.5\"/><text x=\"423\" y=\"122\" font-family=\"Inter, sans-serif\" font-size=\"10\" font-weight=\"bold\" fill=\"#dc2626\">n̂</text></svg>",
  "caption": "Definizione geometrica delle superfici gaussiane concentriche Σ₁ (regime interno r &lt; R) e Σ₂ (regime esterno r &gt; R). La simmetria rotazionale impone che il campo E(r) sia puramente radiale e parallelo al versore normale n̂ in ogni punto."
}
```

---

## 4. Derivazione Analitica Rigorosa

### Proprietà di Simmetria Fondamentali:
1. **Invarianza Rotazionale**: La distribuzione di carica è invariante sotto qualsiasi rotazione attorno al centro $O$. Di conseguenza, il campo elettrico non può dipendere dalle coordinate angolari $(\theta, \phi)$, ma unicamente dalla distanza radiale: $E = E(r)$.
2. **Direzione Radiale Pura**: L'unica direzione spazialmente privilegiata per ogni punto $\mathbf{r}$ è la retta congiungente l'origine al punto stesso. Pertanto: $\mathbf{E}(\mathbf{r}) = E(r) \hat{r}$.

Scegliamo come superficie gaussiana $\Sigma$ una sfera geometrica di raggio $r$ concentrica alla distribuzione. In ogni punto di tale superficie:
- $\mathbf{E}$ è perpendicolare alla superficie e parallelo al versore normale uscente $\hat{n} = \hat{r}$, cosicché $\mathbf{E} \cdot \hat{n} = E(r) \cos(0^\circ) = E(r)$.
- Il modulo $E(r)$ è costante per tutti i punti situati alla medesima distanza $r$.

Il flusso attraverso la sfera gaussiana si fattorizza dunque scalarmente:

$$\Phi_{\Sigma}(\mathbf{E}) = \oint_{\Sigma} E(r) \, dA = E(r) \oint_{\Sigma} dA = E(r) \cdot \left( 4\pi r^2 \right)$$

Uguagliando tale espressione al Teorema di Gauss:

$$E(r) \cdot 4\pi r^2 = \frac{Q_{\text{int}}(r)}{\varepsilon_0} \implies E(r) = \frac{Q_{\text{int}}(r)}{4\pi \varepsilon_0 r^2}$$

---

### Caso 1: Regione Interna ($r < R$)

La superficie gaussiana $\Sigma_1$ racchiude unicamente la porzione di carica compresa nella sfera di raggio $r$:

$$Q_{\text{int}}(r) = \int_0^r \rho_0 (4\pi r'^2) \, dr' = \rho_0 \left( \frac{4}{3}\pi r^3 \right)$$

Sostituendo nell'equazione del campo:

$$E_{\text{int}}(r) = \frac{\rho_0 \frac{4}{3}\pi r^3}{4\pi \varepsilon_0 r^2} = \frac{\rho_0}{3\varepsilon_0} r$$

Esprimendo la densità volumica in funzione della carica totale $Q_{\text{tot}} = \frac{4}{3}\pi R^3 \rho_0 \implies \rho_0 = \frac{3 Q_{\text{tot}}}{4\pi R^3}$, otteniamo:

$$E_{\text{int}}(r) = \frac{Q_{\text{tot}}}{4\pi \varepsilon_0 R^3} r \quad (r < R)$$

> 💡 **Significato Fisico dell'Andamento Lineare**:
> All'interno della sfera, il campo elettrico cresce proporzionalmente alla distanza dal centro ($E \propto r$), similmente a una forza elastica (oscillatore armonico tridimensionale). Al centro esatto ($r = 0$), il campo si annulla identicamente per simmetria vettoriale speculare.

---

### Caso 2: Regione Esterna ($r \ge R$)

La superficie gaussiana $\Sigma_2$ racchiude l'intera distribuzione di carica:

$$Q_{\text{int}}(r) = Q_{\text{tot}} = \rho_0 \left( \frac{4}{3}\pi R^3 \right) = \text{costante}$$

Di conseguenza:

$$E_{\text{est}}(r) = \frac{Q_{\text{tot}}}{4\pi \varepsilon_0 r^2} = \frac{\rho_0 R^3}{3\varepsilon_0 r^2} \quad (r \ge R)$$

> 📌 **Teorema del Guscio (Newton-Gauss)**:
> All'esterno di una qualsiasi distribuzione sferica uniforme, il campo elettrico prodotto è matematicamente identico a quello che si avrebbe qualora tutta la carica fosse concentrata in un unico punto singolare coincidente con il centro della sfera.

---

## 5. Grafico Quantitativo Vettoriale dell'Andamento Radiale

Il grafico seguente rappresenta il profilo del modulo del campo elettrico normalizzato $E(r)/E_{\text{max}}$ in funzione della distanza adimensionale $r/R$. Esso è generato in modo puramente deterministico dall'espressione a tratti esatta derivata nei paragrafi precedenti.

```json:scientific-figure
{
  "discipline": "Fisica Generale II",
  "title": "Il campo elettrico radiale cresce linearmente all’interno della sfera e decade come 1/r² all’esterno",
  "subtitle": "Punti: raccordi analitici; linea blu continua: soluzione esatta del Teorema di Gauss; zona azzurra: sfera materiale (r ≤ R).",
  "mainPlotSvg": "<svg class=\"academic-plot-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 440 250\" width=\"100%\" height=\"auto\" style=\"display: block; margin: 0 auto; background: #ffffff;\"><defs><marker id=\"gAxArr\" viewBox=\"0 0 10 10\" refX=\"6\" refY=\"5\" markerWidth=\"5\" markerHeight=\"5\" orient=\"auto-start-reverse\"><path d=\"M 0 1.5 L 8 5 L 0 8.5 z\" fill=\"#334155\" /></marker><linearGradient id=\"gSphGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0%\" stop-color=\"#38bdf8\" stop-opacity=\"0.22\" /><stop offset=\"100%\" stop-color=\"#38bdf8\" stop-opacity=\"0.05\" /></linearGradient></defs><rect x=\"60\" y=\"35\" width=\"90\" height=\"175\" fill=\"url(#gSphGrad)\" /><line x1=\"150\" y1=\"35\" x2=\"150\" y2=\"210\" stroke=\"#0284c7\" stroke-width=\"1.2\" stroke-dasharray=\"4,3\" /><text x=\"105\" y=\"25\" text-anchor=\"middle\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"9\" font-weight=\"600\" fill=\"#0284c7\">Interno (r &lt; R)</text><text x=\"280\" y=\"25\" text-anchor=\"middle\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"9\" font-weight=\"600\" fill=\"#64748b\">Esterno (r &gt; R)</text><line x1=\"60\" y1=\"45\" x2=\"420\" y2=\"45\" stroke=\"#f1f5f9\" stroke-width=\"1\" /><text x=\"52\" y=\"49\" text-anchor=\"end\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"9.5\" fill=\"#64748b\">1.0</text><line x1=\"60\" y1=\"86\" x2=\"420\" y2=\"86\" stroke=\"#f1f5f9\" stroke-width=\"1\" /><text x=\"52\" y=\"90\" text-anchor=\"end\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"9.5\" fill=\"#64748b\">0.75</text><line x1=\"60\" y1=\"127\" x2=\"420\" y2=\"127\" stroke=\"#f1f5f9\" stroke-width=\"1\" /><text x=\"52\" y=\"131\" text-anchor=\"end\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"9.5\" fill=\"#64748b\">0.50</text><line x1=\"60\" y1=\"168\" x2=\"420\" y2=\"168\" stroke=\"#f1f5f9\" stroke-width=\"1\" /><text x=\"52\" y=\"172\" text-anchor=\"end\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"9.5\" fill=\"#64748b\">0.25</text><line x1=\"150\" y1=\"35\" x2=\"150\" y2=\"210\" stroke=\"#f1f5f9\" stroke-width=\"1\" /><text x=\"150\" y=\"224\" text-anchor=\"middle\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"9.5\" font-weight=\"700\" fill=\"#0284c7\">1.0 (R)</text><line x1=\"240\" y1=\"35\" x2=\"240\" y2=\"210\" stroke=\"#f1f5f9\" stroke-width=\"1\" /><text x=\"240\" y=\"224\" text-anchor=\"middle\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"9.5\" fill=\"#64748b\">2.0</text><line x1=\"330\" y1=\"35\" x2=\"330\" y2=\"210\" stroke=\"#f1f5f9\" stroke-width=\"1\" /><text x=\"330\" y=\"224\" text-anchor=\"middle\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"9.5\" fill=\"#64748b\">3.0</text><line x1=\"415\" y1=\"35\" x2=\"415\" y2=\"210\" stroke=\"#f1f5f9\" stroke-width=\"1\" /><text x=\"415\" y=\"224\" text-anchor=\"middle\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"9.5\" fill=\"#64748b\">4.0</text><line x1=\"60\" y1=\"210\" x2=\"430\" y2=\"210\" stroke=\"#334155\" stroke-width=\"1.2\" marker-end=\"url(#gAxArr)\" /><line x1=\"60\" y1=\"210\" x2=\"60\" y2=\"15\" stroke=\"#334155\" stroke-width=\"1.2\" marker-end=\"url(#gAxArr)\" /><text x=\"245\" y=\"242\" text-anchor=\"middle\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"10.5\" font-weight=\"600\" fill=\"#1e293b\">Coordinata Radiale Adimensionale r / R [-]</text><text transform=\"rotate(-90, 18, 110)\" x=\"18\" y=\"110\" text-anchor=\"middle\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"10.5\" font-weight=\"600\" fill=\"#1e293b\">Campo Elettrico Normalizzato E(r) / E_max [-]</text><line x1=\"60\" y1=\"210\" x2=\"150\" y2=\"45\" stroke=\"#0284c7\" stroke-width=\"2.5\" stroke-linecap=\"round\" /><path d=\"M 150 45 C 180 120 210 160 240 168.75 C 285 182 315 190 330 191.6 C 370 195.5 400 198.5 415 199.6\" fill=\"none\" stroke=\"#0284c7\" stroke-width=\"2.5\" stroke-linecap=\"round\" /><circle cx=\"60\" cy=\"210\" r=\"3.5\" fill=\"#0284c7\" /><circle cx=\"150\" cy=\"45\" r=\"4.5\" fill=\"#dc2626\" stroke=\"#ffffff\" stroke-width=\"1.5\" /><circle cx=\"240\" cy=\"168.75\" r=\"3.5\" fill=\"#0284c7\" stroke=\"#ffffff\" stroke-width=\"1\" /><circle cx=\"330\" cy=\"191.6\" r=\"3.5\" fill=\"#0284c7\" stroke=\"#ffffff\" stroke-width=\"1\" /><rect x=\"160\" y=\"38\" width=\"105\" height=\"18\" rx=\"3\" fill=\"#fee2e2\" stroke=\"#ef4444\" stroke-width=\"0.8\" /><text x=\"212\" y=\"51\" text-anchor=\"middle\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"9\" font-weight=\"700\" fill=\"#991b1b\">Punto di Salto a r = R</text></svg>",
  "resultPanel": {
    "heading": "Relazioni di Gauss",
    "equations": [
      "$$\\begin{aligned} E_{\\text{int}}(r) &= \\frac{\\rho_0}{3\\varepsilon_0}\\,r \\quad (r \\le R) \\\\[4pt] E_{\\text{est}}(r) &= \\frac{\\rho_0 R^3}{3\\varepsilon_0 r^2} \\quad (r > R) \\\\[4pt] E_{\\max} &= E(R) = \\frac{\\rho_0 R}{3\\varepsilon_0} \\\\[4pt] E(2R) &= \\frac{1}{4} E_{\\max} \\\\ E(3R) &= \\frac{1}{9} E_{\\max} \\end{aligned}$$"
    ],
    "notes": "Modello derivato rigorosamente dall'integrazione di superficie del Teorema di Gauss per densità di carica uniforme."
  },
  "diagnosticSvg": "<svg class=\"academic-plot-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 620 95\" width=\"100%\" height=\"auto\" style=\"display: block; margin: 0 auto; background: #ffffff;\"><defs><marker id=\"gDiagArr\" viewBox=\"0 0 10 10\" refX=\"6\" refY=\"5\" markerWidth=\"5\" markerHeight=\"5\" orient=\"auto-start-reverse\"><path d=\"M 0 1.5 L 8 5 L 0 8.5 z\" fill=\"#334155\" /></marker></defs><line x1=\"60\" y1=\"45\" x2=\"590\" y2=\"45\" stroke=\"#334155\" stroke-width=\"1.1\" marker-end=\"url(#gDiagArr)\" /><line x1=\"60\" y1=\"85\" x2=\"60\" y2=\"10\" stroke=\"#334155\" stroke-width=\"1.1\" marker-end=\"url(#gDiagArr)\" /><line x1=\"60\" y1=\"45\" x2=\"575\" y2=\"45\" stroke=\"#94a3b8\" stroke-width=\"1\" stroke-dasharray=\"3,3\" /><text x=\"52\" y=\"48\" text-anchor=\"end\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"8.5\" fill=\"#64748b\">0</text><line x1=\"60\" y1=\"20\" x2=\"575\" y2=\"20\" stroke=\"#f1f5f9\" stroke-width=\"1\" /><text x=\"52\" y=\"23\" text-anchor=\"end\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"8.5\" fill=\"#64748b\">+1.0</text><line x1=\"60\" y1=\"75\" x2=\"575\" y2=\"75\" stroke=\"#f1f5f9\" stroke-width=\"1\" /><text x=\"52\" y=\"78\" text-anchor=\"end\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"8.5\" fill=\"#64748b\">-2.0</text><line x1=\"60\" y1=\"20\" x2=\"192\" y2=\"20\" stroke=\"#16a34a\" stroke-width=\"2.2\" /><circle cx=\"60\" cy=\"20\" r=\"2.5\" fill=\"#16a34a\" /><circle cx=\"192\" cy=\"20\" r=\"2.5\" fill=\"#16a34a\" /><line x1=\"192\" y1=\"20\" x2=\"192\" y2=\"75\" stroke=\"#dc2626\" stroke-width=\"1.2\" stroke-dasharray=\"3,3\" /><circle cx=\"192\" cy=\"75\" r=\"2.5\" fill=\"#dc2626\" /><path d=\"M 192 75 C 240 55 320 48 400 46 C 480 45.2 550 45.1 575 45\" fill=\"none\" stroke=\"#16a34a\" stroke-width=\"2.2\" /><text transform=\"rotate(-90, 18, 48)\" x=\"18\" y=\"48\" text-anchor=\"middle\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"8.5\" font-weight=\"600\" fill=\"#1e293b\">dE / dr</text><text x=\"325\" y=\"90\" text-anchor=\"middle\" font-family=\"'Source Sans 3', 'Inter', sans-serif\" font-size=\"9.5\" font-weight=\"600\" fill=\"#1e293b\">Diagnostica della Derivata Prima: Discontinuità di Salto Δ(dE/dr) = -ρ₀/ε₀ sulla Superficie r = R</text></svg>",
  "takeaway": "Il campo elettrico è continuo ovunque, ma ammette un punto angoloso alla superficie r = R: la discontinuità della derivata prima dE/dr riflette fisicamente il salto netto della densità volumica di carica da ρ₀ a 0.",
  "caption": "Figura 1 — Profilo radiale del campo elettrostatico per distribuzione sferica uniforme. (1) Rappresentazione: a sinistra, andamento di E(r)/E_max con transizione lineare interna e decadimento quadratico inverso esterno; a destra, pannello con le espressioni analitiche chiuse; in basso, diagnostica della discontinuità di salto della derivata prima. (2) Condizioni: simmetria sferica, dielettrico lineare omogeneo isotropo (P° = 1 bar, T = 298.15 K). (3) Provenienza: FORMULA_DERIVED (equazioni differenziali di Maxwell). (4) Limiti: valido per distribuzione statica continua con carica totale Q."
}
```

> 📊 **Didascalia Tecnica e Didattica Quadripartita (Standard Metodo Master)**:
> 
> 1. **Cosa Rappresenta il Grafico**:  
>    Rappresenta l'evoluzione quantitativa del modulo del campo elettrico vettoriale generato da una densità volumica uniforme $\rho$, scalato rispetto al suo valore massimo $E_{\text{max}} = \frac{\rho R}{3\varepsilon_0}$ registrato alla superficie $r = R$.
> 
> 2. **Cosa Osservare Analiticamente**:  
>    - **Regime $r < R$ (Zona Interna)**: Andamento rigorosamente rettilineo con pendenza costante $\frac{dE}{dr} = \frac{\rho}{3\varepsilon_0} > 0$. Il campo parte da zero e raggiunge il picco unitario sul bordo.
>    - **Punto Singolare $r = R$**: Continuità del campo $E(R^-) = E(R^+) = 1$, ma **discontinuità di salto nella derivata prima**:
>      $$\lim_{r \to R^-} \frac{dE}{dr} = \frac{\rho}{3\varepsilon_0} \ne \lim_{r \to R^+} \frac{dE}{dr} = -\frac{2\rho}{3\varepsilon_0}$$
>      Questo punto angoloso riflette fisicamente il salto brusco della densità di carica da $\rho_0$ a $0$.
>    - **Regime $r > R$ (Zona Esterna)**: Decadimento asintotico newtoniano proporzionale a $r^{-2}$. A $r = 2R$ il campo si riduce a $\frac{1}{4}$ del picco; a $r = 3R$ a $\frac{1}{9} \approx 0.111$.
> 
> 3. **Corrispondenza con le Formule Derivate**:  
>    Il grafico visualizza geometricamente il passaggio dal comportamento differenziale $\nabla \cdot \mathbf{E} = \frac{\rho_0}{\varepsilon_0} \implies E \propto r$ al regime in vuoto $\nabla \cdot \mathbf{E} = 0 \implies E \propto \frac{1}{r^2}$.
> 
> 4. **Trabocchetto Cognitivo Tipico (Trap Preventivo)**:  
>    Non confondere una sfera dielettrica isolante con una **sfera conduttrice metallica in equilibrio**. In un conduttore all'equilibrio elettrostatico:
>    - Le cariche libere migrano interamente sulla superficie esterna ($\rho_{\text{int}} = 0$).
>    - Il campo interno è identicamente nullo: $E_{\text{cond}}(r) = 0$ per $r < R$.
>    - Alla superficie si ha un salto discontinuo finito pari a $E(R^+) = \frac{\sigma}{\varepsilon_0}$ (Teorema di Coulomb per conduttori).

---

## 6. Controlli di Coerenza e Limiti Notevoli

| Test di Validazione | Formula / Limite Calcolato | Esito Fisico e Interpretazione |
| :--- | :--- | :--- |
| **Omogeneità Dimensionale** | $[E] = \frac{[\rho][r]}{[\varepsilon_0]} = \frac{(\text{C}\cdot\text{m}^{-3})(\text{m})}{\text{C}^2\cdot\text{N}^{-1}\cdot\text{m}^{-2}} = \frac{\text{N}}{\text{C}} = \frac{\text{V}}{\text{m}}$ | Coerente con le unità SI fondamentali. |
| **Limite al Centro ($r \to 0$)** | $\lim_{r \to 0^+} E_{\text{int}}(r) = \lim_{r \to 0} \left(\frac{\rho}{3\varepsilon_0} r\right) = 0$ | Soddisfatto. Il centro è un punto di equilibrio instabile. |
| **Continuità sul Bordo ($r = R$)** | $E_{\text{int}}(R) = \frac{\rho R}{3\varepsilon_0} = E_{\text{est}}(R)$ | Continuità $C^0$ garantita dall'assenza di densità superficiali $\sigma$. |
| **Limite Asintotico ($r \gg R$)** | $\lim_{r \to \infty} E_{\text{est}}(r) = 0$ con ordine $O(r^{-2})$ | Recupero esatto della legge di Coulomb per carica puntiforme. |

---

## 7. Formulario Ragionato & Checklist d'Esame

> 📋 **Formulario Riassuntivo delle Relazioni Operative**:
> - **Flusso Elettrostatico**: $\Phi_{\Sigma}(\mathbf{E}) = \oint_{\Sigma} \mathbf{E} \cdot \hat{n} \, dA = \frac{Q_{\text{int}}}{\varepsilon_0}$
> - **Equazione Locale di Poisson/Gauss**: $\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}$
> - **Campo Interno ($r < R$)**: $\mathbf{E}_{\text{int}}(\mathbf{r}) = \frac{\rho_0}{3\varepsilon_0} \mathbf{r} = \frac{Q_{\text{tot}}}{4\pi\varepsilon_0 R^3} \mathbf{r}$
> - **Campo Esterno ($r \ge R$)**: $\mathbf{E}_{\text{est}}(\mathbf{r}) = \frac{Q_{\text{tot}}}{4\pi\varepsilon_0 r^2} \hat{r} = \frac{\rho_0 R^3}{3\varepsilon_0 r^2} \hat{r}$
> - **Potenziale Elettrostatico $V(r)$ con $V(\infty)=0$**:
>   - Per $r \ge R$: $V(r) = \frac{Q_{\text{tot}}}{4\pi\varepsilon_0 r}$
>   - Per $r < R$: $V(r) = \frac{Q_{\text{tot}}}{8\pi\varepsilon_0 R} \left( 3 - \frac{r^2}{R^2} \right)$

> 🎓 **Domande Tipiche da Esame Orale / Scritto**:
> 1. *Cosa accade alla continuità del campo e del potenziale se la carica anziché essere uniforme è distribuita come $\rho(r) = A r$?*  
>    **Risposta**: Si integra $Q_{\text{int}}(r) = \int_0^r A r' (4\pi r'^2) dr' = \pi A r^4$, ottenendo $E(r) \propto r^2$ all'interno. Il campo rimane continuo a $r = R$, ma varia la pendenza della curva.
> 2. *Se una carica puntiforme $q$ è posta al centro di una cavità vuota interna a una sfera carica, quanto vale il campo nella cavità?*  
>    **Risposta**: Per $r < R_{\text{cav}}$, $Q_{\text{int}} = q$, quindi il campo nella cavità è puramente coulombiano $E(r) = \frac{q}{4\pi\varepsilon_0 r^2}$, non nullo.
