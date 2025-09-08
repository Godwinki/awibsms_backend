/**
 * Contact Category Routes
 * Routes for managing contact categories and member categorization
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');

// Apply authentication to all routes
router.use(protect);

// Create new contact category
router.post('/',
  categoryController.createCategory
);

// Get all categories with pagination and search
router.get('/',
  categoryController.getCategories
);

// Get single category by ID
router.get('/:id',
  categoryController.getCategoryById
);

// Update category
router.put('/:id',
  categoryController.updateCategory
);

// Add members to category
router.post('/:id/members',
  categoryController.addMembersToCategory
);

// Remove member from category
router.delete('/:id/members/:memberId',
  categoryController.removeMemberFromCategory
);

// Delete category
router.delete('/:id',
  categoryController.deleteCategory
);

module.exports = router;
