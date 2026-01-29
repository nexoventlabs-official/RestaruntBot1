const mongoose = require('mongoose');

const whatsappContactSchema = new mongoose.Schema({
  phone: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  name: { type: String },
  firstOrderDate: { type: Date },
  lastOrderDate: { type: Date },
  totalOrders: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }, // Can be used to opt-out
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

whatsappContactSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('WhatsAppContact', whatsappContactSchema);
