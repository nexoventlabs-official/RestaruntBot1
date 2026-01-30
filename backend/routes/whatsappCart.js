// Add to WhatsApp Chatbot Cart API
// POST /api/whatsapp/add-to-cart
// Body: { phone, cart }

const express = require('express');
const Customer = require('../models/Customer');
const router = express.Router();

// Add items to WhatsApp chatbot cart
router.post('/add-to-cart', async (req, res) => {
  try {
    const { phone, cart } = req.body;
    if (!phone || !cart || !Array.isArray(cart)) {
      return res.status(400).json({ error: 'Phone and cart array required' });
    }
    let customer = await Customer.findOne({ phone });
    if (!customer) {
      customer = new Customer({ phone, cart: [] });
    }
    // Replace cart with new items
    customer.cart = cart.map(item => ({
      menuItem: item.menuItem || item._id,
      specialItem: item.specialItemId || undefined,
      isSpecialItem: item.isSpecialItem || false,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      addedAt: new Date()
    }));
    await customer.save();
    res.json({ success: true, cart: customer.cart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
