import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { DeliveryNotificationProvider } from './src/context/DeliveryNotificationContext';
import RoleSelectScreen from './src/screens/RoleSelectScreen';
import AdminLoginScreen from './src/screens/admin/AdminLoginScreen';
import DeliveryLoginScreen from './src/screens/delivery/DeliveryLoginScreen';
import AdminTabs from './src/navigation/AdminTabs';
import DeliveryTabs from './src/navigation/DeliveryTabs';
import pushNotifications from './src/services/pushNotifications';
import preloadImages from './src/utils/imagePreloader';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, role, loading } = useAuth();
  const navigationRef = useRef(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    let responseSubscription = null;
    let receivedSubscription = null;

    // Only set up listeners if push notifications are supported
    if (pushNotifications.isSupported()) {
      // Handle notification tap - navigate to Notifications screen
      responseSubscription = pushNotifications.addNotificationResponseListener(response => {
        const data = response.notification.request.content.data;
        console.log('📱 Notification tapped:', data);
        
        // Navigate to Notifications screen based on user role
        if (navigationRef.current) {
          if (role === 'delivery') {
            // Navigate to Home tab, then to Notifications screen
            navigationRef.current.navigate('DeliveryMain', {
              screen: 'Home',
              params: {
                screen: 'Notifications',
              },
            });
          } else if (role === 'admin') {
            // Navigate to Home tab, then to Notifications screen
            navigationRef.current.navigate('AdminMain', {
              screen: 'Home',
              params: {
                screen: 'Notifications',
              },
            });
          }
        }
      });

      // Handle notification received while app is open (foreground)
      // When user taps the banner, it will trigger responseSubscription above
      receivedSubscription = pushNotifications.addNotificationReceivedListener(notification => {
        console.log('📱 Notification received in foreground:', notification.request.content);
        // The notification will automatically show as a banner because of setNotificationHandler
        // User can tap the banner to navigate to Notifications screen
      });

      // Check if app was opened from a notification
      checkInitialNotification();
    }

    // Handle app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - check for any pending notifications
        console.log('📱 App came to foreground');
      }
      appState.current = nextAppState;
    });

    return () => {
      if (responseSubscription) {
        pushNotifications.removeNotificationListener(responseSubscription);
      }
      if (receivedSubscription) {
        pushNotifications.removeNotificationListener(receivedSubscription);
      }
      subscription?.remove();
    };
  }, [role]);

  // Check if app was opened from a notification tap
  const checkInitialNotification = async () => {
    const response = await pushNotifications.getLastNotificationResponse();
    if (response) {
      const data = response.notification.request.content.data;
      console.log('📱 App opened from notification:', data);
      
      // Navigate to Notifications screen based on user role
      setTimeout(() => {
        if (navigationRef.current) {
          if (role === 'delivery') {
            // Navigate to Home tab, then to Notifications screen
            navigationRef.current.navigate('DeliveryMain', {
              screen: 'Home',
              params: {
                screen: 'Notifications',
              },
            });
          } else if (role === 'admin') {
            // Navigate to Home tab, then to Notifications screen
            navigationRef.current.navigate('AdminMain', {
              screen: 'Home',
              params: {
                screen: 'Notifications',
              },
            });
          }
        }
      }, 500);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animation: 'slide_from_right',
        fullScreenGestureEnabled: true,
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
          <Stack.Screen name="DeliveryLogin" component={DeliveryLoginScreen} />
        </>
      ) : role === 'admin' ? (
        <Stack.Screen name="AdminMain" component={AdminTabs} />
      ) : (
        <Stack.Screen name="DeliveryMain" component={DeliveryTabs} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const navigationRef = useRef(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    const loadAssets = async () => {
      await preloadImages();
      setImagesLoaded(true);
    };
    loadAssets();
  }, []);

  // Show loading screen while images are preloading
  if (!imagesLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NotificationProvider>
          <DeliveryNotificationProvider>
            <NavigationContainer ref={navigationRef}>
              <StatusBar style="light" />
              <AppNavigator />
            </NavigationContainer>
          </DeliveryNotificationProvider>
        </NotificationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
});
