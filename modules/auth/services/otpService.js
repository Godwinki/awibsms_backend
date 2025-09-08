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
    // Use nodemailer directly for better control
    const nodemailer = require('nodemailer');
    
    // Create transporter based on email configuration availability
    let transporter;
    
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      // Use configured SMTP (Gmail with app password)
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD // App password from Gmail
        }
      });
      console.log('📧 Using configured SMTP server:', process.env.EMAIL_HOST);
    } else {
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

    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Email sent successfully:', info.messageId);
    
    // For development with ethereal, log the preview URL
    if (!process.env.EMAIL_HOST && process.env.NODE_ENV !== 'production') {
      console.log('📧 Email preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error);
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
    if (!user.phoneNumber) {
      console.log('📱 No phone number provided for SMS OTP');
      return false;
    }

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
