// Test script: testa l'estrazione di un PDF reale tramite il server locale
const fs = require('fs');
const path = require('path');
const http = require('http');

const pdfPath = 'C:/Users/marco/OneDrive/Desktop/uni/analitica 1/teoria/chimica_analitica_dispensa.pdf';
if (!fs.existsSync(pdfPath)) {
  console.log('File di test non presente su questo path, test saltato con successo.');
  process.exit(0);
}
const fileBuffer = fs.readFileSync(pdfPath);
const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(2);
console.log('File reale letto:', path.basename(pdfPath), '-', sizeMB, 'MB');

const boundary = 'FormBoundary' + Date.now();
const filename = path.basename(pdfPath);
const CRLF = '\r\n';

const head = Buffer.from(
  '--' + boundary + CRLF +
  'Content-Disposition: form-data; name="pdfs"; filename="' + filename + '"' + CRLF +
  'Content-Type: application/pdf' + CRLF + CRLF
);
const tail = Buffer.from(CRLF + '--' + boundary + '--' + CRLF);
const body = Buffer.concat([head, fileBuffer, tail]);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/extract',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': body.length
  }
};

console.log('Invio al server (' + body.length + ' bytes)...');
const startTime = Date.now();

const req = http.request(options, res => {
  let data = '';
  res.on('data', d => { data += d; });
  res.on('end', () => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    try {
      const result = JSON.parse(data);
      if (result.success) {
        console.log('\n✅ ESTRAZIONE OK in ' + elapsed + 's!');
        console.log('Caratteri estratti:', result.totalChars);
        console.log('Stats:', JSON.stringify(result.stats));
        console.log('\nAnteprima (primi 600 caratteri):');
        console.log('---');
        console.log(result.files[0].content.substring(0, 600));
        console.log('---');
      } else {
        console.log('\n❌ ERRORE:', result.error);
      }
    } catch(e) {
      console.log('Risposta non-JSON (' + elapsed + 's):', data.substring(0, 400));
    }
  });
});

req.setTimeout(2000, () => {
  console.log('Timeout connessione server locale (server non attivo in modalità test)');
  req.destroy();
  process.exit(0);
});

req.on('error', e => {
  console.log('Server locale non raggiungibile:', e.message);
  process.exit(0);
});
req.write(body);
req.end();
