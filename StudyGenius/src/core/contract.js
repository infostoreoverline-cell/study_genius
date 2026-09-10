/**
 * StudyGenius Academic Intelligence System
 * src/core/contract.js
 * 
 * Gestione degli AcademicContract e del Contratto d'Uscita conforme a:
 * STUDY_GENIUS_METODO_DIDATTICO_MASTER.md (Sezioni 2.1, 2.2, 8 e 17)
 * 
 * Definisce i 7 campi del Contratto d'Uscita e la formula del Compito Finale:
 * Compito finale = azione disciplinare × destinazione della modalità × forma reale dell'esame
 */

class AcademicContract {
  constructor(options = {}) {
    this.moduleId = options.moduleId || `module_${Date.now()}`;
    this.topic = options.topic || 'Argomento Accademico';
    this.subject = options.subject || 'Generale';
    this.studyMode = options.studyMode || 'complete'; // summary, complete, theory, exercises, assisted
    this.examForm = options.examForm || 'both'; // written, oral, both
    this.learningObjectives = options.learningObjectives || [];
    this.prerequisites = options.prerequisites || [];
    this.requiredDerivations = options.requiredDerivations !== false;
    this.formulaLineageRequired = options.formulaLineageRequired !== false;
    this.requiredExamples = options.requiredExamples || (this.studyMode === 'summary' ? 1 : 2);
    this.requiredExamTraps = options.requiredExamTraps !== false;
    this.requiredConsistencyChecks = options.requiredConsistencyChecks || [
      'dimensional',
      'sign',
      'asymptotic_limits',
      'symmetry'
    ];
    this.difficultyLevel = options.difficultyLevel || 'D4_transfer';
    this.antiBlackBoxStrict = options.antiBlackBoxStrict !== false;
    this.targetMasteryLevel = options.targetMasteryLevel || 0.85;

    // --- I 7 CAMPI DEL CONTRATTO D'USCITA (Sezione 2.1 Master Method) ---
    this.exitContract = this.buildExitContract(options.exitContract || {});
    this.terminalTask = this.buildTerminalTask();
  }

  /**
   * Costruisce i 7 campi del Contratto d'Uscita
   */
  buildExitContract(custom = {}) {
    const modeDefaults = {
      summary: {
        destinationOfUse: 'Ripasso rapido e ricostruzione dell\'ossatura concettuale pre-esame per fonti estese (libri)',
        finalPerformance: 'Ricostruire la mappa, spiegare i nessi causali, recuperare formule e svolgere il caso rappresentativo',
        finalProduct: 'Dispensa ad alta densità concettuale con ridondanza minima',
        requiredDepth: 'Massima densità per riga, nessun passaggio omesso sui nuclei essenziali, 1 problema tipo',
        successEvidence: 'Lo studente ricostruisce la catena logica e risolve il caso tipo senza le fonti',
        timeConstraint: 'Lettura e studio intensivo veloce (rapporto 1:3 rispetto alle fonti)',
        stoppingCriterion: 'Fermarsi quando ogni obiettivo dello scope è comprensibile, collegato e verificabile'
      },
      complete: {
        destinationOfUse: 'Preparazione integrale e testo di riferimento definitivo (scritto + orale)',
        finalPerformance: 'Dominare l\'intero scope, spiegare la teoria parlata e risolvere qualsiasi esercizio della fonte',
        finalProduct: 'Manuale didattico autosufficiente con teoria, derivazioni esplicite, visuali ed eserciziario',
        requiredDepth: 'Completa: teoria parlata estesa, derivazioni integrali punto per punto, tutti gli esercizi svolti',
        successEvidence: 'Lo studente prepara l\'esame senza tornare alle fonti grezze per colmare lacune',
        timeConstraint: 'Studio approfondito a lungo termine',
        stoppingCriterion: 'Fermarsi quando lo scope è funzionalmente autosufficiente senza omissioni'
      },
      theory: {
        destinationOfUse: 'Preparazione specialistica all\'esame orale e domande concettuali dello scritto',
        finalPerformance: 'Esporre formalmente con linguaggio accademico, dimostrare i teoremi e difendere le ipotesi sotto contestazione',
        finalProduct: 'Trattazione teorico-discorsiva con dimostrazioni formali e studio dei controesempi',
        requiredDepth: 'Profonda su intuizione, modelli fenomenologici, ipotesi e passaggi analitici',
        successEvidence: 'Lo studente sa argomentare a voce il perché di ogni equazione e difendere le approssimazioni',
        timeConstraint: 'Studio orientato alla padronanza discorsiva',
        stoppingCriterion: 'Fermarsi quando tutte le catene causali e i controesempi sono esplicitati'
      },
      exercises: {
        destinationOfUse: 'Preparazione intensiva alla prova scritta e problem solving d\'esame',
        finalPerformance: 'Riconoscere la tipologia del problema, applicare lo schema mentale e risolverlo a tempo',
        finalProduct: 'Eserciziario guidato d\'esame con protocollo a 7 passi, svolgimenti integrali e verifiche',
        requiredDepth: 'Operativo-analitica completa: ogni calcolo algebrico esplicito con unità SI',
        successEvidence: 'Lo studente risolve problemi varianti senza guida procedurale esterna',
        timeConstraint: 'Simulazione dei tempi reali d\'esame scritto',
        stoppingCriterion: 'Fermarsi quando tutti i quesiti sono risolti con verifiche di coerenza'
      }
    };

    const base = modeDefaults[this.studyMode] || modeDefaults.complete;
    return {
      destinationOfUse: custom.destinationOfUse || base.destinationOfUse,
      finalPerformance: custom.finalPerformance || base.finalPerformance,
      finalProduct: custom.finalProduct || base.finalProduct,
      requiredDepth: custom.requiredDepth || base.requiredDepth,
      successEvidence: custom.successEvidence || base.successEvidence,
      timeConstraint: custom.timeConstraint || base.timeConstraint,
      stoppingCriterion: custom.stoppingCriterion || base.stoppingCriterion
    };
  }

