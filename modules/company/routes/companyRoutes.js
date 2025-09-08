// routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { protect } = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../auth/middleware/permissionMiddleware');
const { createValidationMiddleware } = require('../validations/validationMiddleware');
const { validateCompanySettings, validateCompanySettingsUpdate } = require('../validations/companyValidation');

// Initialize company settings (one-time setup)
router.post('/initialize',
  protect,
  requirePermission('system.settings.manage'),
  createValidationMiddleware(validateCompanySettings),
  companyController.initializeCompanySettings
);

// Get company settings
router.get('/settings',
  protect,
  requirePermission('system.settings.view'),
  companyController.getCompanySettings
);

// Update company settings
router.put('/settings',
  protect,
  requirePermission('system.settings.manage'),
  createValidationMiddleware(validateCompanySettingsUpdate),
  companyController.updateCompanySettings
);

// Upload company logo
router.post('/logo',
  protect,
  requirePermission('system.settings.manage'),
  companyController.uploadLogo
);

// Business rules management
router.get('/business-rules',
  protect,
  requirePermission('system.settings.view'),
  companyController.getBusinessRules
);

router.put('/business-rules',
  protect,
  requirePermission('system.settings.manage'),
  companyController.updateBusinessRules
);

// Get company statistics
router.get('/stats',
  protect,
  requirePermission('system.settings.view'),
  companyController.getCompanyStats
);

// Get company dashboard data
router.get('/dashboard',
  protect,
  requirePermission('system.settings.view'),
  companyController.getCompanyDashboard
);

// Remove company logo
router.delete('/logo',
  protect,
  requirePermission('system.settings.manage'),
  companyController.removeLogo
);

// Validate company code
router.post('/validate-code',
  protect,
  requirePermission('system.settings.manage'),
  companyController.validateCompanyCode
);

// Get company history
router.get('/history',
  protect,
  requirePermission('system.settings.view'),
  companyController.getCompanyHistory
);

module.exports = router;
