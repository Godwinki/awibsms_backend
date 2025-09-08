/**
 * SMS Campaign Controller
 * Handles bulk SMS campaigns to contact groups or member lists
 */

const { SmsCampaign, ContactGroup, GroupMember, Member, User, SmsMessage } = require('../../../models');
const communicationService = require('../services/CommunicationService');
const { Op } = require('sequelize');

const campaignController = {
  // Create new SMS campaign
  async createCampaign(req, res) {
    try {
      const { name, message, targetType, groupId, scheduledAt, notes } = req.body;
      const userId = req.user.id;

      if (!name || !message || !targetType) {
        return res.status(400).json({
          success: false,
          message: 'Name, message, and target type are required'
        });
      }

      // Validate target type
      const validTargetTypes = ['all_members', 'specific_group', 'custom_list'];
      if (!validTargetTypes.includes(targetType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid target type'
        });
      }

      // If specific group, validate group exists
      if (targetType === 'specific_group') {
        if (!groupId) {
          return res.status(400).json({
            success: false,
            message: 'Group ID is required for specific group targeting'
          });
        }

        const group = await ContactGroup.findByPk(groupId);
        if (!group || !group.isActive) {
          return res.status(404).json({
            success: false,
            message: 'Contact group not found or inactive'
          });
        }
      }

      const campaign = await SmsCampaign.create({
        name,
        message,
        targetType,
        groupId: targetType === 'specific_group' ? groupId : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        notes,
        createdById: userId
      });

      res.status(201).json({
        success: true,
        message: 'SMS campaign created successfully',
        data: campaign
      });

    } catch (error) {
      console.error('❌ Create campaign error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create SMS campaign',
        error: error.message
      });
    }
  },

  // Get all campaigns
  async getCampaigns(req, res) {
    try {
      const { page = 1, limit = 20, status, targetType } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (status) whereClause.status = status;
      if (targetType) whereClause.targetType = targetType;

      const { rows: campaigns, count } = await SmsCampaign.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: ContactGroup,
            as: 'targetGroup',
            attributes: ['id', 'name', 'memberCount']
          },
          {
            model: User,
            as: 'campaignCreator',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'campaignApprover',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: {
          campaigns,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Get campaigns error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve campaigns',
        error: error.message
      });
    }
  },

  // Get campaign details
  async getCampaignDetails(req, res) {
    try {
      const { id } = req.params;

      const campaign = await SmsCampaign.findByPk(id, {
        include: [
          {
            model: ContactGroup,
            as: 'targetGroup',
            attributes: ['id', 'name', 'memberCount']
          },
          {
            model: User,
            as: 'campaignCreator',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'campaignApprover',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
          }
        ]
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      // Get recent messages for this campaign
      const recentMessages = await SmsMessage.findAll({
        where: { campaignId: id },
        include: [
          {
            model: Member,
            as: 'member',
            attributes: ['id', 'firstName', 'lastName', 'memberNumber']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      res.json({
        success: true,
        data: {
          campaign,
          recentMessages
        }
      });

    } catch (error) {
      console.error('❌ Get campaign details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve campaign details',
        error: error.message
      });
    }
  },

  // Update campaign
  async updateCampaign(req, res) {
    try {
      const { id } = req.params;
      const { name, message, scheduledAt, notes } = req.body;

      const campaign = await SmsCampaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      // Only allow updates for draft campaigns
      if (campaign.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Only draft campaigns can be updated'
        });
      }

      await campaign.update({
        name: name || campaign.name,
        message: message || campaign.message,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : campaign.scheduledAt,
        notes: notes !== undefined ? notes : campaign.notes
      });

      res.json({
        success: true,
        message: 'Campaign updated successfully',
        data: campaign
      });

    } catch (error) {
      console.error('❌ Update campaign error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update campaign',
        error: error.message
      });
    }
  },

  // Approve campaign
  async approveCampaign(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const campaign = await SmsCampaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      if (campaign.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Only draft campaigns can be approved'
        });
      }

      await campaign.update({
        status: 'scheduled',
        approvedById: userId,
        approvedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Campaign approved successfully',
        data: campaign
      });

    } catch (error) {
      console.error('❌ Approve campaign error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve campaign',
        error: error.message
      });
    }
  },

  // Send campaign immediately
  async sendCampaign(req, res) {
    try {
      const { id } = req.params;

      const campaign = await SmsCampaign.findByPk(id, {
        include: [
          {
            model: ContactGroup,
            as: 'targetGroup'
          }
        ]
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      if (!['draft', 'scheduled'].includes(campaign.status)) {
        return res.status(400).json({
          success: false,
          message: 'Campaign cannot be sent in current status'
        });
      }

      // Get recipients based on target type
      let recipients = [];
      
      if (campaign.targetType === 'all_members') {
        recipients = await Member.findAll({
          where: { 
            phoneNumber: { [Op.ne]: null },
            isActive: true
          },
          attributes: ['id', 'firstName', 'lastName', 'phoneNumber']
        });
      } else if (campaign.targetType === 'specific_group') {
        const groupMembers = await GroupMember.findAll({
          where: { 
            groupId: campaign.groupId,
            isActive: true
          },
          include: [
            {
              model: Member,
              as: 'member',
              where: { 
                phoneNumber: { [Op.ne]: null },
                isActive: true
              },
              attributes: ['id', 'firstName', 'lastName', 'phoneNumber']
            }
          ]
        });
        recipients = groupMembers.map(gm => gm.member);
      }

      if (recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid recipients found for this campaign'
        });
      }

      // Update campaign status
      await campaign.update({
        status: 'sending',
        startedAt: new Date(),
        totalRecipients: recipients.length
      });

      // Send SMS to all recipients in background
      res.json({
        success: true,
        message: 'Campaign sending started',
        data: {
          campaignId: id,
          totalRecipients: recipients.length,
          status: 'sending'
        }
      });

      // Process sending in background
      processCampaignSending(campaign, recipients);

    } catch (error) {
      console.error('❌ Send campaign error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send campaign',
        error: error.message
      });
    }
  },

  // Cancel campaign
  async cancelCampaign(req, res) {
    try {
      const { id } = req.params;

      const campaign = await SmsCampaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      if (!['draft', 'scheduled'].includes(campaign.status)) {
        return res.status(400).json({
          success: false,
          message: 'Campaign cannot be cancelled in current status'
        });
      }

      await campaign.update({
        status: 'cancelled'
      });

      res.json({
        success: true,
        message: 'Campaign cancelled successfully'
      });

    } catch (error) {
      console.error('❌ Cancel campaign error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel campaign',
        error: error.message
      });
    }
  }
};

