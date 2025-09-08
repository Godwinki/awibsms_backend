const express = require('express');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');
const activityController = require('../controllers/activityController');

const router = express.Router();

// All activity routes require authentication
router.use(protect);

// Get activity logs - admin, super_admin, and it roles only
router.get('/', restrictTo('admin', 'super_admin', 'it'), activityController.getActivityLogs);

// Create activity log - authenticated users
router.post('/', activityController.createActivityLog);

module.exports = router;
