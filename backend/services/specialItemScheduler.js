const SpecialItem = require('../models/SpecialItem');
const DaySchedule = require('../models/DaySchedule');
const cron = require('node-cron');

class SpecialItemScheduler {
  constructor() {
    this.job = null;
  }

  // Get current time in specified timezone
  getCurrentTimeInTimezone(timezone = 'Asia/Kolkata') {
    const now = new Date();
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
    
    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const dayNumber = dayMap[weekday] ?? new Date().getDay();
    
    return { hours, minutes, dayNumber };
  }

  // Check if current time is within special item's schedule
  async isWithinSchedule(specialItem, currentDay, currentTotalMinutes) {
    // Check if item is scheduled for today
    const itemDays = specialItem.days && specialItem.days.length > 0 ? specialItem.days : [specialItem.day];
    
    if (!itemDays.includes(currentDay)) {
      return false; // Not scheduled for today
    }

    // Get schedule for this item
    let startTime = null;
    let endTime = null;

    // Use per-day schedule if available
    if (specialItem.daySchedules && specialItem.daySchedules.has(String(currentDay))) {
      const schedule = specialItem.daySchedules.get(String(currentDay));
      startTime = schedule?.startTime;
      endTime = schedule?.endTime;
    }

    // Fallback to global schedule if per-day not set
    if (!startTime || !endTime) {
      const todayGlobalSchedule = await DaySchedule.findOne({ day: currentDay });
      if (todayGlobalSchedule && todayGlobalSchedule.startTime && todayGlobalSchedule.endTime) {
        startTime = todayGlobalSchedule.startTime;
        endTime = todayGlobalSchedule.endTime;
      } else {
        // No schedule set, item is active by default
        return true;
      }
    }

    // Check if within schedule time
    const [startHours, startMins] = startTime.split(':').map(Number);
    const [endHours, endMins] = endTime.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMins;
    const endTotalMinutes = endHours * 60 + endMins;

    // Handle overnight schedules
    if (endTotalMinutes < startTotalMinutes) {
      return currentTotalMinutes >= startTotalMinutes || currentTotalMinutes < endTotalMinutes;
    }

    // Lock at exactly endTime (not available at endTime or after)
    return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes;
  }

  // Update special item status based on schedule
  async updateSpecialItemStatus(specialItem, currentDay, currentTotalMinutes) {
    try {
      const isWithinSchedule = await this.isWithinSchedule(specialItem, currentDay, currentTotalMinutes);
      const shouldBePaused = !isWithinSchedule;

      // Only update if status needs to change
      if (specialItem.isPaused !== shouldBePaused) {
        const oldStatus = specialItem.isPaused ? 'PAUSED' : 'ACTIVE';
        const newStatus = shouldBePaused ? 'PAUSED' : 'ACTIVE';
        
        specialItem.isPaused = shouldBePaused;
        await specialItem.save();
        
        console.log(`[Special Item Scheduler] "${specialItem.name}": ${oldStatus} → ${newStatus} (${shouldBePaused ? 'outside schedule' : 'within schedule'})`);
      }
    } catch (error) {
      console.error(`[Special Item Scheduler] Error updating special item ${specialItem._id}:`, error.message);
    }
  }

  // Check all special items with schedules
  async checkAllSchedules() {
    try {
      const timezone = 'Asia/Kolkata';
      const { hours, minutes, dayNumber } = this.getCurrentTimeInTimezone(timezone);
      const currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayNumber];
      const currentTotalMinutes = hours * 60 + minutes;
      
      console.log(`\n[Special Item Scheduler] ⏰ Running check at ${currentTime} IST (${currentDay})`);
      
      // Get all special items
      const specialItems = await SpecialItem.find({});
      
      if (specialItems.length === 0) {
        console.log('[Special Item Scheduler] No special items found');
        return;
      }

      console.log(`[Special Item Scheduler] Checking ${specialItems.length} special item(s)`);
      
      for (const specialItem of specialItems) {
        await this.updateSpecialItemStatus(specialItem, dayNumber, currentTotalMinutes);
      }
    } catch (error) {
      console.error('[Special Item Scheduler] Error checking schedules:', error.message);
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

    console.log('[Special Item Scheduler] Started - checking schedules every minute');
  }

  // Stop the scheduler
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('[Special Item Scheduler] Stopped');
    }
  }
}

// Export singleton instance
const specialItemScheduler = new SpecialItemScheduler();
module.exports = specialItemScheduler;
