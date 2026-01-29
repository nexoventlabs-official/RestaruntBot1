const express = require('express');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const whatsapp = require('../services/whatsapp');
const brevoMail = require('../services/brevoMail');
const googleSheets = require('../services/googleSheets');
const razorpayService = require('../services/razorpay');
const chatbotImagesService = require('../services/chatbotImages');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Helper to send message with optional image and CTA URL
const sendWithOptionalImageCta = async (phone, imageUrl, message, buttonText, url, footer = '') => {
  if (imageUrl) {
    await whatsapp.sendImageWithCtaUrl(phone, imageUrl, message, buttonText, url, footer);
  } else {
    await whatsapp.sendCtaUrl(phone, message, buttonText, url, footer);
  }
};

// Helper to send message with optional image
const sendWithOptionalImage = async (phone, imageUrl, message, buttons, footer = '') => {
  if (imageUrl) {
    await whatsapp.sendImageWithButtons(phone, imageUrl, message, buttons, footer);
  } else {
    await whatsapp.sendButtons(phone, message, buttons, footer);
  }
};

// Lightweight endpoint to check for updates (returns hash only)
router.get('/check-updates', authMiddleware, async (req, res) => {
  try {
    const { status, lastHash } = req.query;
    const query = { isHidden: { $ne: true } };
    if (status) query.status = status;
    
    // Get count and latest update timestamp - very lightweight query
    const [count, latestOrder] = await Promise.all([
      Order.countDocuments(query),
      Order.findOne(query).sort({ updatedAt: -1 }).select('updatedAt').lean()
    ]);
    
    // Create a simple hash from count + latest update time
    const latestTime = latestOrder?.updatedAt?.getTime() || 0;
    const currentHash = `${count}-${latestTime}`;
    
    // If hash matches, no changes
    if (lastHash === currentHash) {
      return res.json({ hasChanges: false, hash: currentHash });
    }
    
    res.json({ hasChanges: true, hash: currentHash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { isHidden: { $ne: true } };
    if (status) query.status = status;
    const orders = await Order.find(query)
      .populate('items.menuItem', 'image')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Order.countDocuments(query);
    
    // Include hash for client-side change detection
    const latestOrder = orders[0];
    const hash = `${total}-${latestOrder?.updatedAt?.getTime() || 0}`;
    
    res.json({ orders, total, pages: Math.ceil(total / limit), hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get refunds with filter - MUST be before /:id route
router.get('/refunds', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = { refundStatus: { $ne: 'none' } };
    
    if (status === 'pending') {
      query.refundStatus = { $in: ['pending', 'scheduled'] };
    } else if (status === 'completed') {
      query.refundStatus = 'completed';
    } else if (status === 'rejected') {
      query.refundStatus = 'rejected';
    } else if (status === 'failed') {
      query.refundStatus = 'failed';
    }
    // 'all' returns all non-none refund statuses
    
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending refund requests - MUST be before /:id route
router.get('/refunds/pending', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ refundStatus: 'pending' }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    let order;
    
    // Try to find by MongoDB _id first, then by orderId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // Looks like a MongoDB ObjectId
      order = await Order.findById(id);
    }
    
    // If not found or not a valid ObjectId, try finding by orderId
    if (!order) {
      order = await Order.findOne({ orderId: id });
    }
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/status', authMiddleware, async (req, res) => {
  console.log('🔄 PUT /orders/:id/status called with id:', req.params.id, 'body:', req.body);
  try {
    const { status, message, actualPaymentMethod } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    console.log('📋 Found order:', order.orderId, 'current status:', order.status, 'new status:', status);

    const statusLabels = {
      pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing', ready: 'Ready',
      out_for_delivery: 'On the Way', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded'
    };

    order.status = status;
    order.trackingUpdates.push({ status, message: message || `Status updated to ${statusLabels[status] || status}` });
    
    // Handle actual payment method for pickup orders
    if (actualPaymentMethod && order.serviceType === 'pickup') {
      order.actualPaymentMethod = actualPaymentMethod;
      order.paymentStatus = 'paid';
      order.trackingUpdates.push({ 
        status: 'paid', 
        message: `Payment collected via ${actualPaymentMethod === 'cash' ? 'Cash' : 'UPI'} at hotel` 
      });
      console.log(`💰 Pickup order payment: ${actualPaymentMethod}`);
    }
    
    // Track when status changed to delivered/cancelled/refunded for auto-cleanup
    if (status === 'delivered' || status === 'cancelled' || status === 'refunded') {
      order.statusUpdatedAt = new Date();
    }
    
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      // Auto-mark COD orders as paid when delivered (for delivery orders)
      if (order.paymentMethod === 'cod' && order.serviceType !== 'pickup') {
        order.paymentStatus = 'paid';
        order.trackingUpdates.push({ status: 'paid', message: 'COD payment collected on delivery' });
      }
      
      // Track today's revenue for delivered + paid orders
      if (order.paymentStatus === 'paid') {
        try {
          const DashboardStats = require('../models/DashboardStats');
          const getTodayString = () => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          };
          
          let stats = await DashboardStats.findOne();
          if (!stats) {
            stats = new DashboardStats({ todayDate: getTodayString() });
          }
          
          const today = getTodayString();
          if (stats.todayDate !== today) {
            stats.todayRevenue = 0;
            stats.todayOrders = 0;
            stats.todayDate = today;
          }
          
          stats.todayRevenue += order.totalAmount || 0;
          stats.todayOrders += 1;
          stats.lastUpdated = new Date();
          await stats.save();
          
          console.log(`📊 Today's revenue updated: +₹${order.totalAmount} (Total: ₹${stats.todayRevenue})`);
        } catch (statsErr) {
          console.error('Error updating today revenue:', statsErr.message);
        }
      }
    }
    
    // Mark COD orders as cancelled payment status when order is cancelled
    if (status === 'cancelled' && order.paymentMethod === 'cod' && order.paymentStatus === 'pending') {
      order.paymentStatus = 'cancelled';
    }
    
    // Send push notification to delivery partner if order is cancelled and was assigned
    if (status === 'cancelled' && order.assignedTo) {
      try {
        const DeliveryBoy = require('../models/DeliveryBoy');
        const pushNotification = require('../services/pushNotification');
        
        const deliveryBoy = await DeliveryBoy.findById(order.assignedTo);
        if (deliveryBoy && deliveryBoy.pushToken) {
          await pushNotification.sendOrderCancelledNotification(deliveryBoy.pushToken, {
            orderId: order.orderId,
            totalAmount: order.totalAmount
          });
          console.log(`📱 Cancelled notification sent to ${deliveryBoy.name}`);
        }
      } catch (pushErr) {
        console.error('Push notification error for cancelled order:', pushErr.message);
      }
    }
    
    // For paid UPI orders that are cancelled, mark refund as pending (wait for Razorpay)
    if (status === 'cancelled' && order.paymentStatus === 'paid' && order.razorpayPaymentId) {
      console.log('💰 Marking refund as pending for order:', order.orderId);
      
      order.refundStatus = 'pending';
      order.refundAmount = order.totalAmount;
      order.refundRequestedAt = new Date();
      order.paymentStatus = 'refund_processing';
      order.trackingUpdates.push({ 
        status: 'refund_processing', 
        message: `Refund of ₹${order.totalAmount} is being processed`, 
        timestamp: new Date() 
      });
      console.log('⏳ Refund pending for order:', order.orderId);
    }
    
    try {
      await order.save();
      console.log('✅ Order saved to DB:', order.orderId, 'status:', order.status, 'paymentStatus:', order.paymentStatus);
    } catch (saveErr) {
      console.error('❌ Order save error:', saveErr.message);
      return res.status(500).json({ error: 'Failed to save order: ' + saveErr.message });
    }

    // Sync status update to Google Sheets
    try {
      console.log('📊 Syncing to Google Sheets:', order.orderId, order.status, order.paymentStatus);
      const sheetUpdated = await googleSheets.updateOrderStatus(order.orderId, order.status, order.paymentStatus, actualPaymentMethod);
      if (sheetUpdated) {
        console.log('✅ Google Sheets synced successfully');
      } else {
        console.log('⚠️ Google Sheets update returned false - order may not exist in sheet');
      }
    } catch (err) {
      console.error('❌ Google Sheets sync error:', err.message);
    }

    // Notify customer via WhatsApp (don't fail if notification fails)
    const statusMessages = {
      confirmed: '✅ Your order has been confirmed!',
      preparing: '👨‍🍳 Your order is being prepared!',
      ready: '📦 Your order is ready!',
      out_for_delivery: '🛵 Your order is on the way!',
      delivered: '✅ Your order has been delivered! Enjoy!',
      cancelled: '❌ Your order has been cancelled.'
    };
    
    // Pickup-specific status messages
    const pickupStatusMessages = {
      confirmed: '✅ Your pickup order has been confirmed!',
      ready: '📦 Your order is ready for pickup!\n\n🏪 Please come to the restaurant to collect your order.',
      delivered: '✅ Order completed! Thank you for picking up your order!',
      cancelled: '❌ Your pickup order has been cancelled.\n\n🏪 If you have any questions, please contact the restaurant.'
    };
    
    const isPickupOrder = order.serviceType === 'pickup';
    const messages = isPickupOrder ? pickupStatusMessages : statusMessages;
    
    if (messages[status]) {
      try {
        let msg = `*Order Update*\n\nOrder: ${order.orderId}\n${messages[status]}`;
        
        // Add order details and bill for delivered/completed orders
        if (status === 'delivered') {
          msg += `\n\n━━━━━━━━━━━━━━━\n📋 *Order Details*\n━━━━━━━━━━━━━━━\n`;
          
          // Add each item
          order.items.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            msg += `${index + 1}. ${item.name}\n`;
            msg += `   ${item.quantity} × ₹${item.price} = ₹${itemTotal}\n`;
          });
          
          msg += `\n━━━━━━━━━━━━━━━\n`;
          msg += `💰 *Total Bill: ₹${order.totalAmount}*\n`;
          
          if (isPickupOrder) {
            msg += `🏪 Service: Self-Pickup\n`;
            msg += `💳 Payment: ${order.paymentMethod === 'cod' ? 'Paid at Hotel' : 'UPI'} (${order.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'})\n`;
          } else {
            msg += `💳 Payment: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI'} (${order.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'})\n`;
          }
          
          msg += `━━━━━━━━━━━━━━━\n`;
          msg += `\n🙏 Thank you for ordering!\nWe hope you enjoy your meal! 🍽️`;
          
          // Send combined message with image and review CTA button
          const frontendUrl = process.env.FRONTEND_URL || 'https://restarunt-bot1.vercel.app';
          const reviewUrl = `${frontendUrl}/review/${order.customer.phone}/${order.orderId}`;
          
          // Use pickup_completed image for pickup orders, delivered image for delivery orders
          const deliveredImageKey = isPickupOrder ? 'pickup_completed' : 'delivered';
          const deliveredImageUrl = await chatbotImagesService.getImageUrl(deliveredImageKey);
          
          await sendWithOptionalImageCta(
            order.customer.phone,
            deliveredImageUrl,
            msg,
            'Leave a Review ⭐',
            reviewUrl,
            'Your feedback helps us improve!'
          );
        } else if (status === 'confirmed' && isPickupOrder) {
          // Send pickup confirmed notification with image
          const confirmedImageUrl = await chatbotImagesService.getImageUrl('pickup_confirmed');
          await sendWithOptionalImage(
            order.customer.phone,
            confirmedImageUrl,
            msg,
            [
              { id: 'track_order', text: '📍 Track Order' },
              { id: 'home', text: '🏠 Main Menu' }
            ]
          );
        } else if (status === 'ready' && isPickupOrder) {
          // Send special notification for pickup orders when ready
          const readyImageUrl = await chatbotImagesService.getImageUrl('pickup_ready');
          await sendWithOptionalImage(
            order.customer.phone,
            readyImageUrl,
            msg,
            [
              { id: 'track_order', text: '📍 View Order' },
              { id: 'home', text: '🏠 Main Menu' }
            ]
          );
        } else if (status === 'out_for_delivery') {
          // Send image with track order button for out_for_delivery status
          const frontendUrl = process.env.FRONTEND_URL || 'https://restarunt-bot1.vercel.app';
          const trackOrderUrl = `${frontendUrl}/track/${order.orderId}`;
          const deliveryImageUrl = await chatbotImagesService.getImageUrl('out_for_delivery');
          
          await sendWithOptionalImageCta(
            order.customer.phone,
            deliveryImageUrl,
            msg,
            'Track Your Order 📍',
            trackOrderUrl,
            'Tap to track your delivery'
          );
        } else if (status === 'preparing') {
          // Send image with track order button for preparing status
          const frontendUrl = process.env.FRONTEND_URL || 'https://restarunt-bot1.vercel.app';
          const trackOrderUrl = `${frontendUrl}/track/${order.orderId}`;
          const preparingImageUrl = await chatbotImagesService.getImageUrl('preparing');
          
          await sendWithOptionalImageCta(
            order.customer.phone,
            preparingImageUrl,
            msg,
            'Track Your Order 📍',
            trackOrderUrl,
            'Tap to track your order'
          );
        } else if (status === 'ready') {
          // Send image with track order button for ready status
          const frontendUrl = process.env.FRONTEND_URL || 'https://restarunt-bot1.vercel.app';
          const trackOrderUrl = `${frontendUrl}/track/${order.orderId}`;
          const readyImageUrl = await chatbotImagesService.getImageUrl('ready');
          
          await sendWithOptionalImageCta(
            order.customer.phone,
            readyImageUrl,
            msg,
            'Track Your Order 📍',
            trackOrderUrl,
            'Tap to track your order'
          );
        } else if (status === 'cancelled') {
          // Add refund info if order was cancelled with pending refund
          if (order.refundStatus === 'pending' && order.paymentStatus === 'refund_processing') {
            msg += `\n\n💰 *Refund Processing*\nAmount: ₹${order.totalAmount}\n\n⏱️ Your refund will be processed within 5-7 business days.`;
          } else if (order.refundStatus === 'failed') {
            msg += `\n\n⚠️ *Refund Issue*\nWe couldn't process your refund automatically.\nAmount: ₹${order.totalAmount}\n\nOur team will contact you within 24 hours to resolve this.`;
          }
          
          // Use pickup-specific cancelled image if it's a pickup order
          const cancelledImageKey = isPickupOrder ? 'pickup_cancelled' : 'order_cancelled';
          const cancelledImageUrl = await chatbotImagesService.getImageUrl(cancelledImageKey);
          if (cancelledImageUrl) {
            await whatsapp.sendImage(order.customer.phone, cancelledImageUrl, msg);
          } else {
            await whatsapp.sendMessage(order.customer.phone, msg);
          }
        } else {
          // Other statuses (confirmed, etc.)
          await whatsapp.sendMessage(order.customer.phone, msg);
        }
      } catch (whatsappError) {
        console.error('WhatsApp notification failed:', whatsappError.message);
      }
    }

    // Send email if available (don't fail if email fails)
    if (order.customer.email) {
      try {
        await brevoMail.sendStatusUpdate(order.customer.email, order.orderId, status, statusMessages[status] || '');
      } catch (emailError) {
        console.error('Email notification failed:', emailError.message);
      }
    }

    // Emit event for real-time updates
    const dataEvents = require('../services/eventEmitter');
    dataEvents.emit('orders');
    dataEvents.emit('dashboard');

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign delivery partner to order
router.put('/:id/assign-delivery', authMiddleware, async (req, res) => {
  try {
    const { deliveryBoyId } = req.body;
    const DeliveryBoy = require('../models/DeliveryBoy');
    const pushNotification = require('../services/pushNotification');
    
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) return res.status(404).json({ error: 'Delivery partner not found' });
    
    if (!deliveryBoy.isActive) {
      return res.status(400).json({ error: 'Delivery partner is not active' });
    }
    
    order.assignedTo = deliveryBoy._id;
    order.deliveryPartnerName = deliveryBoy.name;
    order.assignedAt = new Date();
    order.trackingUpdates.push({ 
      status: order.status, 
      message: `Assigned to delivery partner: ${deliveryBoy.name}` 
    });
    
    await order.save();
    
    // Prepare order details for notifications
    const orderDetails = {
      orderId: order.orderId,
      customerName: order.customer?.name || 'Customer',
      customerPhone: order.customer?.phone || '',
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      deliveryAddress: order.deliveryAddress?.address || order.customer?.address || 'N/A',
      items: order.items || []
    };
    
    // Send push notification to delivery partner
    if (deliveryBoy.pushToken) {
      try {
        await pushNotification.sendNewOrderNotification(deliveryBoy.pushToken, orderDetails);
        console.log(`📱 Push notification sent to ${deliveryBoy.name}`);
      } catch (pushErr) {
        console.error('Push notification error:', pushErr.message);
      }
    }
    
    // Send email notification to delivery partner
    if (deliveryBoy.email) {
      try {
        await brevoMail.sendDeliveryPartnerNotification(
          deliveryBoy.email,
          deliveryBoy.name,
          orderDetails
        );
        console.log(`📧 Email notification sent to ${deliveryBoy.email}`);
      } catch (emailErr) {
        console.error('Email notification error:', emailErr.message);
      }
    }
    
    // Update Google Sheets with delivery partner
    try {
      await googleSheets.updateDeliveryPartner(order.orderId, deliveryBoy.name);
    } catch (err) {
      console.error('Google Sheets delivery partner update error:', err.message);
    }
    
    // Emit event for real-time updates
    const dataEvents = require('../services/eventEmitter');
    dataEvents.emit('orders');
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/delivery-time', authMiddleware, async (req, res) => {
  try {
    const { estimatedDeliveryTime } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { estimatedDeliveryTime: new Date(estimatedDeliveryTime) },
      { new: true }
    );
    
    try {
      await whatsapp.sendMessage(order.customer.phone,
        `⏰ *Delivery Update*\n\nOrder: ${order.orderId}\nEstimated delivery: ${new Date(estimatedDeliveryTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
    } catch (whatsappError) {
      console.error('WhatsApp notification failed:', whatsappError.message);
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve refund by orderId
router.post('/:orderId/refund/approve', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (!['pending', 'scheduled', 'failed'].includes(order.refundStatus)) {
      return res.status(400).json({ error: 'No pending refund request for this order' });
    }

    const razorpayService = require('../services/razorpay');
    const paymentId = order.razorpayPaymentId || order.paymentId;
    
    // Process refund via Razorpay if UPI payment with payment ID
    if (order.paymentMethod === 'upi' && paymentId) {
      try {
        const refund = await razorpayService.refund(paymentId, order.refundAmount || order.totalAmount);
        order.refundId = refund.id;
        order.refundStatus = 'completed';
        order.paymentStatus = 'refunded';
        order.status = 'refunded';
        order.statusUpdatedAt = new Date();
        order.refundProcessedAt = new Date();
        order.trackingUpdates.push({ status: 'refunded', message: `Refund of ₹${order.refundAmount || order.totalAmount} processed. Refund ID: ${refund.id}` });
        
        // Notify customer
        try {
          await whatsapp.sendButtons(order.customer.phone,
            `✅ *Refund Successful!*\n\nOrder: ${order.orderId}\nAmount: ₹${order.refundAmount || order.totalAmount}\nRefund ID: ${refund.id}\n\n💳 Amount will be credited to your account shortly.`,
            [{ id: 'place_order', text: 'New Order' }, { id: 'home', text: 'Main Menu' }]
          );
        } catch (e) {
          console.error('WhatsApp notification failed:', e.message);
        }
      } catch (refundError) {
        console.error('Razorpay refund error:', refundError);
        order.refundStatus = 'failed';
        order.status = 'refund_failed';
        order.paymentStatus = 'refund_failed';
        order.trackingUpdates.push({ status: 'refund_failed', message: refundError.message });
        await order.save();
        
        // Sync to Google Sheets with failed status
        googleSheets.updateOrderStatus(order.orderId, 'refund_failed', 'refund_failed').catch(err => 
          console.error('Google Sheets sync error:', err)
        );
        
        // Emit event for real-time updates
        const dataEvents = require('../services/eventEmitter');
        dataEvents.emit('orders');
        dataEvents.emit('dashboard');
        
        return res.status(500).json({ error: 'Refund processing failed: ' + refundError.message });
      }
    } else {
      // COD refund - manual process
      order.refundStatus = 'completed';
      order.paymentStatus = 'refunded';
      order.status = 'refunded';
      order.statusUpdatedAt = new Date();
      order.refundProcessedAt = new Date();
      order.trackingUpdates.push({ status: 'refunded', message: `COD refund of ₹${order.refundAmount || order.totalAmount} approved` });
      
      // Notify customer
      try {
        await whatsapp.sendButtons(order.customer.phone,
          `✅ *Refund Approved!*\n\nOrder: ${order.orderId}\nAmount: ₹${order.refundAmount || order.totalAmount}\n\n💵 Our team will contact you for the refund process.`,
          [{ id: 'place_order', text: 'New Order' }, { id: 'home', text: 'Main Menu' }]
        );
      } catch (e) {
        console.error('WhatsApp notification failed:', e.message);
      }
    }
    
    await order.save();
    
    // Emit event for real-time updates
    const dataEvents = require('../services/eventEmitter');
    dataEvents.emit('orders');
    dataEvents.emit('dashboard');
    
    // Sync to Google Sheets
    googleSheets.updateOrderStatus(order.orderId, order.status, order.paymentStatus).catch(err => 
      console.error('Google Sheets sync error:', err)
    );
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject refund by orderId
router.post('/:orderId/refund/reject', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (!['pending', 'scheduled'].includes(order.refundStatus)) {
      return res.status(400).json({ error: 'No pending refund request for this order' });
    }

    order.refundStatus = 'rejected';
    order.trackingUpdates.push({ status: 'refund_rejected', message: reason || 'Refund request rejected by admin' });
    await order.save();
    
    // Emit event for real-time updates
    const dataEvents = require('../services/eventEmitter');
    dataEvents.emit('orders');
    dataEvents.emit('dashboard');
    
    // Notify customer
    try {
      await whatsapp.sendButtons(order.customer.phone,
        `❌ *Refund Request Rejected*\n\nOrder: ${order.orderId}\n\nReason: ${reason || 'Your refund request has been reviewed and rejected.'}\n\nPlease contact support for more information.`,
        [{ id: 'place_order', text: 'New Order' }, { id: 'home', text: 'Main Menu' }]
      );
    } catch (e) {
      console.error('WhatsApp notification failed:', e.message);
    }
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
