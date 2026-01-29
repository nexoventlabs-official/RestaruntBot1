import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList, Image,
  Animated, Platform, StatusBar, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL } from '../../config/api';
import { colors, spacing, radius, typography, shadows } from '../../theme';

const STATUS_CONFIG = {
  pending: { color: '#F59E0B', bg: '#FEF3C7', label: 'Pending', icon: 'time-outline' },
  confirmed: { color: '#3B82F6', bg: '#DBEAFE', label: 'Confirmed', icon: 'checkmark-circle-outline' },
  preparing: { color: '#8B5CF6', bg: '#EDE9FE', label: 'Preparing', icon: 'restaurant-outline' },
  ready: { color: '#10B981', bg: '#D1FAE5', label: 'Ready', icon: 'checkmark-done-outline' },
  out_for_delivery: { color: '#06B6D4', bg: '#CFFAFE', label: 'Out for Delivery', icon: 'bicycle-outline' },
  delivered: { color: '#22C55E', bg: '#DCFCE7', label: 'Delivered', icon: 'checkmark-circle' },
  cancelled: { color: '#EF4444', bg: '#FEE2E2', label: 'Cancelled', icon: 'close-circle' },
  refunded: { color: '#6B7280', bg: '#F3F4F6', label: 'Refunded', icon: 'refresh-circle' },
};

// Separate status flows for delivery and pickup orders
const DELIVERY_STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
const PICKUP_STATUS_FLOW = ['pending', 'confirmed', 'ready', 'delivered'];

