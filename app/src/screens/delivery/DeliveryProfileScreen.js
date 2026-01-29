import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, TextInput, Alert, ActivityIndicator, Animated, Platform, StatusBar, ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';
import { colors, spacing, radius, typography, shadows } from '../../theme';

const DELIVERY_GREEN = '#267E3E';
const DELIVERY_DARK_GREEN = '#1B5E2E';

// Background image
const PROFILE_BG = require('../../../assets/backgrounds/deliveryprofile.jpg');

const MenuItem = ({ icon, label, value, onPress, showArrow = true, danger = false }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.7 : 1}>
    <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
      <Ionicons name={icon} size={20} color={danger ? colors.error.main : DELIVERY_GREEN} />
    </View>
    <View style={styles.menuContent}>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
    </View>
    {showArrow && <Ionicons name="chevron-forward" size={20} color={colors.light.text.tertiary} />}
  </TouchableOpacity>
);

const StatsBadge = ({ value, label }) => (
  <View style={styles.statsBadge}>
    <Text style={styles.statsValue}>{value}</Text>
    <Text style={styles.statsLabel}>{label}</Text>
  </View>
);

export default function DeliveryProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
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
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    fetchProfileStats();
    refreshUser(); // Refresh user data including rating
    
    const unsubscribe = navigation.addListener('focus', () => {
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
    if (!currentPassword || !newPassword || !confirmPassword) { Alert.alert('Error', 'Please fill in all fields'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'New passwords do not match'); return; }
    if (newPassword.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      await api.post('/delivery/change-password', { currentPassword, newPassword });
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordForm(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error) { Alert.alert('Error', error.response?.data?.error || 'Failed to change password'); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerWrapper}>
          <ImageBackground source={PROFILE_BG} style={styles.header} imageStyle={styles.headerBackgroundImage}>
            <View style={styles.headerOverlay}>
              <Animated.View style={[styles.profileSection, { opacity: fadeAnim }]}>
                <View style={styles.avatarContainer}>
                  {user?.photo ? (
                    <Image source={{ uri: user.photo }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Ionicons name="person" size={44} color={DELIVERY_GREEN} />
                    </View>
                  )}
                </View>

                <Text style={styles.userName}>{user?.name || 'Delivery Partner'}</Text>

                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={18} color="#FFD700" />
                  <Text style={styles.ratingText}>{user?.avgRating?.toFixed(1) || '0.0'}</Text>
                  <Text style={styles.ratingCount}>({user?.totalRatings || 0} ratings)</Text>
                </View>

                <View style={styles.statsRow}>
                  <StatsBadge value={profileStats.totalDeliveries.toString()} label="Deliveries" />
                  <View style={styles.statsDivider} />
                  <StatsBadge value={formatEarnings(profileStats.totalEarnings)} label="Earnings" />
                  <View style={styles.statsDivider} />
                  <StatsBadge value={formatJoinedDate(profileStats.joinedDate || user?.createdAt)} label="Joined" />
                </View>
              </Animated.View>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuCardBg}>
            <View style={styles.menuCard}>
              <MenuItem icon="mail-outline" label="Email" value={user?.email} showArrow={false} />
              <View style={styles.menuDivider} />
              <MenuItem icon="call-outline" label="Phone" value={user?.phone} showArrow={false} />
              <View style={styles.menuDivider} />
              <MenuItem icon="calendar-outline" label="Date of Birth" value={user?.dob ? new Date(user.dob).toLocaleDateString('en-IN') : 'Not set'} showArrow={false} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuCardBg}>
            <View style={styles.menuCard}>
              <MenuItem icon="key-outline" label="Change Password" onPress={() => setShowPasswordForm(!showPasswordForm)} />

              {showPasswordForm && (
                <View style={styles.passwordForm}>
                  <TextInput style={styles.input} placeholder="Current Password" placeholderTextColor={colors.light.text.tertiary} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
                  <TextInput style={styles.input} placeholder="New Password" placeholderTextColor={colors.light.text.tertiary} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
                  <TextInput style={styles.input} placeholder="Confirm New Password" placeholderTextColor={colors.light.text.tertiary} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
                  <TouchableOpacity style={styles.updateButton} onPress={handleChangePassword} disabled={loading} activeOpacity={0.8}>
                    <LinearGradient colors={loading ? ['#9CA3AF', '#9CA3AF'] : [DELIVERY_GREEN, DELIVERY_DARK_GREEN]} style={styles.updateButtonGradient}>
                      {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.updateButtonText}>Update Password</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.menuDivider} />
              <MenuItem icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} />
              <View style={styles.menuDivider} />
              <MenuItem icon="help-circle-outline" label="Help & Support" onPress={() => navigation.navigate('HelpSupport')} />
            </View>
          </View>

          <View style={[styles.menuCardBg, styles.logoutCard]}>
            <View style={styles.menuCard}>
              <MenuItem icon="log-out-outline" label="Logout" onPress={handleLogout} showArrow={false} danger />
            </View>
          </View>

          <Text style={styles.version}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  headerWrapper: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  header: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60, paddingBottom: spacing['3xl'], paddingHorizontal: spacing.screenHorizontal },
  headerBackgroundImage: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerOverlay: { 
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginTop: -(Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60),
    marginBottom: -spacing['3xl'],
    marginHorizontal: -spacing.screenHorizontal,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.screenHorizontal,
  },
  profileSection: { alignItems: 'center' },
  avatarContainer: { position: 'relative', marginBottom: spacing.md },
  avatar: { width: 100, height: 100, borderRadius: 30, borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)' },
  avatarPlaceholder: { backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },

  userName: { fontSize: typography.headline.large.fontSize, fontWeight: '700', color: '#fff', marginBottom: spacing.sm },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  ratingText: { fontSize: typography.title.large.fontSize, fontWeight: '700', color: '#fff', marginLeft: spacing.xs },
  ratingCount: { fontSize: typography.body.small.fontSize, color: 'rgba(255,255,255,0.8)', marginLeft: spacing.xs },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.xl, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  statsBadge: { flex: 1, alignItems: 'center' },
  statsValue: { fontSize: typography.headline.small.fontSize, fontWeight: '700', color: '#fff' },
  statsLabel: { fontSize: typography.label.small.fontSize, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statsDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  content: { padding: spacing.screenHorizontal, marginTop: -spacing.lg },
  sectionTitle: { fontSize: typography.title.medium.fontSize, fontWeight: '600', color: colors.light.text.secondary, marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: spacing.xs },
  menuCardBg: { borderRadius: radius.xl, ...shadows.card, backgroundColor: colors.light.surface, overflow: 'hidden' },
  menuCard: { backgroundColor: colors.light.surface },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.base },
  menuIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  menuIconDanger: { backgroundColor: colors.error.light },
  menuContent: { flex: 1, marginLeft: spacing.md },
  menuLabel: { fontSize: typography.body.large.fontSize, color: colors.light.text.primary },
  menuLabelDanger: { color: colors.error.main },
  menuValue: { fontSize: typography.body.small.fontSize, color: colors.light.text.secondary, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: colors.light.borderLight, marginLeft: 68 },
  passwordForm: { padding: spacing.base, paddingTop: 0, gap: spacing.md },
  input: { height: 48, backgroundColor: colors.light.surfaceSecondary, borderRadius: radius.md, paddingHorizontal: spacing.base, fontSize: typography.body.medium.fontSize, color: colors.light.text.primary },
  updateButton: { borderRadius: radius.lg, overflow: 'hidden' },
  updateButtonGradient: { height: 48, justifyContent: 'center', alignItems: 'center' },
  updateButtonText: { color: '#fff', fontSize: typography.title.medium.fontSize, fontWeight: '600' },
  logoutCard: { marginTop: spacing.lg },
  version: { textAlign: 'center', color: colors.light.text.tertiary, fontSize: typography.body.small.fontSize, marginTop: spacing.xl, marginBottom: spacing['3xl'] },
});
