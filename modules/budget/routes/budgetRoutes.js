const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');

router.use(protect);

// Get all budgets
router.get('/', restrictTo('super_admin', 'admin', 'manager'), budgetController.getBudgets);

// Create new budget
router.post('/', restrictTo('super_admin', 'admin'), budgetController.createBudget);

// Get specific budget
router.get('/:id', restrictTo('super_admin', 'admin', 'manager'), budgetController.getBudget);

// Update budget
router.patch('/:id', restrictTo('super_admin', 'admin'), budgetController.updateBudget);

// Delete budget
router.delete('/:id', restrictTo('super_admin', 'admin'), budgetController.deleteBudget);

module.exports = router; 
