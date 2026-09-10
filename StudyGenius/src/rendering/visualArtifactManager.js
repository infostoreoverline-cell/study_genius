/**
 * StudyGenius Academic Intelligence System
 * src/rendering/visualArtifactManager.js
 *
 * VisualArtifact Manager — Gestione centralizzata degli artefatti visuali indipendenti.
 *
 * Ogni figura pianificata nella Coverage Matrix diventa un VisualArtifact con:
 * - artifactId univoco
 * - specHash (hash della VisualSpec → cache key)
 * - status: PLANNED → RENDERING → READY | FAILED | REPAIRED | CACHED
 * - svgResult: SVG prodotto inline
 * - qualityLayers: risultati per ogni strato di qualità
 *
 * Principio: un errore nel capitolo NON invalida artefatti già resi e cachati.
 * Il repair è chirurgico: solo l'artefatto fallito viene rigenerato.
 */

'use strict';

const crypto = require('crypto');

class VisualArtifactManager {
  constructor() {
    /** @type {Map<string, Object>} artifactId → VisualArtifact */
    this._artifacts = new Map();

    /** @type {Map<string, string>} specHash → artifactId (cache deduplica) */
    this._hashIndex = new Map();

    /** @type {Map<string, Set<string>>} chapterId → Set<artifactId> */
    this._chapterIndex = new Map();
  }

  // ==========================================================================
  // CREAZIONE E ACCESSO
  // ==========================================================================

