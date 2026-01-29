import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, TouchableOpacity, SectionList, Platform, StatusBar, Modal, AppState
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '../../config/api';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { OrderCardSkeleton } from '../../components/ui/Skeleton';
import { colors, spacing, radius, typography, shadows } from '../../theme';

const POLL_INTERVAL = 5000; // 5 seconds for real-time updates

// Filter options
const FILTER_OPTIONS = [
  { key: 'week', label: 'This Week' },
  { key: 'today', label: 'Today' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

// Get filter label for display
const getFilterLabel = (filter) => {
  const option = FILTER_OPTIONS.find(o => o.key === filter);
  return option ? option.label : 'This Week';
};

// Summary Card Component
const SummaryCard = ({ stats, filterLabel }) => {
  return (
    <Animated.View entering={FadeInDown.delay(100).duration(500)}>
      <LinearGradient
        colors={[colors.primary[400], colors.primary[600]]}
        style={styles.summaryCard}
      >
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>{filterLabel}</Text>
          {stats.delivered > 0 && (
            <View style={styles.summaryBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success.main} />
              <Text style={styles.summaryBadgeText}>{stats.delivered} done</Text>
            </View>
          )}
        </View>
        
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>₹{stats.earnings.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Total Earned</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{stats.delivered}</Text>
            <Text style={styles.summaryLabel}>Delivered</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{stats.cancelled}</Text>
            <Text style={styles.summaryLabel}>Cancelled</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Order Item Component
const OrderItem = ({ item, index, onPress }) => (
  <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
    <Card style={styles.orderCard} onPress={onPress}>
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <View style={styles.checkIcon}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
          <Text style={styles.orderId}>#{item.orderId}</Text>
        </View>
        <Text style={styles.orderAmount}>₹{item.totalAmount}</Text>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.orderDetail}>
          <Ionicons name="person-outline" size={14} color={colors.light.text.tertiary} />
          <Text style={styles.orderDetailText}>
            {item.customer?.name || item.customer?.phone}
          </Text>
        </View>
        <View style={styles.orderDetail}>
          <Ionicons name="location-outline" size={14} color={colors.light.text.tertiary} />
          <Text style={styles.orderDetailText} numberOfLines={1}>
            {item.deliveryAddress?.address || item.customer?.address || 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.orderTime}>
          <Ionicons name="time-outline" size={14} color={colors.light.text.tertiary} />
          <Text style={styles.orderTimeText}>
            {item.deliveredAt
              ? new Date(item.deliveredAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'N/A'}
          </Text>
        </View>
        <View style={styles.itemsCount}>
          <Text style={styles.itemsCountText}>{item.items?.length || 0} items</Text>
        </View>
      </View>
    </Card>
  </Animated.View>
);

// Section Header Component
const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionDot} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

export default function DeliveryHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('week'); // 'today', 'week', 'month', 'all'
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [stats, setStats] = useState({ delivered: 0, cancelled: 0, earnings: 0 });
  const pollIntervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  const fetchHistory = async (selectedFilter = filter, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get(`/delivery/orders/history/filtered?filter=${selectedFilter}`);
      const { orders: fetchedOrders, stats: fetchedStats } = response.data;
      
      setOrders(fetchedOrders);
      setStats(fetchedStats);
      
      // Group orders by date
      const grouped = fetchedOrders.reduce((acc, order) => {
        const date = new Date(order.deliveredAt || order.statusUpdatedAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        let dateKey;
        if (date.toDateString() === today.toDateString()) {
          dateKey = 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
          dateKey = 'Yesterday';
        } else {
          dateKey = date.toLocaleDateString('en-IN', { 
            day: 'numeric', 
            month: 'short',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
          });
        }
        
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(order);
        return acc;
      }, {});

      const sectionData = Object.entries(grouped).map(([title, data]) => ({
        title,
        data,
      }));
      
      setSections(sectionData);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  // Start polling for real-time updates
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(() => {
      fetchHistory(filter, false); // Silent refresh
    }, POLL_INTERVAL);
  }, [filter]);

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
        fetchHistory(filter, false);
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
  }, [startPolling, stopPolling, filter]);

  useEffect(() => {
    fetchHistory();
    startPolling();
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchHistory(filter, false);
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
  }, [navigation, startPolling, stopPolling]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchHistory();
  }, [filter]);

  const handleFilterChange = (newFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(newFilter);
    setShowFilterModal(false);
    stopPolling(); // Stop current polling
    fetchHistory(newFilter, true); // Fetch with new filter
    // Polling will restart automatically via useEffect when filter changes
  };

  const handleOrderPress = (order) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('DeliveryOrderDetail', { order });
  };

  // Filter Modal
  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModal}>
          <Text style={styles.filterModalTitle}>Select Period</Text>
          {FILTER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterOption,
                filter === option.key && styles.filterOptionActive
              ]}
              onPress={() => handleFilterChange(option.key)}
            >
              <Text style={[
                styles.filterOptionText,
                filter === option.key && styles.filterOptionTextActive
              ]}>
                {option.label}
              </Text>
              {filter === option.key && (
                <Ionicons name="checkmark" size={20} color={colors.primary[400]} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View>
          <Text style={styles.title}>Delivery History</Text>
          <Text style={styles.subtitle}>{stats.delivered} deliveries completed</Text>
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilterModal(true);
          }}
        >
          <Ionicons name="filter" size={20} color={colors.primary[400]} />
        </TouchableOpacity>
      </Animated.View>

      <FilterModal />

      {loading ? (
        <View style={styles.listContent}>
          <View style={styles.skeletonSummary} />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <OrderItem 
              item={item} 
              index={index} 
              onPress={() => handleOrderPress(item)}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <SectionHeader title={title} />
          )}
          ListHeaderComponent={<SummaryCard stats={stats} filterLabel={getFilterLabel(filter)} />}
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title="No Delivery History"
              subtitle={`No deliveries found for ${getFilterLabel(filter).toLowerCase()}`}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[colors.primary[400]]}
              tintColor={colors.primary[400]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.light.background 
  },
  header: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.screenHorizontal, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.borderLight,
  },
  title: { 
    fontSize: typography.display.small.fontSize,
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  subtitle: { 
    fontSize: typography.body.medium.fontSize,
    color: colors.light.text.secondary,
    marginTop: 2,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { 
    padding: spacing.screenHorizontal,
    paddingBottom: 100,
  },
  summaryCard: {
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: typography.title.large.fontSize,
    fontWeight: '600',
    color: '#fff',
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  summaryBadgeText: {
    fontSize: typography.label.small.fontSize,
    fontWeight: '600',
    color: '#fff',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.headline.medium.fontSize,
    fontWeight: '700',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: typography.label.small.fontSize,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressSection: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.label.medium.fontSize,
    color: 'rgba(255,255,255,0.8)',
  },
  progressValue: {
    fontSize: typography.label.medium.fontSize,
    fontWeight: '600',
    color: '#fff',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[400],
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.title.medium.fontSize,
    fontWeight: '600',
    color: colors.light.text.secondary,
  },
  orderCard: { 
    marginBottom: spacing.cardGap,
  },
  orderHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderId: { 
    fontSize: typography.title.large.fontSize,
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  orderAmount: {
    fontSize: typography.headline.small.fontSize,
    fontWeight: '700',
    color: colors.primary[400],
  },
  orderDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  orderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderDetailText: {
    flex: 1,
    fontSize: typography.body.medium.fontSize,
    color: colors.light.text.secondary,
  },
  orderFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderLight,
  },
  orderTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  orderTimeText: {
    fontSize: typography.body.small.fontSize,
    color: colors.light.text.tertiary,
  },
  itemsCount: {
    backgroundColor: colors.light.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  itemsCountText: {
    fontSize: typography.label.small.fontSize,
    color: colors.light.text.secondary,
  },
  skeletonSummary: {
    height: 180,
    backgroundColor: colors.light.border,
    borderRadius: radius.card,
    marginBottom: spacing.lg,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 300,
  },
  filterModalTitle: {
    fontSize: typography.title.large.fontSize,
    fontWeight: '600',
    color: colors.light.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  filterOptionActive: {
    backgroundColor: colors.primary[50],
  },
  filterOptionText: {
    fontSize: typography.body.large.fontSize,
    color: colors.light.text.primary,
  },
  filterOptionTextActive: {
    color: colors.primary[400],
    fontWeight: '600',
  },
});
