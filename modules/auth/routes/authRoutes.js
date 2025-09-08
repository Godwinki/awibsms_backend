/**
 * Auth Module Main Routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authLimiter } = require('../../../core/middleware/rateLimiter');
const { protect } = require('../middleware/authMiddleware');

// Public auth routes (directly at /api/v1/auth/)
router.post('/login', authLimiter, userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password/:token', userController.resetPassword);

// Admin-only registration route (for creating users)
const { restrictTo } = require('../middleware/authMiddleware');
router.post('/register', protect, restrictTo('admin', 'super_admin'), userController.register);

// Protected auth routes
router.use(protect); // All routes after this middleware require authentication
router.post('/logout', authLimiter, userController.logout);
router.post('/change-password', userController.changePassword);
router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);

// Import and mount user management routes (for admin operations)
const userRoutes = require('./userRoutes');
router.use('/users', userRoutes);

module.exports = router;
