import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, Image, Switch, Animated, Platform, StatusBar, ImageBackground, AppState
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useDeliveryNotifications } from '../../context/DeliveryNotificationContext';
import api from '../../config/api';
import { ActionCard, InfoCard } from '../../components/ui/Card';
import { StatsCardSkeleton } from '../../components/ui/Skeleton';
import { colors, spacing, radius, typography, shadows } from '../../theme';

const DELIVERY_GREEN = '#267E3E';
const DELIVERY_DARK_GREEN = '#1B5E2E';
const POLL_INTERVAL = 10000; // 10 seconds for stats refresh

// Background image
const DELIVERY_HOME_BG = require('../../../assets/backgrounds/deliveryhome.jpg');

export default function DeliveryHomeScreen({ navigation }) {
  const { user, logout, setUser, refreshUser } = useAuth();
  const { unreadCount, checkForUpdates, newOrdersCount } = useDeliveryNotifications();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pollIntervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isOnline]);

  const fetchStats = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/delivery/orders/stats');
      setStats(response.data);
    } catch (error) { console.error('Error fetching stats:', error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  // Start polling for real-time stats updates
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(() => {
      fetchStats(false);
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
        fetchStats(false);
        startPolling();
      } else if (nextAppState.match(/inactive|background/)) {
        stopPolling();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [startPolling, stopPolling]);

  useEffect(() => { 
    fetchStats(true);
    refreshUser(); // Refresh user data including rating
    startPolling();
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchStats(false);
      refreshUser(); // Refresh user data when screen comes into focus
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
  }, [navigation, startPolling, stopPolling, refreshUser]);
  
  const onRefresh = useCallback(() => { setRefreshing(true); fetchStats(false); checkForUpdates(); refreshUser(); }, [checkForUpdates, refreshUser]);

  const toggleOnlineStatus = async (value) => {
    setIsOnline(value);
    try {
      await api.post('/delivery/status', { isOnline: value });
      setUser({ ...user, isOnline: value });
    } catch (error) { setIsOnline(!value); console.error('Error updating status:', error); }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Premium Header with Background Image */}
      <Animated.View style={[styles.headerWrapper, { opacity: fadeAnim }]}>
        <ImageBackground
          source={DELIVERY_HOME_BG}
          style={styles.header}
          imageStyle={styles.headerBackgroundImage}
        >
          <View style={styles.headerOverlay}>
            <View style={styles.headerContent}>
              <TouchableOpacity 
                style={styles.profileSection}
                onPress={() => navigation.navigate('Profile', { screen: 'ProfileMain' })}
                activeOpacity={0.7}
              >
                {user?.photo ? (
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: user.photo }} style={styles.avatar} />
                    <View style={[styles.onlineIndicatorSmall, { backgroundColor: isOnline ? '#22C55E' : '#9CA3AF' }]} />
                  </View>
                ) : (
                  <View style={styles.avatarContainer}>
                    <LinearGradient colors={['#fff', '#f8f8f8']} style={styles.avatarGradient}>
                      <Ionicons name="person" size={22} color={DELIVERY_GREEN} />
                    </LinearGradient>
                    <View style={[styles.onlineIndicatorSmall, { backgroundColor: isOnline ? '#22C55E' : '#9CA3AF' }]} />
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={styles.greeting}>{getGreeting()}</Text>
                  <Text style={styles.name}>{user?.name || 'Partner'}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.headerButton}
                  onPress={() => navigation.navigate('Notifications')}
                >
                  <Ionicons name="notifications-outline" size={22} color="#fff" />
                  {unreadCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationCount}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={logout}>
                  <Ionicons name="log-out-outline" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Rating & Earnings Card */}
            <View style={styles.statsHeaderCard}>
              <View style={styles.statsHeaderGlow} />
              <View style={styles.statsHeaderItem}>
                <View style={styles.statsHeaderIconContainer}>
                  <Ionicons name="star" size={18} color="#FFD700" />
                </View>
                <View>
                  <Text style={styles.statsHeaderValue}>{user?.avgRating?.toFixed(1) || '0.0'}</Text>
                  <Text style={styles.statsHeaderLabel}>Rating</Text>
                </View>
              </View>
              <View style={styles.statsHeaderDivider} />
              <View style={styles.statsHeaderItem}>
                <View style={styles.statsHeaderIconContainer}>
                  <Ionicons name="bicycle" size={18} color="#22C55E" />
                </View>
                <View>
                  <Text style={styles.statsHeaderValue}>{stats?.totalDelivered || 0}</Text>
                  <Text style={styles.statsHeaderLabel}>Deliveries</Text>
                </View>
              </View>
            </View>
          </View>
        </ImageBackground>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[DELIVERY_GREEN]} />}
        contentContainerStyle={styles.scrollContent}>

        {/* Premium Online Toggle Card - Reverted to View */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.onlineCard, isOnline && styles.onlineCardActive]}>
            <View style={styles.onlineLeft}>
              <View style={styles.onlineDotContainer}>
                <Animated.View style={[
                  styles.onlineDotOuter,
                  { backgroundColor: isOnline ? '#22C55E20' : '#9CA3AF20', transform: [{ scale: isOnline ? pulseAnim : 1 }] }
                ]} />
                <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#22C55E' : '#9CA3AF' }]} />
              </View>
              <View style={styles.onlineTextContainer}>
                <Text style={styles.onlineStatus}>{isOnline ? "You're Online" : "You're Offline"}</Text>
                <Text style={styles.onlineSubtext}>{isOnline ? 'Ready to receive orders' : 'Go online to start earning'}</Text>
              </View>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={isOnline}
                onValueChange={toggleOnlineStatus}
                trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
                thumbColor={isOnline ? DELIVERY_GREEN : '#9CA3AF'}
                ios_backgroundColor="#E5E7EB"
                style={styles.switch}
              />
            </View>
          </View>
        </Animated.View>

        {/* Today's Performance */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconContainer, { backgroundColor: DELIVERY_GREEN + '15' }]}>
                <Ionicons name="today-outline" size={18} color={DELIVERY_GREEN} />
              </View>
              <Text style={styles.sectionTitle}>Today's Performance</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.statsGrid}><StatsCardSkeleton /><StatsCardSkeleton /></View>
          ) : (
            <View style={styles.statsGrid}>
              <TouchableOpacity activeOpacity={0.8} style={styles.statCardWrapper}>
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statCardGradient}
                >
                  <View style={styles.statCardDecor}>
                    <Ionicons name="checkmark-circle" size={60} color="rgba(255,255,255,0.15)" />
                  </View>
                  <View style={styles.statCardIcon}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.statCardValue}>{stats?.todayDelivered || 0}</Text>
                  <Text style={styles.statCardLabel}>Delivered</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} style={styles.statCardWrapper}>
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statCardGradient}
                >
                  <View style={styles.statCardDecor}>
                    <Ionicons name="bicycle" size={60} color="rgba(255,255,255,0.15)" />
                  </View>
                  <View style={styles.statCardIcon}>
                    <Ionicons name="bicycle-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.statCardValue}>{stats?.activeOrders || 0}</Text>
                  <Text style={styles.statCardLabel}>Active</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Overall Stats */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#8B5CF615' }]}>
                <Ionicons name="stats-chart-outline" size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.sectionTitle}>Overall Stats</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.statsGrid}><StatsCardSkeleton /><StatsCardSkeleton /></View>
          ) : (
            <View style={styles.statsGrid}>
              <TouchableOpacity activeOpacity={0.8} style={styles.statCardWrapper}>
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statCardGradient}
                >
                  <View style={styles.statCardDecor}>
                    <Ionicons name="trophy" size={60} color="rgba(255,255,255,0.15)" />
                  </View>
                  <View style={styles.statCardIcon}>
                    <Ionicons name="trophy-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.statCardValue}>{stats?.totalDelivered || 0}</Text>
                  <Text style={styles.statCardLabel}>Total Deliveries</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} style={styles.statCardWrapper}>
                <LinearGradient
                  colors={['#EC4899', '#DB2777']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statCardGradient}
                >
                  <View style={styles.statCardDecor}>
                    <Ionicons name="star" size={60} color="rgba(255,255,255,0.15)" />
                  </View>
                  <View style={styles.statCardIcon}>
                    <Ionicons name="star-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.statCardValue}>{user?.avgRating?.toFixed(1) || '0.0'}</Text>
                  <Text style={styles.statCardLabel}>Rating</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  headerWrapper: { zIndex: 100, elevation: 100, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  header: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60, paddingBottom: spacing.xl + 10, paddingHorizontal: spacing.screenHorizontal },
  headerBackgroundImage: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerOverlay: { 
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginTop: -(Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60),
    marginBottom: -(spacing.xl + 10),
    marginHorizontal: -spacing.screenHorizontal,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
    paddingBottom: spacing.xl + 10,
    paddingHorizontal: spacing.screenHorizontal,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { position: 'relative', width: 52, height: 52 },
  avatar: { width: 52, height: 52, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarGradient: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', ...shadows.md },
  onlineIndicatorSmall: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  profileInfo: { marginLeft: spacing.md },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  headerButton: { width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  notificationBadge: { position: 'absolute', top: 8, right: 8, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  notificationCount: { fontSize: 10, fontWeight: '700', color: '#000' },
  statsHeaderCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.xl + 4, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', overflow: 'hidden' },
  statsHeaderGlow: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)' },
  statsHeaderItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statsHeaderIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  statsHeaderValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  statsHeaderLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statsHeaderDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.screenHorizontal, paddingTop: spacing.lg, paddingBottom: 100 },
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIconContainer: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.light.text.primary },
  onlineCard: { padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radius.xl + 4, borderWidth: 1, borderColor: colors.light.borderLight, backgroundColor: colors.light.surface, ...shadows.md },
  onlineCardActive: { borderColor: '#22C55E30', backgroundColor: '#F0FDF4' },
  onlineLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  onlineDotContainer: { position: 'relative', width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  onlineDotOuter: { position: 'absolute', width: 48, height: 48, borderRadius: 24 },
  onlineDot: { width: 16, height: 16, borderRadius: 8 },
  onlineTextContainer: { marginLeft: spacing.md, flex: 1 },
  onlineStatus: { fontSize: 17, fontWeight: '700', color: colors.light.text.primary },
  onlineSubtext: { fontSize: 13, color: colors.light.text.secondary, marginTop: 2 },
  switchContainer: { marginLeft: spacing.md },
  switch: { transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] },
  statsGrid: { flexDirection: 'row', gap: spacing.md },
  statCardWrapper: { flex: 1 },
  statCardGradient: {
    flex: 1,
    borderRadius: radius.xl,
    padding: spacing.base,
    minHeight: 140,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.md,
  },
  statCardDecor: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
  statCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statCardValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
  statCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  actionsContainer: { gap: spacing.sm },
  tipsContent: { gap: spacing.sm },
  tipItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tipDot: { width: 6, height: 6, borderRadius: 3 },
  tipText: { fontSize: 13, color: colors.light.text.secondary, lineHeight: 18, flex: 1 },
});
