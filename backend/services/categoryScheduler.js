const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const cron = require('node-cron');

class CategoryScheduler {
  constructor() {
    this.jobs = new Map();
  }

  // Get current time in specified timezone
  getCurrentTimeInTimezone(timezone = 'Asia/Kolkata') {
    const now = new Date();
    // Get time string in the specified timezone
    const options = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short'
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);
    
    let hours = 0;
    let minutes = 0;
    let weekday = '';
    
    for (const part of parts) {
      if (part.type === 'hour') hours = parseInt(part.value);
      if (part.type === 'minute') minutes = parseInt(part.value);
      if (part.type === 'weekday') weekday = part.value;
    }
    
    // Map weekday to day number (0=Sunday, 1=Monday, etc.)
    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const dayNumber = dayMap[weekday] ?? new Date().getDay();
    
    return { hours, minutes, dayNumber };
  }

  // Check if current time is within schedule
  isWithinSchedule(schedule) {
    if (!schedule || !schedule.enabled) {
      return true; // No schedule means always available
    }

    // Use timezone from schedule, default to Asia/Kolkata
    const timezone = schedule.timezone || 'Asia/Kolkata';
    const { hours: currentHours, minutes: currentMins, dayNumber: currentDay } = this.getCurrentTimeInTimezone(timezone);
    const currentTime = `${currentHours.toString().padStart(2, '0')}:${currentMins.toString().padStart(2, '0')}`;
    
    let startTime, endTime;
    
    // Check for custom days with individual times
    if (schedule.type === 'custom' && schedule.customDays && schedule.customDays.length > 0) {
      // Find today's schedule
      const todaySchedule = schedule.customDays.find(d => d.day === currentDay);
      
      if (!todaySchedule || !todaySchedule.enabled) {
        console.log(`[Category Scheduler] Not scheduled for today (day ${currentDay}) or day disabled`);
        return false; // Not scheduled for today or day is disabled
      }
      
      startTime = todaySchedule.startTime;
      endTime = todaySchedule.endTime;
      console.log(`[Category Scheduler] Custom day schedule for day ${currentDay}: ${startTime} - ${endTime}`);
    }
    // Backward compatibility: custom type with days array (same time for all days)
    else if (schedule.type === 'custom' && schedule.days && schedule.days.length > 0) {
      if (!schedule.days.includes(currentDay)) {
        console.log(`[Category Scheduler] Not scheduled for today (day ${currentDay})`);
        return false; // Not scheduled for today
      }
      startTime = schedule.startTime;
      endTime = schedule.endTime;
    }
    // Daily schedule (same time every day)
    else {
      if (!schedule.startTime || !schedule.endTime) {
        return true; // No time set means always available
      }
      startTime = schedule.startTime;
      endTime = schedule.endTime;
    }

    // Parse time strings (HH:MM format)
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const currentMinutes = currentHours * 60 + currentMins;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    console.log(`[Category Scheduler] Time check (${timezone}): Current=${currentTime} (${currentMinutes} min), Start=${startTime} (${startMinutes} min), End=${endTime} (${endMinutes} min)`);

    // Handle overnight schedules (e.g., 22:00 to 02:00)
    if (endMinutes < startMinutes) {
      const isWithin = currentMinutes >= startMinutes || currentMinutes < endMinutes;
      console.log(`[Category Scheduler] Overnight schedule: ${isWithin ? 'WITHIN' : 'OUTSIDE'} schedule`);
      return isWithin;
    }

    // Normal schedule (e.g., 08:00 to 22:00)
    // Use < for end time so that at exactly end time, it's considered outside
    const isWithin = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    console.log(`[Category Scheduler] Normal schedule: ${isWithin ? 'WITHIN' : 'OUTSIDE'} schedule`);
    return isWithin;
  }

  // Update category pause status based on schedule
  async updateCategoryStatus(categoryId) {
    try {
      const category = await Category.findById(categoryId);
      if (!category) {
        console.log(`[Category Scheduler] Category ${categoryId} not found`);
        return;
      }

      if (!category.schedule || !category.schedule.enabled) {
        console.log(`[Category Scheduler] ${category.name}: Schedule not enabled, skipping`);
        return;
      }

      console.log(`\n[Category Scheduler] ========== Checking ${category.name} ==========`);
      console.log(`  Type: ${category.schedule.type}`);
      if (category.schedule.type === 'custom' && category.schedule.customDays?.length > 0) {
        console.log(`  Custom Days: ${JSON.stringify(category.schedule.customDays)}`);
      } else if (category.schedule.type === 'custom') {
        console.log(`  Days: ${category.schedule.days?.join(', ')} (using global times: ${category.schedule.startTime} to ${category.schedule.endTime})`);
      } else {
        console.log(`  Daily Schedule: ${category.schedule.startTime} to ${category.schedule.endTime}`);
      }

      const shouldBeActive = this.isWithinSchedule(category.schedule);
      const shouldBePaused = !shouldBeActive;

      console.log(`  Result: Should be ${shouldBeActive ? 'ACTIVE' : 'PAUSED'}`);
      console.log(`  Current status: ${category.isPaused ? 'PAUSED' : 'ACTIVE'}, isSoldOut: ${category.isSoldOut ? 'YES' : 'NO'}`);

      // Only update if status needs to change
      // When within schedule, category should NOT be paused (isPaused = false)
      // When outside schedule, category should be paused (isPaused = true)
      // NOTE: Scheduled categories only set isPaused, NOT isSoldOut (sold out is separate manual action)
      if (category.isPaused !== shouldBePaused) {
        const oldStatus = category.isPaused ? 'PAUSED' : 'ACTIVE';
        const newStatus = shouldBePaused ? 'PAUSED' : 'ACTIVE';
        
        category.isPaused = shouldBePaused;
        // Do NOT set isSoldOut - that's for manual sold out action only
        await category.save();
        
        console.log(`  ✓ STATUS CHANGED: ${oldStatus} → ${newStatus}`);
        console.log(`[Category Scheduler] ${category.name}: ${shouldBePaused ? '🔒 LOCKED (outside schedule)' : '▶️  RESUMED (within schedule)'}`);
        
        // When category RESUMES (becomes active), make all items in this category available
        if (!shouldBePaused) {
          const updateResult = await MenuItem.updateMany(
            { category: category.name, available: false },
            { $set: { available: true } }
          );
          if (updateResult.modifiedCount > 0) {
            console.log(`  ✓ Made ${updateResult.modifiedCount} item(s) available in ${category.name}`);
          } else {
            console.log(`  ℹ️  All items in ${category.name} already available`);
          }
        }
      } else {
        console.log(`  ℹ️  No change needed (already ${category.isPaused ? 'paused' : 'active'})`);
      }
      console.log(`[Category Scheduler] ========================================\n`);
    } catch (error) {
      console.error(`[Category Scheduler] Error updating category ${categoryId}:`, error.message);
    }
  }

  // Check if sold out schedule has expired
  isSoldOutExpired(soldOutSchedule) {
    if (!soldOutSchedule || !soldOutSchedule.enabled || !soldOutSchedule.endTime) {
      return false;
    }

    const timezone = soldOutSchedule.timezone || 'Asia/Kolkata';
    const { hours: currentHours, minutes: currentMins } = this.getCurrentTimeInTimezone(timezone);
    
    const [endHour, endMin] = soldOutSchedule.endTime.split(':').map(Number);
    
    const currentMinutes = currentHours * 60 + currentMins;
    const endMinutes = endHour * 60 + endMin;
    
    const currentTime = `${currentHours.toString().padStart(2, '0')}:${currentMins.toString().padStart(2, '0')}`;
    console.log(`[Category Scheduler] Sold out check (${timezone}): Current=${currentTime} (${currentMinutes} min), End=${soldOutSchedule.endTime} (${endMinutes} min)`);
    
    // Check if current time has passed the end time
    return currentMinutes >= endMinutes;
  }

  // Update sold out status based on schedule
  async updateSoldOutStatus(categoryId) {
    try {
      const category = await Category.findById(categoryId);
      if (!category) {
        console.log(`[Category Scheduler] Category ${categoryId} not found`);
        return;
      }

      if (!category.soldOutSchedule || !category.soldOutSchedule.enabled) {
        return;
      }

      console.log(`\n[Category Scheduler] ========== Checking Sold Out for ${category.name} ==========`);
      console.log(`  Sold out until: ${category.soldOutSchedule.endTime}`);

      const isExpired = this.isSoldOutExpired(category.soldOutSchedule);
      
      if (isExpired) {
        console.log(`  ✓ Sold out period EXPIRED - resuming category`);
        
        category.isSoldOut = false;
        category.soldOutSchedule.enabled = false;
        category.soldOutSchedule.endTime = null;
        await category.save();
        
        // When category RESUMES (sold out expires), make all items in this category available
        const updateResult = await MenuItem.updateMany(
          { category: category.name, available: false },
          { $set: { available: true } }
        );
        
        console.log(`[Category Scheduler] ${category.name}: ▶️  RESUMED (sold out expired)`);
        if (updateResult.modifiedCount > 0) {
          console.log(`  ✓ Made ${updateResult.modifiedCount} item(s) available in ${category.name}`);
        } else {
          console.log(`  ℹ️  All items in ${category.name} already available`);
        }
      } else {
        console.log(`  ℹ️  Still sold out until ${category.soldOutSchedule.endTime}`);
      }
      console.log(`[Category Scheduler] ========================================\n`);
    } catch (error) {
      console.error(`[Category Scheduler] Error updating sold out status ${categoryId}:`, error.message);
    }
  }

  // Check all categories with schedules
  async checkAllSchedules() {
    try {
      // Use Asia/Kolkata timezone for logging
      const { hours, minutes, dayNumber } = this.getCurrentTimeInTimezone('Asia/Kolkata');
      const currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayNumber];
      
      console.log(`\n[Category Scheduler] ⏰ Running check at ${currentTime} IST (${currentDay})`);
      
      // Check availability schedules
      const categoriesWithSchedule = await Category.find({ 'schedule.enabled': true });
      
      if (categoriesWithSchedule.length > 0) {
        console.log(`[Category Scheduler] Found ${categoriesWithSchedule.length} category(ies) with availability schedules`);
        for (const category of categoriesWithSchedule) {
          await this.updateCategoryStatus(category._id);
        }
      }
      
      // Check sold out schedules
      const categoriesWithSoldOut = await Category.find({ 'soldOutSchedule.enabled': true });
      
      if (categoriesWithSoldOut.length > 0) {
        console.log(`[Category Scheduler] Found ${categoriesWithSoldOut.length} category(ies) with sold out schedules`);
        for (const category of categoriesWithSoldOut) {
          await this.updateSoldOutStatus(category._id);
        }
      }
      
      if (categoriesWithSchedule.length === 0 && categoriesWithSoldOut.length === 0) {
        console.log('[Category Scheduler] No categories with schedules enabled');
      }
    } catch (error) {
      console.error('[Category Scheduler] Error checking schedules:', error.message);
    }
  }

  // Start the scheduler (runs every minute)
  start() {
    // Run immediately on start
    this.checkAllSchedules();

    // Schedule to run every minute
    this.job = cron.schedule('* * * * *', () => {
      this.checkAllSchedules();
    });

    console.log('[Category Scheduler] Started - checking schedules every minute');
  }

  // Stop the scheduler
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('[Category Scheduler] Stopped');
    }
  }
}

// Export singleton instance
const categoryScheduler = new CategoryScheduler();
module.exports = categoryScheduler;
