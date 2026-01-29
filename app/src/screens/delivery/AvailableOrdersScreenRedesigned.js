import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, Alert, TouchableOpacity, Platform, StatusBar
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '../../config/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { OrderCardSkeleton } from '../../components/ui/Skeleton';
import { colors, spacing, radius, typography, shadows } from '../../theme';

// Pulsing New Order Indicator
const NewOrderPulse = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulseContainer}>
      <Animated.View style={[styles.pulseRing, pulseStyle]} />
      <View style={styles.pulseDot} />
    </View>
  );
};

// Order Card Component
const OrderCard = ({ item, index, onClaim, claiming }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={animatedStyle}
    >
      <Card style={styles.orderCard}>
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderIdRow}>
            <NewOrderPulse />
            <View>
              <Text style={styles.orderId}>#{item.orderId}</Text>
              <Text style={styles.orderTime}>
                {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Ionicons name="restaurant" size={12} color={colors.warning.dark} />
            <Text style={styles.statusText}>Preparing</Text>
          </View>
        </View>

        {/* Distance Badge */}
        <View style={styles.distanceBadge}>
          <Ionicons name="navigate" size={14} color={colors.primary[400]} />
          <Text style={styles.distanceText}>2.3 km away</Text>
        </View>

        {/* Customer & Address */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="person" size={16} color={colors.light.text.tertiary} />
            </View>
            <Text style={styles.infoText}>
              {item.customer?.name || item.customer?.phone}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="location" size={16} color={colors.light.text.tertiary} />
            </View>
            <Text style={styles.infoText} numberOfLines={2}>
              {item.deliveryAddress?.address || item.customer?.address || 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="receipt" size={16} color={colors.light.text.tertiary} />
            </View>
            <Text style={styles.infoText}>{item.items?.length || 0} items</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.amount}>₹{item.totalAmount}</Text>
            <View style={[
              styles.paymentBadge,
              item.paymentMethod === 'cod' ? styles.codBadge : styles.prepaidBadge
            ]}>
              <Ionicons 
                name={item.paymentMethod === 'cod' ? 'cash-outline' : 'checkmark-circle'} 
                size={12} 
                color={item.paymentMethod === 'cod' ? colors.warning.dark : colors.success.dark} 
              />
              <Text style={[
                styles.paymentText,
                item.paymentMethod === 'cod' ? styles.codText : styles.prepaidText
              ]}>
                {item.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid'}
              </Text>
            </View>
          </View>
          
          <Button
            title="Claim Order"
            onPress={() => onClaim(item.orderId)}
            loading={claiming === item.orderId}
            size="md"
            icon={<Ionicons name="hand-left" size={18} color="#fff" />}
          />
        </View>
      </Card>
    </Animated.View>
  );
};

export default function AvailableOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(null);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/delivery/orders/available');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchOrders();
  }, []);

  const claimOrder = async (orderId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Claim Order',
      'Do you want to claim this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim',
          onPress: async () => {
            setClaiming(orderId);
            try {
              await api.post(`/delivery/orders/${orderId}/claim`);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Order claimed successfully!');
              fetchOrders();
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to claim order');
            } finally {
              setClaiming(null);
            }
          },
        },
      ]
    );
  };

  const renderOrder = ({ item, index }) => (
    <OrderCard
      item={item}
      index={index}
      onClaim={claimOrder}
      claiming={claiming}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View>
          <Text style={styles.title}>Available Orders</Text>
          <View style={styles.subtitleRow}>
            {orders.length > 0 && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
            <Text style={styles.subtitle}>
              {orders.length} {orders.length === 1 ? 'order' : 'orders'} waiting
            </Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Ionicons name="swap-vertical" size={20} color={colors.primary[400]} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Ionicons name="filter" size={20} color={colors.primary[400]} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Info Banner */}
      {orders.length > 0 && (
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={18} color={colors.info.dark} />
            <Text style={styles.infoBannerText}>
              Claim orders quickly! They may be taken by other partners.
            </Text>
          </View>
        </Animated.View>
      )}

      {loading ? (
        <View style={styles.listContent}>
          <OrderCardSkeleton />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[colors.primary[400]]}
              tintColor={colors.primary[400]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No Available Orders"
              subtitle="New orders will appear here. Pull down to refresh."
              action="Refresh"
              onAction={onRefresh}
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
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error.light,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error.main,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.error.main,
  },
  subtitle: { 
    fontSize: typography.body.medium.fontSize,
    color: colors.light.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.info.light,
    marginHorizontal: spacing.screenHorizontal,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: typography.body.small.fontSize,
    color: colors.info.dark,
  },
  listContent: { 
    padding: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  orderCard: { 
    marginBottom: spacing.cardGap,
    ...shadows.md,
  },
  orderHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pulseContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.warning.main,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.warning.main,
  },
  orderId: { 
    fontSize: typography.headline.small.fontSize,
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  orderTime: {
    fontSize: typography.body.small.fontSize,
    color: colors.light.text.tertiary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warning.light,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.badge,
  },
  statusText: {
    fontSize: typography.label.medium.fontSize,
    fontWeight: '600',
    color: colors.warning.dark,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  distanceText: {
    fontSize: typography.label.medium.fontSize,
    fontWeight: '600',
    color: colors.primary[400],
  },
  infoSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.light.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: typography.body.medium.fontSize,
    color: colors.light.text.secondary,
    lineHeight: 20,
    paddingTop: 4,
  },
  orderFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderLight,
  },
  amount: { 
    fontSize: typography.headline.medium.fontSize,
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  codBadge: {
    backgroundColor: colors.warning.light,
  },
  prepaidBadge: {
    backgroundColor: colors.success.light,
  },
  paymentText: {
    fontSize: typography.label.small.fontSize,
    fontWeight: '600',
  },
  codText: {
    color: colors.warning.dark,
  },
  prepaidText: {
    color: colors.success.dark,
  },
});
