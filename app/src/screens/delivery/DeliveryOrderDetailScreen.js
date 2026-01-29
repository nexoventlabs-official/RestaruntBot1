import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, Animated, Platform, StatusBar, ImageBackground,
  ActivityIndicator, Image, AppState
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import api, { API_BASE_URL } from '../../config/api';

// Delivery Theme Colors
const DELIVERY_GREEN = '#267E3E';
const DELIVERY_DARK_GREEN = '#1B5E2E';

// Background image
const DETAIL_BG = require('../../../assets/backgrounds/deliveryhistory.jpg');

const POLL_INTERVAL = 5000; // 5 seconds for real-time updates

const STATUS_CONFIG = {
  ready: { color: '#10B981', bg: '#D1FAE5', label: 'Ready for Pickup', icon: 'checkmark-circle' },
  out_for_delivery: { color: '#06B6D4', bg: '#CFFAFE', label: 'Out for Delivery', icon: 'bicycle' },
  delivered: { color: '#22C55E', bg: '#DCFCE7', label: 'Delivered', icon: 'checkmark-done-circle' },
  pending: { color: '#F59E0B', bg: '#FEF3C7', label: 'Pending', icon: 'time' },
  confirmed: { color: '#3B82F6', bg: '#DBEAFE', label: 'Confirmed', icon: 'checkmark' },
  preparing: { color: '#8B5CF6', bg: '#EDE9FE', label: 'Preparing', icon: 'restaurant' },
  cancelled: { color: '#EF4444', bg: '#FEE2E2', label: 'Cancelled', icon: 'close-circle' },
  refunded: { color: '#EF4444', bg: '#FEE2E2', label: 'Refunded', icon: 'close-circle' },
};

