const express = require('express');
const router = express.Router();
const ChatbotImage = require('../models/ChatbotImage');
const cloudinaryService = require('../services/cloudinary');
const chatbotImagesService = require('../services/chatbotImages');
const auth = require('../middleware/auth');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Default images configuration (no URLs - admin must upload)
const defaultImages = [
  // ========== WELCOME & MAIN FLOW ==========
  {
    key: 'welcome',
    name: '👋 Welcome Message',
    description: 'NEW FLOW: Shown when customer sends Hi/Hello - "Welcome to [Restaurant] 👋 Order ahead & skip the wait"',
    imageUrl: ''
  },
  {
    key: 'quick_picks',
    name: '⭐ Order Food Menu',
    description: 'NEW FLOW: Shown when customer taps "Order Food" - Shows Today Special, Reorder, and View Menu options',
    imageUrl: ''
  },
  {
    key: 'no_specials_today',
    name: '🍽️ No Specials Today',
    description: 'NEW FLOW: Shown when customer taps "Today Special" but no items are marked as special',
    imageUrl: ''
  },
  {
    key: 'contact_restaurant',
    name: '📞 Contact Restaurant',
    description: 'NEW FLOW: Shown when customer taps "Contact Restaurant" button',
    imageUrl: ''
  },
  
  // ========== MY ORDERS ==========
  {
    key: 'my_orders',
    name: '🧾 My Orders',
    description: 'NEW FLOW: Shown when displaying order history (single or multiple orders)',
    imageUrl: ''
  },
  {
    key: 'no_orders_found',
    name: '📦 No Orders Found',
    description: 'Shown when customer has no order history',
    imageUrl: ''
  },
  {
    key: 'your_orders',
    name: '📋 Your Orders List',
    description: 'Shown when displaying multiple past orders',
    imageUrl: ''
  },
  {
    key: 'reorder_success',
    name: '🔄 Reorder Success',
    description: 'NEW FLOW: Shown when items from past order are added to cart',
    imageUrl: ''
  },
  
  // ========== CART & ORDERING ==========
  {
    key: 'cart_empty',
    name: '🛒 Cart Empty',
    description: 'Shown when customer views an empty cart',
    imageUrl: ''
  },
  {
    key: 'view_cart',
    name: '🧾 View Cart',
    description: 'NEW FLOW: Shown when displaying cart with items - "Your cart 🧾"',
    imageUrl: ''
  },
  {
    key: 'added_to_cart',
    name: '✅ Added to Cart',
    description: 'Shown when item is successfully added to cart',
    imageUrl: ''
  },
  {
    key: 'cart_cleared',
    name: '🗑️ Cart Cleared',
    description: 'NEW FLOW: Shown when customer cancels order and cart is cleared',
    imageUrl: ''
  },
  {
    key: 'select_quantity',
    name: '🔢 Select Quantity',
    description: 'Shown when asking how many items customer wants to add',
    imageUrl: ''
  },
  
  // ========== MENU BROWSING ==========
  {
    key: 'browse_menu',
    name: '📋 Browse Menu',
    description: 'Shown when displaying menu browsing options (Veg/Non-Veg/All)',
    imageUrl: ''
  },
  {
    key: 'item_not_available',
    name: '❌ Item Not Available',
    description: 'Shown when requested item is not available or out of stock',
    imageUrl: ''
  },
  
  // ========== ORDER TYPE & SUMMARY ==========
  {
    key: 'order_type_selection',
    name: '🚚 Order Type Selection',
    description: 'NEW FLOW: Shown when asking "How would you like to get your order?" (Pickup/Delivery)',
    imageUrl: ''
  },
  {
    key: 'order_summary',
    name: '📋 Order Summary',
    description: 'NEW FLOW: Shown before payment - Items count, Total, Mode, Ready time',
    imageUrl: ''
  },
  {
    key: 'order_details',
    name: '📄 Order Details',
    description: 'Shown when displaying detailed order information with payment link',
    imageUrl: ''
  },
  
  // ========== PAYMENT ==========
  {
    key: 'payment_methods',
    name: '💳 Payment Methods',
    description: 'NEW FLOW: Shown when selecting payment method (UPI/Cash/Pay Later)',
    imageUrl: ''
  },
  {
    key: 'payment_success',
    name: '✅ Payment Success',
    description: 'Shown when online payment is successful',
    imageUrl: ''
  },
  {
    key: 'payment_timeout_cancelled',
    name: '⏰ Payment Timeout',
    description: 'Shown when order is cancelled due to payment not received within 15 minutes',
    imageUrl: ''
  },
  
  // ========== ORDER CONFIRMATION & STATUS ==========
  {
    key: 'order_confirmed',
    name: '✅ Order Confirmed',
    description: 'NEW FLOW: Shown when order is confirmed - Order ID, Ready time, Pickup/Delivery info',
    imageUrl: ''
  },
  {
    key: 'preparing',
    name: '👨‍🍳 Preparing Order',
    description: 'Shown when order status changes to preparing',
    imageUrl: ''
  },
  {
    key: 'ready',
    name: '✅ Order Ready',
    description: 'Shown when order is ready for pickup/delivery',
    imageUrl: ''
  },
  {
    key: 'out_for_delivery',
    name: '🛵 Out for Delivery',
    description: 'Shown when order is out for delivery',
    imageUrl: ''
  },
  {
    key: 'delivered',
    name: '🎉 Order Delivered',
    description: 'Shown when order is successfully delivered',
    imageUrl: ''
  },
  
  // ========== ORDER TRACKING & CANCELLATION ==========
  {
    key: 'order_tracking',
    name: '📍 Order Tracking',
    description: 'Shown when displaying order tracking details',
    imageUrl: ''
  },
  {
    key: 'no_active_orders',
    name: '📦 No Active Orders',
    description: 'Shown when customer has no orders to track',
    imageUrl: ''
  },
  {
    key: 'order_cancelled',
    name: '❌ Order Cancelled',
    description: 'Shown when order is successfully cancelled',
    imageUrl: ''
  },
  
  // ========== PICKUP SPECIFIC ==========
  {
    key: 'pickup_order_confirmed',
    name: '✅ Pickup Order Confirmed',
    description: 'Shown when self-pickup order is placed with "Pay at Hotel" - Shows order ID, items, total, pickup instructions',
    imageUrl: ''
  },
  {
    key: 'pickup_confirmed',
    name: '✅ Pickup Confirmed',
    description: 'Shown when pickup order is confirmed by admin',
    imageUrl: ''
  },
  {
    key: 'pickup_ready',
    name: '🏪 Pickup Ready',
    description: 'Shown when pickup order is ready for collection at restaurant',
    imageUrl: ''
  },
  {
    key: 'pickup_completed',
    name: '✅ Pickup Completed',
    description: 'Shown when customer has picked up their order',
    imageUrl: ''
  },
  {
    key: 'pickup_tracking',
    name: '📍 Pickup Tracking',
    description: 'Shown when customer tracks their pickup order status',
    imageUrl: ''
  },
  {
    key: 'pickup_cancelled',
    name: '❌ Pickup Cancelled',
    description: 'Shown when pickup order is successfully cancelled',
    imageUrl: ''
  },
  {
    key: 'pickup_cancel_restricted',
    name: '🚫 Pickup Cancel Restricted',
    description: 'Shown when customer tries to cancel pickup order after confirmation',
    imageUrl: ''
  },
  
  // ========== CART MANAGEMENT ==========
  {
    key: 'cart_expiry_warning',
    name: '⏰ Cart Expiry Warning',
    description: 'Shown when cart items will expire in 10 minutes due to inactivity',
    imageUrl: ''
  },
  {
    key: 'cart_items_removed',
    name: '🗑️ Cart Items Removed',
    description: 'Shown when cart items are removed after 30 minutes of inactivity',
    imageUrl: ''
  },
  
  // ========== HELP & SUPPORT ==========
  {
    key: 'help_support',
    name: '❓ Help & Support',
    description: 'Shown when displaying help and support information',
    imageUrl: ''
  },
  {
    key: 'open_website',
    name: '🌐 Open Website',
    description: 'Shown when user selects Open Website option with CTA button',
    imageUrl: ''
  }
];

