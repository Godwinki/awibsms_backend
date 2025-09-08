const express = require('express');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');
const sessionsController = require('../controllers/sessionsController');

const router = express.Router();

// All session routes require authentication and admin privileges
router.use(protect, restrictTo('admin', 'super_admin', 'it'));

// Get active sessions
router.get('/active', sessionsController.getActiveSessions);

// Get session statistics
router.get('/stats', sessionsController.getSessionStats);

// Debug endpoint to check raw session data
router.get('/debug', sessionsController.debugSessions);

// Get inactive users
router.get('/inactive-users', sessionsController.getInactiveUsers);

// Terminate specific session
router.delete('/:sessionId', sessionsController.terminateSession);

// Terminate all sessions for a user
router.delete('/user/:userId/terminate-all', sessionsController.terminateUserSessions);

module.exports = router;
