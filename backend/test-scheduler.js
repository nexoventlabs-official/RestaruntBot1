// Test script for category scheduler logic
// Run with: node test-scheduler.js

// Mock schedule data
const testSchedules = [
  {
    name: 'Test 1: 3:45 PM to 10:00 PM',
    schedule: {
      enabled: true,
      type: 'daily',
      startTime: '15:45',
      endTime: '22:00',
      days: []
    }
  },
  {
    name: 'Test 2: 9:00 AM to 11:00 PM',
    schedule: {
      enabled: true,
      type: 'daily',
      startTime: '09:00',
      endTime: '23:00',
      days: []
    }
  },
  {
    name: 'Test 3: Overnight 10:00 PM to 2:00 AM',
    schedule: {
      enabled: true,
      type: 'daily',
      startTime: '22:00',
      endTime: '02:00',
      days: []
    }
  }
];

// Test times
const testTimes = [
  { hour: 3, minute: 44, label: '3:44 AM' },
  { hour: 3, minute: 45, label: '3:45 AM' },
  { hour: 15, minute: 44, label: '3:44 PM' },
  { hour: 15, minute: 45, label: '3:45 PM' },
  { hour: 15, minute: 46, label: '3:46 PM' },
  { hour: 21, minute: 59, label: '9:59 PM' },
  { hour: 22, minute: 0, label: '10:00 PM' },
  { hour: 22, minute: 1, label: '10:01 PM' },
  { hour: 1, minute: 30, label: '1:30 AM' },
];

function isWithinSchedule(schedule, testHour, testMinute) {
  if (!schedule || !schedule.enabled || !schedule.startTime || !schedule.endTime) {
    return true;
  }

  const [startHour, startMin] = schedule.startTime.split(':').map(Number);
  const [endHour, endMin] = schedule.endTime.split(':').map(Number);

  const currentMinutes = testHour * 60 + testMinute;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight schedules
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  // Normal schedule - use < for end time
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

console.log('='.repeat(80));
console.log('CATEGORY SCHEDULER LOGIC TEST');
console.log('='.repeat(80));

testSchedules.forEach(test => {
  console.log(`\n${test.name}`);
  console.log(`Schedule: ${test.schedule.startTime} to ${test.schedule.endTime}`);
  console.log('-'.repeat(80));
  
  testTimes.forEach(time => {
    const isWithin = isWithinSchedule(test.schedule, time.hour, time.minute);
    const status = isWithin ? '✓ ACTIVE (within schedule)' : '✗ PAUSED (outside schedule)';
    console.log(`  ${time.label.padEnd(10)} → ${status}`);
  });
});

console.log('\n' + '='.repeat(80));
console.log('Current server time:', new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
console.log('='.repeat(80));
