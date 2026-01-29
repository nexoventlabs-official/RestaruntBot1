const mongoose = require('mongoose');

// Store cumulative dashboard stats that persist after weekly cleanup
const dashboardStatsSchema = new mongoose.Schema({
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalCustomers: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  // Today's revenue tracking (persists even after order deletion)
  todayRevenue: { type: Number, default: 0 },
  todayOrders: { type: Number, default: 0 },
  todayDate: { type: String, default: '' }, // Format: YYYY-MM-DD
  weeklyHistory: [{
    weekEnding: Date,
    orders: Number,
    revenue: Number,
    customers: Number,
    clearedAt: Date
  }]
});

module.exports = mongoose.model('DashboardStats', dashboardStatsSchema);
