const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String },
  hasOrdered: { type: Boolean, default: false }, // Track if customer has placed at least one order
  addresses: [{
    label: String,
    address: String,
    isDefault: Boolean
  }],
  deliveryAddress: {
    latitude: Number,
    longitude: Number,
    address: String,
    updatedAt: Date
  },
  cart: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    specialItem: { type: mongoose.Schema.Types.ObjectId, ref: 'SpecialItem' },
    isSpecialItem: { type: Boolean, default: false },
    name: String, // Store name for special items
    price: Number, // Store price for special items
    quantity: Number,
    addedAt: { type: Date, default: Date.now }
  }],
  conversationState: {
    currentStep: { type: String, default: 'welcome' },
    selectedService: String,
    selectedCategory: String,
    selectedItem: String,
    selectedSpecialItem: String, // For special items from SpecialItem model
    serviceType: String, // 'delivery' or 'pickup'
    pendingOrderId: String,
    foodTypePreference: String,
    paymentMethod: String,
    lastInteraction: Date,
    context: mongoose.Schema.Types.Mixed
  },
  orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

customerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
