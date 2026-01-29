import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, TouchableOpacity, Alert, ActivityIndicator, Linking,
  Modal, Image, Animated, Platform, StatusBar, ImageBackground, AppState
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { useDeliveryNotifications } from '../../context/DeliveryNotificationContext';
import { colors, spacing, radius, typography, shadows } from '../../theme';

const DELIVERY_GREEN = '#267E3E';
const DELIVERY_DARK_GREEN = '#1B5E2E';
const POLL_INTERVAL = 5000; // 5 seconds for real-time updates

// Background image
const MY_ORDERS_BG = require('../../../assets/backgrounds/deliverymyorders.jpg');

// Success GIF
const ORDER_COMPLETE_GIF = require('../../../assets/backgrounds/ordercomplete.gif');

const ProgressSteps = ({ status, cancelledAtStep }) => {
  const steps = [
    { key: 'preparing', color: '#8B5CF6' },    // Purple
    { key: 'ready', color: '#10B981' },         // Green
    { key: 'out_for_delivery', color: '#06B6D4' }, // Cyan
    { key: 'delivered', color: '#22C55E' },    // Success Green
  ];
  const isCancelled = status === 'cancelled';
  const currentIndex = isCancelled ? cancelledAtStep : steps.findIndex(s => s.key === status);
  
  return (
    <View style={styles.progressContainer}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isActive = isCompleted || isCurrent;
        
        // For cancelled orders: completed steps stay their color, current step is red, future steps are gray
        let dotColor;
        if (isCancelled) {
          if (isCompleted) {
            dotColor = step.color;
          } else if (isCurrent) {
            dotColor = '#EF4444'; // Red for cancelled step
          } else {
            dotColor = colors.light.border;
          }
        } else {
          dotColor = isActive ? step.color : colors.light.border;
        }
        
        const lineColor = isCompleted ? steps[index].color : colors.light.border;
        
        return (
          <React.Fragment key={step.key}>
            <View style={[
              styles.progressDot, 
              { backgroundColor: isActive ? dotColor : 'transparent', borderColor: dotColor }
            ]}>
              {isCompleted && <Ionicons name="checkmark" size={12} color="#fff" />}
              {isCurrent && !isCancelled && <View style={[styles.progressDotInner, { backgroundColor: '#fff' }]} />}
              {isCurrent && isCancelled && <Ionicons name="close" size={12} color="#fff" />}
            </View>
            {index < steps.length - 1 && (
              <View style={[styles.progressLine, { backgroundColor: lineColor }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const STATUS_CONFIG = {
  preparing: { label: 'Preparing', color: '#8B5CF6', bg: '#EDE9FE' },
  ready: { label: 'Ready', color: '#10B981', bg: '#D1FAE5' },
  out_for_delivery: { label: 'Out for Delivery', color: '#06B6D4', bg: '#CFFAFE' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2' },
};

export default function MyOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [qrModal, setQrModal] = useState({ visible: false, qrUrl: null, orderId: null, amount: 0 });
  const [successModal, setSuccessModal] = useState({ visible: false, orderId: null });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pollIntervalRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const { clearNewOrdersCount } = useDeliveryNotifications();

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const fetchOrders = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/delivery/orders/my');
      const allOrders = response.data;
      
      // Filter cancelled orders - only show if cancelled within last 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const filteredOrders = allOrders.filter(order => {
        if (order.status === 'cancelled') {
          const cancelledAt = new Date(order.statusUpdatedAt || order.updatedAt);
          return cancelledAt > oneHourAgo;
        }
        return true;
      });
      
      setOrders(filteredOrders);
    } catch (error) { console.error('Error fetching orders:', error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  // Start polling for real-time updates
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(() => {
      fetchOrders(false); // Silent refresh
    }, POLL_INTERVAL);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - fetch immediately and restart polling
        fetchOrders(false);
        startPolling();
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - stop polling
        stopPolling();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [startPolling, stopPolling]);

  useEffect(() => {
    fetchOrders(true);
    startPolling();
    
    // Clear new orders badge when viewing this screen
    clearNewOrdersCount();
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders(false);
      startPolling();
      clearNewOrdersCount();
    });
    
    const blurUnsubscribe = navigation.addListener('blur', () => {
      stopPolling();
    });
    
    return () => {
      unsubscribe();
      blurUnsubscribe();
      stopPolling();
    };
  }, [navigation, startPolling, stopPolling, clearNewOrdersCount]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchOrders(false); }, []);

  const openMapNavigation = (order) => {
    const address = order.deliveryAddress?.address || order.customer?.address;
    const lat = order.deliveryAddress?.latitude;
    const lng = order.deliveryAddress?.longitude;
    
    if (lat && lng) {
      navigation.navigate('MapNavigation', {
        destination: { latitude: lat, longitude: lng },
        destinationAddress: address,
        customerName: order.customer?.name,
      });
    } else if (address) {
      // If no coordinates, show alert - geocoding would require additional API
      Alert.alert(
        'No Coordinates',
        'This address does not have GPS coordinates. Would you like to open in external maps?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Maps', 
            onPress: () => Linking.openURL(`https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`)
          },
        ]
      );
    } else {
      Alert.alert('Error', 'No delivery address available');
    }
  };

  const markReady = async (orderId) => {
    setActionLoading(orderId);
    try { await api.post(`/delivery/orders/${orderId}/mark-ready`); Alert.alert('Success', 'Order marked as Ready'); fetchOrders(); }
    catch (error) { Alert.alert('Error', error.response?.data?.error || 'Failed to mark order as ready'); }
    finally { setActionLoading(null); }
  };

  const startDelivery = async (orderId) => {
    setActionLoading(orderId);
    try { await api.post(`/delivery/orders/${orderId}/out-for-delivery`); Alert.alert('Success', 'Order marked as Out for Delivery'); fetchOrders(); }
    catch (error) { Alert.alert('Error', error.response?.data?.error || 'Failed to update order'); }
    finally { setActionLoading(null); }
  };

  const markDelivered = async (order) => {
    if (order.paymentMethod === 'cod') {
      Alert.alert('Collect Payment', `Amount: ₹${order.totalAmount}\n\nHow was payment collected?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Cash', onPress: () => completeDelivery(order.orderId, 'cash') },
        { text: 'UPI (QR)', onPress: () => generateQRCode(order) },
      ]);
    } else {
      Alert.alert('Confirm Delivery', 'Mark this order as delivered?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => completeDelivery(order.orderId, null) },
      ]);
    }
  };

  const generateQRCode = async (order) => {
    setActionLoading(order.orderId);
    try {
      const response = await api.post(`/delivery/orders/${order.orderId}/generate-qr`);
      setQrModal({ visible: true, qrUrl: response.data.qrUrl, orderId: response.data.orderId, amount: response.data.amount });
    } catch (error) { Alert.alert('Error', error.response?.data?.error || 'Failed to generate QR code'); }
    finally { setActionLoading(null); }
  };

  const completeDelivery = async (orderId, collectionMethod) => {
    setActionLoading(orderId);
    try { 
      await api.post(`/delivery/orders/${orderId}/delivered`, { collectionMethod }); 
      setSuccessModal({ visible: true, orderId });
      fetchOrders(); 
    }
    catch (error) { Alert.alert('Error', error.response?.data?.error || 'Failed to complete delivery'); }
    finally { setActionLoading(null); }
  };

  const renderOrder = ({ item }) => {
    const isCancelled = item.status === 'cancelled';
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.preparing;
    
    // Determine which step the order was cancelled at
    const getCancelledAtStep = () => {
      const lastStatus = item.trackingUpdates?.slice().reverse().find(u => u.status !== 'cancelled')?.status;
      const stepMap = { preparing: 0, ready: 1, out_for_delivery: 2 };
      return stepMap[lastStatus] ?? 0;
    };
    
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity 
          style={[styles.orderCard, isCancelled && styles.orderCardCancelled]}
          onPress={() => navigation.navigate('DeliveryOrderDetail', { order: item })}
          activeOpacity={0.9}
        >
          {/* Progress Steps */}
          <ProgressSteps status={item.status} cancelledAtStep={getCancelledAtStep()} />

          {/* Order Header */}
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderId}>#{item.orderId}</Text>
              <Text style={styles.orderTime}>{new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
          </View>

          {/* Customer Info */}
          <View style={[styles.customerCard, isCancelled && styles.customerCardCancelled]}>
            <View style={[styles.customerAvatar, isCancelled && styles.customerAvatarCancelled]}>
              <Ionicons name="person" size={20} color={isCancelled ? '#EF4444' : DELIVERY_GREEN} />
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{item.customer?.name || 'Customer'}</Text>
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={14} color={colors.light.text.tertiary} />
                <Text style={styles.phoneText}>{item.customer?.phone}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.callButton, isCancelled && styles.callButtonCancelled]} 
              onPress={(e) => { e.stopPropagation(); Linking.openURL(`tel:${item.customer?.phone}`); }}
            >
              <Ionicons name="call" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Address */}
          <TouchableOpacity 
            style={[styles.addressCard, isCancelled && styles.addressCardCancelled]} 
            onPress={(e) => { e.stopPropagation(); openMapNavigation(item); }} 
            activeOpacity={0.8}
          >
            <View style={[styles.addressIcon, isCancelled && styles.addressIconCancelled]}>
              <Ionicons name="location" size={20} color={isCancelled ? '#EF4444' : DELIVERY_GREEN} />
            </View>
            <Text style={[styles.addressText, isCancelled && styles.addressTextCancelled]} numberOfLines={2}>
              {item.deliveryAddress?.address || item.customer?.address || 'N/A'}
            </Text>
            <View style={[styles.navigateIcon, isCancelled && styles.navigateIconCancelled]}>
              <Ionicons name="navigate" size={18} color={isCancelled ? '#EF4444' : DELIVERY_GREEN} />
            </View>
          </TouchableOpacity>

          {/* Footer: Price & Action */}
          <View style={styles.orderFooter}>
            <View>
              <Text style={[styles.amount, isCancelled && styles.amountCancelled]}>₹{item.totalAmount}</Text>
              <View style={[styles.paymentBadge, item.paymentMethod === 'cod' ? styles.codBadge : styles.prepaidBadge]}>
                <Ionicons 
                  name={item.paymentMethod === 'cod' ? 'cash-outline' : 'checkmark-circle'} 
                  size={14} 
                  color={item.paymentMethod === 'cod' ? '#D97706' : '#16A34A'} 
                />
                <Text style={[styles.paymentText, item.paymentMethod === 'cod' ? styles.codText : styles.prepaidText]}>
                  {item.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}
                </Text>
              </View>
            </View>

            {isCancelled ? (
              <View style={styles.cancelledBadge}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={styles.cancelledBadgeText}>Cancelled</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  if (item.status === 'preparing') markReady(item.orderId);
                  else if (item.status === 'ready') startDelivery(item.orderId);
                  else markDelivered(item);
                }}
                disabled={actionLoading === item.orderId}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={actionLoading === item.orderId ? ['#9CA3AF', '#9CA3AF'] : item.status === 'out_for_delivery' ? ['#22C55E', '#16A34A'] : [DELIVERY_GREEN, DELIVERY_DARK_GREEN]}
                  style={styles.actionButtonGradient}
                >
                  {actionLoading === item.orderId ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons 
                        name={item.status === 'preparing' ? 'checkmark-done' : item.status === 'ready' ? 'bicycle' : 'checkmark-circle'} 
                        size={18} 
                        color="#fff" 
                      />
                      <Text style={styles.actionButtonText}>
                        {item.status === 'preparing' ? 'Mark Ready' : item.status === 'ready' ? 'Start Delivery' : 'Delivered'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.headerWrapper}>
        <ImageBackground source={MY_ORDERS_BG} style={styles.header} imageStyle={styles.headerBackgroundImage}>
          <View style={styles.headerOverlay}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.title}>My Orders</Text>
                <Text style={styles.subtitle}>{orders.length} active deliveries</Text>
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={DELIVERY_GREEN} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[DELIVERY_GREEN]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}><Ionicons name="bicycle-outline" size={48} color={colors.light.text.tertiary} /></View>
              <Text style={styles.emptyTitle}>No Active Orders</Text>
              <Text style={styles.emptyText}>Orders assigned to you will appear here</Text>
            </View>
          }
        />
      )}

      <Modal visible={qrModal.visible} animationType="slide" transparent={true} onRequestClose={() => setQrModal({ visible: false, qrUrl: null, orderId: null, amount: 0 })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Collect Payment</Text>
              <TouchableOpacity onPress={() => setQrModal({ visible: false, qrUrl: null, orderId: null, amount: 0 })}>
                <Ionicons name="close-circle" size={32} color={colors.light.text.tertiary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalOrderId}>Order #{qrModal.orderId}</Text>
            <Text style={styles.modalAmount}>₹{qrModal.amount}</Text>
            <View style={styles.qrContainer}>
              {qrModal.qrUrl && <Image source={{ uri: qrModal.qrUrl }} style={styles.qrImage} resizeMode="contain" />}
              <Text style={styles.scanText}>Ask customer to scan & pay</Text>
            </View>
            <TouchableOpacity style={styles.modalButton} onPress={() => { setQrModal({ visible: false, qrUrl: null, orderId: null, amount: 0 }); completeDelivery(qrModal.orderId, 'upi'); }} activeOpacity={0.8}>
              <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.modalButtonGradient}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.modalButtonText}>Payment Received - Mark Delivered</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal with GIF */}
      <Modal visible={successModal.visible} animationType="fade" transparent={true} onRequestClose={() => setSuccessModal({ visible: false, orderId: null })}>
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <Image source={ORDER_COMPLETE_GIF} style={styles.successGif} resizeMode="contain" />
            <Text style={styles.successTitle}>Order Delivered! 🎉</Text>
            <Text style={styles.successOrderId}>#{successModal.orderId}</Text>
            <Text style={styles.successMessage}>Great job! The order has been delivered successfully.</Text>
            <TouchableOpacity 
              style={styles.successButton} 
              onPress={() => setSuccessModal({ visible: false, orderId: null })}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[DELIVERY_GREEN, DELIVERY_DARK_GREEN]} style={styles.successButtonGradient}>
                <Text style={styles.successButtonText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  headerWrapper: { zIndex: 100, elevation: 100, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75,
    paddingBottom: 55,
    paddingHorizontal: spacing.screenHorizontal,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerBackgroundImage: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerOverlay: { 
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginTop: -(Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75),
    marginBottom: -55,
    marginHorizontal: -spacing.screenHorizontal,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75,
    paddingBottom: 55,
    paddingHorizontal: spacing.screenHorizontal,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: typography.body.large.fontSize, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  headerBadge: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: spacing.screenHorizontal, paddingBottom: 100, paddingTop: spacing.md },
  
  // Order Card
  orderCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  orderCardCancelled: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  
  // Progress Steps
  progressContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  progressDot: { 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
  },
  progressDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressLine: { 
    flex: 1, 
    height: 3, 
    borderRadius: 2,
    marginHorizontal: 4,
  },
  
  // Order Header
  orderHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.md,
  },
  orderId: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: colors.light.text.primary,
  },
  orderTime: { 
    fontSize: 13, 
    color: colors.light.text.tertiary, 
    marginTop: 2,
  },
  statusBadge: { 
    paddingHorizontal: 14, 
    paddingVertical: 6, 
    borderRadius: 20,
  },
  statusText: { 
    fontSize: 13, 
    fontWeight: '600',
  },
  
  // Customer Card
  customerCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.light.surfaceSecondary, 
    borderRadius: 14, 
    padding: spacing.md, 
    marginBottom: spacing.sm,
  },
  customerCardCancelled: {
    backgroundColor: '#FEE2E2',
  },
  customerAvatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#E8F5E9', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  customerAvatarCancelled: {
    backgroundColor: '#FECACA',
  },
  customerInfo: { 
    flex: 1, 
    marginLeft: spacing.md,
  },
  customerName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.light.text.primary,
  },
  phoneRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    marginTop: 4,
  },
  phoneText: { 
    fontSize: 14, 
    color: colors.light.text.tertiary,
  },
  callButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    backgroundColor: DELIVERY_GREEN, 
    justifyContent: 'center', 
    alignItems: 'center',
    ...shadows.sm,
  },
  callButtonCancelled: {
    backgroundColor: '#9CA3AF',
  },
  
  // Address Card
  addressCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#E8F5E9', 
    borderRadius: 14, 
    padding: spacing.md, 
    marginBottom: spacing.md,
  },
  addressCardCancelled: {
    backgroundColor: '#FEE2E2',
  },
  addressIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  addressIconCancelled: {
    backgroundColor: '#FECACA',
  },
  addressText: { 
    flex: 1, 
    fontSize: 14, 
    color: DELIVERY_DARK_GREEN, 
    marginHorizontal: spacing.md, 
    lineHeight: 20,
    fontWeight: '500',
  },
  addressTextCancelled: {
    color: '#991B1B',
  },
  navigateIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  navigateIconCancelled: {
    backgroundColor: '#FECACA',
  },
  
  // Order Footer
  orderFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: spacing.md, 
    borderTopWidth: 1, 
    borderTopColor: colors.light.borderLight,
  },
  amount: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: colors.light.text.primary,
  },
  amountCancelled: {
    textDecorationLine: 'line-through',
    color: colors.light.text.tertiary,
  },
  paymentBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8, 
    marginTop: 4,
  },
  codBadge: { backgroundColor: '#FEF3C7' },
  prepaidBadge: { backgroundColor: '#DCFCE7' },
  paymentText: { 
    fontSize: 13, 
    fontWeight: '600',
  },
  codText: { color: '#D97706' },
  prepaidText: { color: '#16A34A' },
  
  // Action Button
  actionButton: { 
    borderRadius: 14, 
    overflow: 'hidden',
    ...shadows.sm,
  },
  actionButtonGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    paddingHorizontal: 20, 
    paddingVertical: 14,
  },
  actionButtonText: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '600',
  },
  
  // Cancelled Badge
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelledBadgeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  
  // Empty State
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 100,
  },
  emptyIconContainer: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: colors.light.surfaceSecondary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: spacing.base,
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.light.text.secondary,
  },
  emptyText: { 
    fontSize: 14, 
    color: colors.light.text.tertiary, 
    marginTop: spacing.xs,
  },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.light.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.xl, paddingBottom: spacing['3xl'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.light.text.primary },
  modalOrderId: { fontSize: 14, color: colors.light.text.secondary, textAlign: 'center' },
  modalAmount: { fontSize: 40, fontWeight: '700', color: DELIVERY_GREEN, textAlign: 'center', marginVertical: spacing.md },
  qrContainer: { alignItems: 'center', backgroundColor: colors.light.surfaceSecondary, borderRadius: 20, padding: spacing.lg, marginBottom: spacing.xl },
  qrImage: { width: 200, height: 200, marginBottom: spacing.md },
  scanText: { fontSize: 14, color: colors.light.text.secondary },
  modalButton: { borderRadius: 14, overflow: 'hidden' },
  modalButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 16 },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  successGif: {
    width: 180,
    height: 180,
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: DELIVERY_GREEN,
    marginBottom: spacing.xs,
  },
  successOrderId: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text.secondary,
    marginBottom: spacing.sm,
  },
  successMessage: {
    fontSize: 14,
    color: colors.light.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  successButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  successButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
