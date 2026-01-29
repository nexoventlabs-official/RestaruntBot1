const express = require('express');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Get phone numbers of customers who have actual orders (processing or confirmed status)
    const ordersWithCustomers = await Order.aggregate([
      {
        $match: {
          status: { $in: ['processing', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'] }
        }
      },
      {
        $group: {
          _id: '$customer.phone'
        }
      }
    ]);
    
    const phonesWithOrders = ordersWithCustomers.map(o => o._id).filter(Boolean);
    
    // Only fetch customers who have placed orders
    const total = await Customer.countDocuments({ phone: { $in: phonesWithOrders } });
    const customers = await Customer.find({ phone: { $in: phonesWithOrders } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Calculate actual order stats for each customer from Orders collection
    const customersWithStats = await Promise.all(customers.map(async (customer) => {
      const customerObj = customer.toObject();
      
      // Get confirmed/delivered orders (not cancelled/pending)
      const orders = await Order.find({ 
        'customer.phone': customer.phone,
        status: { $in: ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'] }
      });
      
      // Get paid orders for total spent (exclude cancelled/refunded)
      const paidOrders = await Order.find({
        'customer.phone': customer.phone,
        paymentStatus: 'paid',
        status: { $nin: ['cancelled', 'refunded'] },
        refundStatus: { $nin: ['completed', 'pending'] }
      });
      
      customerObj.totalOrders = orders.length;
      customerObj.totalSpent = paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      return customerObj;
    }));
    
    res.json({ customers: customersWithStats, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    
    const customerObj = customer.toObject();
    
    // Get all orders for this customer
    const orders = await Order.find({ 'customer.phone': customer.phone })
      .sort({ createdAt: -1 });
    
    // Get confirmed orders count
    const confirmedOrders = orders.filter(o => 
      ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].includes(o.status)
    );
    
    // Get paid orders for total spent (exclude cancelled/refunded)
    const paidOrders = orders.filter(o => 
      o.paymentStatus === 'paid' && 
      !['cancelled', 'refunded'].includes(o.status) &&
      !['completed', 'pending'].includes(o.refundStatus)
    );
    
    customerObj.totalOrders = confirmedOrders.length;
    customerObj.totalSpent = paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    customerObj.orderHistory = orders;
    
    res.json(customerObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;
    const customer = await Customer.findByIdAndUpdate(req.params.id, { name, email }, { new: true });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
