import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { StarIcon, ArrowLeftIcon, CheckCircleIcon, XCircleIcon, TruckIcon } from '../components/Icons';

const API_URL = 'https://restaruntbot1.onrender.com/api/public';

export default function Review() {
  const { phone, orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [ratings, setRatings] = useState({});
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOrder();
  }, [phone, orderId]);

  const loadOrder = async () => {
    try {
      const res = await axios.get(`${API_URL}/review/${phone}/${orderId}`);
      setOrder(res.data);
      const existingRatings = {};
      res.data.items.forEach(item => {
        if (item.existingRating) {
          existingRatings[item.menuItemId] = item.existingRating;
        }
      });
      setRatings(existingRatings);
      if (res.data.deliveryPartner?.existingRating) {
        setDeliveryRating(res.data.deliveryPartner.existingRating);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleRating = (menuItemId, rating) => {
    setRatings(prev => ({ ...prev, [menuItemId]: rating }));
  };

  const handleSubmit = async () => {
    const ratingsArray = Object.entries(ratings).map(([menuItemId, rating]) => ({
      menuItemId,
      rating
    }));

    if (ratingsArray.length === 0 && !deliveryRating) {
      alert('Please rate at least one item or the delivery partner');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/review/${phone}/${orderId}`, { 
        ratings: ratingsArray,
        deliveryRating: deliveryRating || null
      });
      setSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ itemId, isDelivery = false }) => {
    const currentRating = isDelivery ? deliveryRating : (ratings[itemId] || 0);
    const [hoverRating, setHoverRating] = useState(0);

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => isDelivery ? setDeliveryRating(star) : handleRating(itemId, star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <StarIcon 
              className={`w-8 h-8 transition-colors ${
                star <= (hoverRating || currentRating) 
                  ? 'text-yellow-400' 
                  : 'text-gray-300'
              }`}
              filled={star <= (hoverRating || currentRating)}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your order...</p>
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
            to="/" 
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors"
          >
            View Our Menu
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-500 mb-6">Your feedback helps us serve you better!</p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors"
          >
            View Our Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="font-medium">Back to Menu</span>
          </Link>
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900">Rate Your Order</h1>
            <p className="text-gray-500">Order #{order.orderId}</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-gray-500">
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              <span>Delivered on {new Date(order.deliveredAt).toLocaleDateString('en-GB', { 
                day: '2-digit', month: 'short', year: 'numeric' 
              })}</span>
            </div>
            <span className="font-bold text-gray-900">₹{order.totalAmount}</span>
          </div>
        </div>

        {/* Delivery Partner Rating */}
        {order.deliveryPartner && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-orange-500" />
              Rate Your Delivery Partner
            </h3>
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0">
                {order.deliveryPartner.photo ? (
                  <img 
                    src={order.deliveryPartner.photo} 
                    alt={order.deliveryPartner.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <TruckIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{order.deliveryPartner.name}</h4>
                {order.deliveryPartner.avgRating > 0 && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <StarIcon className="w-4 h-4 text-yellow-400" filled />
                    <span>{order.deliveryPartner.avgRating}</span>
                    <span>({order.deliveryPartner.totalRatings} reviews)</span>
                  </div>
                )}
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">
                    {order.deliveryPartner.existingRating ? 'Update your rating:' : 'Rate delivery:'}
                  </p>
                  <StarRating isDelivery={true} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Items to Rate */}
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Rate Your Food
        </h3>
        
        <div className="space-y-4">
          {order.items.map(item => (
            <div key={item.menuItemId} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex gap-4">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0" 
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">Qty: {item.quantity} × ₹{item.price}</p>
                  {item.avgRating > 0 && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <StarIcon className="w-4 h-4 text-yellow-400" filled />
                      <span>{item.avgRating}</span>
                      <span>({item.totalRatings} reviews)</span>
                    </div>
                  )}
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">
                      {item.existingRating ? 'Update your rating:' : 'Rate this item:'}
                    </p>
                    <StarRating itemId={item.menuItemId} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 pb-8">
          <button
            onClick={handleSubmit}
            disabled={submitting || (Object.keys(ratings).length === 0 && !deliveryRating)}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
              submitting || (Object.keys(ratings).length === 0 && !deliveryRating)
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl'
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </span>
            ) : 'Submit Review'}
          </button>
          <p className="text-center text-sm text-gray-400 mt-4">
            {Object.keys(ratings).length} of {order.items.length} items rated
            {order.deliveryPartner && (deliveryRating ? ' • Delivery rated ✓' : '')}
          </p>
        </div>
      </div>
    </div>
  );
}