export default function DeliveryOrderDetailScreen({ route, navigation }) {
  const { order: passedOrder, orderId } = route.params || {};
  const [order, setOrder] = useState(passedOrder || null);
  const [loading, setLoading] = useState(!passedOrder);
  const [error, setError] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pollIntervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // Fetch order if only orderId was passed
  useEffect(() => {
    if (!passedOrder && orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const targetOrderId = orderId || order?.orderId;
      if (!targetOrderId) return;
      
      const response = await api.get(`/delivery/orders/${targetOrderId}`);
      setOrder(response.data);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to load order details');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Start polling for real-time updates
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(() => {
      fetchOrder(false); // Silent refresh
    }, POLL_INTERVAL);
  }, [orderId, order]);

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
        fetchOrder(false);
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

  // Start polling when screen is focused
  useEffect(() => {
    if (order || orderId) {
      startPolling();
      
      const unsubscribe = navigation.addListener('focus', () => {
        fetchOrder(false);
        startPolling();
      });
      
      const blurUnsubscribe = navigation.addListener('blur', () => {
        stopPolling();
      });
      
      return () => {
        unsubscribe();
        blurUnsubscribe();
        stopPolling();
      };
    }
  }, [navigation, order, orderId, startPolling, stopPolling]);

  const statusConfig = order ? (STATUS_CONFIG[order.status] || STATUS_CONFIG.pending) : STATUS_CONFIG.pending;

  useEffect(() => {
    if (order) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [order]);

  const openMapNavigation = () => {
    if (!order) return;
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
      // If no coordinates, open in external OSM
      Linking.openURL(`https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />
        <ActivityIndicator size="large" color={DELIVERY_GREEN} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />
        <Ionicons name="alert-circle-outline" size={64} color={colors.light.text.tertiary} />
        <Text style={styles.errorText}>{error || 'Order not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => orderId ? fetchOrder() : navigation.goBack()}>
          <Text style={styles.retryButtonText}>{orderId ? 'Retry' : 'Go Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* Premium Header */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.headerWrapper}>
          <ImageBackground source={DETAIL_BG} style={styles.header} imageStyle={styles.headerBackgroundImage}>
            <View style={[styles.headerOverlay, (order.status === 'cancelled' || order.status === 'refunded') && styles.headerOverlayCancelled]}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Order #{order.orderId}</Text>
                <View style={[styles.statusBadgeSmall, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name={statusConfig.icon} size={14} color="#fff" />
                  <Text style={styles.statusBadgeSmallText}>{statusConfig.label}</Text>
                </View>
              </View>
              <View style={{ width: 44 }} />
            </View>
          </ImageBackground>
        </View>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Cancelled Banner */}
          {(order.status === 'cancelled' || order.status === 'refunded') && (
            <View style={styles.cancelledBanner}>
              <View style={styles.cancelledIconContainer}>
                <Ionicons name="close-circle" size={32} color="#EF4444" />
              </View>
              <View style={styles.cancelledTextContainer}>
                <Text style={styles.cancelledTitle}>Order Cancelled</Text>
                <Text style={styles.cancelledMessage}>
                  This order has been cancelled by the customer
                </Text>
              </View>
            </View>
          )}

          {/* Status Card */}
          <View style={[styles.statusCard, (order.status === 'cancelled' || order.status === 'refunded') && styles.statusCardCancelled]}>
            <View style={[styles.statusIconContainer, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon} size={32} color={statusConfig.color} />
            </View>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            {order.deliveredAt && (
              <Text style={styles.deliveredTime}>
                Delivered on {new Date(order.deliveredAt).toLocaleString('en-IN')}
              </Text>
            )}
            {(order.status === 'cancelled' || order.status === 'refunded') && order.statusUpdatedAt && (
              <Text style={styles.deliveredTime}>
                Cancelled on {new Date(order.statusUpdatedAt).toLocaleString('en-IN')}
              </Text>
            )}
          </View>

          {/* Customer Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="person" size={18} color={DELIVERY_GREEN} />
              </View>
              <Text style={styles.sectionTitle}>Customer Details</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.customerRow}>
                <View style={styles.customerAvatar}>
                  <Ionicons name="person" size={24} color="#fff" />
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{order.customer?.name || 'Customer'}</Text>
                  <Text style={styles.customerPhone}>{order.customer?.phone}</Text>
                </View>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => Linking.openURL(`tel:${order.customer?.phone}`)}
                >
                  <Ionicons name="call" size={18} color="#22C55E" />
                </TouchableOpacity>
              </View>
              <View style={styles.addressContainer}>
                <View style={styles.addressIconSmall}>
                  <Ionicons name="location" size={18} color={DELIVERY_GREEN} />
                </View>
                <Text style={styles.addressTextSmall}>{order.deliveryAddress?.address || order.customer?.address || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Navigate to Address */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.navigateCard} onPress={openMapNavigation} activeOpacity={0.8}>
              <View style={styles.navigateContent}>
                <View style={styles.navigateIconContainer}>
                  <Ionicons name="navigate" size={24} color={DELIVERY_GREEN} />
                </View>
                <View style={styles.navigateTextContainer}>
                  <Text style={styles.navigateTitle}>Navigate to Address</Text>
                  <Text style={styles.navigateSubtitle}>Open in maps</Text>
                </View>
              </View>
              <LinearGradient
                colors={[DELIVERY_GREEN, DELIVERY_DARK_GREEN]}
                style={styles.navigateArrow}
              >
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Order Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="fast-food" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.sectionTitle}>Order Items</Text>
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>{order.items?.length || 0} items</Text>
              </View>
            </View>
            <View style={styles.cardBg}>
              <View style={styles.card}>
                {order.items?.map((item, index) => {
                  const itemImage = item.image || item.menuItem?.image;
                  return (
                    <View key={index} style={[styles.orderItemRow, index > 0 && styles.orderItemBorder]}>
                      <View style={styles.orderItemImageContainer}>
                        {itemImage ? (
                          <Image 
                            source={{ uri: itemImage.startsWith('http') ? itemImage : `${API_BASE_URL}${itemImage}` }} 
                            style={styles.orderItemImage} 
                          />
                        ) : (
                          <View style={styles.orderItemImagePlaceholder}>
                            <Ionicons name="fast-food-outline" size={24} color={colors.light.text.tertiary} />
                          </View>
                        )}
                      </View>
                      <View style={styles.orderItemInfo}>
                        <Text style={styles.orderItemName} numberOfLines={2}>{item.name}</Text>
                        <View style={styles.orderItemMeta}>
                          <Text style={styles.orderItemQty}>Qty: {item.quantity}</Text>
                          <Text style={styles.orderItemUnitPrice}>₹{item.price} each</Text>
                        </View>
                      </View>
                      <Text style={styles.orderItemPrice}>₹{item.price * item.quantity}</Text>
                    </View>
                  );
                })}
                
                {/* Order Summary */}
                <View style={styles.orderSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>₹{order.totalAmount}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Delivery Fee</Text>
                    <Text style={styles.summaryValue}>₹0</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalAmount}>₹{order.totalAmount}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Payment Info */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="card" size={18} color="#22C55E" />
              </View>
              <Text style={styles.sectionTitle}>Payment Info</Text>
            </View>
            <View style={styles.paymentCard}>
              <View style={styles.paymentRow}>
                <View style={styles.paymentMethodContainer}>
                  <View style={[styles.paymentMethodIcon, { backgroundColor: order.paymentMethod === 'cod' ? '#FEF3C7' : '#EDE9FE' }]}>
                    <Ionicons 
                      name={order.paymentMethod === 'cod' ? 'cash-outline' : 'phone-portrait-outline'} 
                      size={24} 
                      color={order.paymentMethod === 'cod' ? '#F59E0B' : '#8B5CF6'} 
                    />
                  </View>
                  <View>
                    <Text style={styles.paymentMethodLabel}>Payment Method</Text>
                    <Text style={styles.paymentMethodValue}>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI Payment'}</Text>
                  </View>
                </View>
                <View style={[styles.paymentStatusBadge, { backgroundColor: order.paymentStatus === 'paid' ? '#DCFCE7' : '#FEF3C7' }]}>
                  <Ionicons 
                    name={order.paymentStatus === 'paid' ? 'checkmark-circle' : 'time'} 
                    size={16} 
                    color={order.paymentStatus === 'paid' ? '#22C55E' : '#F59E0B'} 
                  />
                  <Text style={[styles.paymentStatusText, { color: order.paymentStatus === 'paid' ? '#22C55E' : '#F59E0B' }]}>
                    {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                  </Text>
                </View>
              </View>
              {order.actualPaymentMethod && (
                <View style={styles.collectedViaRow}>
                  <Text style={styles.collectedViaLabel}>Collected via</Text>
                  <View style={styles.collectedViaBadge}>
                    <Ionicons 
                      name={order.actualPaymentMethod === 'cash' ? 'cash-outline' : 'phone-portrait-outline'} 
                      size={14} 
                      color={order.actualPaymentMethod === 'cash' ? '#F59E0B' : '#8B5CF6'} 
                    />
                    <Text style={[styles.collectedViaText, { color: order.actualPaymentMethod === 'cash' ? '#F59E0B' : '#8B5CF6' }]}>
                      {order.actualPaymentMethod.toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Timeline */}
          {order.trackingUpdates?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time" size={18} color={DELIVERY_GREEN} />
                <Text style={styles.sectionTitle}>Timeline</Text>
              </View>
              <View style={styles.card}>
                {order.trackingUpdates.map((update, index) => (
                  <View key={index} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, index === 0 && styles.timelineDotActive]} />
                      {index < order.trackingUpdates.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineMessage}>{update.message}</Text>
                      <Text style={styles.timelineTime}>
                        {new Date(update.timestamp).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingText: { marginTop: spacing.md, fontSize: 16, color: colors.light.text.secondary },
  errorText: { marginTop: spacing.md, fontSize: 16, color: colors.light.text.secondary, textAlign: 'center' },
  retryButton: { 
    marginTop: spacing.lg, 
    backgroundColor: DELIVERY_GREEN, 
    paddingHorizontal: spacing.xl, 
    paddingVertical: spacing.md, 
    borderRadius: radius.lg 
  },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Header
  headerWrapper: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75,
    paddingBottom: 55,
    paddingHorizontal: 16,
  },
  headerBackgroundImage: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginTop: -(Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75),
    marginBottom: -55,
    marginHorizontal: -16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75,
    paddingBottom: 55,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerOverlayCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.5)',
  },
  backButton: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  statusBadgeSmall: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginTop: 8,
  },
  statusBadgeSmallText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  content: { flex: 1, padding: 16 },

  // Cancelled Banner
  cancelledBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelledIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cancelledTextContainer: {
    flex: 1,
  },
  cancelledTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 4,
  },
  cancelledMessage: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 18,
  },

  // Status Card
  statusCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  statusCardCancelled: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statusIconContainer: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statusText: { fontSize: 18, fontWeight: '800' },
  deliveredTime: { color: '#696969', marginTop: 8, fontSize: 13 },

  // Section
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1C', flex: 1 },
  itemCountBadge: {
    backgroundColor: colors.light.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemCountText: { color: colors.light.text.secondary, fontSize: 12, fontWeight: '600' },

  // Card
  cardBg: { borderRadius: 16, overflow: 'hidden', ...shadows.card, backgroundColor: '#fff' },
  card: { 
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 16,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.light.borderLight,
  },

  // Customer
  customerRow: { flexDirection: 'row', alignItems: 'center' },
  customerAvatar: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: DELIVERY_GREEN,
    justifyContent: 'center', alignItems: 'center',
  },
  customerInfo: { flex: 1, marginLeft: 12 },
  customerName: { fontSize: 16, fontWeight: '600', color: colors.light.text.primary },
  customerPhone: { fontSize: 14, color: colors.light.text.secondary, marginTop: 2 },
  callButton: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#DCFCE7',
    justifyContent: 'center', alignItems: 'center',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderLight,
  },
  addressIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addressTextSmall: {
    flex: 1,
    fontSize: 14,
    color: colors.light.text.secondary,
    lineHeight: 20,
  },

  // Navigate Card
  navigateCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.light.borderLight,
  },
  navigateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navigateIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigateTextContainer: {
    marginLeft: 12,
  },
  navigateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.text.primary,
  },
  navigateSubtitle: {
    fontSize: 13,
    color: colors.light.text.tertiary,
    marginTop: 2,
  },
  navigateArrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Order Items
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  orderItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.light.borderLight,
  },
  orderItemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.light.surfaceSecondary,
  },
  orderItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  orderItemImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceSecondary,
  },
  orderItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  orderItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.text.primary,
  },
  orderItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  orderItemQty: {
    fontSize: 13,
    color: colors.light.text.secondary,
    backgroundColor: colors.light.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orderItemUnitPrice: {
    fontSize: 13,
    color: colors.light.text.tertiary,
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.text.primary,
  },

  // Order Summary
  orderSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderLight,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.light.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.light.text.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: DELIVERY_GREEN,
  },

  // Payment Card
  paymentCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 16,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.light.borderLight,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodLabel: {
    fontSize: 12,
    color: colors.light.text.tertiary,
  },
  paymentMethodValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.text.primary,
    marginTop: 2,
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  paymentStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  collectedViaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderLight,
  },
  collectedViaLabel: {
    fontSize: 14,
    color: colors.light.text.secondary,
  },
  collectedViaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collectedViaText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Timeline
  timelineItem: { flexDirection: 'row', minHeight: 60 },
  timelineLeft: { alignItems: 'center', width: 24 },
  timelineDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#D1D5DB', marginTop: 4,
  },
  timelineDotActive: { backgroundColor: DELIVERY_GREEN },
  timelineLine: {
    width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 4,
  },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 16 },
  timelineMessage: { fontSize: 14, fontWeight: '600', color: '#1C1C1C' },
  timelineTime: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});
