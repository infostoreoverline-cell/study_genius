/**
 * StudyGenius Academic Intelligence System
 * src/core/visualLedger.js
 *
 * Visual Ledger — Registro centrale della chain of custody per ogni visual.
 *
 * Specifica di riferimento: 1.md §3 (Chain of Custody), §5 (Visual Coverage),
 * markdown.md §20 (Registro delle figure), 2.md §65 (Artifact lifecycle).
 *
 * Principio fondamentale (1.md §62):
 *   DETECTED + ACCEPTED + NO OUTCOME = BUG
 *
 * State machine:
 *   DETECTED → ACCEPTED → SPECIFIED → RENDERED → INSERTED → VERIFIED → FULFILLED
 *                       ↘ REJECTED_WITH_REASON
 *                                    ↘ FAILED
 *                                             ↘ REPLACED
 */

'use strict';

// ─── Stati validi ────────────────────────────────────────────────────────────

const VISUAL_STATES = {
  DETECTED:             'DETECTED',
  ACCEPTED:             'ACCEPTED',
  REJECTED_WITH_REASON: 'REJECTED_WITH_REASON',
  SPECIFIED:            'SPECIFIED',
  RENDERED:             'RENDERED',
  INSERTED:             'INSERTED',
  VERIFIED:             'VERIFIED',
  FULFILLED:            'FULFILLED',
  FAILED:               'FAILED',
  REPLACED:             'REPLACED',
};

// Transizioni ammesse (from → [to, ...])
const ALLOWED_TRANSITIONS = {
  [VISUAL_STATES.DETECTED]:             [VISUAL_STATES.ACCEPTED, VISUAL_STATES.REJECTED_WITH_REASON],
  [VISUAL_STATES.ACCEPTED]:             [VISUAL_STATES.SPECIFIED, VISUAL_STATES.REJECTED_WITH_REASON],
  [VISUAL_STATES.SPECIFIED]:            [VISUAL_STATES.RENDERED, VISUAL_STATES.FAILED],
  [VISUAL_STATES.RENDERED]:             [VISUAL_STATES.INSERTED, VISUAL_STATES.FAILED, VISUAL_STATES.REPLACED],
  [VISUAL_STATES.INSERTED]:            [VISUAL_STATES.VERIFIED, VISUAL_STATES.FAILED],
  [VISUAL_STATES.VERIFIED]:            [VISUAL_STATES.FULFILLED, VISUAL_STATES.FAILED, VISUAL_STATES.REPLACED],
  [VISUAL_STATES.FULFILLED]:           [],   // terminale positivo
  [VISUAL_STATES.REJECTED_WITH_REASON]: [], // terminale (rifiuto esplicito)
  [VISUAL_STATES.FAILED]:              [VISUAL_STATES.SPECIFIED, VISUAL_STATES.REPLACED], // repair
  [VISUAL_STATES.REPLACED]:            [VISUAL_STATES.SPECIFIED], // rebuild
};

// Outcome finali ammessi per un visual accepted (nessun altro è legittimo)
const ACCEPTED_OUTCOMES = new Set([
  VISUAL_STATES.FULFILLED,
  VISUAL_STATES.REJECTED_WITH_REASON,
  VISUAL_STATES.REPLACED,
  VISUAL_STATES.FAILED,
]);

// ─── VisualLedger ─────────────────────────────────────────────────────────────

class VisualLedger {
  constructor() {
    /** @type {Map<string, VisualRecord>} */
    this._records = new Map();
    this._createdAt = new Date().toISOString();
  }

  // ─── Creazione ──────────────────────────────────────────────────────────────

  /**
   * Registra un nuovo visual nel ledger.
   * @param {string} visualId  ID univoco del visual (es. "V034")
   * @param {Object} metadata  Metadati iniziali (sourceFile, sourcePage, visualCategory, ecc.)
   * @returns {VisualRecord}
   */
  detect(visualId, metadata = {}) {
    if (this._records.has(visualId)) {
      throw new Error(`[VisualLedger] DUPLICATE_VISUAL_ID: "${visualId}" già registrato.`);
    }

    const record = {
      visualId,
      state: VISUAL_STATES.DETECTED,
      required: metadata.required ?? false,
      sourceFile: metadata.sourceFile ?? null,
      sourcePage: metadata.sourcePage ?? null,
      visualCategory: metadata.visualCategory ?? null,
      pedagogicalRelevance: metadata.pedagogicalRelevance ?? null,
      sectionId: metadata.sectionId ?? null,
      renderer: null,
      artifactPath: null,
      artifactHash: null,
      pdfPage: null,
      rejectionReason: null,
      failureReason: null,
      history: [
        { state: VISUAL_STATES.DETECTED, at: new Date().toISOString(), meta: metadata }
      ],
    };

    this._records.set(visualId, record);
    return record;
  }

