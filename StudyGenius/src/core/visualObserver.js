/**
 * StudyGenius Academic Intelligence System
 * src/core/visualObserver.js
 *
 * Visual Observer — Logger strutturato per eventi del ciclo di vita visual.
 *
 * Produce log in formato:
 *   [V034] DETECTED       source: p42
 *   [V034] ACCEPTED       reason: HIGH_PEDAGOGICAL_VALUE
 *   [V034] RENDERED       artifact: V034_final.svg (12.4KB)
 *   [V034] FINAL          PDF PAGE 83
 *
 * Specifica: 1.md §29 (Osservabilità), 1.md §30 (Visual Debug Mode).
 */

'use strict';

const EVENT_ICONS = {
  DETECTED:             '🔍',
  ACCEPTED:             '✅',
  REJECTED_WITH_REASON: '🚫',
  SPECIFIED:            '📋',
  RENDERED:             '🎨',
  QA_PASS:              '✔️ ',
  QA_FAIL:              '❌',
  INSERTED:             '📌',
  VERIFIED:             '📄',
  FULFILLED:            '🏁',
  FAILED:               '💥',
  REPLACED:             '🔄',
  WARN:                 '⚠️ ',
  INFO:                 'ℹ️ ',
  COVERAGE:             '📊',
};

class VisualObserver {
  constructor() {
    this._events = [];
    this._verbose = process.env.VISUAL_DEBUG === '1';
  }

  /**
   * Logga un evento nel ciclo di vita di un visual.
   * @param {string} visualId   ID visual (es. "V034")
   * @param {string} eventType  Tipo evento (una chiave di EVENT_ICONS o stringa libera)
   * @param {string} [detail]   Dettaglio aggiuntivo
   */
  log(visualId, eventType, detail = '') {
    const icon  = EVENT_ICONS[eventType] ?? '▸';
    const tag   = visualId ? `[${visualId}]` : '[VISUAL]';
    const label = eventType.padEnd(22);
    const line  = `${icon} ${tag} ${label} ${detail}`.trimEnd();

    this._events.push({ at: new Date().toISOString(), visualId, eventType, detail, line });
    console.log(`  ${line}`);
  }

  // ─── Scorciatoie per eventi comuni ────────────────────────────────────────

  detected(visualId, sourcePage, category) {
    this.log(visualId, 'DETECTED',
      `page: ${sourcePage ?? '?'} | category: ${category ?? '?'}`);
  }

  accepted(visualId, reason) {
    this.log(visualId, 'ACCEPTED', reason ? `reason: ${reason}` : '');
  }

  rejected(visualId, reason) {
    this.log(visualId, 'REJECTED_WITH_REASON', `reason: ${reason}`);
  }

  specified(visualId, renderer) {
    this.log(visualId, 'SPECIFIED', `renderer: ${renderer}`);
  }

  rendered(visualId, artifactPath, sizeBytes) {
    const sizeKB = sizeBytes ? ` (${(sizeBytes / 1024).toFixed(1)}KB)` : '';
    const filename = artifactPath ? require('path').basename(artifactPath) : '?';
    this.log(visualId, 'RENDERED', `artifact: ${filename}${sizeKB}`);
  }

  qaPass(visualId, checks) {
    this.log(visualId, 'QA_PASS', checks ? checks.join(' + ') : '');
  }

  qaFail(visualId, reason) {
    this.log(visualId, 'QA_FAIL', `reason: ${reason}`);
  }

  inserted(visualId, blockId) {
    this.log(visualId, 'INSERTED', blockId ? `block: ${blockId}` : '');
  }

  verified(visualId, pdfPage) {
    this.log(visualId, 'VERIFIED', pdfPage ? `PDF PAGE ${pdfPage}` : '');
  }

  fulfilled(visualId, pdfPage) {
    this.log(visualId, 'FULFILLED', pdfPage ? `PDF PAGE ${pdfPage}` : '');
  }

  failed(visualId, reason) {
    this.log(visualId, 'FAILED', `reason: ${reason}`);
  }

  replaced(visualId, reason) {
    this.log(visualId, 'REPLACED', `reason: ${reason}`);
  }

  warn(visualId, message) {
    this.log(visualId, 'WARN', message);
  }

  info(message) {
    this.log('', 'INFO', message);
  }

  coverageReport(reportText) {
    console.log(reportText);
  }

  // ─── Debug ────────────────────────────────────────────────────────────────

  /** Restituisce tutti gli eventi registrati (per test o export). */
  getEvents() { return [...this._events]; }

  /** Restituisce solo gli eventi relativi a un visual specifico. */
  getEventsFor(visualId) {
    return this._events.filter(e => e.visualId === visualId);
  }

  reset() { this._events = []; }
}

// Singleton globale (un osservatore per processo)
const _observer = new VisualObserver();

module.exports = {
  VisualObserver,
  visualObserver: _observer,
};
