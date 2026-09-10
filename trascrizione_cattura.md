Ecco l'analisi tecnica e ingegneristica completa dello schema di processo semplificato per l'assorbimento e lo stripping del benzene con olio (Università di Padova - Fondamenti di Impianti Chimici).

---

# 1. IDENTIFICAZIONE COMPONENTI / APPARECCHIATURE

| Sigla | Nome e Tipologia Ingegneristica | Ruolo Didattico e Funzionale |
| :--- | :--- | :--- |
| **D-01** | **Decantatore / Serbatoio di accumulo** (orizzontale) | Raccolta e separazione preliminare dell'olio (fase organica) con eventuale fase acquosa prima dell'invio in colonna. |
| **G-01** | **Pompa centrifuga** | Mandata dell'olio ricco/rigenerato dal serbatoio D-01 verso lo scambiatore E-01 e la testa della colonna C-01. |
| **E-01** | **Scambiatore di calore a fascio tubiero** (raffreddatore) | Raffreddamento dell'olio mediante Acqua di Rete (AR) prima dell'ingresso nella sezione di assorbimento (C-01). |
| **C-01** | **Colonna di Assorbimento a riempimento** | Colonna gas-liquido in controcorrente: l'olio assorbe il benzene presente nella corrente gassosa ("Aria + Benzene"). |
| **G-02** | **Pompa centrifuga** (di fondo) | Estrazione dell'olio ricco dal fondo della colonna di assorbimento C-01 e invio verso lo strippatore. |
| **E-02** | **Scambiatore rigenerativo / preriscaldatore** | Preriscaldamento dell'olio ricco in uscita da C-01 sfruttando l'entalpia dell'olio caldo rigenerato in uscita dal fondo di C-02. |
| **C-02** | **Colonna di Stripping a piatti** | Colonna di distillazione/stripping in controcorrente in cui il benzene viene rimosso dall'olio mediante l'uso di vapore (VB). |
| **G-03** | **Pompa centrifuga** (di fondo) | Estrazione dell'olio rigenerato dal fondo della colonna C-02, rilancio attraverso E-02 e raffreddamento finale. |
| **E-03** | **Condensatore di testa** (raffreddatore a superficie) | Condensazione dei vapori di testa (benzene + acqua) provenienti dalla colonna C-02 mediante Acqua di Rete (AR). |
| **D-02** | **Decantatore / Separatore trifasico** (orizzontale) | Separazione del condensato di testa in fase acquosa (A) e fase organica (Benzene puro/ricco). |

---

# 2. TOPOLOGIA DELLE LINEE E FLUSSI (STREAMS)

- **Linea Olio Fresco / di Ritorno**: Origina dal sistema di stoccaggio, entra nel serbatoio/decantatore **D-01**.
- **Linea Olio Ricco (da D-01 a C-01)**: Aspirato dalla pompa **G-01**, spinto attraverso lo scambiatore **E-01** (raffreddato ad **AR**) e immesso nella sezione superiore (distributore di testa) della colonna di assorbimento **C-01**.
- **Linea Aria + Benzene**: Alimentata alla base della colonna **C-01** in controcorrente rispetto all'olio discendente.
- **Linea Aria Depurata**: In uscita dalla testa della colonna **C-01**, viene inviata a recupero/scarico (attraversando eventuale pre-riscaldamento in **E-01**).
- **Linea Olio Ricco (da C-01 a C-02)**: Estratto dal fondo di **C-01** tramite la pompa **G-02**, riscaldato nello scambiatore rigenerativo **E-02** ed immesso in testa alla colonna di stripping **C-02**.
- **Linea Olio Rigenerato (da C-02 a D-01)**: Estratto dal fondo di **C-02** tramite la pompa **G-03**, fatto passare nel mantello/tubi dello scambiatore rigenerativo **E-02** e richiuso nel circuito verso **D-01**.
- **Linea Vapore di Bassa Pressione (VB)**: Imnessa direttamente alla base della colonna di stripping **C-02** per il trascinamento (stripping) del benzene.
- **Linea Vapori di Testa (da C-02 a E-03)**: Miscela di vapori di benzene e acqua in uscita dalla testa di **C-02**, condensata in **E-03** tramite **Acqua di Rete (AR)**.
- **Linea Condensato (da E-03 a D-02)**: Miscela liquida bifasica (acqua + benzene) inviata al separatore orizzontale **D-02**.
- **Linee di Uscita da D-02**:
  - **Fase Acquosa (A)**: Scarico o trattamento delle acque di processo.
  - **Benzene**: Prodotto recuperato in fase organica.

---

# 3. SPECIFICA STRUTTURATA JSON

