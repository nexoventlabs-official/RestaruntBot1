import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import HeroCarousel from '../components/HeroCarousel';
import AnimatedSection, { ParallaxSection, TextReveal } from '../components/AnimatedSection';
import { 
  ArrowRightIcon, TruckIcon, ClockIcon, CheckCircleIcon 
} from '../components/Icons';
import { Star, Heart, ShoppingCart, Plus, Minus, X, Clock, Package, Tag } from 'lucide-react';
import { useCachedData } from '../hooks/useImagePreloader';

const API_URL = 'https://restaruntbot1.onrender.com/api/public';

// Category Card Component
const CategoryCard = ({ cat, getCategoryItemCount }) => (
  <Link 
    to={`/menu?category=${encodeURIComponent(cat.name)}`}
    className="group flex-shrink-0 mx-2 sm:mx-3"
  >
    <div className="relative w-32 sm:w-36 md:w-44">
      <div className="bg-[#F5F1E8] group-hover:bg-[#3f9065] rounded-t-full rounded-b-3xl pt-4 sm:pt-6 pb-12 sm:pb-16 px-3 sm:px-4 transition-all duration-300 relative overflow-hidden">
        {/* Moving shine effect */}
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-t-full rounded-b-3xl z-20 pointer-events-none">
          <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:left-full transition-all duration-700 ease-in-out"></div>
        </div>
        <div className="flex justify-center mb-4 sm:mb-6">
          {cat.image ? (
            <img 
              src={cat.image} 
              alt={cat.name} 
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 object-contain drop-shadow-lg transition-transform group-hover:scale-110"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-2xl sm:text-3xl md:text-4xl">🍽️</span>
            </div>
          )}
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-gray-900 group-hover:text-white text-xs sm:text-sm md:text-base transition-colors duration-300 line-clamp-1">{cat.name}</h3>
          <p className="text-[10px] sm:text-xs text-gray-400 group-hover:text-white/80 mt-0.5 transition-colors duration-300">{getCategoryItemCount(cat.name)} Items</p>
        </div>
      </div>
      <img 
        src="/cat-1-bottom.png" 
        alt="" 
        className="absolute -bottom-2 left-0 right-0 w-full h-auto pointer-events-none"
      />
    </div>
  </Link>
);

