const express = require('express');
const router = express.Router();
const SpecialItem = require('../models/SpecialItem');
const DaySchedule = require('../models/DaySchedule');
const auth = require('../middleware/auth');
const cloudinaryService = require('../services/cloudinary');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to serialize SpecialItem with proper daySchedules conversion
const serializeSpecialItem = (item) => {
  const itemObj = item.toObject ? item.toObject() : item;
  // Convert Map to plain object for JSON serialization
  if (item.daySchedules && item.daySchedules instanceof Map) {
    itemObj.daySchedules = {};
    item.daySchedules.forEach((value, key) => {
      itemObj.daySchedules[key] = {
        startTime: value.startTime,
        endTime: value.endTime
      };
    });
  }
  return itemObj;
};

// Get all special items
router.get('/', async (req, res) => {
  try {
    const items = await SpecialItem.find().sort({ day: 1, sortOrder: 1, createdAt: -1 });
    res.json(items.map(serializeSpecialItem));
  } catch (error) {
    console.error('Error fetching special items:', error);
    res.status(500).json({ error: 'Failed to fetch special items' });
  }
});

// Get active special items for today (items scheduled for today AND within time schedule)
router.get('/today/active', async (req, res) => {
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    // Get the global schedule for today
    const todayGlobalSchedule = await DaySchedule.findOne({ day: currentDay });
    
    // Check if current time is within today's global schedule
    let isWithinSchedule = true;
    if (todayGlobalSchedule && todayGlobalSchedule.startTime && todayGlobalSchedule.endTime) {
      const [startHours, startMins] = todayGlobalSchedule.startTime.split(':').map(Number);
      const [endHours, endMins] = todayGlobalSchedule.endTime.split(':').map(Number);
      
      const startTotalMinutes = startHours * 60 + startMins;
      const endTotalMinutes = endHours * 60 + endMins;

      // Handle overnight schedules
      if (endTotalMinutes < startTotalMinutes) {
        isWithinSchedule = currentTotalMinutes >= startTotalMinutes || currentTotalMinutes <= endTotalMinutes;
      } else {
        isWithinSchedule = currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
      }
    }

    // If outside schedule time, return empty array
    if (!isWithinSchedule) {
      return res.json([]);
    }

    // Get all special items scheduled for today
    const todayItems = await SpecialItem.find({
      $or: [
        { days: currentDay },
        { day: currentDay }
      ],
      available: true,
      isPaused: { $ne: true }
    }).sort({ sortOrder: 1, createdAt: -1 });

    // Add schedule info to each item
    const itemsWithStatus = todayItems.map(item => {
      const itemObj = serializeSpecialItem(item);
      itemObj.isActive = true;
      itemObj.todaySchedule = todayGlobalSchedule ? {
        startTime: todayGlobalSchedule.startTime,
        endTime: todayGlobalSchedule.endTime
      } : null;
      return itemObj;
    });

    res.json(itemsWithStatus);
  } catch (error) {
    console.error('Error fetching active special items:', error);
    res.status(500).json({ error: 'Failed to fetch active special items' });
  }
});

