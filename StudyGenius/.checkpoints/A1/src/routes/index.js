const express = require('express');
const router = express.Router();

const configRoutes = require('./configRoutes');
const extractRoutes = require('./extractRoutes');
const generationRoutes = require('./generationRoutes');
const sessionRoutes = require('./sessionRoutes');
const exportRoutes = require('./exportRoutes');

// Montaggio sotto-router API
router.use('/', configRoutes);
router.use('/', extractRoutes);
router.use('/', generationRoutes);
router.use('/', sessionRoutes);
router.use('/', exportRoutes);

module.exports = router;
