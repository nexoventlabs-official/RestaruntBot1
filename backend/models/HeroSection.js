const mongoose = require('mongoose');

const heroSectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String },
  description: { type: String },
  image: { type: String, required: true },
  buttonText: { type: String, default: 'Order Now' },
  buttonLink: { type: String, default: '/menu' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

heroSectionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

heroSectionSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('HeroSection', heroSectionSchema);