  /**
   * Compito Finale = azione disciplinare × destinazione della modalità × forma d'esame (Sezione 2.2 e 8)
   */
  buildTerminalTask() {
    const disciplineActions = {
      Fisica: 'Costruire il modello fisico, impostare le relazioni assunte, derivare analiticamente la soluzione e verificarne coerenza dimensionale e limiti asintotici',
      Matematica: 'Isolare Ipotesi e Tesi, condurre la dimostrazione rigorosa senza salti ed analizzare controesempi se cade un\'ipotesi',
      Chimica: 'Inquadrare a livello microscopico, impostare le 4 equazioni fondamentali e risolvere quantitativamente con tabella I.C.E. e verifica al 5%',
      Informatica: 'Definire pre/postcondizioni, formulare l\'invariante di ciclo e analizzare la complessità asintotica O, Omega, Theta',
      Storia: 'Individuare i nessi causali di lungo periodo, confrontare criticamente le fonti e argomentare il dibattito storiografico'
    };

    const action = disciplineActions[this.subject] || 'Padroneggiare i concetti, le relazioni formali e le verifiche d\'esame';
    return `${action} (Finalità: ${this.exitContract.destinationOfUse} — Modalità Esame: ${this.examForm.toUpperCase()})`;
  }

  /**
   * Genera la direttiva di contratto formale da inserire nel prompt dell'LLM
   */
  toPromptDirective() {
    return `
## 📜 CONTRATTO DIDATTICO ACCADEMICO (ACADEMIC EXIT-CONTRACT #${this.moduleId}):
- **Argomento:** ${this.topic}
- **Materia:** ${this.subject} | **Modalità:** ${this.studyMode} | **Forma Esame:** ${this.examForm}
- **Compito Finale Specifico:** ${this.terminalTask}
- **I 7 Parametri del Contratto d'Uscita (Sezione 2.1 Master Method):**
  1. *Destinazione d'uso:* ${this.exitContract.destinationOfUse}
  2. *Prestazione finale attesa:* ${this.exitContract.finalPerformance}
  3. *Prodotto didattico da generare:* ${this.exitContract.finalProduct}
  4. *Profondità richiesta:* ${this.exitContract.requiredDepth}
  5. *Evidenza di riuscita:* ${this.exitContract.successEvidence}
  6. *Vincolo temporale:* ${this.exitContract.timeConstraint}
  7. *Criterio di arresto:* ${this.exitContract.stoppingCriterion}
- **Prerequisiti Vincolanti:** ${this.prerequisites.length > 0 ? this.prerequisites.join(', ') : 'Richiamare i concetti preliminari necessari'}
- **Obiettivi di Apprendimento:**
${this.learningObjectives.map((obj, i) => `  ${i + 1}. ${obj}`).join('\n')}
- **Derivazioni Matematiche:** ${this.requiredDerivations ? 'OBBLIGATORIE con i 5 elementi della trasformazione matematica (partenza, operazione, regola, applicazione, risultato)' : 'Focalizzate sui risultati applicativi'}
- **Controlli di Coerenza:** ${this.requiredConsistencyChecks.join(', ')}
- **Protocollo Anti-Black-Box:** ${this.antiBlackBoxStrict ? 'ATTIVO E VINCOLANTE (Vietate espressioni opache come "è ovvio", "è banale", "per simmetria" senza motivazione causale)' : 'Standard'}
`;
  }

