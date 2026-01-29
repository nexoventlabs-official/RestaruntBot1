import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, TextInput, Alert, Pressable, Switch, Platform, StatusBar
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../config/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors, spacing, radius, typography, shadows } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Menu Item Component
const MenuItem = ({ icon, label, value, onPress, showArrow = true, rightElement, danger = false }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={[styles.menuItem, animatedStyle]}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons 
          name={icon} 
          size={20} 
          color={danger ? colors.error.main : colors.primary[400]} 
        />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
        {value && <Text style={styles.menuValue}>{value}</Text>}
      </View>
      {rightElement || (showArrow && (
        <Ionicons name="chevron-forward" size={20} color={colors.light.text.tertiary} />
      ))}
    </AnimatedPressable>
  );
};

// Stats Badge Component
const StatsBadge = ({ value, label }) => (
  <View style={styles.statsBadge}>
    <Text style={styles.statsValue}>{value}</Text>
    <Text style={styles.statsLabel}>{label}</Text>
  </View>
);

export default function DeliveryProfileScreen({ navigation }) {
  const { user, logout, setUser, refreshUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileStats, setProfileStats] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    joinedDate: null
  });

  // Fetch profile stats on mount and refresh user data
  useEffect(() => {
    fetchProfileStats();
    refreshUser(); // Refresh user data including rating
    
    const unsubscribe = navigation?.addListener?.('focus', () => {
      fetchProfileStats();
      refreshUser(); // Refresh user data when screen comes into focus
    });
    
    return unsubscribe;
  }, [navigation, refreshUser]);

  const fetchProfileStats = async () => {
    try {
      const response = await api.get('/delivery/profile/stats');
      setProfileStats(response.data);
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    }
  };

  // Format earnings to K format
  const formatEarnings = (amount) => {
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  // Format joined date
  const formatJoinedDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await api.post('/delivery/change-password', { currentPassword, newPassword });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            logout();
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Animated.View entering={FadeIn.duration(500)}>
          <LinearGradient
            colors={[colors.primary[400], colors.primary[600]]}
            style={styles.headerGradient}
          >
            <View style={styles.avatarContainer}>
              {user?.photo ? (
                <Image source={{ uri: user.photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={48} color={colors.primary[400]} />
                </View>
              )}
            </View>
            
            <Text style={styles.userName}>{user?.name || 'Delivery Partner'}</Text>
            
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.ratingText}>
                {user?.avgRating?.toFixed(1) || '0.0'}
              </Text>
              <Text style={styles.ratingCount}>
                ({user?.totalRatings || 0} ratings)
              </Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <StatsBadge value={profileStats.totalDeliveries.toString()} label="Deliveries" />
              <View style={styles.statsDivider} />
              <StatsBadge value={formatEarnings(profileStats.totalEarnings)} label="Earnings" />
              <View style={styles.statsDivider} />
              <StatsBadge value={formatJoinedDate(profileStats.joinedDate || user?.createdAt)} label="Joined" />
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.content}>
          {/* Account Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Text style={styles.sectionTitle}>Account</Text>
            <Card style={styles.menuCard}>
              <MenuItem 
                icon="mail-outline" 
                label="Email" 
                value={user?.email}
                showArrow={false}
              />
              <View style={styles.menuDivider} />
              <MenuItem 
                icon="call-outline" 
                label="Phone" 
                value={user?.phone}
                showArrow={false}
              />
              <View style={styles.menuDivider} />
              <MenuItem 
                icon="calendar-outline" 
                label="Date of Birth" 
                value={user?.dob ? new Date(user.dob).toLocaleDateString('en-IN') : 'Not set'}
                showArrow={false}
              />
            </Card>
          </Animated.View>

          {/* Settings Section */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <Text style={styles.sectionTitle}>Settings</Text>
            <Card style={styles.menuCard}>
              <MenuItem 
                icon="key-outline" 
                label="Change Password"
                onPress={() => setShowPasswordForm(!showPasswordForm)}
                rightElement={
                  <Ionicons 
                    name={showPasswordForm ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color={colors.light.text.tertiary} 
                  />
                }
              />
              
              {showPasswordForm && (
                <Animated.View 
                  entering={FadeInDown.duration(300)}
                  style={styles.passwordForm}
                >
                  <TextInput
                    style={styles.input}
                    placeholder="Current Password"
                    placeholderTextColor={colors.light.text.tertiary}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    placeholderTextColor={colors.light.text.tertiary}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm New Password"
                    placeholderTextColor={colors.light.text.tertiary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                  <Button
                    title="Update Password"
                    onPress={handleChangePassword}
                    loading={loading}
                    size="md"
                  />
                </Animated.View>
              )}
              
              <View style={styles.menuDivider} />
              <MenuItem 
                icon="moon-outline" 
                label="Dark Mode"
                showArrow={false}
                rightElement={
                  <Switch
                    value={isDark}
                    onValueChange={() => {
                      Haptics.selectionAsync();
                      toggleTheme();
                    }}
                    trackColor={{ false: '#E5E7EB', true: colors.primary[200] }}
                    thumbColor={isDark ? colors.primary[400] : '#9CA3AF'}
                  />
                }
              />
              <View style={styles.menuDivider} />
              <MenuItem 
                icon="notifications-outline" 
                label="Notifications"
                onPress={() => {}}
              />
              <View style={styles.menuDivider} />
              <MenuItem 
                icon="document-text-outline" 
                label="Documents"
                onPress={() => {}}
              />
              <View style={styles.menuDivider} />
              <MenuItem 
                icon="help-circle-outline" 
                label="Help & Support"
                onPress={() => {}}
              />
            </Card>
          </Animated.View>

          {/* Logout */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)}>
            <Card style={[styles.menuCard, styles.logoutCard]}>
              <MenuItem 
                icon="log-out-outline" 
                label="Logout"
                onPress={handleLogout}
                showArrow={false}
                danger
              />
            </Card>
          </Animated.View>

          {/* Version */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)}>
            <Text style={styles.version}>Version 1.0.0</Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.light.background 
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.screenHorizontal,
    alignItems: 'center',
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: { 
    width: 100, 
    height: 100, 
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: { 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  userName: { 
    fontSize: typography.headline.large.fontSize,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  ratingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ratingText: { 
    fontSize: typography.title.large.fontSize,
    fontWeight: '700',
    color: '#fff',
    marginLeft: spacing.xs,
  },
  ratingCount: { 
    fontSize: typography.body.small.fontSize,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  statsBadge: {
    flex: 1,
    alignItems: 'center',
  },
  statsValue: {
    fontSize: typography.headline.small.fontSize,
    fontWeight: '700',
    color: '#fff',
  },
  statsLabel: {
    fontSize: typography.label.small.fontSize,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statsDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: { 
    padding: spacing.screenHorizontal,
    marginTop: -spacing.lg,
  },
  sectionTitle: { 
    fontSize: typography.title.medium.fontSize,
    fontWeight: '600',
    color: colors.light.text.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconDanger: {
    backgroundColor: colors.error.light,
  },
  menuContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  menuLabel: {
    fontSize: typography.body.large.fontSize,
    color: colors.light.text.primary,
  },
  menuLabelDanger: {
    color: colors.error.main,
  },
  menuValue: {
    fontSize: typography.body.small.fontSize,
    color: colors.light.text.secondary,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.light.borderLight,
    marginLeft: 68,
  },
  passwordForm: {
    padding: spacing.base,
    paddingTop: 0,
    gap: spacing.md,
  },
  input: {
    height: 48,
    backgroundColor: colors.light.borderLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.base,
    fontSize: typography.body.medium.fontSize,
    color: colors.light.text.primary,
  },
  logoutCard: {
    marginTop: spacing.lg,
  },
  version: { 
    textAlign: 'center', 
    color: colors.light.text.tertiary,
    fontSize: typography.body.small.fontSize,
    marginTop: spacing.xl,
    marginBottom: spacing['3xl'],
  },
});
