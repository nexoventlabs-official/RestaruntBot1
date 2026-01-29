const express = require('express');
const jwt = require('jsonwebtoken');
const DeliveryBoy = require('../models/DeliveryBoy');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const brevoMail = require('../services/brevoMail');
const cloudinaryService = require('../services/cloudinary');
const googleSheets = require('../services/googleSheets');
const whatsapp = require('../services/whatsapp');
const chatbotImagesService = require('../services/chatbotImages');
const dataEvents = require('../services/eventEmitter');
const razorpayService = require('../services/razorpay');
const multer = require('multer');
const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Generate random password
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Send password email to delivery boy
const sendPasswordEmail = async (email, name, password) => {
  const SibApiV3Sdk = require('sib-api-v3-sdk');
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;
  
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  
  sendSmtpEmail.subject = 'Welcome to FoodAdmin - Your Login Credentials';
  sendSmtpEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #e63946, #ff6b6b); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🚴 Welcome to FoodAdmin!</h1>
      </div>
      <div style="padding: 30px; background: #f8f9fb;">
        <h2 style="color: #1c1d21;">Hello ${name}!</h2>
        <p style="color: #61636b; font-size: 16px;">You have been added as a Delivery Partner. Here are your login credentials:</p>
        
        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #e63946;">
          <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 5px; font-size: 18px;">${password}</code></p>
        </div>
        
        <p style="color: #e63946; font-weight: bold;">⚠️ Please change your password after first login!</p>
        
        <p style="color: #61636b;">Login at: <a href="http://localhost:5173/delivery/login" style="color: #e63946;">Delivery Portal</a></p>
      </div>
      <div style="padding: 20px; text-align: center; color: #61636b; font-size: 12px;">
        <p>This is an automated message from FoodAdmin.</p>
      </div>
    </div>
  `;
  sendSmtpEmail.sender = { name: process.env.BREVO_FROM_NAME || 'FoodAdmin', email: process.env.BREVO_FROM_EMAIL };
  sendSmtpEmail.to = [{ email, name }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`📧 Password email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Brevo email error:', error.message);
    return false;
  }
};

// ============ ADMIN ROUTES (Protected) ============