// Initialize default images if not exist
router.post('/init', auth, async (req, res) => {
  try {
    for (const img of defaultImages) {
      await ChatbotImage.findOneAndUpdate(
        { key: img.key },
        img,
        { upsert: true, new: true }
      );
    }
    res.json({ message: 'Default images initialized', count: defaultImages.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all chatbot images
router.get('/', auth, async (req, res) => {
  try {
    let images = await ChatbotImage.find().sort('name');
    
    // If no images exist, initialize all defaults
    if (images.length === 0) {
      console.log('[Chatbot Images] No images found, initializing defaults...');
      for (const img of defaultImages) {
        try {
          await ChatbotImage.create(img);
        } catch (createErr) {
          console.error(`[Chatbot Images] Error creating ${img.key}:`, createErr.message);
        }
      }
      images = await ChatbotImage.find().sort('name');
    } else {
      // Check for missing images and add them
      const existingKeys = images.map(img => img.key);
      const missingImages = defaultImages.filter(img => !existingKeys.includes(img.key));
      
      if (missingImages.length > 0) {
        console.log(`[Chatbot Images] Found ${missingImages.length} missing images, adding them...`);
        for (const img of missingImages) {
          try {
            await ChatbotImage.create(img);
            console.log(`[Chatbot Images] Added missing image: ${img.key}`);
          } catch (createErr) {
            console.error(`[Chatbot Images] Error creating ${img.key}:`, createErr.message);
            // Continue with other images even if one fails
          }
        }
        images = await ChatbotImage.find().sort('name');
      }
    }
    
    res.json(images);
  } catch (error) {
    console.error('[Chatbot Images] GET error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single image by key (for chatbot use - no auth)
router.get('/key/:key', async (req, res) => {
  try {
    const image = await ChatbotImage.findOne({ key: req.params.key });
    if (!image) {
      // Return default if not found
      const defaultImg = defaultImages.find(d => d.key === req.params.key);
      if (defaultImg) {
        return res.json({ imageUrl: defaultImg.imageUrl });
      }
      return res.status(404).json({ error: 'Image not found' });
    }
    res.json({ imageUrl: image.imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload and update image
router.put('/:key', auth, upload.single('image'), async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Find existing image
    let chatbotImage = await ChatbotImage.findOne({ key });
    
    // Delete old image from Cloudinary if exists
    if (chatbotImage?.cloudinaryPublicId) {
      try {
        await cloudinaryService.deleteImage(chatbotImage.cloudinaryPublicId);
      } catch (e) {
        console.log('Could not delete old image:', e.message);
      }
    }

    // Upload new image to Cloudinary with 2:1 aspect ratio (1200x600)
    const cloudinary = require('cloudinary').v2;
    
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'restaurant-bot/chatbot-images',
          public_id: `chatbot_${key}_${Date.now()}`,
          transformation: [
            { width: 1200, height: 600, crop: 'fill', gravity: 'center' },
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

    // Update or create image record
    const defaultImg = defaultImages.find(d => d.key === key);
    
    chatbotImage = await ChatbotImage.findOneAndUpdate(
      { key },
      {
        key,
        name: defaultImg?.name || key,
        description: defaultImg?.description || '',
        imageUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        aspectRatio: '2:1'
      },
      { upsert: true, new: true }
    );

    // Clear cache so new image is used immediately
    chatbotImagesService.clearCache();
    console.log(`[Chatbot Images] Cache cleared after uploading ${key}`);

    res.json(chatbotImage);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset image to default
router.post('/:key/reset', auth, async (req, res) => {
  try {
    const { key } = req.params;
    const defaultImg = defaultImages.find(d => d.key === key);
    
    if (!defaultImg) {
      return res.status(404).json({ error: 'Invalid image key' });
    }

    // Find and delete from Cloudinary if custom image exists
    const existing = await ChatbotImage.findOne({ key });
    if (existing?.cloudinaryPublicId) {
      try {
        await cloudinaryService.deleteImage(existing.cloudinaryPublicId);
      } catch (e) {
        console.log('Could not delete image:', e.message);
      }
    }

    // Reset to default
    const chatbotImage = await ChatbotImage.findOneAndUpdate(
      { key },
      { ...defaultImg, cloudinaryPublicId: null },
      { upsert: true, new: true }
    );

    // Clear cache so reset takes effect immediately
    chatbotImagesService.clearCache();
    console.log(`[Chatbot Images] Cache cleared after resetting ${key}`);

    res.json(chatbotImage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
