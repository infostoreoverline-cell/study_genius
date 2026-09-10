const path = require('path');
const fs = require('fs-extra');
const puppeteer = require('puppeteer');
const { generateAcademicHtmlDoc, renderMarkdownOrHtmlWithMath } = require('../src/services/pdfExportService');

async function capturePhysicsPreview() {
  const mdPath = path.resolve(__dirname, '../../descrizioni funzionamento/ESEMPIO_SESSIONE_CON_GRAFICI_E_PDF.md');
  const markdown = fs.readFileSync(mdPath, 'utf8');

  console.log('Rendering HTML Fisica con MathJax e DiagramEngine...');
  const { html, css } = renderMarkdownOrHtmlWithMath(markdown, true);
  const fullHtml = generateAcademicHtmlDoc({
    title: 'Fisica Generale II: Teorema di Gauss',
    subject: 'Fisica Generale II',
    renderedHtml: html,
    renderedCss: css
  });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

  await page.evaluateHandle('document.fonts.ready');

  const figureEl = await page.$('.academic-scientific-figure');
  if (figureEl) {
    const outImgPath = path.resolve(__dirname, '../../descrizioni funzionamento/preview_figura_gauss.png');
    const artifactImgPath = 'C:\\Users\\marco\\.gemini\\antigravity-ide\\brain\\df5a4c84-5cd0-41d3-bf96-c72447a9414d\\preview_figura_gauss.png';
    await figureEl.screenshot({ path: outImgPath });
    await figureEl.screenshot({ path: artifactImgPath });
    console.log('✔ Screenshot della figura scientifica di Gauss salvato in:', outImgPath);
    console.log('✔ Screenshot salvato negli artifact:', artifactImgPath);
  } else {
    console.error('Elemento .academic-scientific-figure non trovato!');
  }

  await browser.close();
}

capturePhysicsPreview().catch(console.error);
