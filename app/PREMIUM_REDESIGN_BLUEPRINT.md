# 🚀 Premium Food Delivery Partner App Redesign Blueprint

## Executive Summary

Transform your functional delivery app into a **Zomato/Uber Eats-level premium experience** while preserving all existing business logic. This blueprint covers design system, screen-by-screen improvements, animations, and implementation details.

---

## 1️⃣ UI/UX AUDIT - Current State Analysis

### ✅ What's Working Well
- Clean component structure with good separation
- Consistent use of Ionicons
- Basic color palette established (#2a9d8f primary)
- Functional navigation with bottom tabs
- Good use of SafeAreaView and KeyboardAvoidingView

### ⚠️ Areas for Improvement

| Area | Current Issue | Impact |
|------|---------------|--------|
| **Typography** | Single font weight, inconsistent sizing | Low visual hierarchy |
| **Spacing** | Inconsistent padding/margins | Cluttered feel |
| **Cards** | Flat, no elevation or depth | Lacks premium feel |
| **Colors** | Limited palette, no dark mode | Basic appearance |
| **Animations** | None present | Static, unengaging |
| **Loading States** | Basic ActivityIndicator | Jarring experience |
| **Empty States** | Minimal styling | Missed engagement opportunity |
| **Touch Feedback** | Default opacity only | Lacks tactile response |
| **Status Indicators** | Small, hard to scan | Reduced usability |


---

## 2️⃣ DESIGN SYSTEM DEFINITION

### Color Palette

```javascript
// app/src/theme/colors.js
export const colors = {
  // Primary Brand
  primary: {
    50: '#E6F7F5',
    100: '#B3E8E2',
    200: '#80D9CF',
    300: '#4DCABC',
    400: '#2A9D8F',  // Main brand color
    500: '#238377',
    600: '#1C695F',
    700: '#155047',
    800: '#0E362F',
    900: '#071C18',
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
    preparing: '#F97316',
    ready: '#10B981',
    outForDelivery: '#06B6D4',
    delivered: '#22C55E',
    cancelled: '#EF4444',
  },
  
  // Neutrals - Light Mode
  light: {
    background: '#FAFBFC',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF',
    },
  },
  
  // Neutrals - Dark Mode
  dark: {
    background: '#0F172A',
    surface: '#1E293B',
    surfaceElevated: '#334155',
    border: '#334155',
    borderLight: '#475569',
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      tertiary: '#64748B',
      inverse: '#0F172A',
    },
  },
};
```

### Typography Scale

```javascript
// app/src/theme/typography.js
export const typography = {
  // Font Families (use system fonts for performance)
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  
  // Type Scale
  display: {
    large: { fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
    medium: { fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.25 },
    small: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  },
  headline: {
    large: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
    medium: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
    small: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  },
  title: {
    large: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
    medium: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
    small: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  },
  body: {
    large: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
    medium: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
    small: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  },
  label: {
    large: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
    medium: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
    small: { fontSize: 10, lineHeight: 14, fontWeight: '500', letterSpacing: 0.5 },
  },
};
```

### Spacing System

```javascript
// app/src/theme/spacing.js
export const spacing = {
  // Base unit: 4px
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  
  // Screen padding
  screenHorizontal: 20,
  screenVertical: 16,
  
  // Component spacing
  cardPadding: 16,
  cardGap: 12,
  sectionGap: 24,
  listItemGap: 12,
};
```

### Border Radius

```javascript
// app/src/theme/radius.js
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
  
  // Semantic
  button: 12,
  card: 16,
  input: 12,
  badge: 20,
  avatar: 9999,
  bottomSheet: 24,
};
```

### Elevation & Shadows

```javascript
// app/src/theme/shadows.js
import { Platform } from 'react-native';

export const shadows = {
  none: {},
  
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
  }),
  
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
  }),
  
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 6 },
  }),
  
  xl: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
    },
    android: { elevation: 12 },
  }),
};
```


### Component Styles

```javascript
// app/src/theme/components.js
import { colors, radius, shadows, spacing } from './index';

export const components = {
  // Buttons
  button: {
    primary: {
      backgroundColor: colors.primary[400],
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: radius.button,
      ...shadows.md,
    },
    secondary: {
      backgroundColor: colors.primary[50],
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: radius.button,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary[400],
      paddingVertical: 15,
      paddingHorizontal: 24,
      borderRadius: radius.button,
    },
    ghost: {
      backgroundColor: 'transparent',
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
    sizes: {
      sm: { height: 40, paddingHorizontal: 16 },
      md: { height: 48, paddingHorizontal: 20 },
      lg: { height: 56, paddingHorizontal: 24 },
      xl: { height: 64, paddingHorizontal: 32 },
    },
  },
  
  // Cards
  card: {
    base: {
      backgroundColor: colors.light.surface,
      borderRadius: radius.card,
      padding: spacing.cardPadding,
      ...shadows.md,
    },
    elevated: {
      backgroundColor: colors.light.surface,
      borderRadius: radius.card,
      padding: spacing.cardPadding,
      ...shadows.lg,
    },
    outlined: {
      backgroundColor: colors.light.surface,
      borderRadius: radius.card,
      padding: spacing.cardPadding,
      borderWidth: 1,
      borderColor: colors.light.border,
    },
  },
  
  // Input Fields
  input: {
    base: {
      height: 56,
      backgroundColor: colors.light.surface,
      borderRadius: radius.input,
      paddingHorizontal: spacing.base,
      borderWidth: 1.5,
      borderColor: colors.light.border,
    },
    focused: {
      borderColor: colors.primary[400],
      borderWidth: 2,
    },
    error: {
      borderColor: colors.error.main,
      borderWidth: 2,
    },
  },
  
  // Badges & Chips
  badge: {
    base: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.badge,
    },
    sizes: {
      sm: { paddingHorizontal: 8, paddingVertical: 4 },
      md: { paddingHorizontal: 12, paddingVertical: 6 },
      lg: { paddingHorizontal: 16, paddingVertical: 8 },
    },
  },
  
  // Status Badges
  statusBadge: {
    preparing: {
      backgroundColor: '#FFF7ED',
      color: '#EA580C',
    },
    ready: {
      backgroundColor: '#ECFDF5',
      color: '#059669',
    },
    outForDelivery: {
      backgroundColor: '#ECFEFF',
      color: '#0891B2',
    },
    delivered: {
      backgroundColor: '#F0FDF4',
      color: '#16A34A',
    },
  },
};
```

---

## 3️⃣ SCREEN-BY-SCREEN REDESIGN

### 🔐 Login Screen

**Current Issues:**
- Basic icon container
- Standard input fields
- No visual interest

**Premium Improvements:**

```
┌─────────────────────────────────┐
│                                 │
│     ┌─────────────────────┐     │
│     │   🛵 Animated Logo  │     │  ← Lottie animation
│     │   with motion       │     │
│     └─────────────────────┘     │
│                                 │
│     Delivery Partner            │  ← Display Large
│     Start your journey          │  ← Body Medium, muted
│                                 │
│  ┌─────────────────────────────┐│
│  │ 📧  Email                   ││  ← Floating label input
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 🔒  Password            👁  ││  ← With visibility toggle
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │         LOGIN →             ││  ← Full-width, elevated
│  └─────────────────────────────┘│
│                                 │
│     Forgot Password?            │  ← Ghost button
│                                 │
└─────────────────────────────────┘
```

**Key Changes:**
- Animated logo using Lottie (delivery bike animation)
- Floating label inputs with smooth transitions
- Gradient or solid primary button with press animation
- Subtle background pattern or gradient
- Haptic feedback on button press


### 🏠 Home Screen (Dashboard)

**Current Issues:**
- Flat stat cards
- Basic online toggle
- Tips card feels disconnected

**Premium Improvements:**

```
┌─────────────────────────────────┐
│ ┌──────────────────────────────┐│
│ │ 👤 Avatar    Welcome back    ││  ← Gradient header
│ │             John Doe      🔔 ││
│ └──────────────────────────────┘│
│                                 │
│ ┌──────────────────────────────┐│
│ │  🟢 You're Online            ││  ← Prominent toggle card
│ │  ━━━━━━━━━━━━━━━━━━━━━━ ⚪   ││     with pulse animation
│ │  Ready to receive orders     ││
│ └──────────────────────────────┘│
│                                 │
│  Today's Performance            │
│ ┌─────────────┐ ┌─────────────┐ │
│ │ ₹1,240      │ │ 8           │ │  ← Animated counters
│ │ Earnings    │ │ Deliveries  │ │
│ │ ↑ 12%       │ │ ↑ 2 more    │ │  ← Comparison badges
│ └─────────────┘ └─────────────┘ │
│                                 │
│ ┌─────────────┐ ┌─────────────┐ │
│ │ 2           │ │ ⭐ 4.8      │ │
│ │ Active      │ │ Rating      │ │
│ └─────────────┘ └─────────────┘ │
│                                 │
│  Quick Actions                  │
│ ┌──────────────────────────────┐│
│ │ 📋 View Available Orders  →  ││  ← Action cards
│ └──────────────────────────────┘│
│ ┌──────────────────────────────┐│
│ │ 📊 Today's Earnings       →  ││
│ └──────────────────────────────┘│
│                                 │
└─────────────────────────────────┘
```

**Key Changes:**
- Gradient header with avatar and notification bell
- Large, prominent online/offline toggle with animation
- Stat cards with animated number counters
- Comparison indicators (vs yesterday)
- Quick action cards for common tasks
- Pull-to-refresh with custom animation

### 📦 My Orders Screen

**Current Issues:**
- Dense information layout
- Small action buttons
- No visual priority

**Premium Improvements:**

```
┌─────────────────────────────────┐
│  My Orders                      │
│  2 active deliveries            │
│                                 │
│ ┌──────────────────────────────┐│
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━ ││  ← Progress indicator
│ │ 🟠 READY FOR PICKUP          ││  ← Large status badge
│ │                              ││
│ │ #ORD-2847                    ││
│ │ ┌────────────────────────┐   ││
│ │ │ 👤 Rahul Sharma        │   ││  ← Customer card
│ │ │ 📞 +91 98765 43210  📱 │   ││     with call button
│ │ └────────────────────────┘   ││
│ │                              ││
│ │ 📍 123 MG Road, Koramangala  ││  ← Tappable address
│ │    Bangalore - 560034     🗺 ││     with map icon
│ │                              ││
│ │ ┌────────────────────────┐   ││
│ │ │ 🍔 Burger x2           │   ││  ← Collapsible items
│ │ │ 🍟 Fries x1            │   ││
│ │ │ +2 more items          │   ││
│ │ └────────────────────────┘   ││
│ │                              ││
│ │ ₹450  •  💵 COD              ││  ← Amount + payment
│ │                              ││
│ │ ┌────────────────────────┐   ││
│ │ │   🚴 START DELIVERY    │   ││  ← Full-width CTA
│ │ └────────────────────────┘   ││
│ └──────────────────────────────┘│
│                                 │
└─────────────────────────────────┘
```

**Key Changes:**
- Progress bar showing delivery stage
- Large, scannable status badges
- Customer info in a dedicated card with quick-call
- Collapsible order items section
- Full-width primary action button
- Swipe actions for quick operations


### 📋 Order Detail Screen

**Current Issues:**
- Sections feel disconnected
- Timeline is basic
- Navigate button could be more prominent

**Premium Improvements:**

```
┌─────────────────────────────────┐
│ ← Order #ORD-2847               │
│                                 │
│ ┌──────────────────────────────┐│
│ │     🟢 OUT FOR DELIVERY      ││  ← Large status pill
│ │     Estimated: 15 mins       ││     with ETA
│ └──────────────────────────────┘│
│                                 │
│ ┌──────────────────────────────┐│
│ │ 📍 DELIVERY LOCATION         ││
│ │                              ││
│ │ 123 MG Road, Koramangala     ││
│ │ Near Cafe Coffee Day         ││
│ │ Bangalore - 560034           ││
│ │                              ││
│ │ ┌────────────────────────┐   ││
│ │ │  🗺  NAVIGATE NOW      │   ││  ← Prominent nav button
│ │ └────────────────────────┘   ││
│ └──────────────────────────────┘│
│                                 │
│ ┌──────────────────────────────┐│
│ │ 👤 CUSTOMER                  ││
│ │                              ││
│ │ Rahul Sharma                 ││
│ │ ┌──────────┐ ┌──────────┐    ││
│ │ │ 📞 Call  │ │ 💬 Chat  │    ││  ← Action buttons
│ │ └──────────┘ └──────────┘    ││
│ └──────────────────────────────┘│
│                                 │
│ ┌──────────────────────────────┐│
│ │ 🛒 ORDER ITEMS               ││
│ │                              ││
│ │ Chicken Burger        x2 ₹300││
│ │ French Fries          x1 ₹100││
│ │ Coke                  x2  ₹50││
│ │ ─────────────────────────────││
│ │ Subtotal                 ₹450││
│ │ Delivery Fee              ₹30││
│ │ ─────────────────────────────││
│ │ Total                    ₹480││
│ └──────────────────────────────┘│
│                                 │
│ ┌──────────────────────────────┐│
│ │ 📜 ORDER TIMELINE            ││
│ │                              ││
│ │ ● Order Placed      10:30 AM ││  ← Visual timeline
│ │ │                            ││
│ │ ● Preparing         10:35 AM ││
│ │ │                            ││
│ │ ● Ready for Pickup  10:50 AM ││
│ │ │                            ││
│ │ ◐ Out for Delivery  11:00 AM ││  ← Current step
│ │                              ││
│ └──────────────────────────────┘│
│                                 │
│ ┌──────────────────────────────┐│
│ │    ✅ MARK AS DELIVERED      ││  ← Sticky bottom CTA
│ └──────────────────────────────┘│
└─────────────────────────────────┘
```

**Key Changes:**
- Large status badge with ETA
- Prominent navigation card
- Customer section with quick actions
- Visual timeline with current step highlighted
- Sticky bottom action button
- Smooth scroll with parallax header

### 📍 Available Orders Screen

**Premium Improvements:**

```
┌─────────────────────────────────┐
│  Available Orders               │
│  5 orders nearby                │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Sort: Distance ▼  Filter 🔽 ││  ← Sort/filter bar
│  └─────────────────────────────┘│
│                                 │
│ ┌──────────────────────────────┐│
│ │ 🟡 PREPARING                 ││
│ │ #ORD-2850  •  2.3 km away    ││
│ │                              ││
│ │ 📍 HSR Layout, Sector 2      ││
│ │ 🛒 3 items  •  ₹380          ││
│ │                              ││
│ │ 💵 Cash on Delivery          ││  ← Payment badge
│ │                              ││
│ │ ┌────────────────────────┐   ││
│ │ │    🤚 CLAIM ORDER      │   ││
│ │ └────────────────────────┘   ││
│ └──────────────────────────────┘│
│                                 │
│ ┌──────────────────────────────┐│
│ │ 🟡 PREPARING                 ││
│ │ #ORD-2851  •  3.1 km away    ││
│ │ ...                          ││
│ └──────────────────────────────┘│
│                                 │
└─────────────────────────────────┘
```

**Key Changes:**
- Distance indicator for each order
- Sort and filter options
- Payment method prominently displayed
- Swipe-to-claim gesture option
- Real-time order count updates


### 📊 History Screen

**Premium Improvements:**

```
┌─────────────────────────────────┐
│  Delivery History               │
│                                 │
│  ┌─────────────────────────────┐│
│  │ This Week                   ││
│  │ ₹4,280 earned • 32 orders   ││  ← Summary card
│  │ ████████████░░░░ 80% goal   ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ Today  •  Jan 9             ││  ← Date headers
│  └─────────────────────────────┘│
│                                 │
│ ┌──────────────────────────────┐│
│ │ ✅ #ORD-2847                 ││
│ │ Rahul Sharma • HSR Layout    ││
│ │ ₹450 • 11:30 AM              ││
│ │                           →  ││
│ └──────────────────────────────┘│
│                                 │
│ ┌──────────────────────────────┐│
│ │ ✅ #ORD-2845                 ││
│ │ Priya Patel • Koramangala    ││
│ │ ₹320 • 10:15 AM              ││
│ │                           →  ││
│ └──────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ Yesterday  •  Jan 8         ││
│  └─────────────────────────────┘│
│  ...                            │
│                                 │
└─────────────────────────────────┘
```

**Key Changes:**
- Weekly summary card with progress
- Grouped by date with sticky headers
- Compact order cards
- Quick stats visible at glance

### 👤 Profile Screen

**Premium Improvements:**

```
┌─────────────────────────────────┐
│                                 │
│ ┌──────────────────────────────┐│
│ │      ┌─────────────┐         ││
│ │      │   👤 Photo  │         ││  ← Large avatar
│ │      │   + Edit    │         ││     with edit option
│ │      └─────────────┘         ││
│ │                              ││
│ │      John Doe                ││
│ │      ⭐ 4.8 (156 ratings)    ││
│ │                              ││
│ │  ┌────────┐ ┌────────┐       ││
│ │  │  245   │ │ ₹24.5K │       ││  ← Stats row
│ │  │Delivers│ │Earnings│       ││
│ │  └────────┘ └────────┘       ││
│ └──────────────────────────────┘│
│                                 │
│  Account                        │
│ ┌──────────────────────────────┐│
│ │ 📧 Email                  →  ││
│ │ john@email.com               ││
│ ├──────────────────────────────┤│
│ │ 📱 Phone                  →  ││
│ │ +91 98765 43210              ││
│ ├──────────────────────────────┤│
│ │ 🎂 Date of Birth          →  ││
│ │ 15 March 1995                ││
│ └──────────────────────────────┘│
│                                 │
│  Settings                       │
│ ┌──────────────────────────────┐│
│ │ 🔒 Change Password        →  ││
│ ├──────────────────────────────┤│
│ │ 🌙 Dark Mode              ⚪ ││  ← Theme toggle
│ ├──────────────────────────────┤│
│ │ 🔔 Notifications          →  ││
│ ├──────────────────────────────┤│
│ │ 📄 Documents              →  ││
│ └──────────────────────────────┘│
│                                 │
│ ┌──────────────────────────────┐│
│ │ 🚪 Logout                    ││  ← Destructive action
│ └──────────────────────────────┘│
│                                 │
│  v1.0.0                         │
└─────────────────────────────────┘
```

**Key Changes:**
- Hero section with large avatar
- Stats prominently displayed
- Grouped settings with icons
- Dark mode toggle
- Documents section for KYC

---

## 4️⃣ UX INTERACTIONS & MOTION

### Loading States

```javascript
// Skeleton Loading Component
const SkeletonCard = () => (
  <Animated.View style={[styles.skeleton, animatedStyle]}>
    <View style={styles.skeletonHeader}>
      <View style={styles.skeletonCircle} />
      <View style={styles.skeletonLines}>
        <View style={[styles.skeletonLine, { width: '60%' }]} />
        <View style={[styles.skeletonLine, { width: '40%' }]} />
      </View>
    </View>
    <View style={[styles.skeletonLine, { width: '100%', height: 80 }]} />
    <View style={[styles.skeletonLine, { width: '70%' }]} />
  </Animated.View>
);

// Shimmer effect using Reanimated
const shimmerAnimation = useSharedValue(0);

useEffect(() => {
  shimmerAnimation.value = withRepeat(
    withTiming(1, { duration: 1000 }),
    -1,
    false
  );
}, []);
```

### Empty States

```javascript
// Premium Empty State Component
const EmptyState = ({ icon, title, subtitle, action }) => (
  <View style={styles.emptyContainer}>
    <LottieView
      source={require('../assets/animations/empty-box.json')}
      autoPlay
      loop
      style={styles.emptyAnimation}
    />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
    {action && (
      <TouchableOpacity style={styles.emptyAction}>
        <Text style={styles.emptyActionText}>{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
);
```

### Error States

```javascript
// Error State with Retry
const ErrorState = ({ message, onRetry }) => (
  <View style={styles.errorContainer}>
    <Ionicons name="cloud-offline-outline" size={64} color="#EF4444" />
    <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
    <Text style={styles.errorMessage}>{message}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Ionicons name="refresh" size={20} color="#fff" />
      <Text style={styles.retryText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);
```

### Toast Notifications

```javascript
// Custom Toast Component
const Toast = ({ type, message, visible }) => {
  const translateY = useSharedValue(-100);
  
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15 });
      // Auto dismiss
      setTimeout(() => {
        translateY.value = withTiming(-100);
      }, 3000);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const icons = {
    success: 'checkmark-circle',
    error: 'close-circle',
    warning: 'warning',
    info: 'information-circle',
  };

  return (
    <Animated.View style={[styles.toast, styles[`toast_${type}`], animatedStyle]}>
      <Ionicons name={icons[type]} size={24} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};
```


### Animations & Transitions

```javascript
// Screen Transitions
const screenOptions = {
  animation: 'slide_from_right',
  animationDuration: 250,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};

// Card Press Animation
const CardPressable = ({ children, onPress }) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// Button Press Animation with Haptics
const AnimatedButton = ({ onPress, children, style }) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.95, { duration: 50 }),
      withSpring(1, { damping: 10 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// Pull to Refresh Animation
const RefreshIndicator = ({ refreshing }) => {
  const rotation = useSharedValue(0);
  
  useEffect(() => {
    if (refreshing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1
      );
    } else {
      rotation.value = 0;
    }
  }, [refreshing]);

  return (
    <Animated.View style={useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }))}>
      <Ionicons name="refresh" size={24} color="#2a9d8f" />
    </Animated.View>
  );
};

// Number Counter Animation
const AnimatedCounter = ({ value, duration = 1000 }) => {
  const animatedValue = useSharedValue(0);
  
  useEffect(() => {
    animatedValue.value = withTiming(value, { duration });
  }, [value]);

  const animatedText = useDerivedValue(() => {
    return Math.round(animatedValue.value).toString();
  });

  return <ReText text={animatedText} style={styles.counterText} />;
};

// Status Badge Pulse Animation
const PulsingDot = ({ color, active }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1
      );
    }
  }, [active]);

  return (
    <View style={styles.dotContainer}>
      <Animated.View style={[
        styles.pulseRing,
        { backgroundColor: color },
        useAnimatedStyle(() => ({
          transform: [{ scale: scale.value }],
          opacity: opacity.value,
        }))
      ]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
};
```

### Haptic Feedback

```javascript
// Haptic Feedback Utility
import * as Haptics from 'expo-haptics';

export const haptics = {
  // Light tap - for toggles, selections
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  
  // Medium tap - for button presses
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  
  // Heavy tap - for important actions
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  
  // Success - for completed actions
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  
  // Warning - for alerts
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  
  // Error - for failures
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  
  // Selection - for picker changes
  selection: () => Haptics.selectionAsync(),
};

// Usage in components
const handleClaimOrder = async () => {
  haptics.medium();
  // ... claim logic
  haptics.success();
};

const handleToggleOnline = (value) => {
  haptics.selection();
  setIsOnline(value);
};
```


---

## 5️⃣ DEVELOPER IMPLEMENTATION GUIDE

### Step 1: Install Required Dependencies

```bash
cd app

# Core UI Libraries
npx expo install react-native-reanimated
npx expo install react-native-gesture-handler

# Haptic Feedback
npx expo install expo-haptics

# Animations
npx expo install lottie-react-native

# Linear Gradient (for premium backgrounds)
npx expo install expo-linear-gradient

# Blur effects
npx expo install expo-blur
```

### Step 2: Configure Babel for Reanimated

```javascript
// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // Must be last
  };
};
```

### Step 3: Create Theme Structure

```
app/src/
├── theme/
│   ├── index.js          # Export all theme values
│   ├── colors.js         # Color palette
│   ├── typography.js     # Font styles
│   ├── spacing.js        # Spacing scale
│   ├── radius.js         # Border radius
│   ├── shadows.js        # Elevation styles
│   └── components.js     # Component presets
├── components/
│   ├── ui/
│   │   ├── Button.js
│   │   ├── Card.js
│   │   ├── Input.js
│   │   ├── Badge.js
│   │   ├── Avatar.js
│   │   ├── Skeleton.js
│   │   ├── Toast.js
│   │   └── EmptyState.js
│   └── common/
│       ├── Header.js
│       ├── StatusBadge.js
│       └── OrderCard.js
├── hooks/
│   ├── useTheme.js       # Theme context hook
│   └── useHaptics.js     # Haptic feedback hook
└── context/
    └── ThemeContext.js   # Dark/Light mode
```

### Step 4: Create Theme Context

```javascript
// app/src/context/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const saved = await AsyncStorage.getItem('theme');
    if (saved) {
      setIsDark(saved === 'dark');
    } else {
      setIsDark(systemScheme === 'dark');
    }
  };

  const toggleTheme = async () => {
    const newValue = !isDark;
    setIsDark(newValue);
    await AsyncStorage.setItem('theme', newValue ? 'dark' : 'light');
  };

  const theme = {
    isDark,
    colors: isDark ? colors.dark : colors.light,
    primary: colors.primary,
    status: colors.status,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

### Step 5: Create Reusable Components

```javascript
// app/src/components/ui/Button.js
import React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  const variants = {
    primary: {
      backgroundColor: theme.primary[400],
      textColor: '#FFFFFF',
    },
    secondary: {
      backgroundColor: theme.primary[50],
      textColor: theme.primary[400],
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: theme.primary[400],
      textColor: theme.primary[400],
    },
    danger: {
      backgroundColor: theme.error.main,
      textColor: '#FFFFFF',
    },
  };

  const sizes = {
    sm: { height: 40, paddingHorizontal: 16, fontSize: 14 },
    md: { height: 48, paddingHorizontal: 20, fontSize: 16 },
    lg: { height: 56, paddingHorizontal: 24, fontSize: 18 },
  };

  const currentVariant = variants[variant];
  const currentSize = sizes[size];

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        {
          height: currentSize.height,
          paddingHorizontal: currentSize.paddingHorizontal,
          backgroundColor: currentVariant.backgroundColor,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.5 : 1,
          borderWidth: currentVariant.borderWidth || 0,
          borderColor: currentVariant.borderColor,
        },
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={currentVariant.textColor} />
      ) : (
        <>
          {icon}
          <Text style={{
            color: currentVariant.textColor,
            fontSize: currentSize.fontSize,
            fontWeight: '600',
          }}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
};
```


```javascript
// app/src/components/ui/Card.js
import React from 'react';
import { Pressable, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Card = ({ 
  children, 
  onPress, 
  variant = 'elevated',
  style,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const shadows = {
    elevated: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
    flat: {},
    outlined: {
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={!onPress}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 16,
          ...shadows[variant],
        },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
};
```

```javascript
// app/src/components/ui/StatusBadge.js
import React from 'react';
import { View, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat,
  withSequence,
  withTiming 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const STATUS_CONFIG = {
  preparing: {
    label: 'Preparing',
    icon: 'restaurant-outline',
    bg: '#FFF7ED',
    color: '#EA580C',
  },
  ready: {
    label: 'Ready for Pickup',
    icon: 'checkmark-circle-outline',
    bg: '#ECFDF5',
    color: '#059669',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    icon: 'bicycle-outline',
    bg: '#ECFEFF',
    color: '#0891B2',
  },
  delivered: {
    label: 'Delivered',
    icon: 'checkmark-done-circle',
    bg: '#F0FDF4',
    color: '#16A34A',
  },
};

export const StatusBadge = ({ status, size = 'md', showPulse = false }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.preparing;
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  React.useEffect(() => {
    if (showPulse) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 600 }),
          withTiming(0.5, { duration: 600 })
        ),
        -1
      );
    }
  }, [showPulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const sizes = {
    sm: { paddingH: 8, paddingV: 4, fontSize: 11, iconSize: 12 },
    md: { paddingH: 12, paddingV: 6, fontSize: 13, iconSize: 14 },
    lg: { paddingH: 16, paddingV: 8, fontSize: 15, iconSize: 18 },
  };

  const s = sizes[size];

  return (
    <View style={{ position: 'relative' }}>
      {showPulse && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: config.color,
              borderRadius: 20,
            },
            pulseStyle,
          ]}
        />
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: config.bg,
          paddingHorizontal: s.paddingH,
          paddingVertical: s.paddingV,
          borderRadius: 20,
        }}
      >
        <Ionicons name={config.icon} size={s.iconSize} color={config.color} />
        <Text style={{ 
          fontSize: s.fontSize, 
          fontWeight: '600', 
          color: config.color 
        }}>
          {config.label}
        </Text>
      </View>
    </View>
  );
};
```

```javascript
// app/src/components/ui/Skeleton.js
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

