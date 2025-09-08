// memberUploadRoutes.js
const express = require('express');
const router = express.Router();
const memberUploadController = require('../controllers/memberUploadController');
const { protect } = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../auth/middleware/permissionMiddleware');

// Generate and download Excel template
router.get('/template', 
  protect, 
  requirePermission('members.uploads.upload'),
  memberUploadController.generateTemplate
);

// Upload Excel file with member data
router.post('/upload', 
  protect, 
  requirePermission('members.uploads.upload'),
  memberUploadController.uploadMembers
);

module.exports = router;
