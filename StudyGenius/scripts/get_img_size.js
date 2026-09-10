const puppeteer = require('puppeteer');
const path = require('path');

async function inspect() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const imgPath = path.resolve(__dirname, '../../Cattura.PNG').replace(/\\/g, '/');

  await page.setContent(`
    <html>
      <body style="margin:0; background:#000;">
        <img id="img" src="file:///${imgPath}" style="width:100%;">
      </body>
    </html>
  `);

  const img = await page.$('#img');
  const box = await img.boundingBox();
  console.log('Image displayed size:', box);

  await browser.close();
}

inspect().catch(console.error);