  // ─── Transizioni ────────────────────────────────────────────────────────────

  /**
   * Transita un visual a un nuovo stato.
   * @param {string} visualId
   * @param {string} newState   Una delle costanti VISUAL_STATES
   * @param {Object} [meta]     Metadati aggiuntivi da allegare alla transizione
   * @returns {VisualRecord}
   */
  transition(visualId, newState, meta = {}) {
    const record = this._getRecord(visualId);
    const allowed = ALLOWED_TRANSITIONS[record.state] || [];

    if (!allowed.includes(newState)) {
      throw new Error(
        `[VisualLedger] ILLEGAL_TRANSITION: ${visualId} non può passare da ${record.state} a ${newState}. ` +
        `Transizioni ammesse: [${allowed.join(', ')}]`
      );
    }

    // Applica metadati specifici per stato
    if (newState === VISUAL_STATES.REJECTED_WITH_REASON) {
      record.rejectionReason = meta.reason ?? 'UNSPECIFIED';
    }
    if (newState === VISUAL_STATES.FAILED) {
      record.failureReason = meta.reason ?? 'UNSPECIFIED';
    }
    if (newState === VISUAL_STATES.SPECIFIED) {
      record.renderer = meta.renderer ?? record.renderer;
    }
    if (newState === VISUAL_STATES.RENDERED) {
      record.artifactPath = meta.artifactPath ?? null;
      record.artifactHash = meta.artifactHash ?? null;
    }
    if (newState === VISUAL_STATES.INSERTED) {
      record.blockId = meta.blockId ?? null;
    }
    if (newState === VISUAL_STATES.VERIFIED || newState === VISUAL_STATES.FULFILLED) {
      record.pdfPage = meta.pdfPage ?? record.pdfPage;
    }

    record.state = newState;
    record.history.push({
      state: newState,
      at: new Date().toISOString(),
      meta,
    });

    return record;
  }

  // Scorciatoie per le transizioni più comuni
  accept(visualId, meta = {})  { return this.transition(visualId, VISUAL_STATES.ACCEPTED, meta); }
  reject(visualId, reason)     { return this.transition(visualId, VISUAL_STATES.REJECTED_WITH_REASON, { reason }); }
  specify(visualId, renderer)  { return this.transition(visualId, VISUAL_STATES.SPECIFIED, { renderer }); }
  rendered(visualId, artifactPath, artifactHash) {
    return this.transition(visualId, VISUAL_STATES.RENDERED, { artifactPath, artifactHash });
  }
  insert(visualId, blockId)    { return this.transition(visualId, VISUAL_STATES.INSERTED, { blockId }); }
  verify(visualId, pdfPage)    { return this.transition(visualId, VISUAL_STATES.VERIFIED, { pdfPage }); }
  fulfill(visualId, pdfPage)   { return this.transition(visualId, VISUAL_STATES.FULFILLED, { pdfPage }); }
  fail(visualId, reason)       { return this.transition(visualId, VISUAL_STATES.FAILED, { reason }); }
  replace(visualId, reason)    { return this.transition(visualId, VISUAL_STATES.REPLACED, { reason }); }

  // ─── Query ──────────────────────────────────────────────────────────────────

  has(visualId) { return this._records.has(visualId); }

  get(visualId) { return this._getRecord(visualId); }

  getAll() { return Array.from(this._records.values()); }

  getByState(state) {
    return this.getAll().filter(r => r.state === state);
  }

  /** Restituisce tutti i visual "accettati" che non hanno ancora un outcome finale. */
  getSilentlyLost() {
    return this.getAll().filter(r => {
      const isAccepted = r.history.some(h => h.state === VISUAL_STATES.ACCEPTED);
      const hasFinalOutcome = ACCEPTED_OUTCOMES.has(r.state);
      return isAccepted && !hasFinalOutcome;
    });
  }

  // ─── Controllo integrità ─────────────────────────────────────────────────────

  /**
   * Verifica che nessun visual accepted sia andato perso silenziosamente.
   * Lancia errore se trova violazioni.
   * Specifica: 1.md §62 "DETECTED + ACCEPTED + NO OUTCOME = BUG"
   */
  assertNoSilentLoss() {
    const lost = this.getSilentlyLost();
    if (lost.length > 0) {
      const ids = lost.map(r => r.visualId).join(', ');
      throw new Error(
        `[VisualLedger] SILENT_VISUAL_LOSS: ${lost.length} visual accepted senza outcome: [${ids}]. ` +
        `Ogni visual accepted deve avere un outcome esplicito (FULFILLED, REJECTED_WITH_REASON, REPLACED o FAILED).`
      );
    }
  }

