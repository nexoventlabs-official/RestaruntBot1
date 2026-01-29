const mongoose = require('mongoose');

const dayScheduleSchema = new mongoose.Schema({
  day: { type: Number, required: true, unique: true, min: 0, max: 6 }, // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: { type: String, default: '09:00' }, // Format: "HH:MM" (24-hour)
  endTime: { type: String, default: '22:00' },   // Format: "HH:MM" (24-hour)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

dayScheduleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('DaySchedule', dayScheduleSchema);