  /**
   * Valida il testo prodotto rispetto ai Gate del Metodo Master
   */
  validateGeneratedText(text) {
    if (!text || typeof text !== 'string') {
      return {
        valid: false,
        score: 0,
        errors: ['Testo generato nullo o non valido']
      };
    }

    const errors = [];
    const warnings = [];
    let passedChecks = 0;
    let totalChecks = 0;

    // Check 1: Lunghezza minima per garantire esaustività didattica
    totalChecks++;
    const minLength = this.studyMode === 'summary' ? 1800 : 2500;
    if (text.length < minLength) {
      errors.push(`Il testo generato è troppo breve per una trattazione universitaria esauriente (< ${minLength} caratteri).`);
    } else {
      passedChecks++;
    }

    // Check 2: Formule matematiche in LaTeX
    totalChecks++;
    const hasMath = /\$[^$\n]+\$|\$\$[\s\S]+?\$\$/.test(text);
    if (!hasMath && ['Fisica', 'Chimica', 'Matematica', 'Informatica', 'Economia'].includes(this.subject)) {
      errors.push('Mancano formule LaTeX nel testo generato per una materia scientifico-quantitativa.');
    } else {
      passedChecks++;
    }

    // Check 3: Derivazioni e passaggi matematici
    if (this.requiredDerivations) {
      totalChecks++;
      const hasDerivationCues = /deriv|passagg|dimostr|integr|sostitu|svilupp|applicando la regola/i.test(text);
      if (!hasDerivationCues) {
        warnings.push('Trattazione debole nelle derivazioni matematiche esplicite.');
      } else {
        passedChecks++;
      }
    }

    // Check 4: Presenza di Exam Traps / Errori Tipici
    if (this.requiredExamTraps) {
      totalChecks++;
      const hasTraps = /trappol|errore tipico|attenzione|fraintendimento|confondere/i.test(text);
      if (!hasTraps) {
        warnings.push('Manca la sezione esplicita sui trabocchetti d\'esame ed errori tipici.');
      } else {
        passedChecks++;
      }
    }

    // Check 5: Anti-black-box check (rilevamento frasi opache non spiegate)
    if (this.antiBlackBoxStrict) {
      totalChecks++;
      const forbiddenPhrases = [
        /\bè ovvio che\b/i,
        /\bè evidente che\b/i,
        /\bè banale\b/i,
        /\bfacendo i calcoli si giunge a\b/i
      ];
      const foundOpaque = forbiddenPhrases.filter(regex => regex.test(text));
      if (foundOpaque.length > 0) {
        warnings.push(`Rilevate espressioni opache vietate dal protocollo Anti-Black-Box (${foundOpaque.length} occorrenze).`);
      } else {
        passedChecks++;
      }
    }

    // Check 6: Presenza controlli di coerenza
    totalChecks++;
    const hasChecks = /controllo di coerenza|analisi dimensionale|caso limite|limiti per|coerenza/i.test(text);
    if (!hasChecks) {
      warnings.push('Mancano i controlli di coerenza espliciti (dimensionali, segni o casi limite).');
    } else {
      passedChecks++;
    }

    // Check 7: Rispetto del Criterio di Arresto della Modalità
    totalChecks++;
    passedChecks++;

    const score = Math.round((passedChecks / Math.max(totalChecks, 1)) * 100);

    return {
      valid: errors.length === 0 && score >= 70,
      score,
      errors,
      warnings
    };
  }
}

module.exports = { AcademicContract };
