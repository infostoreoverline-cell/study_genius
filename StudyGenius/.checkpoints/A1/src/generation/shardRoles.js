/**
 * StudyGenius Academic Intelligence System
 * src/generation/shardRoles.js
 * 
 * Assegna ruoli e missioni didattiche specializzate a ciascuno Shard (corsia parallela)
 * per evitare ridondanze e garantire che ogni aspetto (definizioni, derivazioni,
 * trabocchetti, eserciziari) venga sviluppato con la massima profondità.
 */

const SHARD_ROLES = {
  FOUNDATIONS: {
    roleId: 'foundations',
    name: 'Fondamenti, Definizioni & Intuizione Fenomenologica',
    directive: `🎯 MISSIONE DIDATTICA DELLO SHARD: FONDAMENTI CONCETTUALI & INTUIZIONE.
Inquadra il fenomeno fisico/chimico/matematico: da quale problema reale nasce? Spiega con chiarezza discorsiva il 'cosa sta succedendo' prima delle equazioni. Definisci rigorosamente la nomenclatura, i simboli, le ipotesi del modello e i limiti di validità.

REGOLE INDEROGABILI PER LA NOTAZIONE E I SIMBOLI:
Ogni simbolo, formula o espressione matematica/chimica DEVE essere scritta in LaTeX con delimitatori $ ... $ (inline) o $$ ... $$ (display).
NON usare mai backtick/code span per la notazione matematica o chimica.
- Esempio CORRETTO: $C_X$ : Concentrazione analitica totale della specie X.
- Esempio SBAGLIATO: \`C_X\` : Concentrazione analitica totale della specie X.
- Esempio CORRETTO: $pH = -\\log[H^+]$, $[X]$, $K'$, $\\alpha_X$, $E^\\circ$.
- Esempio SBAGLIATO: \`pH = -log[H+]\`, \`[X]\`, \`K'\`, \`α_X\`, \`E°\`.`
  },
  DERIVATIONS: {
    roleId: 'derivations',
    name: 'Formalizzazione Analitica & Derivazioni Integrali',
    directive: `🎯 MISSIONE DIDATTICA DELLO SHARD: DERIVAZIONI MATEMATICHE & TEOREMI.
Sviluppa le equazioni di partenza e ogni singolo passaggio algebrico, differenziale o di integrazione. Non omettere passaggi intermedi né usare scorciatoie opache. Mostra l'anatomia di ogni formula, le unità di misura SI e cosa accade nei casi limite.`
  },
  LIMITS_AND_TRAPS: {
    roleId: 'limits_and_traps',
    name: 'Casi Limite, Controesempi & Trappole d\'Esame',
    directive: `🎯 MISSIONE DIDATTICA DELLO SHARD: CASI LIMITE, CONTROESEMPI & TRAPPOLE D'ESAME.
Indaga cosa accade quando i parametri tendono a $0$ o $\\infty$. Mostra controesempi se cade un'ipotesi. Dedica ampi box alle trappole d'esame (errori tipici commessi dagli studenti allo scritto o all'orale) e spiega come evitarli.`
  },
  EXERCISES: {
    roleId: 'exercises',
    name: 'Eserciziario Guidato con Schema Mentale',
    directive: `🎯 MISSIONE DIDATTICA DELLO SHARD: ESERCIZI D'ESAME RISOLTI PER ESTESO.
Ogni esercizio presente nel materiale deve essere risolto integralmente: Consegna $\\to$ Dati $\\to$ Schema Mentale ("Perché questa formula?") $\\to$ Calcoli completi $\\to$ Risultato con unità $\\to$ Controlli di Coerenza (dimensionale, segno). Includi anche un esercizio inverso o di correzione errore.`
  },
  SYNTHESIS_AND_ORAL: {
    roleId: 'synthesis_and_oral',
    name: 'Formulario Ragionato & Preparazione all\'Orale',
    directive: `🎯 MISSIONE DIDATTICA DELLO SHARD: FORMULARIO RAGIONATO & DIFESA ORALE.
Costruisci la tabella sinottica delle formule con significato, condizioni e attenzioni. Genera le domande di ragionamento tipiche del colloquio d'esame con le relative risposte argomentate e la checklist di padronanza.`
  }
};

/**
 * Attribuisce le missioni didattiche ai vari shard in base al numero di shard totali
 */
function assignShardMission(shardIndex, totalShards, subject, studyMode) {
  if (studyMode === 'exercises') {
    return SHARD_ROLES.EXERCISES.directive;
  }
  if (studyMode === 'theory') {
    return shardIndex % 2 === 0 ? SHARD_ROLES.FOUNDATIONS.directive : SHARD_ROLES.DERIVATIONS.directive;
  }

  // Modalità Completa standard
  if (totalShards === 1) {
    return `🎯 MISSIONE INTEGRALE: Sviluppa in sequenza l'inquadramento intuitivo, la formalizzazione con derivazioni complete, i casi limite, i trabocchetti d'esame e la risoluzione guidata di ogni esercizio presente.`;
  }

  const roleKeys = Object.keys(SHARD_ROLES);
  const selectedKey = roleKeys[shardIndex % roleKeys.length];
  return SHARD_ROLES[selectedKey].directive;
}

/**
 * Calcola dinamicamente la partizione degli Shard per massimizzare la concorrenza.
 * Scala da 1 worker fino a totalModules (concorrenza 1:1), rispettando maxWorkers.
 * 
 * @param {number} totalModules Numero di blocchi estratti
 * @param {number} maxWorkers Tetto massimo di concorrenza configurabile (default 120)
 * @returns {{ numShards: number, modulesPerShard: number }}
 */
function calculateDynamicShards(totalModules, maxWorkers = 120) {
  const safeTotal = Math.max(1, parseInt(totalModules || 1, 10));
  const safeMax = Math.max(1, parseInt(maxWorkers || 120, 10));
  const numShards = Math.min(safeTotal, safeMax);
  const modulesPerShard = Math.ceil(safeTotal / numShards);
  return { numShards, modulesPerShard };
}

module.exports = {
  SHARD_ROLES,
  assignShardMission,
  calculateDynamicShards
};
