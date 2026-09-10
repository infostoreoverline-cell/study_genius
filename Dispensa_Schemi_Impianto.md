# Fondamenti di Impianti Chimici
## La Rappresentazione degli Impianti Chimici — Manuale Didattico e Dispensa di Corso
**Docente:** Prof. Andrea C. Santomaso | **Corso di Laurea:** Chimica Industriale | **Ateneo:** Università degli Studi di Padova

---

# Capitolo 1: Tassonomia e Tipologie di Rappresentazione degli Impianti Chimici

### 1.1 Il Ciclo di Progettazione di un Impianto di Processo
La progettazione di un impianto industriale chimico si sviluppa attraverso fasi progressive e sequenziali che trasformano la pura sintesi di laboratorio in un'infrastruttura produttiva sicura, economica ed efficiente:

$$\text{Sintesi di Laboratorio} \longrightarrow \text{Studio di Fattibilità} \longrightarrow \text{Progetto di Base (Process)} \longrightarrow \text{Progetto di Dettaglio (P\&ID, Piping)} \longrightarrow \text{Cantiere ed Esercizio}$$

I documenti grafici rappresentano il linguaggio unificato mediante il quale ingegneri di processo, progettisti meccanici, strumentisti e operatori di impianto comunicano senza ambiguità. 

### 1.2 La Gerarchia dei Tre Schemi Fondamentali
La letteratura industriale e gli standard accademici classificano le rappresentazioni grafiche in tre livelli a risoluzione progressiva:

1. **Schema a Blocchi (Block Flow Diagram - BFD)**: Panoramica logico-stechiometrica del processo suddivisa in macro-operazioni unitarie.
2. **Schema di Processo (Process Flow Diagram - PFD)**: Descrizione dettagliata dell'impianto con tutte le apparecchiature principali, le correnti di materia, le condizioni termodinamiche e le utenze ausiliarie.
3. **Schema di Marcia e Strumentazione (Piping and Instrumentation Diagram - P&ID)**: Descrizione costruttiva ed operativa contenente ogni singola tubazione, valvola, sensore, trasmettitore e loop di regolazione.

---

# Capitolo 2: Lo Schema a Blocchi (Block Flow Diagram - BFD)

### 2.1 Finalità e Convenzioni Grafiche del BFD
Nello schema a blocchi ciascun rettangolo rappresenta un'intera sezione dell'impianto (o una singola operazione unitaria fondamentale). Le linee di flusso collegano i blocchi indicando il percorso delle materie prime, dei semilavorati, dei prodotti finiti e delle correnti di riciclo o spurgo.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 740 220" width="100%" height="auto" style="max-width: 740px; margin: 15px auto; display: block;">
    <defs>
      <marker id="bfd-arr" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="6.5" markerHeight="5" orient="auto">
        <path d="M 0 0.5 L 9 3.5 L 0 6.5 z" fill="#0f172a" />
      </marker>
      <filter id="bfd-shadow" x="-5%" y="-5%" width="110%" height="115%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.06"/>
      </filter>
    </defs>

    <!-- Sfondo Schema -->
    <rect width="740" height="220" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.2"/>
    <text x="20" y="24" font-family="'Inter', sans-serif" font-weight="700" font-size="12" fill="#475569" letter-spacing="0.5">BLOCK FLOW DIAGRAM (BFD) — SCHEMA A BLOCCHI DI PRINCIPIO</text>

    <!-- Correnti di Ingresso (Materie Prime) -->
    <path d="M 30 90 L 110 90" stroke="#0f172a" stroke-width="2.2" fill="none" marker-end="url(#bfd-arr)"/>
    <text x="35" y="80" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#0f172a">Reagenti A + B</text>

    <!-- Blocco 1: Reazione Chimica -->
    <g filter="url(#bfd-shadow)">
      <rect x="110" y="60" width="130" height="60" rx="6" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
      <text x="175" y="88" font-family="'Inter', sans-serif" font-weight="700" font-size="13" fill="#0f172a" text-anchor="middle">SEZIONE</text>
      <text x="175" y="105" font-family="'Inter', sans-serif" font-weight="600" font-size="11.5" fill="#1e40af" text-anchor="middle">REAZIONE</text>
    </g>

    <!-- Linea Reazione -> Separazione 1 -->
    <path d="M 240 90 L 320 90" stroke="#0f172a" stroke-width="2.2" fill="none" marker-end="url(#bfd-arr)"/>
    <text x="280" y="80" font-family="'Inter', sans-serif" font-size="10.5" font-weight="500" fill="#475569" text-anchor="middle">Effluente</text>

    <!-- Blocco 2: Separazione Primaria -->
    <g filter="url(#bfd-shadow)">
      <rect x="320" y="60" width="130" height="60" rx="6" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
      <text x="385" y="88" font-family="'Inter', sans-serif" font-weight="700" font-size="13" fill="#0f172a" text-anchor="middle">SEPARAZIONE</text>
      <text x="385" y="105" font-family="'Inter', sans-serif" font-weight="600" font-size="11.5" fill="#047857" text-anchor="middle">GAS / LIQUIDO</text>
    </g>

    <!-- Linea Separazione 1 -> Purificazione Prodotto -->
    <path d="M 450 90 L 530 90" stroke="#0f172a" stroke-width="2.2" fill="none" marker-end="url(#bfd-arr)"/>
    <text x="490" y="80" font-family="'Inter', sans-serif" font-size="10.5" font-weight="500" fill="#475569" text-anchor="middle">Fase Liquida</text>

    <!-- Blocco 3: Purificazione Finale -->
    <g filter="url(#bfd-shadow)">
      <rect x="530" y="60" width="130" height="60" rx="6" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
      <text x="595" y="88" font-family="'Inter', sans-serif" font-weight="700" font-size="13" fill="#0f172a" text-anchor="middle">PURIFICAZIONE</text>
      <text x="595" y="105" font-family="'Inter', sans-serif" font-weight="600" font-size="11.5" fill="#b91c1c" text-anchor="middle">DISTILLAZIONE</text>
    </g>

    <!-- Prodotto Finito -->
    <path d="M 660 90 L 720 90" stroke="#0f172a" stroke-width="2.2" fill="none" marker-end="url(#bfd-arr)"/>
    <text x="690" y="80" font-family="'Inter', sans-serif" font-size="11" font-weight="700" fill="#047857" text-anchor="middle">PRODOTTO</text>

    <!-- Linea di Riciclo Inferiore -->
    <path d="M 595 120 L 595 180 L 175 180 L 175 120" stroke="#2563eb" stroke-width="1.8" stroke-dasharray="5 3" fill="none" marker-end="url(#bfd-arr)"/>
    <text x="385" y="195" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#2563eb" text-anchor="middle">Riciclo Reagenti Non Convertiti</text>

    <!-- Spurgo Superiore da Separazione 1 -->
    <path d="M 385 60 L 385 35 L 480 35" stroke="#dc2626" stroke-width="1.8" fill="none" marker-end="url(#bfd-arr)"/>
    <text x="495" y="39" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#dc2626">Spurgo Gas Inerti</text>
  </svg>
