/**
 * SMS Balance Controller
 * Handles SMS balance checking and history tracking
 */

const { SmsBalance } = require('../../../models');
const communicationService = require('../services/CommunicationService');

const balanceController = {
  // Check current SMS balance
  async getCurrentBalance(req, res) {
    try {
      const userId = req.user.id;

      const result = await communicationService.checkBalance();

      if (result.success) {
        // Record balance check in database
        const lastBalance = await SmsBalance.findOne({
          order: [['checkedAt', 'DESC']],
          limit: 1
        });

        const balanceRecord = await SmsBalance.create({
          balance: result.balance,
          previousBalance: lastBalance ? lastBalance.balance : null,
          change: lastBalance ? result.balance - lastBalance.balance : null,
          changeType: lastBalance && result.balance !== lastBalance.balance ? 
            (result.balance > lastBalance.balance ? 'top_up' : 'usage') : null,
          checkedById: userId,
          source: 'api_check'
        });

        res.json({
          success: true,
          data: {
            currentBalance: result.balance,
            previousBalance: lastBalance ? lastBalance.balance : null,
            change: balanceRecord.change,
            lastChecked: balanceRecord.checkedAt
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to check SMS balance',
          error: result.error
        });
      }

    } catch (error) {
      console.error('❌ Get balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve SMS balance',
        error: error.message
      });
    }
  },

  // Get balance history
  async getBalanceHistory(req, res) {
    try {
      const { page = 1, limit = 20, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (startDate && endDate) {
        whereClause.checkedAt = {
          [require('sequelize').Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const { rows: balanceHistory, count } = await SmsBalance.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: require('../../../models').User,
            as: 'balanceChecker',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
          }
        ],
        order: [['checkedAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: {
          balanceHistory,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Get balance history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve balance history',
        error: error.message
      });
    }
  },

  // Get balance statistics
  async getBalanceStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const whereClause = {};
      if (startDate && endDate) {
        whereClause.checkedAt = {
          [require('sequelize').Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      // Get latest balance
      const latestBalance = await SmsBalance.findOne({
        where: whereClause,
        order: [['checkedAt', 'DESC']],
        limit: 1
      });

      // Get oldest balance in period
      const oldestBalance = await SmsBalance.findOne({
        where: whereClause,
        order: [['checkedAt', 'ASC']],
        limit: 1
      });

      // Calculate usage statistics
      const { SmsMessage } = require('../../../models');
      const usageStats = await SmsMessage.findAll({
        where: {
          createdAt: whereClause.checkedAt || {},
          status: 'sent'
        },
        attributes: [
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalMessages'],
          [require('sequelize').fn('SUM', require('sequelize').col('smsCount')), 'totalSMSUsed'],
          [require('sequelize').fn('AVG', require('sequelize').col('smsCount')), 'avgSMSPerMessage']
        ],
        raw: true
      });

      const usage = usageStats[0] || {
        totalMessages: 0,
        totalSMSUsed: 0,
        avgSMSPerMessage: 0
      };

      // Calculate balance change
      const balanceChange = oldestBalance && latestBalance ? 
        latestBalance.balance - oldestBalance.balance : 0;

      res.json({
        success: true,
        data: {
          currentBalance: latestBalance ? latestBalance.balance : 0,
          balanceChange,
          period: {
            startDate: startDate || 'all time',
            endDate: endDate || 'now'
          },
          usage: {
            totalMessages: parseInt(usage.totalMessages) || 0,
            totalSMSUsed: parseInt(usage.totalSMSUsed) || 0,
            avgSMSPerMessage: parseFloat(usage.avgSMSPerMessage) || 0
          },
          lastChecked: latestBalance ? latestBalance.checkedAt : null
        }
      });

    } catch (error) {
      console.error('❌ Get balance stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve balance statistics',
        error: error.message
      });
    }
  },

  // Manual balance update (admin only)
  async updateBalance(req, res) {
    try {
      const { balance, description, changeType = 'manual_entry' } = req.body;
      const userId = req.user.id;

      if (typeof balance !== 'number' || balance < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid balance amount is required'
        });
      }

      // Get last recorded balance
      const lastBalance = await SmsBalance.findOne({
        order: [['checkedAt', 'DESC']],
        limit: 1
      });

      const balanceRecord = await SmsBalance.create({
        balance,
        previousBalance: lastBalance ? lastBalance.balance : null,
        change: lastBalance ? balance - lastBalance.balance : null,
        changeType,
        description,
        checkedById: userId,
        source: 'manual_entry'
      });

      res.json({
        success: true,
        message: 'Balance updated successfully',
        data: balanceRecord
      });

    } catch (error) {
      console.error('❌ Update balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update balance',
        error: error.message
      });
    }
  }
};

module.exports = balanceController;
