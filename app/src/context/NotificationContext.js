import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import api from '../config/api';
import pushNotifications from '../services/pushNotifications';

const NotificationContext = createContext();

const STORAGE_KEY = 'admin_notifications';
const LAST_CHECK_KEY = 'admin_last_check_time';
const SEEN_ORDERS_KEY = 'admin_seen_orders';

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const lastCheckTime = useRef(null);
  const seenOrderStatuses = useRef({});
  const isInitialized = useRef(false);
  const appState = useRef(AppState.currentState);

  // Load data from storage on mount
  useEffect(() => {
    loadData();
    
    // Listen for app state changes to show notifications when app is in background
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState) => {
    appState.current = nextAppState;
  };

  const loadData = async () => {
    try {
      const [storedNotifications, storedLastCheck, storedSeenOrders] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEY),
        SecureStore.getItemAsync(LAST_CHECK_KEY),
        SecureStore.getItemAsync(SEEN_ORDERS_KEY)
      ]);
      
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications);
        setNotifications(parsed);
        setUnreadCount(parsed.filter(n => !n.read).length);
      }
      
      if (storedLastCheck) {
        lastCheckTime.current = new Date(storedLastCheck);
      } else {
        // First time - set to now so we don't flood with old notifications
        lastCheckTime.current = new Date();
        await SecureStore.setItemAsync(LAST_CHECK_KEY, new Date().toISOString());
      }
      
      if (storedSeenOrders) {
        seenOrderStatuses.current = JSON.parse(storedSeenOrders);
      }
      
      isInitialized.current = true;
    } catch (error) {
      console.error('Error loading notification data:', error);
      lastCheckTime.current = new Date();
      isInitialized.current = true;
    }
  };

  const saveNotifications = async (newNotifications) => {
    try {
      const trimmed = newNotifications.slice(0, 30);
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  const saveSeenOrders = async (seenOrders) => {
    try {
      // Keep only recent orders (last 100)
      const keys = Object.keys(seenOrders);
      if (keys.length > 100) {
        const trimmed = {};
        keys.slice(-100).forEach(k => trimmed[k] = seenOrders[k]);
        await SecureStore.setItemAsync(SEEN_ORDERS_KEY, JSON.stringify(trimmed));
      } else {
        await SecureStore.setItemAsync(SEEN_ORDERS_KEY, JSON.stringify(seenOrders));
      }
    } catch (error) {
      console.error('Error saving seen orders:', error);
    }
  };

  // Show local push notification
  const showLocalNotification = async (title, body, data = {}) => {
    if (pushNotifications.isSupported()) {
      try {
        await pushNotifications.scheduleLocalNotification(title, body, data);
      } catch (error) {
        console.error('Error showing local notification:', error);
      }
    }
  };

  // Check for new orders and status changes
  const checkForUpdates = useCallback(async () => {
    if (!isInitialized.current) return;
    
    try {
      const response = await api.get('/orders?limit=50');
      const orders = response.data.orders || [];
      
      // Build a map of current order statuses for quick lookup
      const currentOrderStatusMap = {};
      orders.forEach(order => {
        currentOrderStatusMap[order.orderId] = {
          status: order.status,
          amount: order.totalAmount
        };
      });
      
      const newNotifications = [];
      const now = new Date();
      
      for (const order of orders) {
        const orderCreatedAt = new Date(order.createdAt);
        const previousStatus = seenOrderStatuses.current[order.orderId];
        
        // Check for NEW orders (created after last check and status is confirmed/pending)
        if (!previousStatus && lastCheckTime.current) {
          if (orderCreatedAt > lastCheckTime.current) {
            // This is a genuinely new order
            const notification = {
              id: `new_${order.orderId}_${Date.now()}`,
              type: 'new_order',
              title: 'New Order Received! 🎉',
              message: `Order #${order.orderId} - ₹${order.totalAmount}`,
              orderId: order.orderId,
              amount: order.totalAmount,
              timestamp: order.createdAt,
              read: false,
              icon: 'cart',
              color: '#F59E0B'
            };
            newNotifications.push(notification);
            
            // Show local push notification
            showLocalNotification(
              notification.title,
              notification.message,
              { type: 'new_order', orderId: order.orderId, screen: 'Orders' }
            );
          }
        }
        
        // Check for STATUS CHANGES
        if (previousStatus && previousStatus !== order.status) {
          if (order.status === 'delivered') {
            const notification = {
              id: `delivered_${order.orderId}_${Date.now()}`,
              type: 'delivered',
              title: 'Order Delivered ✅',
              message: `Order #${order.orderId} delivered successfully`,
              orderId: order.orderId,
              timestamp: new Date().toISOString(),
              read: false,
              icon: 'checkmark-circle',
              color: '#22C55E'
            };
            newNotifications.push(notification);
            
            // Show local push notification
            showLocalNotification(
              notification.title,
              notification.message,
              { type: 'delivered', orderId: order.orderId }
            );
          } else if (order.status === 'cancelled' || order.status === 'refunded') {
            const notification = {
              id: `cancelled_${order.orderId}_${Date.now()}`,
              type: 'cancelled',
              title: 'Order Cancelled ❌',
              message: `Order #${order.orderId} has been cancelled`,
              orderId: order.orderId,
              timestamp: new Date().toISOString(),
              read: false,
              icon: 'close-circle',
              color: '#EF4444'
            };
            newNotifications.push(notification);
            
            // Show local push notification
            showLocalNotification(
              notification.title,
              notification.message,
              { type: 'cancelled', orderId: order.orderId }
            );
          }
        }
        
        // Update seen status
        seenOrderStatuses.current[order.orderId] = order.status;
      }
      
      // Save the current check time and seen orders
      lastCheckTime.current = now;
      await SecureStore.setItemAsync(LAST_CHECK_KEY, now.toISOString());
      await saveSeenOrders(seenOrderStatuses.current);
      
      // Count new orders specifically
      const newOrderCount = newNotifications.filter(n => n.type === 'new_order').length;
      
      // Update existing notifications with current order status
      // This ensures notification list always shows latest order info
      setNotifications(prev => {
        let hasUpdates = false;
        const updatedNotifications = prev.map(notification => {
          if (notification.orderId && currentOrderStatusMap[notification.orderId]) {
            const currentOrder = currentOrderStatusMap[notification.orderId];
            const currentStatus = currentOrder.status;
            
            // Update notification based on current order status
            let updatedNotification = { ...notification };
            
            // If order is now cancelled but notification shows different status
            if ((currentStatus === 'cancelled' || currentStatus === 'refunded') && 
                notification.type !== 'cancelled') {
              updatedNotification = {
                ...notification,
                type: 'cancelled',
                title: 'Order Cancelled ❌',
                message: `Order #${notification.orderId} has been cancelled`,
                icon: 'close-circle',
                color: '#EF4444'
              };
              hasUpdates = true;
            }
            // If order is now delivered but notification shows different status
            else if (currentStatus === 'delivered' && notification.type !== 'delivered') {
              updatedNotification = {
                ...notification,
                type: 'delivered',
                title: 'Order Delivered ✅',
                message: `Order #${notification.orderId} delivered successfully`,
                icon: 'checkmark-circle',
                color: '#22C55E'
              };
              hasUpdates = true;
            }
            // Update amount if changed for new order notifications
            else if (notification.type === 'new_order' && notification.amount !== currentOrder.amount) {
              updatedNotification = {
                ...notification,
                amount: currentOrder.amount,
                message: `Order #${notification.orderId} - ₹${currentOrder.amount}`
              };
              hasUpdates = true;
            }
            
            return updatedNotification;
          }
          return notification;
        });
        
        // Only save if there were actual updates
        if (hasUpdates) {
          saveNotifications(updatedNotifications);
        }
        
        // Add new notifications if any
        if (newNotifications.length > 0) {
          console.log('📱 New notifications:', newNotifications.length);
          const finalNotifications = [...newNotifications, ...updatedNotifications];
          saveNotifications(finalNotifications);
          setUnreadCount(prevCount => prevCount + newNotifications.length);
          if (newOrderCount > 0) {
            setNewOrdersCount(prevCount => prevCount + newOrderCount);
          }
          return finalNotifications;
        }
        
        return hasUpdates ? updatedNotifications : prev;
      });
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
    setUnreadCount(0);
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    await pushNotifications.clearAllNotifications();
  }, []);

  // Reset tracking (useful for testing)
  const resetTracking = useCallback(async () => {
    lastCheckTime.current = new Date();
    seenOrderStatuses.current = {};
    await SecureStore.deleteItemAsync(LAST_CHECK_KEY);
    await SecureStore.deleteItemAsync(SEEN_ORDERS_KEY);
    setNotifications([]);
    setUnreadCount(0);
    setNewOrdersCount(0);
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    await pushNotifications.clearAllNotifications();
  }, []);

  // Clear new orders count (called when Orders tab is viewed)
  const clearNewOrdersCount = useCallback(() => {
    setNewOrdersCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      newOrdersCount,
      checkForUpdates,
      markAllAsRead,
      markAsRead,
      clearAll,
      resetTracking,
      clearNewOrdersCount
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
