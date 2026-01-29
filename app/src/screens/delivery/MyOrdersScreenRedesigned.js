import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, TouchableOpacity, Alert, Linking,
  Modal, Image, Pressable, Platform, StatusBar
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '../../config/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { OrderCardSkeleton } from '../../components/ui/Skeleton';
import { colors, spacing, radius, typography, shadows } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Progress Steps Component
const ProgressSteps = ({ status }) => {
  const steps = ['preparing', 'ready', 'out_for_delivery', 'delivered'];
  const currentIndex = steps.indexOf(status);
  
  return (
    <View style={styles.progressContainer}>
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <View style={[
            styles.progressDot,
            index <= currentIndex && styles.progressDotActive
          ]}>
            {index < currentIndex && (
              <Ionicons name="checkmark" size={12} color="#fff" />
            )}
          </View>
          {index < steps.length - 1 && (
            <View style={[
              styles.progressLine,
              index < currentIndex && styles.progressLineActive
            ]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

// Order Card Component
const OrderCard = ({ item, index, onNavigate, onAction, actionLoading }) => {
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
        {/* Progress Bar */}
        <ProgressSteps status={item.status} />
        
        {/* Header */}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>#{item.orderId}</Text>
            <Text style={styles.orderTime}>
              {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          <StatusBadge status={item.status} showPulse={item.status === 'out_for_delivery'} />
        </View>

        {/* Customer Info */}
        <View style={styles.customerCard}>
          <View style={styles.customerAvatar}>
            <Ionicons name="person" size={20} color={colors.primary[400]} />
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.customer?.name || 'Customer'}</Text>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL(`tel:${item.customer?.phone}`);
              }}
              style={styles.phoneButton}
            >
              <Ionicons name="call" size={14} color={colors.primary[400]} />
              <Text style={styles.phoneText}>{item.customer?.phone}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Linking.openURL(`tel:${item.customer?.phone}`);
            }}
          >
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Address */}
        <TouchableOpacity 
          style={styles.addressCard}
          onPress={() => onNavigate(item)}
          activeOpacity={0.7}
        >
          <View style={styles.addressIcon}>
            <Ionicons name="location" size={20} color={colors.primary[400]} />
          </View>
          <Text style={styles.addressText} numberOfLines={2}>
            {item.deliveryAddress?.address || item.customer?.address || 'N/A'}
          </Text>
          <View style={styles.navigateIcon}>
            <Ionicons name="navigate" size={18} color={colors.primary[400]} />
          </View>
        </TouchableOpacity>

        {/* Items Preview */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Ionicons name="receipt-outline" size={16} color={colors.light.text.secondary} />
            <Text style={styles.itemsTitle}>{item.items?.length || 0} items</Text>
          </View>
          <View style={styles.itemsList}>
            {item.items?.slice(0, 2).map((orderItem, idx) => (
              <Text key={idx} style={styles.itemText}>
                {orderItem.name} × {orderItem.quantity}
              </Text>
            ))}
            {item.items?.length > 2 && (
              <Text style={styles.moreItems}>+{item.items.length - 2} more</Text>
            )}
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
                {item.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}
              </Text>
            </View>
          </View>
          
          <Button
            title={
              item.status === 'preparing' ? 'Mark Ready' :
              item.status === 'ready' ? 'Start Delivery' : 'Delivered'
            }
            onPress={() => onAction(item)}
            loading={actionLoading === item.orderId}
            variant={item.status === 'out_for_delivery' ? 'success' : 'primary'}
            size="md"
            icon={
              <Ionicons 
                name={
                  item.status === 'preparing' ? 'checkmark-done' :
                  item.status === 'ready' ? 'bicycle' : 'checkmark-circle'
                } 
                size={18} 
                color="#fff" 
              />
            }
          />
        </View>
      </Card>
    </Animated.View>
  );
};

