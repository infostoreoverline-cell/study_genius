/**
 * StudyGenius - Unified Test Runner CLI
 * 
 * Esegue automaticamente tutte le suite di test (test_*.js) nella directory tests/
 * con isolamento di processo, timing ad alta precisione e formattazione visiva chiara.
 * 
 * Utilizzo:
 *   node tests/runAll.js
 *   npm test
 *   npm test -- --verbose   (mostra output completo anche per i test superati)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { performance } = require('perf_hooks');

// Palette colori ANSI per terminale
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bgGreen: '\x1b[42m\x1b[30m',
  bgRed: '\x1b[41m\x1b[37m'
};

const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
const testsDir = __dirname;

function runTestSuite() {
  console.log(`\n${colors.bold}${colors.cyan}=====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  🧪 STUDYGENIUS — TEST RUNNER SUITE AUTOMATIZZATA  ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=====================================================${colors.reset}\n`);

  // 1. Discovery dinamica delle suite
  const testFiles = fs.readdirSync(testsDir)
    .filter(file => file.startsWith('test_') && file.endsWith('.js'))
    .sort();

  if (testFiles.length === 0) {
    console.log(`${colors.yellow}⚠️  Nessun file di test (test_*.js) trovato in ${testsDir}${colors.reset}\n`);
    process.exit(0);
  }

  console.log(`${colors.gray}Trovate ${colors.bold}${testFiles.length}${colors.reset}${colors.gray} suite di test da eseguire in isolamento...${colors.reset}\n`);

  const results = [];
  const overallStart = performance.now();

  // 2. Esecuzione sequenziale con isolamento di processo
  for (let i = 0; i < testFiles.length; i++) {
    const file = testFiles[i];
    const fullPath = path.join(testsDir, file);
    const indexStr = `${i + 1}/${testFiles.length}`.padStart(5);

    process.stdout.write(` ${colors.gray}[${indexStr}]${colors.reset} ⏳ ${file.padEnd(38)} `);

    const testStart = performance.now();
    const child = spawnSync(process.execPath, [fullPath], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
      encoding: 'utf-8',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    const testDuration = Math.round(performance.now() - testStart);

    const passed = child.status === 0;
    results.push({
      file,
      passed,
      duration: testDuration,
      stdout: child.stdout || '',
      stderr: child.stderr || ''
    });

    if (passed) {
      process.stdout.write(`\r ${colors.gray}[${indexStr}]${colors.reset} ${colors.green}✔ PASS${colors.reset} ${colors.bold}${file.padEnd(38)}${colors.reset} ${colors.dim}(${testDuration} ms)${colors.reset}\n`);
      if (verbose && child.stdout) {
        console.log(`${colors.dim}${child.stdout.trim()}${colors.reset}\n`);
      }
    } else {
      process.stdout.write(`\r ${colors.gray}[${indexStr}]${colors.reset} ${colors.red}✖ FAIL${colors.reset} ${colors.bold}${file.padEnd(38)}${colors.reset} ${colors.red}(${testDuration} ms)${colors.reset}\n`);
      console.log(`\n${colors.red}--- [ERRORE IN ${file}] ---${colors.reset}`);
      if (child.stderr) {
        console.error(`${colors.red}${child.stderr.trim()}${colors.reset}`);
      }
      if (child.stdout) {
        console.log(`${colors.gray}${child.stdout.trim()}${colors.reset}`);
      }
      console.log(`${colors.red}------------------------------------${colors.reset}\n`);
    }
  }

  const overallDuration = ((performance.now() - overallStart) / 1000).toFixed(2);
  const totalPassed = results.filter(r => r.passed).length;
  const totalFailed = results.filter(r => !r.passed).length;

  // 3. Tabella e report di sintesi
  console.log(`\n${colors.bold}${colors.cyan}-----------------------------------------------------${colors.reset}`);
  console.log(`${colors.bold}  RIEPILOGO ESECUZIONE TEST${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}-----------------------------------------------------${colors.reset}`);
  console.log(`  Totale Suite:   ${colors.bold}${testFiles.length}${colors.reset}`);
  console.log(`  Superate:       ${colors.green}${colors.bold}${totalPassed}${colors.reset}`);
  console.log(`  Fallite:        ${totalFailed > 0 ? colors.red + colors.bold + totalFailed : colors.gray + '0'}${colors.reset}`);
  console.log(`  Tempo Totale:   ${colors.dim}${overallDuration}s${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}-----------------------------------------------------${colors.reset}`);

  if (totalFailed === 0) {
    console.log(`\n  ${colors.bgGreen}${colors.bold} TUTTI I TEST SONO PASSATI CON SUCCESSO! (100%) ${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n  ${colors.bgRed}${colors.bold} ATTENZIONE: ${totalFailed} TEST HANNO FALLITO! ${colors.reset}\n`);
    process.exit(1);
  }
}

runTestSuite();
