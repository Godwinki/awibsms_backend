const crypto = require('crypto');
const { User } = require('../../../models');
const mailService = require('./mailService');
const smsService = require('../../../core/services/simpleSmsService');

// OTP length
const OTP_LENGTH = 6;
// OTP expiry time in minutes
const OTP_EXPIRY_MINUTES = 10;
// Maximum number of OTP attempts before locking
const MAX_OTP_ATTEMPTS = 5;

/**
 * Generate a random numeric OTP code
 * @param {number} length Length of the OTP code
 * @returns {string} The generated OTP code
 */
const generateOTP = (length = OTP_LENGTH) => {
  // Generate a random number with specified length
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1))
    .toString()
    .padStart(length, '0');
};

/**
 * Generate a secure hash of the OTP to store in database
 * @param {string} otp The plain text OTP
 * @param {string} userId User ID as salt
 * @returns {string} Hashed OTP
 */
const hashOTP = (otp, userId) => {
  return crypto
    .createHmac('sha256', process.env.OTP_SECRET || 'otp-secret-key')
    .update(`${otp}.${userId}`)
    .digest('hex');
};

/**
 * Generate and store an OTP code for a user
 * @param {Object} user User object
 * @returns {string} Plain text OTP (unhashed)
 */
const generateAndStoreOTP = async (user) => {
  try {
    // Generate OTP
    const otp = generateOTP();
    
    // Hash OTP for storage
    const hashedOTP = hashOTP(otp, user.id);
    
    // Store hashed OTP in user record
    await User.update({
      twoFactorSecret: hashedOTP,
      lastOtpTime: new Date(),
      otpAttempts: 0
    }, {
      where: { id: user.id }
    });
    
    // Return plain text OTP for sending
    return otp;
  } catch (error) {
    console.error('Error generating OTP:', error);
    throw new Error('Failed to generate OTP');
  }
};

/**
 * Send OTP via email
 * @param {Object} user User object
 * @param {string} otp Plain text OTP
 * @returns {Promise<boolean>} Success status
 */
const sendOTPByEmail = async (user, otp) => {
  try {
    console.log('🔍 DEBUG - Email config check:');
    console.log('  EMAIL_HOST:', process.env.EMAIL_HOST ? 'SET' : 'NOT SET');
    console.log('  EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
    console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET');
    console.log('  EMAIL_PORT:', process.env.EMAIL_PORT || 'DEFAULT');
    console.log('  EMAIL_SECURE:', process.env.EMAIL_SECURE || 'DEFAULT');
    
    // Use nodemailer directly for better control
    const nodemailer = require('nodemailer');
    
    // Create transporter based on email configuration availability
    let transporter;
    
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      console.log('🔍 DEBUG - Creating SMTP transporter with config');
      
      // Try multiple SMTP configurations for production reliability
      const smtpConfigs = [
        {
          name: 'Gmail SMTP (Port 587)',
          config: {
            host: process.env.EMAIL_HOST,
            port: 587,
            secure: false,
            connectionTimeout: 60000,
            socketTimeout: 60000,
            greetingTimeout: 30000,
            debug: process.env.NODE_ENV !== 'production',
            pool: false,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD
            },
            tls: {
              rejectUnauthorized: false
            }
          }
        },
        {
          name: 'Gmail SMTP (Port 465)',
          config: {
            host: process.env.EMAIL_HOST,
            port: 465,
            secure: true,
            connectionTimeout: 60000,
            socketTimeout: 60000,
            greetingTimeout: 30000,
            debug: process.env.NODE_ENV !== 'production',
            pool: false,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD
            },
            tls: {
              rejectUnauthorized: false
            }
          }
        }
      ];
      
      // Try each configuration until one works
      for (const smtpConfig of smtpConfigs) {
        try {
          console.log(`🔍 DEBUG - Trying ${smtpConfig.name}`);
          transporter = nodemailer.createTransport(smtpConfig.config);
          
          // Test the connection
          await transporter.verify();
          console.log(`✅ SMTP connection verified: ${smtpConfig.name}`);
          break;
        } catch (verifyError) {
          console.log(`❌ ${smtpConfig.name} failed:`, verifyError.message);
          transporter = null;
        }
      }
      
      if (!transporter) {
        console.log('⚠️ All SMTP configurations failed, falling back to development mode');
      } else {
        console.log('📧 Using configured SMTP server:', process.env.EMAIL_HOST);
      }
    }
    
    // If no transporter was created, fall back to test account
    if (!transporter) {
      console.log('🔍 DEBUG - Creating fallback test account');
      // For development without email config, create a test account
      const testAccount = await nodemailer.createTestAccount();
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      console.log('📧 Development email credentials:', {
        user: testAccount.user,
        pass: testAccount.pass,
        preview: 'https://ethereal.email'
      });
    }

    const subject = 'Your AWIB SACCO Authentication Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">AWIB SACCO</h1>
          <p style="color: #666; margin: 5px 0;">Secure Banking Management System</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Security Verification Required</h2>
          <p style="color: #475569; margin-bottom: 20px;">Hello ${user.firstName},</p>
          <p style="color: #475569; margin-bottom: 25px;">Your authentication code is:</p>
          
          <div style="background-color: #ffffff; border: 2px solid #e2e8f0; padding: 20px; border-radius: 6px; text-align: center; margin: 25px 0;">
            <div style="font-size: 32px; font-weight: bold; color: #1e293b; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
          </div>
          
          <div style="background-color: #fef3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              ⏰ <strong>This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</strong>
            </p>
          </div>
          
          <p style="color: #475569; margin-bottom: 15px;">If you didn't request this code, please:</p>
          <ul style="color: #475569; margin-bottom: 20px;">
            <li>Secure your account by changing your password immediately</li>
            <li>Contact our support team if you suspect unauthorized access</li>
          </ul>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            This email was sent from AWIB SACCO Management System<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"AWIB SACCO" <${process.env.EMAIL_FROM || 'noreply@awib-saccos.com'}>`,
      to: user.email,
      subject,
      html
    };

    console.log('🔍 DEBUG - Attempting to send email...');
    
    // Add retry mechanism for production SMTP issues
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 DEBUG - Email attempt ${attempt}/${maxRetries}`);
        const info = await transporter.sendMail(mailOptions);
        
        console.log('📧 Email sent successfully:', info.messageId);
        console.log('🔍 DEBUG - Email info:', JSON.stringify(info, null, 2));
        
        // For development with ethereal, log the preview URL
        if (!process.env.EMAIL_HOST && process.env.NODE_ENV !== 'production') {
          console.log('📧 Email preview URL:', nodemailer.getTestMessageUrl(info));
        }
        
        return true;
      } catch (error) {
        lastError = error;
        console.error(`❌ Email attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 2000; // 2s, 4s, 8s
          console.log(`⏳ Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed, throw the last error
    throw lastError;
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error);
    console.error('🔍 DEBUG - Email error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    throw new Error('Failed to send authentication code');
  }
};

