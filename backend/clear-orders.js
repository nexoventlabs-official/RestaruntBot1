// Script to clear only orders and order-related data
// Keeps: Categories, Menu Items, Customers, Delivery Boys, Chatbot Images, Hero Sections, Offers
// Clears: Orders, Dashboard Stats, Report History
require('dotenv').config();
const mongoose = require('mongoose');

const Order = require('./models/Order');
const DashboardStats = require('./models/DashboardStats');
const ReportHistory = require('./models/ReportHistory');

async function clearOrdersData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🗑️ Clearing orders and related data only...\n');

    // Clear Orders
    const orderResult = await Order.deleteMany({});
    console.log(`📦 Orders deleted: ${orderResult.deletedCount}`);

    // Clear Dashboard Stats (order statistics)
    const dashResult = await DashboardStats.deleteMany({});
    console.log(`📊 Dashboard Stats deleted: ${dashResult.deletedCount}`);

    // Clear Report History (order reports)
    const reportResult = await ReportHistory.deleteMany({});
    console.log(`📈 Report History deleted: ${reportResult.deletedCount}`);

    console.log('\n✅ Orders and related data cleared successfully!');
    console.log('💡 Menu items, categories, customers, and other data remain intact.');

  } catch (error) {
    console.error('❌ Error clearing orders data:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

clearOrdersData();
