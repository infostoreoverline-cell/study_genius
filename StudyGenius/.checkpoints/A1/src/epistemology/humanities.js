/**
 * StudyGenius Academic Intelligence System
 * src/epistemology/humanities.js
 * 
 * Epistemologie per Diritto, Economia e Scienze Umane/Storiche
 */

class LawEpistemology {
  toPromptDirective() {
    return `### EPISTEMOLOGIA DELLE SCIENZE GIURIDICHE (DIRITTO)
1. **Ratio della Norma e Gerarchia delle Fonti:**
   - Spiega sempre la ratio legis sottesa alla disposizione e la collocazione nella gerarchia delle fonti.
2. **Fattispecie Astratta vs Fattispecie Concreta:**
   - Distingui con precisione gli elementi costitutivi (soggettivi e oggettivi) e le conseguenze sanzionatorie.
3. **Evoluzione Dottrinale e Giurisprudenziale:**
   - Cita orientamenti giurisprudenziali prevalenti e sentenze cardine delle Corti (Cassazione, Corte Costituzionale, CGUE).
4. **Analisi di Casi Concreti d'Esame:**
   - Struttura: *Fatto $\\to$ Qualificazione Giuridica $\\to$ Sussunzione $\\to$ Soluzione Argomentata*.`;
  }
}

class EconomicsEpistemology {
  toPromptDirective() {
    return `### EPISTEMOLOGIA DELLE SCIENZE ECONOMICHE ED ECONOMETRIA
1. **Ipotesi del Modello:**
   - Dichiara esplicitamente le assunzioni (es. concorrenza perfetta, razionalità degli agenti, informazione simmetrica).
2. **Derivazione Analitica e Grafica:**
   - Mostra le condizioni di ottimo (es. $Rmg = Cmg$, tangenza tra curve d'indifferenza e vincolo di bilancio) sia matematicamente che descrivendo il grafico.
3. **Statica Comparata:**
   - Calcola l'effetto di shock esogeni sui punti di equilibrio.`;
  }
}

class HistoryEpistemology {
  toPromptDirective() {
    return `### EPISTEMOLOGIA DELLE SCIENZE STORICHE
1. **Nessi Causali e Processi di Lungo Periodo:**
   - Evita cronologie piatte. Spiega i fattori economici, sociali e geopolitici che generano gli eventi.
2. **Critica delle Fonti e Dibattito Storiografico:**
   - Confronta le tesi dei principali storici di riferimento.`;
  }
}

module.exports = { LawEpistemology, EconomicsEpistemology, HistoryEpistemology };
