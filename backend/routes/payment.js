const express = require('express');
const crypto = require('crypto');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const whatsapp = require('../services/whatsapp');
const brevoMail = require('../services/brevoMail');
const razorpayService = require('../services/razorpay');
const googleSheets = require('../services/googleSheets');
const chatbotImagesService = require('../services/chatbotImages');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Create Razorpay order for UPI intent payment (no auth required - public endpoint)
router.post('/create-upi-order', async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    
    if (!orderId || !amount) {
      return res.status(400).json({ error: 'Order ID and amount are required' });
    }

    // Verify order exists and is pending payment
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Order already paid' });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpayService.createOrder(amount, orderId);
    
    // Update order with Razorpay order ID
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      configId: process.env.RAZORPAY_CONFIG_ID || null,
      merchantName: process.env.MERCHANT_NAME || 'Restaurant'
    });
  } catch (error) {
    console.error('Create UPI order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify UPI payment (no auth required - public endpoint)
router.post('/verify-upi', async (req, res) => {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Find and update order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.paymentStatus = 'paid';
    order.paymentId = razorpay_payment_id;
    order.razorpayPaymentId = razorpay_payment_id;
    order.status = 'confirmed';
    order.trackingUpdates.push({ 
      status: 'confirmed', 
      message: 'Payment received via UPI', 
      timestamp: new Date() 
    });
    await order.save();

    // Emit event for real-time updates
    const dataEvents = require('../services/eventEmitter');
    dataEvents.emit('orders');
    dataEvents.emit('dashboard');

    // Update Google Sheets
    googleSheets.updateOrderStatus(order.orderId, 'confirmed', 'paid').catch(err =>
      console.error('Google Sheets sync error:', err)
    );

    // Build detailed order confirmation message
    let itemsList = order.items.map(item => 
      `• ${item.name} x${item.quantity} - ₹${item.price * item.quantity}`
    ).join('\n');

    const isPickup = order.serviceType === 'pickup';

    let confirmMsg = `✅ *Payment Successful!*\n\n`;
    confirmMsg += `📦 *Order ID:* ${order.orderId}\n`;
    confirmMsg += `💳 *Payment:* UPI\n`;
    confirmMsg += `💰 *Amount Paid:* ₹${order.totalAmount}\n`;
    
    // Different service labels for pickup vs delivery
    if (isPickup) {
      confirmMsg += `🏪 *Service:* Self-Pickup\n\n`;
    } else {
      confirmMsg += `🚚 *Service:* Delivery\n\n`;
    }
    
    confirmMsg += `━━━━━━━━━━━━━━━\n`;
    confirmMsg += `*Your Items:*\n${itemsList}\n`;
    confirmMsg += `━━━━━━━━━━━━━━━\n\n`;
    
    // Show delivery address only for delivery orders
    if (!isPickup && order.deliveryAddress?.address) {
      confirmMsg += `📍 *Delivery Address:*\n${order.deliveryAddress.address}\n\n`;
    }
    
    // Different closing messages for pickup vs delivery
    if (isPickup) {
      confirmMsg += `✨ Your order has been confirmed!\n\n`;
      confirmMsg += `📍 Please come to the restaurant to pick up your order.\n\n`;
      confirmMsg += `⏰ We will notify you when your order is ready!\n\n`;
      confirmMsg += `Thank you for your order! 🙏`;
    } else {
      confirmMsg += `🙏 Thank you for your order!\nWe're preparing it now.`;
    }

    // Send WhatsApp confirmation
    const confirmedImageUrl = await chatbotImagesService.getImageUrl('payment_success');
    
    try {
      if (confirmedImageUrl) {
        await whatsapp.sendImageWithButtons(order.customer.phone, confirmedImageUrl, confirmMsg, [
          { id: 'track_order', text: 'Track Order' },
          { id: 'view_menu', text: 'Add More Items' },
          { id: 'help', text: 'Help' }
        ]);
      } else {
        await whatsapp.sendButtons(order.customer.phone, confirmMsg, [
          { id: 'track_order', text: 'Track Order' },
          { id: 'view_menu', text: 'Add More Items' },
          { id: 'help', text: 'Help' }
        ]);
      }
    } catch (whatsappErr) {
      console.error('WhatsApp notification failed:', whatsappErr.message);
    }

    // Send email if available
    if (order.customer.email) {
      try {
        await brevoMail.sendOrderConfirmation(order.customer.email, order);
      } catch (emailErr) {
        console.error('Email error:', emailErr.message);
      }
    }

    // Update customer stats
    const customer = await Customer.findOne({ phone: order.customer.phone });
    if (customer) {
      customer.totalOrders = (customer.totalOrders || 0) + 1;
      customer.totalSpent = (customer.totalSpent || 0) + order.totalAmount;
      await customer.save();
    }

    console.log(`✅ UPI Payment verified for order ${order.orderId}`);
    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (error) {
    console.error('Verify UPI payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Razorpay Webhook - receives payment and refund events
router.post('/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'];
      const body = req.body.toString();
      
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.log('❌ Razorpay webhook signature mismatch');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }
    
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('📥 Razorpay webhook event:', event.event);
    
    const payload = event.payload;
    
    // Handle refund events
    if (event.event === 'refund.processed' || event.event === 'refund.created') {
      const refund = payload.refund?.entity;
      const paymentId = refund?.payment_id;
      
      if (!paymentId) {
        console.log('⚠️ No payment ID in refund webhook');
        return res.json({ status: 'ok' });
      }
      
      console.log('💰 Refund webhook received:', { refundId: refund.id, paymentId, amount: refund.amount / 100, status: refund.status });
      
      // Find order by payment ID
      const order = await Order.findOne({ 
        $or: [
          { razorpayPaymentId: paymentId },
          { paymentId: paymentId }
        ]
      });
      
      if (!order) {
        console.log('⚠️ Order not found for payment:', paymentId);
        return res.json({ status: 'ok' });
      }
      
      // Update order with refund details
      if (refund.status === 'processed') {
        order.refundStatus = 'completed';
        order.refundId = refund.id;
        order.refundProcessedAt = new Date();
        order.paymentStatus = 'refunded';
        order.status = 'refunded';
        order.statusUpdatedAt = new Date();
        order.trackingUpdates.push({ 
          status: 'refunded', 
          message: `Refund of ₹${refund.amount / 100} processed. Refund ID: ${refund.id}`, 
          timestamp: new Date() 
        });
        await order.save();
        
        console.log('✅ Order updated with refund:', order.orderId);
        
        // Emit event for real-time updates
        const dataEvents = require('../services/eventEmitter');
        dataEvents.emit('orders');
        dataEvents.emit('dashboard');
        
        // Update Google Sheets - move to refunded sheet
        googleSheets.updateOrderStatus(order.orderId, 'refunded', 'refunded').catch(err =>
          console.error('Google Sheets sync error:', err)
        );
        
        // Notify customer
        try {
          await whatsapp.sendButtons(order.customer.phone,
            `✅ *Refund Successful!*\n\nOrder: ${order.orderId}\nAmount: ₹${refund.amount / 100}\nRefund ID: ${refund.id}\n\n💳 The amount will be credited to your account within 5-7 business days.`,
            [
              { id: 'place_order', text: 'New Order' },
              { id: 'home', text: 'Main Menu' }
            ]
          );
        } catch (whatsappErr) {
          console.error('WhatsApp notification failed:', whatsappErr.message);
        }
      }
      
      return res.json({ status: 'ok' });
    }
    
    // Handle refund failed event
    if (event.event === 'refund.failed') {
      const refund = payload.refund?.entity;
      const paymentId = refund?.payment_id;
      
      if (!paymentId) {
        return res.json({ status: 'ok' });
      }
      
      console.log('❌ Refund failed webhook:', { refundId: refund.id, paymentId, reason: refund.failure_reason });
      
      const order = await Order.findOne({ 
        $or: [
          { razorpayPaymentId: paymentId },
          { paymentId: paymentId }
        ]
      });
      
      if (!order) {
        return res.json({ status: 'ok' });
      }
      
      order.refundStatus = 'failed';
      order.refundError = refund.failure_reason || 'Refund failed';
      order.paymentStatus = 'refund_failed';
      order.status = 'cancelled';
      order.statusUpdatedAt = new Date();
      order.trackingUpdates.push({ 
        status: 'refund_failed', 
        message: `Refund failed: ${refund.failure_reason || 'Unknown error'}`, 
        timestamp: new Date() 
      });
      await order.save();
      
      // Emit event for real-time updates
      const dataEvents = require('../services/eventEmitter');
      dataEvents.emit('orders');
      dataEvents.emit('dashboard');
      
      // Update Google Sheets - move to refundfailed sheet
      googleSheets.updateOrderStatus(order.orderId, 'refund_failed', 'refund_failed').catch(err =>
        console.error('Google Sheets sync error:', err)
      );
      
      // Notify customer
      try {
        await whatsapp.sendButtons(order.customer.phone,
          `⚠️ *Refund Issue*\n\nOrder: ${order.orderId}\nAmount: ₹${order.totalAmount}\n\nWe couldn't process your refund automatically.\nOur team will contact you within 24 hours to resolve this.`,
          [
            { id: 'place_order', text: 'New Order' },
            { id: 'home', text: 'Main Menu' }
          ]
        );
      } catch (whatsappErr) {
        console.error('WhatsApp notification failed:', whatsappErr.message);
      }
      
      return res.json({ status: 'ok' });
    }
    
    // Handle payment captured event (backup for callback)
    if (event.event === 'payment.captured') {
      const payment = payload.payment?.entity;
      const paymentLinkId = payment?.notes?.payment_link_id || payment?.payment_link_id;
      
      if (paymentLinkId) {
        const order = await Order.findOne({ razorpayOrderId: paymentLinkId });
        if (order && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.razorpayPaymentId = payment.id;
          order.status = 'confirmed';
          order.trackingUpdates.push({ status: 'confirmed', message: 'Payment received via webhook', timestamp: new Date() });
          await order.save();
          
          console.log('✅ Payment captured via webhook:', order.orderId);
          
          // Emit event for real-time updates
          const dataEvents = require('../services/eventEmitter');
          dataEvents.emit('orders');
          dataEvents.emit('dashboard');
          
          // Update Google Sheets
          googleSheets.updateOrderStatus(order.orderId, 'confirmed', 'paid').catch(err =>
            console.error('Google Sheets sync error:', err)
          );
        }
      }
      
      return res.json({ status: 'ok' });
    }
    
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Razorpay webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_payment_link_id, razorpay_payment_link_status } = req.query;
    
    if (razorpay_payment_link_status === 'paid') {
      const order = await Order.findOne({ razorpayOrderId: razorpay_payment_link_id });
      if (order) {
        order.paymentStatus = 'paid';
        order.paymentId = razorpay_payment_id;
        order.razorpayPaymentId = razorpay_payment_id; // Store for refunds
        order.status = 'confirmed';
        order.trackingUpdates.push({ status: 'confirmed', message: 'Payment received, order confirmed' });
        await order.save();

        // Emit event for real-time updates
        const dataEvents = require('../services/eventEmitter');
        dataEvents.emit('orders');
        dataEvents.emit('dashboard');

        // Update Google Sheets
        googleSheets.updateOrderStatus(order.orderId, 'confirmed', 'paid').catch(err =>
          console.error('Google Sheets sync error:', err)
        );

        // Build detailed order confirmation message
        let itemsList = order.items.map(item => 
          `• ${item.name} x${item.quantity} - ₹${item.price * item.quantity}`
        ).join('\n');

        const isPickup = order.serviceType === 'pickup';

        let confirmMsg = `✅ *Payment Successful!*\n\n`;
        confirmMsg += `📦 *Order ID:* ${order.orderId}\n`;
        confirmMsg += `💳 *Payment:* UPI/Online\n`;
        confirmMsg += `💰 *Amount Paid:* ₹${order.totalAmount}\n`;
        
        // Different service labels for pickup vs delivery
        if (isPickup) {
          confirmMsg += `🏪 *Service:* Self-Pickup\n\n`;
        } else {
          confirmMsg += `🚚 *Service:* Delivery\n\n`;
        }
        
        confirmMsg += `━━━━━━━━━━━━━━━\n`;
        confirmMsg += `*Your Items:*\n${itemsList}\n`;
        confirmMsg += `━━━━━━━━━━━━━━━\n\n`;
        
        // Show delivery address only for delivery orders
        if (!isPickup && order.deliveryAddress?.address) {
          confirmMsg += `📍 *Delivery Address:*\n${order.deliveryAddress.address}\n\n`;
        }
        
        // Different closing messages for pickup vs delivery
        if (isPickup) {
          confirmMsg += `✨ Your order has been confirmed!\n\n`;
          confirmMsg += `📍 Please come to the restaurant to pick up your order.\n\n`;
          confirmMsg += `⏰ We will notify you when your order is ready!\n\n`;
          confirmMsg += `Thank you for your order! 🙏`;
        } else {
          confirmMsg += `🙏 Thank you for your order!\nWe're preparing it now.`;
        }

        // Send WhatsApp confirmation with image and buttons
        const confirmedImageUrl = await chatbotImagesService.getImageUrl('payment_success');
        
        if (confirmedImageUrl) {
          await whatsapp.sendImageWithButtons(order.customer.phone, confirmedImageUrl, confirmMsg, [
            { id: 'track_order', text: 'Track Order' },
            { id: 'view_menu', text: 'Add More Items' },
            { id: 'help', text: 'Help' }
          ]);
        } else {
          await whatsapp.sendButtons(order.customer.phone, confirmMsg, [
            { id: 'track_order', text: 'Track Order' },
            { id: 'view_menu', text: 'Add More Items' },
            { id: 'help', text: 'Help' }
          ]);
        }

        // Send email if available
        if (order.customer.email) {
          try {
            await brevoMail.sendOrderConfirmation(order.customer.email, order);
          } catch (emailErr) {
            console.error('Email error:', emailErr.message);
          }
        }

        // Update customer stats
        const customer = await Customer.findOne({ phone: order.customer.phone });
        if (customer) {
          customer.totalOrders = (customer.totalOrders || 0) + 1;
          customer.totalSpent = (customer.totalSpent || 0) + order.totalAmount;
          await customer.save();
        }
        
        console.log(`✅ Payment confirmed for order ${order.orderId}`);
      }
    }
    
    res.send(`
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f9f0; }
            .success { color: #22c55e; font-size: 48px; }
            h1 { color: #166534; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="success">✅</div>
          <h1>Payment Successful!</h1>
          <p>Your order has been confirmed.</p>
          <p>Check WhatsApp for order details.</p>
          <p style="margin-top: 30px; color: #999;">You can close this window.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Payment callback error:', error);
    res.send('<html><body><h1>Payment Error</h1><p>Please contact support.</p></body></html>');
  }
});

router.post('/refund/:orderId', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!order.razorpayPaymentId && !order.paymentId) return res.status(400).json({ error: 'No payment found' });

    const paymentId = order.razorpayPaymentId || order.paymentId;
    
    // Process refund immediately via Razorpay
    try {
      const refund = await razorpayService.refund(paymentId, order.totalAmount);
      
      order.status = 'refunded';
      order.refundStatus = 'completed';
      order.refundId = refund.id;
      order.refundAmount = order.totalAmount;
      order.refundRequestedAt = new Date();
      order.refundProcessedAt = new Date();
      order.paymentStatus = 'refunded';
      order.statusUpdatedAt = new Date();
      order.trackingUpdates.push({ status: 'refunded', message: `Refund of ₹${order.totalAmount} processed. Refund ID: ${refund.id}`, timestamp: new Date() });
      await order.save();

      // Emit event for real-time updates
      const dataEvents = require('../services/eventEmitter');
      dataEvents.emit('orders');
      dataEvents.emit('dashboard');

      // Update Google Sheets - move to refunded sheet
      googleSheets.updateOrderStatus(order.orderId, 'refunded', 'refunded').catch(err =>
        console.error('Google Sheets sync error:', err)
      );

      await whatsapp.sendButtons(order.customer.phone,
        `✅ *Refund Successful!*\n\nOrder: ${order.orderId}\nAmount: ₹${order.totalAmount}\nRefund ID: ${refund.id}\n\n💳 The amount will be credited to your account within 5-7 business days.`,
        [
          { id: 'place_order', text: 'New Order' },
          { id: 'home', text: 'Main Menu' }
        ]
      );

      res.json({ success: true, message: 'Refund processed', refundId: refund.id, orderId: order.orderId });
    } catch (refundError) {
      console.error('Refund failed:', refundError.message);
      
      order.status = 'cancelled';
      order.refundStatus = 'failed';
      order.refundAmount = order.totalAmount;
      order.refundRequestedAt = new Date();
      order.refundError = refundError.message;
      order.paymentStatus = 'refund_failed';
      order.statusUpdatedAt = new Date();
      order.trackingUpdates.push({ status: 'refund_failed', message: `Refund failed: ${refundError.message}`, timestamp: new Date() });
      await order.save();

      // Emit event for real-time updates
      const dataEvents = require('../services/eventEmitter');
      dataEvents.emit('orders');
      dataEvents.emit('dashboard');

      // Update Google Sheets - move to refundfailed sheet
      googleSheets.updateOrderStatus(order.orderId, 'refund_failed', 'refund_failed').catch(err =>
        console.error('Google Sheets sync error:', err)
      );

      await whatsapp.sendButtons(order.customer.phone,
        `⚠️ *Refund Issue*\n\nOrder: ${order.orderId}\nAmount: ₹${order.totalAmount}\n\nWe couldn't process your refund automatically.\nOur team will contact you within 24 hours to resolve this.`,
        [
          { id: 'place_order', text: 'New Order' },
          { id: 'home', text: 'Main Menu' }
        ]
      );

      res.status(500).json({ success: false, error: refundError.message, orderId: order.orderId });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process refund for pending refund orders (admin can trigger this)
router.post('/process-refund/:orderId', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (order.refundStatus === 'completed') {
      return res.status(400).json({ error: 'Order already refunded' });
    }
    
    const paymentId = order.razorpayPaymentId || order.paymentId;
    if (!paymentId) return res.status(400).json({ error: 'No payment ID found' });

    // Process refund via Razorpay
    try {
      const refund = await razorpayService.refund(paymentId, order.totalAmount);
      
      order.status = 'refunded';
      order.refundStatus = 'completed';
      order.refundId = refund.id;
      order.refundAmount = order.totalAmount;
      order.refundProcessedAt = new Date();
      order.paymentStatus = 'refunded';
      order.statusUpdatedAt = new Date();
      order.trackingUpdates.push({ status: 'refunded', message: `Refund of ₹${order.totalAmount} processed. Refund ID: ${refund.id}`, timestamp: new Date() });
      await order.save();

      // Emit event for real-time updates
      const dataEvents = require('../services/eventEmitter');
      dataEvents.emit('orders');
      dataEvents.emit('dashboard');

      // Update Google Sheets - move to refunded sheet
      googleSheets.updateOrderStatus(order.orderId, 'refunded', 'refunded').catch(err =>
        console.error('Google Sheets sync error:', err)
      );

      await whatsapp.sendButtons(order.customer.phone,
        `✅ *Refund Successful!*\n\nOrder: ${order.orderId}\nAmount: ₹${order.totalAmount}\nRefund ID: ${refund.id}\n\n💳 The amount will be credited to your account within 5-7 business days.`,
        [
          { id: 'place_order', text: 'New Order' },
          { id: 'home', text: 'Main Menu' }
        ]
      );

      res.json({ success: true, message: 'Refund processed', refundId: refund.id });
    } catch (refundError) {
      console.error('Refund processing failed:', refundError.message);
      
      order.refundStatus = 'failed';
      order.refundError = refundError.message;
      order.paymentStatus = 'refund_failed';
      order.status = 'cancelled';
      order.statusUpdatedAt = new Date();
      order.trackingUpdates.push({ status: 'refund_failed', message: `Refund failed: ${refundError.message}`, timestamp: new Date() });
      await order.save();

      // Emit event for real-time updates
      const dataEvents = require('../services/eventEmitter');
      dataEvents.emit('orders');
      dataEvents.emit('dashboard');

      // Update Google Sheets - move to refundfailed sheet
      googleSheets.updateOrderStatus(order.orderId, 'refund_failed', 'refund_failed').catch(err =>
        console.error('Google Sheets sync error:', err)
      );

      res.status(500).json({ success: false, error: refundError.message });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
