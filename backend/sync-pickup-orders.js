// Script to sync pickup orders to Google Sheets
// Run with: node sync-pickup-orders.js

require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');
const googleSheets = require('./services/googleSheets');

async function syncPickupOrders() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all pickup orders
    const pickupOrders = await Order.find({ 
      serviceType: 'pickup'
    }).sort({ createdAt: -1 });

    console.log(`\n📦 Found ${pickupOrders.length} pickup orders`);

    if (pickupOrders.length === 0) {
      console.log('No pickup orders to sync');
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;

    for (const order of pickupOrders) {
      console.log(`\n🔄 Syncing order: ${order.orderId}`);
      console.log(`   Customer: ${order.customer?.name || 'N/A'}`);
      console.log(`   Phone: ${order.customer?.phone || 'N/A'}`);
      console.log(`   Total: ₹${order.totalAmount}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Payment: ${order.paymentMethod} (${order.paymentStatus})`);
      
      try {
        const result = await googleSheets.addOrder(order);
        
        if (result) {
          console.log(`✅ Successfully synced: ${order.orderId}`);
          successCount++;
        } else {
          console.log(`⚠️ Failed to sync: ${order.orderId}`);
          failCount++;
        }
      } catch (err) {
        console.error(`❌ Failed to sync ${order.orderId}:`, err.message);
        failCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Sync Summary:');
    console.log(`   Total orders: ${pickupOrders.length}`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncPickupOrders();