export default function OrderDetailScreen({ route, navigation }) {
  const { order: passedOrder, orderId } = route.params || {};
  const [order, setOrder] = useState(passedOrder || null);
  const [loading, setLoading] = useState(!passedOrder && !!orderId);
  const [fetchError, setFetchError] = useState(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [assigningPartnerId, setAssigningPartnerId] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Fetch order if only orderId was passed
  useEffect(() => {
    if (!passedOrder && orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response.data);
    } catch (err) {
      console.error('Error fetching order:', err);
      setFetchError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (order) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [order]);

  const fetchDeliveryPartners = async () => {
    setLoadingPartners(true);
    try {
      const response = await api.get('/delivery');
      setDeliveryPartners(response.data || []);
    } catch (error) { console.error('Failed to fetch delivery partners:', error); }
    finally { setLoadingPartners(false); }
  };

  const updateStatus = async (newStatus, deliveryBoyId = null, actualPaymentMethod = null) => {
    setLoading(true);
    if (deliveryBoyId) setAssigningPartnerId(deliveryBoyId);
    try {
      const updateData = { status: newStatus };
      
      // If pickup order is being completed and payment method is provided
      if (actualPaymentMethod) {
        updateData.actualPaymentMethod = actualPaymentMethod;
      }
      
      await api.put(`/orders/${order._id}/status`, updateData);
      if (deliveryBoyId) await api.put(`/orders/${order._id}/assign-delivery`, { deliveryBoyId });
      setShowDeliveryModal(false);
      Alert.alert('Success', deliveryBoyId ? 'Order assigned and status updated' : 'Order status updated', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) { Alert.alert('Error', error.response?.data?.error || 'Failed to update status'); }
    finally { setLoading(false); setAssigningPartnerId(null); }
  };

  const handleStartPreparing = async () => {
    if (order.serviceType === 'delivery') { await fetchDeliveryPartners(); setShowDeliveryModal(true); }
    else confirmStatusUpdate('preparing');
  };

  const confirmStatusUpdate = (newStatus) => {
    // For pickup orders being marked as delivered (completed), ask for payment method
    if (order.serviceType === 'pickup' && newStatus === 'delivered' && order.paymentMethod === 'cod') {
      Alert.alert(
        'Complete Order',
        'How did the customer pay?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Cash', 
            onPress: () => updateStatus(newStatus, null, 'cash')
          },
          { 
            text: 'UPI', 
            onPress: () => updateStatus(newStatus, null, 'upi')
          }
        ]
      );
    } else {
      Alert.alert('Update Status', `Change status to "${STATUS_CONFIG[newStatus]?.label}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateStatus(newStatus) },
      ]);
    }
  };

  const cancelOrder = () => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        setLoading(true);
        try {
          const response = await api.put(`/orders/${order._id}/status`, { status: 'cancelled' });
          setOrder(response.data);
          Alert.alert('Success', 'Order cancelled');
        } catch (error) { Alert.alert('Error', error.response?.data?.error || 'Failed to cancel order'); }
        finally { setLoading(false); }
      }},
    ]);
  };

  const getNextStatus = () => {
    // Use different status flows based on service type
    const statusFlow = order.serviceType === 'pickup' ? PICKUP_STATUS_FLOW : DELIVERY_STATUS_FLOW;
    const currentIndex = statusFlow.indexOf(order.status);
    if (currentIndex >= 0 && currentIndex < statusFlow.length - 1) return statusFlow[currentIndex + 1];
    return null;
  };

  const renderDeliveryPartner = ({ item }) => {
    const isAssigning = assigningPartnerId === item._id;
    return (
      <TouchableOpacity
        style={[styles.partnerCard, !item.isActive && styles.partnerCardDisabled, isAssigning && styles.partnerCardSelected]}
        onPress={() => item.isActive && !assigningPartnerId && updateStatus('preparing', item._id)}
        disabled={!item.isActive || loading || assigningPartnerId}
        activeOpacity={0.7}
      >
        <View style={styles.partnerAvatar}>
          {item.photo ? <Image source={{ uri: item.photo }} style={styles.partnerPhoto} /> : (
            <View style={[styles.partnerPhoto, styles.partnerPhotoPlaceholder]}>
              <Text style={styles.partnerInitial}>{item.name[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.onlineDot, { backgroundColor: item.isOnline ? '#22C55E' : '#9CA3AF' }]} />
        </View>
        <View style={styles.partnerInfo}>
          <View style={styles.partnerNameRow}>
            <Text style={styles.partnerName}>{item.name}</Text>
            {!item.isActive && <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>Inactive</Text></View>}
          </View>
          <Text style={styles.partnerPhone}>{item.phone}</Text>
          <View style={styles.partnerMeta}>
            <View style={[styles.statusPill, { backgroundColor: item.isOnline ? '#DCFCE7' : colors.light.surfaceSecondary }]}>
              <View style={[styles.statusDot, { backgroundColor: item.isOnline ? '#22C55E' : '#9CA3AF' }]} />
              <Text style={[styles.statusPillText, { color: item.isOnline ? '#22C55E' : '#9CA3AF' }]}>{item.isOnline ? 'Online' : 'Offline'}</Text>
            </View>
            {item.avgRating > 0 && <View style={styles.ratingBadge}><Ionicons name="star" size={12} color="#F59E0B" /><Text style={styles.ratingText}>{item.avgRating.toFixed(1)}</Text></View>}
          </View>
        </View>
        {isAssigning ? <ActivityIndicator size="small" color={colors.zomato.red} /> : <Ionicons name="bicycle-outline" size={24} color={item.isActive ? colors.zomato.red : '#9CA3AF'} />}
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading && !order) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />
        <ActivityIndicator size="large" color={colors.zomato.red} />
        <Text style={{ marginTop: spacing.md, fontSize: 16, color: colors.light.text.secondary }}>Loading order details...</Text>
      </View>
    );
  }

  // Error state
  if (fetchError || !order) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: spacing.xl }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />
        <Ionicons name="alert-circle-outline" size={64} color={colors.light.text.tertiary} />
        <Text style={{ marginTop: spacing.md, fontSize: 16, color: colors.light.text.secondary, textAlign: 'center' }}>{fetchError || 'Order not found'}</Text>
        <TouchableOpacity 
          style={{ marginTop: spacing.lg, backgroundColor: colors.zomato.red, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.lg }}
          onPress={() => orderId ? fetchOrder() : navigation.goBack()}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{orderId ? 'Retry' : 'Go Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // These must be after the loading/error checks since they access order properties
  const nextStatus = getNextStatus();
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  
  // Get appropriate status label based on service type
  const getStatusLabel = (status) => {
    if (status === 'delivered' && order.serviceType === 'pickup') {
      return 'Completed';
    }
    return STATUS_CONFIG[status]?.label || status;
  };
  
  const sortedPartners = [...deliveryPartners].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <Animated.View style={{ opacity: fadeAnim }}>
        <LinearGradient colors={[colors.zomato.red, colors.zomato.darkRed]} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Order Details</Text>
            <Text style={styles.orderId}>#{order.orderId}</Text>
          </View>
          <View style={{ width: 44 }} />
        </LinearGradient>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={[styles.statusIconContainer, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon} size={32} color={statusConfig.color} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{getStatusLabel(order.status)}</Text>
              <Text style={styles.serviceType}>{order.serviceType?.toUpperCase() || 'DELIVERY'}</Text>
            </View>
            <Text style={styles.statusTime}>{new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
          </View>

          {/* Customer Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="person" size={18} color={colors.zomato.red} />
              </View>
              <Text style={styles.sectionTitle}>Customer Details</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.customerRow}>
                <View style={styles.customerAvatar}>
                  <Ionicons name="person" size={24} color="#fff" />
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{order.customer?.name || 'N/A'}</Text>
                  <Text style={styles.customerPhone}>{order.customer?.phone}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={() => {
                    const phone = order.customer?.phone;
                    if (phone) {
                      Linking.openURL(`tel:${phone}`);
                    }
                  }}
                >
                  <Ionicons name="call" size={18} color="#22C55E" />
                </TouchableOpacity>
              </View>
              <View style={styles.addressContainer}>
                <View style={styles.addressIcon}>
                  <Ionicons name="location" size={18} color={colors.zomato.red} />
                </View>
                <Text style={styles.addressText}>{order.deliveryAddress?.address || order.customer?.address || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Order Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="fast-food" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.sectionTitle}>Order Items</Text>
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>{order.items?.length || 0} items</Text>
              </View>
            </View>
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
                    <Text style={styles.paymentMethodValue}>
                      {order.paymentMethod === 'cod' 
                        ? (order.serviceType === 'pickup' ? 'Pay at Hotel' : 'Cash on Delivery')
                        : 'UPI Payment'}
                    </Text>
                    {/* Show actual payment method if collected */}
                    {order.actualPaymentMethod && order.serviceType === 'pickup' && (
                      <Text style={styles.actualPaymentText}>
                        Collected via {order.actualPaymentMethod === 'cash' ? 'Cash' : 'UPI'}
                      </Text>
                    )}
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
            </View>
          </View>

          {/* Delivery Partner */}
          {order.assignedTo && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: '#CFFAFE' }]}>
                  <Ionicons name="bicycle" size={18} color="#06B6D4" />
                </View>
                <Text style={styles.sectionTitle}>Delivery Partner</Text>
              </View>
              <View style={styles.card}>
                <View style={styles.deliveryPartnerRow}>
                  <View style={styles.deliveryPartnerAvatar}>
                    <Ionicons name="person" size={24} color="#fff" />
                  </View>
                  <View style={styles.deliveryPartnerInfo}>
                    <Text style={styles.deliveryPartnerName}>{order.deliveryPartnerName || 'Assigned'}</Text>
                    <Text style={styles.deliveryPartnerStatus}>On the way</Text>
                  </View>
                  <TouchableOpacity style={styles.trackButton}>
                    <Ionicons name="navigate" size={18} color={colors.zomato.red} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

        </Animated.View>
        <View style={{ height: 140 }} />
      </ScrollView>

      {!['delivered', 'cancelled', 'refunded'].includes(order.status) && (
        <View style={styles.footer}>
          {loading ? <ActivityIndicator size="large" color={colors.zomato.red} /> : (
            <View style={styles.footerButtons}>
              {nextStatus && (
                <TouchableOpacity style={[styles.actionButton, order.paymentMethod === 'cod' && styles.actionButtonHalf]} onPress={() => {
                  if (order.status === 'confirmed' && nextStatus === 'preparing' && order.serviceType === 'delivery') handleStartPreparing();
                  else confirmStatusUpdate(nextStatus);
                }} activeOpacity={0.8}>
                  <LinearGradient colors={[STATUS_CONFIG[nextStatus]?.color || colors.zomato.red, STATUS_CONFIG[nextStatus]?.color || colors.zomato.darkRed]} style={styles.actionButtonGradient}>
                    <Ionicons name={STATUS_CONFIG[nextStatus]?.icon || 'checkmark'} size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionButtonText}>
                      {order.status === 'confirmed' && order.serviceType === 'delivery' 
                        ? 'Start Preparing' 
                        : `Mark as ${getStatusLabel(nextStatus)}`}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {order.paymentMethod === 'cod' && (
                <TouchableOpacity style={[styles.cancelButton, nextStatus && styles.cancelButtonHalf]} onPress={cancelOrder}>
                  <Ionicons name="close-circle-outline" size={20} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      <Modal visible={showDeliveryModal} animationType="slide" transparent={true} onRequestClose={() => setShowDeliveryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Delivery Partner</Text>
                <Text style={styles.modalSubtitle}>Order #{order.orderId}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowDeliveryModal(false)}>
                <Ionicons name="close" size={24} color={colors.light.text.secondary} />
              </TouchableOpacity>
            </View>
            {loadingPartners ? (
              <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.zomato.red} /></View>
            ) : deliveryPartners.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bicycle-outline" size={48} color={colors.light.text.tertiary} />
                <Text style={styles.emptyText}>No delivery partners found</Text>
              </View>
            ) : (
              <FlatList data={sortedPartners} renderItem={renderDeliveryPartner} keyExtractor={(item) => item._id} contentContainerStyle={styles.partnerList} showsVerticalScrollIndicator={false} />
            )}
            <TouchableOpacity style={[styles.skipButton, (loading || assigningPartnerId) && styles.skipButtonDisabled]} onPress={() => updateStatus('preparing')} disabled={loading || assigningPartnerId}>
              {loading && !assigningPartnerId ? <ActivityIndicator size="small" color={colors.light.text.secondary} /> : <Text style={styles.skipButtonText}>Skip - Assign Later</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.light.background 
  },
  header: { 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60, 
    paddingBottom: spacing.lg, 
    paddingHorizontal: spacing.screenHorizontal, 
    borderBottomLeftRadius: 28, 
    borderBottomRightRadius: 28, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  backButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerCenter: { 
    flex: 1, 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#fff' 
  },
  orderId: { 
    fontSize: 13, 
    color: 'rgba(255,255,255,0.8)', 
    marginTop: 2 
  },
  content: { 
    flex: 1, 
    padding: spacing.screenHorizontal 
  },
  
  // Status Card
  statusCard: { 
    backgroundColor: colors.light.surface, 
    borderRadius: radius.xl, 
    padding: spacing.lg, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: spacing.md, 
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.light.borderLight,
  },
  statusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  statusText: { 
    fontSize: 18, 
    fontWeight: '700' 
  },
  serviceType: { 
    color: colors.light.text.secondary, 
    fontSize: 12, 
    fontWeight: '600', 
    marginTop: 4, 
    letterSpacing: 1 
  },
  statusTime: { 
    color: colors.light.text.tertiary, 
    fontSize: 12 
  },
  
  // Section
  section: { 
    marginBottom: spacing.md 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.light.text.primary,
    flex: 1,
  },
  itemCountBadge: {
    backgroundColor: colors.light.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  itemCountText: {
    fontSize: 12,
    color: colors.light.text.secondary,
    fontWeight: '500',
  },
  card: { 
    backgroundColor: colors.light.surface, 
    borderRadius: radius.xl, 
    padding: spacing.md, 
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.light.borderLight,
  },
  
  // Customer Details
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.zomato.red,
    justifyContent: 'center',
    alignItems: 'center',
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
  customerPhone: {
    fontSize: 14,
    color: colors.light.text.secondary,
    marginTop: 2,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderLight,
  },
  addressIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: colors.light.text.secondary,
    lineHeight: 20,
  },
  
  // Order Items
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
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
    marginLeft: spacing.md,
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
    gap: spacing.sm,
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
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderLight,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
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
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text.primary,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.zomato.red,
  },
  
  // Payment Card
  paymentCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadows.md,
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
    marginRight: spacing.md,
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
  actualPaymentText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '500',
    marginTop: 4,
    fontStyle: 'italic',
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: 6,
  },
  paymentStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Delivery Partner
  deliveryPartnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryPartnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryPartnerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  deliveryPartnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text.primary,
  },
  deliveryPartnerStatus: {
    fontSize: 13,
    color: '#06B6D4',
    marginTop: 2,
  },
  trackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Footer
  footer: { 
    padding: spacing.screenHorizontal, 
    paddingBottom: spacing.xl, 
    backgroundColor: colors.light.surface, 
    ...shadows.lg,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderLight,
  },
  footerButtons: { 
    flexDirection: 'row', 
    gap: spacing.sm 
  },
  actionButton: { 
    flex: 1, 
    borderRadius: radius.lg, 
    overflow: 'hidden' 
  },
  actionButtonHalf: { 
    flex: 1 
  },
  actionButtonGradient: { 
    height: 54, 
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: spacing.sm 
  },
  actionButtonText: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '600', 
    textAlign: 'center' 
  },
  cancelButton: { 
    flex: 1, 
    height: 54, 
    borderRadius: radius.lg, 
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  cancelButtonHalf: { 
    flex: 0.5 
  },
  cancelButtonText: { 
    color: '#EF4444', 
    fontSize: 15, 
    fontWeight: '600' 
  },
  
  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: colors.light.surface, 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    maxHeight: '80%', 
    paddingBottom: spacing.xl 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    padding: spacing.lg, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.light.borderLight 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: colors.light.text.primary 
  },
  modalSubtitle: { 
    fontSize: 14, 
    color: colors.light.text.secondary, 
    marginTop: 2 
  },
  modalCloseButton: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: colors.light.surfaceSecondary, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingContainer: { 
    padding: 40, 
    alignItems: 'center' 
  },
  emptyContainer: { 
    padding: 40, 
    alignItems: 'center' 
  },
  emptyText: { 
    fontSize: 16, 
    color: colors.light.text.secondary, 
    marginTop: spacing.md 
  },
  partnerList: { 
    padding: spacing.base 
  },
  partnerCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: spacing.md, 
    backgroundColor: colors.light.surfaceSecondary, 
    borderRadius: radius.lg, 
    marginBottom: spacing.sm 
  },
  partnerCardDisabled: { 
    opacity: 0.6 
  },
  partnerCardSelected: { 
    backgroundColor: colors.primary[50], 
    borderWidth: 1, 
    borderColor: colors.zomato.red 
  },
  partnerAvatar: { 
    position: 'relative', 
    marginRight: spacing.md 
  },
  partnerPhoto: { 
    width: 48, 
    height: 48, 
    borderRadius: 14 
  },
  partnerPhotoPlaceholder: { 
    backgroundColor: colors.zomato.red, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  partnerInitial: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  onlineDot: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    borderWidth: 2, 
    borderColor: '#fff' 
  },
  partnerInfo: { 
    flex: 1 
  },
  partnerNameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.sm 
  },
  partnerName: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: colors.light.text.primary 
  },
  inactiveBadge: { 
    backgroundColor: '#FEE2E2', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4 
  },
  inactiveBadgeText: { 
    fontSize: 11, 
    color: '#EF4444', 
    fontWeight: '600' 
  },
  partnerPhone: { 
    fontSize: 13, 
    color: colors.light.text.secondary, 
    marginTop: 2 
  },
  partnerMeta: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.sm, 
    marginTop: spacing.xs 
  },
  statusPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: spacing.sm, 
    paddingVertical: 3, 
    borderRadius: radius.full, 
    gap: 4 
  },
  statusDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3 
  },
  statusPillText: { 
    fontSize: 11, 
    fontWeight: '600' 
  },
  ratingBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 2 
  },
  ratingText: { 
    fontSize: 11, 
    color: '#F59E0B', 
    fontWeight: '600' 
  },
  skipButton: { 
    marginHorizontal: spacing.base, 
    paddingVertical: spacing.md, 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderTopColor: colors.light.border 
  },
  skipButtonDisabled: { 
    opacity: 0.6 
  },
  skipButtonText: { 
    fontSize: 15, 
    color: colors.light.text.secondary, 
    fontWeight: '500' 
  },
});
