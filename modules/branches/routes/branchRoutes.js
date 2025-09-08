// routes/branchRoutes.js
const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { protect } = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../auth/middleware/permissionMiddleware');
const { createValidationMiddleware, createFieldValidator } = require('../validations/validationMiddleware');
const { 
  validateBranch, 
  validateBranchUpdate, 
  validateBranchCode,
  validatePhone,
  validateEmail 
} = require('../validations/branchValidation');

// Get all branches
router.get('/',
  protect,
  requirePermission('branches.view'),
  branchController.getAllBranches
);

// Get branch by ID
router.get('/:id',
  protect,
  requirePermission('branches.view'),
  branchController.getBranchById
);

// Create new branch
router.post('/',
  protect,
  requirePermission('branches.create'),
  createValidationMiddleware(validateBranch),
  branchController.createBranch
);

// Update branch
router.put('/:id',
  protect,
  requirePermission('branches.update'),
  createValidationMiddleware(validateBranchUpdate),
  branchController.updateBranch
);

// Update branch (PATCH method for partial updates)
router.patch('/:id',
  protect,
  requirePermission('branches.update'),
  createValidationMiddleware(validateBranchUpdate),
  branchController.updateBranch
);

// Delete/deactivate branch
router.delete('/:id',
  protect,
  requirePermission('branches.delete'),
  branchController.deleteBranch
);

// Update branch status
router.patch('/:id/status',
  protect,
  requirePermission('branches.update'),
  branchController.updateBranchStatus
);

// Get branch statistics  
router.get('/:id/stats',
  protect,
  requirePermission('branches.view'),
  branchController.getBranchStatistics
);

// Check branch code availability
router.get('/check-code/:branchCode',
  protect,
  requirePermission('branches.view'),
  branchController.checkBranchCodeAvailability
);

// Generate account number for branch
router.post('/:id/generate-account-number',
  protect,
  requirePermission('branches.manage_accounts'),
  branchController.generateAccountNumber
);

// Get branches by region
router.get('/region/:region',
  protect,
  requirePermission('branches.view'),
  branchController.getBranchesByRegion
);

// Get branch statistics
router.get('/:id/statistics',
  protect,
  requirePermission('branches.view'),
  branchController.getBranchStatistics
);

// Validation endpoints for real-time frontend validation
router.post('/validate/branch-code',
  protect,
  createValidationMiddleware(validateBranchCode),
  branchController.validateBranchCode
);

router.post('/validate/phone',
  protect,
  createFieldValidator(validatePhone),
  (req, res) => res.json({ success: true, message: 'Phone number is valid' })
);

router.post('/validate/email',
  protect,
  createFieldValidator(validateEmail),
  (req, res) => res.json({ success: true, message: 'Email is valid' })
);

module.exports = router;
