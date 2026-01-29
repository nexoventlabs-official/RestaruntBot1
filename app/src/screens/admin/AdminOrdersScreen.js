import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Modal, ScrollView,
  RefreshControl, TouchableOpacity, ActivityIndicator, Animated, Platform, StatusBar, ImageBackground, AppState
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { colors, spacing, radius, shadows } from '../../theme';

const STATUS_CONFIG = {
  pending: { color: '#F59E0B', bg: '#FEF3C7', icon: 'time-outline', label: 'Pending' },
  confirmed: { color: '#3B82F6', bg: '#DBEAFE', icon: 'checkmark-circle-outline', label: 'Confirmed' },
  preparing: { color: '#8B5CF6', bg: '#EDE9FE', icon: 'restaurant-outline', label: 'Preparing' },
  ready: { color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-done-outline', label: 'Ready' },
  out_for_delivery: { color: '#06B6D4', bg: '#CFFAFE', icon: 'bicycle-outline', label: 'Out for Delivery' },
  delivered: { color: '#22C55E', bg: '#DCFCE7', icon: 'checkmark-circle', label: 'Delivered' },
  cancelled: { color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle-outline', label: 'Cancelled' },
  refunded: { color: '#6B7280', bg: '#F3F4F6', icon: 'refresh-outline', label: 'Refunded' },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { color: '#F59E0B', label: 'Pending' },
  paid: { color: '#22C55E', label: 'Paid' },
  failed: { color: '#EF4444', label: 'Failed' },
  refunded: { color: '#6B7280', label: 'Refunded' },
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: 'arrow-down' },
  { value: 'oldest', label: 'Oldest First', icon: 'arrow-up' },
  { value: 'amount_high', label: 'Amount: High to Low', icon: 'trending-down' },
  { value: 'amount_low', label: 'Amount: Low to High', icon: 'trending-up' },
];

const OrderCard = ({ item, onPress, index }) => {
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const paymentConfig = PAYMENT_STATUS_CONFIG[item.paymentStatus] || PAYMENT_STATUS_CONFIG.pending;
  
  // Get appropriate status label based on service type
  const getStatusLabel = () => {
    if (item.status === 'delivered' && item.serviceType === 'pickup') {
      return 'Completed';
    }
    return statusConfig.label;
  };
  
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, delay: index * 40, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 50, delay: index * 40, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.9}>
        {/* Header - Order ID & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.orderIdBadge}>
            <Ionicons name="receipt-outline" size={14} color={colors.zomato.red} />
            <Text style={styles.orderId}>#{item.orderId}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {/* Service Type Badge - NEW */}
            {item.serviceType === 'pickup' && (
              <View style={[styles.serviceTypeBadge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="bag-handle" size={10} color="#92400E" />
                <Text style={[styles.serviceTypeBadgeText, { color: '#92400E' }]}>Pickup</Text>
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{getStatusLabel()}</Text>
            </View>
          </View>
        </View>

        {/* Customer Info Row */}
        <View style={styles.customerRow}>
          <View style={styles.customerAvatar}>
            <Ionicons name="person" size={20} color={colors.light.text.tertiary} />
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{item.customer?.name || 'Customer'}</Text>
            <Text style={styles.customerPhone}>{item.customer?.phone || ''}</Text>
          </View>
        </View>

        {/* Footer - Amount & Payment */}
        <View style={styles.cardFooter}>
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amount}>₹{item.totalAmount}</Text>
          </View>
          <View style={[styles.paymentBadge, { backgroundColor: item.paymentMethod === 'cod' ? '#FEF3C7' : '#DCFCE7' }]}>
            <Text style={[styles.paymentText, { color: item.paymentMethod === 'cod' ? '#92400E' : '#166534' }]}>
              {item.paymentMethod === 'cod' 
                ? (item.serviceType === 'pickup' ? 'Pay at Hotel' : 'COD')
                : 'Paid'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};


export default function AdminOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // Changed to 'all' to show all statuses
  const [serviceTypeTab, setServiceTypeTab] = useState('all'); // New: all, delivery, pickup
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(-1)).current;
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [dateFilter, setDateFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [allOrders, setAllOrders] = useState([]); // Store all orders for counting
  const pollIntervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  const POLL_INTERVAL = 5000; // 5 seconds for real-time updates

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    // Glass shine effect
    setTimeout(() => {
      Animated.timing(shineAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }, 300);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      // Always fetch all orders to get counts
      const response = await api.get('/orders');
      const fetchedOrders = response.data.orders || [];
      setAllOrders(fetchedOrders);
      setOrders(fetchedOrders);
    } catch (error) { console.error('Error fetching orders:', error); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  
  // Real-time polling for order updates
  useEffect(() => {
    const startPolling = () => {
      if (pollIntervalRef.current) return;
      pollIntervalRef.current = setInterval(() => {
        fetchOrders();
      }, POLL_INTERVAL);
    };

    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - fetch immediately and restart polling
        fetchOrders();
        startPolling();
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - stop polling
        stopPolling();
      }
      appState.current = nextAppState;
    };

    // Start polling when component mounts
    startPolling();
    
    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      stopPolling();
      subscription?.remove();
    };
  }, [fetchOrders]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => fetchOrders());
    return unsubscribe;
  }, [navigation, fetchOrders]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchOrders(); }, [filter]);

  // Filter & Sort Logic
  const filteredAndSortedOrders = useMemo(() => {
    let result = [...orders];

    // Service Type filter (NEW)
    if (serviceTypeTab === 'delivery') {
      result = result.filter(order => order.serviceType === 'delivery' || !order.serviceType);
    } else if (serviceTypeTab === 'pickup') {
      result = result.filter(order => order.serviceType === 'pickup');
    }

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = result.filter(order => 
        order.orderId?.toLowerCase().includes(search) ||
        order.customer?.name?.toLowerCase().includes(search) ||
        order.customer?.phone?.toLowerCase().includes(search) ||
        order.deliveryAddress?.address?.toLowerCase().includes(search) ||
        order.items?.some(item => (item.name || item.menuItem?.name)?.toLowerCase().includes(search))
      );
    }

    // Status filter (already applied via API, but also filter locally for combined filters)
    if (filter !== 'all') {
      result = result.filter(order => order.status === filter);
    }

    // Payment status filter
    if (paymentFilter !== 'all') {
      result = result.filter(order => order.paymentStatus === paymentFilter);
    }

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);

    if (dateFilter === 'today') {
      result = result.filter(order => new Date(order.createdAt) >= today);
    } else if (dateFilter === 'yesterday') {
      result = result.filter(order => {
        const d = new Date(order.createdAt);
        return d >= yesterday && d < today;
      });
    } else if (dateFilter === 'week') {
      result = result.filter(order => new Date(order.createdAt) >= weekAgo);
    } else if (dateFilter === 'month') {
      result = result.filter(order => new Date(order.createdAt) >= monthAgo);
    }

    // Amount filter
    if (minAmount) {
      result = result.filter(order => order.totalAmount >= parseFloat(minAmount));
    }
    if (maxAmount) {
      result = result.filter(order => order.totalAmount <= parseFloat(maxAmount));
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
        case 'amount_high': return b.totalAmount - a.totalAmount;
        case 'amount_low': return a.totalAmount - b.totalAmount;
        default: return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return result;
  }, [orders, searchTerm, filter, paymentFilter, dateFilter, minAmount, maxAmount, sortBy, serviceTypeTab]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (paymentFilter !== 'all') count++;
    if (dateFilter !== 'all') count++;
    if (minAmount || maxAmount) count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [paymentFilter, dateFilter, minAmount, maxAmount, sortBy]);

  const clearAllFilters = () => {
    setPaymentFilter('all');
    setDateFilter('all');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('newest');
  };

  const getFilterCount = (status) => {
    let ordersToCount = allOrders;
    
    // Filter by service type first
    if (serviceTypeTab === 'delivery') {
      ordersToCount = ordersToCount.filter(o => o.serviceType === 'delivery' || !o.serviceType);
    } else if (serviceTypeTab === 'pickup') {
      ordersToCount = ordersToCount.filter(o => o.serviceType === 'pickup');
    }
    
    // Then filter by status
    if (status === 'all') return ordersToCount.length;
    return ordersToCount.filter(o => o.status === status).length;
  };

  const getServiceTypeCount = (type) => {
    if (type === 'all') return allOrders.length;
    if (type === 'delivery') return allOrders.filter(o => o.serviceType === 'delivery' || !o.serviceType).length;
    if (type === 'pickup') return allOrders.filter(o => o.serviceType === 'pickup').length;
    return 0;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <ImageBackground
        source={require('../../../assets/backgrounds/orders.jpg')}
        style={styles.header}
        imageStyle={styles.headerBackgroundImage}
      >
        <View style={styles.headerOverlay}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.titleRow}>
                <View style={styles.titleIconContainer}><Ionicons name="receipt" size={20} color="#fff" /></View>
                <Text style={styles.title}>Orders</Text>
              </View>
              <Text style={styles.subtitle}>
                {filteredAndSortedOrders.length} of {
                  serviceTypeTab === 'all' 
                    ? orders.length 
                    : serviceTypeTab === 'delivery'
                    ? orders.filter(o => o.serviceType === 'delivery' || !o.serviceType).length
                    : orders.filter(o => o.serviceType === 'pickup').length
                } {serviceTypeTab !== 'all' ? serviceTypeTab : ''} orders
              </Text>
            </View>
          </View>
          
          {/* Glass Shine Effect */}
          <Animated.View
            style={[
              styles.glassShine,
              {
                transform: [{ translateX: shineAnim.interpolate({ inputRange: [-1, 1], outputRange: [-200, 400] }) }],
                opacity: shineAnim.interpolate({ inputRange: [-1, 0, 0.5, 1], outputRange: [0, 0.6, 0.6, 0] }),
              },
            ]}
          />
        </View>
      </ImageBackground>

      {/* Search Bar - Below Header */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            placeholderTextColor="#9ca3af"
            value={searchTerm}
            onChangeText={(text) => {
              setSearchTerm(text);
              if (text.length > 0) {
                setFilter('all');
              }
            }}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Service Type Tabs Only - Simple 3 Tabs */}
      <View style={styles.serviceTypeTabs}>
        <TouchableOpacity
          style={[styles.serviceTypeTab, serviceTypeTab === 'all' && styles.serviceTypeTabActive]}
          onPress={() => setServiceTypeTab('all')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="apps-outline" 
            size={18} 
            color={serviceTypeTab === 'all' ? '#fff' : colors.light.text.secondary} 
          />
          <Text style={[styles.serviceTypeTabText, serviceTypeTab === 'all' && styles.serviceTypeTabTextActive]}>
            All Orders
          </Text>
          <View style={[styles.serviceTypeCount, serviceTypeTab === 'all' && styles.serviceTypeCountActive]}>
            <Text style={[styles.serviceTypeCountText, serviceTypeTab === 'all' && styles.serviceTypeCountTextActive]}>
              {getServiceTypeCount('all')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.serviceTypeTab, serviceTypeTab === 'delivery' && styles.serviceTypeTabActive]}
          onPress={() => setServiceTypeTab('delivery')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="bicycle-outline" 
            size={18} 
            color={serviceTypeTab === 'delivery' ? '#fff' : colors.light.text.secondary} 
          />
          <Text style={[styles.serviceTypeTabText, serviceTypeTab === 'delivery' && styles.serviceTypeTabTextActive]}>
            Delivery
          </Text>
          <View style={[styles.serviceTypeCount, serviceTypeTab === 'delivery' && styles.serviceTypeCountActive]}>
            <Text style={[styles.serviceTypeCountText, serviceTypeTab === 'delivery' && styles.serviceTypeCountTextActive]}>
              {getServiceTypeCount('delivery')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.serviceTypeTab, serviceTypeTab === 'pickup' && styles.serviceTypeTabActive]}
          onPress={() => setServiceTypeTab('pickup')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="bag-handle-outline" 
            size={18} 
            color={serviceTypeTab === 'pickup' ? '#fff' : colors.light.text.secondary} 
          />
          <Text style={[styles.serviceTypeTabText, serviceTypeTab === 'pickup' && styles.serviceTypeTabTextActive]}>
            Pickup
          </Text>
          <View style={[styles.serviceTypeCount, serviceTypeTab === 'pickup' && styles.serviceTypeCountActive]}>
            <Text style={[styles.serviceTypeCountText, serviceTypeTab === 'pickup' && styles.serviceTypeCountTextActive]}>
              {getServiceTypeCount('pickup')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.zomato.red} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <FlatList 
          data={filteredAndSortedOrders}
          renderItem={({ item, index }) => <OrderCard item={item} index={index} onPress={() => navigation.navigate('OrderDetail', { order: item })} />}
          keyExtractor={(item) => item._id} 
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.zomato.red]} tintColor={colors.zomato.red} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <LinearGradient colors={[colors.light.surfaceSecondary, colors.light.border]} style={styles.emptyIconGradient}>
                  <Ionicons name={searchTerm ? "search-outline" : "receipt-outline"} size={48} color={colors.light.text.tertiary} />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>{searchTerm ? 'No matching orders' : 'No orders found'}</Text>
              <Text style={styles.emptyText}>{searchTerm ? `No orders match "${searchTerm}"` : filter !== 'all' ? 'Try changing the filter' : 'Orders will appear here'}</Text>
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent={true} onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={colors.light.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Sort By */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sort By</Text>
                <View style={styles.sortOptions}>
                  {SORT_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.sortOption, sortBy === option.value && styles.sortOptionActive]}
                      onPress={() => setSortBy(option.value)}
                    >
                      <Ionicons name={option.icon} size={16} color={sortBy === option.value ? '#fff' : colors.light.text.secondary} />
                      <Text style={[styles.sortOptionText, sortBy === option.value && styles.sortOptionTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Payment Status */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Payment Status</Text>
                <View style={styles.paymentOptions}>
                  <TouchableOpacity style={[styles.paymentOption, paymentFilter === 'all' && styles.paymentOptionActive]} onPress={() => setPaymentFilter('all')}>
                    <Text style={[styles.paymentOptionText, paymentFilter === 'all' && styles.paymentOptionTextActive]}>All</Text>
                  </TouchableOpacity>
                  {Object.entries(PAYMENT_STATUS_CONFIG).map(([key, config]) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.paymentOption, paymentFilter === key && { backgroundColor: config.color, borderColor: config.color }]}
                      onPress={() => setPaymentFilter(key)}
                    >
                      <Text style={[styles.paymentOptionText, paymentFilter === key && styles.paymentOptionTextActive]}>{config.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Date Range</Text>
                <View style={styles.dateOptions}>
                  {[{ value: 'all', label: 'All Time' }, { value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' }, { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.dateOption, dateFilter === option.value && styles.dateOptionActive]}
                      onPress={() => setDateFilter(option.value)}
                    >
                      <Text style={[styles.dateOptionText, dateFilter === option.value && styles.dateOptionTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Amount Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Amount Range</Text>
                <View style={styles.amountInputs}>
                  <View style={styles.amountInputWrapper}>
                    <Text style={styles.amountInputLabel}>Min ₹</Text>
                    <TextInput style={styles.amountInput} placeholder="0" placeholderTextColor={colors.light.text.tertiary} value={minAmount} onChangeText={setMinAmount} keyboardType="numeric" />
                  </View>
                  <Text style={styles.amountSeparator}>to</Text>
                  <View style={styles.amountInputWrapper}>
                    <Text style={styles.amountInputLabel}>Max ₹</Text>
                    <TextInput style={styles.amountInput} placeholder="Any" placeholderTextColor={colors.light.text.tertiary} value={maxAmount} onChangeText={setMaxAmount} keyboardType="numeric" />
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearButton} onPress={clearAllFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  header: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75, paddingBottom: 55, paddingHorizontal: spacing.screenHorizontal, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  headerBackgroundImage: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerOverlay: { backgroundColor: 'rgba(0, 0, 0, 0.4)', marginTop: -(Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75), marginBottom: -55, marginHorizontal: -spacing.screenHorizontal, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75, paddingBottom: 55, paddingHorizontal: spacing.screenHorizontal, overflow: 'hidden' },
  glassShine: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: 100, backgroundColor: 'rgba(255, 255, 255, 0.3)', transform: [{ skewX: '-20deg' }] },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: {},
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleIconContainer: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs, marginLeft: 48 },
  
  // Search Bar - Below Header (like Menu screen)
  searchContainer: { paddingHorizontal: 16, marginTop: -20 },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, height: 52, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, gap: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#1C1C1C', fontWeight: '500' },
  highlightedText: { backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: '600' },
  
  // Service Type Tabs - Simple 3 Tabs
  serviceTypeTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  serviceTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.light.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.light.borderLight,
  },
  serviceTypeTabActive: {
    backgroundColor: colors.zomato.red,
    borderColor: colors.zomato.red,
  },
  serviceTypeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.text.secondary,
  },
  serviceTypeTabTextActive: {
    color: '#fff',
  },
  serviceTypeCount: {
    backgroundColor: colors.light.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  serviceTypeCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  serviceTypeCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.light.text.secondary,
  },
  serviceTypeCountTextActive: {
    color: '#fff',
  },
  
  // Loading & List
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: 14, color: colors.light.text.secondary },
  listContent: { padding: spacing.screenHorizontal, paddingBottom: 100 },
  
  // Order Card - Simple Design
  orderCard: { 
    backgroundColor: colors.light.surface, 
    borderRadius: radius.lg, 
    marginBottom: spacing.sm, 
    padding: spacing.md,
    ...shadows.sm,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: spacing.md,
  },
  orderIdBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: colors.zomato.red + '10', 
    paddingHorizontal: spacing.sm + 2, 
    paddingVertical: 6, 
    borderRadius: radius.md,
  },
  orderId: { fontSize: 13, fontWeight: '700', color: colors.zomato.red },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: spacing.sm + 2, 
    paddingVertical: 6, 
    borderRadius: radius.full,
  },
  serviceTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  serviceTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  customerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: spacing.sm,
  },
  customerAvatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    backgroundColor: colors.light.surfaceSecondary, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  customerDetails: { 
    flex: 1, 
    marginLeft: spacing.md,
  },
  customerName: { fontSize: 16, fontWeight: '600', color: colors.light.text.primary },
  customerPhone: { fontSize: 13, color: colors.light.text.tertiary, marginTop: 2 },
  addressRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: colors.light.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  addressText: { fontSize: 13, color: colors.light.text.secondary, flex: 1 },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderLight,
  },
  amountSection: {},
  amountLabel: { fontSize: 11, color: colors.light.text.tertiary, fontWeight: '500' },
  amount: { fontSize: 20, fontWeight: '700', color: colors.zomato.red, marginTop: 2 },
  paymentBadge: { 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.sm, 
    borderRadius: radius.md,
  },
  paymentText: { fontSize: 13, fontWeight: '700' },
  
  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyIconContainer: { marginBottom: spacing.lg },
  emptyIconGradient: { width: 100, height: 100, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.light.text.primary, marginBottom: spacing.xs },
  emptyText: { fontSize: 14, color: colors.light.text.tertiary, textAlign: 'center' },
  resetFilterButton: { marginTop: spacing.lg, backgroundColor: colors.zomato.red, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full },
  resetFilterText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.light.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.light.border, borderRadius: 2, alignSelf: 'center', marginTop: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.light.borderLight },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.light.text.primary },
  modalCloseButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.light.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  modalBody: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.md },
  modalFooter: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.light.borderLight },
  
  // Filter Sections
  filterSection: { marginBottom: spacing.xl },
  filterSectionTitle: { fontSize: 14, fontWeight: '600', color: colors.light.text.secondary, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  // Sort Options
  sortOptions: { gap: spacing.sm },
  sortOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.light.surfaceSecondary, borderWidth: 1, borderColor: colors.light.borderLight },
  sortOptionActive: { backgroundColor: colors.zomato.red, borderColor: colors.zomato.red },
  sortOptionText: { fontSize: 14, color: colors.light.text.secondary, fontWeight: '500' },
  sortOptionTextActive: { color: '#fff', fontWeight: '600' },
  
  // Payment Options
  paymentOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paymentOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.light.surfaceSecondary, borderWidth: 1, borderColor: colors.light.borderLight },
  paymentOptionActive: { backgroundColor: colors.zomato.red, borderColor: colors.zomato.red },
  paymentOptionText: { fontSize: 13, color: colors.light.text.secondary, fontWeight: '500' },
  paymentOptionTextActive: { color: '#fff', fontWeight: '600' },
  
  // Date Options
  dateOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.light.surfaceSecondary, borderWidth: 1, borderColor: colors.light.borderLight },
  dateOptionActive: { backgroundColor: colors.zomato.red, borderColor: colors.zomato.red },
  dateOptionText: { fontSize: 13, color: colors.light.text.secondary, fontWeight: '500' },
  dateOptionTextActive: { color: '#fff', fontWeight: '600' },
  
  // Amount Inputs
  amountInputs: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  amountInputWrapper: { flex: 1 },
  amountInputLabel: { fontSize: 12, color: colors.light.text.tertiary, marginBottom: spacing.xs },
  amountInput: { backgroundColor: colors.light.surfaceSecondary, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 16, color: colors.light.text.primary, borderWidth: 1, borderColor: colors.light.borderLight },
  amountSeparator: { fontSize: 14, color: colors.light.text.tertiary, marginTop: spacing.lg },
  
  // Buttons
  clearButton: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.light.surfaceSecondary, alignItems: 'center' },
  clearButtonText: { fontSize: 15, fontWeight: '600', color: colors.light.text.secondary },
  applyButton: { flex: 2, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.zomato.red, alignItems: 'center' },
  applyButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
