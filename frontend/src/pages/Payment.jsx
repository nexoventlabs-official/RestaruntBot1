import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import api from '../api';

export default function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState(null);
  const [razorpayOpened, setRazorpayOpened] = useState(false);

  const loadRazorpayScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }, []);

  const openRazorpayCheckout = useCallback(async (orderData, razorpayData) => {
    if (razorpayOpened) return;
    
    try {
      await loadRazorpayScript();
      setRazorpayOpened(true);

      const options = {
        key: razorpayData.keyId,
        amount: razorpayData.amount,
        currency: 'INR',
        name: razorpayData.merchantName || 'Restaurant Order',
        description: `Order #${orderData.orderId}`,
        order_id: razorpayData.razorpayOrderId,
        prefill: {
          contact: orderData.customer?.phone || ''
        },
        notes: {
          orderId: orderData.orderId
        },
        theme: {
          color: '#f97316'
        },
        ...(razorpayData.configId && { checkout_config_id: razorpayData.configId }),
        handler: async function(response) {
          try {
            await api.post('/payment/verify-upi', {
              orderId: orderData.orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
            navigate(`/payment-success/${orderData.orderId}`);
          } catch (err) {
            console.error('Verification error:', err);
            setError('Payment verification failed. Please contact support.');
            setRazorpayOpened(false);
          }
        },
        modal: {
          ondismiss: function() {
            setRazorpayOpened(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function(response) {
        console.error('Payment failed:', response.error);
        setError(`Payment failed: ${response.error.description || 'Please try again'}`);
        setRazorpayOpened(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to open payment. Please try again.');
      setRazorpayOpened(false);
    }
  }, [razorpayOpened, loadRazorpayScript, navigate]);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/public/order/${orderId}`);
        if (res.data) {
          setOrder(res.data);
          if (res.data.paymentStatus === 'paid') {
            setIsPaid(true);
          } else if (res.data.status === 'cancelled') {
            setError('This order has been cancelled.');
          } else {
            // Create Razorpay order
            const razorpayRes = await api.post('/payment/create-upi-order', {
              orderId: res.data.orderId,
              amount: res.data.totalAmount
            });
            setRazorpayOrder(razorpayRes.data);
          }
        } else {
          setError('Order not found');
        }
      } catch (err) {
        setError('Failed to load order details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Auto-open Razorpay when ready
  useEffect(() => {
    if (order && razorpayOrder && !isPaid && !error && !razorpayOpened) {
      openRazorpayCheckout(order, razorpayOrder);
    }
  }, [order, razorpayOrder, isPaid, error, razorpayOpened, openRazorpayCheckout]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Payment Issue</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => { setError(null); setRazorpayOpened(false); window.location.reload(); }}
            className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show paid receipt/bill
  if (isPaid && order) {
    const paidDate = order.updatedAt ? new Date(order.updatedAt) : new Date();
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold">Payment Successful</h1>
              <p className="text-green-100 mt-1">Thank you for your order!</p>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center pb-4 border-b border-dashed">
                <div>
                  <p className="text-sm text-gray-500">Order ID</p>
                  <p className="font-bold text-gray-800">{order.orderId}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium text-gray-800">
                    {paidDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="py-4 border-b border-dashed">
                <p className="text-sm font-semibold text-gray-500 mb-3">ORDER ITEMS</p>
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800">{item.name}</span>
                      <span className="text-gray-400 text-sm">×{item.quantity}</span>
                    </div>
                    <span className="font-medium text-gray-800">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="py-4 border-b border-dashed">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-gray-800">Total Paid</span>
                  <span className="text-green-600">₹{order.totalAmount}</span>
                </div>
              </div>
              <div className="py-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="font-medium text-gray-800">UPI / Online</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-500">Payment Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">✓ Paid</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-500">Order Status</span>
                  <span className="font-medium text-gray-800 capitalize">{order.status?.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 mt-4 text-center">
                <p className="text-green-700 text-sm">🎉 Your order is being prepared!<br/>Check WhatsApp for live updates.</p>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => window.close()} className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">Close</button>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">🔒 Secured by Razorpay</p>
        </div>
      </div>
    );
  }

  // Fallback UI while Razorpay opens
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Opening Payment</h1>
        <p className="text-gray-500 mb-6">Order #{order?.orderId} • ₹{order?.totalAmount}</p>
        
        {order && razorpayOrder && (
          <button
            onClick={() => { setRazorpayOpened(false); openRazorpayCheckout(order, razorpayOrder); }}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            Pay ₹{order?.totalAmount} Now
          </button>
        )}
        
        <p className="text-center text-xs text-gray-400 mt-4">
          🔒 Secure payment powered by Razorpay
        </p>
      </div>
    </div>
  );
}