```

> [!NOTE]
> **Caratteristiche di Rigore del BFD:**
> - Direzione di flusso prevalente: da sinistra verso destra per la catena principale del prodotto.
> - Le correnti di riciclo vengono riportate tipicamente nella parte inferiore o superiore, con linee a tratto opportunamente distinte.
> - Su ciascuna freccia possono essere indicati i bilanci di massa globali indicativi in $\text{kg/h}$ o $\text{kmol/h}$.

---

# Capitolo 3: Lo Schema di Processo (Process Flow Diagram - PFD)

### 3.1 I Tre Livelli di Dettaglio del PFD
Come illustrato nel programma del corso, lo schema di processo si articola didatticamente in tre crescenti livelli di dettaglio:
- **PFD Semplificato:** Riporta le apparecchiature principali connesse dalle linee di processo e dai fluidi di servizio essenziali.
- **PFD Quantificato:** Include la tabella delle correnti numerate (Material Balance Sheet) con temperatura $T$ ($^{\circ}\text{C}$), pressione $P$ ($\text{bar}$), portata massica $W$ ($\text{kg/h}$) e composizione molare.
- **PFD Strumentato:** Integra i punti cardine di misura e i loop di controllo primari che governano le specifiche qualitative del prodotto.

### 3.2 Caso Studio Industriale di Eccellenza: Recupero Benzene per Assorbimento e Stripping con Olio

Il processo esaminato in aula (Slide 13/63) costituisce l'archetipo dell'integrazione termica e materiale tra un'operazione di trasferimento di materia a temperatura ambiente (assorbimento) e una termicamente attivata (stripping ad alta temperatura):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="100%" height="auto" style="max-width: 960px; margin: 18px auto; display: block;">
    <defs>
      <style>
        .pfd-bg { fill: #ffffff; }
        .pfd-header { fill: #86151b; }
        .pfd-title { font-family: 'Inter', system-ui, sans-serif; font-weight: 700; font-size: 16px; fill: #ffffff; }
        .pfd-sub { font-family: 'Inter', system-ui, sans-serif; font-weight: 500; font-size: 12px; fill: #fecdd3; }
        .pfd-pipe { fill: none; stroke: #0f172a; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
        .pfd-util { fill: none; stroke: #0f172a; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
        .pfd-body { fill: #ffffff; stroke: #0f172a; stroke-width: 2.2; }
        .pfd-internal { fill: none; stroke: #0f172a; stroke-width: 1.6; }
        .pfd-tag { font-family: 'Inter', system-ui, sans-serif; font-weight: 700; font-size: 14px; fill: #0f172a; }
        .pfd-lbl { font-family: 'Inter', system-ui, sans-serif; font-weight: 600; font-size: 11.5px; fill: #0f172a; }
        .pfd-ut-txt { font-family: 'Inter', system-ui, sans-serif; font-weight: 700; font-size: 10.5px; fill: #0f172a; text-anchor: middle; }
      </style>
      <marker id="arr" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="6.5" markerHeight="5" orient="auto">
        <path d="M 0 0.5 L 9 3.5 L 0 6.5 z" fill="#0f172a" />
      </marker>
      <filter id="pfd-sh" x="-5%" y="-5%" width="110%" height="115%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.05"/>
      </filter>
    </defs>

    <rect width="960" height="540" class="pfd-bg" rx="6" stroke="#e2e8f0" stroke-width="1.2"/>

    <!-- Banner Accademico Superiore -->
    <rect x="0" y="0" width="960" height="45" class="pfd-header" rx="6 6 0 0"/>
    <text x="20" y="28" class="pfd-title">SCHEMA DI PROCESSO (PFD) — RECUPERO BENZENE PER ASSORBIMENTO E STRIPPING</text>
    <text x="940" y="28" class="pfd-sub" text-anchor="end">Univ. di Padova — Fondamenti di Impianti Chimici</text>

    <!-- PIPING DI PROCESSO -->
    <!-- 1. Olio fresco in D-01 -->
    <path d="M 85 320 L 85 360 L 130 360" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- 2. Fondo D-01 -> G-01 -->
    <path d="M 170 410 L 170 450 L 235 450" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- 3. Mandata G-01 -> Testa C-01 -->
    <path d="M 250 435 L 250 170 L 305 170" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- 4. Aria + Benzene -> Fondo C-01 -->
    <path d="M 245 395 L 305 395" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- 5. Aria Depurata da C-01 -->
    <path d="M 335 130 L 335 105 L 380 105" class="pfd-pipe"/>
    <path d="M 400 105 L 465 105" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- 6. Fondo C-01 -> G-02 -->
    <path d="M 335 420 L 335 450 L 380 450" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- 7. Mandata G-02 -> E-02 -> C-02 -->
    <path d="M 395 435 L 395 210 L 466 210" class="pfd-pipe" marker-end="url(#arr)"/>
    <path d="M 514 210 L 560 210" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- 8. Vapore VB -> Fondo C-02 -->
    <path d="M 585 475 L 585 425" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- 9. Fondo C-02 -> G-03 -->
    <path d="M 565 420 L 565 450 L 505 450" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- 10. G-03 -> E-02 -> E-01 -> D-01 (Circuito Rigenerativo Chiuso) -->
    <path d="M 490 435 L 490 234" class="pfd-pipe"/>
    <path d="M 490 186 L 490 70 L 170 70 L 170 196" class="pfd-pipe" marker-end="url(#arr)"/>
    <path d="M 170 244 L 170 365" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- 11. Vapori C-02 -> E-03 -->
    <path d="M 585 130 L 585 85 L 695 85 L 695 181" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- 12. E-03 -> D-02 -->
    <path d="M 695 229 L 695 305" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- 13. Acqua A da D-02 -->
    <path d="M 715 348 L 715 410" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- 14. Benzene da D-02 -->
    <path d="M 760 348 L 760 450" class="pfd-pipe" marker-end="url(#arr)"/>

    <!-- UTILITIES (AR, VB, A) -->
    <!-- E-01: AR Orizzontale -->
    <path d="M 105 220 L 146 220" class="pfd-util" marker-end="url(#arr)"/>
    <path d="M 194 220 L 230 220" class="pfd-util" marker-end="url(#arr)"/>
    <g transform="translate(95, 220)"><polygon points="0,-11 11,0 0,11 -11,0" fill="#fff" stroke="#0f172a" stroke-width="1.5"/><text x="0" y="3.5" class="pfd-ut-txt">AR</text></g>
    <g transform="translate(240, 220)"><polygon points="0,-11 11,0 0,11 -11,0" fill="#fff" stroke="#0f172a" stroke-width="1.5"/><text x="0" y="3.5" class="pfd-ut-txt">AR</text></g>

    <!-- E-03: AR Orizzontale -->
    <path d="M 640 205 L 671 205" class="pfd-util" marker-end="url(#arr)"/>
    <path d="M 719 205 L 750 205" class="pfd-util" marker-end="url(#arr)"/>
    <g transform="translate(630, 205)"><polygon points="0,-11 11,0 0,11 -11,0" fill="#fff" stroke="#0f172a" stroke-width="1.5"/><text x="0" y="3.5" class="pfd-ut-txt">AR</text></g>
    <g transform="translate(760, 205)"><polygon points="0,-11 11,0 0,11 -11,0" fill="#fff" stroke="#0f172a" stroke-width="1.5"/><text x="0" y="3.5" class="pfd-ut-txt">AR</text></g>

    <!-- VB Fondo C-02 -->
    <g transform="translate(585, 488)"><polygon points="0,-12 12,0 0,12 -12,0" fill="#fff" stroke="#0f172a" stroke-width="1.5"/><text x="0" y="4" class="pfd-ut-txt">VB</text></g>

    <!-- A Uscita D-02 -->
    <g transform="translate(715, 420)"><polygon points="0,-11 11,0 0,11 -11,0" fill="#fff" stroke="#0f172a" stroke-width="1.5"/><text x="0" y="3.5" class="pfd-ut-txt">A</text></g>

    <!-- Valvola Benzene -->
    <g transform="translate(760, 415)"><circle cx="0" cy="0" r="9" fill="#fff" stroke="#0f172a" stroke-width="1.5"/><line x1="-6" y1="-6" x2="6" y2="6" stroke="#0f172a" stroke-width="1.4"/><line x1="-6" y1="6" x2="6" y2="-6" stroke="#0f172a" stroke-width="1.4"/></g>

    <!-- APPARECCHIATURE -->
    <!-- D-01: Serbatoio Olio -->
    <g id="D-01" filter="url(#pfd-sh)">
      <rect x="130" y="365" width="80" height="45" rx="18" ry="18" class="pfd-body"/>
      <text x="115" y="392" class="pfd-tag" text-anchor="end">D-01</text>
    </g>
    <g transform="translate(85, 310)">
      <circle cx="0" cy="0" r="9" fill="#fff" stroke="#0f172a" stroke-width="1.6"/>
      <path d="M 0 -9 A 9 9 0 0 1 0 9 Z" fill="#0f172a"/>
      <text x="0" y="-14" class="pfd-lbl" text-anchor="middle">Olio</text>
    </g>

    <!-- G-01: Pompa Mandata -->
    <g id="G-01" transform="translate(250, 450)" filter="url(#pfd-sh)">
      <circle cx="0" cy="0" r="14" class="pfd-body"/>
      <path d="M -14 0 L 0 -14 L 0 0 Z" fill="#0f172a"/>
      <text x="0" y="28" class="pfd-tag" text-anchor="middle">G-01</text>
    </g>

    <!-- E-01: Raffreddatore Olio -->
    <g id="E-01" transform="translate(170, 220)" filter="url(#pfd-sh)">
      <circle cx="0" cy="0" r="24" class="pfd-body"/>
      <path d="M -16 0 C -8 10, 8 -10, 16 0" class="pfd-internal"/>
      <text x="24" y="-12" class="pfd-tag">E-01</text>
    </g>

    <!-- C-01: Colonna Assorbimento a Riempimento -->
    <g id="C-01" filter="url(#pfd-sh)">
      <path d="M 310 155 A 25 25 0 0 1 360 155 L 360 395 A 25 25 0 0 1 310 395 Z" class="pfd-body"/>
      <polygon points="323,172 347,172 335,183" fill="#0f172a"/>
      <line x1="335" y1="170" x2="335" y2="173" stroke="#0f172a" stroke-width="1.8"/>
      <!-- Packing X -->
      <rect x="318" y="200" width="34" height="155" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/>
      <line x1="318" y1="200" x2="352" y2="355" stroke="#0f172a" stroke-width="1.8"/>
      <line x1="352" y1="200" x2="318" y2="355" stroke="#0f172a" stroke-width="1.8"/>
      <polygon points="323,380 347,380 335,370" fill="none" stroke="#0f172a" stroke-width="1.5"/>
      <text x="370" y="395" class="pfd-tag">C-01</text>
    </g>

    <!-- Blower Aria + Benzene -->
    <g transform="translate(245, 395)">
      <circle cx="0" cy="0" r="9" fill="#fff" stroke="#0f172a" stroke-width="1.6"/>
      <path d="M 0 -9 A 9 9 0 0 1 0 9 Z" fill="#0f172a"/>
      <text x="0" y="-22" class="pfd-lbl" text-anchor="middle">Aria +</text>
      <text x="0" y="-11" class="pfd-lbl" text-anchor="middle">Benzene</text>
    </g>

    <!-- Uscita Aria Depurata -->
    <g transform="translate(390, 105)">
      <circle cx="0" cy="0" r="9" fill="#fff" stroke="#0f172a" stroke-width="1.6"/>
      <line x1="-6" y1="-6" x2="6" y2="6" stroke="#0f172a" stroke-width="1.4"/>
      <line x1="-6" y1="6" x2="6" y2="-6" stroke="#0f172a" stroke-width="1.4"/>
      <text x="16" y="-3" class="pfd-lbl">Aria</text>
      <text x="16" y="9" class="pfd-lbl">depurata</text>
    </g>

    <!-- G-02: Pompa Fondo C-01 -->
    <g id="G-02" transform="translate(395, 450)" filter="url(#pfd-sh)">
      <circle cx="0" cy="0" r="14" class="pfd-body"/>
      <path d="M -14 0 L 0 -14 L 0 0 Z" fill="#0f172a"/>
      <text x="0" y="28" class="pfd-tag" text-anchor="middle">G-02</text>
    </g>

    <!-- E-02: Scambiatore Rigenerativo -->
    <g id="E-02" transform="translate(490, 210)" filter="url(#pfd-sh)">
      <circle cx="0" cy="0" r="24" class="pfd-body"/>
      <path d="M 0 -24 L 0 -11 L 8 -4 L -8 4 L 0 11 L 0 24" class="pfd-internal"/>
      <text x="18" y="32" class="pfd-tag">E-02</text>
    </g>

    <!-- G-03: Pompa Fondo C-02 -->
    <g id="G-03" transform="translate(490, 450)" filter="url(#pfd-sh)">
      <circle cx="0" cy="0" r="14" class="pfd-body"/>
      <path d="M 0 14 L -14 0 L 0 0 Z" fill="#0f172a"/>
      <text x="0" y="28" class="pfd-tag" text-anchor="middle">G-03</text>
    </g>

    <!-- C-02: Colonna di Stripping a Piatti -->
    <g id="C-02" filter="url(#pfd-sh)">
      <path d="M 560 155 A 25 25 0 0 1 610 155 L 610 395 A 25 25 0 0 1 560 395 Z" class="pfd-body"/>
      <!-- Piatti orizzontali -->
      <line x1="563" y1="190" x2="607" y2="190" class="pfd-internal"/>
      <line x1="563" y1="215" x2="607" y2="215" class="pfd-internal"/>
      <line x1="563" y1="240" x2="607" y2="240" class="pfd-internal"/>
      <line x1="563" y1="265" x2="607" y2="265" class="pfd-internal"/>
      <line x1="563" y1="290" x2="607" y2="290" class="pfd-internal"/>
      <line x1="563" y1="315" x2="607" y2="315" class="pfd-internal"/>
      <line x1="563" y1="340" x2="607" y2="340" class="pfd-internal"/>
      <line x1="563" y1="365" x2="607" y2="365" class="pfd-internal"/>
      <line x1="563" y1="390" x2="607" y2="390" class="pfd-internal"/>
      <text x="620" y="395" class="pfd-tag">C-02</text>
    </g>

    <!-- E-03: Condensatore di Testa -->
    <g id="E-03" transform="translate(695, 205)" filter="url(#pfd-sh)">
      <circle cx="0" cy="0" r="24" class="pfd-body"/>
      <path d="M -16 0 C -8 10, 8 -10, 16 0" class="pfd-internal"/>
      <text x="24" y="28" class="pfd-tag">E-03</text>
    </g>

    <!-- D-02: Decantatore Bifasico -->
    <g id="D-02" filter="url(#pfd-sh)">
      <rect x="670" y="305" width="105" height="43" rx="18" ry="18" class="pfd-body"/>
      <line x1="740" y1="315" x2="740" y2="348" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
      <text x="660" y="300" class="pfd-tag" text-anchor="end">D-02</text>
    </g>

    <!-- Etichetta Benzene -->
    <text x="760" y="475" class="pfd-tag" text-anchor="middle">Benzene</text>
  </svg>
```

