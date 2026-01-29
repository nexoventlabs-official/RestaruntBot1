import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, Image, Switch, Pressable, Platform, StatusBar
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
  FadeInRight,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';
import { Card } from '../../components/ui/Card';
import { StatsCardSkeleton } from '../../components/ui/Skeleton';
import { colors, spacing, radius, typography, shadows } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Animated Counter Component
const AnimatedCounter = ({ value, prefix = '', suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = parseInt(value) || 0;
    const duration = 1000;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <Text style={styles.statValue}>{prefix}{displayValue}{suffix}</Text>;
};

// Pulsing Online Indicator
const PulsingDot = ({ active }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1
      );
    } else {
      scale.value = 1;
      opacity.value = 1;
    }
  }, [active]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.dotContainer}>
      {active && (
        <Animated.View style={[styles.pulseRing, pulseStyle]} />
      )}
      <View style={[styles.dot, { backgroundColor: active ? '#22c55e' : '#9ca3af' }]} />
    </View>
  );
};

// Stat Card Component
const StatCard = ({ icon, title, value, color, prefix = '', suffix = '', delay = 0 }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Animated.View entering={FadeInRight.delay(delay).duration(500)}>
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.statCard, animatedStyle]}
      >
        <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
        <Text style={styles.statTitle}>{title}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
};

