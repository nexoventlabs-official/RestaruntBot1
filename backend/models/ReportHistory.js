const mongoose = require('mongoose');

// Store historical report data that persists after order cleanup
const reportHistorySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Format: YYYY-MM-DD
  revenue: { type: Number, default: 0 },
  orders: { type: Number, default: 0 },
  deliveredOrders: { type: Number, default: 0 },
  cancelledOrders: { type: Number, default: 0 },
  refundedOrders: { type: Number, default: 0 },
  codOrders: { type: Number, default: 0 },
  upiOrders: { type: Number, default: 0 },
  itemsSold: { type: Number, default: 0 },
  // Item-level breakdown
  items: [{
    name: String,
    category: String,
    quantity: Number,
    revenue: Number
  }],
  // Category breakdown
  categories: [{
    category: String,
    quantity: Number,
    revenue: Number
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReportHistory', reportHistorySchema);