// Background function to process campaign sending
async function processCampaignSending(campaign, recipients) {
  try {
    console.log(`📱 Starting campaign "${campaign.name}" with ${recipients.length} recipients`);
    
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        // Create SMS record
        const smsRecord = await SmsMessage.create({
          recipientPhone: recipient.phoneNumber,
          recipientName: `${recipient.firstName} ${recipient.lastName}`,
          message: campaign.message,
          messageType: 'campaign',
          campaignId: campaign.id,
          memberId: recipient.id,
          sentById: campaign.createdById,
          messageLength: campaign.message.length,
          smsCount: communicationService.calculateSmsCount(campaign.message)
        });

        // Send SMS
        const result = await communicationService.sendSMS(
          recipient.phoneNumber, 
          campaign.message
        );

        if (result.success) {
          await smsRecord.update({
            status: 'sent',
            shootId: result.data?.shootId,
            sentAt: new Date()
          });
          sentCount++;
        } else {
          await smsRecord.update({
            status: 'failed',
            errorMessage: result.error,
            failedAt: new Date()
          });
          failedCount++;
        }

        // Add delay between messages to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Failed to send SMS to ${recipient.phoneNumber}:`, error.message);
        failedCount++;
      }
    }

    // Update campaign with final results
    await campaign.update({
      status: 'completed',
      completedAt: new Date(),
      sentCount,
      failedCount
    });

    console.log(`📊 Campaign "${campaign.name}" completed: ${sentCount} sent, ${failedCount} failed`);

  } catch (error) {
    console.error('❌ Campaign processing error:', error);
    await campaign.update({
      status: 'failed',
      completedAt: new Date()
    });
  }
}

module.exports = campaignController;
