import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useDeliveryNotifications } from '../context/DeliveryNotificationContext';

import DeliveryHomeScreen from '../screens/delivery/DeliveryHomeScreen';
import MyOrdersScreen from '../screens/delivery/MyOrdersScreen';
import DeliveryHistoryScreen from '../screens/delivery/DeliveryHistoryScreen';
import DeliveryProfileScreen from '../screens/delivery/DeliveryProfileScreen';
import DeliveryOrderDetailScreen from '../screens/delivery/DeliveryOrderDetailScreen';
import MapNavigationScreen from '../screens/delivery/MapNavigationScreen';
import DeliveryNotificationsScreen from '../screens/delivery/DeliveryNotificationsScreen';
import DeliveryHelpSupportScreen from '../screens/delivery/DeliveryHelpSupportScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Shared stack screen options with gestures enabled
const stackScreenOptions = {
  headerShown: false,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  animation: 'slide_from_right',
  fullScreenGestureEnabled: true, // iOS full screen swipe
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="HomeMain" component={DeliveryHomeScreen} />
      <Stack.Screen name="Notifications" component={DeliveryNotificationsScreen} />
    </Stack.Navigator>
  );
}

function MyOrdersStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="MyOrdersList" component={MyOrdersScreen} />
      <Stack.Screen name="DeliveryOrderDetail" component={DeliveryOrderDetailScreen} />
      <Stack.Screen name="MapNavigation" component={MapNavigationScreen} />
    </Stack.Navigator>
  );
}

function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="HistoryList" component={DeliveryHistoryScreen} />
      <Stack.Screen name="DeliveryOrderDetail" component={DeliveryOrderDetailScreen} />
      <Stack.Screen name="MapNavigation" component={MapNavigationScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="ProfileMain" component={DeliveryProfileScreen} />
      <Stack.Screen name="Notifications" component={DeliveryNotificationsScreen} />
      <Stack.Screen name="HelpSupport" component={DeliveryHelpSupportScreen} />
    </Stack.Navigator>
  );
}

const DELIVERY_GREEN = '#267E3E';

// Tab icon with badge component
const TabIconWithBadge = ({ iconName, color, size, badgeCount }) => (
  <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
    <Ionicons name={iconName} size={size} color={color} />
    {badgeCount > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </Text>
      </View>
    )}
  </View>
);

export default function DeliveryTabs() {
  const { newOrdersCount, clearNewOrdersCount } = useDeliveryNotifications();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: DELIVERY_GREEN,
        tabBarInactiveTintColor: '#61636b',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 24,
          paddingTop: 8,
          height: 80,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'MyOrders') iconName = focused ? 'bicycle' : 'bicycle-outline';
          else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          
          // Show badge on MyOrders tab
          if (route.name === 'MyOrders') {
            return <TabIconWithBadge iconName={iconName} color={color} size={size} badgeCount={newOrdersCount} />;
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Home', { screen: 'HomeMain' });
          },
        })}
      />
      <Tab.Screen 
        name="MyOrders" 
        component={MyOrdersStack} 
        options={{ title: 'My Orders' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('MyOrders', { screen: 'MyOrdersList' });
            if (newOrdersCount > 0) {
              clearNewOrdersCount();
            }
          },
        })}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('History', { screen: 'HistoryList' });
          },
        })}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Profile', { screen: 'ProfileMain' });
          },
        })}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: DELIVERY_GREEN,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
