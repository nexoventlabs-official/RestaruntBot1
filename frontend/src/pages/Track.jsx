import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ClockIcon, CheckCircleIcon, XCircleIcon, TruckIcon, 
  PackageIcon, ArrowLeftIcon, RefreshIcon, LocationIcon 
} from '../components/Icons';

const API_URL = 'https://restaruntbot1.onrender.com/api/public';

const statusConfig = {
  pending: { 
    icon: ClockIcon, 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
    iconColor: 'text-yellow-500',
    description: 'Waiting for confirmation' 
  },
  confirmed: { 
    icon: CheckCircleIcon, 
    label: 'Confirmed', 
    color: 'bg-green-100 text-green-700 border-green-200', 
    iconColor: 'text-green-500',
    description: 'Order confirmed' 
  },
  preparing: { 
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ), 
    label: 'Preparing', 
    color: 'bg-blue-100 text-blue-700 border-blue-200', 
    iconColor: 'text-blue-500',
    description: 'Your food is being prepared' 
  },
  ready: { 
    icon: PackageIcon, 
    label: 'Ready', 
    color: 'bg-purple-100 text-purple-700 border-purple-200', 
    iconColor: 'text-purple-500',
    description: 'Ready for pickup/delivery',
    pickupDescription: 'Ready for pickup - Come collect your order!'
  },
  out_for_delivery: { 
    icon: TruckIcon, 
    label: 'On the Way', 
    color: 'bg-orange-100 text-orange-700 border-orange-200', 
    iconColor: 'text-orange-500',
    description: 'Your order is on the way' 
  },
  delivered: { 
    icon: CheckCircleIcon, 
    label: 'Delivered', 
    color: 'bg-green-100 text-green-700 border-green-200', 
    iconColor: 'text-green-500',
    description: 'Order delivered successfully',
    pickupDescription: 'Order completed - Thank you!'
  },
  cancelled: { 
    icon: XCircleIcon, 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-700 border-red-200', 
    iconColor: 'text-red-500',
    description: 'Order was cancelled' 
  },
  refunded: { 
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ), 
    label: 'Refunded', 
    color: 'bg-gray-100 text-gray-700 border-gray-200', 
    iconColor: 'text-gray-500',
    description: 'Payment refunded' 
  }
};

const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
const pickupStatusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'delivered']; // No out_for_delivery for pickup

export default function Track() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const res = await axios.get(`${API_URL}/track/${orderId}`);
      setOrder(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load order');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrder();
  };

  const getStatusIndex = (status) => {
    const isPickup = order?.serviceType === 'pickup';
    const orderFlow = isPickup ? pickupStatusOrder : statusOrder;
    const idx = orderFlow.indexOf(status);
    return idx >= 0 ? idx : -1;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircleIcon className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link 
            to="/menu" 
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors"
          >
            View Our Menu
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = currentStatus.icon;
  const currentStatusIndex = getStatusIndex(order.status);
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const isPickup = order.serviceType === 'pickup';
  const orderFlow = isPickup ? pickupStatusOrder : statusOrder;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors">
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </Link>
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors"
            >
              <RefreshIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="font-medium">Refresh</span>
            </button>
          </div>
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
            <p className="text-gray-500">Order #{order.orderId}</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Current Status Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${currentStatus.color}`}>
              <StatusIcon className={`w-8 h-8 ${currentStatus.iconColor}`} />
            </div>
            <div className="flex-1">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${currentStatus.color}`}>
                {order.status === 'delivered' && isPickup ? 'Completed' : currentStatus.label}
              </span>
              <p className="text-gray-600 mt-2">
                {isPickup && currentStatus.pickupDescription 
                  ? currentStatus.pickupDescription 
                  : currentStatus.description}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-6">
              {isPickup ? 'Pickup Progress' : 'Order Progress'}
            </h3>
            <div className="relative">
              {orderFlow.map((status, index) => {
                const config = statusConfig[status];
                const Icon = config.icon;
                const isCompleted = index < currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const isLast = index === orderFlow.length - 1;
                
                return (
                  <div key={status} className="flex items-start mb-6 last:mb-0">
                    <div className="flex flex-col items-center mr-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        isCompleted || isCurrent 
                          ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircleIcon className="w-6 h-6" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 h-10 mt-2 rounded-full ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                    <div className="pt-3">
                      <p className={`font-medium ${
                        isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {status === 'delivered' && isPickup ? 'Completed' : config.label}
                      </p>
                      {isCurrent && (
                        <p className="text-sm text-green-600 mt-1">Current status</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Order Details</h3>
          
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.unitQty} {item.unit} × {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">₹{item.price * item.quantity}</p>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-200 mt-4 pt-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-2xl text-orange-600">₹{order.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Payment & Delivery Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Order Info</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Payment Method</span>
              <span className="font-medium text-gray-900">
                {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI/Online'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Payment Status</span>
              <span className={`font-medium px-3 py-1 rounded-full text-sm ${
                order.paymentStatus === 'paid' 
                  ? 'bg-green-100 text-green-700' 
                  : order.paymentStatus === 'refunded' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-yellow-100 text-yellow-700'
              }`}>
                {order.paymentStatus === 'paid' ? 'Paid' : 
                 order.paymentStatus === 'refunded' ? 'Refunded' : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Service Type</span>
              <span className="font-medium text-gray-900 capitalize flex items-center gap-2">
                {isPickup ? '🏪 Self-Pickup' : '🛵 Delivery'}
              </span>
            </div>
            {!isPickup && order.deliveryPartnerName && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Delivery Partner</span>
                <span className="font-medium text-gray-900">{order.deliveryPartnerName}</span>
              </div>
            )}
            {!isPickup && order.deliveryAddress && (
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-start gap-3">
                  <LocationIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-gray-500 text-sm">Delivery Address</span>
                    <p className="font-medium text-gray-900 mt-1">{order.deliveryAddress}</p>
                  </div>
                </div>
              </div>
            )}
            {!isPickup && order.estimatedDeliveryTime && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Estimated Delivery</span>
                <span className="font-medium text-gray-900">
                  {new Date(order.estimatedDeliveryTime).toLocaleString('en-GB', { 
                    day: '2-digit', month: '2-digit', year: '2-digit', 
                    hour: '2-digit', minute: '2-digit' 
                  })}
                </span>
              </div>
            )}
            {isPickup && order.status === 'ready' && (
              <div className="pt-3 border-t border-gray-100">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">✨ Your order is ready for pickup!</p>
                  <p className="text-green-600 text-sm mt-1">Please come to the restaurant to collect your order.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        {order.trackingUpdates && order.trackingUpdates.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
            
            <div className="space-y-4">
              {order.trackingUpdates.slice().reverse().map((update, index) => {
                const config = statusConfig[update.status] || { icon: ClockIcon, iconColor: 'text-gray-500' };
                const Icon = config.icon;
                return (
                  <div key={index} className="flex gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      index === 0 ? 'bg-orange-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${index === 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="font-medium text-gray-900">{update.message}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(update.timestamp).toLocaleString('en-GB', { 
                          day: '2-digit', month: '2-digit', year: '2-digit', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Auto-refresh notice */}
        <p className="text-center text-sm text-gray-400 pb-4">
          This page auto-refreshes every 30 seconds
        </p>
      </div>
    </div>
  );
}
