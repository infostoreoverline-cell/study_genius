const path = require('path');
const fs = require('fs-extra');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const {
  defaultAccessManager,
  callGeminiRole
} = require('../src/services/aiService');

async function main() {
  const imgPath = path.resolve(__dirname, '../../Cattura.PNG');
  console.log('Verifica esistenza immagine:', imgPath, fs.existsSync(imgPath));

  if (!fs.existsSync(imgPath)) {
    throw new Error('Immagine Cattura.PNG non trovata');
  }

  const imgBuffer = fs.readFileSync(imgPath);
  console.log('Immagine letta con successo, dimensione:', imgBuffer.length, 'bytes');

  // Imposta privacy consent per Gemini
  defaultAccessManager.setPrivacyConsent(true);

  const prompt = `Sei un ingegnere chimico esperto di impianti e schemi PFD / P&ID.
Analizza con estrema precisione lo schema di processo allegato ("II. Schema di processo semplificato" - Fondamenti di Impianti Chimici, Università di Padova).

Fornisci una trascrizione tecnica e analitica completa dello schema:
1. IDENTIFICAZIONE COMPONENTI / APPARECCHIATURE:
   - Sigla (D-01, G-01, C-01, G-02, E-02, C-02, E-03, D-02, G-03, E-01, VB, AR, ecc.)
   - Nome e tipologia ingegneristica dell'apparecchiatura (es. colonna a riempimento, colonna a piatti, scambiatore a fascio tubiero/economizzatore, decantatore trifasico/bifasico, pompa centrifuga)
   - Ruolo didattico e funzionale nel processo di assorbimento/stripping del benzene con olio

2. TOPOLOGIA DELLE LINEE E FLUSSI (STREAMS):
   - Origine e destinazione di ogni linea
   - Fluido trasportato (Olio rigenerato, Olio ricco, Aria + Benzene, Aria depurata, Vapore VB, Benzene condensato, Acqua, Acqua di Rete AR)
   - Punti di ingresso e uscita (testa, fondo, mantello, tubi)
   - Valvole / utilities (VB = vapore bassa pressione, AR = acqua di rete, A = acqua)

3. SPECIFICA STRUTTURATA JSON:
Fornisci anche un blocco JSON \`\`\`json con:
- title
- equipment: lista di { id, name, type, x, y, width, height, label }
- streams: lista di { from, to, fluid, label, pathType }
- utilities: lista di { id, type, label, connectedTo }
`;

  console.log('Invio a Google Gemini (ruolo VISUAL_EXTRACTION)...');
  const result = await callGeminiRole({
    role: 'VISUAL_EXTRACTION',
    contents: [
      prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: imgBuffer.toString('base64')
        }
      }
    ],
    config: {
      temperature: 0.1,
      mediaResolution: 'MEDIA_RESOLUTION_HIGH'
    },
    metadata: {
      isCritical: true,
      justification: 'Trascrizione tecnica schema di processo PFD da Cattura.PNG'
    }
  });

  const responseText = result.response.text();
  console.log('✅ Trascrizione ricevuta da Google Gemini!');
  console.log('Lunghezza risposta:', responseText.length);

  const outTranscriptPath = path.resolve(__dirname, '../../trascrizione_cattura.md');
  fs.writeFileSync(outTranscriptPath, responseText, 'utf8');
  console.log('Trascrizione salvata in:', outTranscriptPath);
}

main().catch(err => {
  console.error('ERRORE:', err);
  process.exit(1);
});