#### Trattazione Ingegneristica delle Apparecchiature:

| Tag | Apparecchiatura | Ruolo Termodinamico e Funzionale | Parametri Operativi Tipici |
| :--- | :--- | :--- | :--- |
| **`D-01`** | Serbatoio / Decantatore | Accumulo e decantazione dell'olio rigenerato. Riceve il reintegro di olio fresco per compensare perdite per trascinamento. | $T \approx 25\,^{\circ}\text{C}$, $P = 1\,\text{atm}$ |
| **`G-01`** | Pompa Centrifuga | Rilancio dell'olio povero dal fondo di `D-01` fino alla testa della colonna di assorbimento `C-01`. | Prevalenza $H \approx 25\text{-}35\,\text{m}$ |
| **`C-01`** | Colonna ad Assorbimento | Colonna a riempimento (*packing* con distributore spray in testa). Il benzene viene trasferito dalla fase gas all'olio solvente in controcorrente. | Gas inerte a camino (*Aria depurata*), fondo a $T \approx 28\,^{\circ}\text{C}$ |
| **`G-02`** | Pompa Fondo Assorbitore | Estrazione dell'olio ricco (carico di benzene) dal fondo di `C-01` verso la sezione di rigenerazione. | Liquido saturo, verifica rigorosa di $\text{NPSH}_a > \text{NPSH}_r$ |
| **`E-02`** | Scambiatore Rigenerativo | Economizzatore termico a fascio tubiero: preriscalda l'olio ricco in salita raffreddando l'olio caldo esausto in arrivo da `C-02`. | Risparmio energetico $\Delta Q = \dot{m} c_p \Delta T > 65\%$ |
| **`C-02`** | Colonna di Stripping | Colonna a 10 piatti forati/campane. Il vapore a bassa pressione (`VB`) gorgoglia disassorbendo il benzene per distillazione in corrente di vapore. | $T_{\text{fondo}} \approx 110\text{-}120\,^{\circ}\text{C}$ |
| **`G-03`** | Pompa Fondo Stripper | Rilancio dell'olio esausto rigenerato caldo attraverso la serpentina di `E-02` e verso `E-01`. | Liquido ad alta temperatura, tenute meccaniche flussate |
| **`E-01`** | Raffreddatore Finale | Scambiatore raffreddato con Acqua di Rete (`AR`) per abbattere la temperatura dell'olio prima dell'accumulo in `D-01`. | $T_{\text{in}} \approx 50\,^{\circ}\text{C} \rightarrow T_{\text{out}} \approx 25\,^{\circ}\text{C}$ |
| **`E-03`** | Condensatore di Testa | Condensatore a superficie raffreddato ad `AR`: condensa totalmente la miscela eterogenea bifasica di vapori di benzene e vapore acqueo. | Cambio di stato da gas a liquidi immiscibili |
| **`D-02`** | Decantatore Bifasico | Separatore orizzontale a gravità provvisto di setto verticale (*baffle*). Separa l'acqua di condensa (fase pesante inferiore) dal benzene puro (fase leggera di sfioro). | $\rho_{\text{acqua}} = 1000\,\text{kg/m}^3 > \rho_{\text{benzene}} = 876\,\text{kg/m}^3$ |

