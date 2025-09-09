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
    // Try Resend API first (most reliable for transactional emails)
    const resendService = require('./resendEmailService');
    
    if (resendService.isConfigured()) {
      console.log('📧 Using Resend API for email delivery...');
      try {
        return await resendService.sendOTPEmail(user, otp);
      } catch (resendError) {
        console.error('❌ Resend API failed, falling back to SMTP:', resendError.message);
      }
    }
    
    // Fallback to SMTP (Brevo SMTP is reliable)
    console.log('🔍 DEBUG - Using Brevo SMTP fallback...');
    console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('  EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
    console.log('  EMAIL_PORT:', process.env.EMAIL_PORT);
    
    const nodemailer = require('nodemailer');
    
    // Create simple SMTP transporter for Brevo
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

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
      from: `"AWIB SACCO" <${process.env.EMAIL_FROM || 'awibsaccos@gmail.com'}>`,
      to: user.email,
      subject,
      html
    };

    console.log('📧 Sending email via Brevo SMTP...');
    
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully via Brevo SMTP:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Brevo SMTP failed:', error.message);
      throw new Error('Failed to send authentication code via SMTP');
    }
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
    console.log('🔍 DEBUG - Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production',
      hasEmailConfig: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER),
      hasSmsConfig: !!(process.env.api_key && process.env.api_secret),
      smsApiKey: process.env.api_key ? 'SET' : 'NOT SET',
      smsApiSecret: process.env.api_secret ? 'SET' : 'NOT SET',
      smsServiceConfigured: smsService.isConfigured()
    });
    
    // Remove bypass - we need to fix the actual issues
    // if (process.env.NODE_ENV === 'production' && process.env.ALLOW_OTP_BYPASS === 'true') {
    //   console.log('⚠️ PRODUCTION BYPASS: OTP sending disabled, allowing login without OTP');
    //   return true;
    // }
    
    // Send SMS first (fast), then email in background
    let smsSuccess = false;
    let smsError = null;
    
    try {
      if (user.phoneNumber) {
        console.log('📱 Sending SMS OTP...');
        smsSuccess = await sendOTPBySMS(user, otp);
      }
    } catch (error) {
      smsError = error;
      console.error('📱 SMS OTP failed:', error.message);
    }

    // Send email in background without awaiting it
    (async () => {
      try {
        console.log('📧 Starting background email OTP send...');
        const emailSuccess = await sendOTPByEmail(user, otp);
        console.log(`📧 Email OTP ${emailSuccess ? 'sent successfully' : 'failed'}`);
      } catch (error) {
        console.error('📧 Background email OTP failed:', error.message);
      }
    })();

    // Log SMS result (email result will be logged in the background)
    console.log(`📱 SMS OTP: ${smsSuccess ? 'Success' : 'Failed'}`);
    
    // Return true if SMS was successful (we don't wait for email)
    const overallSuccess = smsSuccess;
    
    if (overallSuccess) {
      console.log('✅ OTP sent successfully via SMS');
    } else {
      console.log('❌ Failed to send OTP via SMS');
      console.log('🔍 DEBUG - SMS sending failed:', {
        smsError: smsError?.message,
        environment: process.env.NODE_ENV
      });
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
