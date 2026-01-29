const express = require('express');
const Category = require('../models/Category');
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

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create category
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, image } = req.body;
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}`, 'i') } });
    if (existing) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    
    let imageUrl = image || null;
    
    // If file uploaded, upload to Cloudinary
    if (req.file) {
      imageUrl = await cloudinaryService.uploadFromBuffer(req.file.buffer, 'restaurant-bot/categories');
    }
    
    const category = new Category({ name, description, image: imageUrl });
    await category.save();
    
    // Emit event for real-time updates
    dataEvents.emit('menu');
    
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update category
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, image, isActive, isPaused, sortOrder, removeImage } = req.body;
    
    // Get existing category to check for old image
    const existingCategory = await Category.findById(req.params.id);
    let imageUrl = existingCategory?.image || null;
    
    // If removeImage flag is set, clear the image
    if (removeImage === 'true' || removeImage === true) {
      if (existingCategory?.image && existingCategory.image.includes('cloudinary.com')) {
        try {
          const publicId = cloudinaryService.extractPublicId(existingCategory.image);
          if (publicId) await cloudinaryService.deleteImage(publicId);
        } catch (e) {
          console.log('Could not delete old image:', e.message);
        }
      }
      imageUrl = null;
    }
    // If new file uploaded, upload to Cloudinary
    else if (req.file) {
      if (existingCategory?.image && existingCategory.image.includes('cloudinary.com')) {
        try {
          const publicId = cloudinaryService.extractPublicId(existingCategory.image);
          if (publicId) await cloudinaryService.deleteImage(publicId);
        } catch (e) {
          console.log('Could not delete old image:', e.message);
        }
      }
      imageUrl = await cloudinaryService.uploadFromBuffer(req.file.buffer, 'restaurant-bot/categories');
    }
    // If image URL provided (for backward compatibility)
    else if (image && image !== existingCategory?.image) {
      imageUrl = image;
    }
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description, image: imageUrl, isActive, isPaused, sortOrder },
      { new: true }
    );
    
    // Emit event for real-time updates
    dataEvents.emit('menu');
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle pause status
router.patch('/:id/toggle-pause', authMiddleware, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    category.isPaused = !category.isPaused;
    await category.save();
    
    // Emit event for real-time updates
    dataEvents.emit('menu');
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update category schedule
router.patch('/:id/schedule', authMiddleware, async (req, res) => {
  try {
    const { enabled, type, startTime, endTime, days, customDays } = req.body;
    
    console.log(`[Schedule API] Updating schedule for category ${req.params.id}`);
    console.log(`[Schedule API] Data:`, { enabled, type, startTime, endTime, days, customDays });
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    console.log(`[Schedule API] Category: ${category.name}, Current isPaused: ${category.isPaused}`);

    // Update schedule
    category.schedule = {
      enabled: enabled || false,
      type: type || 'daily',
      startTime: startTime || null,
      endTime: endTime || null,
      days: days || [],
      customDays: customDays || [], // Custom times per day
      timezone: 'Asia/Kolkata'
    };

    await category.save();
    console.log(`[Schedule API] Schedule saved to database`);

    // Immediately check if category should be paused based on new schedule
    if (enabled) {
      console.log(`[Schedule API] Running scheduler to update category status...`);
      const categoryScheduler = require('../services/categoryScheduler');
      
      try {
        await categoryScheduler.updateCategoryStatus(category._id);
        console.log(`[Schedule API] Scheduler completed successfully`);
      } catch (schedulerError) {
        console.error(`[Schedule API] Scheduler error:`, schedulerError);
      }
      
      // Fetch fresh data after scheduler update
      const updatedCategory = await Category.findById(category._id);
      console.log(`[Schedule API] After scheduler: isPaused = ${updatedCategory.isPaused}`);
      console.log(`[Schedule API] Returning updated category to client`);
      
      // Emit event for real-time updates
      dataEvents.emit('menu');
      
      return res.json(updatedCategory);
    } else {
      // Schedule disabled - unpause category and make all items available
      console.log(`[Schedule API] Schedule disabled - unpausing category and making items available`);
      console.log(`[Schedule API] Category ${category.name} was isPaused: ${category.isPaused}, isSoldOut: ${category.isSoldOut}`);
      
      category.isPaused = false;
      await category.save();
      console.log(`[Schedule API] Category ${category.name} isPaused set to: false`);
      
      // Make all items in this category available
      const MenuItem = require('../models/MenuItem');
      const updateResult = await MenuItem.updateMany(
        { category: category.name, available: false },
        { $set: { available: true } }
      );
      
      if (updateResult.modifiedCount > 0) {
        console.log(`[Schedule API] Made ${updateResult.modifiedCount} item(s) available in ${category.name}`);
      } else {
        console.log(`[Schedule API] No items needed availability update in ${category.name}`);
      }
      
      // Fetch fresh data
      const updatedCategory = await Category.findById(category._id);
      console.log(`[Schedule API] Returning category with isPaused: ${updatedCategory.isPaused}`);
      
      // Emit event for real-time updates
      dataEvents.emit('menu');
      
      return res.json(updatedCategory);
    }
  } catch (error) {
    console.error('[Schedule API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle sold out status for category
// When sold out: marks all items in this category as out of stock
// When resumed: marks all items in this category as available
router.patch('/:id/toggle-soldout', authMiddleware, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    category.isSoldOut = !category.isSoldOut;
    
    // Clear sold out schedule when manually toggling
    if (category.soldOutSchedule) {
      category.soldOutSchedule.enabled = false;
      category.soldOutSchedule.endTime = null;
    }
    
    await category.save();
    
    // Update all items in this category
    if (category.isSoldOut) {
      // Mark all items in this category as out of stock
      const result = await MenuItem.updateMany(
        { category: category.name },
        { $set: { available: false } }
      );
      console.log(`[Category] "${category.name}" marked SOLD OUT - ${result.modifiedCount} item(s) marked out of stock`);
    } else {
      // Mark all items in this category as available
      const result = await MenuItem.updateMany(
        { category: category.name },
        { $set: { available: true } }
      );
      console.log(`[Category] "${category.name}" RESUMED - ${result.modifiedCount} item(s) marked available`);
    }
    
    // Emit event for real-time updates
    dataEvents.emit('menu');
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule sold out for category (temporary sold out until specific time)
// When sold out: marks all items in this category as out of stock
// When schedule expires: scheduler will mark items as available again
router.patch('/:id/schedule-soldout', authMiddleware, async (req, res) => {
  try {
    const { enabled, endTime } = req.body;
    
    console.log(`[SoldOut Schedule API] Updating sold out schedule for category ${req.params.id}`);
    console.log(`[SoldOut Schedule API] Data:`, { enabled, endTime });
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Update sold out schedule
    category.soldOutSchedule = {
      enabled: enabled || false,
      endTime: endTime || null,
      timezone: 'Asia/Kolkata'
    };
    
    // If scheduling sold out, mark category as sold out and items as unavailable
    if (enabled && endTime) {
      category.isSoldOut = true;
      
      // Mark all items in this category as out of stock
      const result = await MenuItem.updateMany(
        { category: category.name },
        { $set: { available: false } }
      );
      console.log(`[Category] "${category.name}" scheduled SOLD OUT until ${endTime} - ${result.modifiedCount} item(s) marked out of stock`);
    }
    
    await category.save();
    
    // Emit event for real-time updates
    dataEvents.emit('menu');
    
    res.json(category);
  } catch (error) {
    console.error('[SoldOut Schedule API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete category
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Get the category before deleting
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const categoryName = category.name;
    
    // Delete category image from Cloudinary if exists
    if (category.image && category.image.includes('cloudinary.com')) {
      try {
        const publicId = cloudinaryService.extractPublicId(category.image);
        if (publicId) await cloudinaryService.deleteImage(publicId);
      } catch (e) {
        console.log('Could not delete category image:', e.message);
      }
    }

    // Find all menu items that have this category
    const itemsWithCategory = await MenuItem.find({ category: categoryName });

    let deletedItemsCount = 0;
    let updatedItemsCount = 0;

    for (const item of itemsWithCategory) {
      if (item.category.length === 1) {
        // Item only has this category, delete it
        // Also delete item image from Cloudinary
        if (item.image && item.image.includes('cloudinary.com')) {
          try {
            const publicId = cloudinaryService.extractPublicId(item.image);
            if (publicId) await cloudinaryService.deleteImage(publicId);
          } catch (e) {
            console.log('Could not delete item image:', e.message);
          }
        }
        await MenuItem.findByIdAndDelete(item._id);
        deletedItemsCount++;
      } else {
        // Item has multiple categories, remove this category from the array
        await MenuItem.findByIdAndUpdate(item._id, {
          $pull: { category: categoryName },
        });
        updatedItemsCount++;
      }
    }

    // Delete the category
    await Category.findByIdAndDelete(req.params.id);

    // Emit event for real-time updates
    dataEvents.emit('menu');

    res.json({
      success: true,
      message: `Category deleted. ${deletedItemsCount} items deleted, ${updatedItemsCount} items updated.`,
      deletedItems: deletedItemsCount,
      updatedItems: updatedItemsCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
