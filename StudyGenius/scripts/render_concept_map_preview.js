const path = require('path');
const fs = require('fs-extra');
const puppeteer = require('puppeteer');
const { renderConceptMap } = require('../src/rendering/conceptMapRenderer');

async function renderPreview() {
  const spec = {
    schemaVersion: '1.0',
    visualId: 'concept_map_preview_pompe',
    kind: 'concept_map',
    title: 'Mappa Concettuale: Classificazione e Dinamica delle Pompe Industriali',
    payload: {
      layoutIntent: 'top_down',
      showLegend: true,
      nodes: [
        { id: 'root', label: 'Macchine Operatrici Idrauliche', category: 'Fondamento' },
        { id: 'dinamiche', label: 'Pompe Dinamiche (Turbopompe)', category: 'Famiglia' },
        { id: 'volumetriche', label: 'Pompe Volumetriche', category: 'Famiglia' },
        { id: 'centrifughe', label: 'Pompe Centrifughe (Flusso Radiale)', category: 'Applicazione' },
        { id: 'assiali', label: 'Pompe ad Elica (Flusso Assiale)', category: 'Applicazione' },
        { id: 'alternative', label: 'Pompe a Pistone / Membrana', category: 'Applicazione' },
        { id: 'rotative', label: 'Pompe ad Ingranaggi / Palette', category: 'Applicazione' }
      ],
      edges: [
        { id: 'e1', from: 'root', to: 'dinamiche', relation: 'classification', label: 'scambio di q.d.m.' },
        { id: 'e2', from: 'root', to: 'volumetriche', relation: 'classification', label: 'variazione di volume' },
        { id: 'e3', from: 'dinamiche', to: 'centrifughe', relation: 'classification', label: 'flusso ortogonale' },
        { id: 'e4', from: 'dinamiche', to: 'assiali', relation: 'classification', label: 'flusso parallelo' },
        { id: 'e5', from: 'volumetriche', to: 'alternative', relation: 'classification', label: 'moto alterno' },
        { id: 'e6', from: 'volumetriche', to: 'rotative', relation: 'classification', label: 'moto rotatorio continuo' }
      ]
    }
  };

  const svg = renderConceptMap(spec);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 40px;
      background: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .preview-card {
      background: #ffffff;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="preview-card">
    ${svg}
  </div>
</body>
</html>
  `;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const card = await page.$('.preview-card');
  const artifactPath = 'C:\\Users\\marco\\.gemini\\antigravity-ide\\brain\\5f5aeb0d-1646-444b-b59c-ab86c9671807\\preview_concept_map_v2.png';
  await card.screenshot({ path: artifactPath });
  console.log('✔ Screenshot preview salvato in:', artifactPath);

  await browser.close();
}

renderPreview().catch(console.error);
