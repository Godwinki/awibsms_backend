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
          }
        });
        console.log('✅ Email service using configured SMTP server:', process.env.EMAIL_HOST);
      } else {
        // Fallback for development
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
      }

      // Verify connection
      await this.transporter.verify();
      console.log('✅ Email service connected successfully');
      this.initialized = true;
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      throw error;
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
      throw new Error('Email service not initialized');
    }

    const mailOptions = {
      from: `"AWIB SACCO" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      throw error;
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

      await this.sendEmail(
        email,
        'Your Two-Factor Authentication Code',
        html
      );
    } catch (error) {
      console.error('Error sending 2FA email:', error);
      throw error;
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

      await this.sendEmail(
        email,
        'Account Unlock - Verification Required',
        html
      );
    } catch (error) {
      console.error('Error sending unlock OTP email:', error);
      throw error;
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

      await this.sendEmail(
        email,
        'Password Reset Request',
        html
      );
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
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

      await this.sendEmail(
        email,
        'Welcome to AWIB SACCO',
        html
      );
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();