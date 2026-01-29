import React from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme';

// Import Redesigned Screens
import DeliveryHomeScreen from '../screens/delivery/DeliveryHomeScreenRedesigned';
import MyOrdersScreen from '../screens/delivery/MyOrdersScreenRedesigned';
import DeliveryHistoryScreen from '../screens/delivery/DeliveryHistoryScreenRedesigned';
import DeliveryProfileScreen from '../screens/delivery/DeliveryProfileScreenRedesigned';
import DeliveryOrderDetailScreen from '../screens/delivery/DeliveryOrderDetailScreen';
import MapNavigationScreen from '../screens/delivery/MapNavigationScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Animated Tab Icon
const TabIcon = ({ name, focused, color }) => {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withSpring(1, { damping: 10 })
      );
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={name} size={24} color={color} />
    </Animated.View>
  );
};

// Custom Tab Bar Background (iOS blur effect)
const TabBarBackground = () => (
  Platform.OS === 'ios' ? (
    <BlurView
      intensity={80}
      tint="light"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    />
  ) : null
);

// Stack Navigators for tabs that need detail screens
function MyOrdersStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MyOrdersList" component={MyOrdersScreen} />
      <Stack.Screen name="DeliveryOrderDetail" component={DeliveryOrderDetailScreen} />
      <Stack.Screen name="MapNavigation" component={MapNavigationScreen} />
    </Stack.Navigator>
  );
}

function HistoryStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="HistoryList" component={DeliveryHistoryScreen} />
      <Stack.Screen name="DeliveryOrderDetail" component={DeliveryOrderDetailScreen} />
      <Stack.Screen name="MapNavigation" component={MapNavigationScreen} />
    </Stack.Navigator>
  );
}

export default function DeliveryTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary[400],
        tabBarInactiveTintColor: colors.light.text.tertiary,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.light.surface,
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
            },
            android: {
              elevation: 12,
            },
          }),
        },
        tabBarBackground: TabBarBackground,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'MyOrders') iconName = focused ? 'bicycle' : 'bicycle-outline';
          else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          
          return <TabIcon name={iconName} focused={focused} color={color} />;
        },
      })}
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync();
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={DeliveryHomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="MyOrders" 
        component={MyOrdersStack} 
        options={{ tabBarLabel: 'Orders' }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryStack}
        options={{ tabBarLabel: 'History' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={DeliveryProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
