const express = require('express');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const MenuItem = require('../models/MenuItem');
const DashboardStats = require('../models/DashboardStats');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Helper to get today's date string
const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Helper to get or create stats
const getStats = async () => {
  let stats = await DashboardStats.findOne();
  if (!stats) {
    stats = new DashboardStats({ todayDate: getTodayString() });
    await stats.save();
  }
  return stats;
};

// Track today's revenue (call this when order is paid)
const trackTodayRevenue = async (amount) => {
  try {
    const stats = await getStats();
    const today = getTodayString();
    
    // Reset if new day
    if (stats.todayDate !== today) {
      stats.todayRevenue = 0;
      stats.todayOrders = 0;
      stats.todayDate = today;
    }
    
    stats.todayRevenue += amount;
    stats.todayOrders += 1;
    stats.lastUpdated = new Date();
    await stats.save();
    
    return stats;
  } catch (error) {
    console.error('Error tracking today revenue:', error.message);
  }
};

// Export for use in other routes
router.trackTodayRevenue = trackTodayRevenue;

router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getTodayString();
    
    // Run ALL queries in parallel for better performance
    const [
      cumulativeStats,
      currentDeliveredOrders,
      todayAllOrdersCount,
      todayDeliveredCount,
      currentRevenue,
      todayDeliveredRevenue,
      currentCustomers,
      menuItemsCount,
      pendingOrders,
      preparingOrders,
      outForDeliveryOrders,
      recentOrders,
      ordersByStatus
    ] = await Promise.all([
      DashboardStats.findOne().lean(),
      Order.countDocuments({ status: 'delivered' }), // Count only delivered orders for total
      Order.countDocuments({ createdAt: { $gte: today } }), // Orders created today
      Order.countDocuments({ 
        $or: [
          { createdAt: { $gte: today } }, // Created today
          { deliveredAt: { $gte: today } }, // Delivered today
          { updatedAt: { $gte: today }, status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'] } } // Active today
        ]
      }), // All orders active today
      Order.aggregate([{ $match: { paymentStatus: 'paid', status: { $nin: ['cancelled', 'refunded'] }, refundStatus: { $nin: ['completed', 'pending'] } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      // Today's delivered + paid orders (still in DB)
      Order.aggregate([{ 
        $match: { 
          status: 'delivered',
          paymentStatus: 'paid', 
          deliveredAt: { $gte: today }
        } 
      }, { 
        $group: { _id: null, total: { $sum: '$totalAmount' } } 
      }]),
      Customer.countDocuments({ hasOrdered: true }), // Only count customers who have placed orders
      MenuItem.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'preparing' }),
      Order.countDocuments({ status: 'out_for_delivery' }),
      Order.find().sort({ createdAt: -1 }).limit(5).lean(),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    // Use defaults if no cumulative stats
    const stats = cumulativeStats || { totalOrders: 0, totalRevenue: 0, totalCustomers: 0, todayRevenue: 0, todayOrders: 0, todayDate: '', weeklyHistory: [] };

    // Combine cumulative + current stats
    // Total Orders = cumulative (from deleted orders) + current delivered orders
    const totalOrders = stats.totalOrders + currentDeliveredOrders;
    const totalRevenue = stats.totalRevenue + (currentRevenue[0]?.total || 0);
    const totalCustomers = currentCustomers; // Just count customers with hasOrdered: true (they persist)
    
    // Today's orders = use stored stats (includes deleted orders) 
    // The stats.todayOrders is incremented when orders are delivered and persists even after auto-deletion
    const todayOrders = stats.todayDate === todayStr ? stats.todayOrders : 0;
    
    // Today's revenue = use stored stats (includes deleted orders)
    const todayRevenue = stats.todayDate === todayStr ? stats.todayRevenue : 0;

    res.json({
      totalOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      totalCustomers,
      menuItems: menuItemsCount,
      pendingOrders,
      preparingOrders,
      outForDeliveryOrders,
      recentOrders,
      ordersByStatus,
      weeklyHistory: stats.weeklyHistory || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sales', authMiddleware, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const sales = await Order.aggregate([
      { $match: { paymentStatus: 'paid', status: { $nin: ['cancelled', 'refunded'] }, refundStatus: { $nin: ['completed', 'pending'] }, createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/top-items', authMiddleware, async (req, res) => {
  try {
    const topItems = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.name', totalQuantity: { $sum: '$items.quantity' }, totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);
    res.json(topItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual cleanup endpoint (admin only)
router.post('/cleanup', authMiddleware, async (req, res) => {
  try {
    const dailyCleanup = require('../services/dailyCleanup');
    const result = await dailyCleanup.manualCleanup();
    res.json({ 
      success: true, 
      message: 'Daily cleanup completed - removed data older than 10 days',
      ...result 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Comprehensive Report Endpoint
router.get('/report', authMiddleware, async (req, res) => {
  try {
    const ReportHistory = require('../models/ReportHistory');
    const { type, startDate, endDate } = req.query;
    
    // Calculate date range based on report type
    let start = new Date();
    let end = new Date();
    
    switch (type) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        start.setDate(1); // Start of month
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        start.setMonth(0, 1); // Start of year
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (startDate && endDate) {
          start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        }
        break;
      default:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    const dateFilter = { createdAt: { $gte: start, $lte: end } };
    
    // Generate date strings for historical data lookup
    const getDateString = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const startDateStr = getDateString(start);
    const endDateStr = getDateString(end);

    // Run all queries in parallel (current orders + historical data)
    const [
      orders,
      orderStats,
      itemStats,
      categoryStats,
      paymentStats,
      historicalReports,
      allMenuItems
    ] = await Promise.all([
      // Get all orders in range (still in DB)
      Order.find(dateFilter).lean(),
      
      // Order statistics from current orders
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { 
              $sum: { 
                $cond: [
                  { 
                    $and: [
                      { $eq: ['$paymentStatus', 'paid'] }, 
                      { $not: { $in: ['$status', ['cancelled', 'refunded']] } }
                    ] 
                  },
                  '$totalAmount',
                  0
                ]
              }
            },
            deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            refundedOrders: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } }
          }
        }
      ]),
      
      // Item statistics from current orders (with image and rating lookup)
      Order.aggregate([
        { $match: { ...dateFilter, status: { $nin: ['cancelled', 'refunded'] } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'menuitems',
            localField: 'items.menuItem',
            foreignField: '_id',
            as: 'menuItemData'
          }
        },
        {
          $lookup: {
            from: 'menuitems',
            localField: 'items.name',
            foreignField: 'name',
            as: 'menuItemByName'
          }
        },
        {
          $group: {
            _id: '$items.name',
            name: { $first: '$items.name' },
            image: { 
              $first: { 
                $ifNull: [
                  { $arrayElemAt: ['$menuItemData.image', 0] },
                  { $arrayElemAt: ['$menuItemByName.image', 0] }
                ]
              }
            },
            avgRating: {
              $first: {
                $ifNull: [
                  { $arrayElemAt: ['$menuItemData.avgRating', 0] },
                  { $arrayElemAt: ['$menuItemByName.avgRating', 0] }
                ]
              }
            },
            totalRatings: {
              $first: {
                $ifNull: [
                  { $arrayElemAt: ['$menuItemData.totalRatings', 0] },
                  { $arrayElemAt: ['$menuItemByName.totalRatings', 0] }
                ]
              }
            },
            category: { $first: { $arrayElemAt: ['$items.category', 0] } },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        },
        { $sort: { quantity: -1 } }
      ]),
      
      // Category statistics from current orders
      Order.aggregate([
        { $match: { ...dateFilter, status: { $nin: ['cancelled', 'refunded'] } } },
        { $unwind: '$items' },
        { $unwind: { path: '$items.category', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$items.category',
            category: { $first: '$items.category' },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        },
        { $sort: { revenue: -1 } }
      ]),
      
      // Payment method statistics from current orders
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Historical report data (from deleted orders)
      ReportHistory.find({ date: { $gte: startDateStr, $lte: endDateStr } }).lean(),
      
      // Get ALL menu items (including unavailable ones) with ratings
      MenuItem.find({}, { name: 1, image: 1, category: 1, price: 1, available: 1, avgRating: 1, totalRatings: 1 }).lean()
    ]);

    // Combine current stats with historical data
    const currentStats = orderStats[0] || { totalOrders: 0, totalRevenue: 0, deliveredOrders: 0, cancelledOrders: 0, refundedOrders: 0 };
    
    // Aggregate historical stats
    let histRevenue = 0, histOrders = 0, histDelivered = 0, histCancelled = 0, histRefunded = 0;
    let histCod = 0, histUpi = 0, histItemsSold = 0;
    const histItemsMap = {};
    const histCategoriesMap = {};
    
    for (const report of historicalReports) {
      histRevenue += report.revenue || 0;
      histOrders += report.orders || 0;
      histDelivered += report.deliveredOrders || 0;
      histCancelled += report.cancelledOrders || 0;
      histRefunded += report.refundedOrders || 0;
      histCod += report.codOrders || 0;
      histUpi += report.upiOrders || 0;
      histItemsSold += report.itemsSold || 0;
      
      // Merge items
      for (const item of (report.items || [])) {
        if (histItemsMap[item.name]) {
          histItemsMap[item.name].quantity += item.quantity;
          histItemsMap[item.name].revenue += item.revenue;
        } else {
          histItemsMap[item.name] = { ...item };
        }
      }
      
      // Merge categories
      for (const cat of (report.categories || [])) {
        if (histCategoriesMap[cat.category]) {
          histCategoriesMap[cat.category].quantity += cat.quantity;
          histCategoriesMap[cat.category].revenue += cat.revenue;
        } else {
          histCategoriesMap[cat.category] = { ...cat };
        }
      }
    }

    // Combine current + historical
    const totalRevenue = currentStats.totalRevenue + histRevenue;
    const totalOrders = currentStats.totalOrders + histOrders;
    const deliveredOrders = currentStats.deliveredOrders + histDelivered;
    const cancelledOrders = currentStats.cancelledOrders + histCancelled;
    const refundedOrders = currentStats.refundedOrders + histRefunded;
    
    // Combine items
    const combinedItemsMap = { ...histItemsMap };
    for (const item of itemStats) {
      if (combinedItemsMap[item.name]) {
        combinedItemsMap[item.name].quantity += item.quantity;
        combinedItemsMap[item.name].revenue += item.revenue;
        if (item.image) combinedItemsMap[item.name].image = item.image;
        if (item.avgRating) combinedItemsMap[item.name].avgRating = item.avgRating;
        if (item.totalRatings) combinedItemsMap[item.name].totalRatings = item.totalRatings;
      } else {
        combinedItemsMap[item.name] = { name: item.name, image: item.image, category: item.category, quantity: item.quantity, revenue: item.revenue, avgRating: item.avgRating || 0, totalRatings: item.totalRatings || 0 };
      }
    }
    
    // Add ALL menu items to allItemsSold (including those with 0 sales)
    // This ensures every menu item appears in the report
    for (const menuItem of allMenuItems) {
      if (!combinedItemsMap[menuItem.name]) {
        combinedItemsMap[menuItem.name] = {
          name: menuItem.name,
          image: menuItem.image,
          category: Array.isArray(menuItem.category) ? menuItem.category[0] : menuItem.category,
          quantity: 0,
          revenue: 0,
          avgRating: menuItem.avgRating || 0,
          totalRatings: menuItem.totalRatings || 0
        };
      } else {
        // Update image and rating if not set
        if (!combinedItemsMap[menuItem.name].image && menuItem.image) {
          combinedItemsMap[menuItem.name].image = menuItem.image;
        }
        if (!combinedItemsMap[menuItem.name].avgRating && menuItem.avgRating) {
          combinedItemsMap[menuItem.name].avgRating = menuItem.avgRating;
        }
        if (!combinedItemsMap[menuItem.name].totalRatings && menuItem.totalRatings) {
          combinedItemsMap[menuItem.name].totalRatings = menuItem.totalRatings;
        }
      }
    }
    
    const allItemsSold = Object.values(combinedItemsMap).sort((a, b) => b.quantity - a.quantity);
    
    // Combine categories
    const combinedCategoriesMap = { ...histCategoriesMap };
    for (const cat of categoryStats) {
      const catName = cat.category || 'Uncategorized';
      if (combinedCategoriesMap[catName]) {
        combinedCategoriesMap[catName].quantity += cat.quantity;
        combinedCategoriesMap[catName].revenue += cat.revenue;
      } else {
        combinedCategoriesMap[catName] = { category: catName, quantity: cat.quantity, revenue: cat.revenue };
      }
    }
    const revenueByCategory = Object.values(combinedCategoriesMap).sort((a, b) => b.revenue - a.revenue);

    const totalItemsSold = allItemsSold.reduce((sum, item) => sum + item.quantity, 0);
    const avgOrderValue = deliveredOrders > 0 ? Math.round(totalRevenue / deliveredOrders) : 0;
    
    // Payment method counts (current + historical)
    const codOrders = (paymentStats.find(p => p._id === 'cod')?.count || 0) + histCod;
    const upiOrders = (paymentStats.find(p => p._id === 'upi')?.count || 0) + histUpi;

    // Top and least selling items (limit to 5)
    const topSellingItems = allItemsSold.slice(0, 5);
    const leastSellingItems = [...allItemsSold].sort((a, b) => a.quantity - b.quantity).slice(0, 5);

    // Revenue trend (group by date) - combine current orders + historical
    const ordersByDate = {};
    
    // Add historical data to trend
    for (const report of historicalReports) {
      const dateKey = new Date(report.date).toLocaleDateString('en-IN');
      ordersByDate[dateKey] = { 
        label: dateKey, 
        revenue: report.revenue || 0, 
        orders: report.deliveredOrders || 0 
      };
    }
    
    // Add current orders to trend
    orders.forEach(order => {
      if (order.status !== 'cancelled' && order.status !== 'refunded' && order.paymentStatus === 'paid') {
        const dateKey = new Date(order.createdAt).toLocaleDateString('en-IN');
        if (!ordersByDate[dateKey]) {
          ordersByDate[dateKey] = { label: dateKey, revenue: 0, orders: 0 };
        }
        ordersByDate[dateKey].revenue += order.totalAmount || 0;
        ordersByDate[dateKey].orders += 1;
      }
    });
    
    const revenueTrend = Object.values(ordersByDate).sort((a, b) => {
      const dateA = a.label.split('/').reverse().join('-');
      const dateB = b.label.split('/').reverse().join('-');
      return new Date(dateA) - new Date(dateB);
    });

    res.json({
      reportType: type,
      dateRange: { start, end },
      totalRevenue,
      totalOrders,
      totalItemsSold,
      avgOrderValue,
      deliveredOrders,
      cancelledOrders,
      refundedOrders,
      codOrders,
      upiOrders,
      topSellingItems,
      leastSellingItems,
      allItemsSold,
      revenueByCategory,
      revenueTrend
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync today's revenue from existing delivered orders (admin only)
router.post('/sync-today-revenue', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getTodayString();
    
    // Calculate today's revenue from delivered + paid orders
    const result = await Order.aggregate([
      { 
        $match: { 
          status: 'delivered',
          paymentStatus: 'paid',
          deliveredAt: { $gte: today }
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        } 
      }
    ]);
    
    const todayRevenue = result[0]?.total || 0;
    const todayOrders = result[0]?.count || 0;
    
    // Update stats
    await DashboardStats.findOneAndUpdate(
      {},
      { 
        todayDate: todayStr, 
        todayRevenue,
        todayOrders,
        lastUpdated: new Date()
      },
      { upsert: true }
    );
    
    res.json({ 
      success: true, 
      message: `Today's revenue synced: ₹${todayRevenue} from ${todayOrders} orders`,
      todayRevenue,
      todayOrders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download Report as PDF
router.post('/report/download-pdf', authMiddleware, async (req, res) => {
  try {
    const { reportData, reportType } = req.body;
    const { generateReportPdf } = require('../services/reportPdf');
    
    const pdfBuffer = await generateReportPdf(reportData, reportType);
    
    const filename = `FoodAdmin_${reportType}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send Report via Email
router.post('/report/send-email', authMiddleware, async (req, res) => {
  try {
    const { reportData, reportType } = req.body;
    const { generateReportPdf } = require('../services/reportPdf');
    const brevoMail = require('../services/brevoMail');
    
    const reportEmail = process.env.REPORT_EMAIL;
    if (!reportEmail) {
      return res.status(400).json({ error: 'Report email not configured' });
    }
    
    const pdfBuffer = await generateReportPdf(reportData, reportType);
    
    const REPORT_TYPE_LABELS = {
      today: "Today's Report",
      weekly: 'Weekly Report',
      monthly: 'Monthly Report',
      yearly: 'Annual Report',
      custom: 'Custom Range Report'
    };
    
    const reportLabel = REPORT_TYPE_LABELS[reportType] || 'Report';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    
    await brevoMail.sendReportEmail(
      reportEmail,
      `FoodAdmin ${reportLabel} - ${dateStr}`,
      reportData,
      reportType,
      pdfBuffer
    );
    
    res.json({ success: true, message: `Report sent to ${reportEmail}` });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
