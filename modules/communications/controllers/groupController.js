/**
 * Contact Group Controller
 * Handles creating and managing contact groups for SMS campaigns
 */

const { ContactGroup, GroupMember, Member, User } = require('../../../models');
const { Op } = require('sequelize');

const groupController = {
  // Create new contact group
  async createGroup(req, res) {
    try {
      const { name, description, color = '#3B82F6' } = req.body;
      const userId = req.user.id;
      const branchId = req.user.branchId;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Group name is required'
        });
      }

      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: 'User branch information is required'
        });
      }

      // Check if group name already exists within the same branch
      const existingGroup = await ContactGroup.findOne({ 
        where: { 
          name,
          branchId 
        } 
      });
      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: 'Group name already exists in this branch'
        });
      }

      const group = await ContactGroup.create({
        name,
        description,
        color,
        branchId,
        createdById: userId
      });

      res.status(201).json({
        success: true,
        message: 'Contact group created successfully',
        data: group
      });

    } catch (error) {
      console.error('❌ Create group error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create contact group',
        error: error.message
      });
    }
  },

  // Get all contact groups
  async getGroups(req, res) {
    try {
      const { page = 1, limit = 20, search, isActive } = req.query;
      const offset = (page - 1) * limit;
      const branchId = req.user.branchId;

      const whereClause = { branchId }; // Filter by user's branch
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      const { rows: groups, count } = await ContactGroup.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'createdBy',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: {
          groups,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Get groups error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve contact groups',
        error: error.message
      });
    }
  },

  // Get group details with members
  async getGroupDetails(req, res) {
    try {
      const { id } = req.params;
      const branchId = req.user.branchId;

      const group = await ContactGroup.findOne({
        where: { id, branchId }, // Ensure user can only access groups from their branch
        include: [
          {
            model: User,
            as: 'createdBy',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: GroupMember,
            as: 'groupMembers',
            where: { isActive: true },
            required: false,
            include: [
              {
                model: Member,
                as: 'member',
                attributes: ['id', 'firstName', 'lastName', 'memberNumber', 'phoneNumber', 'email']
              },
              {
                model: User,
                as: 'memberAdder',
                attributes: ['id', 'firstName', 'lastName']
              }
            ]
          }
        ]
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Contact group not found'
        });
      }

      res.json({
        success: true,
        data: group
      });

    } catch (error) {
      console.error('❌ Get group details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve group details',
        error: error.message
      });
    }
  },

  // Update contact group
  async updateGroup(req, res) {
    try {
      const { id } = req.params;
      const { name, description, color, isActive } = req.body;
      const branchId = req.user.branchId;

      const group = await ContactGroup.findOne({
        where: { id, branchId } // Ensure user can only update groups from their branch
      });
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Contact group not found'
        });
      }

      // Check if new name conflicts with existing group in the same branch
      if (name && name !== group.name) {
        const existingGroup = await ContactGroup.findOne({ 
          where: { 
            name,
            branchId,
            id: { [Op.ne]: id }
          } 
        });
        if (existingGroup) {
          return res.status(400).json({
            success: false,
            message: 'Group name already exists in this branch'
          });
        }
      }

      await group.update({
        name: name || group.name,
        description: description !== undefined ? description : group.description,
        color: color || group.color,
        isActive: isActive !== undefined ? isActive : group.isActive
      });

      res.json({
        success: true,
        message: 'Contact group updated successfully',
        data: group
      });

    } catch (error) {
      console.error('❌ Update group error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update contact group',
        error: error.message
      });
    }
  },

  // Add members to group
  async addMembersToGroup(req, res) {
    try {
      const { id } = req.params;
      const { memberIds } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Member IDs array is required'
        });
      }

      // Convert all memberIds to integers to ensure type consistency
      const parsedMemberIds = memberIds.map(id => parseInt(id, 10));
      const branchId = req.user.branchId;
      
      const group = await ContactGroup.findOne({
        where: { id, branchId } // Ensure user can only add members to groups from their branch
      });
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Contact group not found'
        });
      }

      // Check if members exist and belong to the same branch
      const members = await Member.findAll({
        where: { 
          id: { [Op.in]: parsedMemberIds },
          branchId // Ensure members belong to the same branch
        }
      });

      if (members.length !== parsedMemberIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some members not found'
        });
      }

      // Add members to group (avoid duplicates)
      const groupMembers = [];
      for (const memberId of parsedMemberIds) {
        const [groupMember, created] = await GroupMember.findOrCreate({
          where: { groupId: id, memberId: memberId },
          defaults: {
            addedById: userId,
            isActive: true
          }
        });

        if (!created && !groupMember.isActive) {
          // Reactivate if was previously removed
          await groupMember.update({ isActive: true, addedById: userId });
        }

        groupMembers.push(groupMember);
      }

      // Update group member count
      const activeCount = await GroupMember.count({
        where: { groupId: id, isActive: true }
      });
      await group.update({ memberCount: activeCount });

      res.json({
        success: true,
        message: `${memberIds.length} members added to group successfully`,
        data: {
          groupId: id,
          addedMembers: groupMembers.length,
          totalMembers: activeCount
        }
      });

    } catch (error) {
      console.error('❌ Add members to group error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add members to group',
        error: error.message
      });
    }
  },

  // Remove member from group
  async removeMemberFromGroup(req, res) {
    try {
      const { id, memberId } = req.params;
      const branchId = req.user.branchId;

      // Ensure the group belongs to the user's branch
      const group = await ContactGroup.findOne({
        where: { id, branchId }
      });
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Contact group not found'
        });
      }

      const groupMember = await GroupMember.findOne({
        where: { groupId: id, memberId, isActive: true }
      });

      if (!groupMember) {
        return res.status(404).json({
          success: false,
          message: 'Member not found in group'
        });
      }

      await groupMember.update({ isActive: false });

      // Update group member count
      const activeCount = await GroupMember.count({
        where: { groupId: id, isActive: true }
      });
      await ContactGroup.update(
        { memberCount: activeCount },
        { where: { id } }
      );

      res.json({
        success: true,
        message: 'Member removed from group successfully'
      });

    } catch (error) {
      console.error('❌ Remove member from group error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove member from group',
        error: error.message
      });
    }
  },

  // Delete contact group
  async deleteGroup(req, res) {
    try {
      const { id } = req.params;
      const { hardDelete = false } = req.query; // Option for hard delete
      const branchId = req.user.branchId;

      const group = await ContactGroup.findOne({
        where: { id, branchId } // Ensure user can only delete groups from their branch
      });
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Contact group not found'
        });
      }

      // Check if group has active campaigns
      const { SmsCampaign } = require('../../../models');
      const activeCampaigns = await SmsCampaign.count({
        where: {
          groupId: id,
          status: { [Op.in]: ['draft', 'scheduled', 'sending'] }
        }
      });

      if (activeCampaigns > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete group with active campaigns'
        });
      }

      if (hardDelete === 'true') {
        // Hard delete - remove group and its members completely
        const { GroupMember } = require('../models');
        
        // Delete all group members first
        await GroupMember.destroy({
          where: { groupId: id }
        });
        
        // Delete the group
        await group.destroy();
        
        res.json({
          success: true,
          message: 'Contact group permanently deleted'
        });
      } else {
        // Soft delete by marking as inactive
        await group.update({ isActive: false });

        res.json({
          success: true,
          message: 'Contact group deleted successfully'
        });
      }

    } catch (error) {
      console.error('❌ Delete group error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete contact group',
        error: error.message
      });
    }
  }
};

module.exports = groupController;