  /**
   * Verifica che tutti i visual "required" siano FULFILLED.
   * Usato dalla Compilation Barrier prima dell'export PDF.
   * @returns {{ pass: boolean, missing: string[] }}
   */
  assertRequiredFulfilled() {
    const missing = this.getAll().filter(r => r.required && r.state !== VISUAL_STATES.FULFILLED);
    return {
      pass: missing.length === 0,
      missing: missing.map(r => ({ visualId: r.visualId, state: r.state })),
    };
  }

  // ─── Coverage Report ─────────────────────────────────────────────────────────

  /**
   * Genera un Visual Coverage Report testuale.
   * Specifica: 1.md §5, markdown.md §20.
   * @returns {string}
   */
  generateCoverageReport() {
    const all = this.getAll();
    const total = all.length;
    const detected   = all.length;
    const accepted   = all.filter(r => r.history.some(h => h.state === VISUAL_STATES.ACCEPTED)).length;
    const rejected   = all.filter(r => r.state === VISUAL_STATES.REJECTED_WITH_REASON).length;
    const specified  = all.filter(r => r.history.some(h => h.state === VISUAL_STATES.SPECIFIED)).length;
    const rendered   = all.filter(r => r.history.some(h => h.state === VISUAL_STATES.RENDERED)).length;
    const inserted   = all.filter(r => r.history.some(h => h.state === VISUAL_STATES.INSERTED)).length;
    const fulfilled  = all.filter(r => r.state === VISUAL_STATES.FULFILLED).length;
    const failed     = all.filter(r => r.state === VISUAL_STATES.FAILED).length;
    const replaced   = all.filter(r => r.state === VISUAL_STATES.REPLACED).length;
    const lost       = this.getSilentlyLost().length;

    const coveragePct = accepted > 0
      ? ((fulfilled / accepted) * 100).toFixed(1)
      : '0.0';
    const status = lost > 0 ? 'FAIL — SILENT LOSS' : (failed > 0 ? 'WARN' : 'PASS');

    const line = '─'.repeat(42);
    return [
      '',
      '╔══════════════════════════════════════════╗',
      '║     STUDYGENIUS — VISUAL COVERAGE REPORT ║',
      '╚══════════════════════════════════════════╝',
      line,
      `  Source visuals detected          ${String(detected).padStart(5)}`,
      `  Rejected before acceptance       ${String(rejected).padStart(5)}`,
      `  Accepted visual needs            ${String(accepted).padStart(5)}`,
      line,
      `  Specified (renderer assigned)    ${String(specified).padStart(5)}`,
      `  Rendered (artifact generated)    ${String(rendered).padStart(5)}`,
      `  Inserted into document           ${String(inserted).padStart(5)}`,
      `  Fulfilled (PDF verified)         ${String(fulfilled).padStart(5)}`,
      `  Failed                           ${String(failed).padStart(5)}`,
      `  Replaced                         ${String(replaced).padStart(5)}`,
      `  Silently lost ⚠️                 ${String(lost).padStart(5)}`,
      line,
      `  Coverage                         ${coveragePct.padStart(4)}%`,
      `  Status                           ${status}`,
      line,
      '',
    ].join('\n');
  }

  // ─── Serializzazione ─────────────────────────────────────────────────────────

  toJSON() {
    return {
      createdAt: this._createdAt,
      records: Array.from(this._records.entries()).map(([id, r]) => ({ id, ...r })),
    };
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  _getRecord(visualId) {
    const record = this._records.get(visualId);
    if (!record) {
      throw new Error(`[VisualLedger] UNKNOWN_VISUAL: "${visualId}" non registrato nel ledger.`);
    }
    return record;
  }
}

// ─── Singleton globale ────────────────────────────────────────────────────────
// Ogni job dovrebbe creare una propria istanza. Questo singleton è per
// compatibilità backward con moduli che non hanno accesso al contesto del job.
let _defaultInstance = null;

function getDefaultLedger() {
  if (!_defaultInstance) {
    _defaultInstance = new VisualLedger();
  }
  return _defaultInstance;
}

function resetDefaultLedger() {
  _defaultInstance = new VisualLedger();
  return _defaultInstance;
}

module.exports = {
  VisualLedger,
  VISUAL_STATES,
  ALLOWED_TRANSITIONS,
  getDefaultLedger,
  resetDefaultLedger,
};
