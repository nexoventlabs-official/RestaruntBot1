import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import api from '../api';
import { Star, Plus, Minus, Heart, ShoppingCart, X, Clock, Package, Search, Tag } from 'lucide-react';
import { useCachedData } from '../hooks/useImagePreloader';

const API_URL = 'https://restaruntbot1.onrender.com/api/public';
const SSE_URL = 'https://restaruntbot1.onrender.com/api/events';
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
  const { color, label, icon } = config[type] || config.veg;
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

export default function UserMenuPage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [foodType, setFoodType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [bannerFading, setBannerFading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogQuantity, setDialogQuantity] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const eventSourceRef = useRef(null);

  // Get cached data from preloader
  const cachedData = useCachedData();

  const context = useOutletContext();
  const { 
    cart, addToCart, updateQuantity, 
    addToWishlist, removeFromWishlist, isInWishlist, isInCart,
    setSidebarOpen, setActiveTab
  } = context || {};

  useEffect(() => { 
    loadData(); 
    setupSSE();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
  
  useEffect(() => { loadItems(); }, [selectedCategory, foodType]);

  // Handle food type change with fade effect
  const handleFoodTypeChange = (type) => {
    if (type === foodType) return;
    setBannerFading(true);
    setTimeout(() => {
      setFoodType(type);
      setTimeout(() => setBannerFading(false), 50);
    }, 300);
  };

  const setupSSE = () => {
    try {
      eventSourceRef.current = new EventSource(SSE_URL);
      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'menu') loadData();
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
      // Use cached data if available
      if (cachedData.isLoaded && cachedData.categories && cachedData.menu) {
        setCategories(cachedData.categories);
        setItems(cachedData.menu);
        setAllItems(cachedData.menu);
        setLoading(false);
        return;
      }
      
      const [catRes, itemRes] = await Promise.all([
        axios.get(`${API_URL}/categories`), 
        axios.get(`${API_URL}/menu`)
      ]);
      setCategories(catRes.data);
      setItems(itemRes.data);
      setAllItems(itemRes.data);
    } catch (err) { 
      console.error('Error loading data:', err); 
    } finally { 
      setLoading(false); 
    }
  };

  const loadItems = async () => {
    setItemsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (foodType !== 'all') params.append('foodType', foodType);
      const res = await axios.get(`${API_URL}/menu?${params}`);
      setItems(res.data);
    } catch (err) { 
      console.error('Error loading items:', err); 
    } finally { 
      setItemsLoading(false); 
    }
  };

  // Get active categories (available status)
  const activeCategoryNames = categories
    .filter(cat => cat.isActive && cat.categoryStatus === 'available')
    .map(cat => cat.name);

  // Get all category names for display
  const allCategoryNames = categories
    .filter(cat => cat.isActive)
    .map(cat => cat.name);

  // Show all items including unavailable ones
  const displayItems = items.filter(item => {
    const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
    // Item is shown if at least one of its categories exists
    const hasCategory = itemCategories.some(cat => allCategoryNames.includes(cat));
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query));
      return hasCategory && matchesSearch;
    }
    
    return hasCategory;
  });

  // Get item status (available, soldout, or unavailable)
  const getItemStatus = (item) => {
    return item.itemStatus || 'available';
  };

  // Format time from 24h to 12h format
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, mins] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  // Get schedule display text for item
  const getScheduleText = (item) => {
    if (!item.scheduleInfo) return null;
    const { startTime, endTime } = item.scheduleInfo;
    if (startTime && endTime) {
      return `${formatTime(startTime)} - ${formatTime(endTime)}`;
    }
    return null;
  };

  // Get schedule display text for category
  const getCategoryScheduleText = (cat) => {
    if (!cat.scheduleInfo) return null;
    const { startTime, endTime } = cat.scheduleInfo;
    if (startTime && endTime) {
      return `${formatTime(startTime)} - ${formatTime(endTime)}`;
    }
    return null;
  };

  // Get item count for a category from all items
  const getCategoryItemCount = (categoryName) => {
    return allItems.filter(item => {
      const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
      return itemCategories.includes(categoryName);
    }).length;
  };

  // Get total items count
  const getTotalItemsCount = () => {
    return allItems.length;
  };

  const isItemAvailable = (itemId) => {
    const item = items.find(i => i._id === itemId);
    if (!item) return false;
    return item.itemStatus === 'available';
  };

  const handleToggleWishlist = (item, e) => {
    e.stopPropagation();
    if (!addToWishlist || !removeFromWishlist) return;
    isInWishlist(item._id) ? removeFromWishlist(item._id) : addToWishlist(item);
  };

  const handleAddToCart = (item, e) => { 
    e.stopPropagation(); 
    if (!isItemAvailable(item._id) || !addToCart) return;
    addToCart(item); 
  };

  // WhatsApp order: send cart to backend, then open WhatsApp with a simple message
  const handleWhatsAppOrder = async (item, e) => {
    e?.stopPropagation();
    if (!cart || !cart.length) return;
    // Get user phone (ask or from context/localStorage)
    let phone = localStorage.getItem('user_phone');
    if (!phone) {
      phone = prompt('Enter your WhatsApp number (with country code):');
      if (!phone) return;
      localStorage.setItem('user_phone', phone);
    }
    try {
      await api.post('/whatsapp/add-to-cart', {
        phone,
        cart: cart.map(c => ({
          ...c,
          menuItem: c._id,
          specialItemId: c.specialItemId,
          isSpecialItem: c.isSpecialItem,
          name: c.name,
          price: c.price,
          quantity: c.quantity
        }))
      });
      // Open WhatsApp with a simple message
      // Always send a simple trigger message, not item details
      const msg = 'Hi! I want to order from my website cart.';
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (err) {
      alert('Failed to sync cart to WhatsApp. Please try again.');
    }
  };

  // Open item detail dialog
  const openItemDialog = (item) => {
    setSelectedItem(item);
    setDialogQuantity(cart?.find(c => c._id === item._id)?.quantity || 1);
    // Prevent body scroll when dialog is open
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    // Stop Lenis if it exists
    if (window.lenis) window.lenis.stop();
  };

  // Close item detail dialog
  const closeItemDialog = () => {
    setSelectedItem(null);
    setDialogQuantity(1);
    // Restore body scroll
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    // Start Lenis if it exists
    if (window.lenis) window.lenis.start();
  };

  // Add to cart from dialog
  const handleDialogAddToCart = () => {
    if (!selectedItem || !addToCart) return;
    for (let i = 0; i < dialogQuantity; i++) {
      addToCart(selectedItem);
    }
    closeItemDialog();
  };

  // WhatsApp order from dialog with quantity
  // WhatsApp order from dialog: send cart to backend, then open WhatsApp
  const handleDialogWhatsApp = async () => {
    if (!selectedItem) return;
    // Add selected item with dialogQuantity to cart for WhatsApp sync
    let phone = localStorage.getItem('user_phone');
    if (!phone) {
      phone = prompt('Enter your WhatsApp number (with country code):');
      if (!phone) return;
      localStorage.setItem('user_phone', phone);
    }
    try {
      await api.post('/whatsapp/add-to-cart', {
        phone,
        cart: [
          {
            ...selectedItem,
            menuItem: selectedItem._id,
            specialItemId: selectedItem.specialItemId,
            isSpecialItem: selectedItem.isSpecialItem,
            name: selectedItem.name,
            price: selectedItem.price,
            quantity: dialogQuantity
          }
        ]
      });
      // Always send a simple trigger message, not item details
      const msg = 'Hi! I want to order from my website cart.';
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
      closeItemDialog();
    } catch (err) {
      alert('Failed to sync cart to WhatsApp. Please try again.');
    }
  };

  const filteredCategories = [...new Set(displayItems.flatMap(i => Array.isArray(i.category) ? i.category : [i.category]))]
    .filter(cat => allCategoryNames.includes(cat));

  const MenuItemSkeleton = () => (
    <div className="relative pt-20 sm:pt-24">
      <div className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 z-10 w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48">
        <div className="w-full h-full bg-gray-300 rounded-full animate-pulse"></div>
      </div>
      <div className="bg-[rgb(245,241,232)] rounded-2xl sm:rounded-3xl pt-16 sm:pt-20 md:pt-22 px-3 sm:px-4 md:px-5 pb-3 sm:pb-4 md:pb-5 shadow-[0_2px_15px_rgba(0,0,0,0.08)] border border-gray-100 animate-pulse">
        <div className="flex justify-between mb-2">
          <div className="h-4 sm:h-5 w-20 sm:w-28 bg-gray-200 rounded"></div>
          <div className="h-4 sm:h-5 w-4 sm:w-5 bg-gray-200 rounded-full"></div>
        </div>
        <div className="flex gap-0.5 sm:gap-1 mb-2 sm:mb-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-3 w-3 sm:h-4 sm:w-4 bg-gray-200 rounded"></div>)}
        </div>
        <div className="h-3 sm:h-4 w-full bg-gray-200 rounded mb-1"></div>
        <div className="h-3 sm:h-4 w-3/4 bg-gray-200 rounded mb-2 sm:mb-4"></div>
        <div className="flex justify-between items-center">
          <div className="h-6 sm:h-7 w-14 sm:w-16 bg-gray-200 rounded"></div>
          <div className="h-8 sm:h-10 md:h-11 w-8 sm:w-10 md:w-11 bg-gray-200 rounded-lg sm:rounded-xl"></div>
        </div>
      </div>
    </div>
  );

  // Banner data for each food type
  const bannerData = {
    all: {
      title: 'Our Menu',
      subtitle: 'Explore our delicious collection of dishes',
      image: '/banner-delicious-tacos.jpg',
      align: 'center'
    },
    veg: {
      title: 'Vegetarian Menu',
      subtitle: 'Fresh and healthy vegetarian delights',
      image: '/vegetables-with-salt-corn-cob.jpg',
      align: 'left'
    },
    nonveg: {
      title: 'Non-Veg Menu',
      subtitle: 'Savor our premium meat selections',
      image: '/preparing-raw-barbeque-chicken-cooking.jpg',
      align: 'right'
    },
    egg: {
      title: 'Egg Specials',
      subtitle: 'Delicious egg-based dishes for you',
      image: '/friied-eggs-with-vegetables.jpg',
      align: 'left'
    }
  };

  const currentBanner = bannerData[foodType] || bannerData.all;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ffffff]">
        {/* Hero Banner Skeleton */}
        <section className="relative pt-28 pb-16 bg-gray-300 animate-pulse">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <div className="h-10 w-64 bg-gray-400 rounded mx-auto mb-4"></div>
            <div className="h-6 w-96 bg-gray-400 rounded mx-auto"></div>
          </div>
        </section>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 pt-8">
            {[...Array(8)].map((_, i) => <MenuItemSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  const renderItemCard = (item) => {
    const inCart = isInCart ? isInCart(item._id) : false;
    const cartItem = cart?.find(c => c._id === item._id);
    const itemStatus = getItemStatus(item);
    const available = itemStatus === 'available';
    const rating = item.avgRating || 0;
    const totalRatings = item.totalRatings || 0;

    const renderStars = () => {
      const stars = [];
      for (let i = 1; i <= 5; i++) {
        stars.push(
          <Star 
            key={i} 
            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
          />
        );
      }
      return stars;
    };
    
    return (
      <div 
        key={item._id} 
        className={`group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 ease-out flex sm:flex-col ${!available ? 'opacity-75' : ''}`}
        onClick={() => available && openItemDialog(item)}
      >
        {/* Image Container - Full height on mobile, square on larger screens */}
        <div className="relative w-36 sm:w-full h-full sm:h-48 md:h-56 lg:h-64 flex-shrink-0 overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 p-2">
          {item.image ? (
            <img 
              src={item.image} 
              alt={item.name} 
              className={`w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 ease-out ${!available ? 'grayscale' : ''}`} 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl sm:text-6xl md:text-7xl">🍽️</span>
            </div>
          )}
          
          {/* Food Type Icon - Top Left */}
          {item.foodType && item.foodType !== 'none' && (
            <div className={`absolute top-3 left-3 w-6 h-6 border-2 rounded flex items-center justify-center z-20 ${
              item.foodType === 'veg' ? 'border-green-600 bg-white' :
              item.foodType === 'nonveg' ? 'border-red-600 bg-white' :
              'border-yellow-600 bg-white'
            }`}>
              <span className={`w-3 h-3 rounded-full ${
                item.foodType === 'veg' ? 'bg-green-600' :
                item.foodType === 'nonveg' ? 'bg-red-600' :
                'bg-yellow-600'
              }`} />
            </div>
          )}
          
          {/* WhatsApp Button - Bottom Right on Image */}
          {available && (
            <button 
              onClick={(e) => handleWhatsAppOrder(item, e)} 
              className="absolute bottom-3 right-3 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-all hover:scale-110 shadow-lg z-20"
              title="Order via WhatsApp"
            >
              <WhatsAppIcon className="w-5 h-5" />
            </button>
          )}
          
          {/* Sold Out Overlay */}
          {itemStatus === 'soldout' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <span className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">Sold Out</span>
            </div>
          )}
          
          {/* Unavailable Overlay */}
          {itemStatus === 'unavailable' && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-10 gap-1">
              <span className="bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">Unavailable</span>
              {item.scheduleInfo && (
                <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {getScheduleText(item)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content - Flex grow to fill space */}
        <div className="p-4 flex flex-col flex-grow min-w-0">
          {/* Name & Wishlist */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-gray-900 text-base sm:text-lg line-clamp-1 sm:line-clamp-2 flex-1 sm:min-h-[3rem]">{item.name}</h3>
            <button 
              onClick={(e) => handleToggleWishlist(item, e)} 
              className="p-1.5 hover:scale-110 transition-transform flex-shrink-0 bg-gray-50 rounded-full"
            >
              <Heart className={`w-5 h-5 ${isInWishlist && isInWishlist(item._id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </button>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-3">
            <div className="flex">{renderStars()}</div>
            <span className="text-xs text-gray-500 font-medium">({totalRatings})</span>
          </div>

          {/* Price Section with more spacing */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold text-orange-600">
              ₹{item.offerPrice && item.offerPrice < item.price ? item.offerPrice : item.price}
            </span>
            {item.offerPrice && item.offerPrice < item.price && (
              <>
                <span className="text-sm text-gray-400 line-through">₹{item.price}</span>
                <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-md">
                  {Math.round(((item.price - item.offerPrice) / item.price) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          {/* Quantity and Preparation Time - Side by Side with Cart Icon */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Package className="w-4 h-4 text-gray-500" />
                <span className="font-medium whitespace-nowrap">{item.unitQty || 1} {item.unit || 'piece'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-medium whitespace-nowrap">{item.preparationTime || 15} mins</span>
              </div>
            </div>

            {/* Cart Button - Icon Only */}
            {itemStatus === 'soldout' ? (
              <button className="w-10 h-10 bg-red-100 text-red-500 rounded-xl cursor-not-allowed flex items-center justify-center" disabled title="Sold Out">
                <ShoppingCart className="w-5 h-5" />
              </button>
            ) : itemStatus === 'unavailable' ? (
              <button className="w-10 h-10 bg-gray-200 text-gray-500 rounded-xl cursor-not-allowed flex items-center justify-center" disabled title="Unavailable">
                <ShoppingCart className="w-5 h-5" />
              </button>
            ) : inCart ? (
              <button 
                onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); setActiveTab('cart'); }} 
                className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl flex items-center justify-center hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg relative flex-shrink-0"
                title="View Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-green-600 rounded-full text-xs font-bold flex items-center justify-center">
                  {cartItem?.quantity}
                </span>
              </button>
            ) : (
              <button 
                onClick={(e) => handleAddToCart(item, e)} 
                className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl flex items-center justify-center hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg flex-shrink-0"
                title="Add to Cart"
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#ffffff]">
      {/* Hero Banner Section */}
      <section 
        className={`relative text-white pt-28 pb-16 bg-cover bg-center transition-opacity duration-300 ${bannerFading ? 'opacity-0' : 'opacity-100'}`}
        style={{ backgroundImage: `url('${currentBanner.image}')` }}
      >
        <div className={`relative max-w-6xl mx-auto px-4 ${
          currentBanner.align === 'left' ? 'text-left' : 
          currentBanner.align === 'right' ? 'text-right' : 'text-center'
        }`}>
          <span className="inline-block px-4 py-1.5 bg-[#3f9065] text-white text-sm font-medium rounded-full mb-4 tracking-wide uppercase">
            {foodType === 'all' ? 'Explore' : foodType === 'veg' ? '🌿 Pure Veg' : foodType === 'nonveg' ? '🍗 Non-Veg' : '🥚 Egg Special'}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg">
            <span className="text-white">{currentBanner.title.split(' ')[0]}</span>{' '}
            <span className="text-[#ff9924]">{currentBanner.title.split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className={`text-lg md:text-xl text-gray-100 font-light drop-shadow-md ${
            currentBanner.align === 'center' ? 'max-w-2xl mx-auto' : 'max-w-xl'
          } ${currentBanner.align === 'right' ? 'ml-auto' : ''}`}>
            {currentBanner.subtitle}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Food Type Filter */}
        <div className="flex items-center justify-center gap-4 md:gap-8 mb-8 py-6">
          {/* All */}
          <button 
            onClick={() => handleFoodTypeChange('all')} 
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 transition-all duration-300 ${
              foodType === 'all' 
                ? 'border-gray-900 shadow-lg scale-110' 
                : 'border-transparent hover:border-gray-300'
            }`}>
              <img src="/all.png" alt="All" className="w-full h-full object-cover" />
            </div>
            <span className={`text-sm font-medium transition-colors ${
              foodType === 'all' ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'
            }`}>All</span>
          </button>

          {/* Veg */}
          <button 
            onClick={() => handleFoodTypeChange('veg')} 
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 transition-all duration-300 ${
              foodType === 'veg' 
                ? 'border-green-500 shadow-lg scale-110' 
                : 'border-transparent hover:border-green-300'
            }`}>
              <img src="/veg.png" alt="Veg" className="w-full h-full object-cover" />
            </div>
            <span className={`text-sm font-medium transition-colors flex items-center gap-1 ${
              foodType === 'veg' ? 'text-green-600' : 'text-gray-500 group-hover:text-green-600'
            }`}>
              <span className="w-3 h-3 rounded border-2 border-green-500 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </span>
              Veg
            </span>
          </button>

          {/* Non-Veg */}
          <button 
            onClick={() => handleFoodTypeChange('nonveg')} 
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 transition-all duration-300 ${
              foodType === 'nonveg' 
                ? 'border-red-500 shadow-lg scale-110' 
                : 'border-transparent hover:border-red-300'
            }`}>
              <img src="/non-veg.png" alt="Non-Veg" className="w-full h-full object-cover" />
            </div>
            <span className={`text-sm font-medium transition-colors flex items-center gap-1 ${
              foodType === 'nonveg' ? 'text-red-600' : 'text-gray-500 group-hover:text-red-600'
            }`}>
              <span className="w-3 h-3 rounded border-2 border-red-500 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </span>
              Non-Veg
            </span>
          </button>

          {/* Egg */}
          <button 
            onClick={() => handleFoodTypeChange('egg')} 
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 transition-all duration-300 ${
              foodType === 'egg' 
                ? 'border-yellow-500 shadow-lg scale-110' 
                : 'border-transparent hover:border-yellow-300'
            }`}>
              <img src="/egg.png" alt="Egg" className="w-full h-full object-cover" />
            </div>
            <span className={`text-sm font-medium transition-colors flex items-center gap-1 ${
              foodType === 'egg' ? 'text-yellow-600' : 'text-gray-500 group-hover:text-yellow-600'
            }`}>
              <span className="w-3 h-3 rounded border-2 border-yellow-500 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              </span>
              Egg
            </span>
          </button>
        </div>

        {/* Category Filter */}
        <div 
          className="mb-8 overflow-x-auto pb-6 scrollbar-hide"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            overscrollBehaviorY: 'auto',
            touchAction: 'pan-x pan-y',
            position: 'relative',
            zIndex: 10
          }}
          data-lenis-prevent
          onTouchStart={(e) => {
            const container = e.currentTarget;
            container.startX = container.scrollLeft;
            container.startY = window.scrollY;
          }}
          onTouchMove={(e) => {
            const container = e.currentTarget;
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - (container.touchStartX || touch.clientX));
            const deltaY = Math.abs(touch.clientY - (container.touchStartY || touch.clientY));
            
            // If horizontal movement is greater, allow horizontal scroll
            // Otherwise, allow vertical page scroll
            if (deltaX > deltaY) {
              e.stopPropagation();
            }
            
            container.touchStartX = touch.clientX;
            container.touchStartY = touch.clientY;
          }}
          onWheel={(e) => {
            e.stopPropagation();
            const container = e.currentTarget;
            container.scrollLeft += e.deltaY;
          }}
        >
          <div className="flex gap-4 md:gap-6 px-1 pb-2" style={{ minWidth: 'min-content' }}>
            {/* All Items */}
            <button 
              onClick={() => setSelectedCategory('all')} 
              className="flex-shrink-0 group"
            >
              <div className="relative w-36 md:w-44">
                <div className={`${selectedCategory === 'all' ? 'bg-[#3f9065]' : 'bg-[#F5F1E8] group-hover:bg-[#3f9065]'} rounded-t-full rounded-b-3xl pt-6 pb-14 px-4 transition-all duration-300`}>
                  <div className="flex justify-center mb-4">
                    <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center ${selectedCategory === 'all' ? 'bg-white/20' : 'bg-orange-100'} transition-all duration-300`}>
                      <span className={`text-lg md:text-xl font-bold ${selectedCategory === 'all' ? 'text-white' : 'text-orange-500 group-hover:text-white'} transition-colors duration-300`}>All</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className={`font-semibold text-sm md:text-base transition-colors duration-300 ${selectedCategory === 'all' ? 'text-yellow-400' : 'text-gray-900 group-hover:text-white'}`}>All Items</h3>
                    <p className={`text-xs mt-0.5 transition-colors duration-300 ${selectedCategory === 'all' ? 'text-white/80' : 'text-gray-400 group-hover:text-white/80'}`}>{getTotalItemsCount()} Items</p>
                  </div>
                </div>
                <img 
                  src="/cat-1-bottom.png" 
                  alt="" 
                  className="absolute -bottom-2 left-0 right-0 w-full h-auto pointer-events-none"
                />
              </div>
            </button>

            {/* Category Items */}
            {categories.filter(cat => cat.isActive).map(cat => {
              const itemCount = getCategoryItemCount(cat.name);
              const isUnavailable = cat.categoryStatus !== 'available';
              const isSoldOut = cat.categoryStatus === 'soldout';
              
              return (
                <button 
                  key={cat._id} 
                  onClick={() => !isUnavailable && setSelectedCategory(cat.name)} 
                  className={`flex-shrink-0 group ${isUnavailable ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="relative w-36 md:w-44">
                    <div className={`${selectedCategory === cat.name ? 'bg-[#3f9065]' : isUnavailable ? 'bg-gray-200' : 'bg-[#F5F1E8] group-hover:bg-[#3f9065]'} rounded-t-full rounded-b-3xl pt-6 pb-14 px-4 transition-all duration-300`}>
                      <div className="flex justify-center mb-4">
                        {cat.image ? (
                          <img 
                            src={cat.image} 
                            alt={cat.name} 
                            className={`w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-lg transition-transform group-hover:scale-110 ${isUnavailable ? 'grayscale' : ''}`}
                          />
                        ) : (
                          <div className="w-20 h-20 md:w-24 md:h-24 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-3xl">🍽️</span>
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <h3 className={`font-semibold text-sm md:text-base transition-colors duration-300 line-clamp-1 ${selectedCategory === cat.name ? 'text-yellow-400' : isUnavailable ? 'text-gray-500' : 'text-gray-900 group-hover:text-white'}`}>{cat.name}</h3>
                        {isSoldOut ? (
                          <p className="text-xs mt-0.5 text-red-500 font-semibold">Sold Out</p>
                        ) : isUnavailable && cat.scheduleInfo ? (
                          <p className="text-xs mt-0.5 text-indigo-500 font-medium">{getCategoryScheduleText(cat)}</p>
                        ) : isUnavailable ? (
                          <p className="text-xs mt-0.5 text-gray-400">Unavailable</p>
                        ) : (
                          <p className={`text-xs mt-0.5 transition-colors duration-300 ${selectedCategory === cat.name ? 'text-white/80' : 'text-gray-400 group-hover:text-white/80'}`}>{itemCount} Items</p>
                        )}
                      </div>
                    </div>
                    <img 
                      src="/cat-1-bottom.png" 
                      alt="" 
                      className="absolute -bottom-2 left-0 right-0 w-full h-auto pointer-events-none"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-full text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Items Grid */}
        <div className={`space-y-10 transition-opacity duration-300 ${itemsLoading ? 'opacity-50' : 'opacity-100'}`}>
          {itemsLoading && (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {!itemsLoading && (selectedCategory !== 'all' ? [selectedCategory] : filteredCategories).map(cat => {
            const itemsInCategory = displayItems.filter(i => 
              (Array.isArray(i.category) ? i.category : [i.category]).includes(cat)
            );
            if (itemsInCategory.length === 0) return null;
            
            return (
              <div key={cat}>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{cat}</h2>
                  <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-medium">
                    {itemsInCategory.length} items
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {itemsInCategory.map(renderItemCard)}
                </div>
              </div>
            );
          })}
          
          {!itemsLoading && filteredCategories.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <span className="text-6xl mb-4 block">🍽️</span>
              <h3 className="text-lg font-semibold text-gray-700">No items found</h3>
              <p className="text-gray-400 mt-1">Try a different filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Item Detail Dialog */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          style={{ touchAction: 'none' }}
          onClick={closeItemDialog}
          onTouchMove={(e) => e.preventDefault()}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Dialog - Horizontal on PC, Vertical on Mobile */}
          <div 
            className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md lg:max-w-5xl max-h-[90vh] sm:max-h-[95vh] lg:h-[85vh] overflow-hidden shadow-2xl flex flex-col lg:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeItemDialog}
              className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white text-gray-700 p-2 rounded-full shadow-lg transition-all hover:scale-110"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Side - Image (PC) / Top (Mobile) */}
            <div className="relative h-40 sm:h-56 lg:h-auto lg:w-[45%] bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center flex-shrink-0">
              {selectedItem.image ? (
                <img 
                  src={selectedItem.image} 
                  alt={selectedItem.name}
                  className="max-h-full max-w-full object-contain p-4 sm:p-6 lg:p-8"
                />
              ) : (
                <span className="text-6xl sm:text-7xl lg:text-8xl">🍽️</span>
              )}
              
              {/* Food Type Badge */}
              {selectedItem.foodType && (
                <div className="absolute top-3 left-3">
                  <FoodTypeBadge type={selectedItem.foodType} size="lg" />
                </div>
              )}
            </div>

            {/* Right Side - Details (PC) / Bottom (Mobile) - Scrollable */}
            <div 
              className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8" 
              style={{ 
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
              {/* Name & Wishlist */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex-1">{selectedItem.name}</h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isInWishlist && isInWishlist(selectedItem._id)) {
                      removeFromWishlist(selectedItem._id);
                    } else {
                      addToWishlist(selectedItem);
                    }
                  }}
                  className="p-2 hover:scale-110 transition-transform flex-shrink-0 bg-gray-50 rounded-full"
                >
                  <Heart className={`w-6 h-6 ${isInWishlist && isInWishlist(selectedItem._id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                </button>
              </div>

              {/* Price */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {/* Current Price - Large and prominent */}
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-orange-500">
                  ₹{selectedItem.offerPrice && selectedItem.offerPrice < selectedItem.price ? selectedItem.offerPrice : selectedItem.price}
                </div>
                
                {/* Original Price & Discount Badge - Only if there's a discount */}
                {selectedItem.offerPrice && selectedItem.offerPrice < selectedItem.price && (
                  <>
                    <span className="text-lg sm:text-xl text-gray-400 line-through">₹{selectedItem.price}</span>
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                      {Math.round(((selectedItem.price - selectedItem.offerPrice) / selectedItem.price) * 100)}% OFF
                    </div>
                  </>
                )}
              </div>

              {/* Offer Type Tags */}
              {selectedItem.offerType && (Array.isArray(selectedItem.offerType) ? selectedItem.offerType : [selectedItem.offerType]).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {(Array.isArray(selectedItem.offerType) ? selectedItem.offerType : [selectedItem.offerType]).map((offerType, index) => (
                    <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                      <Tag className="w-4 h-4" />
                      {offerType}
                    </span>
                  ))}
                </div>
              )}

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${i <= Math.round(selectedItem.avgRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {selectedItem.avgRating?.toFixed(1) || '0.0'} ({selectedItem.totalRatings || 0} reviews)
                </span>
              </div>

              {/* Description */}
              {selectedItem.description && (
                <p className="text-gray-600 text-sm sm:text-base lg:text-base mb-4 leading-relaxed">
                  {selectedItem.description}
                </p>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {/* Preparation Time */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-xs text-gray-500">Prep Time</p>
                    <p className="font-semibold text-gray-900">{selectedItem.preparationTime || 15} mins</p>
                  </div>
                </div>

                {/* Unit */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                  <Package className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-xs text-gray-500">Unit</p>
                    <p className="font-semibold text-gray-900">{selectedItem.unitQty || 1} {selectedItem.unit || 'piece'}</p>
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 mb-5">
                <span className="font-medium text-gray-700">Quantity</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setDialogQuantity(Math.max(1, dialogQuantity - 1))}
                    className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-lg">{dialogQuantity}</span>
                  <button 
                    onClick={() => setDialogQuantity(dialogQuantity + 1)}
                    className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Total Price */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                <span className="text-gray-600">Total</span>
                <span className="text-2xl font-bold text-gray-900">₹{selectedItem.price * dialogQuantity}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDialogWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-xl font-semibold transition-colors"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={handleDialogAddToCart}
                  className="flex-[2] flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-xl font-semibold transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