export default function Home() {
  const [topItems, setTopItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayCategories, setDisplayCategories] = useState([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const sliderRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogQuantity, setDialogQuantity] = useState(1);
  const context = useOutletContext();
  const { 
    cart, addToCart, updateQuantity, 
    addToWishlist, removeFromWishlist, isInWishlist, isInCart 
  } = context || {};

  // Get cached data from preloader
  const cachedData = useCachedData();

  useEffect(() => {
    loadTopItems();
    loadCategories();
  }, []);

  // Initialize display categories with enough duplicates for seamless scroll
  useEffect(() => {
    if (categories.length > 0) {
      // Create multiple copies for seamless infinite scroll
      setDisplayCategories([...categories, ...categories, ...categories, ...categories]);
    }
  }, [categories]);

  // Step scroll effect - moves one card every 3 seconds
  useEffect(() => {
    if (categories.length === 0) return;
    
    const cardWidth = 200; // 176px card + 24px margin
    const singleSetWidth = cardWidth * categories.length;
    
    const interval = setInterval(() => {
      setScrollPosition(prev => {
        const newPos = prev + cardWidth;
        // When we've scrolled past 2 sets, reset back by one set (invisible reset)
        if (newPos >= singleSetWidth * 2) {
          // Instant reset without transition
          if (sliderRef.current) {
            sliderRef.current.style.transition = 'none';
          }
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (sliderRef.current) {
                sliderRef.current.style.transition = 'transform 700ms ease-in-out';
              }
            });
          });
          return newPos - singleSetWidth;
        }
        return newPos;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [categories.length]);

  const loadTopItems = async () => {
    try {
      // Use cached data if available
      let menuData;
      if (cachedData.isLoaded && cachedData.menu) {
        menuData = cachedData.menu;
      } else {
        const res = await axios.get(`${API_URL}/menu`);
        menuData = res.data;
      }
      
      const sorted = menuData
        .filter(item => item.isActive !== false)
        .sort((a, b) => (b.totalRatings || 0) - (a.totalRatings || 0))
        .slice(0, 4);
      setTopItems(sorted);
      setMenuItems(menuData);
    } catch (err) {
      console.error('Error loading top items:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      // Use cached data if available
      let catData;
      if (cachedData.isLoaded && cachedData.categories) {
        catData = cachedData.categories;
      } else {
        const res = await axios.get(`${API_URL}/categories`);
        catData = res.data;
      }
      setCategories(catData.filter(cat => cat.isActive && !cat.isPaused));
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const getCategoryItemCount = (categoryName) => {
    return menuItems.filter(item => {
      const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
      return itemCategories.includes(categoryName) && item.isActive !== false;
    }).length;
  };

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

  const handleToggleWishlist = (item, e) => {
    e.stopPropagation();
    if (!addToWishlist || !removeFromWishlist) return;
    isInWishlist(item._id) ? removeFromWishlist(item._id) : addToWishlist(item);
  };

  const handleAddToCart = (item, e) => {
    e.stopPropagation();
    if (!addToCart) return;
    addToCart(item);
  };

  // Open item detail dialog
  const openItemDialog = (item) => {
    setSelectedItem(item);
    setDialogQuantity(cart?.find(c => c._id === item._id)?.quantity || 1);
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    if (window.lenis) window.lenis.stop();
  };

  // Close item detail dialog
  const closeItemDialog = () => {
    setSelectedItem(null);
    setDialogQuantity(1);
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
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
  const handleDialogWhatsApp = () => {
    if (!selectedItem) return;
    const item = selectedItem;
    const WHATSAPP_NUMBER = '15551831644';
    
    const foodTypeLabel = item.foodType === 'veg' ? '🌿 Veg' : 
                          item.foodType === 'nonveg' ? '🍗 Non-Veg' : 
                          item.foodType === 'egg' ? '🥚 Egg' : '';
    
    let msg = `Hi! I'd like to order:\n\n`;
    msg += `*${item.name}*${foodTypeLabel ? ` ${foodTypeLabel}` : ''}\n`;
    msg += `📦 *Quantity:* ${dialogQuantity}\n`;
    msg += `💰 *Price:* ₹${item.price} x ${dialogQuantity} = ₹${item.price * dialogQuantity}\n`;
    msg += `\nPlease confirm my order. Thank you!`;
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    closeItemDialog();
  };

  // WhatsApp Icon Component
  const WhatsAppIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );

  const ItemSkeleton = () => (
    <div className="relative pt-16 sm:pt-20 md:pt-28">
      <div className="absolute -top-4 sm:-top-6 md:-top-8 left-1/2 -translate-x-1/2 z-10 w-32 h-32 sm:w-40 sm:h-40 md:w-56 md:h-56">
        <div className="w-full h-full bg-gray-300 rounded-full animate-pulse"></div>
      </div>
      <div className="bg-white rounded-2xl sm:rounded-3xl pt-16 sm:pt-20 md:pt-24 px-3 sm:px-4 md:px-5 pb-3 sm:pb-4 md:pb-5 shadow-[0_2px_15px_rgba(0,0,0,0.08)] border border-gray-100 animate-pulse">
        <div className="flex justify-between mb-2">
          <div className="h-4 sm:h-5 w-20 sm:w-28 bg-gray-200 rounded"></div>
          <div className="h-4 sm:h-5 w-4 sm:w-5 bg-gray-200 rounded-full"></div>
        </div>
        <div className="flex gap-1 mb-2 sm:mb-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-3 w-3 sm:h-4 sm:w-4 bg-gray-200 rounded"></div>)}
        </div>
        <div className="h-3 sm:h-4 w-full bg-gray-200 rounded mb-1"></div>
        <div className="h-3 sm:h-4 w-3/4 bg-gray-200 rounded mb-2 sm:mb-4"></div>
        <div className="flex justify-between items-center">
          <div className="h-6 sm:h-7 w-14 sm:w-16 bg-gray-200 rounded"></div>
          <div className="h-9 sm:h-10 md:h-12 w-9 sm:w-10 md:w-12 bg-gray-200 rounded-lg sm:rounded-xl"></div>
        </div>
      </div>
    </div>
  );

  const renderItemCard = (item) => {
    const inCart = isInCart ? isInCart(item._id) : false;
    const cartItem = cart?.find(c => c._id === item._id);
    const rating = item.avgRating || 0;
    const totalRatings = item.totalRatings || 0;
    const itemStatus = getItemStatus(item);
    const isAvailable = itemStatus === 'available';

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
        className={`group relative pt-16 sm:pt-20 md:pt-28 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        onClick={() => isAvailable && openItemDialog(item)}
      >
        {/* Floating Image */}
        <div className={`absolute -top-4 sm:-top-6 md:-top-8 left-1/2 -translate-x-1/2 z-10 w-32 h-32 sm:w-40 sm:h-40 md:w-56 md:h-56 flex items-center justify-center ${!isAvailable ? 'grayscale' : ''}`}>
          {item.image ? (
            <div className="relative">
              <img 
                src={item.image} 
                alt={item.name} 
                className={`max-h-full max-w-full object-contain transition-transform duration-300 drop-shadow-xl ${isAvailable ? 'group-hover:scale-110' : ''}`} 
              />
              {/* Status Badge on Image */}
              {itemStatus === 'soldout' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-red-600 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg">Sold Out</span>
                </div>
              )}
              {itemStatus === 'unavailable' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <span className="bg-gray-700 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg">Unavailable</span>
                  {item.scheduleInfo && (
                    <span className="bg-indigo-600 text-white px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium shadow-lg flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getScheduleText(item)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center relative">
              <span className="text-3xl sm:text-4xl md:text-6xl">🍽️</span>
              {/* Status Badge for no image items */}
              {itemStatus === 'soldout' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <span className="bg-red-600 text-white px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold">Sold Out</span>
                </div>
              )}
              {itemStatus === 'unavailable' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                  <span className="bg-gray-700 text-white px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold">Unavailable</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card */}
        <div className={`bg-white rounded-2xl sm:rounded-3xl pt-16 sm:pt-20 md:pt-24 px-3 sm:px-4 md:px-5 pb-3 sm:pb-4 md:pb-5 shadow-[0_2px_15px_rgba(0,0,0,0.08)] border border-gray-100 transition-shadow ${isAvailable ? 'hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]' : 'opacity-75'}`}>
          {/* Name & Wishlist */}
          <div className="flex items-center justify-between gap-1 sm:gap-2 mb-1">
            <h3 className="font-bold text-gray-900 uppercase text-xs sm:text-sm tracking-wide line-clamp-1">{item.name}</h3>
            <button 
              onClick={(e) => handleToggleWishlist(item, e)} 
              className="p-0.5 sm:p-1 hover:scale-110 transition-transform flex-shrink-0"
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isInWishlist && isInWishlist(item._id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </button>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-0.5 sm:gap-1 mb-2 sm:mb-3">
            <div className="flex">{renderStars()}</div>
            <span className="text-[10px] sm:text-xs text-gray-500">({totalRatings})</span>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 mb-2 sm:mb-4 min-h-[32px] sm:min-h-[40px]">{item.description}</p>
          )}

          {/* Price or Status */}
          <div className="flex items-center gap-2">
            {itemStatus === 'soldout' ? (
              <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                Sold Out
              </span>
            ) : itemStatus === 'unavailable' ? (
              <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1">
                {item.scheduleInfo ? (
                  <>
                    <Clock className="w-3 h-3" />
                    {getScheduleText(item)}
                  </>
                ) : 'Unavailable'}
              </span>
            ) : (
              <>
                <div className="relative">
                  <img src="/button.png" alt="" className="h-6 sm:h-7 md:h-8 w-auto" style={{ filter: 'brightness(0) saturate(100%) invert(19%) sepia(97%) saturate(7043%) hue-rotate(359deg) brightness(101%) contrast(117%)' }} />
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                    ₹{item.offerPrice && item.offerPrice < item.price ? item.offerPrice : item.price}
                  </span>
                </div>
                {item.offerPrice && item.offerPrice < item.price && (
                  <>
                    <span className="text-[10px] sm:text-xs text-gray-400 line-through">₹{item.price}</span>
                    <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
                      {Math.round(((item.price - item.offerPrice) / item.price) * 100)}% OFF
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative overflow-x-hidden w-full max-w-full">
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Food Category Section */}
      <section id="category-section" className="py-10 sm:py-12 md:py-16 bg-white overflow-hidden w-full">
        <div className="max-w-7xl mx-auto px-4">
          {/* Section Header */}
          <AnimatedSection animation="fadeUp" className="text-center mb-8 sm:mb-12">
            <span className="text-red-500 font-medium tracking-wider uppercase text-xs sm:text-sm">Food Category</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mt-2">
              BROWSE FAST FOODS <span className="text-green-600">CATEGORY</span>
            </h2>
            {/* Decorative line */}
            <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4">
              <div className="w-2 sm:w-3 h-2 sm:h-3 bg-green-600 rotate-45"></div>
              <div className="w-10 sm:w-16 h-0.5 bg-gray-300"></div>
              <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full border-2 border-gray-400"></div>
              <div className="w-10 sm:w-16 h-0.5 bg-gray-300"></div>
              <div className="w-2 sm:w-3 h-2 sm:h-3 bg-green-600 rotate-45"></div>
            </div>
          </AnimatedSection>
        </div>

        {/* Step Scroll Container */}
        <div className="relative overflow-hidden w-full pb-4">
          <div 
            ref={sliderRef}
            className="flex transition-transform duration-700 ease-in-out pb-2"
            style={{ transform: `translateX(-${scrollPosition}px)` }}
          >
            {displayCategories.map((cat, index) => (
              <CategoryCard 
                key={`${cat._id}-${index}`} 
                cat={cat} 
                getCategoryItemCount={getCategoryItemCount}
              />
            ))}
          </div>
        </div>
      </section>

      {/* About Restaurant Section */}
      <section id="about-section" className="py-10 sm:py-12 md:py-16 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Left - Image */}
            <AnimatedSection animation="fadeLeft" duration={1.2}>
              <div className="relative">
                <img 
                  src="/about_1_1.png" 
                  alt="Restaurant Food" 
                  className="w-full h-auto object-contain"
                />
              </div>
            </AnimatedSection>

            {/* Right - Content */}
            <AnimatedSection animation="fadeRight" duration={1.2} delay={0.2}>
              <div className="text-center lg:text-left">
                <span className="text-red-500 font-medium tracking-wider uppercase text-xs sm:text-sm">About Our Restaurant</span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mt-2 sm:mt-3 leading-tight">
                  WE INVITE YOU TO VISIT OUR FAST FOOD <span className="text-red-500">RESTAURANT</span>
                </h2>
                <p className="text-gray-500 mt-4 sm:mt-6 leading-relaxed text-sm sm:text-base">
                  At the heart of our kitchen are bold flavors, high-quality ingredients, and a commitment to consistency. From juicy burgers, crispy fries, and cheesy pizzas to spicy wraps and refreshing drinks, every item on our menu is made to order and packed with taste.
                </p>
                
                <div className="mt-6 sm:mt-8">
                  <h4 className="font-semibold text-gray-900 text-base sm:text-lg">Parvez Hossain Imon</h4>
                  <p className="text-gray-400 text-xs sm:text-sm">Restaurant owner</p>
                </div>

                <Link 
                  to="/about"
                  className="inline-block mt-6 sm:mt-8 relative group"
                >
                  <div className="relative">
                    <img src="/button.png" alt="" className="h-12 sm:h-14 w-auto" style={{ filter: 'brightness(0) saturate(100%) invert(19%) sepia(97%) saturate(7043%) hue-rotate(359deg) brightness(101%) contrast(117%)' }} />
                    <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs sm:text-sm uppercase tracking-wide px-4 sm:px-6">
                      Visit Our Restaurant
                    </span>
                  </div>
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Top Items Section */}
      <section id="popular-section" className="py-10 sm:py-12 md:py-16 bg-[#f7f2e2] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <AnimatedSection animation="fadeUp" className="flex items-center justify-between mb-6 sm:mb-8 md:mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Most Popular</h2>
              <p className="text-gray-500 mt-1 text-sm sm:text-base">Our customers' favorites</p>
            </div>
            <Link 
              to="/menu" 
              className="hidden md:flex items-center gap-2 text-orange-600 font-medium hover:text-orange-700 transition-colors"
            >
              View All <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </AnimatedSection>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 pt-6 sm:pt-8">
              <ItemSkeleton />
              <ItemSkeleton />
              <ItemSkeleton />
              <ItemSkeleton />
            </div>
          ) : topItems.length > 0 ? (
            <AnimatedSection animation="fadeUp" stagger={0.15} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 pt-6 sm:pt-8">
              {topItems.map(renderItemCard)}
            </AnimatedSection>
          ) : (
            <div className="text-center py-12 sm:py-16 bg-white rounded-2xl">
              <span className="text-4xl sm:text-6xl mb-4 block">🍽️</span>
              <p className="text-gray-500">No items available yet</p>
            </div>
          )}

          <Link 
            to="/menu" 
            className="md:hidden flex items-center justify-center gap-2 mt-6 sm:mt-8 text-orange-600 font-medium"
          >
            View All Menu <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Special Offer Section */}
      <section id="offer-section" className="relative bg-[#ff9924] overflow-hidden">
        {/* Top Wave Shape - Inside orange section */}
        <img 
          src="/shape-top-smoke.png" 
          alt="" 
          className="w-full h-auto absolute top-0 left-0 right-0 z-10"
        />
        
        {/* Orange Background Content */}
        <div className="relative py-8 sm:py-0">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 items-center">
              {/* Left Image */}
              <div className="hidden lg:block">
                <img 
                  src="/coming-left-1.png" 
                  alt="Delicious Burger" 
                  className="w-full max-w-lg object-contain drop-shadow-2xl"
                />
              </div>

              {/* Center Content */}
              <div className="text-center text-white pt-8 sm:pt-0">
                <span className="text-white/90 font-medium italic text-base sm:text-lg">Save Up To 50% Off</span>
                <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mt-2">
                  <span className="font-normal">SUPER</span> <span className="italic">Delicious</span>
                </h2>
                <h3 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-wider mt-1">BURGER</h3>
                <p className="text-white/90 italic mt-3 sm:mt-4 text-base sm:text-lg">Limited Time Offer</p>
                
                {/* Countdown Timer */}
                <div className="flex justify-center gap-1.5 sm:gap-2 md:gap-4 mt-4 sm:mt-6">
                  <div className="bg-white text-gray-900 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 min-w-[50px] sm:min-w-[60px]">
                    <span className="text-lg sm:text-2xl md:text-3xl font-bold block">750</span>
                    <span className="text-[10px] sm:text-xs text-gray-500">Days</span>
                  </div>
                  <span className="text-white text-lg sm:text-2xl font-bold self-center">:</span>
                  <div className="bg-white text-gray-900 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 min-w-[50px] sm:min-w-[60px]">
                    <span className="text-lg sm:text-2xl md:text-3xl font-bold block">01</span>
                    <span className="text-[10px] sm:text-xs text-gray-500">Hours</span>
                  </div>
                  <span className="text-white text-lg sm:text-2xl font-bold self-center">:</span>
                  <div className="bg-white text-gray-900 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 min-w-[50px] sm:min-w-[60px]">
                    <span className="text-lg sm:text-2xl md:text-3xl font-bold block">32</span>
                    <span className="text-[10px] sm:text-xs text-gray-500">Minutes</span>
                  </div>
                  <span className="text-white text-lg sm:text-2xl font-bold self-center">:</span>
                  <div className="bg-white text-gray-900 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 min-w-[50px] sm:min-w-[60px]">
                    <span className="text-lg sm:text-2xl md:text-3xl font-bold block">49</span>
                    <span className="text-[10px] sm:text-xs text-gray-500">Seconds</span>
                  </div>
                </div>
              </div>

              {/* Right Image */}
              <div className="hidden lg:block">
                <img 
                  src="/coming-right.png" 
                  alt="Delicious Food" 
                  className="w-full max-w-md mx-auto object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Feedback Section */}
      <section id="feedback-section" className="py-10 sm:py-12 md:py-16 bg-white relative overflow-hidden">
        {/* Decorative leaf image on left */}
        <img 
          src="/leaf-left.png" 
          alt="" 
          className="absolute left-0 top-0 w-20 sm:w-28 h-auto hidden lg:block"
        />
        {/* Decorative food image on right */}
        <img 
          src="/coming-right.png" 
          alt="" 
          className="absolute right-0 top-0 w-24 sm:w-36 h-auto hidden lg:block"
        />
        
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <AnimatedSection animation="fadeUp" className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-wide">
              OUR CUSTOMERS <span className="text-[#3f9065]">FEEDBACK</span>
            </h2>
            {/* Decorative line */}
            <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4">
              <div className="w-2 sm:w-3 h-2 sm:h-3 bg-[#3f9065] rotate-45"></div>
              <div className="w-10 sm:w-16 h-0.5 bg-gray-300"></div>
              <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full border-2 border-gray-400"></div>
              <div className="w-10 sm:w-16 h-0.5 bg-gray-300"></div>
              <div className="w-2 sm:w-3 h-2 sm:h-3 bg-[#3f9065] rotate-45"></div>
            </div>
          </AnimatedSection>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
            {/* Testimonial 1 */}
            <AnimatedSection animation="fadeLeft" delay={0.1}>
              <div className="relative flex items-end min-h-[240px] sm:min-h-[280px] group">
              {/* Main Card with blob shape */}
              <div 
                className="relative bg-[#f5f1e8] pt-4 sm:pt-6 pb-20 sm:pb-24 pl-4 sm:pl-6 pr-4 sm:pr-6 w-[75%] sm:w-[70%]"
                style={{
                  borderRadius: '30% 70% 50% 50% / 50% 50% 50% 50%',
                }}
              >
                {/* Quote Icon */}
                <div className="mb-2 sm:mb-3">
                  <svg width="32" height="26" viewBox="0 0 40 32" fill="none" className="text-[#3f9065] w-8 h-6 sm:w-10 sm:h-8">
                    <path d="M0 32V20.8C0 17.0667 0.666667 13.6 2 10.4C3.46667 7.2 5.46667 4.53333 8 2.4C10.5333 0.266667 13.3333 -0.533333 16.4 0.266667L17.6 4.26667C14.9333 5.06667 12.8 6.53333 11.2 8.66667C9.6 10.6667 8.66667 12.9333 8.4 15.4667H16V32H0ZM24 32V20.8C24 17.0667 24.6667 13.6 26 10.4C27.4667 7.2 29.4667 4.53333 32 2.4C34.5333 0.266667 37.3333 -0.533333 40.4 0.266667L41.6 4.26667C38.9333 5.06667 36.8 6.53333 35.2 8.66667C33.6 10.6667 32.6667 12.9333 32.4 15.4667H40V32H24Z" fill="currentColor"/>
                  </svg>
                </div>
                
                <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
                  "Every pizza starts with our hand-tossed dough, made fresh daily and topped with our signature sauce crafted from ripe tomatoes and secret herbs."
                </p>
                
                {/* Author Info - Green Box at bottom left with hover effect */}
                <div 
                  className="absolute bottom-0 left-0 bg-[#3f9065] group-hover:bg-[#ff9924] py-2 sm:py-3 px-3 sm:px-5 transition-colors duration-300"
                  style={{ borderRadius: '0 20px 0 30px' }}
                >
                  <h4 className="font-semibold text-white group-hover:text-black text-xs sm:text-sm transition-colors duration-300">Victoria Wotton</h4>
                  <p className="text-white/70 group-hover:text-black/70 text-[10px] sm:text-xs transition-colors duration-300">Fementum Odio Co.</p>
                  <div className="flex gap-0.5 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-[#ff9924] text-[#ff9924] group-hover:fill-black group-hover:text-black transition-colors duration-300" />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Person Image */}
              <div className="absolute right-0 bottom-0 w-32 sm:w-44 md:w-52 z-10">
                <img 
                  src="/testi-1-1.png" 
                  alt="Victoria Wotton" 
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
            </AnimatedSection>

            {/* Testimonial 2 - Mirrored layout */}
            <AnimatedSection animation="fadeRight" delay={0.2}>
              <div className="relative flex items-end justify-end min-h-[240px] sm:min-h-[280px] group">
              {/* Person Image - Now on left */}
              <div className="absolute left-0 bottom-0 w-32 sm:w-44 md:w-52 z-10">
                <img 
                  src="/testi-1-2.png" 
                  alt="Emma Mia" 
                  className="w-full h-auto object-contain"
                />
              </div>
              
              {/* Main Card with blob shape - Now on right */}
              <div 
                className="relative bg-[#f5f1e8] pt-4 sm:pt-6 pb-20 sm:pb-24 pl-4 sm:pl-6 pr-4 sm:pr-6 w-[75%] sm:w-[70%]"
                style={{
                  borderRadius: '70% 30% 50% 50% / 50% 50% 50% 50%',
                }}
              >
                {/* Quote Icon - Aligned right */}
                <div className="mb-2 sm:mb-3 flex justify-end">
                  <svg width="32" height="26" viewBox="0 0 40 32" fill="none" className="text-[#3f9065] w-8 h-6 sm:w-10 sm:h-8">
                    <path d="M0 32V20.8C0 17.0667 0.666667 13.6 2 10.4C3.46667 7.2 5.46667 4.53333 8 2.4C10.5333 0.266667 13.3333 -0.533333 16.4 0.266667L17.6 4.26667C14.9333 5.06667 12.8 6.53333 11.2 8.66667C9.6 10.6667 8.66667 12.9333 8.4 15.4667H16V32H0ZM24 32V20.8C24 17.0667 24.6667 13.6 26 10.4C27.4667 7.2 29.4667 4.53333 32 2.4C34.5333 0.266667 37.3333 -0.533333 40.4 0.266667L41.6 4.26667C38.9333 5.06667 36.8 6.53333 35.2 8.66667C33.6 10.6667 32.6667 12.9333 32.4 15.4667H40V32H24Z" fill="currentColor"/>
                  </svg>
                </div>
                
                <p className="text-gray-700 text-xs sm:text-sm leading-relaxed text-right">
                  "Freshly tossed dough forms the base of every pizza, of the name topped with a homemade sauce made from juicy tomatoes and our special herb recipe."
                </p>
                
                {/* Author Info - Green Box at bottom right with hover effect */}
                <div 
                  className="absolute bottom-0 right-0 bg-[#3f9065] group-hover:bg-[#ff9924] py-2 sm:py-3 px-3 sm:px-5 transition-colors duration-300"
                  style={{ borderRadius: '20px 0 30px 0' }}
                >
                  <h4 className="font-semibold text-white group-hover:text-black text-xs sm:text-sm transition-colors duration-300">Emma Mia</h4>
                  <p className="text-white/70 group-hover:text-black/70 text-[10px] sm:text-xs transition-colors duration-300">Fementum Odio Co.</p>
                  <div className="flex gap-0.5 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-[#ff9924] text-[#ff9924] group-hover:fill-black group-hover:text-black transition-colors duration-300" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Item Detail Dialog */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ touchAction: 'none' }}
          onClick={closeItemDialog}
          onTouchMove={(e) => e.preventDefault()}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Dialog */}
          <div 
            className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-md lg:max-w-5xl max-h-[95vh] lg:h-[85vh] overflow-hidden shadow-2xl flex flex-col lg:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeItemDialog}
              className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white text-gray-700 p-2 rounded-full shadow-lg transition-all hover:scale-110"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Side - Image */}
            <div className="relative h-48 sm:h-56 lg:h-auto lg:w-[45%] bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center flex-shrink-0">
              {selectedItem.image ? (
                <img 
                  src={selectedItem.image} 
                  alt={selectedItem.name}
                  className="max-h-full max-w-full object-contain p-6 lg:p-8"
                />
              ) : (
                <span className="text-7xl lg:text-8xl">🍽️</span>
              )}
              
              {/* Food Type Badge */}
              {selectedItem.foodType && selectedItem.foodType !== 'none' && (
                <div className="absolute top-3 left-3">
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full font-medium border-2 ${
                    selectedItem.foodType === 'veg' ? 'border-green-500 text-green-600 bg-green-50' :
                    selectedItem.foodType === 'nonveg' ? 'border-red-500 text-red-600 bg-red-50' :
                    'border-yellow-500 text-yellow-600 bg-yellow-50'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      selectedItem.foodType === 'veg' ? 'bg-green-500' :
                      selectedItem.foodType === 'nonveg' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`} />
                    {selectedItem.foodType === 'veg' ? 'Veg' : selectedItem.foodType === 'nonveg' ? 'Non-Veg' : 'Egg'}
                  </span>
                </div>
              )}
            </div>

            {/* Right Side - Details */}
            <div 
              className="flex-1 overflow-y-auto scrollbar-dialog p-5 sm:p-6 lg:p-8" 
              style={{ 
                maxHeight: 'calc(95vh - 100px)',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch'
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
                {/* Sale Price - Large and prominent */}
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-orange-500">
                  ₹{selectedItem.price}
                </div>
                
                {/* Original Price & Discount Badge - Only if there's a discount */}
                {selectedItem.originalPrice && selectedItem.originalPrice > selectedItem.price && (
                  <>
                    <span className="text-lg sm:text-xl text-gray-400 line-through">₹{selectedItem.originalPrice}</span>
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                      {Math.round(((selectedItem.originalPrice - selectedItem.price) / selectedItem.originalPrice) * 100)}% OFF
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
                <p className="text-gray-600 text-sm sm:text-base mb-4 leading-relaxed">
                  {selectedItem.description}
                </p>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-xs text-gray-500">Prep Time</p>
                    <p className="font-semibold text-gray-900">{selectedItem.preparationTime || 15} mins</p>
                  </div>
                </div>
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
