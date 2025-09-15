const { Resend } = require('resend');

/**
 * Resend Email Service for reliable transactional email delivery
 * Better for OTP and system emails than marketing-focused services
 */
class ResendEmailService {
  constructor() {
    this.initialized = false;
    this.apiKey = process.env.RESEND_API_KEY;
    this.resend = null;
    this.init();
  }

  init() {
    if (this.apiKey) {
      this.resend = new Resend(this.apiKey);
      this.initialized = true;
      console.log('✅ Resend email service initialized');
    } else {
      console.log('⚠️ Resend API key not found, service disabled');
    }
  }

  isConfigured() {
    return this.initialized && this.apiKey && this.resend;
  }

  /**
   * Send OTP email via Resend API
   * @param {Object} user User object
   * @param {string} otp Plain text OTP
   * @returns {Promise<boolean>} Success status
   */
  async sendOTPEmail(user, otp) {
    if (!this.isConfigured()) {
      throw new Error('Resend service not configured');
    }

    const subject = 'Your AWIB SACCOS Authentication Code';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AWIB SACCOS - Authentication Code</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">AWIB SACCO</h1>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">Secure Banking Management System</p>
          </div>
          
          <div style="padding: 20px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px;">Security Verification</h2>
            <p style="color: #475569; margin-bottom: 20px; font-size: 16px;">Hello ${user.firstName || 'User'},</p>
            <p style="color: #475569; margin-bottom: 25px; font-size: 16px;">Your authentication code is:</p>
            
            <div style="background-color: #f8fafc; border: 3px solid #2563eb; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0;">
              <div style="font-size: 36px; font-weight: bold; color: #1e293b; letter-spacing: 6px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            
            <div style="background-color: #fef3cd; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ⏰ <strong>This code expires in 10 minutes</strong>
              </p>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background-color: #f1f5f9; border-radius: 6px;">
              <p style="color: #475569; margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">Security Notice:</p>
              <ul style="color: #475569; margin: 0; padding-left: 20px; font-size: 14px;">
                <li>Never share this code with anyone</li>
                <li>AWIB SACCOS will never ask for this code via phone or email</li>
                <li>If you didn't request this, secure your account immediately</li>
              </ul>
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated security message from AWIB SACCO<br>
              Please do not reply to this email
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      console.log('📧 Sending OTP email via Resend to:', user.email);
      
      const { data, error } = await this.resend.emails.send({
        from: 'AWIB SACCOS <noreply@awib-saccos.com>',
        to: [user.email],
        subject,
        html,
        text: `Your AWIB SACCOS authentication code is: ${otp}. This code will expire in 10 minutes. Never share this code with anyone.`
      });

      if (error) {
        console.error('❌ Resend API error:', error);
        throw new Error(error.message);
      }

      console.log('✅ Email sent successfully via Resend:', data.id);
      return true;
    } catch (error) {
      console.error('❌ Resend email failed:', error.message);
      throw error;
    }
  }

  /**
   * Send welcome email
   * @param {Object} user User object
   * @param {Object} data Additional data
   * @returns {Promise<boolean>} Success status
   */
  async sendWelcomeEmail(user, data = {}) {
    if (!this.isConfigured()) {
      throw new Error('Resend service not configured');
    }

    const subject = 'Welcome to AWIB SACCO';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to AWIB SACCO</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Welcome to AWIB SACCO</h1>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">Your account has been created successfully</p>
          </div>
          
          <div style="padding: 20px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0;">Hello ${user.firstName || 'User'},</h2>
            <p style="color: #475569; margin-bottom: 20px;">Welcome to AWIB SACCO! Your account has been successfully created and you can now access our banking services.</p>
            
            ${data.temporaryPassword ? `
            <div style="background-color: #f8fafc; border: 2px solid #2563eb; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #1e293b; font-weight: bold;">Your temporary password:</p>
              <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 18px; color: #2563eb; background: #ffffff; padding: 10px; border-radius: 4px;">${data.temporaryPassword}</p>
            </div>
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <p style="color: #dc2626; font-size: 14px; margin: 0;">
                ⚠️ <strong>Important:</strong> Please change this password after your first login for security.
              </p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl || process.env.FRONTEND_URL}" 
                 style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Access Your Account
              </a>
            </div>
            
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin-top: 20px;">
              <p style="color: #475569; margin: 0 0 10px 0; font-weight: bold;">Next Steps:</p>
              <ul style="color: #475569; margin: 0; padding-left: 20px;">
                <li>Log in to your account</li>
                <li>Complete your profile information</li>
                <li>Set up two-factor authentication for added security</li>
                <li>Explore our banking services</li>
              </ul>
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This email was sent from AWIB SACCOS Management System<br>
              Please do not reply to this email
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      console.log('📧 Sending welcome email via Resend to:', user.email);
      
      const { data, error } = await this.resend.emails.send({
        from: 'AWIB SACCOS <noreply@awib-saccos.com>',
        to: [user.email],
        subject,
        html,
        text: `Welcome to AWIB SACCO! Your account has been created successfully. ${data.temporaryPassword ? `Your temporary password is: ${data.temporaryPassword}. Please change this after your first login.` : ''}`
      });

      if (error) {
        console.error('❌ Resend welcome email error:', error);
        throw new Error(error.message);
      }

      console.log('✅ Welcome email sent successfully via Resend:', data.id);
      return true;
    } catch (error) {
      console.error('❌ Resend welcome email failed:', error.message);
      throw error;
    }
  }
}

module.exports = new ResendEmailService();
