require('dotenv').config();
const mongoose = require('mongoose');
const SpecialItem = require('./models/SpecialItem');
const DaySchedule = require('./models/DaySchedule');
const specialItemScheduler = require('./services/specialItemScheduler');

async function testScheduler() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get current time info
    const now = new Date();
    const currentDay = now.getDay();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    console.log(`📅 Current Day: ${dayNames[currentDay]} (${currentDay})`);
    console.log(`⏰ Current Time: ${currentTime}\n`);

    // Get all special items
    const specialItems = await SpecialItem.find({});
    console.log(`📋 Found ${specialItems.length} special item(s) in database\n`);

    if (specialItems.length === 0) {
      console.log('⚠️  No special items found. Please create some special items first.');
      await mongoose.disconnect();
      return;
    }

    // Show current status of all special items
    console.log('📊 Current Status of Special Items:');
    console.log('═'.repeat(80));
    for (const item of specialItems) {
      const itemDays = item.days && item.days.length > 0 ? item.days : [item.day];
      const scheduledForToday = itemDays.includes(currentDay);
      
      console.log(`\n🔥 ${item.name}`);
      console.log(`   Scheduled Days: ${itemDays.map(d => dayNames[d]).join(', ')}`);
      console.log(`   Scheduled for Today: ${scheduledForToday ? '✅ Yes' : '❌ No'}`);
      console.log(`   Available: ${item.available ? '✅ Yes' : '❌ No'}`);
      console.log(`   Paused: ${item.isPaused ? '🔒 Yes' : '▶️  No'}`);
      
      // Check for per-day schedule
      if (item.daySchedules && item.daySchedules.has(String(currentDay))) {
        const schedule = item.daySchedules.get(String(currentDay));
        console.log(`   Per-Day Schedule: ${schedule.startTime} - ${schedule.endTime}`);
      } else {
        console.log(`   Per-Day Schedule: Not set (uses global schedule)`);
      }
    }
    console.log('\n' + '═'.repeat(80));

    // Get global schedule for today
    const todaySchedule = await DaySchedule.findOne({ day: currentDay });
    if (todaySchedule) {
      console.log(`\n📅 Global Schedule for ${dayNames[currentDay]}:`);
      console.log(`   ${todaySchedule.startTime} - ${todaySchedule.endTime}`);
    } else {
      console.log(`\n📅 No global schedule set for ${dayNames[currentDay]}`);
    }

    // Run the scheduler
    console.log('\n🚀 Running Special Item Scheduler...\n');
    await specialItemScheduler.checkAllSchedules();

    // Show updated status
    console.log('\n📊 Updated Status After Scheduler Run:');
    console.log('═'.repeat(80));
    const updatedItems = await SpecialItem.find({});
    for (const item of updatedItems) {
      const itemDays = item.days && item.days.length > 0 ? item.days : [item.day];
      const scheduledForToday = itemDays.includes(currentDay);
      
      console.log(`\n🔥 ${item.name}`);
      console.log(`   Scheduled for Today: ${scheduledForToday ? '✅ Yes' : '❌ No'}`);
      console.log(`   Available: ${item.available ? '✅ Yes' : '❌ No'}`);
      console.log(`   Paused: ${item.isPaused ? '🔒 Yes (Outside Schedule)' : '▶️  No (Within Schedule)'}`);
      console.log(`   Status: ${item.available && !item.isPaused && scheduledForToday ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);
    }
    console.log('\n' + '═'.repeat(80));

    console.log('\n✅ Test completed successfully!');
    console.log('\n💡 Tip: The scheduler runs every minute automatically when the server is running.');
    console.log('   Items will be automatically paused/unpaused based on their schedules.\n');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

testScheduler();