```json
{
  "title": "Schema di processo semplificato - Assorbimento e Stripping del Benzene con Olio",
  "equipment": [
    {
      "id": "D-01",
      "name": "Decantatore / Serbatoio Olio",
      "type": "Decanter",
      "x": 150,
      "y": 650,
      "width": 100,
      "height": 50,
      "label": "D-01"
    },
    {
      "id": "G-01",
      "name": "Pompa Olio Ricco/Alimentazione",
      "type": "Centrifugal Pump",
      "x": 280,
      "y": 630,
      "width": 30,
      "height": 30,
      "label": "G-01"
    },
    {
      "id": "E-01",
      "name": "Scambiatore Raffreddamento Olio",
      "type": "Shell and Tube Heat Exchanger",
      "x": 350,
      "y": 480,
      "width": 60,
      "height": 60,
      "label": "E-01"
    },
    {
      "id": "C-01",
      "name": "Colonna di Assorbimento",
      "type": "Packed Column",
      "x": 420,
      "y": 400,
      "width": 50,
      "height": 220,
      "label": "C-01"
    },
    {
      "id": "G-02",
      "name": "Pompa Fondo Assorbitore",
      "type": "Centrifugal Pump",
      "x": 420,
      "y": 660,
      "width": 30,
      "height": 30,
      "label": "G-02"
    },
    {
      "id": "E-02",
      "name": "Scambiatore Rigenerativo",
      "type": "Shell and Tube Heat Exchanger",
      "x": 580,
      "y": 430,
      "width": 60,
      "height": 60,
      "label": "E-02"
    },
    {
      "id": "C-02",
      "name": "Colonna di Stripping",
      "type": "Tray Column",
      "x": 700,
      "y": 400,
      "width": 50,
      "height": 240,
      "label": "C-02"
    },
    {
      "id": "G-03",
      "name": "Pompa Fondo Stripper",
      "type": "Centrifugal Pump",
      "x": 580,
      "y": 660,
      "width": 30,
      "height": 30,
      "label": "G-03"
    },
    {
      "id": "E-03",
      "name": "Condensatore di Testa",
      "type": "Condenser",
      "x": 780,
      "y": 430,
      "width": 60,
      "height": 60,
      "label": "E-03"
    },
    {
      "id": "D-02",
      "name": "Decantatore / Separatore di Condensato",
      "type": "Decanter",
      "x": 760,
      "y": 550,
      "width": 100,
      "height": 50,
      "label": "D-02"
    }
  ],
  "streams": [
    {
      "from": "D-01",
      "to": "G-01",
      "fluid": "Olio",
      "label": "Olio in aspirazione",
      "pathType": "liquid"
    },
    {
      "from": "G-01",
      "to": "E-01",
      "fluid": "Olio",
      "label": "Olio in pressione",
      "pathType": "liquid"
    },
    {
      "from": "E-01",
      "to": "C-01",
      "fluid": "Olio freddo",
      "label": "Olio in testa a C-01",
      "pathType": "liquid"
    },
    {
      "from": "External",
      "to": "C-01",
      "fluid": "Aria + Benzene",
      "label": "Gas in ingresso",
      "pathType": "gas"
    },
    {
      "from": "C-01",
      "to": "External",
      "fluid": "Aria depurata",
      "label": "Gas in uscita (passante per E-01)",
      "pathType": "gas"
    },
    {
      "from": "C-01",
      "to": "G-02",
      "fluid": "Olio ricco",
      "label": "Fondo C-01",
      "pathType": "liquid"
    },
    {
      "from": "G-02",
      "to": "E-02",
      "fluid": "Olio ricco",
      "label": "Olio verso preriscaldatore",
      "pathType": "liquid"
    },
    {
      "from": "E-02",
      "to": "C-02",
      "fluid": "Olio caldo",
      "label": "Alimentazione C-02",
      "pathType": "liquid"
    },
    {
      "from": "C-02",
      "to": "G-03",
      "fluid": "Olio rigenerato",
      "label": "Fondo C-02",
      "pathType": "liquid"
    },
    {
      "from": "G-03",
      "to": "E-02",
      "fluid": "Olio rigenerato caldo",
      "label": "Ritorno a E-02",
      "pathType": "liquid"
    },
    {
      "from": "E-02",
      "to": "D-01",
      "fluid": "Olio rigenerato raffreddato",
      "label": "Chiusura ciclo olio",
      "pathType": "liquid"
    },
    {
      "from": "C-02",
      "to": "E-03",
      "fluid": "Vapori di testa (Benzene + Acqua)",
      "label": "Testa C-02",
      "pathType": "vapor"
    },
    {
      "from": "E-03",
      "to": "D-02",
      "fluid": "Condensato",
      "label": "Alimentazione D-02",
      "pathType": "two-phase"
    },
    {
      "from": "D-02",
      "to": "External",
      "fluid": "Acqua (A)",
      "label": "Fase acquosa",
      "pathType": "liquid"
    },
    {
      "from": "D-02",
      "to": "External",
      "fluid": "Benzene",
      "label": "Prodotto Benzene",
      "pathType": "liquid"
    }
  ],
  "utilities": [
    {
      "id": "AR-01",
      "type": "Acqua di Rete (AR)",
      "label": "AR",
      "connectedTo": "E-01"
    },
    {
      "id": "VB-01",
      "type": "Vapore di Bassa Pressione (VB)",
      "label": "VB",
      "connectedTo": "C-02 (Reboiler/Botto)"
    },
    {
      "id": "AR-02",
      "type": "Acqua di Rete (AR)",
      "label": "AR",
      "connectedTo": "E-03"
    }
  ]
}
```