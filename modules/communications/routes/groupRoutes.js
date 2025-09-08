/**
 * Contact Group Routes
 * Routes for managing contact groups
 */

const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../auth/middleware/permissionMiddleware');

// Create new contact group
router.post('/', 
  protect, 
  requirePermission('communications.groups.manage'), 
  groupController.createGroup
);

// Get all contact groups
router.get('/', 
  protect, 
  requirePermission('communications.groups.manage'), 
  groupController.getGroups
);

// Get group details with members
router.get('/:id', 
  protect, 
  requirePermission('communications.groups.manage'), 
  groupController.getGroupDetails
);

// Update contact group
router.put('/:id', 
  protect, 
  requirePermission('communications.groups.manage'), 
  groupController.updateGroup
);

// Add members to group
router.post('/:id/members', 
  protect, 
  requirePermission('communications.groups.manage'), 
  groupController.addMembersToGroup
);

// Remove member from group
router.delete('/:id/members/:memberId', 
  protect, 
  requirePermission('communications.groups.manage'), 
  groupController.removeMemberFromGroup
);

// Delete contact group
router.delete('/:id', 
  protect, 
  requirePermission('communications.groups.manage'), 
  groupController.deleteGroup
);

module.exports = router;
