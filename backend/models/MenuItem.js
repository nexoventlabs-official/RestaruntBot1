const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  originalPrice: { type: Number }, // Original price before discount
  offerPrice: { type: Number }, // Price after offer discount is applied
  category: { type: [String], required: true },
  unit: { type: String, default: 'piece', enum: ['piece', 'kg', 'gram', 'liter', 'ml', 'plate', 'bowl', 'cup', 'slice', 'inch', 'full', 'half', 'small', 'half glass', 'full glass'] },
  quantity: { type: Number, default: 1 },
  foodType: { type: String, default: 'none', enum: ['veg', 'nonveg', 'egg', 'none'] },
  offerType: { type: [String], default: [] }, // Links to offer types from Offers (can have multiple)
  image: { type: String },
  available: { type: Boolean, default: true },
  isPaused: { type: Boolean, default: false },
  isTodaySpecial: { type: Boolean, default: false }, // Mark as Today's Special
  preparationTime: { type: Number, default: 15 },
  tags: [String],
  ratings: [{
    phone: { type: String, required: true },
    orderId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    createdAt: { type: Date, default: Date.now }
  }],
  avgRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

menuItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