// Get all special items for today (with lock status for display)
router.get('/today', async (req, res) => {
  try {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    // Get the global schedule for today
    const todayGlobalSchedule = await DaySchedule.findOne({ day: currentDay });
    
    // Check if current time is within today's global schedule
    let isWithinSchedule = true;
    if (todayGlobalSchedule && todayGlobalSchedule.startTime && todayGlobalSchedule.endTime) {
      const [startHours, startMins] = todayGlobalSchedule.startTime.split(':').map(Number);
      const [endHours, endMins] = todayGlobalSchedule.endTime.split(':').map(Number);
      
      const startTotalMinutes = startHours * 60 + startMins;
      const endTotalMinutes = endHours * 60 + endMins;

      // Handle overnight schedules
      if (endTotalMinutes < startTotalMinutes) {
        isWithinSchedule = currentTotalMinutes >= startTotalMinutes || currentTotalMinutes <= endTotalMinutes;
      } else {
        isWithinSchedule = currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
      }
    }

    // Get all special items scheduled for today
    const todayItems = await SpecialItem.find({
      $or: [
        { days: currentDay },
        { day: currentDay }
      ]
    }).sort({ sortOrder: 1, createdAt: -1 });

    // Add lock status to each item based on global schedule
    const itemsWithStatus = todayItems.map(item => {
      const itemObj = serializeSpecialItem(item);

      // Item is locked if: not available, is paused, or outside global schedule time
      itemObj.isLocked = !item.available || item.isPaused || !isWithinSchedule;
      itemObj.isActive = item.available && !item.isPaused && isWithinSchedule;
      itemObj.todaySchedule = todayGlobalSchedule ? {
        startTime: todayGlobalSchedule.startTime,
        endTime: todayGlobalSchedule.endTime
      } : null;
      itemObj.lockReason = !item.available ? 'unavailable' : 
                           item.isPaused ? 'paused' : 
                           !isWithinSchedule ? 'outside_schedule' : null;
      
      return itemObj;
    });

    res.json(itemsWithStatus);
  } catch (error) {
    console.error('Error fetching today special items:', error);
    res.status(500).json({ error: 'Failed to fetch today special items' });
  }
});

