const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initPromise = this.init();
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Use the same email configuration as OTP service
      if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        // Use configured SMTP (Gmail with app password)
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT) || 587,
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD // App password from Gmail
          },
          // Add connection timeout and debugging options
          connectionTimeout: 10000, // 10 seconds
          socketTimeout: 15000,     // 15 seconds
          debug: process.env.NODE_ENV !== 'production',
          // Retry configuration
          pool: false, // Disable pooling for more reliable connections
          maxConnections: 5,
          maxMessages: 100,
          // TLS options
          tls: {
            rejectUnauthorized: false // Accept self-signed certificates
          }
        });
        console.log('✅ Email service using configured SMTP server:', process.env.EMAIL_HOST);
      } else {
        // Fallback for development without throwing an error
        console.log('⚠️ No email configuration found, using Ethereal test account');
        try {
          const testAccount = await nodemailer.createTestAccount();
          
          this.transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass
            }
          });
          
          console.log('✅ Email service using development SMTP');
        } catch (devError) {
          console.log('⚠️ Could not create test account, email service disabled:', devError.message);
          // Instead of throwing, just set transporter to null
          this.transporter = null;
          this.initialized = true;
          return;
        }
      }

      // Verify connection
      try {
        await this.transporter.verify();
        console.log('✅ Email service connected successfully');
        this.initialized = true;
      } catch (verifyError) {
        console.error('❌ Email verification failed:', verifyError.message);
        // Don't throw the error, just set to non-functional state
        this.transporter = null;
        this.initialized = true;
      }
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      // Don't throw, set service as initialized but non-functional
      this.transporter = null;
      this.initialized = true;
    }
  }

  async loadTemplate(templateName) {
    try {
      const templatePath = path.join(__dirname, '../../templates/emails', `${templateName}.html`);
      const template = await fs.readFile(templatePath, 'utf8');
      return template;
    } catch (error) {
      console.error(`Error loading email template ${templateName}:`, error);
      throw error;
    }
  }

  replaceTemplateVars(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    }
    return result;
  }

  async sendEmail(to, subject, html, text = null) {
    // Ensure email service is initialized
    await this.initPromise;
    
    if (!this.transporter) {
      console.warn(`⚠️ Email service not available. Cannot send email to ${to} (${subject})`);
      // Return a dummy result instead of throwing an error
      return {
        success: false,
        error: 'Email service not available',
        messageId: null
      };
    }

    const mailOptions = {
      from: `"AWIB SACCO" <${process.env.EMAIL_USER || 'noreply@awib-saccos.com'}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      // Add retry options
      disableFileAccess: true, // Security best practice
      disableUrlAccess: true, // Security best practice
    };

    // Maximum retry attempts
    const maxRetries = 2;
    let retries = 0;
    let lastError = null;

    while (retries <= maxRetries) {
      try {
        const result = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${to}`);
        return {
          success: true,
          messageId: result.messageId,
          response: result.response
        };
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${retries + 1}/${maxRetries + 1} failed for ${to}:`, error.message);
        
        if (retries < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, retries) * 1000; // 1s, 2s, 4s, etc.
          console.log(`⏳ Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
        } else {
          // All retries failed
          console.error(`❌ All attempts to send email to ${to} failed`);
          // Return failure object instead of throwing
          return {
            success: false,
            error: error.message,
            messageId: null
          };
        }
      }
    }
  }

  async send2FA(email, data) {
    try {
      const template = await this.loadTemplate('2fa-code');
      const html = this.replaceTemplateVars(template, {
        firstName: data.firstName,
        otp: data.otp,
        expiresIn: '10 minutes'
      });

      const result = await this.sendEmail(
        email,
        'Your Two-Factor Authentication Code',
        html
      );
      
      return result;
    } catch (error) {
      console.error('Error sending 2FA email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendUnlockOTP(email, data) {
    try {
      const template = await this.loadTemplate('unlock-otp');
      const html = this.replaceTemplateVars(template, {
        firstName: data.firstName,
        lastName: data.lastName,
        otp: data.otp,
        adminName: data.adminName,
        reason: data.reason,
        unlockToken: data.unlockToken,
        unlockUrl: `${process.env.FRONTEND_URL}/unlock/${data.unlockToken}`,
        expiresIn: '15 minutes'
      });

      const result = await this.sendEmail(
        email,
        'Account Unlock - Verification Required',
        html
      );
      
      return result;
    } catch (error) {
      console.error('Error sending unlock OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordReset(email, data) {
    try {
      const template = await this.loadTemplate('password-reset');
      const html = this.replaceTemplateVars(template, {
        firstName: data.firstName,
        resetUrl: data.resetUrl,
        expiresIn: '10 minutes'
      });

      const result = await this.sendEmail(
        email,
        'Password Reset Request',
        html
      );
      
      return result;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcome(email, data) {
    try {
      const template = await this.loadTemplate('welcome');
      const html = this.replaceTemplateVars(template, {
        firstName: data.firstName,
        loginUrl: data.loginUrl,
        temporaryPassword: data.temporaryPassword
      });

      const result = await this.sendEmail(
        email,
        'Welcome to AWIB SACCO',
        html
      );
      
      return result;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();