  /**
   * Registra un artefatto pianificato. Se un artefatto con lo stesso specHash
   * esiste già (READY o CACHED), restituisce quello esistente senza creare duplicati.
   *
   * @param {string} coverageItemId ID dalla Coverage Matrix
   * @param {string} chapterId ID del capitolo corrente
   * @param {string} specHash Hash della VisualSpec (da hashVisualSpec)
   * @param {Object} [specJson] La VisualSpec JSON originale
   * @returns {Object} VisualArtifact (nuovo o esistente dalla cache)
   */
  registerPlanned(coverageItemId, chapterId, specHash, specJson = null) {
    // Cache hit per hash identico
    const existingId = this._hashIndex.get(specHash);
    if (existingId) {
      const existing = this._artifacts.get(existingId);
      if (existing && (existing.status === 'READY' || existing.status === 'CACHED')) {
        // Aggiorna l'indice capitolo senza creare un nuovo artefatto
        this._indexChapter(chapterId, existingId);
        return { ...existing, _cacheHit: true };
      }
    }

    const artifactId = `va_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const artifact = {
      artifactId,
      specHash,
      renderHash: null,
      chapterId,
      conceptId: null,
      coverageItemId,
      status: 'PLANNED',
      specJson,
      svgResult: null,
      fallbackUsed: false,
      fallbackReason: null,
      qualityLayers: {},
      renderedAt: null,
      repairAttempts: 0
    };

    this._artifacts.set(artifactId, artifact);
    this._hashIndex.set(specHash, artifactId);
    this._indexChapter(chapterId, artifactId);

    return artifact;
  }

  /**
   * Ottieni un artefatto per ID.
   * @param {string} artifactId
   * @returns {Object|null}
   */
  get(artifactId) {
    return this._artifacts.get(artifactId) || null;
  }

  /**
   * Ottieni tutti gli artefatti di un capitolo.
   * @param {string} chapterId
   * @returns {Object[]}
   */
  getArtifactsForChapter(chapterId) {
    const ids = this._chapterIndex.get(chapterId) || new Set();
    return Array.from(ids).map(id => this._artifacts.get(id)).filter(Boolean);
  }

  /**
   * Ottieni tutti gli artefatti di una Coverage Matrix item.
   * @param {string} coverageItemId
   * @returns {Object[]}
   */
  getArtifactsForCoverageItem(coverageItemId) {
    return Array.from(this._artifacts.values()).filter(a => a.coverageItemId === coverageItemId);
  }

  // ==========================================================================
  // AGGIORNAMENTO STATUS
  // ==========================================================================

  /**
   * Marca il rendering come in corso.
   * @param {string} artifactId
   */
  markRendering(artifactId) {
    const a = this._artifacts.get(artifactId);
    if (a) {
      a.status = 'RENDERING';
      this._artifacts.set(artifactId, a);
    }
  }

  /**
   * Marca il rendering come completato con successo.
   * @param {string} artifactId
   * @param {string} svgResult SVG prodotto
   * @param {Object} [qualityLayers] Risultati quality gates
   * @param {boolean} [fallbackUsed]
   * @param {string} [fallbackReason]
   */
  markReady(artifactId, svgResult, qualityLayers = {}, fallbackUsed = false, fallbackReason = null) {
    const a = this._artifacts.get(artifactId);
    if (!a) return;

    a.svgResult = svgResult;
    a.renderHash = svgResult
      ? crypto.createHash('sha256').update(svgResult).digest('hex').slice(0, 12)
      : null;
    a.qualityLayers = qualityLayers;
    a.fallbackUsed = fallbackUsed;
    a.fallbackReason = fallbackReason;
    a.status = 'READY';
    a.renderedAt = new Date().toISOString();
    this._artifacts.set(artifactId, a);
  }

  /**
   * Marca il rendering come fallito.
   * @param {string} artifactId
   * @param {string} reason Descrizione del fallimento
   * @param {boolean} canRepair Se true, il repair è possibile (non è un hard fail definitivo)
   */
  markFailed(artifactId, reason, canRepair = true) {
    const a = this._artifacts.get(artifactId);
    if (!a) return;
    a.status = 'FAILED';
    a.fallbackReason = reason;
    a._canRepair = canRepair;
    this._artifacts.set(artifactId, a);
  }

  /**
   * Incrementa il contatore di repair e aggiorna status.
   * @param {string} artifactId
   * @param {string} newSvg SVG riparato
   */
  markRepaired(artifactId, newSvg) {
    const a = this._artifacts.get(artifactId);
    if (!a) return;
    a.status = 'REPAIRED';
    a.svgResult = newSvg;
    a.repairAttempts += 1;
    a.renderedAt = new Date().toISOString();
    this._artifacts.set(artifactId, a);
  }

  // ==========================================================================
  // STATISTICHE
  // ==========================================================================

  /**
   * Restituisce statistiche aggregate sullo stato degli artefatti.
   * @returns {Object} { total, planned, rendering, ready, failed, repaired, cached, cacheHitRate }
   */
  getStats() {
    const all = Array.from(this._artifacts.values());
    const byStatus = {};
    for (const a of all) {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    }
    const ready = (byStatus.READY || 0) + (byStatus.CACHED || 0) + (byStatus.REPAIRED || 0);
    return {
      total: all.length,
      ...byStatus,
      readyTotal: ready,
      failedTotal: byStatus.FAILED || 0,
      successRate: all.length > 0 ? Math.round((ready / all.length) * 100) : 0
    };
  }

  /**
   * Elenca gli artefatti falliti riparabili.
   * @returns {Object[]}
   */
  getRepairableFailures() {
    return Array.from(this._artifacts.values()).filter(a => a.status === 'FAILED' && a._canRepair !== false);
  }

  // ==========================================================================
  // CHECKPOINT — Serializzazione persistente di sessione
  // ==========================================================================

  /**
   * Serializza lo stato attuale per checkpoint di sessione.
   * @returns {Object}
   */
  serializeForCheckpoint() {
    return {
      _v: '1.0.0',
      _ts: new Date().toISOString(),
      artifacts: Object.fromEntries(this._artifacts),
      hashIndex: Object.fromEntries(this._hashIndex),
      chapterIndex: Object.fromEntries(
        Array.from(this._chapterIndex.entries()).map(([k, v]) => [k, Array.from(v)])
      )
    };
  }

  /**
   * Ripristina lo stato da checkpoint.
   * @param {Object} data Output di serializeForCheckpoint
   */
  restoreFromCheckpoint(data) {
    if (!data || data._v !== '1.0.0') return;
    this._artifacts = new Map(Object.entries(data.artifacts || {}));
    this._hashIndex = new Map(Object.entries(data.hashIndex || {}));
    this._chapterIndex = new Map(
      Object.entries(data.chapterIndex || {}).map(([k, v]) => [k, new Set(v)])
    );
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  _indexChapter(chapterId, artifactId) {
    if (!this._chapterIndex.has(chapterId)) {
      this._chapterIndex.set(chapterId, new Set());
    }
    this._chapterIndex.get(chapterId).add(artifactId);
  }
}

module.exports = { VisualArtifactManager };
