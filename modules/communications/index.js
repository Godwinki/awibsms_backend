// Communications module index
const express = require('express');
const router = express.Router();

// Import routes
const smsRoutes = require('./routes/smsRoutes');
const groupRoutes = require('./routes/groupRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const balanceRoutes = require('./routes/balanceRoutes');

// Mount routes
router.use('/sms', smsRoutes);
router.use('/groups', groupRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/balance', balanceRoutes);

module.exports = router;
