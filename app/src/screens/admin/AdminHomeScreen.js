import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, ActivityIndicator, Animated, Platform,
  Dimensions, StatusBar, ImageBackground, AppState, Image, Switch, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import api, { API_BASE_URL } from '../../config/api';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import { StatCard, ActionCard, InfoCard, MetricCard, Card } from '../../components/ui';

const { width } = Dimensions.get('window');
const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

// Pre-load image references outside component to prevent re-renders
const IMAGES = {
  home: require('../../../assets/backgrounds/home.jpg'),
  button: require('../../../assets/backgrounds/button.png'),
  all: require('../../../assets/backgrounds/all.png'),
  veg: require('../../../assets/backgrounds/veg.png'),
  nonVeg: require('../../../assets/backgrounds/non-veg.png'),
  egg: require('../../../assets/backgrounds/egg.png'),
};

export default function AdminHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { unreadCount, checkForUpdates } = useNotifications();
  const [stats, setStats] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [holidayMode, setHolidayMode] = useState(false);
  const [togglingHoliday, setTogglingHoliday] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shineAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
    // Glass shine effect
    setTimeout(() => {
      Animated.timing(shineAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }, 300);
  }, []);

  const fetchStats = async (silent = false) => {
    try {
      const [ordersRes, menuRes, deliveryRes, reportRes, dashboardRes] = await Promise.all([
        api.get('/orders?limit=100'), api.get('/menu'), api.get('/delivery'), api.get('/analytics/report?type=today'), api.get('/analytics/dashboard'),
      ]);
      const orders = ordersRes.data.orders || [];
      const menuItems = menuRes.data || [];
      const report = reportRes.data || {};
      const dashboard = dashboardRes.data || {};
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

      const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
      const yesterdayOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= yesterday && d < today;
      });
      const newOrders = orders.filter(o => o.status === 'confirmed');
      const preparingOrders = orders.filter(o => o.status === 'preparing');
      const deliveryOrders = orders.filter(o => ['ready', 'out_for_delivery'].includes(o.status));

      // Use report data for today's revenue (same as Today's Report section)
      const todayRevenue = report.totalRevenue || 0;
      const todayOrderCount = report.totalOrders || todayOrders.length;
      
      // Use dashboard data for total revenue (all-time, same as website)
      const totalRevenue = dashboard.totalRevenue || 0;
      
      // Calculate yesterday's revenue for trend comparison
      const yesterdayRevenue = yesterdayOrders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.totalAmount, 0);

      // Menu food type counts
      const vegItems = menuItems.filter(i => i.foodType === 'veg').length;
      const nonVegItems = menuItems.filter(i => i.foodType === 'nonveg').length;
      const eggItems = menuItems.filter(i => i.foodType === 'egg').length;

      setStats({
        todayOrders: todayOrderCount,
        yesterdayOrders: yesterdayOrders.length,
        newOrders: newOrders.length,
        preparingOrders: preparingOrders.length,
        deliveryOrders: deliveryOrders.length,
        totalMenu: menuItems.length,
        vegItems,
        nonVegItems,
        eggItems,
        activeDelivery: deliveryRes.data.filter(d => d.isOnline).length,
        totalDelivery: deliveryRes.data.length,
        todayRevenue,
        totalRevenue,
        yesterdayRevenue,
        revenueTrend: todayRevenue >= yesterdayRevenue ? 'up' : 'down',
        ordersTrend: todayOrderCount >= yesterdayOrders.length ? 'up' : 'down',
      });
      setReportData(report);
      
      // Check for notification updates
      checkForUpdates();
      
      // Fetch holiday mode status
      try {
        const holidayRes = await api.get('/settings/holiday/status');
        setHolidayMode(holidayRes.data.holidayMode || false);
      } catch (err) {
        console.log('Could not fetch holiday status');
      }
    } catch (error) { console.error('Error fetching stats:', error); }
    finally { 
      if (!silent) {
        setLoading(false); 
        setRefreshing(false); 
      }
    }
  };

  // Toggle holiday mode
  const toggleHolidayMode = async () => {
    try {
      setTogglingHoliday(true);
      const response = await api.post('/settings/holiday/toggle');
      setHolidayMode(response.data.holidayMode);
      Alert.alert(
        response.data.holidayMode ? '🏖️ Holiday Mode ON' : '✅ Holiday Mode OFF',
        response.data.holidayMode 
          ? 'Customers will see a closed message when they contact you.'
          : 'Customers can now place orders normally.'
      );
    } catch (error) {
      console.error('Error toggling holiday mode:', error);
      Alert.alert('Error', 'Failed to toggle holiday mode');
    } finally {
      setTogglingHoliday(false);
    }
  };

  // Auto-refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchStats();
      
      // Set up auto-refresh interval
      const intervalId = setInterval(() => {
        fetchStats(true); // silent refresh
      }, AUTO_REFRESH_INTERVAL);

      // Handle app state changes
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          fetchStats(true);
        }
      });

      return () => {
        clearInterval(intervalId);
        subscription?.remove();
      };
    }, [])
  );

  const onRefresh = useCallback(() => { setRefreshing(true); fetchStats(); }, []);

  // Memoized navigation callbacks to prevent StatCard re-renders
  const navigateToOrders = useCallback(() => navigation.navigate('Orders'), [navigation]);
  const navigateToMenu = useCallback(() => navigation.navigate('Menu'), [navigation]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={colors.zomato.red} style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Premium Header - Reverted to LinearGradient */}
      <Animated.View style={[styles.headerWrapper, { opacity: fadeAnim }]}>
        <ImageBackground
          source={IMAGES.home}
          style={styles.header}
          imageStyle={styles.headerBackgroundImage}
          fadeDuration={0}
        >
          <View style={styles.headerOverlay}>
            <View style={styles.headerContent}>
              <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={['#fff', '#f8f8f8']}
                    style={styles.avatarGradient}
                  >
                    <Ionicons name="person" size={22} color={colors.zomato.red} />
                  </LinearGradient>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.greeting}>{getGreeting()}</Text>
                  <Text style={styles.username}>{user?.username || 'Admin'}</Text>
                </View>
              </View>
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

            {/* Premium Revenue Card - Reverted to standard look within Gradient */}
            <View style={styles.revenueCard}>
              <View style={styles.revenueGlow} />
              <View style={styles.revenueContent}>
                <View style={styles.revenueLeft}>
                  <View style={styles.revenueLabelRow}>
                    <Ionicons name="wallet-outline" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.revenueLabel}>Today's Revenue</Text>
                  </View>
                  <Text style={styles.revenueValue}>₹{(stats?.todayRevenue || 0).toLocaleString('en-IN')}</Text>
                  {stats?.revenueTrend && (
                    <View style={[styles.trendBadge, { backgroundColor: stats.revenueTrend === 'up' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }]}>
                      <Ionicons
                        name={stats.revenueTrend === 'up' ? 'trending-up' : 'trending-down'}
                        size={12}
                        color={stats.revenueTrend === 'up' ? '#22C55E' : '#EF4444'}
                      />
                      <Text style={[styles.trendText, { color: stats.revenueTrend === 'up' ? '#22C55E' : '#EF4444' }]}>
                        vs yesterday
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.revenueDivider} />
                <View style={styles.revenueRight}>
                  <View style={styles.revenueLabelRow}>
                    <Ionicons name="receipt-outline" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.revenueLabel}>Orders</Text>
                  </View>
                  <Text style={styles.revenueOrders}>{stats?.todayOrders || 0}</Text>
                  <View style={styles.ordersBadge}>
                    <Text style={styles.ordersSubtext}>today</Text>
                  </View>
                </View>
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
      </Animated.View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.zomato.red]} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Total Revenue Card with Graph Animation */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.totalRevenueCard}>
            {/* Animated Graph Background */}
            <View style={styles.graphBackground}>
              {[...Array(8)].map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.graphBar,
                    {
                      height: `${30 + Math.random() * 50}%`,
                      left: `${i * 12.5}%`,
                      opacity: 0.15 + (i * 0.05),
                    },
                  ]}
                />
              ))}
              <View style={styles.graphLine} />
            </View>
            
            {/* Content */}
            <View style={styles.totalRevenueContent}>
              <View style={styles.totalRevenueIconContainer}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                  style={styles.totalRevenueIconGradient}
                >
                  <Ionicons name="trending-up" size={24} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.totalRevenueInfo}>
                <Text style={styles.totalRevenueLabel}>Total Revenue</Text>
                <Text style={styles.totalRevenueValue}>₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.totalRevenueTrendContainer}>
                {stats?.revenueTrend && (
                  <View style={[styles.totalRevenueTrendBadge, { backgroundColor: stats.revenueTrend === 'up' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' }]}>
                    <Ionicons
                      name={stats.revenueTrend === 'up' ? 'arrow-up' : 'arrow-down'}
                      size={14}
                      color={stats.revenueTrend === 'up' ? '#22C55E' : '#EF4444'}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Holiday Mode Toggle */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity 
            style={[styles.holidayCard, holidayMode && styles.holidayCardActive]}
            onPress={toggleHolidayMode}
            disabled={togglingHoliday}
            activeOpacity={0.8}
          >
            <View style={styles.holidayCardContent}>
              <View style={[styles.holidayIconContainer, holidayMode && styles.holidayIconContainerActive]}>
                {togglingHoliday ? (
                  <ActivityIndicator size="small" color={holidayMode ? '#fff' : '#F59E0B'} />
                ) : (
                  <Ionicons name={holidayMode ? "sunny" : "sunny-outline"} size={24} color={holidayMode ? '#fff' : '#F59E0B'} />
                )}
              </View>
              <View style={styles.holidayInfo}>
                <Text style={[styles.holidayTitle, holidayMode && styles.holidayTitleActive]}>Holiday Mode</Text>
                <Text style={[styles.holidaySubtitle, holidayMode && styles.holidaySubtitleActive]}>
                  {holidayMode ? 'Restaurant is closed today' : 'Tap to close for today'}
                </Text>
              </View>
              <View style={[styles.holidayStatus, holidayMode && styles.holidayStatusActive]}>
                <Text style={[styles.holidayStatusText, holidayMode && styles.holidayStatusTextActive]}>
                  {holidayMode ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Order Status Section */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="pulse-outline" size={18} color={colors.zomato.red} />
              </View>
              <Text style={styles.sectionTitle}>Live Status</Text>
            </View>
            <TouchableOpacity style={styles.seeAllButton} onPress={() => navigation.navigate('Orders')}>
              <Text style={styles.seeAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.zomato.red} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsGridThree}>
            <TouchableOpacity onPress={navigateToOrders} activeOpacity={0.8}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.liveStatusCard}
              >
                <View style={styles.liveStatusDecor}>
                  <Ionicons name="notifications" size={50} color="rgba(255,255,255,0.15)" />
                </View>
                <View style={[styles.liveStatusIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="notifications-outline" size={18} color="#fff" />
                </View>
                <Text style={styles.liveStatusValue}>{stats?.newOrders || 0}</Text>
                <Text style={styles.liveStatusLabel}>New</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={navigateToOrders} activeOpacity={0.8}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.liveStatusCard}
              >
                <View style={styles.liveStatusDecor}>
                  <Ionicons name="restaurant" size={50} color="rgba(255,255,255,0.15)" />
                </View>
                <View style={[styles.liveStatusIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="restaurant-outline" size={18} color="#fff" />
                </View>
                <Text style={styles.liveStatusValue}>{stats?.preparingOrders || 0}</Text>
                <Text style={styles.liveStatusLabel}>Preparing</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={navigateToOrders} activeOpacity={0.8}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.liveStatusCard}
              >
                <View style={styles.liveStatusDecor}>
                  <Ionicons name="bicycle" size={50} color="rgba(255,255,255,0.15)" />
                </View>
                <View style={[styles.liveStatusIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="bicycle-outline" size={18} color="#fff" />
                </View>
                <Text style={styles.liveStatusValue}>{stats?.deliveryOrders || 0}</Text>
                <Text style={styles.liveStatusLabel}>Delivery</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Menu Stats Section */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#8B5CF615' }]}>
                <Ionicons name="restaurant-outline" size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.sectionTitle}>Menu Stats</Text>
            </View>
            <TouchableOpacity style={styles.seeAllButton} onPress={() => navigation.navigate('Menu')}>
              <Text style={styles.seeAllText}>View Menu</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.zomato.red} />
            </TouchableOpacity>
          </View>

          <View style={styles.menuStatsRow}>
            <TouchableOpacity style={styles.menuStatItem} onPress={() => navigation.navigate('Menu', { screen: 'MenuList', params: { foodTypeFilter: 'all' } })}>
              <View style={styles.menuStatImageContainer}>
                <Image source={IMAGES.all} style={styles.menuStatImage} />
              </View>
              <View style={styles.menuStatLabelRow}>
                <View style={[styles.foodTypeBox, { borderColor: '#000' }]}>
                  <View style={[styles.foodTypeBoxDot, { backgroundColor: '#000' }]} />
                </View>
                <Text style={styles.menuStatText}>All</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuStatItem} onPress={() => navigation.navigate('Menu', { screen: 'MenuList', params: { foodTypeFilter: 'veg' } })}>
              <View style={styles.menuStatImageContainer}>
                <Image source={IMAGES.veg} style={styles.menuStatImage} />
              </View>
              <View style={styles.menuStatLabelRow}>
                <View style={[styles.foodTypeBox, { borderColor: '#22C55E' }]}>
                  <View style={[styles.foodTypeBoxDot, { backgroundColor: '#22C55E' }]} />
                </View>
                <Text style={styles.menuStatText}>Veg</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuStatItem} onPress={() => navigation.navigate('Menu', { screen: 'MenuList', params: { foodTypeFilter: 'nonveg' } })}>
              <View style={styles.menuStatImageContainer}>
                <Image source={IMAGES.nonVeg} style={styles.menuStatImage} />
              </View>
              <View style={styles.menuStatLabelRow}>
                <View style={[styles.foodTypeBox, { borderColor: '#EF4444' }]}>
                  <View style={[styles.foodTypeBoxDot, { backgroundColor: '#EF4444' }]} />
                </View>
                <Text style={styles.menuStatText}>Non-Veg</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuStatItem} onPress={() => navigation.navigate('Menu', { screen: 'MenuList', params: { foodTypeFilter: 'egg' } })}>
              <View style={styles.menuStatImageContainer}>
                <Image source={IMAGES.egg} style={styles.menuStatImage} />
              </View>
              <View style={styles.menuStatLabelRow}>
                <View style={[styles.foodTypeBox, { borderColor: '#F59E0B' }]}>
                  <View style={[styles.foodTypeBoxDot, { backgroundColor: '#F59E0B' }]} />
                </View>
                <Text style={styles.menuStatText}>Egg</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Today's Report Summary */}
        {reportData && (
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconContainer, { backgroundColor: '#22C55E15' }]}>
                  <Ionicons name="analytics-outline" size={18} color="#22C55E" />
                </View>
                <Text style={styles.sectionTitle}>Today's Report</Text>
              </View>
              <TouchableOpacity style={styles.seeAllButton} onPress={() => navigation.navigate('ReportDetail')}>
                <Text style={styles.seeAllText}>Details</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.zomato.red} />
              </TouchableOpacity>
            </View>

            {/* Report Stats Grid */}
            <View style={styles.reportStatsGrid}>
              {/* Revenue Card */}
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.reportStatCard, styles.reportStatCardGradient]}
              >
                <View style={styles.reportCardDecor}>
                  <Ionicons name="cash" size={60} color="rgba(255,255,255,0.15)" />
                </View>
                <View style={[styles.reportStatIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="cash-outline" size={18} color="#fff" />
                </View>
                <Text style={[styles.reportStatValue, styles.reportStatValueWhite]}>₹{(reportData.totalRevenue || 0).toLocaleString('en-IN')}</Text>
                <Text style={[styles.reportStatLabel, styles.reportStatLabelWhite]}>Revenue</Text>
              </LinearGradient>

              {/* Orders Card */}
              <LinearGradient
                colors={['#EC4899', '#DB2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.reportStatCard, styles.reportStatCardGradient]}
              >
                <View style={styles.reportCardDecor}>
                  <Ionicons name="receipt" size={60} color="rgba(255,255,255,0.15)" />
                </View>
                <View style={[styles.reportStatIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="receipt-outline" size={18} color="#fff" />
                </View>
                <Text style={[styles.reportStatValue, styles.reportStatValueWhite]}>{reportData.totalOrders || 0}</Text>
                <Text style={[styles.reportStatLabel, styles.reportStatLabelWhite]}>Orders</Text>
              </LinearGradient>

              {/* Items Sold Card */}
              <LinearGradient
                colors={['#06B6D4', '#0891B2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.reportStatCard, styles.reportStatCardGradient]}
              >
                <View style={styles.reportCardDecor}>
                  <Ionicons name="cube" size={60} color="rgba(255,255,255,0.15)" />
                </View>
                <View style={[styles.reportStatIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="cube-outline" size={18} color="#fff" />
                </View>
                <Text style={[styles.reportStatValue, styles.reportStatValueWhite]}>{reportData.totalItemsSold || 0}</Text>
                <Text style={[styles.reportStatLabel, styles.reportStatLabelWhite]}>Items Sold</Text>
              </LinearGradient>

              {/* Avg Order Card */}
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.reportStatCard, styles.reportStatCardGradient]}
              >
                <View style={styles.reportCardDecor}>
                  <Ionicons name="trending-up" size={60} color="rgba(255,255,255,0.15)" />
                </View>
                <View style={[styles.reportStatIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="trending-up-outline" size={18} color="#fff" />
                </View>
                <Text style={[styles.reportStatValue, styles.reportStatValueWhite]}>₹{(reportData.avgOrderValue || 0).toLocaleString('en-IN')}</Text>
                <Text style={[styles.reportStatLabel, styles.reportStatLabelWhite]}>Avg Order</Text>
              </LinearGradient>
            </View>

            {/* Order Status Row */}
            <View style={styles.orderStatusRow}>
              <View style={styles.orderStatusItem}>
                <View style={[styles.orderStatusIconContainer, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                </View>
                <Text style={styles.orderStatusLabel}>Delivered</Text>
                <Text style={styles.orderStatusValue}>{reportData.deliveredOrders || 0}</Text>
              </View>
              <View style={styles.orderStatusDivider} />
              <View style={styles.orderStatusItem}>
                <View style={[styles.orderStatusIconContainer, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </View>
                <Text style={styles.orderStatusLabel}>Cancelled</Text>
                <Text style={styles.orderStatusValue}>{reportData.cancelledOrders || 0}</Text>
              </View>
              <View style={styles.orderStatusDivider} />
              <View style={styles.orderStatusItem}>
                <View style={[styles.orderStatusIconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="cash-outline" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.orderStatusLabel}>COD</Text>
                <Text style={styles.orderStatusValue}>{reportData.codOrders || 0}</Text>
              </View>
              <View style={styles.orderStatusDivider} />
              <View style={styles.orderStatusItem}>
                <View style={[styles.orderStatusIconContainer, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="phone-portrait-outline" size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.orderStatusLabel}>UPI</Text>
                <Text style={styles.orderStatusValue}>{reportData.upiOrders || 0}</Text>
              </View>
            </View>

            {/* Top Selling Items */}
            {reportData.topSellingItems && reportData.topSellingItems.length > 0 && (
              <View style={styles.topSellingContainer}>
                <Text style={styles.topSellingTitle}>🔥 Top Selling</Text>
                {reportData.topSellingItems.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.topSellingItem}>
                    <View style={[styles.topSellingRank, { backgroundColor: index === 0 ? '#FEF3C7' : colors.light.surfaceSecondary }]}>
                      <Text style={[styles.topSellingRankText, { color: index === 0 ? '#F59E0B' : colors.light.text.secondary }]}>{index + 1}</Text>
                    </View>
                    {item.image ? (
                      <Image 
                        source={{ uri: item.image.startsWith('http') ? item.image : `${API_BASE_URL}${item.image}` }} 
                        style={styles.topSellingImage} 
                      />
                    ) : (
                      <View style={styles.topSellingImagePlaceholder}>
                        <Ionicons name="fast-food-outline" size={18} color={colors.light.text.tertiary} />
                      </View>
                    )}
                    <View style={styles.topSellingInfo}>
                      <Text style={styles.topSellingName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.topSellingQty}>{item.quantity} sold</Text>
                    </View>
                    <Text style={styles.topSellingRevenue}>₹{(item.revenue || 0).toLocaleString('en-IN')}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Least Selling Items */}
            {reportData.leastSellingItems && reportData.leastSellingItems.length > 0 && (
              <View style={[styles.topSellingContainer, { marginTop: spacing.md }]}>
                <Text style={styles.topSellingTitle}>📉 Least Selling</Text>
                {reportData.leastSellingItems.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.topSellingItem}>
                    <View style={[styles.topSellingRank, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.topSellingRankText, { color: '#EF4444' }]}>{index + 1}</Text>
                    </View>
                    {item.image ? (
                      <Image 
                        source={{ uri: item.image.startsWith('http') ? item.image : `${API_BASE_URL}${item.image}` }} 
                        style={styles.topSellingImage} 
                      />
                    ) : (
                      <View style={styles.topSellingImagePlaceholder}>
                        <Ionicons name="fast-food-outline" size={18} color={colors.light.text.tertiary} />
                      </View>
                    )}
                    <View style={styles.topSellingInfo}>
                      <Text style={styles.topSellingName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.topSellingQty}>{item.quantity} sold</Text>
                    </View>
                    <Text style={[styles.topSellingRevenue, { color: '#EF4444' }]}>₹{(item.revenue || 0).toLocaleString('en-IN')}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  headerWrapper: {
    zIndex: 100,
    elevation: 100,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
    paddingBottom: spacing.xl + 10,
    paddingHorizontal: spacing.screenHorizontal,
  },
  headerBackgroundImage: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginTop: -(Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60),
    marginBottom: -(spacing.xl + 10),
    marginHorizontal: -spacing.screenHorizontal,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
    paddingBottom: spacing.xl + 10,
    paddingHorizontal: spacing.screenHorizontal,
    overflow: 'hidden',
  },
  glassShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 18,
    overflow: 'hidden',
    ...shadows.md,
  },
  avatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: spacing.md,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },

  // Premium Revenue Card
  revenueCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.xl + 4,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  revenueGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  revenueContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueLeft: {
    flex: 1,
  },
  revenueLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  revenueLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: spacing.sm,
    letterSpacing: -1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  revenueDivider: {
    width: 1,
    height: 70,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: spacing.lg,
  },
  revenueRight: {
    alignItems: 'center',
    minWidth: 80,
  },
  revenueOrders: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: spacing.sm,
  },
  ordersBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  ordersSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: 100,
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.zomato.red + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.zomato.red + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.zomato.red,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statsGridThree: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  liveStatusCard: {
    flex: 1,
    minWidth: (width - spacing.screenHorizontal * 2 - spacing.sm * 2) / 3,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 110,
    overflow: 'hidden',
    ...shadows.sm,
  },
  liveStatusDecor: {
    position: 'absolute',
    right: -5,
    bottom: -5,
  },
  liveStatusIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  liveStatusValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  liveStatusLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },

  // Menu Stats Row
  menuStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  menuStatItem: {
    alignItems: 'center',
  },
  menuStatImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: colors.light.surface,
    ...shadows.md,
  },
  menuStatImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  menuStatLabel: {
    fontSize: 13,
    color: colors.light.text.primary,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  menuStatLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 4,
  },
  foodTypeBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodTypeBoxDot: {
    width: 6,
    height: 6,
    borderRadius: 1.5,
  },
  menuStatText: {
    fontSize: 12,
    color: colors.light.text.primary,
    fontWeight: '600',
  },
  foodTypeDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodTypeDotInner: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  menuStatLabelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  menuStatCount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.text.primary,
    marginTop: 2,
  },
  menuStatLabelBg: {
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  menuStatLabelBgImage: {
    resizeMode: 'stretch',
  },
  menuStatLabelWhite: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  menuStatLabelRowWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuStatCountWhite: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },

  // Actions
  actionsContainer: {
    gap: spacing.sm,
  },

  // Tips
  tipsContent: {
    gap: spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.zomato.red,
  },
  tipText: {
    fontSize: 13,
    color: colors.light.text.secondary,
    lineHeight: 18,
  },

  // Report Summary Styles
  reportStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reportStatCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.light.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderLeftWidth: 3,
    ...shadows.sm,
  },
  reportStatCardWithBg: {
    padding: 0,
    borderLeftWidth: 0,
    overflow: 'hidden',
    minHeight: 110,
  },
  reportStatCardGradient: {
    borderLeftWidth: 0,
    overflow: 'hidden',
    minHeight: 110,
  },
  reportCardDecor: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
  reportStatValueWhite: {
    color: '#fff',
  },
  reportStatLabelWhite: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  reportStatCardBgImage: {
    borderRadius: radius.lg,
    resizeMode: 'cover',
  },
  reportStatCardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: spacing.md,
    borderRadius: radius.lg,
    justifyContent: 'center',
  },
  reportStatValueWithBg: {
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  reportStatLabelWithBg: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  reportStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reportStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  reportStatLabel: {
    fontSize: 12,
    color: colors.light.text.secondary,
    marginTop: 2,
  },
  orderStatusRow: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.light.borderLight,
  },
  orderStatusItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  orderStatusIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
    ...shadows.sm,
  },
  orderStatusLabel: {
    fontSize: 12,
    color: colors.light.text.secondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  orderStatusValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  orderStatusDivider: {
    width: 1,
    backgroundColor: colors.light.borderLight,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
  },
  topSellingContainer: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  topSellingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text.primary,
    marginBottom: spacing.md,
  },
  topSellingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.borderLight,
  },
  topSellingRank: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  topSellingRankText: {
    fontSize: 12,
    fontWeight: '700',
  },
  topSellingInfo: {
    flex: 1,
  },
  topSellingName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text.primary,
  },
  topSellingQty: {
    fontSize: 12,
    color: colors.light.text.tertiary,
    marginTop: 1,
  },
  topSellingRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  topSellingImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: spacing.sm,
    backgroundColor: colors.light.surfaceSecondary,
  },
  topSellingImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: spacing.sm,
    backgroundColor: colors.light.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Total Revenue Card with Graph Animation
  totalRevenueCard: {
    backgroundColor: '#6366F1',
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.lg,
  },
  graphBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  graphBar: {
    position: 'absolute',
    bottom: 0,
    width: '10%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  graphLine: {
    position: 'absolute',
    bottom: '40%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  totalRevenueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  totalRevenueIconContainer: {
    marginRight: spacing.md,
  },
  totalRevenueIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalRevenueInfo: {
    flex: 1,
  },
  totalRevenueLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  totalRevenueValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  totalRevenueTrendContainer: {
    marginLeft: spacing.sm,
  },
  totalRevenueTrendBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Holiday Mode Card
  holidayCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FEF3C7',
    ...shadows.sm,
  },
  holidayCardActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  holidayCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  holidayIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  holidayIconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  holidayInfo: {
    flex: 1,
    marginLeft: 14,
  },
  holidayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  holidayTitleActive: {
    color: '#fff',
  },
  holidaySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  holidaySubtitleActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  holidayStatus: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  holidayStatusActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  holidayStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  holidayStatusTextActive: {
    color: '#fff',
  },
  // Today's Special Section Styles
  specialLoadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialEmptyContainer: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  specialEmptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  specialEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text.primary,
    marginBottom: spacing.xs,
  },
  specialEmptySubtext: {
    fontSize: 13,
    color: colors.light.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  specialEmptyButton: {
    backgroundColor: colors.zomato.red,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  specialEmptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  specialItemsContainer: {
    gap: spacing.sm,
  },
  specialItemCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  specialItemImage: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    marginRight: spacing.md,
  },
  specialItemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.light.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  specialItemInfo: {
    flex: 1,
  },
  specialItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  specialItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  specialToggleButton: {
    padding: spacing.xs,
  },
  specialItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.zomato.red,
    marginBottom: spacing.xs,
  },
  specialItemCategories: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  specialItemCategoryBadge: {
    backgroundColor: colors.light.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  specialItemCategoryText: {
    fontSize: 11,
    color: colors.light.text.secondary,
    fontWeight: '500',
  },
  addMoreSpecialsButton: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.zomato.red,
    borderStyle: 'dashed',
    marginTop: spacing.sm,
  },
  addMoreSpecialsText: {
    color: colors.zomato.red,
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    width: width * 0.9,
    maxHeight: '80%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalContent: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalItemCheckbox: {
    marginRight: spacing.md,
  },
  modalItemImage: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    marginRight: spacing.md,
  },
  modalItemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.text.primary,
    marginBottom: 2,
  },
  modalItemPrice: {
    fontSize: 13,
    color: colors.light.text.secondary,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalCancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.text.secondary,
  },
  modalSaveButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.zomato.red,
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalBackButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: radius.md,
    margin: spacing.lg,
    marginTop: 0,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.light.text.primary,
  },
  clearSearchButton: {
    padding: spacing.xs,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text.primary,
    marginBottom: 4,
  },
  categoryItemCount: {
    fontSize: 13,
    color: colors.light.text.secondary,
  },
});
