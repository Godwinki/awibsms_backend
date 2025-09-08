const express = require('express');
const router = express.Router();
const smsService = require('../../../core/services/simpleSmsService');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');

// Test SMS service (admin only)
router.post('/test-sms', protect, restrictTo('admin', 'super_admin'), async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number is required'
      });
    }

    const testMessage = message || `Test SMS from AWIB SACCO. Time: ${new Date().toLocaleString()}`;
    
    console.log(`📱 Testing SMS to ${phoneNumber}...`);
    const success = await smsService.sendSMS(phoneNumber, testMessage);
    
    res.status(200).json({
      status: 'success',
      message: success ? 'SMS sent successfully' : 'SMS failed to send (check backend logs)',
      data: {
        phoneNumber: smsService.formatPhoneNumber(phoneNumber),
        success,
        configured: smsService.isConfigured(),
        message: testMessage
      }
    });
    
  } catch (error) {
    console.error('SMS test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to test SMS service',
      error: error.message
    });
  }
});

// Check SMS service status
router.get('/sms-status', protect, restrictTo('admin', 'super_admin'), async (req, res) => {
  try {
    const isConfigured = smsService.isConfigured();
    
    res.status(200).json({
      status: 'success',
      data: {
        configured: isConfigured,
        senderId: process.env.KILAKONA_SENDER_ID || 'KILAKONA',
        apiUrl: 'https://messaging.kilakona.co.tz/api/v1/vendor/message/send',
        apiKey: process.env.api_key ? `${process.env.api_key.substring(0, 3)}***` : 'Not set',
        apiSecret: process.env.api_secret ? `${process.env.api_secret.substring(0, 3)}***` : 'Not set',
        message: isConfigured ? 'SMS service is configured' : 'SMS service not configured - missing API credentials'
      }
    });
    
  } catch (error) {
    console.error('SMS status check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check SMS service status',
      error: error.message
    });
  }
});

// Check delivery status of a message (if shootId is available)
router.get('/delivery/:shootId', protect, restrictTo('admin', 'super_admin'), async (req, res) => {
  try {
    const { shootId } = req.params;

    if (!shootId) {
      return res.status(400).json({
        status: 'error',
        message: 'Shoot ID is required'
      });
    }

    const deliveryStatus = await smsService.checkDeliveryStatus(shootId);

    res.status(200).json({
      status: 'success',
      data: {
        deliveryStatus,
        shootId
      }
    });

  } catch (error) {
    console.error('❌ Delivery status check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check delivery status',
      error: error.message
    });
  }
});

module.exports = router;
