const express = require('express');
const { authLimiter } = require('../../../core/middleware/rateLimiter');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();

// All user management routes require authentication and admin privileges
router.use(protect);
router.use(restrictTo('admin', 'super_admin'));

// Admin only routes - Special routes first
router.get('/locked', userController.getLockedAccounts);

// Admin only routes - ID parameter routes last
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUser);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.post('/:id/unlock', userController.unlockAccount);

module.exports = router; 
