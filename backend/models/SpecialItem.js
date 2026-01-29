const mongoose = require('mongoose');

const specialItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  days: [{ type: Number, min: 0, max: 6 }], // Array of days: 0=Sunday, 1=Monday, ..., 6=Saturday
  day: { type: Number, min: 0, max: 6 }, // Keep for backward compatibility
  daySchedules: {
    type: Map,
    of: {
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '22:00' }
    },
    default: {}
  }, // Per-day schedules: { "0": { startTime: "09:00", endTime: "17:00" }, "1": { startTime: "11:00", endTime: "23:00" } }
  unit: { type: String, default: 'piece', enum: ['piece', 'kg', 'gram', 'liter', 'ml', 'plate', 'bowl', 'cup', 'slice', 'inch', 'full', 'half', 'small'] },
  quantity: { type: Number, default: 1 },
  foodType: { type: String, default: 'none', enum: ['veg', 'nonveg', 'egg', 'none'] },
  image: { type: String },
  available: { type: Boolean, default: true },
  isPaused: { type: Boolean, default: false },
  preparationTime: { type: Number, default: 15 },
  tags: [String],
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save middleware to handle backward compatibility
specialItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // If days array is provided, use it; otherwise use single day for backward compatibility
  if (this.days && this.days.length > 0) {
    // If days array exists, set day to the first day for backward compatibility
    this.day = this.days[0];
  } else if (this.day !== undefined) {
    // If only single day is provided, create days array
    this.days = [this.day];
  }
  
  next();
});

module.exports = mongoose.model('SpecialItem', specialItemSchema);
