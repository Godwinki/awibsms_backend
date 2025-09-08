const express = require('express');
const settingRoutes = require('./settingRoutes');
const activityRoutes = require('./activityRoutes');
const roleRoutes = require('./roleRoutes');
const permissionRoutes = require('./permissionRoutes');
const shortcutRoutes = require('./shortcutRoutes');
const sessionsRoutes = require('./sessionsRoutes');
const smsRoutes = require('./smsRoutes');

const router = express.Router();

// Mount sub-routes
router.use('/settings', settingRoutes);
router.use('/activities', activityRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/shortcuts', shortcutRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/sms', smsRoutes);

module.exports = router;

module.exports = router;
