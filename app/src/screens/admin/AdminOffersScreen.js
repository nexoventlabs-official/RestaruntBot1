import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  RefreshControl, TouchableOpacity, Image, Alert, ActivityIndicator, Animated, Platform, StatusBar, ImageBackground, Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { colors, spacing, radius, typography, shadows } from '../../theme';

export default function AdminOffersScreen({ navigation }) {
  const [offers, setOffers] = useState([]);
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

  const fetchOffers = async () => {
    try {
      const response = await api.get('/offers');
      setOffers(response.data);
    } catch (error) { console.error('Error fetching offers:', error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    fetchOffers();
    const unsubscribe = navigation.addListener('focus', fetchOffers);
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchOffers(); }, []);

  const toggleActive = async (offer) => {
    try {
      await api.patch(`/offers/${offer._id}/toggle`);
      setOffers(offers.map(o => o._id === offer._id ? { ...o, isActive: !o.isActive } : o));
    } catch (error) { Alert.alert('Error', 'Failed to update offer'); }
  };

  const deleteOffer = (offer) => {
    Alert.alert('Delete Offer', `Are you sure you want to delete "${offer.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { 
          setLoading(true);
          await api.delete(`/offers/${offer._id}`); 
          setOffers(offers.filter(o => o._id !== offer._id)); 
        }
        catch (error) { Alert.alert('Error', 'Failed to delete offer'); }
        finally { setLoading(false); }
      }},
    ]);
  };

  const sendToWhatsApp = async (offer) => {
    Alert.alert(
      'Send to WhatsApp',
      'Send this offer to ALL customers (including old customers) who have phone numbers?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setLoading(true);
              
              const response = await api.post('/whatsapp-broadcast/send-offer', {
                offerImageUrl: offer.image,
                offerTitle: offer.title,
                offerDescription: offer.description,
                offerType: offer.offerType
              });

              setLoading(false);

              if (response.data.success || response.data.sent > 0) {
                const { sent, sentViaInteractive, sentViaTemplate, failed, total, message } = response.data;
                
                let alertMessage = `Total customers: ${total}\n\n`;
                alertMessage += `✅ Successfully sent: ${sent}\n`;
                
                if (sentViaInteractive > 0) {
                  alertMessage += `  • ${sentViaInteractive} via interactive message\n`;
                }
                if (sentViaTemplate > 0) {
                  alertMessage += `  • ${sentViaTemplate} via template\n`;
                }
                
                if (failed > 0) {
                  alertMessage += `\n❌ Failed: ${failed}\n`;
                  
                  // Show failure reasons if available
                  if (response.data.failedContacts && response.data.failedContacts.length > 0) {
                    const reasons = {};
                    response.data.failedContacts.forEach(fc => {
                      const reason = fc.reason || 'unknown';
                      reasons[reason] = (reasons[reason] || 0) + 1;
                    });
                    
                    Object.entries(reasons).forEach(([reason, count]) => {
                      if (reason === '24h_no_template') {
                        alertMessage += `  • ${count} outside 24h window\n`;
                      } else if (reason === 'test_recipient_restriction') {
                        alertMessage += `  • ${count} test restrictions\n`;
                      } else {
                        alertMessage += `  • ${count} ${reason}\n`;
                      }
                    });
                  }
                }
                
                if (!response.data.templateConfigured && failed > 0) {
                  alertMessage += `\n💡 Tip: Configure WhatsApp template to reach more customers`;
                }
                
                Alert.alert('Broadcast Complete', alertMessage);
              } else {
                Alert.alert('Error', response.data.message || response.data.error || 'Failed to send offer');
              }
            } catch (error) {
              setLoading(false);
              const errorMsg = error.response?.data?.error || error.message || 'Failed to send offer to WhatsApp';
              Alert.alert('Error', errorMsg);
              console.error('WhatsApp broadcast error:', error);
            }
          }
        }
      ]
    );
  };

  const renderOffer = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity 
        style={styles.offerCard}
        onPress={() => navigation.navigate('OfferForm', { offer: item })}
        activeOpacity={0.7}
      >
        <View style={styles.offerImageContainer}>
          {item.image ? (
            <Image 
              source={{ uri: `${item.image}?t=${item.updatedAt || Date.now()}` }} 
              style={styles.offerImage} 
              resizeMode="cover" 
            />
          ) : (
            <View style={[styles.offerImage, styles.offerImagePlaceholder]}>
              <Ionicons name="pricetag-outline" size={32} color={colors.light.text.tertiary} />
            </View>
          )}
          
          {/* Offer Type Badge Overlay */}
          {item.offerType && (
            <View style={styles.offerTypeBadge}>
              <Text style={styles.offerTypeText}>{item.offerType}</Text>
            </View>
          )}
          
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#22C55E' : '#EF4444' }]}>
            <Text style={styles.statusBadgeText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
          
          {/* Edit Icon Overlay */}
          <View style={styles.editIconOverlay}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </View>
        </View>
        
        <View style={styles.offerActions}>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.whatsappButton} 
              onPress={(e) => { e.stopPropagation(); sendToWhatsApp(item); }}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={styles.actionButtonText}>Send</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={(e) => { e.stopPropagation(); deleteOffer(item); }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ImageBackground
        source={require('../../../assets/backgrounds/offers.jpg')}
        style={styles.header}
        imageStyle={styles.headerBackgroundImage}
      >
        <View style={styles.headerOverlay}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>Offers & Promotions</Text>
              <Text style={styles.subtitle}>{offers.length} active offers</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('OfferForm', {})} activeOpacity={0.8}>
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
          data={offers}
          renderItem={renderOffer}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          style={styles.flatList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.zomato.red]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="pricetag-outline" size={48} color={colors.light.text.tertiary} />
              </View>
              <Text style={styles.emptyTitle}>No offers yet</Text>
              <Text style={styles.emptyText}>Create your first promotional offer</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('OfferForm', {})} activeOpacity={0.8}>
                <LinearGradient colors={[colors.zomato.red, colors.zomato.darkRed]} style={styles.emptyButtonGradient}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.emptyButtonText}>Create Offer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      
      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.zomato.red} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  flatList: { flex: 1 },
  header: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75, paddingBottom: 55, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  headerBackgroundImage: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerOverlay: { backgroundColor: 'rgba(0, 0, 0, 0.4)', marginTop: -(Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75), marginBottom: -55, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75, paddingBottom: 55, paddingHorizontal: spacing.screenHorizontal, overflow: 'hidden' },
  glassShine: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: 100, backgroundColor: 'rgba(255, 255, 255, 0.3)', transform: [{ skewX: '-20deg' }] },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: typography.display.small.fontSize, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: typography.body.medium.fontSize, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  addButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...shadows.md },
  listContent: { paddingVertical: spacing.md, paddingBottom: 100 },
  offerCard: { 
    backgroundColor: colors.light.surface, 
    borderRadius: 0,
    overflow: 'hidden', 
    marginBottom: spacing.md, 
    ...shadows.card,
    width: '100%',
  },
  offerImageContainer: { 
    width: '100%', 
    backgroundColor: '#f3f4f6', 
    position: 'relative',
    aspectRatio: 16 / 9,
    marginHorizontal: 0,
  },
  offerImage: { 
    width: '100%', 
    height: '100%',
    aspectRatio: 16 / 9,
    resizeMode: 'cover'
  },
  offerImagePlaceholder: { 
    backgroundColor: colors.light.surfaceSecondary, 
    justifyContent: 'center', 
    alignItems: 'center',
    aspectRatio: 16 / 9
  },
  offerTypeBadge: { 
    position: 'absolute', 
    bottom: 12, 
    left: 12, 
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8,
    backdropFilter: 'blur(10px)'
  },
  offerTypeText: { 
    color: '#fff', 
    fontSize: 13, 
    fontWeight: '700',
    letterSpacing: 0.5
  },
  editIconOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)'
  },
  offerActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', padding: spacing.md },
  actionButtons: { flexDirection: 'row', gap: spacing.sm },
  whatsappButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10, 
    backgroundColor: '#D1FAE5', 
  },
  deleteButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10, 
    backgroundColor: '#FEE2E2', 
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.light.surfaceSecondary, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.base },
  emptyTitle: { fontSize: typography.headline.small.fontSize, fontWeight: '600', color: colors.light.text.secondary },
  emptyText: { fontSize: typography.body.medium.fontSize, color: colors.light.text.tertiary, marginTop: spacing.xs },
  emptyButton: { marginTop: spacing.lg, borderRadius: radius.lg, overflow: 'hidden' },
  emptyButtonGradient: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  emptyButtonText: { color: '#fff', fontWeight: '600', fontSize: typography.title.medium.fontSize },
  
  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    ...shadows.lg,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text.primary,
  },
});
