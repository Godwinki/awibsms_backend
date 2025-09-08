/**
 * Shortcut Routes - Quick Actions System
 */

const express = require('express');
const router = express.Router();
const shortcutController = require('../controllers/shortcutController');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Public shortcut routes (all authenticated users)
router.get('/', shortcutController.getShortcuts);
router.post('/execute/:code', shortcutController.executeShortcut);
router.post('/:id/favorite', shortcutController.toggleFavorite);
router.post('/:id/custom-code', shortcutController.setCustomCode);

// Admin-only routes
router.use(restrictTo('admin', 'super_admin'));
router.post('/', shortcutController.createShortcut);
router.put('/:id', shortcutController.updateShortcut);
router.delete('/:id', shortcutController.deleteShortcut);

module.exports = router;
