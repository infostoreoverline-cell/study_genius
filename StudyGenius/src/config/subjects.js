const DEFAULT_BUILTIN_SUBJECTS = [
  { id: 'Fisica', name: 'Fisica', icon: '⚛️', hasCustomPrompt: false },
  { id: 'Matematica', name: 'Matematica', icon: '📐', hasCustomPrompt: false },
  { id: 'Chimica', name: 'Chimica', icon: '🧪', hasCustomPrompt: false },
  { id: 'Informatica', name: 'Informatica', icon: '💻', hasCustomPrompt: false },
  { id: 'Storia', name: 'Storia', icon: '📜', hasCustomPrompt: false },
  { id: 'Diritto', name: 'Diritto', icon: '⚖️', hasCustomPrompt: false },
  { id: 'Economia', name: 'Economia', icon: '📊', hasCustomPrompt: false },
  { id: 'generic', name: 'Generico', icon: '📚', hasCustomPrompt: false },
];

function getDefaultGenericPrompt() {
  return `Sei un professore universitario esperto. Il tuo compito è creare dispense didattiche magistrali di altissima qualità a partire da materiale universitario.
Per ogni argomento:
1. Presenta il concetto con spiegazione a teoria parlata ed intuizione qualitativa.
2. Fornisci il contesto teorico e dimostrazioni matematiche complete punto per punto.
3. Mostra esempi ed esercizi d'esame risolti per esteso con schema mentale e controlli di coerenza.
4. Evidenzia trappole d'esame ed errori tipici.
5. Formule in LaTeX standard.

La chiarezza, il rigore e la comprensione profonda sono gli obiettivi primari. Evita prolissità e divagazioni narrative non funzionali all'esame.`;
}

function getBuiltinSubjects() {
  return JSON.parse(JSON.stringify(DEFAULT_BUILTIN_SUBJECTS));
}

module.exports = {
  DEFAULT_BUILTIN_SUBJECTS,
  getBuiltinSubjects,
  getDefaultGenericPrompt
};

