const sgMail = require('@sendgrid/mail');

/**
 * SendGrid Email Service for reliable email delivery
 * This service provides a more reliable alternative to SMTP
 */
class SendGridEmailService {
  constructor() {
    this.initialized = false;
    this.init();
  }

  init() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.initialized = true;
      console.log('✅ SendGrid email service initialized');
    } else {
      console.log('⚠️ SendGrid API key not found, service disabled');
    }
  }

  isConfigured() {
    return this.initialized && process.env.SENDGRID_API_KEY;
  }

  /**
   * Send OTP email via SendGrid API
   * @param {Object} user User object
   * @param {string} otp Plain text OTP
   * @returns {Promise<boolean>} Success status
   */
  async sendOTPEmail(user, otp) {
    if (!this.isConfigured()) {
      throw new Error('SendGrid service not configured');
    }

    const subject = 'Your AWIB SACCOS Authentication Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">AWIB SACCO</h1>
          <p style="color: #666; margin: 5px 0;">Secure Banking Management System</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Security Verification Required</h2>
          <p style="color: #475569; margin-bottom: 20px;">Hello ${user.firstName || 'User'},</p>
          <p style="color: #475569; margin-bottom: 25px;">Your authentication code is:</p>
          
          <div style="background-color: #ffffff; border: 2px solid #e2e8f0; padding: 20px; border-radius: 6px; text-align: center; margin: 25px 0;">
            <div style="font-size: 32px; font-weight: bold; color: #1e293b; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
          </div>
          
          <div style="background-color: #fef3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              ⏰ <strong>This code will expire in 10 minutes.</strong>
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
            This email was sent from AWIB SACCOS Management System<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const msg = {
      to: user.email,
      from: {
        email: process.env.EMAIL_FROM || 'noreply@awib-saccos.com',
        name: 'AWIB SACCO'
      },
      subject,
      html,
      text: `Your AWIB SACCOS authentication code is: ${otp}. This code will expire in 10 minutes. If you didn't request this code, please secure your account immediately.`
    };

    try {
      console.log('📧 Sending email via SendGrid to:', user.email);
      const response = await sgMail.send(msg);
      console.log('✅ Email sent successfully via SendGrid:', response[0].statusCode);
      return true;
    } catch (error) {
      console.error('❌ SendGrid email failed:', error.message);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      throw error;
    }
  }

  /**
   * Send welcome email
   * @param {Object} user User object
   * @param {Object} data Additional data (loginUrl, temporaryPassword, etc.)
   * @returns {Promise<boolean>} Success status
   */
  async sendWelcomeEmail(user, data = {}) {
    if (!this.isConfigured()) {
      throw new Error('SendGrid service not configured');
    }

    const subject = 'Welcome to AWIB SACCO';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Welcome to AWIB SACCO</h1>
          <p style="color: #666; margin: 5px 0;">Your account has been created successfully</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Hello ${user.firstName || 'User'},</h2>
          <p style="color: #475569; margin-bottom: 20px;">Welcome to AWIB SACCO! Your account has been successfully created.</p>
          
          ${data.temporaryPassword ? `
          <div style="background-color: #ffffff; border: 2px solid #e2e8f0; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #1e293b; font-weight: bold;">Your temporary password:</p>
            <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 18px; color: #2563eb;">${data.temporaryPassword}</p>
          </div>
          <p style="color: #dc2626; font-size: 14px; margin-bottom: 20px;">
            ⚠️ Please change this password after your first login for security.
          </p>
          ` : ''}
          
          ${data.loginUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Login to Your Account
            </a>
          </div>
          ` : ''}
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            This email was sent from AWIB SACCOS Management System<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const msg = {
      to: user.email,
      from: {
        email: process.env.EMAIL_FROM || 'noreply@awib-saccos.com',
        name: 'AWIB SACCO'
      },
      subject,
      html,
      text: `Welcome to AWIB SACCO! Your account has been created successfully. ${data.temporaryPassword ? `Your temporary password is: ${data.temporaryPassword}. Please change this password after your first login.` : ''}`
    };

    try {
      console.log('📧 Sending welcome email via SendGrid to:', user.email);
      const response = await sgMail.send(msg);
      console.log('✅ Welcome email sent successfully via SendGrid:', response[0].statusCode);
      return true;
    } catch (error) {
      console.error('❌ SendGrid welcome email failed:', error.message);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      throw error;
    }
  }
}

module.exports = new SendGridEmailService();
