// Premium Color Palette - Zomato-Inspired Design System

export const colors = {
  // Primary Brand - Zomato Red
  primary: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#E23744',  // Zomato signature red
    500: '#CB1A27',
    600: '#B91C1C',
    700: '#991B1B',
    800: '#7F1D1D',
    900: '#450A0A',
  },
  
  // Secondary - Gold/Premium accent
  secondary: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  
  // Semantic Colors
  success: {
    light: '#DCFCE7',
    main: '#22C55E',
    dark: '#16A34A',
  },
  warning: {
    light: '#FEF3C7',
    main: '#F59E0B',
    dark: '#D97706',
  },
  error: {
    light: '#FEE2E2',
    main: '#EF4444',
    dark: '#DC2626',
  },
  info: {
    light: '#DBEAFE',
    main: '#3B82F6',
    dark: '#2563EB',
  },
  
  // Status Colors (Order States)
  status: {
    pending: '#F59E0B',
    confirmed: '#3B82F6',
    preparing: '#8B5CF6',
    ready: '#10B981',
    outForDelivery: '#06B6D4',
    delivered: '#22C55E',
    cancelled: '#EF4444',
    refunded: '#6B7280',
  },
  
  // Zomato-style Neutrals - Light Mode
  light: {
    background: '#F8F8F8',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSecondary: '#F5F5F5',
    border: '#E8E8E8',
    borderLight: '#F0F0F0',
    text: {
      primary: '#1C1C1C',
      secondary: '#696969',
      tertiary: '#9C9C9C',
      inverse: '#FFFFFF',
    },
  },
  
  // Dark Mode
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    surfaceElevated: '#2D2D2D',
    border: '#3D3D3D',
    borderLight: '#2D2D2D',
    text: {
      primary: '#FFFFFF',
      secondary: '#B3B3B3',
      tertiary: '#808080',
      inverse: '#1C1C1C',
    },
  },
  
  // Zomato specific
  zomato: {
    red: '#E23744',
    darkRed: '#CB1A27',
    gold: '#FBBF24',
    green: '#267E3E',
    lightGreen: '#E8F5E9',
    rating: '#3D9B3D',
    ratingBg: '#E8F5E9',
  },
};

export default colors;
