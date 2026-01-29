import { useState, useEffect, useRef, useCallback } from 'react';

const CART_KEY = 'restaurant_cart';
const WISHLIST_KEY = 'restaurant_wishlist';

// Helper to safely get from localStorage
const getFromStorage = (key, fallback = []) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

export function useCart() {
  // Initialize state directly from localStorage
  const [cart, setCart] = useState(() => getFromStorage(CART_KEY, []));
  const [wishlist, setWishlist] = useState(() => getFromStorage(WISHLIST_KEY, []));
  const isInitialized = useRef(false);

  // Save cart to localStorage (skip first render)
  useEffect(() => {
    if (isInitialized.current) {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
  }, [cart]);

  // Save wishlist to localStorage (skip first render)
  useEffect(() => {
    if (isInitialized.current) {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    }
  }, [wishlist]);

  // Mark as initialized after first render
  useEffect(() => {
    isInitialized.current = true;
  }, []);

  // Sync cart and wishlist with latest menu data (update images, prices, names)
  const syncWithMenuData = useCallback((menuItems) => {
    if (!menuItems || menuItems.length === 0) return;

    // Create a map for quick lookup
    const menuMap = new Map(menuItems.map(item => [item._id, item]));

    // Update cart items with latest data, including itemStatus and scheduleInfo
    setCart(prev => prev.map(cartItem => {
      const latestItem = menuMap.get(cartItem._id);
      if (latestItem) {
        return {
          ...cartItem,
          name: latestItem.name,
          price: latestItem.price,
          image: latestItem.image,
          unit: latestItem.unit || 'piece',
          unitQty: latestItem.quantity || 1,
          itemStatus: latestItem.itemStatus,
          scheduleInfo: latestItem.scheduleInfo
        };
      }
      return cartItem;
    }));

    // Update wishlist items with latest data, including itemStatus and scheduleInfo
    setWishlist(prev => prev.map(wishlistItem => {
      const latestItem = menuMap.get(wishlistItem._id);
      if (latestItem) {
        return {
          ...wishlistItem,
          name: latestItem.name,
          price: latestItem.price,
          image: latestItem.image,
          unit: latestItem.unit || 'piece',
          unitQty: latestItem.quantity || 1,
          itemStatus: latestItem.itemStatus,
          scheduleInfo: latestItem.scheduleInfo
        };
      }
      return wishlistItem;
    }));
  }, []);

  const addToCart = (item, qty = 1) => {
    setCart(prev => {
      // For special items, use specialItemId as the key
      const itemId = item.specialItemId || item._id;
      const existing = prev.find(c => (c.specialItemId || c._id) === itemId);
      if (existing) {
        return prev.map(c => (c.specialItemId || c._id) === itemId ? { ...c, quantity: c.quantity + qty } : c);
      }
      return [...prev, { 
        _id: item._id, 
        specialItemId: item.specialItemId,
        isSpecialItem: item.isSpecialItem || false,
        name: item.name, 
        price: item.price, 
        image: item.image, 
        quantity: qty, 
        unit: item.unit || 'piece', 
        unitQty: item.quantity || 1 
      }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(c => (c.specialItemId || c._id) !== itemId));
  };

  const updateQuantity = (itemId, qty) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev => prev.map(c => (c.specialItemId || c._id) === itemId ? { ...c, quantity: qty } : c));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  // Wishlist functions
  const addToWishlist = (item) => {
    setWishlist(prev => {
      if (prev.find(w => w._id === item._id)) return prev;
      return [...prev, { _id: item._id, name: item.name, price: item.price, image: item.image, unit: item.unit || 'piece', unitQty: item.quantity || 1 }];
    });
  };

  const removeFromWishlist = (itemId) => {
    setWishlist(prev => prev.filter(w => w._id !== itemId));
  };

  const isInWishlist = (item) => {
    const itemId = typeof item === 'object' ? (item.specialItemId || item._id) : item;
    return wishlist.some(w => w._id === itemId);
  };
  
  const isInCart = (item) => {
    const itemId = typeof item === 'object' ? (item.specialItemId || item._id) : item;
    return cart.some(c => (c.specialItemId || c._id) === itemId);
  };

  return {
    cart, wishlist, cartTotal, cartCount,
    addToCart, removeFromCart, updateQuantity, clearCart,
    addToWishlist, removeFromWishlist, isInWishlist, isInCart,
    syncWithMenuData
  };
}
