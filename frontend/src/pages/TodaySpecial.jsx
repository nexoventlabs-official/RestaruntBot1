import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Star, Plus, Minus, Heart, ShoppingCart, X, Clock, Lock, Flame } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';
const SSE_URL = 'http://localhost:5000/api/events';
const WHATSAPP_NUMBER = '15551831644';

// WhatsApp Icon Component
const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Food Type Badge Component
const FoodTypeBadge = ({ type, size = 'md' }) => {
  const config = {
    veg: { color: 'green', label: 'Veg', icon: '🌿' },
    nonveg: { color: 'red', label: 'Non-Veg', icon: '🍗' },
    egg: { color: 'yellow', label: 'Egg', icon: '🥚' }
  };
  const { color, label } = config[type] || config.veg;
  const sizeClasses = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs';
  
  return (
    <span className={`inline-flex items-center gap-1 ${sizeClasses} rounded-full font-medium border-2 ${
      color === 'green' ? 'border-green-500 text-green-600 bg-green-50' :
      color === 'red' ? 'border-red-500 text-red-600 bg-red-50' :
      'border-yellow-500 text-yellow-600 bg-yellow-50'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        color === 'green' ? 'bg-green-500' :
        color === 'red' ? 'bg-red-500' :
        'bg-yellow-500'
      }`} />
      {label}
    </span>
  );
};

