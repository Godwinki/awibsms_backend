const nodemailer = require('nodemailer');
const { EmailTemplate } = require('../../../models');
const coreEmailService = require('../../../core/services/emailService');

/**
 * Send a direct email without using templates
 * @param {string} to Recipient email address
 * @param {string} subject Email subject
 * @param {string} html HTML content of the email
 * @returns {Promise} Email send result
 */
const sendEmail = async (to, subject, html) => {
  try {
    // Use the core email service for sending
    await coreEmailService.setupTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@wealthguard.com',
      to,
      subject,
      html
    };
    
    return await coreEmailService.sendEmail(to, subject, 'raw', { content: html });
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send an OTP verification email
 * @param {string} to Recipient email address
 * @param {string} otp The OTP code
 * @param {Object} userData User data for personalization
 * @returns {Promise} Email send result
 */
const sendOTPEmail = async (to, otp, userData = {}) => {
  const subject = 'Your WealthGuard Authentication Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">WealthGuard Security Verification</h2>
      <p>Hello ${userData.firstName || 'valued customer'},</p>
      <p>Your authentication code is:</p>
      <div style="background-color: #f5f5f5; padding: 15px; font-size: 24px; text-align: center; letter-spacing: 5px; font-weight: bold;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please secure your account by changing your password immediately.</p>
      <p>Regards,<br>WealthGuard Security Team</p>
    </div>
  `;
  
  return await sendEmail(to, subject, html);
};

/**
 * Send a 2FA enrollment confirmation email
 * @param {string} to Recipient email address
 * @param {Object} userData User data for personalization
 * @returns {Promise} Email send result
 */
const send2FAEnrollmentEmail = async (to, userData = {}) => {
  const subject = 'Two-Factor Authentication Enabled';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">WealthGuard Security Update</h2>
      <p>Hello ${userData.firstName || 'valued customer'},</p>
      <p>Two-factor authentication has been successfully enabled on your WealthGuard account.</p>
      <p>From now on, you will need to enter a verification code sent to your email when signing in.</p>
      <p>If you did not make this change, please contact our support team immediately.</p>
      <p>Regards,<br>WealthGuard Security Team</p>
    </div>
  `;
  
  return await sendEmail(to, subject, html);
};

module.exports = {
  sendEmail,
  sendOTPEmail,
  send2FAEnrollmentEmail
};