---

# Capitolo 4: Gli Schemi di Marcia (P&ID) e Controllo di Processo

### 4.1 La Filosofia di Controllo Feedback in Impianto Chimico
Negli schemi di marcia ogni grandezza di processo viene monitorata da sensori/trasmettitori e regolata mediante valvole di controllo per garantire la stabilità operativa contro disturbi esterni.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 230" width="100%" height="auto" style="max-width: 680px; margin: 15px auto; display: block;">
    <defs>
      <marker id="pid-arr" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="6.5" markerHeight="5" orient="auto">
        <path d="M 0 0.5 L 9 3.5 L 0 6.5 z" fill="#0f172a" />
      </marker>
    </defs>
    <rect width="680" height="230" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.2"/>
    <text x="20" y="24" font-family="'Inter', sans-serif" font-weight="700" font-size="12" fill="#475569" letter-spacing="0.5">LOOP DI REGOLAZIONE P&amp;ID — CONTROLLO DI LIVELLO (LIC) SU SERBATOIO</text>

    <!-- Serbatoio TK-01 -->
    <rect x="60" y="60" width="130" height="130" rx="12" fill="#ffffff" stroke="#0f172a" stroke-width="2.2"/>
    <text x="125" y="130" font-family="'Inter', sans-serif" font-weight="700" font-size="15" fill="#0f172a" text-anchor="middle">TK-01</text>
    <line x1="70" y1="150" x2="180" y2="150" stroke="#3b82f6" stroke-width="1.8" stroke-dasharray="4 2"/>
    <text x="125" y="165" font-family="'Inter', sans-serif" font-size="10.5" font-weight="600" fill="#3b82f6" text-anchor="middle">Livello H</text>

    <!-- Tubazione Alimentazione -->
    <path d="M 15 90 L 60 90" stroke="#0f172a" stroke-width="2.4" fill="none" marker-end="url(#pid-arr)"/>
    <text x="20" y="80" font-family="'Inter', sans-serif" font-size="10.5" font-weight="600" fill="#0f172a">Feed</text>

    <!-- Tubazione Scarico di Fondo con Valvola di Controllo -->
    <path d="M 125 190 L 125 210 L 400 210" stroke="#0f172a" stroke-width="2.4" fill="none"/>
    <path d="M 430 210 L 620 210" stroke="#0f172a" stroke-width="2.4" fill="none" marker-end="url(#pid-arr)"/>
    <text x="580" y="200" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#0f172a">Scarico</text>

    <!-- Valvola di Controllo Pneumatica LV-01 -->
    <g transform="translate(415, 210)">
      <!-- Corpo Valvola -->
      <polygon points="-15,-10 15,10 15,-10 -15,10" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
      <!-- Stelo e Attuatore a Membrana -->
      <line x1="0" y1="0" x2="0" y2="-22" stroke="#0f172a" stroke-width="1.8"/>
      <path d="M -16 -22 C -16 -32, 16 -32, 16 -22 Z" fill="#ffffff" stroke="#0f172a" stroke-width="1.8"/>
      <text x="0" y="24" font-family="'Inter', sans-serif" font-size="10.5" font-weight="700" fill="#0f172a" text-anchor="middle">LV-01</text>
    </g>

    <!-- Trasmettitore di Livello LT-01 -->
    <g transform="translate(230, 110)">
      <circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#0f172a" stroke-width="1.8"/>
      <line x1="-18" y1="0" x2="18" y2="0" stroke="#0f172a" stroke-width="1.2"/>
      <text x="0" y="-4" font-family="'Inter', sans-serif" font-size="10.5" font-weight="700" fill="#0f172a" text-anchor="middle">LT</text>
      <text x="0" y="11" font-family="'Inter', sans-serif" font-size="9.5" font-weight="600" fill="#0f172a" text-anchor="middle">01</text>
    </g>
    <!-- Collegamento di processo a LT-01 -->
    <line x1="190" y1="110" x2="212" y2="110" stroke="#0f172a" stroke-width="1.8"/>

    <!-- Segnale Elettrico LT-01 -> LIC-01 (tratteggiato) -->
    <path d="M 248 110 L 320 110" stroke="#2563eb" stroke-width="1.6" stroke-dasharray="3 3"/>

    <!-- Regolatore Indicatore di Livello LIC-01 (DCS / Sala Controllo) -->
    <g transform="translate(340, 110)">
      <circle cx="0" cy="0" r="20" fill="#ffffff" stroke="#0f172a" stroke-width="1.8"/>
      <!-- Linea orizzontale DCS (Montato su quadro principale) -->
      <line x1="-20" y1="0" x2="20" y2="0" stroke="#0f172a" stroke-width="1.6"/>
      <text x="0" y="-5" font-family="'Inter', sans-serif" font-size="11" font-weight="700" fill="#0f172a" text-anchor="middle">LIC</text>
      <text x="0" y="13" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#0f172a" text-anchor="middle">01</text>
    </g>

    <!-- Segnale Pneumatico LIC-01 -> Attuatore LV-01 (tratteggio con barre trasversali // ) -->
    <path d="M 360 110 L 415 110 L 415 178" stroke="#dc2626" stroke-width="1.6" stroke-dasharray="4 2"/>
    <text x="425" y="145" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#dc2626">0.2 - 1.0 bar (P)</text>
  </svg>
```

#### Identificazione delle Variabili di Controllo:
- **Prima Lettera (Variabile Misurata):**
  - $L$ = Livello (*Level*)
  - $T$ = Temperatura (*Temperature*)
  - $P$ = Pressione (*Pressure*)
  - $F$ = Portata (*Flow*)
- **Lettere Successive (Funzione Strumento):**
  - $I$ = Indicatore locale (*Indicator*)
  - $R$ = Registratore storico (*Recorder*)
  - $C$ = Regolatore automatico (*Controller*)
  - $T$ = Trasmettitore (*Transmitter*)
  - $V$ = Valvola di regolazione (*Valve*)

---

# Capitolo 5: Normazione e Simbologia Unificata (UNICHIM / ISO / ISA)

### 5.1 Tabella delle Sigle Unificate per Apparecchiature

| Sigla UNICHIM | Tipologia Apparecchiatura | Esempi Tipici e Note Costruttive |
| :---: | :--- | :--- |
| **`C`** | Colonne | Colonne di distillazione, assorbimento, stripping, estrazione liquido-liquido (a piatti o a riempimento). |
| **`D`** | Recipienti e Serbatoi | Serbatoi di stoccaggio, polmoni di calma, decantatori, separatori bifasici/trifasici. |
| **`E`** | Scambiatori di Calore | Riscaldatori, ribollitori, condensatori, fasci tubieri, scambiatori a piastre, refrigeranti ad aria. |
| **`F`** | Filtri e Separatori Solidi | Filtri a maniche, filtri rotativi, presse, cicloni per polveri. |
| **`G`** | Pompe e Compressori | Pompe centrifughe, volumetriche, pompe dosatrici, soffianti, compressori assiali o alternativi. |
| **`R`** | Reattori Chimici | Reattori a tino agitato (CSTR), reattori tubolari (PFR), reattori a letto fisso o fluidizzato. |
| **`TK`** | Grandi Serbatoi di Stoccaggio | Serbatoi atmosferici verticali, serbatoi con tetto galleggiante per idrocarburi. |

### 5.2 Fluidi di Servizio (Utilities)
- **`AR`**: Acqua di Rete industriale (tipicamente a $15\text{-}20\,^{\circ}\text{C}$).
- **`VB`**: Vapore a Bassa Pressione ($P \approx 1.5\text{-}3\,\text{bar}$, $T \approx 110\text{-}135\,^{\circ}\text{C}$).
- **`VM`**: Vapore a Media Pressione ($P \approx 10\text{-}15\,\text{bar}$).
- **`VA`**: Vapore ad Alta Pressione ($P > 30\,\text{bar}$).
- **`AC`**: Acqua di Condensa (recupero termico).
- **`BT`**: Soluzione Frigorifera a Bassa Temperatura (glicole/salamoia).

---

# Capitolo 6: Eserciziario d'Esame Risolto (SCH-01 ... SCH-05)

### Esercizio SCH-01: Tracciamento dello Schema a Blocchi
> **Testo:** Tracciare lo schema a blocchi per un processo di sintesi in fase gas con riciclo del gas non convertito e separazione del prodotto liquido per condensazione parziale.
>
> **Risoluzione Dettagliata:**
> 1. *Blocco 1 (Miscelazione Reagenti):* Ingresso reagenti freschi $A + B$ e giunzione con la corrente di riciclo gassosa.
> 2. *Blocco 2 (Reattore Tubolare):* Conversione catalitica ad alta temperatura.
> 3. *Blocco 3 (Condensatore/Separatore Flash):* Raffreddamento della miscela; il prodotto desiderato condensa sul fondo come liquido, mentre gli incondensabili salgono in testa.
> 4. *Blocco 4 (Divisore di Riciclo/Spurgo):* La frazione principale della testa gassosa viene riciclata al reattore; una frazione minima (spurgo) viene allontanata per prevenire l'accumulo di inerti $I$.

### Esercizio SCH-02: Bilancio Materico su Decantatore Bifasico
> **Testo:** Dimostrare la quota di separazione tra benzene e acqua nel decantatore `D-02` e spiegare la funzione del setto verticale.
>
> **Risoluzione:**
> Il decantatore opera sfruttando la differenza di densità tra due liquidi reciprocamente insolubili:
> $$\Delta \rho = \rho_{\text{acqua}} - \rho_{\text{benzene}} = 1000 - 876 = 124\,\text{kg/m}^3 > 0$$
> La velocità terminale di flottazione del benzene segue la legge di Stokes:
> $$v_t = \frac{g d_p^2 (\rho_w - \rho_b)}{18 \mu_w}$$
> Il setto verticale (*overflow weir*) garantisce che la fase pesante (acqua) si accumuli sul fondo e venga spillata dal basso (`A`), mentre la fase leggera (benzene) sfiori superiormente oltre il setto venendo raccolta senza contaminazioni acquose.

---

# Capitolo 7: Mappa Concettuale Vettoriale Globale

A conclusione del percorso didattico, la seguente mappa concettuale riassume l'albero tassonomico e le interconnessioni dei documenti grafici di un impianto chimico:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 380" width="100%" height="auto" style="max-width: 760px; margin: 18px auto; display: block;">
    <defs>
      <marker id="map-arr" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="6.5" markerHeight="5" orient="auto">
        <path d="M 0 0.5 L 9 3.5 L 0 6.5 z" fill="#1e293b" />
      </marker>
      <filter id="map-sh" x="-5%" y="-5%" width="110%" height="115%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.06"/>
      </filter>
    </defs>
    <rect width="760" height="380" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2"/>
    <text x="25" y="30" font-family="'Inter', sans-serif" font-weight="800" font-size="14" fill="#0f172a" letter-spacing="0.5">MAPPA CONCETTUALE GERARCHICA — DOCUMENTI GRAFICI DI IMPIANTO</text>

    <!-- NODO RADICE: Rappresentazione Impianti -->
    <g filter="url(#map-sh)">
      <rect x="250" y="55" width="260" height="50" rx="8" fill="#1e293b" stroke="#0f172a" stroke-width="1.8"/>
      <text x="380" y="78" font-family="'Inter', sans-serif" font-weight="700" font-size="13" fill="#ffffff" text-anchor="middle">DOCUMENTI GRAFICI</text>
      <text x="380" y="95" font-family="'Inter', sans-serif" font-weight="500" font-size="11" fill="#93c5fd" text-anchor="middle">DI UN IMPIANTO CHIMICO</text>
    </g>

    <!-- RAMO 1: BFD -->
    <path d="M 300 105 L 140 160" stroke="#1e293b" stroke-width="1.8" fill="none" marker-end="url(#map-arr)"/>
    <g filter="url(#map-sh)">
      <rect x="60" y="160" width="160" height="60" rx="6" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>
      <text x="140" y="185" font-family="'Inter', sans-serif" font-weight="700" font-size="12.5" fill="#1e40af" text-anchor="middle">I. SCHEMA A BLOCCHI</text>
      <text x="140" y="205" font-family="'Inter', sans-serif" font-size="10.5" font-weight="600" fill="#475569" text-anchor="middle">BFD (Principio &amp; Stechiometria)</text>
    </g>

    <!-- RAMO 2: PFD -->
    <path d="M 380 105 L 380 160" stroke="#1e293b" stroke-width="1.8" fill="none" marker-end="url(#map-arr)"/>
    <g filter="url(#map-sh)">
      <rect x="300" y="160" width="160" height="60" rx="6" fill="#ffffff" stroke="#047857" stroke-width="2"/>
      <text x="380" y="185" font-family="'Inter', sans-serif" font-weight="700" font-size="12.5" fill="#047857" text-anchor="middle">II. SCHEMA PROCESSO</text>
      <text x="380" y="205" font-family="'Inter', sans-serif" font-size="10.5" font-weight="600" fill="#475569" text-anchor="middle">PFD (Bilanci, Apparecchiature)</text>
    </g>

    <!-- RAMO 3: P&ID -->
    <path d="M 460 105 L 620 160" stroke="#1e293b" stroke-width="1.8" fill="none" marker-end="url(#map-arr)"/>
    <g filter="url(#map-sh)">
      <rect x="540" y="160" width="160" height="60" rx="6" fill="#ffffff" stroke="#b91c1c" stroke-width="2"/>
      <text x="620" y="185" font-family="'Inter', sans-serif" font-weight="700" font-size="12.5" fill="#b91c1c" text-anchor="middle">III. SCHEMA DI MARCIA</text>
      <text x="620" y="205" font-family="'Inter', sans-serif" font-size="10.5" font-weight="600" fill="#475569" text-anchor="middle">P&amp;ID (Tubazioni, Controllo)</text>
    </g>

    <!-- FOGLIE / DETTAGLI -->
    <!-- Sotto BFD -->
    <path d="M 140 220 L 140 270" stroke="#64748b" stroke-width="1.4" stroke-dasharray="3 3" fill="none" marker-end="url(#map-arr)"/>
    <rect x="60" y="270" width="160" height="75" rx="5" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>
    <text x="70" y="290" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#334155">• Operazioni unitarie</text>
    <text x="70" y="308" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#334155">• Portate globali (kg/h)</text>
    <text x="70" y="326" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#334155">• Ricicli e spurghi</text>

    <!-- Sotto PFD -->
    <path d="M 380 220 L 380 270" stroke="#64748b" stroke-width="1.4" stroke-dasharray="3 3" fill="none" marker-end="url(#map-arr)"/>
    <rect x="300" y="270" width="160" height="75" rx="5" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>
    <text x="310" y="290" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#334155">• Semplificato (Cattura)</text>
    <text x="310" y="308" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#334155">• Quantificato (Tabelle T, P)</text>
    <text x="310" y="326" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#334155">• Utenze: AR, VB, BT</text>

    <!-- Sotto P&ID -->
    <path d="M 620 220 L 620 270" stroke="#64748b" stroke-width="1.4" stroke-dasharray="3 3" fill="none" marker-end="url(#map-arr)"/>
    <rect x="540" y="270" width="160" height="75" rx="5" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>
    <text x="550" y="290" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#334155">• Diametri e classi tubi</text>
    <text x="550" y="308" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#334155">• Valvole e sicurezza PSV</text>
    <text x="550" y="326" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#334155">• Loop LIC, TIC, PIC, FIC</text>
  </svg>
```