export default function TodaySpecial() {
  const [specialItems, setSpecialItems] = useState([]);
  const [daySchedule, setDaySchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogQuantity, setDialogQuantity] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [foodType, setFoodType] = useState('all');
  const eventSourceRef = useRef(null);

  const context = useOutletContext();
  const { 
    cart, addToCart, updateQuantity, 
    addToWishlist, removeFromWishlist, isInWishlist, isInCart,
    setSidebarOpen, setActiveTab
  } = context || {};

  // Update current time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { 
    loadData(); 
    setupSSE();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const setupSSE = () => {
    try {
      eventSourceRef.current = new EventSource(SSE_URL);
      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'menu' || data.type === 'special') loadData();
        } catch (e) {}
      };
      eventSourceRef.current.onerror = () => {
        setTimeout(() => {
          if (eventSourceRef.current) eventSourceRef.current.close();
          setupSSE();
        }, 5000);
      };
    } catch (e) {
      console.error('SSE setup error:', e);
    }
  };

  const loadData = async () => {
    try {
      const currentDay = new Date().getDay();
      
      const [itemsRes, scheduleRes] = await Promise.all([
        axios.get(`${API_URL}/special-items/today`),
        axios.get(`${API_URL}/special-items/schedules/${currentDay}`)
      ]);
      
      setSpecialItems(itemsRes.data);
      setDaySchedule(scheduleRes.data);
    } catch (err) { 
      console.error('Error loading special items:', err); 
    } finally { 
      setLoading(false); 
    }
  };

  // Check if current time is within schedule
  const isWithinSchedule = () => {
    if (!daySchedule || !daySchedule.startTime || !daySchedule.endTime) {
      return true; // No schedule = always available
    }

    const now = currentTime;
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const [startHours, startMins] = daySchedule.startTime.split(':').map(Number);
    const [endHours, endMins] = daySchedule.endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMins;
    const endTotalMinutes = endHours * 60 + endMins;

    // Handle overnight schedules
    if (endTotalMinutes < startTotalMinutes) {
      return currentTotalMinutes >= startTotalMinutes || currentTotalMinutes <= endTotalMinutes;
    }
    
    return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
  };

  // Format time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Check if item is available
  const isItemAvailable = (item) => {
    if (!item.available || item.isPaused) return false;
    return isWithinSchedule();
  };

  // Filter items by food type
  const filteredItems = foodType === 'all' 
    ? specialItems 
    : specialItems.filter(item => item.foodType === foodType);

  // Open item detail dialog
  const openItemDetail = (item) => {
    if (!isItemAvailable(item)) return;
    setSelectedItem(item);
    setDialogQuantity(1);
  };

  // Close item detail dialog
  const closeItemDetail = () => {
    setSelectedItem(null);
    setDialogQuantity(1);
  };

  // Add to cart handler for special items
  const handleAddToCart = () => {
    if (!selectedItem || !addToCart) return;
    
    // Add special item to cart with special flag
    const specialCartItem = {
      ...selectedItem,
      isSpecialItem: true,
      specialItemId: selectedItem._id
    };
    
    for (let i = 0; i < dialogQuantity; i++) {
      addToCart(specialCartItem);
    }
    closeItemDetail();
  };

  // WhatsApp order handler
  const handleWhatsAppOrder = () => {
    if (!selectedItem) return;
    const item = selectedItem;
    const foodTypeLabel = item.foodType === 'veg' ? '🌿 Veg' : 
                          item.foodType === 'nonveg' ? '🍗 Non-Veg' : 
                          item.foodType === 'egg' ? '🥚 Egg' : '';
    
    // Format matches what chatbot expects for special items
    let msg = `Hi! I'd like to order from Today's Special:\n\n`;
    msg += `🔥 *${item.name}*\n`;
    msg += `${foodTypeLabel}\n`;
    msg += `📦 Quantity: ${dialogQuantity}\n`;
    msg += `💰 Price: ₹${item.price} x ${dialogQuantity} = ₹${item.price * dialogQuantity}\n`;
    msg += `\nPlease confirm my order!`;
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    closeItemDetail();
  };

  // Check if special item is in cart
  const isSpecialItemInCart = (item) => {
    if (!cart) return false;
    return cart.some(c => c.specialItemId === item._id || c._id === item._id);
  };

  // Get quantity in cart for special item
  const getCartQuantity = (item) => {
    if (!cart) return 0;
    const cartItem = cart.find(c => c.specialItemId === item._id || c._id === item._id);
    return cartItem ? cartItem.quantity : 0;
  };

  const withinSchedule = isWithinSchedule();

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-32 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-32 bg-gradient-to-b from-orange-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 py-12 md:py-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
          }} />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="text-center text-white">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <Flame className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span className="font-medium">Fresh Daily Specials</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Today's Special
            </h1>
            <p className="text-lg text-white/90 max-w-2xl mx-auto mb-6">
              Discover our chef's special creations, available only today!
            </p>
            
            {/* Schedule Display */}
            {daySchedule && daySchedule.startTime && daySchedule.endTime && (
              <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl ${
                withinSchedule 
                  ? 'bg-green-500/20 border border-green-400/30' 
                  : 'bg-red-500/20 border border-red-400/30'
              }`}>
                <Clock className={`w-5 h-5 ${withinSchedule ? 'text-green-300' : 'text-red-300'}`} />
                <span className="font-medium">
                  {withinSchedule ? 'Available Now' : 'Currently Unavailable'}
                </span>
                <span className="text-white/70">•</span>
                <span className="text-white/90">
                  {formatTime(daySchedule.startTime)} - {formatTime(daySchedule.endTime)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Food Type Filter */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { value: 'all', label: 'All Items', icon: '🍽️' },
            { value: 'veg', label: 'Veg', icon: '🌿' },
            { value: 'nonveg', label: 'Non-Veg', icon: '🍗' },
            { value: 'egg', label: 'Egg', icon: '🥚' }
          ].map(type => (
            <button
              key={type.value}
              onClick={() => setFoodType(type.value)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${
                foodType === type.value
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
              }`}
            >
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-orange-100 flex items-center justify-center">
              <Flame className="w-12 h-12 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Special Items Today</h3>
            <p className="text-gray-500">Check back later for our chef's special creations!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map(item => {
              const available = isItemAvailable(item);
              const inCart = isSpecialItemInCart(item);
              const cartQty = getCartQuantity(item);
              
              return (
                <div
                  key={item._id}
                  className={`group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ${
                    !available ? 'opacity-70' : ''
                  }`}
                >
                  {/* Image Section */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className={`w-full h-full object-cover transition-transform duration-500 ${
                          available ? 'group-hover:scale-110' : 'grayscale'
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                        <Flame className="w-16 h-16 text-orange-300" />
                      </div>
                    )}
                    
                    {/* Locked Overlay */}
                    {!available && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                        <div className="text-center text-white">
                          <Lock className="w-10 h-10 mx-auto mb-2" />
                          <p className="font-medium">Not Available</p>
                          {daySchedule && (
                            <p className="text-sm text-white/70 mt-1">
                              Available {formatTime(daySchedule.startTime)} - {formatTime(daySchedule.endTime)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Fire Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-500 text-white text-sm font-medium shadow-lg">
                        <Flame className="w-4 h-4" />
                        Special
                      </span>
                    </div>
                    
                    {/* Food Type Badge */}
                    <div className="absolute top-3 right-3">
                      <FoodTypeBadge type={item.foodType} />
                    </div>
                    
                    {/* Wishlist Button */}
                    {available && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isInWishlist?.(item)) {
                            removeFromWishlist?.(item);
                          } else {
                            addToWishlist?.(item);
                          }
                        }}
                        className="absolute bottom-3 right-3 p-2.5 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-all"
                      >
                        <Heart 
                          className={`w-5 h-5 ${isInWishlist?.(item) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                        />
                      </button>
                    )}
                  </div>
                  
                  {/* Content Section */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{item.name}</h3>
                    
                    {item.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
                    )}
                    
                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.tags.slice(0, 2).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                        {item.tags.length > 2 && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-medium">
                            +{item.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Price */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-orange-500">₹{item.price}</span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-sm text-gray-400 line-through">₹{item.originalPrice}</span>
                        )}
                      </div>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="px-2 py-1 bg-green-100 text-green-600 text-xs font-semibold rounded-full">
                          {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
                        </span>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    {available ? (
                      <div className="flex gap-2">
                        {inCart ? (
                          <div className="flex-1 flex items-center justify-center gap-3 bg-orange-50 rounded-xl py-2">
                            <button
                              onClick={() => updateQuantity?.(item._id || item.specialItemId, cartQty - 1)}
                              className="p-1.5 rounded-lg bg-white shadow-sm hover:bg-gray-50"
                            >
                              <Minus className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className="font-bold text-orange-500 w-8 text-center">{cartQty}</span>
                            <button
                              onClick={() => updateQuantity?.(item._id || item.specialItemId, cartQty + 1)}
                              className="p-1.5 rounded-lg bg-white shadow-sm hover:bg-gray-50"
                            >
                              <Plus className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openItemDetail(item)}
                            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/30"
                          >
                            <Plus className="w-5 h-5" />
                            Add to Cart
                          </button>
                        )}
                        
                        {/* WhatsApp Quick Order */}
                        <button
                          onClick={() => openItemDetail(item)}
                          className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all shadow-lg shadow-green-500/30"
                        >
                          <WhatsAppIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-500 py-3 rounded-xl font-semibold cursor-not-allowed"
                      >
                        <Lock className="w-5 h-5" />
                        Unavailable
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Item Detail Dialog */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeItemDetail}>
          <div 
            className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative aspect-video">
              {selectedItem.image ? (
                <img
                  src={selectedItem.image}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                  <Flame className="w-20 h-20 text-orange-300" />
                </div>
              )}
              
              {/* Close Button */}
              <button
                onClick={closeItemDetail}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Fire Badge */}
              <div className="absolute bottom-4 left-4">
                <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-orange-500 text-white font-medium shadow-lg">
                  <Flame className="w-5 h-5" />
                  Today's Special
                </span>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedItem.name}</h2>
                  <FoodTypeBadge type={selectedItem.foodType} size="lg" />
                </div>
              </div>
              
              {selectedItem.description && (
                <p className="text-gray-600 mb-4">{selectedItem.description}</p>
              )}
              
              {/* Tags */}
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedItem.tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Price */}
              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl font-bold text-orange-500">₹{selectedItem.price}</span>
                {selectedItem.originalPrice && selectedItem.originalPrice > selectedItem.price && (
                  <>
                    <span className="text-lg text-gray-400 line-through">₹{selectedItem.originalPrice}</span>
                    <span className="px-2 py-1 bg-green-100 text-green-600 text-sm font-semibold rounded-full">
                      {Math.round((1 - selectedItem.price / selectedItem.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
              
              {/* Quantity Selector */}
              <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 mb-6">
                <span className="font-medium text-gray-700">Quantity</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setDialogQuantity(Math.max(1, dialogQuantity - 1))}
                    className="p-2 rounded-xl bg-white shadow-sm hover:bg-gray-100 transition-all"
                  >
                    <Minus className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-xl font-bold text-gray-900 w-8 text-center">{dialogQuantity}</span>
                  <button
                    onClick={() => setDialogQuantity(dialogQuantity + 1)}
                    className="p-2 rounded-xl bg-white shadow-sm hover:bg-gray-100 transition-all"
                  >
                    <Plus className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
              
              {/* Total */}
              <div className="flex items-center justify-between mb-6 p-4 bg-orange-50 rounded-2xl">
                <span className="font-medium text-gray-700">Total</span>
                <span className="text-2xl font-bold text-orange-500">
                  ₹{selectedItem.price * dialogQuantity}
                </span>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-orange-500/30"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
                <button
                  onClick={handleWhatsAppOrder}
                  className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-green-500/30"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
