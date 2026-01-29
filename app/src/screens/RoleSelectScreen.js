import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Animated, Dimensions, StatusBar, Platform, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '../theme';

const { width, height } = Dimensions.get('window');

export default function RoleSelectScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const adminCardAnim = useRef(new Animated.Value(0)).current;
  const deliveryCardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered card animations
    Animated.sequence([
      Animated.delay(300),
      Animated.spring(adminCardAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(450),
      Animated.spring(deliveryCardAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const RoleCard = ({
    title,
    subtitle,
    icon,
    gradientColors,
    onPress,
    animValue,
    iconBg
  }) => (
    <Animated.View style={{
      opacity: animValue,
      transform: [
        { translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
        { scale: animValue.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
      ],
    }}>
      <TouchableOpacity
        style={styles.roleCard}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.roleCardGradient}
        >
          <View style={styles.roleCardContent}>
            <View style={[styles.roleIconContainer, { backgroundColor: iconBg }]}>
              <Ionicons name={icon} size={32} color="#fff" />
            </View>
            <View style={styles.roleTextContainer}>
              <Text style={styles.roleTitle}>{title}</Text>
              <Text style={styles.roleSubtitle}>{subtitle}</Text>
            </View>
            <View style={styles.roleArrow}>
              <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.8)" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background Image */}
      <Image
        source={require('../../assets/backgrounds/open.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.backgroundOverlay} />

      <SafeAreaView style={styles.contentContainer}>

        {/* Header Section */}
        <Animated.View style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[colors.zomato.red, colors.zomato.darkRed]}
              style={styles.logoGradient}
            >
              <Ionicons name="restaurant" size={48} color="#fff" />
            </LinearGradient>
          </View>

          <Text style={styles.appName}>FoodAdmin</Text>
          <Text style={styles.tagline}>Restaurant Management Suite</Text>

          {/* Feature Pills */}
          <View style={styles.featurePills}>
            <View style={styles.featurePill}>
              <Ionicons name="flash" size={12} color="#fff" />
              <Text style={styles.featurePillText}>Fast</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="shield-checkmark" size={12} color="#fff" />
              <Text style={styles.featurePillText}>Secure</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="analytics" size={12} color="#fff" />
              <Text style={styles.featurePillText}>Smart</Text>
            </View>
          </View>
        </Animated.View>

        {/* Role Selection Cards */}
        <View style={styles.cardsContainer}>
          <Text style={styles.selectRoleText}>Select your role</Text>

          <RoleCard
            title="Admin Portal"
            subtitle="Manage orders, menu, analytics & more"
            icon="shield-checkmark"
            gradientColors={[colors.zomato.red, colors.zomato.darkRed]}
            iconBg="rgba(255,255,255,0.2)"
            onPress={() => navigation.navigate('AdminLogin')}
            animValue={adminCardAnim}
          />

          <RoleCard
            title="Delivery Partner"
            subtitle="Accept & deliver orders efficiently"
            icon="bicycle"
            gradientColors={['#267E3E', '#1B5E2E']}
            iconBg="rgba(255,255,255,0.2)"
            onPress={() => navigation.navigate('DeliveryLogin')}
            animValue={deliveryCardAnim}
          />
        </View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <Text style={styles.footerText}>Powered by</Text>
          <View style={styles.footerBrand}>
            <View style={styles.footerDot} />
            <Text style={styles.footerBrandText}>FoodAdmin Pro</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 60 : 40,
    paddingBottom: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.lg,
    ...shadows.xl,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: typography.body.large.fontSize,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  featurePills: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  featurePillText: {
    fontSize: typography.label.small.fontSize,
    fontWeight: '600',
    color: '#fff',
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: spacing.screenHorizontal,
    justifyContent: 'center',
  },
  selectRoleText: {
    fontSize: typography.title.medium.fontSize,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  roleCard: {
    marginBottom: spacing.base,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  roleCardGradient: {
    padding: spacing.lg,
  },
  roleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleTextContainer: {
    flex: 1,
    marginLeft: spacing.base,
  },
  roleTitle: {
    fontSize: typography.headline.medium.fontSize,
    fontWeight: '700',
    color: '#fff',
  },
  roleSubtitle: {
    fontSize: typography.body.small.fontSize,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  roleArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing['2xl'],
  },
  footerText: {
    fontSize: typography.label.small.fontSize,
    color: 'rgba(255,255,255,0.6)',
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.zomato.red,
    marginRight: spacing.xs,
  },
  footerBrandText: {
    fontSize: typography.label.medium.fontSize,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
});
