import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Original Admin Screens (unchanged)
import RoleSelectScreen from './src/screens/RoleSelectScreen';
import AdminLoginScreen from './src/screens/admin/AdminLoginScreen';
import AdminTabs from './src/navigation/AdminTabs';

// Redesigned Delivery Screens
import DeliveryLoginScreen from './src/screens/delivery/DeliveryLoginScreenRedesigned';
import DeliveryTabs from './src/navigation/DeliveryTabsRedesigned';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, role, loading } = useAuth();
  const { isDark } = useTheme();

  if (loading) {
    return null;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
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
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
