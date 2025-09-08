const axios = require('axios');

/**
 * Kilakona SMS Service - Updated with correct API documentation
 */
class SimpleSmsService {
  constructor() {
    this.apiKey = process.env.api_key;
    this.apiSecret = process.env.api_secret;
    this.senderId = process.env.KILAKONA_SENDER_ID || 'AWIB SACCOS'; 
    // Correct Kilakona API endpoint from documentation
    this.apiUrl = 'https://messaging.kilakona.co.tz/api/v1/vendor/message/send';
    
    if (!this.apiKey || !this.apiSecret) {
      console.warn('⚠️ SMS API credentials not configured.');
    }
    
    console.log(`📱 SMS Service initialized with sender ID: ${this.senderId}`);
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

  async sendSMS(phoneNumber, message) {
    if (!this.isConfigured()) {
      console.log('📱 SMS service not configured');
      return false;
    }

    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    if (!formattedNumber) {
      console.error('❌ Invalid phone number');
      return false;
    }

    console.log(`📱 Sending SMS to ${formattedNumber} via Kilakona API...`);

    try {
      // Correct payload format according to Kilakona documentation
      const payload = {
        senderId: this.senderId, // Use configured sender ID (default: KILAKONA)
        messageType: "text",
        message: message,
        contacts: formattedNumber, // Single phone number
        deliveryReportUrl: "" // Optional - can be empty for now
      };

      console.log('📱 Payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "api_key": this.apiKey,
          "api_secret": this.apiSecret
        },
        timeout: 15000,
        validateStatus: (status) => status < 500 // Accept 4xx responses to see error details
      });

      console.log(`📱 Response status: ${response.status}`);
      console.log(`📱 Response data:`, JSON.stringify(response.data, null, 2));

      // Check for success according to Kilakona API documentation
      if (response.data && response.data.success === true && response.data.code === 200) {
        console.log('✅ SMS sent successfully!');
        console.log(`📊 Message details:`, {
          validContacts: response.data.data?.validContacts,
          messageSize: response.data.data?.messageSize,
          shootId: response.data.data?.shootId
        });
        return true;
      } else {
        console.error('❌ SMS API returned error:', response.data);
        return false;
      }

    } catch (error) {
      console.error('❌ Failed to send SMS:', error.message);
      
      if (error.response) {
        console.error('📱 SMS API Error Status:', error.response.status);
        console.error('📱 SMS API Error Data:', error.response.data);
      }
      
      return false;
    }
  }

  async sendOTP(phoneNumber, otp, userData = {}) {
    const { firstName = 'User' } = userData;
    
    const message = `Hello ${firstName},

Your AWIB SACCO verification code is: ${otp}

This code will expire in 10 minutes. Do not share this code with anyone.

AWIB SACCO Management System`;

    return await this.sendSMS(phoneNumber, message);
  }

  async sendUnlockOTP(phoneNumber, otp, userData = {}) {
    const { firstName = 'User' } = userData;
    
    const message = `Hello ${firstName},

Your AWIB SACCO account unlock code is: ${otp}

This code will expire in 10 minutes. Use this code to unlock your account.

AWIB SACCO Management System`;

    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Check delivery status of sent message
   * @param {string} shootId - The shootId returned from send SMS
   * @returns {Promise<Object>} - Delivery status
   */
  async checkDeliveryStatus(shootId) {
    if (!this.isConfigured()) {
      throw new Error('SMS service not configured');
    }

    try {
      const response = await axios.get(
        `https://messaging.kilakona.co.tz/api/v1/vendor/message/deliver/${shootId}`,
        {
          headers: {
            "api_key": this.apiKey,
            "api_secret": this.apiSecret
          },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Failed to check delivery status:', error.message);
      throw error;
    }
  }
}

module.exports = new SimpleSmsService();
