const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customer: {
    phone: { type: String, required: true },
    name: { type: String },
    email: { type: String },
    address: { type: String }
  },
  deliveryAddress: {
    address: { type: String },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    specialItem: { type: mongoose.Schema.Types.ObjectId, ref: 'SpecialItem' },
    isSpecialItem: { type: Boolean, default: false },
    name: String,
    quantity: Number,
    price: Number,
    unit: { type: String, default: 'piece' },
    unitQty: { type: Number, default: 1 },
    image: String
  }],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded', 'refund_failed'],
    default: 'pending'
  },
  serviceType: { type: String, enum: ['delivery', 'pickup', 'dine_in'], required: true },
  paymentMethod: { type: String, enum: ['upi', 'cod'], default: 'upi' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled', 'refund_processing', 'refund_failed'], default: 'pending' },
  // Actual payment method used at delivery (for COD orders - can be 'cash' or 'upi')
  actualPaymentMethod: { type: String, enum: ['cash', 'upi', null], default: null },
  paymentId: { type: String },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  codPaymentLinkId: { type: String }, // For COD orders paid via QR
  codPaymentId: { type: String }, // Payment ID for COD UPI payments
  refundId: { type: String },
  refundAmount: { type: Number },
  refundStatus: { type: String, enum: ['none', 'pending', 'scheduled', 'approved', 'completed', 'rejected', 'failed'], default: 'none' },
  refundRequestedAt: { type: Date },
  refundProcessedAt: { type: Date },
  refundedAt: { type: Date },
  refundInitiatedAt: { type: Date },
  returnReason: { type: String },
  cancellationReason: { type: String },
  statusUpdatedAt: { type: Date }, // Track when status changed to delivered/cancelled for auto-cleanup
  isHidden: { type: Boolean, default: false }, // Hidden from admin dashboard but kept for user tracking/reviews
  // Delivery partner assignment
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryBoy', default: null },
  assignedAt: { type: Date },
  deliveryPartnerName: { type: String },
  trackingUpdates: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    message: String
  }],
  estimatedDeliveryTime: { type: Date },
  deliveredAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add indexes for frequently queried fields
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ updatedAt: -1 }); // For efficient change detection
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ status: 1, paymentStatus: 1, refundStatus: 1 }); // Compound index for dashboard queries
orderSchema.index({ status: 1, updatedAt: -1 }); // For filtered change detection
orderSchema.index({ status: 1, statusUpdatedAt: 1 }); // For auto-cleanup of delivered/cancelled orders
orderSchema.index({ isHidden: 1 }); // For filtering hidden orders

module.exports = mongoose.model('Order', orderSchema);
