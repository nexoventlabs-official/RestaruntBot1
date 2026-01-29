require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dataEvents = require('./services/eventEmitter');

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const specialItemsRoutes = require('./routes/specialItems');
const orderRoutes = require('./routes/order');
const webhookRoutes = require('./routes/webhook');
const paymentRoutes = require('./routes/payment');
const customerRoutes = require('./routes/customer');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/ai');
const categoryRoutes = require('./routes/category');
const publicRoutes = require('./routes/public');
const chatbotImagesRoutes = require('./routes/chatbotImages');
const deliveryBoyRoutes = require('./routes/deliveryboy');
const heroSectionRoutes = require('./routes/heroSection');
const offersRoutes = require('./routes/offers');
const whatsappBroadcastRoutes = require('./routes/whatsappBroadcast');
const settingsRoutes = require('./routes/settings');
const orderScheduler = require('./services/orderScheduler');
const dailyCleanup = require('./services/dailyCleanup');
const categoryScheduler = require('./services/categoryScheduler');
const orderCleanup = require('./services/orderCleanup');
const cartCleanup = require('./services/cartCleanup');

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'https://restarunt-bot1.vercel.app',
    'http://localhost:5173', 
    'http://localhost:3000', 
    'http://localhost:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log all API requests for debugging
app.use('/api', (req, res, next) => {
  console.log(`📥 ${req.method} ${req.originalUrl}`);
  next();
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Start schedulers after DB connection
    orderScheduler.start();
    dailyCleanup.start();
    categoryScheduler.start();
    orderCleanup.start();
    cartCleanup.startCartCleanupScheduler();
  })
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/special-items', specialItemsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/chatbot-images', chatbotImagesRoutes);
app.use('/api/delivery', deliveryBoyRoutes);
app.use('/api/hero-sections', heroSectionRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/whatsapp-broadcast', whatsappBroadcastRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Root route - API status
app.get('/', (req, res) => res.json({ 
  status: 'ok', 
  message: 'FoodAdmin API is running',
  version: '1.0.0'
}));

// Global error handler for JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('❌ JSON Parse Error:', {
      method: req.method,
      url: req.originalUrl,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']
    });
    return res.status(400).json({ 
      error: 'Invalid JSON format',
      message: 'The request body contains malformed JSON'
    });
  }
  next(err);
});

// SSE endpoint for real-time updates
const sseClients = new Set();

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// Broadcast to all SSE clients
const broadcast = (type) => sseClients.forEach(c => c.write(`data: ${JSON.stringify({ type })}\n\n`));

dataEvents.on('orders', () => broadcast('orders'));
dataEvents.on('dashboard', () => broadcast('dashboard'));
dataEvents.on('customers', () => broadcast('customers'));
dataEvents.on('menu', () => broadcast('menu'));
dataEvents.on('deliveryboys', () => broadcast('deliveryboys'));

// Test endpoint for Google Sheets sync
app.get('/api/test-sheets/:orderId/:status', async (req, res) => {
  const googleSheets = require('./services/googleSheets');
  const { orderId, status } = req.params;
  console.log('🧪 Test sheets update:', orderId, status);
  try {
    const result = await googleSheets.updateOrderStatus(orderId, status, status === 'cancelled' ? 'cancelled' : null);
    res.json({ success: result, orderId, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync all cancelled orders to Google Sheets
app.get('/api/sync-cancelled', async (req, res) => {
  const Order = require('./models/Order');
  const googleSheets = require('./services/googleSheets');
  console.log('🔄 Syncing all cancelled orders to Google Sheets...');
  try {
    const cancelledOrders = await Order.find({ status: 'cancelled' });
    let synced = 0;
    for (const order of cancelledOrders) {
      const result = await googleSheets.updateOrderStatus(order.orderId, 'cancelled', order.paymentStatus);
      if (result) synced++;
    }
    res.json({ success: true, total: cancelledOrders.length, synced });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync pending refund orders to refundprocessing sheet
app.get('/api/sync-pending-refunds', async (req, res) => {
  const googleSheets = require('./services/googleSheets');
  console.log('🔄 Syncing pending refund orders to Google Sheets...');
  try {
    const result = await googleSheets.syncPendingRefunds();
    res.json({ success: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
