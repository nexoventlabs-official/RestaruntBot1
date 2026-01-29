import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { X } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/public';

export default function OfferPopup() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  useEffect(() => {
    const hasSeenOffers = sessionStorage.getItem('hasSeenAllOffers');
    if (!hasSeenOffers) {
      loadPopupOffers();
    }
  }, []);

  // Auto-rotate offers every 3 seconds
  useEffect(() => {
    if (offers.length <= 1 || !isVisible || isPaused) return;
    
    const interval = setInterval(() => {
      setIsClosing(true);
      setTimeout(() => {
        setCurrentIndex(prev => {
          // Loop back to first offer when reaching the end
          if (prev >= offers.length - 1) {
            return 0;
          }
          return prev + 1;
        });
        setIsClosing(false);
      }, 200);
    }, 3000);

    return () => clearInterval(interval);
  }, [offers.length, isVisible, currentIndex, isPaused]);

  const loadPopupOffers = async () => {
    try {
      const res = await axios.get(`${API_URL}/offers`);
      // Get all active offers, sorted by most recent first
      const activeOffers = res.data.filter(o => o.isActive);
      if (activeOffers.length > 0) {
        setOffers(activeOffers);
        setCurrentIndex(0);
        setTimeout(() => setIsVisible(true), 1500);
      }
    } catch (err) {
      console.error('Error loading popup offers:', err);
    }
  };

  const handleClose = () => {
    // Close popup and mark as seen
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setOffers([]);
      sessionStorage.setItem('hasSeenAllOffers', 'true');
    }, 300);
  };

  const handlePrev = () => {
    setIsClosing(true);
    setTimeout(() => {
      setCurrentIndex(prev => {
        // Loop to last offer if at first offer
        if (prev <= 0) {
          return offers.length - 1;
        }
        return prev - 1;
      });
      setIsClosing(false);
    }, 200);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 2000);
  };

  const handleNext = () => {
    setIsClosing(true);
    setTimeout(() => {
      setCurrentIndex(prev => {
        // Loop to first offer if at last offer
        if (prev >= offers.length - 1) {
          return 0;
        }
        return prev + 1;
      });
      setIsClosing(false);
    }, 200);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 2000);
  };

  const handleImageClick = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setOffers([]);
      sessionStorage.setItem('hasSeenAllOffers', 'true');
      // Redirect to offers page with filter if offerType exists
      if (currentOffer.offerType) {
        navigate(`/offers?offerType=${encodeURIComponent(currentOffer.offerType)}`);
      } else {
        navigate('/offers');
      }
    }, 300);
  };

  // Touch handlers for swipe
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsPaused(true); // Pause auto-rotation when user touches
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsPaused(false);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
    
    // Resume auto-rotation after 2 seconds of inactivity
    setTimeout(() => setIsPaused(false), 2000);
  };

  // Mouse handlers for desktop swipe
  const [mouseStart, setMouseStart] = useState(null);
  const [mouseEnd, setMouseEnd] = useState(null);

  const onMouseDown = (e) => {
    setMouseEnd(null);
    setMouseStart(e.clientX);
    setIsPaused(true);
  };

  const onMouseMove = (e) => {
    if (mouseStart !== null) {
      setMouseEnd(e.clientX);
    }
  };

  const onMouseUp = () => {
    if (!mouseStart || !mouseEnd) {
      setIsPaused(false);
      setMouseStart(null);
      return;
    }
    
    const distance = mouseStart - mouseEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
    
    setMouseStart(null);
    setMouseEnd(null);
    setTimeout(() => setIsPaused(false), 2000);
  };

  if (offers.length === 0 || !isVisible) return null;

  const currentOffer = offers[currentIndex];

  // Helper function to get responsive image based on screen width and device type
  const getResponsiveImage = (offer) => {
    if (!offer) return null;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    let imageUrl;
    
    // More reliable tablet detection
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /ipad|iphone|ipod/.test(userAgent);
    const isAndroidTablet = /android/.test(userAgent) && !/mobile/.test(userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Detect tablet: iPad or Android tablet, width between 768-1366px
    const isTablet = (isIOS || isAndroidTablet || (isTouchDevice && width >= 768)) && width >= 768 && width <= 1366;
    
    // Mobile: < 768px (phones, small devices)
    if (width < 768) {
      imageUrl = offer.imageMobile || offer.imageTablet || offer.imageDesktop || offer.image;
    }
    // Tablet: iPad, Android tablets (768px - 1366px)
    else if (isTablet) {
      imageUrl = offer.imageTablet || offer.imageDesktop || offer.imageMobile || offer.image;
    }
    // Desktop: > 1366px OR (>= 1024px AND not touch device)
    else {
      imageUrl = offer.imageDesktop || offer.imageTablet || offer.imageMobile || offer.image;
    }
    
    // Add cache-busting timestamp to force refresh
    if (imageUrl) {
      const separator = imageUrl.includes('?') ? '&' : '?';
      return `${imageUrl}${separator}t=${offer.updatedAt || Date.now()}`;
    }
    
    return imageUrl;
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-8 transition-all duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      {/* Popup Container */}
      <div 
        className={`relative flex flex-col items-center transform transition-all duration-300 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Image Container */}
        <div className="relative">
          {/* Offer Image */}
          <div className="rounded-2xl shadow-2xl relative overflow-hidden">
            {/* Close Button - Fixed at top right */}
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 z-20 text-white bg-black/30 p-1.5 rounded-full transition-all hover:bg-red-500 hover:text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            {/* Scrollable image container with swipe support */}
            <div 
              className="overflow-y-auto overflow-x-hidden rounded-2xl max-h-[85vh] cursor-pointer select-none"
              onClick={handleImageClick}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={() => {
                if (mouseStart !== null) {
                  setMouseStart(null);
                  setMouseEnd(null);
                  setIsPaused(false);
                }
              }}
            >
              <img 
                src={getResponsiveImage(currentOffer)} 
                alt="Special Offer"
                style={{ maxWidth: '90vw', maxHeight: '85vh', width: 'auto', height: 'auto' }}
                className="block"
              />
            </div>
          </div>
        </div>

        {/* Dots Indicator - Only show if multiple offers */}
        {offers.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {offers.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsClosing(true);
                  setTimeout(() => {
                    setCurrentIndex(index);
                    setIsClosing(false);
                  }, 200);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-white w-6' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Go to offer ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Counter */}
        {offers.length > 1 && (
          <div className="flex items-center gap-3 mt-2">
            <p className="text-center text-white/80 text-sm">
              {currentIndex + 1} of {offers.length} offers
            </p>
            {isPaused && (
              <span className="text-yellow-400 text-xs bg-black/30 px-2 py-1 rounded-full">
                Paused
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
