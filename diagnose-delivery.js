// Comprehensive delivery diagnostics
const axios = require('axios');
require('dotenv').config();

async function diagnoseSMSDelivery() {
  console.log('🔍 SMS DELIVERY DIAGNOSTICS');
  console.log('=' .repeat(50));
  
  const phoneNumber = '255744958059';
  const formattedPhone = '+255744958059';
  
  console.log('Phone number formats:');
  console.log('- Current format:', phoneNumber);
  console.log('- International format:', formattedPhone);
  
  // Test SMS with different phone formats
  const smsPayload = {
    senderId: 'AWIB SACCOS ',
    messageType: 'text',
    message: 'TEST: AWIB SACCOS delivery test. If you receive this, SMS is working.',
    contacts: formattedPhone, // Try with + prefix
    deliveryReportUrl: ''
  };
  
  try {
    console.log('\n📱 Testing SMS with international format...');
    const response = await axios.post('https://api.kilakona.com/v1/sms', smsPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMS_API_KEY}:${process.env.SMS_API_SECRET}`
      },
      timeout: 10000
    });
    
    console.log('✅ SMS API Response:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('📊 SMS Details:');
      console.log('- Valid contacts:', response.data.data.validContacts);
      console.log('- Invalid contacts:', response.data.data.invalidContacts);
      console.log('- Message size:', response.data.data.messageSize);
      console.log('- Shoot ID:', response.data.data.shootId);
    }
    
  } catch (error) {
    console.error('❌ SMS test failed:', error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
  }
}

async function diagnoseEmailDelivery() {
  console.log('\n🔍 EMAIL DELIVERY DIAGNOSTICS');
  console.log('=' .repeat(50));
  
  const senderEmail = process.env.EMAIL_FROM;
  console.log('Sender email:', senderEmail);
  
  // Check if sender is verified in Brevo
  try {
    console.log('\n📧 Checking Brevo sender verification...');
    const sendersResponse = await axios.get('https://api.brevo.com/v3/senders', {
      headers: {
        'Accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      }
    });
    
    console.log('✅ Brevo senders API response:', sendersResponse.status);
    
    const senders = sendersResponse.data.senders || [];
    const verifiedSender = senders.find(sender => sender.email === senderEmail);
    
    if (verifiedSender) {
      console.log('✅ Sender email is verified in Brevo');
      console.log('Sender details:', {
        email: verifiedSender.email,
        name: verifiedSender.name,
        active: verifiedSender.active
      });
    } else {
      console.log('❌ Sender email NOT verified in Brevo');
      console.log('Available verified senders:');
      senders.forEach(sender => {
        console.log(`- ${sender.email} (${sender.name}) - Active: ${sender.active}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to check Brevo senders:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
  }
  
  // Test email with verified sender
  try {
    console.log('\n📧 Testing email delivery...');
    
    const testEmail = {
      sender: {
        name: 'AWIB SACCOS Test',
        email: senderEmail
      },
      to: [
        {
          email: 'godwinkiwovel@gmail.com',
          name: 'Test User'
        }
      ],
      subject: 'DELIVERY TEST - AWIB SACCO',
      htmlContent: `
        <h2>🧪 Delivery Test</h2>
        <p>If you receive this email, the delivery system is working correctly.</p>
        <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Sender:</strong> ${senderEmail}</p>
      `,
      textContent: `DELIVERY TEST - If you receive this email, the system is working. Test time: ${new Date().toISOString()}`
    };
    
    const emailResponse = await axios.post('https://api.brevo.com/v3/smtp/email', testEmail, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      }
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', emailResponse.data.messageId);
    
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
  }
}

async function runDiagnostics() {
  console.log('🏥 AWIB SACCOS DELIVERY DIAGNOSTICS');
  console.log('Time:', new Date().toISOString());
  console.log('=' .repeat(60));
  
  await diagnoseSMSDelivery();
  await diagnoseEmailDelivery();
  
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('1. Check your phone for SMS (including spam/blocked messages)');
  console.log('2. Check email spam/junk folder');
  console.log('3. Verify sender email in Brevo dashboard');
  console.log('4. Ensure phone number format is correct');
}

runDiagnostics();
