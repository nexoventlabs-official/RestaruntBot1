import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity, Platform, Text } from 'react-native';
import { useNotifications } from '../context/NotificationContext';

import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminMenuScreen from '../screens/admin/AdminMenuScreen';
import AdminSpecialScreen from '../screens/admin/AdminSpecialScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminDeliveryScreen from '../screens/admin/AdminDeliveryScreen';
import OrderDetailScreen from '../screens/admin/OrderDetailScreen';
import MenuItemFormScreen from '../screens/admin/MenuItemFormScreen';
import SpecialItemFormScreen from '../screens/admin/SpecialItemFormScreen';
import DeliveryFormScreen from '../screens/admin/DeliveryFormScreen';
import AdminOffersScreen from '../screens/admin/AdminOffersScreen';
import OfferFormScreen from '../screens/admin/OfferFormScreen';
import ReportDetailScreen from '../screens/admin/ReportDetailScreen';
import NotificationsScreen from '../screens/admin/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Admin primary colors
const ADMIN_PRIMARY = '#E23744';
const ADMIN_DARK = '#CB1A27';

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
      <Stack.Screen name="HomeMain" component={AdminHomeScreen} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="OrdersList" component={AdminOrdersScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
  );
}

function MenuStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="MenuList" component={AdminMenuScreen} />
      <Stack.Screen name="MenuItemForm" component={MenuItemFormScreen} />
    </Stack.Navigator>
  );
}

function SpecialStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="SpecialList" component={AdminSpecialScreen} />
      <Stack.Screen name="SpecialItemForm" component={SpecialItemFormScreen} />
    </Stack.Navigator>
  );
}

function DeliveryStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="DeliveryList" component={AdminDeliveryScreen} />
      <Stack.Screen name="DeliveryForm" component={DeliveryFormScreen} />
    </Stack.Navigator>
  );
}

function OffersStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="OffersList" component={AdminOffersScreen} />
      <Stack.Screen name="OfferForm" component={OfferFormScreen} />
    </Stack.Navigator>
  );
}

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { newOrdersCount, clearNewOrdersCount } = useNotifications();
  
  // Check if we should hide the tab bar on detail screens
  const currentRoute = state.routes[state.index];
  const focusedRouteName = getFocusedRouteNameFromRoute(currentRoute);
  
  // Hide tab bar on these specific detail screens only
  const hideOnScreens = ['ReportDetail', 'OrderDetail', 'OfferForm', 'DeliveryForm', 'Notifications', 'MenuItemForm', 'SpecialItemForm'];
  if (hideOnScreens.includes(focusedRouteName)) {
    return null;
  }

  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isOrders = route.name === 'Orders';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!event.defaultPrevented) {
            // Reset stack to first screen when tab is pressed
            if (route.name === 'Menu') {
              navigation.navigate(route.name, {
                screen: 'MenuList',
                params: { foodTypeFilter: 'all', resetFilters: true }
              });
            } else if (route.name === 'Special') {
              navigation.navigate(route.name, {
                screen: 'SpecialList'
              });
            } else {
              navigation.navigate(route.name, {
                screen: route.name === 'Orders' ? 'OrdersList' : 
                        route.name === 'Home' ? 'HomeMain' :
                        route.name === 'Offers' ? 'OffersList' :
                        route.name === 'Delivery' ? 'DeliveryList' : undefined
              });
            }
          }
          
          // Clear new orders count when Orders tab is pressed
          if (isOrders && newOrdersCount > 0) {
            clearNewOrdersCount();
          }
        };

        let iconName, label;
        if (route.name === 'Home') {
          iconName = isFocused ? 'home' : 'home-outline';
          label = 'Home';
        } else if (route.name === 'Orders') {
          iconName = isFocused ? 'receipt' : 'receipt-outline';
          label = 'Orders';
        } else if (route.name === 'Special') {
          iconName = isFocused ? 'star' : 'star-outline';
          label = 'Special';
        } else if (route.name === 'Menu') {
          iconName = isFocused ? 'restaurant' : 'restaurant-outline';
          label = 'Menu';
        } else if (route.name === 'Offers') {
          iconName = isFocused ? 'pricetag' : 'pricetag-outline';
          label = 'Offers';
        } else if (route.name === 'Delivery') {
          iconName = isFocused ? 'bicycle' : 'bicycle-outline';
          label = 'Delivery';
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={iconName}
                size={22}
                color={isFocused ? ADMIN_PRIMARY : '#9CA3AF'}
              />
              {isOrders && newOrdersCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {newOrdersCount > 99 ? '99+' : newOrdersCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default function AdminTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Orders" component={OrdersStack} />
      <Tab.Screen name="Special" component={SpecialStack} />
      <Tab.Screen name="Menu" component={MenuStack} />
      <Tab.Screen name="Offers" component={OffersStack} />
      <Tab.Screen name="Delivery" component={DeliveryStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: ADMIN_PRIMARY,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: ADMIN_PRIMARY,
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
