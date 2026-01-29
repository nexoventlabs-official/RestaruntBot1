import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, TouchableOpacity, Alert, ActivityIndicator, Animated, Platform, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { colors, spacing, radius, typography, shadows } from '../../theme';

const DELIVERY_GREEN = '#267E3E';
const DELIVERY_DARK_GREEN = '#1B5E2E';

export default function AvailableOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/delivery/orders/available');
      setOrders(response.data);
    } catch (error) { console.error('Error fetching orders:', error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchOrders(); }, []);

  const claimOrder = async (orderId) => {
    Alert.alert('Claim Order', 'Do you want to claim this order? It will be marked as Ready.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Claim', onPress: async () => {
          setClaiming(orderId);
          try {
            await api.post(`/delivery/orders/${orderId}/claim`);
            Alert.alert('Success', 'Order claimed successfully!');
            fetchOrders();
          } catch (error) { Alert.alert('Error', error.response?.data?.error || 'Failed to claim order'); }
          finally { setClaiming(null); }
        }
      },
    ]);
  };

  const renderOrder = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderId}>#{item.orderId}</Text>
            <View style={styles.statusBadge}>
              <Ionicons name="restaurant-outline" size={12} color="#8B5CF6" />
              <Text style={styles.statusText}>Preparing</Text>
            </View>
          </View>
          <Text style={styles.orderTime}>
            {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={styles.customerSection}>
          <View style={styles.customerAvatar}>
            <Ionicons name="person" size={18} color={DELIVERY_GREEN} />
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.customer?.name || item.customer?.phone}</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color={colors.light.text.tertiary} />
              <Text style={styles.addressText} numberOfLines={2}>{item.deliveryAddress?.address || item.customer?.address || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Ionicons name="cart-outline" size={16} color={colors.light.text.secondary} />
            <Text style={styles.itemsCount}>{item.items?.length || 0} items</Text>
          </View>
          <View style={styles.itemsList}>
            {item.items?.slice(0, 2).map((orderItem, idx) => (
              <Text key={idx} style={styles.itemText}>• {orderItem.name} × {orderItem.quantity}</Text>
            ))}
            {item.items?.length > 2 && <Text style={styles.moreItems}>+{item.items.length - 2} more items</Text>}
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.amountSection}>
            <Text style={styles.amount}>₹{item.totalAmount}</Text>
            <View style={[styles.paymentBadge, item.paymentMethod === 'cod' ? styles.codBadge : styles.prepaidBadge]}>
              <Ionicons name={item.paymentMethod === 'cod' ? 'cash-outline' : 'checkmark-circle'} size={12} color={item.paymentMethod === 'cod' ? '#D97706' : '#16A34A'} />
              <Text style={[styles.paymentText, item.paymentMethod === 'cod' ? styles.codText : styles.prepaidText]}>
                {item.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.claimButton, claiming === item.orderId && styles.claimButtonDisabled]}
            onPress={() => claimOrder(item.orderId)}
            disabled={claiming === item.orderId}
            activeOpacity={0.8}
          >
            <LinearGradient colors={claiming === item.orderId ? ['#9CA3AF', '#9CA3AF'] : [DELIVERY_GREEN, DELIVERY_DARK_GREEN]} style={styles.claimButtonGradient}>
              {claiming === item.orderId ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="hand-left-outline" size={18} color="#fff" />
                  <Text style={styles.claimButtonText}>Claim Order</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient colors={[DELIVERY_GREEN, DELIVERY_DARK_GREEN]} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Available Orders</Text>
            <Text style={styles.subtitle}>{orders.length} orders waiting</Text>
          </View>
          <View style={styles.refreshBadge}>
            <Ionicons name="refresh" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.refreshText}>Auto-refresh</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color={DELIVERY_GREEN} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[DELIVERY_GREEN]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="receipt-outline" size={48} color={colors.light.text.tertiary} />
              </View>
              <Text style={styles.emptyTitle}>No available orders</Text>
              <Text style={styles.emptyText}>Pull down to refresh</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  header: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60, paddingBottom: spacing.lg, paddingHorizontal: spacing.screenHorizontal, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: typography.display.small.fontSize, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: typography.body.medium.fontSize, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  refreshBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full },
  refreshText: { fontSize: typography.label.small.fontSize, color: 'rgba(255,255,255,0.8)' },
  listContent: { padding: spacing.screenHorizontal, paddingBottom: 100 },
  orderCard: { backgroundColor: colors.light.surface, borderRadius: radius.xl, padding: spacing.base, marginBottom: spacing.md, ...shadows.card },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  orderIdContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orderId: { fontSize: typography.headline.small.fontSize, fontWeight: '700', color: colors.light.text.primary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EDE9FE', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: typography.label.small.fontSize, fontWeight: '600', color: '#8B5CF6' },
  orderTime: { fontSize: typography.body.small.fontSize, color: colors.light.text.tertiary },
  customerSection: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.light.borderLight },
  customerAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  customerInfo: { flex: 1, marginLeft: spacing.md },
  customerName: { fontSize: typography.title.medium.fontSize, fontWeight: '600', color: colors.light.text.primary },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: spacing.xs },
  addressText: { fontSize: typography.body.small.fontSize, color: colors.light.text.secondary, flex: 1, lineHeight: 18 },
  itemsSection: { backgroundColor: colors.light.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  itemsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  itemsCount: { fontSize: typography.title.small.fontSize, fontWeight: '600', color: colors.light.text.secondary },
  itemsList: { gap: 4 },
  itemText: { fontSize: typography.body.small.fontSize, color: colors.light.text.primary },
  moreItems: { fontSize: typography.body.small.fontSize, color: colors.light.text.tertiary, fontStyle: 'italic' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.light.borderLight },
  amountSection: { gap: spacing.xs },
  amount: { fontSize: typography.headline.medium.fontSize, fontWeight: '700', color: colors.light.text.primary },
  paymentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  codBadge: { backgroundColor: '#FEF3C7' },
  prepaidBadge: { backgroundColor: '#DCFCE7' },
  paymentText: { fontSize: typography.label.small.fontSize, fontWeight: '600' },
  codText: { color: '#D97706' },
  prepaidText: { color: '#16A34A' },
  claimButton: { borderRadius: radius.lg, overflow: 'hidden', ...shadows.sm },
  claimButtonDisabled: { opacity: 0.7 },
  claimButtonGradient: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  claimButtonText: { color: '#fff', fontSize: typography.title.medium.fontSize, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.light.surfaceSecondary, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.base },
  emptyTitle: { fontSize: typography.headline.small.fontSize, fontWeight: '600', color: colors.light.text.secondary },
  emptyText: { fontSize: typography.body.medium.fontSize, color: colors.light.text.tertiary, marginTop: spacing.xs },
});
