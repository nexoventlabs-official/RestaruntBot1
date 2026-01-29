const Razorpay = require('razorpay');

let razorpay = null;
let lastKeyId = null;

const getRazorpay = () => {
  // Reset instance if credentials changed
  if (!razorpay || lastKeyId !== process.env.RAZORPAY_KEY_ID) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    lastKeyId = process.env.RAZORPAY_KEY_ID;
    console.log('🔑 Razorpay instance created/refreshed');
  }
  return razorpay;
};

const razorpayService = {
  async createOrder(amount, orderId) {
    try {
      const options = {
        amount: amount * 100,
        currency: 'INR',
        receipt: orderId,
        notes: { orderId }
      };
      const order = await getRazorpay().orders.create(options);
      return order;
    } catch (error) {
      console.error('Razorpay create order error:', error.message);
      throw error;
    }
  },

  async createPaymentLink(amount, orderId, customerPhone, customerName) {
    try {
      // Clean phone number - remove all non-digits and ensure proper format
      let cleanPhone = customerPhone.replace(/\D/g, '');
      // Remove leading 91 if present, then add it back properly
      if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
        cleanPhone = cleanPhone.substring(2);
      }
      // Ensure it's 10 digits
      if (cleanPhone.length !== 10) {
        console.error('Invalid phone number length:', cleanPhone.length, 'Phone:', customerPhone);
      }
      const formattedPhone = '+91' + cleanPhone;
      
      console.log('Creating Razorpay payment link:', { 
        amount, 
        orderId, 
        originalPhone: customerPhone,
        formattedPhone,
        customerName 
      });
      
      const paymentLinkOptions = {
        amount: amount * 100,
        currency: 'INR',
        accept_partial: false,
        description: `Order ${orderId}`,
        customer: {
          name: customerName || 'Customer',
          contact: formattedPhone
        },
        notify: { sms: true, email: false },
        reminder_enable: true,
        notes: { orderId },
        callback_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payment/callback`,
        callback_method: 'get'
      };
      
      console.log('Payment link options:', JSON.stringify(paymentLinkOptions, null, 2));
      
      const paymentLink = await getRazorpay().paymentLink.create(paymentLinkOptions);
      console.log('✅ Payment link created:', paymentLink.short_url, 'ID:', paymentLink.id);
      return paymentLink;
    } catch (error) {
      console.error('❌ Razorpay payment link error:', {
        message: error.message,
        code: error.error?.code,
        description: error.error?.description,
        field: error.error?.field,
        source: error.error?.source,
        step: error.error?.step,
        reason: error.error?.reason,
        metadata: error.error?.metadata
      });
      throw error;
    }
  },

  async refund(paymentId, amount, retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 5000; // 5 seconds between retries
    
    try {
      console.log('💰 Attempting refund:', { paymentId, amountInRupees: amount, attempt: retryCount + 1 });
      
      // First fetch payment details to verify it's refundable
      const payment = await getRazorpay().payments.fetch(paymentId);
      const paymentAmountInRupees = payment.amount / 100;
      
      console.log('💰 Payment details:', { 
        status: payment.status, 
        amountInPaise: payment.amount,
        amountInRupees: paymentAmountInRupees,
        captured: payment.captured,
        refund_status: payment.refund_status,
        amount_refunded: payment.amount_refunded,
        created_at: new Date(payment.created_at * 1000).toISOString()
      });
      
      // Check if payment is captured and not already refunded
      if (payment.status !== 'captured') {
        throw new Error(`Payment not captured. Status: ${payment.status}`);
      }
      
      if (payment.refund_status === 'full') {
        throw new Error('Payment already fully refunded');
      }
      
      // Check if payment is too recent (less than 5 minutes old)
      // Razorpay sometimes needs time to fully process payments before allowing refunds
      const paymentAge = Date.now() - (payment.created_at * 1000);
      const MIN_PAYMENT_AGE_MS = 5 * 60 * 1000; // 5 minutes
      
      if (paymentAge < MIN_PAYMENT_AGE_MS) {
        const waitTime = Math.min(MIN_PAYMENT_AGE_MS - paymentAge, 30000); // Wait up to 30 seconds
        console.log(`⏳ Payment is ${Math.round(paymentAge / 1000)}s old, waiting ${Math.round(waitTime / 1000)}s before refund...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Calculate refund amount in paise
      const refundAmountInPaise = Math.round(amount * 100);
      const availableForRefund = payment.amount - (payment.amount_refunded || 0);
      
      console.log('💰 Refund calculation:', {
        requestedRefundInPaise: refundAmountInPaise,
        availableForRefundInPaise: availableForRefund
      });
      
      // Validate refund amount doesn't exceed available amount
      const finalRefundAmount = refundAmountInPaise > availableForRefund ? availableForRefund : refundAmountInPaise;
      
      if (finalRefundAmount <= 0) {
        throw new Error('No amount available for refund');
      }
      
      // Process refund using payments.refund (Razorpay SDK v2.x method)
      console.log('💰 Calling Razorpay refund API:', { paymentId, amountInPaise: finalRefundAmount });
      
      // SDK v2.x: payments.refund(paymentId, options)
      const refund = await getRazorpay().payments.refund(paymentId, {
        amount: finalRefundAmount
      });
      
      console.log('✅ Refund successful:', refund.id, 'Amount:', finalRefundAmount / 100);
      return refund;
    } catch (error) {
      const errorCode = error.error?.code || error.code;
      const errorDesc = error.error?.description || error.message;
      
      console.error('❌ Razorpay refund error:', {
        message: error.message,
        code: errorCode,
        description: errorDesc,
        paymentId,
        amount,
        attempt: retryCount + 1
      });
      
      // Retry on SERVER_ERROR, GATEWAY_ERROR, or BAD_REQUEST_ERROR (timing issues)
      if ((errorCode === 'SERVER_ERROR' || errorCode === 'GATEWAY_ERROR' || 
           (errorCode === 'BAD_REQUEST_ERROR' && errorDesc === 'invalid request sent')) && retryCount < MAX_RETRIES) {
        const retryDelay = errorCode === 'BAD_REQUEST_ERROR' ? 30000 : RETRY_DELAY_MS; // 30s for timing issues
        console.log(`🔄 Retrying refund in ${retryDelay / 1000} seconds... (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.refund(paymentId, amount, retryCount + 1);
      }
      
      throw error;
    }
  },

  async getPaymentDetails(paymentId) {
    try {
      return await getRazorpay().payments.fetch(paymentId);
    } catch (error) {
      console.error('Razorpay fetch payment error:', error.message);
      throw error;
    }
  }
};

module.exports = razorpayService;
