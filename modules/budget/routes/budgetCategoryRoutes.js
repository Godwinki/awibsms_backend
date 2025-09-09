const express = require('express');
const router = express.Router();
const budgetCategoryController = require('../controllers/budgetCategoryController');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');
const { readOnlyLimiter } = require('../../../core/middleware/rateLimiter');

// Apply read-only rate limiter to GET endpoints
router.get('/', readOnlyLimiter, budgetCategoryController.getBudgetCategories);

// Apply authentication for write operations
router.use(protect);

router
  .route('/')
  .post(restrictTo('super_admin', 'admin', 'manager'), budgetCategoryController.createBudgetCategory);

router
  .route('/:id')
  .patch(restrictTo('super_admin', 'admin', 'manager'), budgetCategoryController.updateBudgetCategory)
  .delete(restrictTo('super_admin', 'admin'), budgetCategoryController.deleteBudgetCategory);

// Add the route for allocating budget to a category
router
  .route('/:id/allocate')
  .post(restrictTo('super_admin', 'admin', 'manager'), budgetCategoryController.allocateBudgetToCategory);

module.exports = router; 
