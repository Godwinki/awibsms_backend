// CommunicationService.js - Enhanced SMS service with balance and status tracking
const axios = require('axios');

class CommunicationService {
  constructor() {
    this.apiKey = process.env.api_key;
    this.apiSecret = process.env.api_secret;
    this.senderId = process.env.KILAKONA_SENDER_ID || 'KILAKONA';
    this.apiUrl = 'https://messaging.kilakona.co.tz/api/v1/vendor/message/send';
    this.balanceUrl = 'https://messaging.kilakona.co.tz/api/v1/vendor/message/balance';
    this.deliveryUrl = 'https://messaging.kilakona.co.tz/api/v1/vendor/message/deliver';
    
    if (!this.apiKey || !this.apiSecret) {
      console.warn('⚠️ SMS API credentials not configured.');
    }
  }

  isConfigured() {
    return !!(this.apiKey && this.apiSecret);
  }

  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Remove leading + if present
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    // If starts with 0, replace with 255 (Tanzania country code)
    if (cleaned.startsWith('0')) {
      cleaned = '255' + cleaned.substring(1);
    }
    
    // If doesn't start with 255, add it
    if (!cleaned.startsWith('255')) {
      cleaned = '255' + cleaned;
    }
    
    return cleaned;
  }

  calculateSmsCount(message) {
    // Standard SMS is 160 characters, Unicode SMS is 70 characters
    const isUnicode = /[^\x00-\x7F]/.test(message);
    const maxLength = isUnicode ? 70 : 160;
    return Math.ceil(message.length / maxLength);
  }

  /**
   * Send SMS using Kilakona API
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - Message content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result with success status and data
   */
  async sendSMS(phoneNumber, message, options = {}) {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'SMS service not configured',
        data: null
      };
    }

    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    if (!formattedNumber) {
      return {
        success: false,
        error: 'Invalid phone number',
        data: null
      };
    }

    try {
      const payload = {
        senderId: this.senderId,
        messageType: "text",
        message: message,
        contacts: formattedNumber,
        deliveryReportUrl: options.deliveryReportUrl || ""
      };

      console.log(`📱 Sending SMS to ${formattedNumber}...`);

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "api_key": this.apiKey,
          "api_secret": this.apiSecret
        },
        timeout: 15000,
        validateStatus: (status) => status < 500
      });

      if (response.data && response.data.success === true && response.data.code === 200) {
        console.log('✅ SMS sent successfully!');
        return {
          success: true,
          data: {
            shootId: response.data.data?.shootId,
            validContacts: response.data.data?.validContacts,
            invalidContacts: response.data.data?.invalidContacts,
            messageSize: response.data.data?.messageSize,
            smsCount: this.calculateSmsCount(message)
          }
        };
      } else {
        console.error('❌ SMS API returned error:', response.data);
        return {
          success: false,
          error: response.data?.message || 'Unknown API error',
          data: response.data
        };
      }

    } catch (error) {
      console.error('❌ Failed to send SMS:', error.message);
      return {
        success: false,
        error: error.message,
        data: error.response?.data || null
      };
    }
  }

  /**
   * Check SMS balance
   * @returns {Promise<Object>} - Balance information
   */
  async checkBalance() {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'SMS service not configured',
        balance: 0
      };
    }

    try {
      console.log('💰 Checking SMS balance...');

      const response = await axios.get(this.balanceUrl, {
        headers: {
          "api_key": this.apiKey,
          "api_secret": this.apiSecret
        },
        timeout: 10000
      });

      if (response.data && response.data.success === true && response.data.code === 200) {
        console.log(`💰 Current SMS balance: ${response.data.data.totalSms}`);
        return {
          success: true,
          balance: response.data.data.totalSms,
          data: response.data.data
        };
      } else {
        console.error('❌ Balance check failed:', response.data);
        return {
          success: false,
          error: response.data?.message || 'Failed to check balance',
          balance: 0
        };
      }

    } catch (error) {
      console.error('❌ Balance check error:', error.message);
      return {
        success: false,
        error: error.message,
        balance: 0
      };
    }
  }

  /**
   * Check delivery status of sent message
   * @param {string} shootId - The shootId returned from send SMS
   * @returns {Promise<Object>} - Delivery status
   */
  async checkDeliveryStatus(shootId) {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'SMS service not configured',
        data: null
      };
    }

    try {
      console.log(`📊 Checking delivery status for shootId: ${shootId}`);

      const response = await axios.get(`${this.deliveryUrl}/${shootId}`, {
        headers: {
          "api_key": this.apiKey,
          "api_secret": this.apiSecret
        },
        timeout: 10000
      });

      if (response.data && response.data.success === true && response.data.code === 200) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Failed to check delivery status',
          data: null
        };
      }

    } catch (error) {
      console.error('❌ Delivery status check error:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Send bulk SMS to multiple recipients
   * @param {Array} recipients - Array of phone numbers
   * @param {string} message - Message content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Bulk send results
   */
  async sendBulkSMS(recipients, message, options = {}) {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'SMS service not configured',
        results: []
      };
    }

    console.log(`📱 Sending bulk SMS to ${recipients.length} recipients...`);

    const results = [];
    const batchSize = options.batchSize || 10; // Send in batches to avoid overwhelming API

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchPromises = batch.map(async (recipient) => {
        const result = await this.sendSMS(recipient, message, options);
        return {
          recipient,
          ...result
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`📊 Bulk SMS completed: ${successCount} successful, ${failureCount} failed`);

    return {
      success: successCount > 0,
      totalSent: successCount,
      totalFailed: failureCount,
      results
    };
  }

  // Legacy methods for compatibility with existing OTP service
  async sendOTP(phoneNumber, otp, userData = {}) {
    const { firstName = 'User' } = userData;
    
    const message = `Hello ${firstName},

Your AWIB SACCO verification code is: ${otp}

This code will expire in 10 minutes. Do not share this code with anyone.

AWIB SACCO Management System`;

    const result = await this.sendSMS(phoneNumber, message);
    return result.success;
  }

  async sendUnlockOTP(phoneNumber, otp, userData = {}) {
    const { firstName = 'User' } = userData;
    
    const message = `Hello ${firstName},

Your AWIB SACCO account unlock code is: ${otp}

This code will expire in 10 minutes. Use this code to unlock your account.

AWIB SACCO Management System`;

    const result = await this.sendSMS(phoneNumber, message);
    return result.success;
  }
}

module.exports = new CommunicationService();
