import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, StatusBar, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useDeliveryNotifications } from '../../context/DeliveryNotificationContext';
import { colors, spacing, radius, shadows } from '../../theme';

const DELIVERY_GREEN = '#267E3E';

export default function DeliveryNotificationsScreen({ navigation }) {
  const { notifications, markAllAsRead, markAsRead, clearAll, checkForUpdates } = useDeliveryNotifications();

  // Refresh notifications and mark all as read when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Check for updates to refresh notification data with latest order status
      checkForUpdates();
      markAllAsRead();
    }, [checkForUpdates, markAllAsRead])
  );

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handleNotificationPress = (notification) => {
    markAsRead(notification.id);
    if (notification.orderId) {
      navigation.navigate('MyOrders', {
        screen: 'DeliveryOrderDetail',
        params: { orderId: notification.orderId }
      });
    }
  };

  const getNotificationGradient = (isRead) => {
    if (!isRead) {
      return ['#F0FFF4', '#FFFFFF'];
    }
    return ['#FFFFFF', '#FAFAFA'];
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadItem]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={getNotificationGradient(item.read)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.notificationGradient}
      >
        {!item.read && <View style={styles.unreadIndicator} />}
        
        <View style={styles.notificationContent}>
          <View style={[styles.iconContainer, { backgroundColor: `${item.color}18` }]}>
            <Ionicons name={item.icon} size={22} color={item.color} />
          </View>
          
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, !item.read && styles.unreadTitle]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
            </View>
            <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
            {item.address && (
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={12} color={DELIVERY_GREEN} />
                <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={18} color={colors.light.text.tertiary} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <LinearGradient
          colors={['#E8F5E9', '#C8E6C9']}
          style={styles.emptyIconContainer}
        >
          <Ionicons name="notifications-outline" size={48} color={DELIVERY_GREEN} />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>All Caught Up!</Text>
      <Text style={styles.emptyMessage}>No new notifications right now.{'\n'}New order assignments will appear here.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.light.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification Count Badge */}
      {notifications.length > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {notifications.filter(n => !n.read).length} unread
          </Text>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyListContent
        ]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.text.primary,
    marginLeft: spacing.md,
    letterSpacing: -0.3,
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: DELIVERY_GREEN,
  },
  countBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.light.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  separator: {
    height: 10,
  },
  notificationItem: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  unreadItem: {
    elevation: 4,
    shadowOpacity: 0.1,
  },
  notificationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingVertical: 14,
    position: 'relative',
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    backgroundColor: DELIVERY_GREEN,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text.secondary,
    marginRight: spacing.sm,
  },
  unreadTitle: {
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  message: {
    fontSize: 13,
    color: colors.light.text.secondary,
    lineHeight: 18,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  address: {
    fontSize: 11,
    color: DELIVERY_GREEN,
    marginLeft: 4,
    fontWeight: '500',
  },
  time: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.light.text.tertiary,
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrapper: {
    marginBottom: spacing.lg,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.light.text.primary,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.light.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
