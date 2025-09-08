/**
 * SMS Campaign Routes
 * Routes for managing bulk SMS campaigns
 */

const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../auth/middleware/permissionMiddleware');

// Create new SMS campaign
router.post('/', 
  protect, 
  requirePermission('communications.campaigns.create'), 
  campaignController.createCampaign
);

// Get all campaigns
router.get('/', 
  protect, 
  requirePermission('communications.campaigns.send'), 
  campaignController.getCampaigns
);

// Get campaign details
router.get('/:id', 
  protect, 
  requirePermission('communications.campaigns.send'), 
  campaignController.getCampaignDetails
);

// Update campaign (draft only)
router.put('/:id', 
  protect, 
  requirePermission('communications.campaigns.create'), 
  campaignController.updateCampaign
);

// Approve campaign
router.post('/:id/approve', 
  protect, 
  requirePermission('communications.campaigns.send'), 
  campaignController.approveCampaign
);

// Send campaign immediately
router.post('/:id/send', 
  protect, 
  requirePermission('communications.campaigns.send'), 
  campaignController.sendCampaign
);

// Cancel campaign
router.post('/:id/cancel', 
  protect, 
  requirePermission('communications.campaigns.send'), 
  campaignController.cancelCampaign
);

module.exports = router;
