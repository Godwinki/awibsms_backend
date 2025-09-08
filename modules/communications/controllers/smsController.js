/**
 * SMS Controller
 * Handles individual SMS sending, testing, and status tracking
 */

const { SmsMessage, Member, User, sequelize } = require('../../../models');
const communicationService = require('../services/CommunicationService');

const smsController = {
  // Send individual SMS
  async sendSMS(req, res) {
    try {
      const { phoneNumber, message, memberId, messageType = 'general' } = req.body;
      const userId = req.user.id;

      if (!phoneNumber || !message) {
        return res.status(400).json({
          success: false,
          message: 'Phone number and message are required'
        });
      }

      // Format phone number
      const formattedPhone = communicationService.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }

      // Get recipient name if memberId provided
      let recipientName = null;
      if (memberId) {
        // Convert memberId to integer to match Member.id type
        const memberId_int = parseInt(memberId, 10);
        const member = await Member.findByPk(memberId_int);
        if (member) {
          recipientName = member.fullName || `${member.firstName || ''} ${member.lastName || ''}`.trim();
        }
      }

      // Create SMS record
      const smsRecord = await SmsMessage.create({
        recipientPhone: formattedPhone,
        recipientName,
        message,
        messageType,
        memberId: memberId ? parseInt(memberId, 10) : null, // Ensure integer type for memberId
        sentById: userId, // Already a UUID from req.user.id
        messageLength: message.length,
        smsCount: communicationService.calculateSmsCount(message)
      });

      // Send SMS
      const result = await communicationService.sendSMS(formattedPhone, message);

      // Update SMS record with result
      if (result.success) {
        await smsRecord.update({
          status: 'sent',
          shootId: result.data?.shootId,
          sentAt: new Date()
        });
      } else {
        await smsRecord.update({
          status: 'failed',
          errorMessage: result.error,
          failedAt: new Date()
        });
      }

      res.json({
        success: result.success,
        message: result.success ? 'SMS sent successfully' : 'Failed to send SMS',
        data: {
          smsId: smsRecord.id,
          shootId: result.data?.shootId,
          recipient: formattedPhone,
          messageLength: message.length,
          smsCount: communicationService.calculateSmsCount(message),
          cost: result.data?.smsCount || 1
        },
        error: result.success ? null : result.error
      });

    } catch (error) {
      console.error('❌ Send SMS error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send SMS',
        error: error.message
      });
    }
  },

  // Test SMS service
  async testSMS(req, res) {
    try {
      const { phoneNumber, message } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      const testMessage = message || `Test SMS from AWIB SACCO. Time: ${new Date().toLocaleString()}`;
      
      console.log(`📱 Admin SMS test requested by ${req.user.email}`);
      const result = await communicationService.sendSMS(phoneNumber, testMessage);

      res.json({
        success: result.success,
        message: result.success ? 'Test SMS sent successfully' : 'Test SMS failed',
        data: {
          phoneNumber: communicationService.formatPhoneNumber(phoneNumber),
          configured: communicationService.isConfigured(),
          message: testMessage,
          shootId: result.data?.shootId
        },
        error: result.success ? null : result.error
      });

    } catch (error) {
      console.error('❌ SMS test error:', error);
      res.status(500).json({
        success: false,
        message: 'SMS test failed',
        error: error.message
      });
    }
  },

  // Get SMS history
  async getSMSHistory(req, res) {
    try {
      const { page = 1, limit = 20, messageType, status, memberId } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (messageType) whereClause.messageType = messageType;
      if (status) whereClause.status = status;
      if (memberId) whereClause.memberId = parseInt(memberId, 10); // Parse as integer to match Member.id type
      
      // First get the count without joins to avoid type mismatches
      const count = await SmsMessage.count({ where: whereClause });
      
      // Then get the actual messages
      const messages = await SmsMessage.findAll({
        where: whereClause,
        include: [
          {
            model: Member,
            as: 'member',
            required: false, // LEFT JOIN
            attributes: ['id', 'fullName', 'nin', 'mobile']
          },
          {
            model: User,
            as: 'messageSender',
            required: false, // LEFT JOIN
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
          messages,
          totalCount: count,
          totalPages: Math.ceil(count / limit),
          currentPage: parseInt(page)
        }
      });

    } catch (error) {
      console.error('❌ Get SMS history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve SMS history',
        error: error.message
      });
    }
  },

  // Get SMS details
  async getSMSDetails(req, res) {
    try {
      const { id } = req.params;

      // First get the SMS message without joins to avoid type mismatches
      const sms = await SmsMessage.findByPk(id);
      if (!sms) {
        return res.status(404).json({
          success: false,
          message: 'SMS not found'
        });
      }
      
      // Get the member data separately if needed
      let member = null;
      if (sms.memberId) {
        member = await Member.findByPk(sms.memberId, {
          attributes: ['id', 'fullName', 'nin', 'mobile']
        });
      }
      
      // Get the sender data separately
      let sender = null;
      if (sms.sentById) {
        sender = await User.findByPk(sms.sentById, {
          attributes: ['id', 'firstName', 'lastName', 'email']
        });
      }
      
      // Combine the data
      const smsWithRelations = {
        ...sms.toJSON(),
        member,
        messageSender: sender
      };

      // If shootId exists, try to get delivery status
      let deliveryStatus = null;
      if (sms.shootId) {
        try {
          const deliveryResult = await communicationService.checkDeliveryStatus(sms.shootId);
          if (deliveryResult.success) {
            deliveryStatus = deliveryResult.data;
          }
        } catch (error) {
          console.warn('Could not fetch delivery status:', error.message);
        }
      }

      res.json({
        success: true,
        data: {
          sms: smsWithRelations,
          deliveryStatus
        }
      });

    } catch (error) {
      console.error('❌ Get SMS details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve SMS details',
        error: error.message
      });
    }
  },

  // Get SMS statistics
  async getSMSStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const whereClause = {};
      if (startDate && endDate) {
        whereClause.createdAt = {
          [require('sequelize').Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      // Use Sequelize to safely check if the smsCount column exists
      const tableColumns = await sequelize.getQueryInterface().describeTable('SmsMessages');
      const hasSmsCountColumn = tableColumns && tableColumns.smsCount;
      
      const attributes = [
        'status',
        'messageType',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ];
      
      // Only add the SUM of smsCount if the column exists
      if (hasSmsCountColumn) {
        attributes.push([require('sequelize').fn('SUM', require('sequelize').col('smsCount')), 'totalSMS']);
      } else {
        // If no smsCount column, use count as totalSMS
        attributes.push([require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalSMS']);
      }
      
      const stats = await SmsMessage.findAll({
        where: whereClause,
        attributes: attributes,
        group: ['status', 'messageType'],
        raw: true
      });

      const totalMessages = await SmsMessage.count({ where: whereClause });
      const totalSMSCount = hasSmsCountColumn
        ? (await SmsMessage.sum('smsCount', { where: whereClause }) || 0)
        : totalMessages; // Use message count if no smsCount column

      res.json({
        success: true,
        data: {
          totalMessages,
          totalSMSCount,
          breakdown: stats,
          period: {
            startDate: startDate || 'all time',
            endDate: endDate || 'now'
          }
        }
      });

    } catch (error) {
      console.error('❌ Get SMS stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve SMS statistics',
        error: error.message
      });
    }
  }
};

module.exports = smsController;
