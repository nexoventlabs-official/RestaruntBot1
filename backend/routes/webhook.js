const express = require('express');
const chatbot = require('../services/chatbot');
const whatsapp = require('../services/whatsapp');
const googleSheets = require('../services/googleSheets');
const metaCloud = require('../services/metaCloud');
const groqAi = require('../services/groqAi');
const router = express.Router();

// Test Google Sheets connection
router.get('/test-sheets', async (req, res) => {
  try {
    const testOrder = {
      orderId: 'TEST' + Date.now(),
      customer: { phone: '1234567890', name: 'Test Customer' },
      items: [{ name: 'Test Item', quantity: 1, price: 100 }],
      totalAmount: 100,
      serviceType: 'delivery',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      status: 'pending',
      deliveryAddress: { address: 'Test Address', latitude: 0, longitude: 0 }
    };

    const result = await googleSheets.addOrder(testOrder);
    res.json({ success: result, message: result ? 'Test order added to Google Sheet!' : 'Failed to add order' });
  } catch (error) {
    console.error('Google Sheets test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint - send a test message
router.get('/test/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    await whatsapp.sendMessage(phone, '✅ Test message from your Restaurant Bot!');
    res.json({ success: true, message: 'Test message sent to ' + phone });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint - send welcome menu with buttons
router.get('/test-menu/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    await chatbot.handleMessage(phone, 'hi', 'text', null);
    res.json({ success: true, message: 'Welcome menu sent to ' + phone });
  } catch (error) {
    console.error('Test menu error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Simulate incoming message (for testing when Meta test number doesn't forward messages)
router.post('/simulate', async (req, res) => {
  try {
    const { phone, message, selectedId } = req.body;
    const messageType = selectedId ? 'list' : 'text';
    console.log('🧪 Simulating message:', { phone, message, messageType, selectedId });
    await chatbot.handleMessage(phone, message || '', messageType, selectedId || null);
    res.json({ success: true, message: 'Simulated message processed' });
  } catch (error) {
    console.error('Simulate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to check customer state
router.get('/debug/:phone', async (req, res) => {
  try {
    const Customer = require('../models/Customer');
    const customer = await Customer.findOne({ phone: req.params.phone }).populate('cart.menuItem');
    if (!customer) {
      return res.json({ error: 'Customer not found' });
    }
    res.json({
      phone: customer.phone,
      cart: customer.cart,
      conversationState: customer.conversationState
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check for webhook
router.get('/whatsapp', (req, res) => {
  res.json({ status: 'Webhook is active', timestamp: new Date().toISOString() });
});

// Meta WhatsApp Cloud API webhook verification
router.get('/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verify token should match what you set in Meta dashboard
  const verifyToken = process.env.META_VERIFY_TOKEN || 'restaurant_bot_verify';

  console.log('🔐 Webhook verification attempt:', { mode, token, expectedToken: verifyToken, challenge: challenge ? 'present' : 'missing' });

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Meta webhook verified');
    res.status(200).send(challenge);
  } else if (!mode && !token) {
    // Simple health check (no verification params)
    res.json({ status: 'Webhook endpoint active', timestamp: new Date().toISOString() });
  } else {
    console.log('❌ Meta webhook verification failed - token mismatch');
    res.sendStatus(403);
  }
});

// Meta WhatsApp Cloud API webhook endpoint
router.post('/meta', async (req, res) => {
  console.log('📥 Webhook POST received');
  console.log('📥 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📥 Body:', JSON.stringify(req.body, null, 2));
  console.log('📥 Query:', JSON.stringify(req.query, null, 2));
  
  // 1. Respond to Meta IMMEDIATELY to avoid timeouts (prevents 'single tick' issue)
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;

            // Skip status updates (delivery receipts, read receipts)
            if (value.statuses) {
              continue;
            }

            // Extract contact name from Meta API contacts array
            const contacts = value.contacts || [];
            const contactsMap = {};
            for (const contact of contacts) {
              if (contact.wa_id && contact.profile?.name) {
                contactsMap[contact.wa_id] = contact.profile.name;
              }
            }

            for (const message of value.messages || []) {
              const phone = message.from;
              const senderName = contactsMap[phone] || null;
              let text = '';
              let messageType = 'text';
              let selectedId = null;

              if (message.type === 'text') {
                text = message.text?.body || '';
              } else if (message.type === 'interactive') {
                if (message.interactive?.type === 'button_reply') {
                  selectedId = message.interactive.button_reply?.id || '';
                  text = message.interactive.button_reply?.title || '';
                  messageType = 'button';
                } else if (message.interactive?.type === 'list_reply') {
                  selectedId = message.interactive.list_reply?.id || '';
                  text = message.interactive.list_reply?.title || '';
                  messageType = 'list';
                }
              } else if (message.type === 'location') {
                messageType = 'location';
                text = {
                  latitude: message.location?.latitude,
                  longitude: message.location?.longitude,
                  name: message.location?.name || '',
                  address: message.location?.address || ''
                };
              } else if (message.type === 'audio') {
                // Handle voice message
                messageType = 'voice';
                const audioId = message.audio?.id;
                console.log('🎤 Voice message received, audio ID:', audioId);
                
                if (audioId) {
                  try {
                    // Download and transcribe the audio
                    const audioBuffer = await metaCloud.downloadMedia(audioId);
                    let transcription = await groqAi.transcribeAudio(audioBuffer, message.audio?.mime_type || 'audio/ogg');
                    
                    if (transcription && transcription.trim()) {
                      // Normalize transcription to fix common voice recognition mistakes
                      const rawTranscription = transcription.trim();
                      transcription = groqAi.normalizeTranscription(rawTranscription);
                      
                      text = transcription;
                      messageType = 'text'; // Treat as text after transcription
                      console.log('🎤 Voice transcribed:', rawTranscription);
                      console.log('🎤 Normalized to:', text);
                    } else {
                      // Transcription failed, send error message
                      await whatsapp.sendButtons(phone, 
                        "🎤 Sorry, I couldn't understand your voice message. Please try again or type your message.",
                        [
                          { id: 'home', text: 'Main Menu' },
                          { id: 'help', text: 'Help' }
                        ]
                      );
                      continue;
                    }
                  } catch (err) {
                    console.error('❌ Voice processing error:', err.message);
                    await whatsapp.sendButtons(phone,
                      "🎤 Sorry, I couldn't process your voice message. Please type your message instead.",
                      [
                        { id: 'home', text: 'Main Menu' },
                        { id: 'help', text: 'Help' }
                      ]
                    );
                    continue;
                  }
                }
              }

              const hasContent = text || selectedId || messageType === 'location';
              if (phone && hasContent) {
                // Process message in the background
                chatbot.handleMessage(phone, text, messageType, selectedId, senderName)
                  .catch(err => console.error('❌ Async Chatbot Error:', err));
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Meta webhook async processing error:', error);
  }
});

module.exports = router;
