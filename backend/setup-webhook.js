// Run this script to set up Green API webhook
// Usage: node setup-webhook.js YOUR_NGROK_URL
// Example: node setup-webhook.js https://abc123.ngrok-free.app

const axios = require('axios');
require('dotenv').config();

const INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const API_TOKEN = process.env.GREEN_API_TOKEN;

async function setupWebhook() {
  const webhookUrl = process.argv[2];
  
  if (!webhookUrl) {
    console.log('❌ Please provide your ngrok URL');
    console.log('Usage: node setup-webhook.js https://your-ngrok-url.ngrok-free.app');
    console.log('\nSteps:');
    console.log('1. Run: ngrok http 5000');
    console.log('2. Copy the https URL (e.g., https://abc123.ngrok-free.app)');
    console.log('3. Run: node setup-webhook.js https://abc123.ngrok-free.app');
    return;
  }

  const fullWebhookUrl = `${webhookUrl}/api/webhook/whatsapp`;
  
  console.log('🔧 Setting up Green API webhook...');
  console.log(`📍 Webhook URL: ${fullWebhookUrl}`);
  console.log(`📱 Instance ID: ${INSTANCE_ID}`);

  try {
    const response = await axios.post(
      `https://api.green-api.com/waInstance${INSTANCE_ID}/setSettings/${API_TOKEN}`,
      {
        webhookUrl: fullWebhookUrl,
        incomingWebhook: 'yes',
        outgoingWebhook: 'no',
        outgoingAPIMessageWebhook: 'no',
        stateWebhook: 'no',
        deviceWebhook: 'no'
      }
    );
    
    console.log('✅ Webhook configured successfully!');
    console.log('Response:', response.data);
    
    // Test sending a message
    console.log('\n📤 Testing connection...');
    const testResponse = await axios.post(
      `https://api.green-api.com/waInstance${INSTANCE_ID}/sendMessage/${API_TOKEN}`,
      {
        chatId: '8106811285@c.us',
        message: '🤖 Bot is now active! Send "hi" to start ordering.'
      }
    );
    console.log('✅ Test message sent!', testResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

setupWebhook();
