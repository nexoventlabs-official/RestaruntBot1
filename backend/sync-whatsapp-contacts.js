/**
 * Sync WhatsApp Contacts Script
 * 
 * This script syncs all existing customers with phone numbers to the WhatsAppContact collection.
 * Run this to ensure all old customers are included in WhatsApp broadcasts.
 * 
 * Usage: node sync-whatsapp-contacts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('./models/Customer');
const WhatsAppContact = require('./models/WhatsAppContact');

async function syncContacts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\n=== Starting WhatsApp Contact Sync ===\n');

    // Get all customers with phone numbers
    const customers = await Customer.find({ 
      phone: { $exists: true, $ne: null, $ne: '' } 
    });

    console.log(`Found ${customers.length} customers with phone numbers`);

    let synced = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const customer of customers) {
      try {
        if (!customer.phone || customer.phone.trim() === '') {
          skipped++;
          continue;
        }

        const existingContact = await WhatsAppContact.findOne({ phone: customer.phone });

        if (existingContact) {
          // Update if customer has newer data
          let needsUpdate = false;
          
          if (!existingContact.name && customer.name) {
            existingContact.name = customer.name;
            needsUpdate = true;
          }
          
          if (customer.createdAt && (!existingContact.lastOrderDate || customer.createdAt > existingContact.lastOrderDate)) {
            existingContact.lastOrderDate = customer.createdAt;
            needsUpdate = true;
          }
          
          if (!existingContact.firstOrderDate && customer.createdAt) {
            existingContact.firstOrderDate = customer.createdAt;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await existingContact.save();
            updated++;
            console.log(`✓ Updated: ${customer.phone} (${customer.name || 'No name'})`);
          } else {
            skipped++;
          }
        } else {
          // Create new contact
          const newContact = new WhatsAppContact({
            phone: customer.phone,
            name: customer.name,
            firstOrderDate: customer.createdAt,
            lastOrderDate: customer.createdAt,
            totalOrders: 1,
            isActive: true
          });
          
          await newContact.save();
          synced++;
          console.log(`✓ Added: ${customer.phone} (${customer.name || 'No name'})`);
        }
      } catch (error) {
        errors++;
        console.error(`✗ Error processing ${customer.phone}:`, error.message);
      }
    }

    console.log('\n=== Sync Complete ===');
    console.log(`Total customers processed: ${customers.length}`);
    console.log(`New contacts added: ${synced}`);
    console.log(`Existing contacts updated: ${updated}`);
    console.log(`Skipped (no changes): ${skipped}`);
    console.log(`Errors: ${errors}`);

    // Show final count
    const totalContacts = await WhatsAppContact.countDocuments({ isActive: true });
    console.log(`\nTotal active WhatsApp contacts: ${totalContacts}`);

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing contacts:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

syncContacts();