export default function DeliveryHomeScreen({ navigation }) {
  const { user, logout, setUser, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);

  const fetchStats = async () => {
    try {
      const response = await api.get('/delivery/orders/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    refreshUser(); // Refresh user data including rating
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchStats();
      refreshUser(); // Refresh user data when screen comes into focus
    });
    
    return unsubscribe;
  }, [navigation, refreshUser]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchStats();
    refreshUser(); // Refresh user data on pull to refresh
  }, [refreshUser]);

  const toggleOnlineStatus = async (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOnline(value);
    try {
      await api.post('/delivery/status', { isOnline: value });
      setUser({ ...user, isOnline: value });
      Haptics.notificationAsync(
        value ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      );
    } catch (error) {
      setIsOnline(!value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Error updating status:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500)}>
        <LinearGradient
          colors={[colors.primary[400], colors.primary[500]]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.profileSection}>
              {user?.photo ? (
                <Image source={{ uri: user.photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={24} color={colors.primary[400]} />
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.name}>{user?.name || 'Partner'}</Text>
              </View>
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <Ionicons name="notifications-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  logout();
                }}
              >
                <Ionicons name="log-out-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary[400]]}
            tintColor={colors.primary[400]}
          />
        }
      >
        {/* Online Toggle Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Card style={styles.onlineCard}>
            <View style={styles.onlineContent}>
              <View style={styles.onlineLeft}>
                <PulsingDot active={isOnline} />
                <View style={styles.onlineTextContainer}>
                  <Text style={styles.onlineStatus}>
                    {isOnline ? "You're Online" : "You're Offline"}
                  </Text>
                  <Text style={styles.onlineSubtext}>
                    {isOnline ? 'Ready to receive orders' : 'Go online to start earning'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isOnline}
                onValueChange={toggleOnlineStatus}
                trackColor={{ false: '#E5E7EB', true: colors.primary[200] }}
                thumbColor={isOnline ? colors.primary[400] : '#9CA3AF'}
                ios_backgroundColor="#E5E7EB"
              />
            </View>
          </Card>
        </Animated.View>

        {/* Today's Stats */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
        </Animated.View>
        
        {loading ? (
          <View style={styles.statsGrid}>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard 
              icon="checkmark-circle" 
              title="Delivered" 
              value={stats?.todayDelivered || 0}
              color="#22c55e"
              delay={400}
            />
            <StatCard 
              icon="bicycle" 
              title="Active" 
              value={stats?.activeOrders || 0}
              color="#f59e0b"
              delay={500}
            />
          </View>
        )}

        {/* Overall Stats */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <Text style={styles.sectionTitle}>Overall Stats</Text>
        </Animated.View>
        
        {loading ? (
          <View style={styles.statsGrid}>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard 
              icon="trophy" 
              title="Total Deliveries" 
              value={stats?.totalDelivered || 0}
              color="#8b5cf6"
              delay={700}
            />
            <StatCard 
              icon="star" 
              title="Rating" 
              value={user?.avgRating?.toFixed(1) || '0.0'}
              color="#f59e0b"
              delay={800}
            />
          </View>
        )}

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(900).duration(500)}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <Card 
            style={styles.actionCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('MyOrders');
            }}
          >
            <View style={styles.actionContent}>
              <View style={[styles.actionIcon, { backgroundColor: colors.primary[50] }]}>
                <Ionicons name="bicycle" size={24} color={colors.primary[400]} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>My Active Orders</Text>
                <Text style={styles.actionSubtitle}>
                  {stats?.activeOrders || 0} orders in progress
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.light.text.tertiary} />
            </View>
          </Card>

          <Card 
            style={styles.actionCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('History');
            }}
          >
            <View style={styles.actionContent}>
              <View style={[styles.actionIcon, { backgroundColor: colors.success.light }]}>
                <Ionicons name="time" size={24} color={colors.success.main} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Delivery History</Text>
                <Text style={styles.actionSubtitle}>View past deliveries</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.light.text.tertiary} />
            </View>
          </Card>
        </Animated.View>

        {/* Tips Card */}
        <Animated.View entering={FadeInDown.delay(1000).duration(500)}>
          <LinearGradient
            colors={[colors.warning.light, '#FEF9E7']}
            style={styles.tipsCard}
          >
            <View style={styles.tipsIcon}>
              <Ionicons name="bulb" size={24} color={colors.warning.dark} />
            </View>
            <View style={styles.tipsContent}>
              <Text style={styles.tipsTitle}>Pro Tips</Text>
              <Text style={styles.tipsText}>• Stay online during peak hours (12-2 PM, 7-10 PM)</Text>
              <Text style={styles.tipsText}>• Maintain high ratings for priority orders</Text>
              <Text style={styles.tipsText}>• Tap address to navigate via Google Maps</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screenHorizontal,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSection: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  avatar: { 
    width: 52, 
    height: 52, 
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: { 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  profileInfo: { 
    marginLeft: spacing.md 
  },
  greeting: { 
    fontSize: typography.body.small.fontSize,
    color: 'rgba(255,255,255,0.8)',
  },
  name: { 
    fontSize: typography.headline.small.fontSize,
    fontWeight: '700',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: { 
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { 
    flex: 1, 
    padding: spacing.screenHorizontal,
    marginTop: -spacing.lg,
  },
  onlineCard: {
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  onlineContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  onlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotContainer: {
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
    backgroundColor: '#22c55e',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  onlineTextContainer: {
    marginLeft: spacing.md,
  },
  onlineStatus: {
    fontSize: typography.title.large.fontSize,
    fontWeight: '600',
    color: colors.light.text.primary,
  },
  onlineSubtext: {
    fontSize: typography.body.small.fontSize,
    color: colors.light.text.secondary,
    marginTop: 2,
  },
  sectionTitle: { 
    fontSize: typography.headline.small.fontSize,
    fontWeight: '600',
    color: colors.light.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  statsGrid: { 
    flexDirection: 'row', 
    gap: spacing.cardGap,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    ...shadows.md,
  },
  statIconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: spacing.md,
  },
  statValue: { 
    fontSize: 28,
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  statTitle: { 
    fontSize: typography.body.medium.fontSize,
    color: colors.light.text.secondary,
    marginTop: spacing.xs,
  },
  actionCard: {
    marginBottom: spacing.cardGap,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  actionTitle: {
    fontSize: typography.title.large.fontSize,
    fontWeight: '600',
    color: colors.light.text.primary,
  },
  actionSubtitle: {
    fontSize: typography.body.small.fontSize,
    color: colors.light.text.secondary,
    marginTop: 2,
  },
  tipsCard: {
    flexDirection: 'row',
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginTop: spacing.lg,
  },
  tipsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsContent: { 
    flex: 1, 
    marginLeft: spacing.md,
  },
  tipsTitle: { 
    fontSize: typography.title.large.fontSize,
    fontWeight: '600',
    color: colors.warning.dark,
    marginBottom: spacing.sm,
  },
  tipsText: { 
    fontSize: typography.body.small.fontSize,
    color: colors.warning.dark,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
