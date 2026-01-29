const Order = require('../models/Order');
const Customer = require('../models/Customer');
const DashboardStats = require('../models/DashboardStats');
const ReportHistory = require('../models/ReportHistory');
const dataEvents = require('./eventEmitter');

const CLEANUP_DELAY_HOURS = 1; // Remove delivered/cancelled orders after 1 hour

const orderCleanup = {
  // Get or create dashboard stats document
  async getStats() {
    let stats = await DashboardStats.findOne();
    if (!stats) {
      stats = new DashboardStats();
      await stats.save();
    }
    return stats;
  },

  // Get date string in YYYY-MM-DD format
  getDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  // Get today's date string
  getTodayString() {
    return this.getDateString(new Date());
  },

  // Save report history for orders being deleted
  async saveReportHistory(orders) {
    try {
      // Group orders by date
      const ordersByDate = {};
      
      for (const order of orders) {
        const dateStr = this.getDateString(new Date(order.createdAt));
        if (!ordersByDate[dateStr]) {
          ordersByDate[dateStr] = [];
        }
        ordersByDate[dateStr].push(order);
      }

      // Save/update report history for each date
      for (const [dateStr, dateOrders] of Object.entries(ordersByDate)) {
        let report = await ReportHistory.findOne({ date: dateStr });
        
        if (!report) {
          report = new ReportHistory({ date: dateStr });
        }

        for (const order of dateOrders) {
          const isPaid = order.paymentStatus === 'paid';
          const isDelivered = order.status === 'delivered';
          const isCancelled = order.status === 'cancelled';
          const isRefunded = order.status === 'refunded';

          report.orders += 1;
          if (isDelivered) report.deliveredOrders += 1;
          if (isCancelled) report.cancelledOrders += 1;
          if (isRefunded) report.refundedOrders += 1;
          if (order.paymentMethod === 'cod') report.codOrders += 1;
          if (order.paymentMethod === 'upi') report.upiOrders += 1;

          // Only count revenue for delivered + paid orders
          if (isDelivered && isPaid) {
            report.revenue += order.totalAmount || 0;
          }

          // Track items sold (only for non-cancelled/refunded orders)
          if (!isCancelled && !isRefunded && order.items) {
            for (const item of order.items) {
              report.itemsSold += item.quantity || 0;

              // Update item breakdown
              const existingItem = report.items.find(i => i.name === item.name);
              if (existingItem) {
                existingItem.quantity += item.quantity || 0;
                existingItem.revenue += (item.price || 0) * (item.quantity || 0);
              } else {
                report.items.push({
                  name: item.name,
                  category: Array.isArray(item.category) ? item.category[0] : item.category,
                  quantity: item.quantity || 0,
                  revenue: (item.price || 0) * (item.quantity || 0)
                });
              }

              // Update category breakdown
              const categoryName = Array.isArray(item.category) ? item.category[0] : (item.category || 'Uncategorized');
              const existingCat = report.categories.find(c => c.category === categoryName);
              if (existingCat) {
                existingCat.quantity += item.quantity || 0;
                existingCat.revenue += (item.price || 0) * (item.quantity || 0);
              } else {
                report.categories.push({
                  category: categoryName,
                  quantity: item.quantity || 0,
                  revenue: (item.price || 0) * (item.quantity || 0)
                });
              }
            }
          }
        }

        report.updatedAt = new Date();
        await report.save();
        console.log(`📊 Report history saved for ${dateStr}: ${dateOrders.length} orders`);
      }
    } catch (error) {
      console.error('❌ Error saving report history:', error.message);
    }
  },

  // Save stats before deleting orders
  async saveOrderStats(orders) {
    try {
      const stats = await this.getStats();
      
      const paidOrders = orders.filter(o => o.paymentStatus === 'paid' && o.status !== 'cancelled');
      const revenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      // Add to cumulative totals
      stats.totalOrders += orders.length;
      stats.totalRevenue += revenue;
      stats.lastUpdated = new Date();
      
      await stats.save();
      
      // Also save to report history
      await this.saveReportHistory(orders);
      
      console.log(`📊 Cleanup stats saved: ${orders.length} orders, ₹${revenue} revenue`);
      return stats;
    } catch (error) {
      console.error('❌ Error saving cleanup stats:', error.message);
    }
  },

  // Delete customer if they have no other orders and haven't placed any orders
  async deleteCustomerIfNoOrders(phone) {
    try {
      // Check if customer has any remaining orders
      const remainingOrders = await Order.countDocuments({ 'customer.phone': phone });
      
      if (remainingOrders === 0) {
        // Only delete customers who never placed an order (just chatted)
        // Customers with hasOrdered: true should be kept for accurate count
        const customer = await Customer.findOne({ phone });
        
        if (customer && !customer.hasOrdered) {
          // Customer never placed an order, safe to delete
          const result = await Customer.deleteOne({ phone });
          if (result.deletedCount > 0) {
            console.log(`👤 Deleted customer: ${phone} (never placed an order)`);
            return true;
          }
        }
        // If customer has hasOrdered: true, keep them for count persistence
      }
      return false;
    } catch (error) {
      console.error(`❌ Error deleting customer ${phone}:`, error.message);
      return false;
    }
  },

  // Hide delivered, cancelled, and refunded orders older than 1 hour from status update
  async cleanupCompletedOrders() {
    try {
      const cutoffTime = new Date(Date.now() - CLEANUP_DELAY_HOURS * 60 * 60 * 1000);
      
      // Find delivered/cancelled/refunded orders where statusUpdatedAt is older than 1 hour and not already hidden
      const ordersToHide = await Order.find({
        status: { $in: ['delivered', 'cancelled', 'refunded'] },
        statusUpdatedAt: { $lt: cutoffTime, $exists: true },
        isHidden: { $ne: true }
      });
      
      if (ordersToHide.length === 0) {
        return 0;
      }
      
      console.log(`🧹 Found ${ordersToHide.length} completed orders to hide (status updated >1 hour ago)`);
      
      // Save cumulative stats before hiding (for total revenue/orders tracking)
      await this.saveOrderStats(ordersToHide);
      
      // Hide the orders instead of deleting
      const orderIds = ordersToHide.map(o => o._id);
      const result = await Order.updateMany(
        { _id: { $in: orderIds } },
        { $set: { isHidden: true } }
      );
      
      console.log(`✅ Hidden ${result.modifiedCount} delivered/cancelled/refunded orders from admin dashboard`);
      
      // Emit event to update frontend
      dataEvents.emit('orders');
      dataEvents.emit('dashboard');
      
      return result.modifiedCount;
    } catch (error) {
      console.error('❌ Error hiding completed orders:', error.message);
      return 0;
    }
  },

  // Start the scheduler (runs every 5 minutes)
  start() {
    console.log(`🧹 Order cleanup scheduler started - removes delivered/cancelled/refunded orders after ${CLEANUP_DELAY_HOURS} hour(s)`);
    
    // Run immediately on start
    this.cleanupCompletedOrders();
    
    // Then run every 5 minutes
    setInterval(() => {
      this.cleanupCompletedOrders();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
};

module.exports = orderCleanup;
