/**
 * StudyGenius Academic Intelligence System
 * src/epistemology/index.js
 * 
 * Dispatcher centrale dell'epistemologia disciplinare
 */

const { PhysicsEpistemology } = require('./physics');
const { ChemistryEpistemology } = require('./chemistry');
const { MathEpistemology } = require('./math');
const { ComputerScienceEpistemology } = require('./computerScience');
const { LawEpistemology, EconomicsEpistemology, HistoryEpistemology } = require('./humanities');

class DefaultEpistemology {
  toPromptDirective() {
    return `### EPISTEMOLOGIA ACCADEMICA GENERALE
- Inquadra ogni concetto partendo dal problema fondamentale che intende risolvere.
- Definisci rigorosamente la nomenclatura prima di utilizzarla.
- Mostra sempre la catena causale delle spiegazioni e verifica la coerenza dei risultati.`;
  }
}

function getEpistemologyForSubject(subjectName) {
  const norm = (subjectName || '').toLowerCase();

  if (norm.includes('fisic')) {
    return new PhysicsEpistemology();
  }
  if (norm.includes('chimic')) {
    return new ChemistryEpistemology();
  }
  if (norm.includes('matemat') || norm.includes('analis') || norm.includes('geometr')) {
    return new MathEpistemology();
  }
  if (norm.includes('informat') || norm.includes('algorit') || norm.includes('programm')) {
    return new ComputerScienceEpistemology();
  }
  if (norm.includes('diritt') || norm.includes('giurisp')) {
    return new LawEpistemology();
  }
  if (norm.includes('econom')) {
    return new EconomicsEpistemology();
  }
  if (norm.includes('stori')) {
    return new HistoryEpistemology();
  }

  return new DefaultEpistemology();
}

module.exports = {
  getEpistemologyForSubject,
  PhysicsEpistemology,
  ChemistryEpistemology,
  MathEpistemology,
  ComputerScienceEpistemology,
  LawEpistemology,
  EconomicsEpistemology,
  HistoryEpistemology,
  DefaultEpistemology
};
