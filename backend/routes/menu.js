const express = require('express');
const MenuItem = require('../models/MenuItem');
const authMiddleware = require('../middleware/auth');
const cloudinaryService = require('../services/cloudinary');
const dataEvents = require('../services/eventEmitter');
const multer = require('multer');
const router = express.Router();

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

router.get('/', async (req, res) => {
  try {
    const items = await MenuItem.find().sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await MenuItem.distinct('category');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, originalPrice, category, unit, quantity, foodType, offerType, available, preparationTime, tags, image } = req.body;
    const parseTags = (t) => Array.isArray(t) ? t : (typeof t === 'string' ? t.split(',').map(s => s.trim()).filter(Boolean) : []);
    const parseCategory = (c) => {
      if (Array.isArray(c)) return c;
      if (typeof c === 'string') {
        try { return JSON.parse(c); } catch { return [c]; }
      }
      return [];
    };
    const parseOfferType = (o) => {
      if (Array.isArray(o)) return o;
      if (typeof o === 'string') {
        try { return JSON.parse(o); } catch { return o ? [o] : []; }
      }
      return [];
    };
    
    let imageUrl = image || null;
    
    // If file uploaded, upload to Cloudinary
    if (req.file) {
      imageUrl = await cloudinaryService.uploadFromBuffer(req.file.buffer, 'restaurant-bot/menu-items');
    }
    
    const itemData = {
      name, description, price: parseFloat(price), category: parseCategory(category),
      unit: unit || 'piece',
      quantity: parseFloat(quantity) || 1,
      foodType: foodType || 'none',
      offerType: parseOfferType(offerType),
      available: available !== false && available !== 'false',
      preparationTime: parseInt(preparationTime) || 15,
      tags: parseTags(tags),
      image: imageUrl
    };
    
    // Add originalPrice if provided
    if (originalPrice && originalPrice.trim()) {
      itemData.originalPrice = parseFloat(originalPrice);
    }
    
    const item = new MenuItem(itemData);
    await item.save();
    
    // Emit event for real-time updates
    dataEvents.emit('menu');
    
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, originalPrice, category, unit, quantity, foodType, offerType, available, preparationTime, tags, image, removeImage } = req.body;
    const parseTags = (t) => Array.isArray(t) ? t : (typeof t === 'string' ? t.split(',').map(s => s.trim()).filter(Boolean) : []);
    const parseCategory = (c) => {
      if (Array.isArray(c)) return c;
      if (typeof c === 'string') {
        try { return JSON.parse(c); } catch { return [c]; }
      }
      return [];
    };
    const parseOfferType = (o) => {
      if (Array.isArray(o)) return o;
      if (typeof o === 'string') {
        try { return JSON.parse(o); } catch { return o ? [o] : []; }
      }
      return [];
    };
    
    // Get existing item to check for old image
    const existingItem = await MenuItem.findById(req.params.id);
    let imageUrl = existingItem?.image || null;
    
    // If removeImage flag is set, clear the image
    if (removeImage === 'true' || removeImage === true) {
      // Delete old image from Cloudinary if it exists
      if (existingItem?.image && existingItem.image.includes('cloudinary.com')) {
        try {
          const publicId = cloudinaryService.extractPublicId(existingItem.image);
          if (publicId) await cloudinaryService.deleteImage(publicId);
        } catch (e) {
          console.log('Could not delete old image:', e.message);
        }
      }
      imageUrl = null;
    }
    // If new file uploaded, upload to Cloudinary
    else if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (existingItem?.image && existingItem.image.includes('cloudinary.com')) {
        try {
          const publicId = cloudinaryService.extractPublicId(existingItem.image);
          if (publicId) await cloudinaryService.deleteImage(publicId);
        } catch (e) {
          console.log('Could not delete old image:', e.message);
        }
      }
      imageUrl = await cloudinaryService.uploadFromBuffer(req.file.buffer, 'restaurant-bot/menu-items');
    }
    // If image URL provided (for backward compatibility)
    else if (image && image !== existingItem?.image) {
      imageUrl = image;
    }
    
    const update = {
      name, description, price: parseFloat(price), category: parseCategory(category),
      unit: unit || 'piece',
      quantity: parseFloat(quantity) || 1,
      foodType: foodType || 'none',
      offerType: parseOfferType(offerType),
      available: available !== false && available !== 'false',
      preparationTime: parseInt(preparationTime) || 15,
      tags: parseTags(tags),
      image: imageUrl
    };
    
    // Add originalPrice if provided, otherwise remove it
    if (originalPrice && originalPrice.trim()) {
      update.originalPrice = parseFloat(originalPrice);
    } else {
      update.originalPrice = null;
    }
    
    const item = await MenuItem.findByIdAndUpdate(req.params.id, update, { new: true });
    
    // Emit event for real-time updates
    dataEvents.emit('menu');
    
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Get item to delete its image from Cloudinary
    const item = await MenuItem.findById(req.params.id);
    if (item?.image && item.image.includes('cloudinary.com')) {
      try {
        const publicId = cloudinaryService.extractPublicId(item.image);
        if (publicId) await cloudinaryService.deleteImage(publicId);
      } catch (e) {
        console.log('Could not delete image:', e.message);
      }
    }
    
    await MenuItem.findByIdAndDelete(req.params.id);
    
    // Emit event for real-time updates
    dataEvents.emit('menu');
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle pause status for a menu item
router.patch('/:id/toggle-pause', authMiddleware, async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    item.isPaused = !item.isPaused;
    await item.save();
    
    // Emit event for real-time updates
    dataEvents.emit('menu');
    
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk pause items by category
router.patch('/bulk-pause', authMiddleware, async (req, res) => {
  try {
    const { categoryName, isPaused } = req.body;
    if (!categoryName) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    const result = await MenuItem.updateMany(
      { category: categoryName },
      { isPaused: isPaused !== false }
    );
    
    // Emit event for real-time updates
    dataEvents.emit('menu');
    
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle Today's Special status for a menu item
router.patch('/:id/toggle-special', authMiddleware, async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    item.isTodaySpecial = !item.isTodaySpecial;
    await item.save();
    
    // Emit event for real-time updates
    dataEvents.emit('menu');
    
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
