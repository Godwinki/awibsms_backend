/**
 * System Routes Index
 */

const systemMainRoutes = require('./systemMainRoutes');
const onboardingRoutes = require('./onboardingRoutes');

// Combine all system routes
const express = require('express');
const router = express.Router();

// Mount system routes
router.use('/', systemMainRoutes);
router.use('/onboarding', onboardingRoutes);

module.exports = router;
