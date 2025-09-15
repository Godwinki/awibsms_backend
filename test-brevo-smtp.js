// Test Brevo SMTP configuration
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testBrevoSMTP() {
  console.log('Testing Brevo SMTP...');
  console.log('HOST:', process.env.EMAIL_HOST);
  console.log('PORT:', process.env.EMAIL_PORT);
  console.log('USER:', process.env.EMAIL_USER);
  console.log('FROM:', process.env.EMAIL_FROM);
  
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

  try {
    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!');
    
    // Send test email
    const mailOptions = {
      from: `"AWIB SACCOS Test" <${process.env.EMAIL_FROM}>`,
      to: 'godwinkiwovel@gmail.com',
      subject: 'Brevo SMTP Test - AWIB SACCO',
      html: `
        <h2>Brevo SMTP Test Successful!</h2>
        <p>This email confirms that your Brevo SMTP integration is working correctly.</p>
        <p>Time: ${new Date().toISOString()}</p>
      `,
      text: 'Brevo SMTP Test Successful! Your email integration is working.'
    };
    
    console.log('📧 Sending test email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ Brevo SMTP test failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response
    });
  }
}

testBrevoSMTP();