export const Skeleton = ({ width, height, borderRadius = 8, style }) => {
  const { theme } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          shimmer.value,
          [0, 1],
          [-width, width]
        ),
      },
    ],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.isDark ? '#334155' : '#E5E7EB',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
};

// Order Card Skeleton
export const OrderCardSkeleton = () => (
  <View style={{ 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12 
  }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
      <Skeleton width={80} height={20} />
      <Skeleton width={100} height={24} borderRadius={12} />
    </View>
    <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
    <Skeleton width="70%" height={16} style={{ marginBottom: 16 }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Skeleton width={60} height={24} />
      <Skeleton width={120} height={44} borderRadius={8} />
    </View>
  </View>
);
```


### Step 6: Implement Screen Redesigns

Here's the redesigned Login Screen as a reference implementation:

```javascript
// app/src/screens/delivery/DeliveryLoginScreen.js (Redesigned)
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView, 
  Alert, KeyboardAvoidingView, Platform, Pressable
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { colors, spacing, radius, typography } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function DeliveryLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { loginDelivery } = useAuth();
  
  const passwordRef = useRef(null);
  const logoScale = useSharedValue(1);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Missing Information', 'Please enter email and password');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await loginDelivery(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Login Failed', error.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const handleLogoPress = () => {
    logoScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { damping: 10 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E6F7F5', '#FAFBFC']}
        style={StyleSheet.absoluteFill}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.content}
      >
        {/* Back Button */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Pressable 
            style={styles.backButton} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.light.text.primary} />
          </Pressable>
        </Animated.View>

        {/* Logo & Header */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.header}
        >
          <AnimatedPressable onPress={handleLogoPress}>
            <Animated.View style={[styles.iconContainer, logoAnimatedStyle]}>
              <LinearGradient
                colors={[colors.primary[400], colors.primary[500]]}
                style={styles.iconGradient}
              >
                <Ionicons name="bicycle" size={48} color="#fff" />
              </LinearGradient>
            </Animated.View>
          </AnimatedPressable>
          
          <Text style={styles.title}>Delivery Partner</Text>
          <Text style={styles.subtitle}>Login to start delivering</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View 
          entering={FadeInUp.delay(400).duration(600)}
          style={styles.form}
        >
          {/* Email Input */}
          <View style={[
            styles.inputContainer,
            emailFocused && styles.inputFocused
          ]}>
            <Ionicons 
              name="mail-outline" 
              size={20} 
              color={emailFocused ? colors.primary[400] : colors.light.text.tertiary} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.light.text.tertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          {/* Password Input */}
          <View style={[
            styles.inputContainer,
            passwordFocused && styles.inputFocused
          ]}>
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color={passwordFocused ? colors.primary[400] : colors.light.text.tertiary}
              style={styles.inputIcon} 
            />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.light.text.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <Pressable 
              onPress={() => {
                Haptics.selectionAsync();
                setShowPassword(!showPassword);
              }}
              hitSlop={10}
            >
              <Ionicons 
                name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                size={20} 
                color={colors.light.text.tertiary} 
              />
            </Pressable>
          </View>

          {/* Login Button */}
          <Button
            title="Login"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.loginButton}
          />

          {/* Forgot Password */}
          <Pressable 
            style={styles.forgotPassword}
            onPress={() => Haptics.selectionAsync()}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.light.background 
  },
  content: { 
    flex: 1, 
    padding: spacing.screenHorizontal 
  },
  backButton: { 
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  header: { 
    alignItems: 'center', 
    marginBottom: spacing['3xl'] 
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  iconGradient: {
    width: 100, 
    height: 100, 
    borderRadius: radius.xl,
    justifyContent: 'center', 
    alignItems: 'center',
  },
  title: { 
    ...typography.display.medium,
    color: colors.light.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: { 
    ...typography.body.large,
    color: colors.light.text.secondary,
  },
  form: { 
    gap: spacing.base 
  },
  inputContainer: {
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: colors.light.surface, 
    borderRadius: radius.input, 
    paddingHorizontal: spacing.base, 
    height: 56,
    borderWidth: 1.5, 
    borderColor: colors.light.border,
  },
  inputFocused: {
    borderColor: colors.primary[400],
    borderWidth: 2,
  },
  inputIcon: { 
    marginRight: spacing.md 
  },
  input: { 
    flex: 1, 
    ...typography.body.large,
    color: colors.light.text.primary,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  forgotPasswordText: {
    ...typography.label.large,
    color: colors.primary[400],
  },
});
```


### Step 7: Update Bottom Tab Navigator

```javascript
// app/src/navigation/DeliveryTabs.js (Redesigned)
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

// Import screens...

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

// Custom Tab Bar Background
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
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
            },
            android: {
              elevation: 8,
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
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (Week 1)
- [ ] Install all dependencies
- [ ] Configure Babel for Reanimated
- [ ] Create theme folder structure
- [ ] Implement color palette
- [ ] Implement typography scale
- [ ] Implement spacing system
- [ ] Create ThemeContext for dark mode

### Phase 2: Components (Week 2)
- [ ] Create Button component with animations
- [ ] Create Card component with press effects
- [ ] Create Input component with floating labels
- [ ] Create StatusBadge component
- [ ] Create Skeleton loading components
- [ ] Create Toast notification system
- [ ] Create EmptyState component

### Phase 3: Screen Redesigns (Week 3-4)
- [ ] Redesign Login Screen
- [ ] Redesign Home/Dashboard Screen
- [ ] Redesign My Orders Screen
- [ ] Redesign Order Detail Screen
- [ ] Redesign Available Orders Screen
- [ ] Redesign History Screen
- [ ] Redesign Profile Screen

### Phase 4: Polish (Week 5)
- [ ] Add haptic feedback throughout
- [ ] Implement pull-to-refresh animations
- [ ] Add screen transitions
- [ ] Test dark mode
- [ ] Performance optimization
- [ ] Accessibility audit

---

## 🎨 DESIGN RESOURCES

### Recommended Lottie Animations
- Delivery bike: https://lottiefiles.com/animations/delivery-bike
- Empty box: https://lottiefiles.com/animations/empty-box
- Success checkmark: https://lottiefiles.com/animations/success
- Loading spinner: https://lottiefiles.com/animations/loading

### Icon Guidelines
- Use Ionicons consistently
- Filled icons for active states
- Outline icons for inactive states
- 24px for navigation, 20px for inline

### Color Usage Rules
1. Primary color for CTAs and key actions
2. Status colors only for order states
3. Neutral colors for text and backgrounds
4. Never use more than 3 colors per screen

---

## 🚀 QUICK WINS (Implement First)

1. **Add shadows to cards** - Instant premium feel
2. **Increase touch targets** - Better usability
3. **Add haptic feedback** - Tactile response
4. **Animate buttons** - Engaging interactions
5. **Improve typography hierarchy** - Better readability
6. **Add skeleton loaders** - Perceived performance

---

*This blueprint provides a complete roadmap to transform your delivery app into a premium, Zomato-level experience while preserving all existing functionality.*
