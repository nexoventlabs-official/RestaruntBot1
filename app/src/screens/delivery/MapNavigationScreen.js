import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, StatusBar, Linking, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const DELIVERY_GREEN = '#267E3E';

export default function MapNavigationScreen({ route, navigation }) {
  const { destination, destinationAddress, customerName } = route.params;
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLoading(false);
      
      // Auto-open Google Maps navigation
      openGoogleMapsNavigation(location.coords.latitude, location.coords.longitude);
    } catch (err) {
      console.error('Location error:', err);
      setError('Failed to get location');
      setLoading(false);
    }
  };

  const openGoogleMapsNavigation = async (originLat, originLng) => {
    const destLat = destination?.latitude;
    const destLng = destination?.longitude;

    if (!destLat || !destLng) {
      Alert.alert('Error', 'Destination coordinates not available');
      return;
    }

    // Google Maps URL with navigation mode (dir_action=navigate starts turn-by-turn)
    const googleMapsUrl = Platform.select({
      ios: `comgooglemaps://?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&directionsmode=driving&dir_action=navigate`,
      android: `google.navigation:q=${destLat},${destLng}&mode=d`,
    });

    // Fallback to web Google Maps
    const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving&dir_action=navigate`;

    try {
      const canOpen = await Linking.canOpenURL(googleMapsUrl);
      if (canOpen) {
        await Linking.openURL(googleMapsUrl);
      } else {
        // Fallback to web browser
        await Linking.openURL(webUrl);
      }
    } catch (err) {
      console.error('Error opening Google Maps:', err);
      // Try web fallback
      try {
        await Linking.openURL(webUrl);
      } catch (webErr) {
        Alert.alert('Error', 'Unable to open Google Maps. Please install Google Maps app.');
      }
    }
  };

  const handleStartNavigation = () => {
    if (currentLocation) {
      openGoogleMapsNavigation(currentLocation.latitude, currentLocation.longitude);
    } else {
      getCurrentLocation();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DELIVERY_GREEN} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="location-outline" size={64} color="#E23744" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Destination Card */}
        <View style={styles.destinationCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="location" size={32} color={DELIVERY_GREEN} />
          </View>
          <Text style={styles.destinationLabel}>Delivering to</Text>
          <Text style={styles.customerName}>{customerName || 'Customer'}</Text>
          <Text style={styles.destinationAddress} numberOfLines={2}>
            {destinationAddress || 'Customer Address'}
          </Text>
        </View>

        {/* Navigation Button */}
        <TouchableOpacity style={styles.navigationButton} onPress={handleStartNavigation}>
          <Ionicons name="navigate" size={24} color="#fff" />
          <Text style={styles.navigationButtonText}>Start Navigation</Text>
        </TouchableOpacity>

        <Text style={styles.helperText}>
          Opens Google Maps with turn-by-turn directions
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#E23744',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#E23744',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  destinationLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  destinationAddress: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DELIVERY_GREEN,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    gap: 10,
    shadowColor: DELIVERY_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  navigationButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  helperText: {
    marginTop: 16,
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
});
