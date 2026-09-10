const path = require('path');
const fs = require('fs-extra');
const puppeteer = require('puppeteer');
const { generateAcademicHtmlDoc, renderMarkdownOrHtmlWithMath } = require('../src/services/pdfExportService');

async function captureCavitazionePreview() {
  const mdPath = path.resolve(__dirname, '../sessions/Fisica/36a8f952-3189-463c-bef1-0d369da19b55.md');
  const markdown = fs.readFileSync(mdPath, 'utf8');

  console.log('Rendering HTML Cavitazione...');
  const { html, css } = renderMarkdownOrHtmlWithMath(markdown, true);
  const fullHtml = generateAcademicHtmlDoc({
    title: 'Cavitazione nelle Pompe Centrifughe',
    subject: 'Fisica',
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

  const diagrams = await page.$$('.academic-diagram');
  console.log('Found academic diagrams:', diagrams.length);
  if (diagrams.length > 0) {
    const outImg1 = path.resolve(__dirname, '../sessions/Fisica/preview_cavitazione_fig1.png');
    await diagrams[0].screenshot({ path: outImg1 });
    console.log('✔ Screenshot Fig 1 salvato in:', outImg1);
  }
  if (diagrams.length > 1) {
    const outImg2 = path.resolve(__dirname, '../sessions/Fisica/preview_cavitazione_fig2.png');
    await diagrams[1].screenshot({ path: outImg2 });
    console.log('✔ Screenshot Fig 2 salvato in:', outImg2);
  }

  await browser.close();
}

captureCavitazionePreview().catch(console.error);