/**
 * Send OTP via SMS using Kilakona API
 * @param {Object} user User object
 * @param {string} otp Plain text OTP
 * @returns {Promise<boolean>} Success status
 */
const sendOTPBySMS = async (user, otp) => {
  try {
    console.log('🔍 DEBUG - SMS service check:');
    console.log('  User phone number:', user.phoneNumber ? 'SET' : 'NOT SET');
    console.log('  SMS service configured:', smsService.isConfigured() ? 'YES' : 'NO');
    
    if (!user.phoneNumber) {
      console.log('📱 No phone number provided for SMS OTP');
      return false;
    }

    console.log('🔍 DEBUG - Attempting to send SMS...');
    const success = await smsService.sendOTP(user.phoneNumber, otp, {
      firstName: user.firstName,
      lastName: user.lastName
    });

    if (success) {
      console.log(`✅ SMS OTP sent successfully to ${user.phoneNumber}`);
    } else {
      console.log(`❌ Failed to send SMS OTP to ${user.phoneNumber}`);
    }

    return success;
  } catch (error) {
    console.error('❌ Error sending SMS OTP:', error);
    console.error('🔍 DEBUG - SMS error details:', {
      message: error.message,
      stack: error.stack
    });
    return false;
  }
};

/**
 * Generate and send OTP to both email and SMS
 * @param {Object} user User object
 * @returns {Promise<boolean>} Success status (true if at least one method succeeds)
 */
const generateAndSendOTP = async (user) => {
  try {
    // Generate OTP
    const otp = await generateAndStoreOTP(user);
    
    console.log(`📤 Sending OTP to user ${user.email} via email and SMS...`);
    
    // Send to both email and SMS simultaneously
    const emailPromise = sendOTPByEmail(user, otp);
    const smsPromise = user.phoneNumber ? sendOTPBySMS(user, otp) : Promise.resolve(false);
    
    // Wait for both to complete
    const [emailSuccess, smsSuccess] = await Promise.all([emailPromise, smsPromise]);
    
    // Log results
    console.log(`📧 Email OTP: ${emailSuccess ? 'Success' : 'Failed'}`);
    console.log(`📱 SMS OTP: ${smsSuccess ? 'Success' : 'Skipped/Failed'}`);
    
    // Return true if at least one method succeeded
    const overallSuccess = emailSuccess || smsSuccess;
    
    if (overallSuccess) {
      console.log('✅ OTP sent successfully via at least one method');
    } else {
      console.log('❌ Failed to send OTP via any method');
    }
    
    return overallSuccess;
  } catch (error) {
    console.error('Error in generateAndSendOTP:', error);
    throw error;
  }
};

/**
 * Verify OTP provided by user
 * @param {string} userId User ID
 * @param {string} providedOTP OTP provided by user
 * @returns {Promise<boolean>} Verification result
 */
const verifyOTP = async (userId, providedOTP) => {
  try {
    // Get user with current OTP data
    const user = await User.findByPk(userId);
    
    if (!user || !user.twoFactorSecret || !user.lastOtpTime) {
      return false;
    }
    
    // Check if OTP has expired
    const now = new Date();
    const otpTime = new Date(user.lastOtpTime);
    const diffMinutes = (now - otpTime) / (1000 * 60);
    
    if (diffMinutes > OTP_EXPIRY_MINUTES) {
      // OTP expired
      return false;
    }
    
    // Check if max attempts exceeded
    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      throw new Error('Maximum verification attempts exceeded. Please request a new code.');
    }
    
    // Hash the provided OTP for comparison
    const hashedProvidedOTP = hashOTP(providedOTP, userId);
    
    // Increment attempt counter
    await user.update({
      otpAttempts: user.otpAttempts + 1
    });
    
    // Compare hashed OTPs
    if (user.twoFactorSecret === hashedProvidedOTP) {
      // Reset OTP data on successful verification
      await user.update({
        twoFactorSecret: null,
        lastOtpTime: null,
        otpAttempts: 0
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('OTP verification error:', error);
    throw error;
  }
};

module.exports = {
  generateOTP,
  generateAndSendOTP,
  verifyOTP,
  OTP_EXPIRY_MINUTES,
  MAX_OTP_ATTEMPTS
};