// Get all delivery boys (Admin) - with real-time online status
router.get('/', auth, async (req, res) => {
  try {
    const deliveryBoys = await DeliveryBoy.find().select('-password').sort({ createdAt: -1 });
    
    // Calculate real-time online status based on lastActiveAt
    // If lastActiveAt is within 2 minutes, consider online
    const TWO_MINUTES = 2 * 60 * 1000; // 2 minutes in milliseconds
    const now = new Date();
    
    const deliveryBoysWithStatus = deliveryBoys.map(boy => {
      const boyObj = boy.toObject();
      
      // Check if lastActiveAt is within 2 minutes
      if (boyObj.lastActiveAt) {
        const timeSinceActive = now - new Date(boyObj.lastActiveAt);
        boyObj.isOnline = timeSinceActive < TWO_MINUTES;
      } else {
        // No heartbeat received, mark as offline
        boyObj.isOnline = false;
      }
      
      return boyObj;
    });
    
    res.json(deliveryBoysWithStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new delivery boy (Admin)
router.post('/', auth, upload.single('photo'), async (req, res) => {
  try {
    const { name, email, phone, dob } = req.body;
    
    // Check if email already exists
    const existingEmail = await DeliveryBoy.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Check if phone already exists
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const existingPhone = await DeliveryBoy.findOne({ 
      $or: [
        { phone: cleanPhone },
        { phone: `+91${cleanPhone}` },
        { phone: new RegExp(cleanPhone + '$') }
      ]
    });
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }
    
    // Generate password
    const password = generatePassword();
    
    // Upload photo if provided
    let photoUrl = '';
    let photoPublicId = null;
    
    if (req.file) {
      const cloudinary = require('cloudinary').v2;
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'restaurant-bot/delivery-boys',
            public_id: `delivery_${Date.now()}`,
            transformation: [
              { width: 300, height: 300, crop: 'fill', gravity: 'face' },
              { quality: 'auto:best', fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      photoUrl = uploadResult.secure_url;
      photoPublicId = uploadResult.public_id;
    }
    
    // Create delivery boy
    const deliveryBoy = new DeliveryBoy({
      name,
      email,
      phone,
      password,
      dob: new Date(dob),
      photo: photoUrl,
      photoPublicId
    });
    
    await deliveryBoy.save();
    
    // Send password email
    await sendPasswordEmail(email, name, password);
    
    // Return without password
    const result = deliveryBoy.toObject();
    delete result.password;
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Add delivery boy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update delivery boy (Admin)
router.put('/:id', auth, upload.single('photo'), async (req, res) => {
  try {
    const { name, phone, dob, isActive } = req.body;
    const deliveryBoy = await DeliveryBoy.findById(req.params.id);
    
    if (!deliveryBoy) {
      return res.status(404).json({ error: 'Delivery boy not found' });
    }
    
    // Update fields
    if (name) deliveryBoy.name = name;
    if (phone) deliveryBoy.phone = phone;
    if (dob) deliveryBoy.dob = new Date(dob);
    if (typeof isActive === 'boolean' || isActive === 'true' || isActive === 'false') {
      const newIsActive = isActive === true || isActive === 'true';
      // If deactivating, increment tokenVersion to invalidate all existing sessions
      if (deliveryBoy.isActive && !newIsActive) {
        deliveryBoy.tokenVersion = (deliveryBoy.tokenVersion || 0) + 1;
        console.log(`🔒 Deactivated delivery partner ${deliveryBoy.name}, invalidating sessions`);
      }
      deliveryBoy.isActive = newIsActive;
    }
    
    // Upload new photo if provided
    if (req.file) {
      // Delete old photo
      if (deliveryBoy.photoPublicId) {
        try {
          await cloudinaryService.deleteImage(deliveryBoy.photoPublicId);
        } catch (e) {
          console.log('Could not delete old photo:', e.message);
        }
      }
      
      const cloudinary = require('cloudinary').v2;
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'restaurant-bot/delivery-boys',
            public_id: `delivery_${Date.now()}`,
            transformation: [
              { width: 300, height: 300, crop: 'fill', gravity: 'face' },
              { quality: 'auto:best', fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      deliveryBoy.photo = uploadResult.secure_url;
      deliveryBoy.photoPublicId = uploadResult.public_id;
    }
    
    await deliveryBoy.save();
    
    const result = deliveryBoy.toObject();
    delete result.password;
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete delivery boy (Admin) - This will invalidate their token
router.delete('/:id', auth, async (req, res) => {
  try {
    const deliveryBoy = await DeliveryBoy.findById(req.params.id);
    
    if (!deliveryBoy) {
      return res.status(404).json({ error: 'Delivery boy not found' });
    }
    
    // Delete photo from Cloudinary
    if (deliveryBoy.photoPublicId) {
      try {
        await cloudinaryService.deleteImage(deliveryBoy.photoPublicId);
      } catch (e) {
        console.log('Could not delete photo:', e.message);
      }
    }
    
    await DeliveryBoy.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Delivery boy deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password (Admin) - Send new password via email
router.post('/:id/reset-password', auth, async (req, res) => {
  try {
    const deliveryBoy = await DeliveryBoy.findById(req.params.id);
    
    if (!deliveryBoy) {
      return res.status(404).json({ error: 'Delivery boy not found' });
    }
    
    // Generate new password
    const newPassword = generatePassword();
    deliveryBoy.password = newPassword;
    deliveryBoy.tokenVersion += 1; // Invalidate existing tokens
    await deliveryBoy.save();
    
    // Send email
    await sendPasswordEmail(deliveryBoy.email, deliveryBoy.name, newPassword);
    
    res.json({ message: 'New password sent to email' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DELIVERY BOY AUTH ROUTES (Public) ============

// Delivery boy login (supports email or phone)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if input is email or phone number
    const isPhone = /^[0-9]{10}$/.test(email) || /^\+?[0-9]{10,13}$/.test(email);
    
    let deliveryBoy;
    if (isPhone) {
      // Clean phone number - remove +91 or any prefix, keep last 10 digits
      const cleanPhone = email.replace(/\D/g, '').slice(-10);
      deliveryBoy = await DeliveryBoy.findOne({ 
        $or: [
          { phone: cleanPhone },
          { phone: `+91${cleanPhone}` },
          { phone: new RegExp(cleanPhone + '$') }
        ]
      });
    } else {
      deliveryBoy = await DeliveryBoy.findOne({ email: email.toLowerCase() });
    }
    
    if (!deliveryBoy) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!deliveryBoy.isActive) {
      return res.status(401).json({ error: 'Account is deactivated. Contact admin.' });
    }
    
    const isMatch = await deliveryBoy.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    deliveryBoy.lastLogin = new Date();
    deliveryBoy.isOnline = true;
    await deliveryBoy.save();
    
    // Generate token with tokenVersion
    const token = jwt.sign(
      { 
        id: deliveryBoy._id, 
        email: deliveryBoy.email, 
        role: 'delivery',
        tokenVersion: deliveryBoy.tokenVersion
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    const user = deliveryBoy.toObject();
    delete user.password;
    
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify delivery boy token
router.get('/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'delivery') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Check if delivery boy still exists and token version matches
    const deliveryBoy = await DeliveryBoy.findById(decoded.id).select('-password');
    
    if (!deliveryBoy) {
      return res.status(401).json({ error: 'Account deleted' });
    }
    
    if (!deliveryBoy.isActive) {
      return res.status(401).json({ error: 'Account deactivated' });
    }
    
    if (deliveryBoy.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    
    res.json({ valid: true, user: deliveryBoy });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Change password (Delivery boy)
router.post('/change-password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'delivery') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const deliveryBoy = await DeliveryBoy.findById(decoded.id);
    
    if (!deliveryBoy) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const isMatch = await deliveryBoy.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    deliveryBoy.password = newPassword;
    deliveryBoy.passwordChangedAt = new Date();
    await deliveryBoy.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update online status (Delivery boy) - also used for logout
router.post('/status', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'delivery') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const { isOnline } = req.body;
    
    // Update status and lastActiveAt
    const updateData = { 
      isOnline,
      lastActiveAt: isOnline ? new Date() : null // Clear lastActiveAt on logout
    };
    
    await DeliveryBoy.findByIdAndUpdate(decoded.id, updateData);
    
    // Emit event for real-time updates in admin panel
    dataEvents.emit('deliveryboys');
    
    res.json({ message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Heartbeat endpoint - delivery partner sends this every 30 seconds while app is open
router.post('/heartbeat', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'delivery') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Update lastActiveAt timestamp
    await DeliveryBoy.findByIdAndUpdate(decoded.id, { 
      lastActiveAt: new Date(),
      isOnline: true 
    });
    
    res.json({ message: 'Heartbeat received' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update push notification token (Delivery boy)
router.post('/push-token', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'delivery') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const { pushToken } = req.body;
    
    if (!pushToken) {
      return res.status(400).json({ error: 'Push token is required' });
    }
    
    await DeliveryBoy.findByIdAndUpdate(decoded.id, { pushToken });
    
    console.log(`📱 Push token updated for delivery partner ${decoded.id}`);
    
    res.json({ message: 'Push token updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DELIVERY BOY ORDER ROUTES ============

// Middleware to verify delivery boy token
const verifyDeliveryToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'delivery') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const deliveryBoy = await DeliveryBoy.findById(decoded.id).select('-password');
    
    if (!deliveryBoy) {
      return res.status(401).json({ error: 'Account deleted' });
    }
    
    if (!deliveryBoy.isActive) {
      return res.status(401).json({ error: 'Account deactivated' });
    }
    
    if (deliveryBoy.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    req.deliveryBoy = deliveryBoy;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get available orders (preparing status, not assigned, delivery type only)
router.get('/orders/available', verifyDeliveryToken, async (req, res) => {
  try {
    const orders = await Order.find({
      status: 'preparing',
      serviceType: 'delivery',
      assignedTo: null
    }).sort({ createdAt: 1 }); // Oldest first
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my assigned orders (orders assigned to this delivery boy)
router.get('/orders/my', verifyDeliveryToken, async (req, res) => {
  try {
    // Include cancelled orders that were cancelled within last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const orders = await Order.find({
      assignedTo: req.deliveryBoy._id,
      $or: [
        { status: { $in: ['preparing', 'ready', 'out_for_delivery'] } },
        { 
          status: 'cancelled',
          statusUpdatedAt: { $gte: oneHourAgo }
        }
      ]
    }).sort({ assignedAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get delivery history (delivered and cancelled orders by this delivery boy)
router.get('/orders/history', verifyDeliveryToken, async (req, res) => {
  try {
    const orders = await Order.find({
      assignedTo: req.deliveryBoy._id,
      status: { $in: ['delivered', 'cancelled'] }
    }).sort({ statusUpdatedAt: -1, deliveredAt: -1 }).limit(50);
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order stats for delivery boy (must be before :orderId route)
router.get('/orders/stats', verifyDeliveryToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [todayDelivered, totalDelivered, activeOrders] = await Promise.all([
      Order.countDocuments({
        assignedTo: req.deliveryBoy._id,
        status: 'delivered',
        deliveredAt: { $gte: today }
      }),
      Order.countDocuments({
        assignedTo: req.deliveryBoy._id,
        status: 'delivered'
      }),
      Order.countDocuments({
        assignedTo: req.deliveryBoy._id,
        status: { $in: ['ready', 'out_for_delivery'] }
      })
    ]);
    
    res.json({
      todayDelivered,
      totalDelivered,
      activeOrders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile stats for delivery boy (permanent stats not affected by order cleanup)
router.get('/profile/stats', verifyDeliveryToken, async (req, res) => {
  try {
    const deliveryBoy = req.deliveryBoy;
    
    res.json({
      totalDeliveries: deliveryBoy.totalDeliveries || 0,
      totalEarnings: deliveryBoy.totalEarnings || 0,
      totalCancelled: deliveryBoy.totalCancelled || 0,
      joinedDate: deliveryBoy.createdAt,
      avgRating: deliveryBoy.avgRating || 0,
      totalRatings: deliveryBoy.totalRatings || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get delivery history with filter (today, this week, this month, all time)
router.get('/orders/history/filtered', verifyDeliveryToken, async (req, res) => {
  try {
    const { filter = 'week' } = req.query; // 'today', 'week', 'month', 'all'
    
    let dateFilter = {};
    const now = new Date();
    
    if (filter === 'today') {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      dateFilter = { deliveredAt: { $gte: startOfDay } };
    } else if (filter === 'week') {
      // Get Monday of current week
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      // Get Sunday of current week
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      dateFilter = { deliveredAt: { $gte: startOfWeek, $lte: endOfWeek } };
    } else if (filter === 'month') {
      // Get 1st of current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      // Get last day of current month
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      dateFilter = { deliveredAt: { $gte: startOfMonth, $lte: endOfMonth } };
    }
    // 'all' - no date filter
    
    const orders = await Order.find({
      assignedTo: req.deliveryBoy._id,
      status: { $in: ['delivered', 'cancelled'] },
      ...dateFilter
    }).sort({ deliveredAt: -1, statusUpdatedAt: -1 }).limit(100);
    
    // Calculate stats for the filtered period
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');
    const totalEarnings = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    res.json({
      orders,
      stats: {
        delivered: deliveredOrders.length,
        cancelled: cancelledOrders.length,
        earnings: totalEarnings
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order by orderId (for delivery partner)
router.get('/orders/:orderId', verifyDeliveryToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Find order that is assigned to this delivery boy or was delivered by them
    const order = await Order.findOne({
      orderId,
      assignedTo: req.deliveryBoy._id
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found or not assigned to you' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Claim order (Mark as Ready) - First delivery boy to click gets the order
router.post('/orders/:orderId/claim', verifyDeliveryToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Use findOneAndUpdate with conditions to ensure atomic operation
    const order = await Order.findOneAndUpdate(
      {
        orderId,
        status: 'preparing',
        assignedTo: null,
        serviceType: 'delivery'
      },
      {
        $set: {
          status: 'ready',
          assignedTo: req.deliveryBoy._id,
          assignedAt: new Date(),
          deliveryPartnerName: req.deliveryBoy.name
        },
        $push: {
          trackingUpdates: {
            status: 'ready',
            timestamp: new Date(),
            message: `Order is ready. Assigned to ${req.deliveryBoy.name}`
          }
        }
      },
      { new: true }
    );
    
    if (!order) {
      return res.status(400).json({ error: 'Order not available or already claimed' });
    }
    
    // Update Google Sheets with delivery partner info
    await googleSheets.updateOrderStatus(orderId, 'ready');
    await googleSheets.updateDeliveryPartner(orderId, req.deliveryBoy.name);
    
    // Send WhatsApp notification to customer
    const readyImageUrl = await chatbotImagesService.getImageUrl('ready');
    const phone = order.customer.phone;
    const trackUrl = `http://localhost:5173/track/${orderId}`;
    if (readyImageUrl) {
      await whatsapp.sendImageWithCtaUrl(phone, readyImageUrl,
        `📦 *Order Ready!*\n\nYour order #${orderId} is ready!\n\n🚴 Delivery Partner: *${req.deliveryBoy.name}*\n\nYour order will be picked up shortly.`,
        'Track Order',
        trackUrl,
        'Tap to track your order'
      );
    } else {
      await whatsapp.sendCtaUrl(phone,
        `📦 *Order Ready!*\n\nYour order #${orderId} is ready!\n\n🚴 Delivery Partner: *${req.deliveryBoy.name}*\n\nYour order will be picked up shortly.`,
        'Track Order',
        trackUrl,
        'Tap to track your order'
      );
    }
    
    // Emit event for real-time updates
    dataEvents.emit('orders');
    
    res.json({ message: 'Order claimed successfully', order });
  } catch (error) {
    console.error('Claim order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark order as Ready (for orders already assigned by admin)
router.post('/orders/:orderId/mark-ready', verifyDeliveryToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOneAndUpdate(
      {
        orderId,
        status: 'preparing',
        assignedTo: req.deliveryBoy._id,
        serviceType: 'delivery'
      },
      {
        $set: { status: 'ready' },
        $push: {
          trackingUpdates: {
            status: 'ready',
            timestamp: new Date(),
            message: `Order is ready. ${req.deliveryBoy.name} will pick it up shortly.`
          }
        }
      },
      { new: true }
    );
    
    if (!order) {
      return res.status(400).json({ error: 'Order not found or not assigned to you' });
    }
    
    // Update Google Sheets
    await googleSheets.updateOrderStatus(orderId, 'ready');
    
    // Send WhatsApp notification to customer
    const readyImageUrl = await chatbotImagesService.getImageUrl('ready');
    const phone = order.customer.phone;
    const trackUrl = `http://localhost:5173/track/${orderId}`;
    if (readyImageUrl) {
      await whatsapp.sendImageWithCtaUrl(phone, readyImageUrl,
        `📦 *Order Ready!*\n\nYour order #${orderId} is ready!\n\n🚴 Delivery Partner: *${req.deliveryBoy.name}*\n\nYour order will be picked up shortly.`,
        'Track Order',
        trackUrl,
        'Tap to track your order'
      );
    } else {
      await whatsapp.sendCtaUrl(phone,
        `📦 *Order Ready!*\n\nYour order #${orderId} is ready!\n\n🚴 Delivery Partner: *${req.deliveryBoy.name}*\n\nYour order will be picked up shortly.`,
        'Track Order',
        trackUrl,
        'Tap to track your order'
      );
    }
    
    // Emit event for real-time updates
    dataEvents.emit('orders');
    
    res.json({ message: 'Order marked as ready', order });
  } catch (error) {
    console.error('Mark ready error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order status (Out for Delivery)
router.post('/orders/:orderId/out-for-delivery', verifyDeliveryToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOneAndUpdate(
      {
        orderId,
        status: 'ready',
        assignedTo: req.deliveryBoy._id
      },
      {
        $set: { status: 'out_for_delivery' },
        $push: {
          trackingUpdates: {
            status: 'out_for_delivery',
            timestamp: new Date(),
            message: `${req.deliveryBoy.name} is on the way with your order`
          }
        }
      },
      { new: true }
    );
    
    if (!order) {
      return res.status(400).json({ error: 'Order not found or not assigned to you' });
    }
    
    // Update Google Sheets
    await googleSheets.updateOrderStatus(orderId, 'out_for_delivery');
    
    // Send WhatsApp notification
    const outForDeliveryImageUrl = await chatbotImagesService.getImageUrl('out_for_delivery');
    const phone = order.customer.phone;
    if (outForDeliveryImageUrl) {
      await whatsapp.sendImageWithCtaUrl(phone, outForDeliveryImageUrl,
        `🛵 *Your Order is On the Way!*\n\nYour order #${orderId} is on the way!\n\n🚴 ${req.deliveryBoy.name} is delivering your order.`,
        'Track Order',
        `http://localhost:5173/track/${orderId}`,
        'Tap to track'
      );
    } else {
      await whatsapp.sendCtaUrl(phone,
        `🛵 *Your Order is On the Way!*\n\nYour order #${orderId} is on the way!\n\n🚴 ${req.deliveryBoy.name} is delivering your order.`,
        'Track Order',
        `http://localhost:5173/track/${orderId}`,
        'Tap to track'
      );
    }
    
    dataEvents.emit('orders');
    
    res.json({ message: 'Order marked as out for delivery', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark order as Delivered
router.post('/orders/:orderId/delivered', verifyDeliveryToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { collectionMethod } = req.body; // 'cash' or 'upi' for COD orders
    
    // First get the order to check payment method
    const existingOrder = await Order.findOne({
      orderId,
      status: 'out_for_delivery',
      assignedTo: req.deliveryBoy._id
    });
    
    if (!existingOrder) {
      return res.status(400).json({ error: 'Order not found or not assigned to you' });
    }
    
    // For COD orders, require collection method
    if (existingOrder.paymentMethod === 'cod' && !collectionMethod) {
      return res.status(400).json({ 
        error: 'Collection method required for COD orders',
        requiresCollection: true,
        paymentMethod: 'cod',
        totalAmount: existingOrder.totalAmount
      });
    }
    
    // Determine actual payment method and payment status
    let actualPaymentMethod = null;
    let paymentStatus = 'paid';
    
    if (existingOrder.paymentMethod === 'upi') {
      // Already paid online
      actualPaymentMethod = 'upi';
    } else if (existingOrder.paymentMethod === 'cod') {
      // COD - check how payment was collected
      actualPaymentMethod = collectionMethod; // 'cash' or 'upi'
    }
    
    const order = await Order.findOneAndUpdate(
      {
        orderId,
        status: 'out_for_delivery',
        assignedTo: req.deliveryBoy._id
      },
      {
        $set: {
          status: 'delivered',
          deliveredAt: new Date(),
          statusUpdatedAt: new Date(),
          paymentStatus: paymentStatus,
          actualPaymentMethod: actualPaymentMethod
        },
        $push: {
          trackingUpdates: {
            status: 'delivered',
            timestamp: new Date(),
            message: `Order delivered by ${req.deliveryBoy.name}. Payment: ${existingOrder.paymentMethod === 'cod' ? `COD (${collectionMethod})` : 'UPI (Prepaid)'}`
          }
        }
      },
      { new: true }
    );
    
    // Determine payment method label for Google Sheets
    let paymentMethodLabel = existingOrder.paymentMethod.toUpperCase();
    if (existingOrder.paymentMethod === 'cod' && collectionMethod) {
      paymentMethodLabel = `COD/${collectionMethod.toUpperCase()}`;
    }
    
    // Update Google Sheets - move to delivered sheet with payment method
    await googleSheets.updateOrderStatus(orderId, 'delivered', 'paid');
    await googleSheets.updatePaymentMethod(orderId, paymentMethodLabel);
    
    // Send WhatsApp notification with review link
    const deliveredImageUrl = await chatbotImagesService.getImageUrl('delivered');
    const phone = order.customer.phone;
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const reviewUrl = `http://localhost:5173/review/${cleanPhone}/${orderId}`;
    
    if (deliveredImageUrl) {
      await whatsapp.sendImageWithCtaUrl(phone, deliveredImageUrl,
        `✅ *Order Delivered!*\n\nYour order #${orderId} has been delivered!\n\nThank you for ordering with us! 🙏\n\nWe'd love to hear your feedback.`,
        'Rate Your Order',
        reviewUrl,
        'Tap to review'
      );
    } else {
      await whatsapp.sendCtaUrl(phone,
        `✅ *Order Delivered!*\n\nYour order #${orderId} has been delivered!\n\nThank you for ordering with us! 🙏\n\nWe'd love to hear your feedback.`,
        'Rate Your Order',
        reviewUrl,
        'Tap to review'
      );
    }
    
    // Update delivery partner's permanent stats
    await DeliveryBoy.findByIdAndUpdate(req.deliveryBoy._id, {
      $inc: {
        totalDeliveries: 1,
        totalEarnings: order.totalAmount || 0
      }
    });
    
    dataEvents.emit('orders');
    dataEvents.emit('dashboard');
    
    res.json({ message: 'Order marked as delivered', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate QR code for COD payment collection
router.post('/orders/:orderId/generate-qr', verifyDeliveryToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({
      orderId,
      status: 'out_for_delivery',
      assignedTo: req.deliveryBoy._id,
      paymentMethod: 'cod'
    });
    
    if (!order) {
      return res.status(400).json({ error: 'Order not found or not eligible for QR payment' });
    }
    
    // Create Razorpay payment link for COD collection
    const paymentLink = await razorpayService.createPaymentLink(
      order.totalAmount,
      `${orderId}-COD`,
      order.customer.phone,
      order.customer.name || 'Customer'
    );
    
    // Store payment link ID in order for verification
    order.codPaymentLinkId = paymentLink.id;
    await order.save();
    
    // Generate UPI deep link for direct app opening
    const merchantVpa = process.env.MERCHANT_UPI_VPA;
    const merchantName = process.env.MERCHANT_NAME || 'Restaurant';
    let upiDeepLink = null;
    let upiQrUrl = null;
    
    if (merchantVpa) {
      // Format: "Order ID | Via Delivery Partner Full Name"
      const shortNote = `${orderId} | Via ${req.deliveryBoy.name}`;
      
      const upiParams = new URLSearchParams();
      upiParams.append('pa', merchantVpa);
      upiParams.append('pn', merchantName);
      upiParams.append('am', order.totalAmount.toFixed(2));
      upiParams.append('cu', 'INR');
      upiParams.append('tn', shortNote);
      upiParams.append('tr', `${orderId}-COD`);
      
      upiDeepLink = `upi://pay?${upiParams.toString()}`;
      // QR code with UPI deep link - this will open UPI apps directly when scanned
      upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiDeepLink)}`;
    }
    
    // Fallback QR with Razorpay payment link
    const razorpayQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentLink.short_url)}`;
    
    res.json({
      // Use UPI QR if merchant VPA is configured, otherwise use Razorpay QR
      qrUrl: upiQrUrl || razorpayQrUrl,
      upiDeepLink: upiDeepLink,
      paymentUrl: paymentLink.short_url,
      paymentLinkId: paymentLink.id,
      amount: order.totalAmount,
      orderId: order.orderId,
      merchantVpa: merchantVpa || null
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check COD payment status
router.get('/orders/:orderId/check-payment', verifyDeliveryToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentLinkId } = req.query;
    
    const order = await Order.findOne({
      orderId,
      status: 'out_for_delivery',
      assignedTo: req.deliveryBoy._id
    });
    
    if (!order) {
      return res.status(400).json({ error: 'Order not found' });
    }
    
    // Check payment link status via Razorpay API
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    
    try {
      const paymentLinkDetails = await razorpay.paymentLink.fetch(paymentLinkId || order.codPaymentLinkId);
      
      if (paymentLinkDetails.status === 'paid') {
        // Payment successful - auto mark as delivered
        const updatedOrder = await Order.findOneAndUpdate(
          {
            orderId,
            status: 'out_for_delivery',
            assignedTo: req.deliveryBoy._id
          },
          {
            $set: {
              status: 'delivered',
              deliveredAt: new Date(),
              statusUpdatedAt: new Date(),
              paymentStatus: 'paid',
              actualPaymentMethod: 'upi',
              codPaymentId: paymentLinkDetails.payments?.[0]?.payment_id || paymentLinkId
            },
            $push: {
              trackingUpdates: {
                status: 'delivered',
                timestamp: new Date(),
                message: `Order delivered by ${req.deliveryBoy.name}. Payment: COD (UPI via QR)`
              }
            }
          },
          { new: true }
        );
        
        if (updatedOrder) {
          // Update Google Sheets
          await googleSheets.updateOrderStatus(orderId, 'delivered', 'paid');
          await googleSheets.updatePaymentMethod(orderId, 'COD/UPI');
          
          // Send WhatsApp notification
          const deliveredImageUrl = await chatbotImagesService.getImageUrl('delivered');
          const phone = updatedOrder.customer.phone;
          const cleanPhone = phone.replace(/\D/g, '').slice(-10);
          const reviewUrl = `http://localhost:5173/review/${cleanPhone}/${orderId}`;
          
          if (deliveredImageUrl) {
            await whatsapp.sendImageWithCtaUrl(phone, deliveredImageUrl,
              `✅ *Order Delivered!*\n\nYour order #${orderId} has been delivered!\n\n💳 Payment received via UPI.\n\nThank you for ordering with us! 🙏`,
              'Rate Your Order',
              reviewUrl,
              'Tap to review'
            );
          } else {
            await whatsapp.sendCtaUrl(phone,
              `✅ *Order Delivered!*\n\nYour order #${orderId} has been delivered!\n\n💳 Payment received via UPI.\n\nThank you for ordering with us! 🙏`,
              'Rate Your Order',
              reviewUrl,
              'Tap to review'
            );
          }
          
          dataEvents.emit('orders');
          dataEvents.emit('dashboard');
        }
        
        return res.json({ 
          status: 'paid', 
          message: 'Payment successful! Order marked as delivered.',
          order: updatedOrder
        });
      }
      
      res.json({ 
        status: paymentLinkDetails.status,
        message: paymentLinkDetails.status === 'created' ? 'Waiting for payment...' : `Payment status: ${paymentLinkDetails.status}`
      });
    } catch (razorpayError) {
      console.error('Razorpay fetch error:', razorpayError);
      res.json({ status: 'pending', message: 'Checking payment status...' });
    }
  } catch (error) {
    console.error('Check payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

