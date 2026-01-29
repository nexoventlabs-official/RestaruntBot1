const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String },
  offerType: { type: String, default: '' }, // e.g., "1+1 Offer", "Buy 2 Get 1", "50% Off"
  percentage: { type: Number }, // Discount percentage (optional)
  appliedItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }], // Items this offer applies to
  appliedCategories: [{ type: String }], // Categories this offer applies to
  image: { type: String, required: true }, // Legacy field for backward compatibility
  imageMobile: { type: String }, // Mobile view image (800x160px recommended)
  imageTablet: { type: String }, // Tablet view image (1200x240px recommended)
  imageDesktop: { type: String }, // Desktop view image (1920x384px recommended)
  code: { type: String },
  discountType: { type: String, enum: ['percentage', 'fixed', 'none'], default: 'none' },
  discountValue: { type: Number, default: 0 },
  minOrderAmount: { type: Number, default: 0 },
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date },
  isActive: { type: Boolean, default: true },
  showAsPopup: { type: Boolean, default: true },
  buttonText: { type: String, default: 'Order Now' },
  buttonLink: { type: String, default: '/menu' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

offerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

offerSchema.index({ isActive: 1, showAsPopup: 1 });
offerSchema.index({ validFrom: 1, validUntil: 1 });

module.exports = mongoose.model('Offer', offerSchema);
