const mongoose = require('mongoose');

// Schema for day-specific schedule
const dayScheduleSchema = new mongoose.Schema({
  day: { type: Number, min: 0, max: 6, required: true }, // 0=Sunday, 1=Monday, ..., 6=Saturday
  enabled: { type: Boolean, default: true },
  startTime: { type: String }, // Format: "HH:MM" (24-hour)
  endTime: { type: String }    // Format: "HH:MM" (24-hour)
}, { _id: false });

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  image: { type: String },
  isActive: { type: Boolean, default: true },
  isPaused: { type: Boolean, default: false },
  isSoldOut: { type: Boolean, default: false }, // Category sold out status
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  
  // Schedule fields (for availability timing)
  schedule: {
    enabled: { type: Boolean, default: false },
    type: { type: String, enum: ['daily', 'custom'], default: 'daily' },
    startTime: { type: String }, // Format: "HH:MM" (24-hour) - used for 'daily' type
    endTime: { type: String },   // Format: "HH:MM" (24-hour) - used for 'daily' type
    days: [{ type: Number, min: 0, max: 6 }], // 0=Sunday, 1=Monday, ..., 6=Saturday (for custom type - backward compatibility)
    customDays: [dayScheduleSchema], // Custom schedule per day with different times
    timezone: { type: String, default: 'Asia/Kolkata' }
  },
  
  // Sold out schedule fields (for temporary sold out timing)
  soldOutSchedule: {
    enabled: { type: Boolean, default: false },
    endTime: { type: String }, // Format: "HH:MM" (24-hour) - when to resume availability
    timezone: { type: String, default: 'Asia/Kolkata' }
  }
});

module.exports = mongoose.model('Category', categorySchema);
