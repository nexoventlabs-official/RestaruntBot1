import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  RefreshControl, TouchableOpacity, Image, Alert, ActivityIndicator, 
  Animated, Platform, StatusBar, ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { colors, spacing, radius, typography, shadows } from '../../theme';

export default function AdminDeliveryScreen({ navigation }) {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    // Glass shine effect
    setTimeout(() => {
      Animated.timing(shineAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }, 300);
  }, []);

  const fetchDeliveryBoys = async () => {
    try {
      const response = await api.get('/delivery');
      setDeliveryBoys(response.data);
    } catch (error) { console.error('Error fetching delivery boys:', error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    fetchDeliveryBoys();
    const unsubscribe = navigation.addListener('focus', fetchDeliveryBoys);
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchDeliveryBoys(); }, []);

  const resetPassword = (item) => {
    Alert.alert('Reset Password', `Send new password to ${item.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: async () => {
        try { await api.post(`/delivery/${item._id}/reset-password`); Alert.alert('Success', 'New password sent to email'); }
        catch (error) { Alert.alert('Error', 'Failed to reset password'); }
      }},
    ]);
  };

  const deleteDeliveryBoy = (item) => {
    Alert.alert('Delete Delivery Partner', `Are you sure you want to delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/delivery/${item._id}`); setDeliveryBoys(deliveryBoys.filter(d => d._id !== item._id)); }
        catch (error) { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const onlineCount = deliveryBoys.filter(d => d.isOnline).length;

  const renderItem = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DeliveryForm', { deliveryBoy: item })} activeOpacity={0.8}>
        <View style={styles.cardHeader}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{item.name?.[0]?.toUpperCase() || 'D'}</Text>
            </View>
          )}
          
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={12} color={colors.light.text.tertiary} />
              <Text style={styles.phone}>{item.phone}</Text>
            </View>
          </View>

          <View style={styles.statusContainer}>
            <View style={[styles.onlineBadge, { backgroundColor: item.isOnline ? '#DCFCE7' : colors.light.surfaceSecondary }]}>
              <View style={[styles.onlineDot, { backgroundColor: item.isOnline ? '#22C55E' : colors.light.text.tertiary }]} />
              <Text style={[styles.onlineText, { color: item.isOnline ? '#22C55E' : colors.light.text.tertiary }]}>
                {item.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <View style={[styles.activeBadge, { backgroundColor: item.isActive ? '#DBEAFE' : '#FEE2E2' }]}>
              <Text style={[styles.activeText, { color: item.isActive ? '#3B82F6' : '#EF4444' }]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={14} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{item.avgRating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="bicycle" size={14} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{item.totalRatings || 0}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#DBEAFE' }]} onPress={() => resetPassword(item)}>
            <Ionicons name="key-outline" size={16} color="#3B82F6" />
            <Text style={[styles.actionText, { color: '#3B82F6' }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#EDE9FE' }]} onPress={() => navigation.navigate('DeliveryForm', { deliveryBoy: item })}>
            <Ionicons name="create-outline" size={16} color="#8B5CF6" />
            <Text style={[styles.actionText, { color: '#8B5CF6' }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FEE2E2' }]} onPress={() => deleteDeliveryBoy(item)}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ImageBackground
        source={require('../../../assets/backgrounds/deiverypartner.jpg')}
        style={styles.header}
        imageStyle={styles.headerBackgroundImage}
      >
        <View style={styles.headerOverlay}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>Delivery Partners</Text>
              <Text style={styles.subtitle}>{onlineCount} online • {deliveryBoys.length} total</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('DeliveryForm', {})}>
              <Ionicons name="add" size={24} color={colors.zomato.red} />
            </TouchableOpacity>
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

      {loading ? (
        <ActivityIndicator size="large" color={colors.zomato.red} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={deliveryBoys}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.zomato.red]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="bicycle-outline" size={48} color={colors.light.text.tertiary} />
              </View>
              <Text style={styles.emptyTitle}>No delivery partners</Text>
              <Text style={styles.emptyText}>Add your first delivery partner</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('DeliveryForm', {})}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Add Partner</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  header: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75, paddingBottom: 55, paddingHorizontal: spacing.screenHorizontal, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  headerBackgroundImage: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerOverlay: { backgroundColor: 'rgba(0, 0, 0, 0.4)', marginTop: -(Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75), marginBottom: -55, marginHorizontal: -spacing.screenHorizontal, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75, paddingBottom: 55, paddingHorizontal: spacing.screenHorizontal, overflow: 'hidden' },
  glassShine: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: 100, backgroundColor: 'rgba(255, 255, 255, 0.3)', transform: [{ skewX: '-20deg' }] },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: typography.display.small.fontSize, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: typography.body.medium.fontSize, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  addButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...shadows.md },
  listContent: { padding: spacing.screenHorizontal, paddingBottom: 100 },
  card: { backgroundColor: colors.light.surface, borderRadius: radius.xl, padding: spacing.base, marginBottom: spacing.md, ...shadows.card },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 56, height: 56, borderRadius: 18, borderWidth: 2, borderColor: colors.light.borderLight },
  avatarPlaceholder: { backgroundColor: colors.zomato.red, justifyContent: 'center', alignItems: 'center', borderWidth: 0 },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: '#fff' },
  info: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: typography.title.large.fontSize, fontWeight: '600', color: colors.light.text.primary },
  email: { fontSize: typography.body.small.fontSize, color: colors.light.text.secondary, marginTop: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  phone: { fontSize: typography.body.small.fontSize, color: colors.light.text.tertiary },
  statusContainer: { alignItems: 'flex-end', gap: spacing.xs },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  onlineDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  onlineText: { fontSize: typography.label.small.fontSize, fontWeight: '600' },
  activeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  activeText: { fontSize: typography.label.small.fontSize, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.base, paddingTop: spacing.base, borderTopWidth: 1, borderTopColor: colors.light.borderLight },
  statItem: { flex: 1, alignItems: 'center' },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xs },
  statValue: { fontSize: typography.headline.small.fontSize, fontWeight: '700', color: colors.light.text.primary },
  statLabel: { fontSize: typography.label.small.fontSize, color: colors.light.text.tertiary, marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: colors.light.borderLight },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.base, paddingTop: spacing.base, borderTopWidth: 1, borderTopColor: colors.light.borderLight, gap: spacing.sm },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.sm, borderRadius: radius.md },
  actionText: { fontSize: typography.label.medium.fontSize, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.light.surfaceSecondary, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.base },
  emptyTitle: { fontSize: typography.headline.small.fontSize, fontWeight: '600', color: colors.light.text.secondary },
  emptyText: { fontSize: typography.body.medium.fontSize, color: colors.light.text.tertiary, marginTop: spacing.xs },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg, backgroundColor: colors.zomato.red, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg },
  emptyButtonText: { color: '#fff', fontWeight: '600', fontSize: typography.title.medium.fontSize },
});
