/**
 * StudyGenius Academic Intelligence System
 * src/visualization/index.js
 * 
 * Visualization Engine deterministico (Milestone V1).
 */

const { validateGraphSpec, ALLOWED_PROVENANCES_MVP, ALLOWED_CHART_TYPES_MVP } = require('./graphSpec');
const { buildDataset, evaluateScalar, inferVariableName } = require('./dataBuilder');
const { validateGraphData, checkClaimConsistency } = require('./graphValidator');
const {
  renderGraphToHtml,
  getGraphHeadAssets,
  renderGraphToStaticSvg,
  ACADEMIC_GRAPH_CSS
} = require('./graphRenderer');
const { replaceGraphPlaceholders } = require('../rendering/diagramEngine');

module.exports = {
  validateGraphSpec,
  ALLOWED_PROVENANCES_MVP,
  ALLOWED_CHART_TYPES_MVP,
  buildDataset,
  evaluateScalar,
  inferVariableName,
  validateGraphData,
  checkClaimConsistency,
  renderGraphToHtml,
  getGraphHeadAssets,
  renderGraphToStaticSvg,
  ACADEMIC_GRAPH_CSS,
  replaceGraphPlaceholders
};
