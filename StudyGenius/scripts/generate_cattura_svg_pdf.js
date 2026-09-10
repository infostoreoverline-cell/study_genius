const fs = require('fs-extra');
const path = require('path');
const puppeteer = require('puppeteer');

function generateFlowsheetSvg() {
  const W = 1050;
  const H = 700;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <!-- Stili e Tipografia di Elevata Precisione Grafica -->
    <style>
      .bg { fill: #ffffff; }
      .header-bg { fill: #86151b; }
      .header-title-main { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-weight: 700; font-size: 23px; fill: #ffffff; }
      .header-title-sub { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-weight: 600; font-size: 19px; fill: #ffffff; }
      .header-unipd { font-family: 'Source Serif 4', 'Georgia', serif; font-weight: 700; font-size: 13.5px; fill: #ffffff; letter-spacing: 0.8px; }
      .header-dept { font-family: 'Inter', system-ui, sans-serif; font-weight: 400; font-size: 11px; fill: #fecdd3; }
      .footer-text { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 11.5px; fill: #334155; }
      
      .pipe { fill: none; stroke: #0f172a; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
      .pipe-thin { fill: none; stroke: #0f172a; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
      
      .equip-body { fill: #ffffff; stroke: #0f172a; stroke-width: 2.2; stroke-linejoin: round; }
      .equip-internal { fill: none; stroke: #0f172a; stroke-width: 1.6; stroke-linecap: round; }
      
      .tag-text { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-weight: 700; font-size: 15px; fill: #0f172a; }
      .label-text { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-weight: 600; font-size: 12.5px; fill: #0f172a; }
      .utility-text { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-weight: 700; font-size: 11px; fill: #0f172a; text-anchor: middle; }
      
      .shadow { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05)); }
    </style>

    <!-- Marker frecce di flusso PFD -->
    <marker id="arrow" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="6.5" markerHeight="5" orient="auto">
      <path d="M 0 0.5 L 9 3.5 L 0 6.5 z" fill="#0f172a" />
    </marker>
  </defs>

  <!-- Sfondo Bianco Puro Vettoriale -->
  <rect width="${W}" height="${H}" class="bg" />

  <!-- Intestazione Slide Accademica (Università degli Studi di Padova) -->
  <rect x="0" y="0" width="${W}" height="70" class="header-bg" />
  
  <!-- Sigillo Storico Unipd (1222) -->
  <g transform="translate(26, 12)">
    <circle cx="23" cy="23" r="22" fill="none" stroke="#ffffff" stroke-width="1.8" opacity="0.95" />
    <circle cx="23" cy="23" r="18" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="2 1.5" opacity="0.8" />
    <text x="23" y="28" font-family="'Source Serif 4', serif" font-weight="700" font-size="13" fill="#ffffff" text-anchor="middle">1222</text>
  </g>
  <text x="82" y="32" class="header-unipd">UNIVERSITÀ DEGLI STUDI DI PADOVA</text>
  <text x="82" y="50" class="header-dept">Dipartimento di Processi Chimici dell'Ingegneria</text>

  <!-- Titolo Slide a Destra (fedele a Cattura.PNG) -->
  <text x="${W - 35}" y="32" class="header-title-main" text-anchor="end">II. Schema di processo</text>
  <text x="${W - 35}" y="55" class="header-title-sub" text-anchor="end">semplificato</text>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- PIPING / LINEE DI PROCESSO                                              -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->

  <!-- 1. ALIMENTAZIONE OLIO FRESCO IN D-01 -->
  <!-- Da simbolo Olio (x=115, y=415) scende a y=460, va a x=165 ed entra nel cielo di D-01 -->
  <path d="M 115 425 L 115 460 L 165 460" class="pipe" marker-end="url(#arrow)" />

  <!-- 2. FONDO D-01 -> POMPA G-01 -->
  <!-- Uscita fondo D-01 a x=205, y=514 -> scende a y=560 -> destra verso G-01 (x=290) -->
  <path d="M 205 514 L 205 560 L 275 560" class="pipe" marker-end="url(#arrow)" />

  <!-- 3. MANDATA G-01 -> TESTA COLONNA C-01 -->
  <!-- Da G-01 (x=290, y=545) sale dritto fino a y=235, svolta a destra ed entra in C-01 (x=350) -->
  <path d="M 290 545 L 290 235 L 345 235" class="pipe" marker-end="url(#arrow)" />

  <!-- 4. ALIMENTAZIONE ARIA + BENZENE -> FONDO C-01 -->
  <!-- Da blower (x=280, y=495) dritto a destra verso C-01 (x=350) -->
  <path d="M 290 495 L 345 495" class="pipe" marker-end="url(#arrow)" />

  <!-- 5. ARIA DEPURATA DA TESTA C-01 -->
  <!-- Esce da cielo C-01 (x=375, y=195), sale a y=165, attraversa valvola/blower e va a camino -->
  <path d="M 375 195 L 375 165 L 420 165" class="pipe" />
  <path d="M 440 165 L 515 165" class="pipe" marker-end="url(#arrow)" />

  <!-- 6. FONDO C-01 -> POMPA G-02 -->
  <!-- Uscita fondo C-01 (x=375, y=520), scende a y=560, va a destra verso G-02 (x=435) -->
  <path d="M 375 520 L 375 560 L 420 560" class="pipe" marker-end="url(#arrow)" />

  <!-- 7. MANDATA G-02 -> SCAMBIATORE RIGENERATIVO E-02 -> TESTA C-02 -->
  <!-- Da G-02 (x=435, y=545) sale a y=275, entra in E-02 (x=511), esce da E-02 (x=559), entra in C-02 (x=610) -->
  <path d="M 435 545 L 435 275 L 511 275" class="pipe" marker-end="url(#arrow)" />
  <path d="M 559 275 L 605 275" class="pipe" marker-end="url(#arrow)" />

  <!-- 8. VAPORE A BASSA PRESSIONE (VB) -> FONDO C-02 -->
  <!-- Da rombo VB (x=635, y=580) sale dritto nel fondo di C-02 (x=635, y=520) -->
  <path d="M 635 580 L 635 525" class="pipe" marker-end="url(#arrow)" />

  <!-- 9. FONDO C-02 -> POMPA G-03 -->
  <!-- Uscita fondo C-02 (x=615, y=520) scende a y=560, va a sinistra verso G-03 (x=550) -->
  <path d="M 615 520 L 615 560 L 565 560" class="pipe" marker-end="url(#arrow)" />

  <!-- 10. MANDATA G-03 -> E-02 -> CIRCUITO DI RICICLO SUPERIORE -> E-01 -> D-01 -->
  <!-- Da G-03 (x=535, y=545) sale verticale attraverso E-02 (y=299 a y=251) -->
  <!-- Sale fino a y=125 sopra le colonne, va a sinistra fino a x=205, scende in E-01 (y=266 a y=314) -->
  <!-- Esce dal fondo di E-01 a y=314 e scende dritto nel cielo di D-01 (y=468) -->
  <path d="M 535 545 L 535 299" class="pipe" />
  <path d="M 535 251 L 535 125 L 205 125 L 205 266" class="pipe" marker-end="url(#arrow)" />
  <path d="M 205 314 L 205 465" class="pipe" marker-end="url(#arrow)" />

  <!-- 11. VAPORI DI TESTA C-02 -> CONDENSATORE E-03 -->
  <!-- Da testa C-02 (x=635, y=195) sale a y=145, va a destra fino a x=755, scende in E-03 (y=241) -->
  <path d="M 635 195 L 635 145 L 755 145 L 755 241" class="pipe" marker-end="url(#arrow)" />

  <!-- 12. CONDENSATO DA E-03 -> DECANTATORE D-02 -->
  <path d="M 755 289 L 755 375" class="pipe" marker-end="url(#arrow)" />

  <!-- 13. SCARICO ACQUA DA D-02 -->
  <path d="M 770 418 L 770 490" class="pipe" marker-end="url(#arrow)" />

  <!-- 14. RECUPERO BENZENE DA D-02 -->
  <path d="M 815 418 L 815 530" class="pipe" marker-end="url(#arrow)" />

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- UTILITIES (Acqua di Rete AR, Vapore VB, Acqua A)                        -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->

  <!-- Scambiatore E-01: AR Orizzontale -->
  <path d="M 135 290 L 181 290" class="pipe-thin" marker-end="url(#arrow)" />
  <path d="M 229 290 L 265 290" class="pipe-thin" marker-end="url(#arrow)" />
  <g transform="translate(125, 290)">
    <polygon points="0,-12 12,0 0,12 -12,0" fill="#ffffff" stroke="#0f172a" stroke-width="1.6" />
    <text x="0" y="4" class="utility-text">AR</text>
  </g>
  <g transform="translate(275, 290)">
    <polygon points="0,-12 12,0 0,12 -12,0" fill="#ffffff" stroke="#0f172a" stroke-width="1.6" />
    <text x="0" y="4" class="utility-text">AR</text>
  </g>

  <!-- Condensatore E-03: AR Orizzontale -->
  <path d="M 700 265 L 731 265" class="pipe-thin" marker-end="url(#arrow)" />
  <path d="M 779 265 L 810 265" class="pipe-thin" marker-end="url(#arrow)" />
  <g transform="translate(690, 265)">
    <polygon points="0,-12 12,0 0,12 -12,0" fill="#ffffff" stroke="#0f172a" stroke-width="1.6" />
    <text x="0" y="4" class="utility-text">AR</text>
  </g>
  <g transform="translate(820, 265)">
    <polygon points="0,-12 12,0 0,12 -12,0" fill="#ffffff" stroke="#0f172a" stroke-width="1.6" />
    <text x="0" y="4" class="utility-text">AR</text>
  </g>

  <!-- VB Fondo C-02 -->
  <g transform="translate(635, 595)">
    <polygon points="0,-13 13,0 0,13 -13,0" fill="#ffffff" stroke="#0f172a" stroke-width="1.6" />
    <text x="0" y="4.5" class="utility-text">VB</text>
  </g>

  <!-- A (Acqua) Uscita D-02 -->
  <g transform="translate(770, 502)">
    <polygon points="0,-12 12,0 0,12 -12,0" fill="#ffffff" stroke="#0f172a" stroke-width="1.6" />
    <text x="0" y="4" class="utility-text">A</text>
  </g>

  <!-- Valvola Uscita Benzene -->
  <g transform="translate(815, 495)">
    <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#0f172a" stroke-width="1.6" />
    <line x1="-7" y1="-7" x2="7" y2="7" stroke="#0f172a" stroke-width="1.5" />
    <line x1="-7" y1="7" x2="7" y2="-7" stroke="#0f172a" stroke-width="1.5" />
  </g>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- APPARECCHIATURE PRINCIPALI (EQUIPMENT)                                  -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->

  <!-- ── D-01: Decantatore / Serbatoio Accumulo Olio ─────────────────────── -->
  <g id="D-01" class="shadow">
    <rect x="165" y="468" width="80" height="46" rx="18" ry="18" class="equip-body" />
    <text x="150" y="496" class="tag-text" text-anchor="end">D-01</text>
  </g>

  <!-- Simbolo Alimentazione Olio Fresco -->
  <g transform="translate(115, 415)">
    <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#0f172a" stroke-width="1.8" />
    <path d="M 0 -10 A 10 10 0 0 1 0 10 Z" fill="#0f172a" />
    <text x="0" y="-15" class="label-text" text-anchor="middle">Olio</text>
  </g>

  <!-- ── G-01: Pompa Centrifuga Alimentazione C-01 ───────────────────────── -->
  <g id="G-01" transform="translate(290, 560)" class="shadow">
    <circle cx="0" cy="0" r="15" class="equip-body" />
    <path d="M -15 0 L 0 -15 L 0 0 Z" fill="#0f172a" />
    <text x="0" y="32" class="tag-text" text-anchor="middle">G-01</text>
  </g>

  <!-- ── E-01: Raffreddatore Olio ad Acqua di Rete ───────────────────────── -->
  <g id="E-01" transform="translate(205, 290)" class="shadow">
    <circle cx="0" cy="0" r="24" class="equip-body" />
    <path d="M -17 0 C -9 11, 9 -11, 17 0" class="equip-internal" />
    <text x="24" y="-14" class="tag-text">E-01</text>
  </g>

  <!-- ── C-01: Colonna di Assorbimento a Riempimento ─────────────────────── -->
  <g id="C-01" class="shadow">
    <!-- Mantello cilindrico verticale -->
    <path d="
      M 350 220 
      A 25 25 0 0 1 400 220 
      L 400 495 
      A 25 25 0 0 1 350 495 
      Z" class="equip-body" />
    
    <!-- Distributore di liquido a cono / Spray nozzle -->
    <polygon points="363,240 387,240 375,251" fill="#0f172a" />
    <line x1="375" y1="235" x2="375" y2="240" stroke="#0f172a" stroke-width="2" />

    <!-- Sezione impaccata a X (Packing) -->
    <rect x="358" y="270" width="34" height="190" fill="#f8fafc" stroke="#64748b" stroke-width="1.2" />
    <line x1="358" y1="270" x2="392" y2="460" stroke="#0f172a" stroke-width="2" />
    <line x1="392" y1="270" x2="358" y2="460" stroke="#0f172a" stroke-width="2" />

    <!-- Griglia di supporto gas inferiore -->
    <polygon points="363,480 387,480 375,468" fill="none" stroke="#0f172a" stroke-width="1.6" />

    <text x="410" y="495" class="tag-text">C-01</text>
  </g>

  <!-- Ventilatore / Alimentazione Aria + Benzene -->
  <g transform="translate(280, 495)">
    <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#0f172a" stroke-width="1.8" />
    <path d="M 0 -10 A 10 10 0 0 1 0 10 Z" fill="#0f172a" />
    <text x="0" y="-28" class="label-text" text-anchor="middle">Aria +</text>
    <text x="0" y="-14" class="label-text" text-anchor="middle">Benzene</text>
  </g>

  <!-- Uscita Aria Depurata -->
  <g transform="translate(430, 165)">
    <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#0f172a" stroke-width="1.8" />
    <line x1="-7" y1="-7" x2="7" y2="7" stroke="#0f172a" stroke-width="1.6" />
    <line x1="-7" y1="7" x2="7" y2="-7" stroke="#0f172a" stroke-width="1.6" />
    <text x="18" y="-4" class="label-text">Aria</text>
    <text x="18" y="10" class="label-text">depurata</text>
  </g>

  <!-- ── G-02: Pompa Fondo C-01 (Rilancio Olio Ricco) ────────────────────── -->
  <g id="G-02" transform="translate(435, 560)" class="shadow">
    <circle cx="0" cy="0" r="15" class="equip-body" />
    <path d="M -15 0 L 0 -15 L 0 0 Z" fill="#0f172a" />
    <text x="0" y="32" class="tag-text" text-anchor="middle">G-02</text>
  </g>

  <!-- ── E-02: Scambiatore Rigenerativo Olio Ricco / Olio Povero ─────────── -->
  <g id="E-02" transform="translate(535, 275)" class="shadow">
    <circle cx="0" cy="0" r="24" class="equip-body" />
    <!-- Serpentina a zig-zag verticale per olio povero caldo -->
    <path d="M 0 -24 L 0 -12 L 10 -4 L -10 4 L 0 12 L 0 24" class="equip-internal" />
    <text x="18" y="34" class="tag-text">E-02</text>
  </g>

  <!-- ── G-03: Pompa Fondo Stripper C-02 (Rilancio Olio Povero Caldo) ────── -->
  <g id="G-03" transform="translate(535, 560)" class="shadow">
    <circle cx="0" cy="0" r="15" class="equip-body" />
    <!-- Orientamento mandata verso l'alto -->
    <path d="M 0 15 L -15 0 L 0 0 Z" fill="#0f172a" />
    <text x="0" y="32" class="tag-text" text-anchor="middle">G-03</text>
  </g>

  <!-- ── C-02: Colonna di Stripping a Piatti ─────────────────────────────── -->
  <g id="C-02" class="shadow">
    <!-- Mantello cilindrico verticale -->
    <path d="
      M 610 220 
      A 25 25 0 0 1 660 220 
      L 660 495 
      A 25 25 0 0 1 610 495 
      Z" class="equip-body" />

    <!-- 10 Piatti di Stripping orizzontali -->
    <line x1="613" y1="260" x2="657" y2="260" class="equip-internal" />
    <line x1="613" y1="285" x2="657" y2="285" class="equip-internal" />
    <line x1="613" y1="310" x2="657" y2="310" class="equip-internal" />
    <line x1="613" y1="335" x2="657" y2="335" class="equip-internal" />
    <line x1="613" y1="360" x2="657" y2="360" class="equip-internal" />
    <line x1="613" y1="385" x2="657" y2="385" class="equip-internal" />
    <line x1="613" y1="410" x2="657" y2="410" class="equip-internal" />
    <line x1="613" y1="435" x2="657" y2="435" class="equip-internal" />
    <line x1="613" y1="460" x2="657" y2="460" class="equip-internal" />
    <line x1="613" y1="485" x2="657" y2="485" class="equip-internal" />

    <text x="670" y="495" class="tag-text">C-02</text>
  </g>

  <!-- ── E-03: Condensatore Totale di Testa ──────────────────────────────── -->
  <g id="E-03" transform="translate(755, 265)" class="shadow">
    <circle cx="0" cy="0" r="24" class="equip-body" />
    <path d="M -17 0 C -9 11, 9 -11, 17 0" class="equip-internal" />
    <text x="24" y="30" class="tag-text">E-03</text>
  </g>

  <!-- ── D-02: Decantatore Bifasico / Separatore Gravitativo ─────────────── -->
  <g id="D-02" class="shadow">
    <!-- Serbatoio orizzontale con fondi bombati -->
    <rect x="725" y="375" width="105" height="43" rx="18" ry="18" class="equip-body" />
    
    <!-- Setto verticale di sfioro / Baffle interno (separatore Acqua / Benzene) -->
    <line x1="795" y1="385" x2="795" y2="418" stroke="#0f172a" stroke-width="2" stroke-linecap="round" />

    <text x="715" y="370" class="tag-text" text-anchor="end">D-02</text>
  </g>

  <!-- Etichetta Prodotto Benzene Recuperato -->
  <text x="815" y="555" class="tag-text" text-anchor="middle">Benzene</text>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- PIÈ DI PAGINA ACCADEMICO (Fedele allo standard didattico Unipd)         -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <line x1="40" y1="${H - 42}" x2="${W - 40}" y2="${H - 42}" stroke="#cbd5e1" stroke-width="1" />
  <text x="45" y="${H - 24}" class="footer-text">Fondamenti di Impianti Chimici — Corso di Laurea in Chimica Industriale</text>
  <text x="${W / 2}" y="${H - 24}" class="footer-text" text-anchor="middle">©2024 prof. A.C. Santomaso</text>
  <text x="${W - 45}" y="${H - 24}" class="footer-text" text-anchor="end">13/63</text>
</svg>
`;
}

async function main() {
  const outputDir = path.resolve(__dirname, '../../');
  const svgContent = generateFlowsheetSvg();

  // 1. Salva l'SVG come schema_processo.svg e Cattura.svg nella cartella "riassunti università"
  const svgPath1 = path.join(outputDir, 'schema_processo.svg');
  const svgPath2 = path.join(outputDir, 'Cattura.svg');
  fs.writeFileSync(svgPath1, svgContent, 'utf8');
  fs.writeFileSync(svgPath2, svgContent, 'utf8');
  console.log('✔ File SVG salvati con successo in:');
  console.log('   -', svgPath1);
  console.log('   -', svgPath2);

  // 2. Genera il PDF vettoriale "SVG.pdf" richiesto dall'utente
  const pdfPath = path.join(outputDir, 'SVG.pdf');
  console.log('Compilazione PDF vettoriale con Puppeteer...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });

  const htmlDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #fcfbf7;
    }
    svg {
      width: 96%;
      height: 94%;
    }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>
  `;

  await page.setContent(htmlDoc, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  console.log('✔ File PDF vettoriale salvato in:', pdfPath);

  // 3. Salva anche uno screenshot PNG di preview per ispezione
  const previewPng = path.join(outputDir, 'preview_schema_processo.png');
  const artifactPng = 'C:\\Users\\marco\\.gemini\\antigravity-ide\\brain\\5f5aeb0d-1646-444b-b59c-ab86c9671807\\preview_schema_processo.png';
  await page.screenshot({ path: previewPng });
  await page.screenshot({ path: artifactPng });
  console.log('✔ Preview PNG salvata in:', previewPng);

  await browser.close();
}

main().catch(err => {
  console.error('ERRORE:', err);
  process.exit(1);
});
