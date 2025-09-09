// Test Brevo API key
const axios = require('axios');
require('dotenv').config();

async function testBrevoAPI() {
  const apiKey = process.env.BREVO_API_KEY;
  
  console.log('Testing Brevo API...');
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
  
  if (!apiKey) {
    console.log('❌ BREVO_API_KEY not found in environment');
    return;
  }
  
  try {
    // Test API key by getting account info
    const response = await axios.get('https://api.brevo.com/v3/account', {
      headers: {
        'Accept': 'application/json',
        'api-key': apiKey
      },
      timeout: 10000
    });
    
    console.log('✅ Brevo API key is valid!');
    console.log('Account info:', {
      email: response.data.email,
      firstName: response.data.firstName,
      lastName: response.data.lastName
    });
    
    // Test sending a simple email
    const testEmail = {
      sender: {
        name: 'AWIB SACCO Test',
        email: process.env.EMAIL_FROM || 'awibsaccos@gmail.com'
      },
      to: [
        {
          email: 'godwinkiwovel@gmail.com',
          name: 'Test User'
        }
      ],
      subject: 'Brevo API Test - AWIB SACCO',
      htmlContent: `
        <h2>Brevo API Test Successful!</h2>
        <p>This email confirms that your Brevo API integration is working correctly.</p>
        <p>Time: ${new Date().toISOString()}</p>
      `,
      textContent: 'Brevo API Test Successful! Your email integration is working.'
    };
    
    const emailResponse = await axios.post('https://api.brevo.com/v3/smtp/email', testEmail, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      timeout: 10000
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', emailResponse.data.messageId);
    
  } catch (error) {
    console.error('❌ Brevo API test failed:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
      console.error('Status:', error.response.status);
    }
  }
}

testBrevoAPI();