// Get schedules for all days
router.get('/schedules', async (req, res) => {
  try {
    const schedules = await DaySchedule.find();
    const schedulesMap = {};
    schedules.forEach(schedule => {
      schedulesMap[schedule.day] = {
        startTime: schedule.startTime,
        endTime: schedule.endTime
      };
    });
    res.json(schedulesMap);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Get schedule for a specific day
router.get('/schedules/:day', async (req, res) => {
  try {
    const { day } = req.params;
    const schedule = await DaySchedule.findOne({ day: parseInt(day) });
    
    if (!schedule) {
      return res.json({ day: parseInt(day), startTime: null, endTime: null });
    }
    
    res.json({
      day: schedule.day,
      startTime: schedule.startTime,
      endTime: schedule.endTime
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Update schedule for a specific day
router.put('/schedules/:day', auth, async (req, res) => {
  try {
    const { day } = req.params;
    const { startTime, endTime } = req.body;
    
    const schedule = await DaySchedule.findOneAndUpdate(
      { day: parseInt(day) },
      { startTime, endTime },
      { new: true, upsert: true, runValidators: true }
    );
    
    // Emit SSE event to notify clients
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emit('dataUpdate', { type: 'special' });
    
    res.json(schedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Get single special item
router.get('/:id', async (req, res) => {
  try {
    const item = await SpecialItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Special item not found' });
    }
    res.json(serializeSpecialItem(item));
  } catch (error) {
    console.error('Error fetching special item:', error);
    res.status(500).json({ error: 'Failed to fetch special item' });
  }
});

// Create special item
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    console.log('[SpecialItem Create] Received body:', req.body);
    console.log('[SpecialItem Create] daySchedules raw:', req.body.daySchedules);
    
    const itemData = {
      ...req.body,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []
    };

    // Handle days array or single day
    if (req.body.days) {
      itemData.days = Array.isArray(req.body.days) ? req.body.days.map(d => parseInt(d)) : JSON.parse(req.body.days);
    } else if (req.body.day !== undefined) {
      itemData.day = parseInt(req.body.day);
      itemData.days = [parseInt(req.body.day)];
    }

    // Handle day schedules
    if (req.body.daySchedules) {
      const parsedSchedules = typeof req.body.daySchedules === 'string' ? JSON.parse(req.body.daySchedules) : req.body.daySchedules;
      console.log('[SpecialItem Create] Parsed daySchedules:', parsedSchedules);
      itemData.daySchedules = parsedSchedules;
    }
    
    console.log('[SpecialItem Create] Final itemData.daySchedules:', itemData.daySchedules);

    // Handle image upload
    if (req.file) {
      const imageUrl = await cloudinaryService.uploadFromBuffer(req.file.buffer, 'special-items');
      itemData.image = imageUrl;
    }

    const item = new SpecialItem(itemData);
    console.log('[SpecialItem Create] Item before save, daySchedules:', item.daySchedules);
    await item.save();
    console.log('[SpecialItem Create] Item after save, daySchedules:', item.daySchedules);
    
    // Emit SSE event to notify clients
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emit('dataUpdate', { type: 'special' });
    
    res.status(201).json(serializeSpecialItem(item));
  } catch (error) {
    console.error('Error creating special item:', error);
    res.status(500).json({ error: 'Failed to create special item' });
  }
});

// Update special item
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    console.log('[SpecialItem Update] Received body:', req.body);
    console.log('[SpecialItem Update] daySchedules raw:', req.body.daySchedules);
    
    const itemData = {
      ...req.body,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []
    };
    
    // Handle days array or single day
    if (req.body.days) {
      itemData.days = Array.isArray(req.body.days) ? req.body.days.map(d => parseInt(d)) : JSON.parse(req.body.days);
    } else if (req.body.day !== undefined) {
      itemData.day = parseInt(req.body.day);
      itemData.days = [parseInt(req.body.day)];
    }

    // Handle day schedules
    if (req.body.daySchedules) {
      const parsedSchedules = typeof req.body.daySchedules === 'string' ? JSON.parse(req.body.daySchedules) : req.body.daySchedules;
      console.log('[SpecialItem Update] Parsed daySchedules:', parsedSchedules);
      itemData.daySchedules = parsedSchedules;
    }
    
    console.log('[SpecialItem Update] Final itemData.daySchedules:', itemData.daySchedules);

    // Handle image upload
    if (req.file) {
      const imageUrl = await cloudinaryService.uploadFromBuffer(req.file.buffer, 'special-items');
      itemData.image = imageUrl;
    }

    const item = await SpecialItem.findByIdAndUpdate(
      req.params.id,
      itemData,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Special item not found' });
    }
    
    console.log('[SpecialItem Update] Item after update, daySchedules:', item.daySchedules);

    // Emit SSE event to notify clients
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emit('dataUpdate', { type: 'special' });

    res.json(serializeSpecialItem(item));
  } catch (error) {
    console.error('Error updating special item:', error);
    res.status(500).json({ error: 'Failed to update special item' });
  }
});

// Delete special item
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await SpecialItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Special item not found' });
    }
    
    // Emit SSE event to notify clients
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emit('dataUpdate', { type: 'special' });
    
    res.json({ message: 'Special item deleted successfully' });
  } catch (error) {
    console.error('Error deleting special item:', error);
    res.status(500).json({ error: 'Failed to delete special item' });
  }
});

// Toggle availability
router.patch('/:id/toggle-availability', auth, async (req, res) => {
  try {
    const item = await SpecialItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Special item not found' });
    }

    item.available = !item.available;
    await item.save();
    
    // Emit SSE event to notify clients
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emit('dataUpdate', { type: 'special' });
    
    res.json(serializeSpecialItem(item));
  } catch (error) {
    console.error('Error toggling availability:', error);
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
});

// Toggle pause status
router.patch('/:id/toggle-pause', auth, async (req, res) => {
  try {
    const item = await SpecialItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Special item not found' });
    }

    item.isPaused = !item.isPaused;
    await item.save();
    
    // Emit SSE event to notify clients
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emit('dataUpdate', { type: 'special' });
    res.json(serializeSpecialItem(item));
  } catch (error) {
    console.error('Error toggling pause:', error);
    res.status(500).json({ error: 'Failed to toggle pause' });
  }
});

// Bulk pause/unpause items by category
router.patch('/bulk-pause', auth, async (req, res) => {
  try {
    const { categoryName, isPaused } = req.body;
    
    await SpecialItem.updateMany(
      { category: categoryName },
      { $set: { isPaused } }
    );
    
    res.json({ message: 'Items updated successfully' });
  } catch (error) {
    console.error('Error bulk pausing items:', error);
    res.status(500).json({ error: 'Failed to bulk pause items' });
  }
});

module.exports = router;