export default function MyOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [qrModal, setQrModal] = useState({ visible: false, qrUrl: null, orderId: null, amount: 0 });

  const fetchOrders = async () => {
    try {
      const response = await api.get('/delivery/orders/my');
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
    const unsubscribe = navigation.addListener('focus', fetchOrders);
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchOrders();
  }, []);

  const openMapNavigation = (order) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const handleAction = async (order) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (order.status === 'preparing') {
      await markReady(order.orderId);
    } else if (order.status === 'ready') {
      await startDelivery(order.orderId);
    } else {
      await markDelivered(order);
    }
  };

  const markReady = async (orderId) => {
    setActionLoading(orderId);
    try {
      await api.post(`/delivery/orders/${orderId}/mark-ready`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchOrders();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to mark order as ready');
    } finally {
      setActionLoading(null);
    }
  };

  const startDelivery = async (orderId) => {
    setActionLoading(orderId);
    try {
      await api.post(`/delivery/orders/${orderId}/out-for-delivery`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchOrders();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update order');
    } finally {
      setActionLoading(null);
    }
  };

  const markDelivered = async (order) => {
    if (order.paymentMethod === 'cod') {
      Alert.alert(
        'Collect Payment',
        `Amount: ₹${order.totalAmount}\n\nHow was payment collected?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Cash', onPress: () => completeDelivery(order.orderId, 'cash') },
          { text: 'UPI (QR)', onPress: () => generateQRCode(order) },
        ]
      );
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
      setQrModal({
        visible: true,
        qrUrl: response.data.qrUrl,
        orderId: response.data.orderId,
        amount: response.data.amount,
      });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to generate QR code');
    } finally {
      setActionLoading(null);
    }
  };

  const completeDelivery = async (orderId, collectionMethod) => {
    setActionLoading(orderId);
    try {
      await api.post(`/delivery/orders/${orderId}/delivered`, { collectionMethod });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Order delivered successfully!');
      fetchOrders();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to complete delivery');
    } finally {
      setActionLoading(null);
    }
  };

  const renderOrder = ({ item, index }) => (
    <OrderCard
      item={item}
      index={index}
      onNavigate={openMapNavigation}
      onAction={handleAction}
      actionLoading={actionLoading}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View>
          <Text style={styles.title}>My Orders</Text>
          <Text style={styles.subtitle}>{orders.length} active deliveries</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="bicycle" size={20} color={colors.primary[400]} />
        </View>
      </Animated.View>

      {loading ? (
        <View style={styles.listContent}>
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
              icon="bicycle-outline"
              title="No Active Orders"
              subtitle="Orders assigned to you will appear here"
            />
          }
        />
      )}

      {/* QR Modal */}
      <Modal
        visible={qrModal.visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setQrModal({ visible: false, qrUrl: null, orderId: null, amount: 0 })}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={SlideInUp.duration(400)}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Collect Payment</Text>
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setQrModal({ visible: false, qrUrl: null, orderId: null, amount: 0 });
                }}
              >
                <Ionicons name="close-circle" size={32} color={colors.light.text.tertiary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalOrderId}>Order #{qrModal.orderId}</Text>
            <Text style={styles.modalAmount}>₹{qrModal.amount}</Text>

            <View style={styles.qrContainer}>
              {qrModal.qrUrl && (
                <Image source={{ uri: qrModal.qrUrl }} style={styles.qrImage} resizeMode="contain" />
              )}
              <Text style={styles.scanText}>Ask customer to scan & pay</Text>
            </View>

            <Button
              title="Payment Received - Mark Delivered"
              onPress={() => {
                setQrModal({ visible: false, qrUrl: null, orderId: null, amount: 0 });
                completeDelivery(qrModal.orderId, 'upi');
              }}
              variant="success"
              size="lg"
              icon={<Ionicons name="checkmark-circle" size={20} color="#fff" />}
              style={styles.modalButton}
            />
          </Animated.View>
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
  headerBadge: {
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
  orderCard: { 
    marginBottom: spacing.cardGap,
    ...shadows.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  progressDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    backgroundColor: colors.primary[400],
  },
  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: colors.light.border,
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: colors.primary[400],
  },
  orderHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: spacing.md,
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
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  customerName: {
    fontSize: typography.title.medium.fontSize,
    fontWeight: '600',
    color: colors.light.text.primary,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  phoneText: {
    fontSize: typography.body.small.fontSize,
    color: colors.primary[400],
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[400],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressText: {
    flex: 1,
    fontSize: typography.body.medium.fontSize,
    color: colors.primary[600],
    marginHorizontal: spacing.md,
    lineHeight: 20,
  },
  navigateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsSection: {
    backgroundColor: colors.light.borderLight,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  itemsTitle: {
    fontSize: typography.title.small.fontSize,
    fontWeight: '600',
    color: colors.light.text.secondary,
  },
  itemsList: {
    gap: 4,
  },
  itemText: {
    fontSize: typography.body.small.fontSize,
    color: colors.light.text.primary,
  },
  moreItems: {
    fontSize: typography.body.small.fontSize,
    color: colors.light.text.tertiary,
    fontStyle: 'italic',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.light.surface,
    borderTopLeftRadius: radius.bottomSheet,
    borderTopRightRadius: radius.bottomSheet,
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.headline.large.fontSize,
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  modalOrderId: {
    fontSize: typography.body.medium.fontSize,
    color: colors.light.text.secondary,
    textAlign: 'center',
  },
  modalAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.primary[400],
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: colors.light.borderLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  qrImage: {
    width: 200,
    height: 200,
    marginBottom: spacing.md,
  },
  scanText: {
    fontSize: typography.body.medium.fontSize,
    color: colors.light.text.secondary,
  },
  modalButton: {
    width: '100%',
  },
});
