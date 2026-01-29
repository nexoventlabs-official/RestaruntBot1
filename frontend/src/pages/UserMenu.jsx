import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Clock, Star, ShoppingCart, Heart, Plus, Minus, AlertCircle } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import CartSidebar from '../components/CartSidebar';

const API_URL = 'https://restaruntbot1.onrender.com/api/public';
const SSE_URL = 'https://restaruntbot1.onrender.com/api/events';
const WHATSAPP_NUMBER = '15551831644';

export default function UserMenu() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [foodType, setFoodType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('cart');
  const eventSourceRef = useRef(null);

  const { cart, wishlist, cartTotal, cartCount, addToCart, removeFromCart, updateQuantity, clearCart, addToWishlist, removeFromWishlist, isInWishlist, isInCart } = useCart();

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

  // Setup Server-Sent Events for real-time updates
  const setupSSE = () => {
    try {
      eventSourceRef.current = new EventSource(SSE_URL);
      
      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'menu') {
            // Reload menu and categories when menu changes
            loadData();
          }
        } catch (e) {
          // Ignore parse errors (ping messages)
        }
      };

      eventSourceRef.current.onerror = () => {
        // Reconnect after 5 seconds on error
        setTimeout(() => {
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
          }
          setupSSE();
        }, 5000);
      };
    } catch (e) {
      console.error('SSE setup error:', e);
    }
  };

  const loadData = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([axios.get(`${API_URL}/categories`), axios.get(`${API_URL}/menu`)]);
      setCategories(catRes.data);
      setItems(itemRes.data);
    } catch (err) { console.error('Error loading data:', err); }
    finally { setLoading(false); }
  };

  const loadItems = async () => {
    setItemsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (foodType !== 'all') params.append('foodType', foodType);
      const res = await axios.get(`${API_URL}/menu?${params}`);
      setItems(res.data);
    } catch (err) { console.error('Error loading items:', err); }
    finally { setItemsLoading(false); }
  };

  // Get active (non-paused) category names for filtering the category buttons
  const activeCategoryNames = categories
    .filter(cat => cat.isActive && cat.categoryStatus === 'available')
    .map(cat => cat.name);

  // Get all category names (including unavailable) for display
  const allCategoryNames = categories
    .filter(cat => cat.isActive)
    .map(cat => cat.name);

  // Show all items - don't filter by category availability
  const displayItems = items;

  // Check item status (available, soldout, or unavailable)
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
  // Check if item is available for ordering
  const isItemAvailable = (itemId) => {
    const item = items.find(i => i._id === itemId);
    if (!item) return false;
    return item.itemStatus === 'available';
  };

  // Check if category is available
  const isCategoryAvailable = (categoryName) => {
    return categories.some(cat => cat.name === categoryName && cat.isActive && cat.categoryStatus === 'available');
  };

  const handleOrderSingle = (item) => {
    if (!isItemAvailable(item._id)) return;
    const msg = encodeURIComponent(`Hi! I'd like to order:\n\n🍽️ *${item.name}*\n💰 Price: ₹${item.price}\n\nPlease confirm availability!`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  };

  const handleToggleWishlist = (item, e) => {
    e.stopPropagation();
    isInWishlist(item._id) ? removeFromWishlist(item._id) : addToWishlist(item);
  };

  const handleAddToCart = (item, e) => { 
    e.stopPropagation(); 
    if (!isItemAvailable(item._id)) return;
    addToCart(item); 
  };

  const filteredCategories = [...new Set(displayItems.flatMap(i => Array.isArray(i.category) ? i.category : [i.category]))]
    .filter(cat => allCategoryNames.includes(cat));

  const MenuItemSkeleton = () => (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200"></div>
      <div className="p-4">
        <div className="flex justify-between mb-2"><div className="h-5 w-24 bg-gray-200 rounded"></div><div className="h-5 w-12 bg-gray-200 rounded"></div></div>
        <div className="h-3 w-16 bg-gray-200 rounded mb-3"></div>
        <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4"><h1 className="text-2xl font-bold text-orange-600">🍽️ Our Menu</h1></div>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            <MenuItemSkeleton /><MenuItemSkeleton /><MenuItemSkeleton /><MenuItemSkeleton />
            <MenuItemSkeleton /><MenuItemSkeleton /><MenuItemSkeleton /><MenuItemSkeleton />
          </div>
        </div>
      </div>
    );
  }

  const renderItemCard = (item) => {
    const inCart = isInCart(item._id);
    const cartItem = cart.find(c => c._id === item._id);
    const itemStatus = getItemStatus(item);
    const available = itemStatus === 'available';
    
    return (
      <div key={item._id} className={`bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow group ${!available ? 'opacity-70' : ''}`}>
        <div className="h-44 bg-gray-100 relative overflow-hidden">
          {item.image ? <img src={item.image} alt={item.name} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${!available ? 'grayscale' : ''}`} /> : <div className="w-full h-full flex items-center justify-center"><span className="text-4xl">🍽️</span></div>}
          {item.foodType && <div className="absolute top-3 left-3"><span className={`w-5 h-5 rounded border-2 flex items-center justify-center ${item.foodType === 'veg' ? 'border-green-600 bg-white' : item.foodType === 'egg' ? 'border-yellow-500 bg-white' : 'border-red-600 bg-white'}`}><span className={`w-2.5 h-2.5 rounded-full ${item.foodType === 'veg' ? 'bg-green-600' : item.foodType === 'egg' ? 'bg-yellow-500' : 'bg-red-600'}`}></span></span></div>}
          {itemStatus === 'soldout' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg">Sold Out</span>
            </div>
          )}
          {itemStatus === 'unavailable' && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
              <span className="bg-gray-700 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg">Unavailable</span>
              {item.scheduleInfo && (
                <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {getScheduleText(item)}
                </span>
              )}
            </div>
          )}
          <button onClick={(e) => handleToggleWishlist(item, e)} className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors"><Heart className={`w-4 h-4 ${isInWishlist(item._id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} /></button>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 line-clamp-1">{item.name}</h3>
            <div className="flex flex-col items-end">
              {item.originalPrice && item.originalPrice > item.price && (
                <span className="text-xs text-gray-400 line-through">₹{item.originalPrice}</span>
              )}
              <span className="text-orange-600 font-bold whitespace-nowrap">₹{item.price}</span>
            </div>
          </div>
          {item.originalPrice && item.originalPrice > item.price && (
            <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-semibold mb-2">
              {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
            </div>
          )}
          <p className="text-xs text-gray-400 mb-2">{item.quantity || 1} {item.unit || 'piece'}</p>
          {item.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.description}</p>}
          <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
            <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /><span>{item.preparationTime || 15} min</span></div>
            {item.totalRatings > 0 ? <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /><span className="font-medium text-gray-700">{item.avgRating}</span><span>({item.totalRatings})</span></div> : <div className="flex items-center gap-1 text-gray-300"><Star className="w-3.5 h-3.5" /><span>No ratings</span></div>}
          </div>
          <div className="flex gap-2">
            {itemStatus === 'soldout' ? (
              <div className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold text-center cursor-not-allowed">
                Sold Out
              </div>
            ) : itemStatus === 'unavailable' ? (
              <div className="flex-1 py-2 bg-gray-200 text-gray-500 rounded-lg text-xs font-medium text-center cursor-not-allowed">
                {item.scheduleInfo ? (
                  <span className="flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getScheduleText(item)}
                  </span>
                ) : 'Unavailable'}
              </div>
            ) : inCart ? (
              <div className="flex-1 flex items-center justify-center gap-2 bg-orange-50 rounded-lg py-2">
                <button onClick={(e) => { e.stopPropagation(); updateQuantity(item._id, cartItem.quantity - 1); }} className="p-1 bg-white rounded-full shadow hover:bg-gray-50"><Minus className="w-4 h-4 text-orange-600" /></button>
                <span className="w-6 text-center font-semibold text-orange-600">{cartItem?.quantity || 0}</span>
                <button onClick={(e) => { e.stopPropagation(); addToCart(item); }} className="p-1 bg-white rounded-full shadow hover:bg-gray-50"><Plus className="w-4 h-4 text-orange-600" /></button>
              </div>
            ) : <button onClick={(e) => handleAddToCart(item, e)} className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-1"><Plus className="w-4 h-4" />Add</button>}
            <button 
              onClick={() => handleOrderSingle(item)} 
              disabled={!available}
              className={`p-2 rounded-lg transition-colors ${available ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`} 
              title={available ? "Order via WhatsApp" : "Item unavailable"}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-orange-600">🍽️ Our Menu</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => { setActiveTab('wishlist'); setSidebarOpen(true); }} className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Heart className={`w-6 h-6 ${wishlist.length > 0 ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
              {wishlist.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{wishlist.length}</span>}
            </button>
            <button onClick={() => { setActiveTab('cart'); setSidebarOpen(true); }} className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ShoppingCart className="w-6 h-6 text-gray-600" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-md w-fit flex-wrap">
          <button onClick={() => setFoodType('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${foodType === 'all' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>All</button>
          <button onClick={() => setFoodType('veg')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${foodType === 'veg' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <span className={`w-3 h-3 rounded border-2 flex items-center justify-center ${foodType === 'veg' ? 'border-white' : 'border-green-600'}`}><span className={`w-1.5 h-1.5 rounded-full ${foodType === 'veg' ? 'bg-white' : 'bg-green-600'}`}></span></span>Veg
          </button>
          <button onClick={() => setFoodType('nonveg')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${foodType === 'nonveg' ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <span className={`w-3 h-3 rounded border-2 flex items-center justify-center ${foodType === 'nonveg' ? 'border-white' : 'border-red-600'}`}><span className={`w-1.5 h-1.5 rounded-full ${foodType === 'nonveg' ? 'bg-white' : 'bg-red-600'}`}></span></span>Non-Veg
          </button>
          <button onClick={() => setFoodType('egg')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${foodType === 'egg' ? 'bg-yellow-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <span className={`w-3 h-3 rounded border-2 flex items-center justify-center ${foodType === 'egg' ? 'border-white' : 'border-yellow-500'}`}><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span></span>Egg
          </button>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setSelectedCategory('all')} className="flex flex-col items-center min-w-[80px] transition-all">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-2">
                <div className={`w-full h-full flex items-center justify-center ${selectedCategory === 'all' ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-gray-200'}`}>
                  <span className={`text-xl font-bold ${selectedCategory === 'all' ? 'text-white' : 'text-gray-500'}`}>All</span>
                </div>
              </div>
              <span className={`text-sm font-medium ${selectedCategory === 'all' ? 'text-orange-600' : 'text-gray-600'}`}>All Items</span>
              {selectedCategory === 'all' && <div className="w-8 h-1 bg-orange-500 rounded-full mt-1"></div>}
            </button>
            {categories.filter(cat => cat.isActive).map(cat => {
              const isUnavailable = cat.categoryStatus !== 'available';
              return (
              <button key={cat._id} onClick={() => !isUnavailable && setSelectedCategory(cat.name)} className={`flex flex-col items-center min-w-[80px] transition-all ${isUnavailable ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className={`w-16 h-16 rounded-full overflow-hidden mb-2 bg-gray-100 ${isUnavailable ? 'grayscale' : ''}`}>
                  {cat.image ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center"><span className="text-gray-400 text-xl">🍽️</span></div>}
                </div>
                <span className={`text-sm font-medium ${selectedCategory === cat.name ? 'text-orange-600' : isUnavailable ? 'text-gray-400' : 'text-gray-600'}`}>{cat.name}</span>
                {cat.categoryStatus === 'soldout' && <span className="text-xs text-red-500 font-medium">Sold Out</span>}
                {cat.categoryStatus === 'unavailable' && cat.scheduleInfo && <span className="text-xs text-indigo-500 font-medium">{getCategoryScheduleText(cat)}</span>}
                {cat.categoryStatus === 'unavailable' && !cat.scheduleInfo && <span className="text-xs text-gray-400">Unavailable</span>}
                {selectedCategory === cat.name && <div className="w-8 h-1 bg-orange-500 rounded-full mt-1"></div>}
              </button>
            )})}
          </div>
        </div>

        <div className={`space-y-8 transition-opacity duration-300 ${itemsLoading ? 'opacity-50' : 'opacity-100'}`}>
          {itemsLoading && <div className="flex justify-center py-8"><div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}
          {!itemsLoading && (selectedCategory !== 'all' ? [selectedCategory] : filteredCategories).map(cat => {
            const itemsInCategory = displayItems.filter(i => (Array.isArray(i.category) ? i.category : [i.category]).includes(cat));
            if (itemsInCategory.length === 0) return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{cat}</h2>
                  <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-500">{itemsInCategory.length} items</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {itemsInCategory.map(renderItemCard)}
                </div>
              </div>
            );
          })}
          {!itemsLoading && filteredCategories.length === 0 && (
            <div className="bg-white rounded-2xl shadow-md p-12 text-center">
              <span className="text-6xl mb-4 block">🍽️</span>
              <h3 className="text-lg font-semibold text-gray-700">No items found</h3>
              <p className="text-gray-400 mt-1">Try a different filter</p>
            </div>
          )}
        </div>
      </div>

      {cartCount > 0 && (
        <button onClick={() => { setActiveTab('cart'); setSidebarOpen(true); }} className="fixed bottom-6 right-6 bg-orange-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 hover:bg-orange-600 transition-colors md:hidden z-40">
          <ShoppingCart className="w-5 h-5" /><span className="font-semibold">{cartCount} items</span><span className="font-bold">₹{cartTotal}</span>
        </button>
      )}

      <CartSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        cart={cart} 
        wishlist={wishlist} 
        cartTotal={cartTotal} 
        cartCount={cartCount} 
        updateQuantity={updateQuantity} 
        removeFromCart={removeFromCart} 
        clearCart={clearCart} 
        addToCart={addToCart} 
        removeFromWishlist={removeFromWishlist} 
        whatsappNumber={WHATSAPP_NUMBER}
        availableItems={displayItems}
      />

      <footer className="bg-white border-t mt-8 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm"><p>Order via WhatsApp for delivery! 📱</p></div>
      </footer>
    </div>
  );
}
