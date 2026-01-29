// Script to sync cancelled orders to Google Sheets
// Run with: node sync-cancelled-orders.js

require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');
const googleSheets = require('./services/googleSheets');

async function syncCancelledOrders() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all cancelled orders
    const cancelledOrders = await Order.find({ status: 'cancelled' });
    console.log(`📋 Found ${cancelledOrders.length} cancelled orders to sync`);

    if (cancelledOrders.length === 0) {
      console.log('✅ No cancelled orders to sync');
      await mongoose.disconnect();
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;

    for (const order of cancelledOrders) {
      console.log(`\n🔄 Syncing order: ${order.orderId}`);
      try {
        const result = await googleSheets.updateOrderStatus(
          order.orderId, 
          'cancelled', 
          order.paymentStatus || 'cancelled'
        );
        
        if (result) {
          console.log(`✅ Successfully synced: ${order.orderId}`);
          successCount++;
        } else {
          console.log(`⚠️ Order not found in sheet: ${order.orderId}`);
          failCount++;
        }
      } catch (err) {
        console.error(`❌ Failed to sync ${order.orderId}:`, err.message);
        failCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n========== SYNC COMPLETE ==========`);
    console.log(`✅ Successfully synced: ${successCount}`);
    console.log(`❌ Failed/Not found: ${failCount}`);
    console.log(`===================================`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

syncCancelledOrders();
