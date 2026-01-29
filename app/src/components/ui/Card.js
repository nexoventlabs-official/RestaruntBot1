import React, { useRef, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '../../theme';

// Premium Card Variants
const CARD_VARIANTS = {
  default: 'default',
  glass: 'glass',
  gradient: 'gradient',
  neumorphic: 'neumorphic',
  outlined: 'outlined',
  elevated: 'elevated',
  frosted: 'frosted',
  premium: 'premium',
  minimal: 'minimal',
  accent: 'accent',
};

export const Card = ({
  children,
  style,
  onPress,
  variant = 'default',
  padding = true,
  animated = false,
  animationDelay = 0,
  glowColor,
  accentColor = colors.zomato.red,
  borderAccent = false,
  cornerIcon,
  cornerIconColor,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(animated ? 0.95 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          delay: animationDelay,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          delay: animationDelay,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animated, animationDelay]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'glass':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.5)',
          ...shadows.lg,
        };
      case 'neumorphic':
        return {
          backgroundColor: colors.light.background,
          ...Platform.select({
            ios: {
              shadowColor: '#BEBEBE',
              shadowOffset: { width: 6, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
            },
            android: { elevation: 8 },
          }),
        };
      case 'outlined':
        return {
          backgroundColor: colors.light.surface,
          borderWidth: 1.5,
          borderColor: borderAccent ? accentColor : colors.light.border,
        };
      case 'elevated':
        return {
          backgroundColor: colors.light.surface,
          ...shadows.xl,
        };
      case 'frosted':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          ...shadows.md,
        };
      case 'premium':
        return {
          backgroundColor: colors.light.surface,
          borderWidth: 1,
          borderColor: colors.light.borderLight,
          ...shadows.lg,
        };
      case 'minimal':
        return {
          backgroundColor: colors.light.surfaceSecondary,
        };
      case 'accent':
        return {
          backgroundColor: colors.light.surface,
          borderLeftWidth: 4,
          borderLeftColor: accentColor,
          ...shadows.card,
        };
      case 'gradient':
        return {};
      default:
        return {
          backgroundColor: colors.light.surface,
          ...shadows.card,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const cardStyle = [
    styles.card,
    variantStyles,
    padding && styles.padding,
    glowColor && {
      ...Platform.select({
        ios: {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        android: { elevation: 8 },
      }),
    },
    disabled && styles.disabled,
    style,
  ];

  const renderContent = () => (
    <>
      {children}
      {cornerIcon && (
        <View style={[styles.cornerIcon, { backgroundColor: (cornerIconColor || accentColor) + '15' }]}>
          <Ionicons name={cornerIcon} size={16} color={cornerIconColor || accentColor} />
        </View>
      )}
    </>
  );

  const renderCard = () => {
    if (variant === 'gradient') {
      return (
        <LinearGradient
          colors={[colors.light.surface, colors.light.surfaceSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, padding && styles.padding, shadows.card, style]}
        >
          {renderContent()}
        </LinearGradient>
      );
    }

    return <View style={cardStyle}>{renderContent()}</View>;
  };

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  if (onPress && !disabled) {
    return (
      <AnimatedTouchable
        style={[
          animated && { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
        ]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {renderCard()}
      </AnimatedTouchable>
    );
  }

  if (animated) {
    return (
      <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}>
        {renderCard()}
      </Animated.View>
    );
  }

  return renderCard();
};

// Premium Stat Card with Icon - 3D Design
export const StatCard = React.memo(({
  icon,
  title,
  value,
  subtitle,
  color = colors.zomato.red,
  bgColor,
  trend,
  trendValue,
  onPress,
  animated = true,
  animationDelay = 0,
  variant = 'default',
  size = 'medium',
  compact = false,
  backgroundStyle = 'default',
  backgroundImage = null,
  gradientColors = null,
}) => {
  // Use refs to track if initial animation has run
  const hasAnimated = useRef(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Only animate on first mount, not on data updates
    if (animated && !hasAnimated.current) {
      hasAnimated.current = true;
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          delay: animationDelay,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          delay: animationDelay,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  const isCompact = compact || size === 'compact';

  const getTrendIcon = () => {
    if (trend === 'up') return 'trending-up';
    if (trend === 'down') return 'trending-down';
    return 'remove';
  };

  const getTrendColor = () => {
    if (trend === 'up') return colors.success.main;
    if (trend === 'down') return colors.error.main;
    return colors.light.text.tertiary;
  };

  // Default gradient colors based on the color prop
  const getGradientColors = () => {
    if (gradientColors) return gradientColors;
    
    // Create gradient from the color
    const colorMap = {
      '#22C55E': ['#22C55E', '#16A34A'], // Green
      '#F59E0B': ['#F59E0B', '#D97706'], // Orange/Amber
      '#8B5CF6': ['#8B5CF6', '#7C3AED'], // Purple
      '#3B82F6': ['#3B82F6', '#2563EB'], // Blue
      '#EF4444': ['#EF4444', '#DC2626'], // Red
      '#EC4899': ['#EC4899', '#DB2777'], // Pink
      '#06B6D4': ['#06B6D4', '#0891B2'], // Cyan
      '#10B981': ['#10B981', '#059669'], // Emerald
    };
    
    return colorMap[color] || [color, color + 'DD'];
  };

  const cardContent = (
    <LinearGradient
      colors={getGradientColors()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.statCard3D, isCompact && styles.statCard3DCompact]}
    >
      {/* 3D Shadow Layer */}
      <View style={styles.statCard3DShadowLayer} />
      
      {/* Decorative Elements */}
      <View style={styles.statCard3DDecor}>
        <Ionicons name={icon} size={60} color="rgba(255,255,255,0.12)" />
      </View>
      
      {/* Shine Effect */}
      <View style={styles.statCard3DShine} />
      
      {/* Content */}
      <View style={styles.statCard3DContent}>
        {/* Icon Container with Glass Effect */}
        <View style={[styles.statIcon3D, isCompact && styles.statIcon3DCompact]}>
          <Ionicons name={icon} size={isCompact ? 18 : 20} color="#fff" />
        </View>
        
        {/* Value and Title */}
        <Text style={[styles.statValue3D, isCompact && styles.statValue3DCompact]}>{value}</Text>
        <Text style={[styles.statTitle3D, isCompact && styles.statTitle3DCompact]}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle3D}>{subtitle}</Text>}
      </View>
      
      {/* Trend Badge */}
      {trend && !isCompact && (
        <View style={styles.trendBadge3D}>
          <Ionicons name={getTrendIcon()} size={12} color="#fff" />
          {trendValue && <Text style={styles.trendText3D}>{trendValue}</Text>}
        </View>
      )}
    </LinearGradient>
  );

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  if (onPress) {
    return (
      <AnimatedTouchable
        style={[
          styles.statCard3DWrapper,
          animated && { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
        ]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {cardContent}
      </AnimatedTouchable>
    );
  }

  return (
    <Animated.View
      style={[
        styles.statCard3DWrapper,
        animated && { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      {cardContent}
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if value changes
  return prevProps.value === nextProps.value && 
         prevProps.title === nextProps.title &&
         prevProps.trend === nextProps.trend;
});

// Premium Action Card
export const ActionCard = ({
  icon,
  title,
  subtitle,
  color = colors.zomato.red,
  onPress,
  rightIcon = 'chevron-forward',
  badge,
  badgeColor,
  variant = 'default',
  disabled = false,
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'filled':
        return {
          card: { backgroundColor: color },
          icon: { backgroundColor: 'rgba(255,255,255,0.2)' },
          iconColor: '#fff',
          titleColor: '#fff',
          subtitleColor: 'rgba(255,255,255,0.8)',
          arrowBg: 'rgba(255,255,255,0.15)',
          arrowColor: '#fff',
        };
      case 'outlined':
        return {
          card: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: color },
          icon: { backgroundColor: color + '15' },
          iconColor: color,
          titleColor: colors.light.text.primary,
          subtitleColor: colors.light.text.secondary,
          arrowBg: color + '10',
          arrowColor: color,
        };
      default:
        return {
          card: { backgroundColor: colors.light.surface },
          icon: { backgroundColor: color + '15' },
          iconColor: color,
          titleColor: colors.light.text.primary,
          subtitleColor: colors.light.text.secondary,
          arrowBg: colors.light.surfaceSecondary,
          arrowColor: colors.light.text.tertiary,
        };
    }
  };

  const variantStyle = getVariantStyle();

  return (
    <TouchableOpacity
      style={[styles.actionCard, variantStyle.card, disabled && styles.disabled]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <View style={[styles.actionIconContainer, variantStyle.icon]}>
        <Ionicons name={icon} size={24} color={variantStyle.iconColor} />
      </View>
      <View style={styles.actionContent}>
        <View style={styles.actionTitleRow}>
          <Text style={[styles.actionTitle, { color: variantStyle.titleColor }]}>{title}</Text>
          {badge && (
            <View style={[styles.actionBadge, { backgroundColor: badgeColor || colors.zomato.red }]}>
              <Text style={styles.actionBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {subtitle && <Text style={[styles.actionSubtitle, { color: variantStyle.subtitleColor }]}>{subtitle}</Text>}
      </View>
      <View style={[styles.actionArrow, { backgroundColor: variantStyle.arrowBg }]}>
        <Ionicons name={rightIcon} size={18} color={variantStyle.arrowColor} />
      </View>
    </TouchableOpacity>
  );
};

// Premium Info Card with Gradient
export const InfoCard = ({
  icon,
  title,
  children,
  gradientColors = [colors.primary[50], '#FFF5F5'],
  iconColor = colors.zomato.red,
  variant = 'default',
}) => {
  if (variant === 'solid') {
    return (
      <View style={[styles.infoCard, { backgroundColor: iconColor + '10' }]}>
        <View style={[styles.infoIconContainer, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <View style={styles.infoContent}>
          <Text style={[styles.infoTitle, { color: iconColor }]}>{title}</Text>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.infoCardWrapper}>
      <LinearGradient colors={gradientColors} style={styles.infoCard}>
        <View style={[styles.infoIconContainer, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <View style={styles.infoContent}>
          <Text style={[styles.infoTitle, { color: iconColor }]}>{title}</Text>
          {children}
        </View>
      </LinearGradient>
    </View>
  );
};

// Premium Feature Card
export const FeatureCard = ({
  icon,
  title,
  description,
  color = colors.zomato.red,
  onPress,
  featured = false,
}) => (
  <TouchableOpacity
    style={[styles.featureCard, featured && styles.featureCardFeatured]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    {featured && (
      <LinearGradient
        colors={[color, color + 'DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featureGradientBg}
      />
    )}
    <View style={[
      styles.featureIconContainer,
      { backgroundColor: featured ? 'rgba(255,255,255,0.2)' : color + '15' },
    ]}>
      <Ionicons name={icon} size={28} color={featured ? '#fff' : color} />
    </View>
    <Text style={[styles.featureTitle, featured && styles.featureTitleFeatured]}>{title}</Text>
    <Text style={[styles.featureDescription, featured && styles.featureDescriptionFeatured]}>{description}</Text>
  </TouchableOpacity>
);

// Premium Metric Card
export const MetricCard = ({
  label,
  value,
  icon,
  color = colors.zomato.red,
  suffix,
  prefix,
  trend,
  trendValue,
  onPress,
}) => {
  const getTrendColor = () => {
    if (trend === 'up') return colors.success.main;
    if (trend === 'down') return colors.error.main;
    return colors.light.text.tertiary;
  };

  return (
    <TouchableOpacity
      style={styles.metricCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
    >
      <View style={styles.metricHeader}>
        <View style={[styles.metricIconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        {trend && (
          <View style={[styles.metricTrend, { backgroundColor: getTrendColor() + '15' }]}>
            <Ionicons
              name={trend === 'up' ? 'arrow-up' : trend === 'down' ? 'arrow-down' : 'remove'}
              size={12}
              color={getTrendColor()}
            />
            {trendValue && <Text style={[styles.metricTrendText, { color: getTrendColor() }]}>{trendValue}</Text>}
          </View>
        )}
      </View>
      <Text style={styles.metricValue}>
        {prefix}<Text style={{ color }}>{value}</Text>{suffix}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

// Import Text from react-native (needed for StatCard, ActionCard, etc.)
import { Text } from 'react-native';

const styles = StyleSheet.create({
  // Base Card
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  padding: {
    padding: spacing.base,
  },
  disabled: {
    opacity: 0.5,
  },
  cornerIcon: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stat Card - 3D Design
  statCard3DWrapper: {
    flex: 1,
    borderRadius: radius.xl + 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statCard3D: {
    flex: 1,
    borderRadius: radius.xl + 4,
    padding: spacing.base,
    minHeight: 140,
    overflow: 'hidden',
    position: 'relative',
  },
  statCard3DCompact: {
    minHeight: 120,
    padding: spacing.md,
  },
  statCard3DShadowLayer: {
    position: 'absolute',
    bottom: -4,
    left: 8,
    right: 8,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: radius.xl,
    transform: [{ scaleY: 0.3 }],
  },
  statCard3DDecor: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    opacity: 1,
  },
  statCard3DShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
  },
  statCard3DContent: {
    flex: 1,
    zIndex: 1,
  },
  statIcon3D: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statIcon3DCompact: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginBottom: spacing.sm,
  },
  statValue3D: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statValue3DCompact: {
    fontSize: 26,
  },
  statTitle3D: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  statTitle3DCompact: {
    fontSize: 12,
    marginTop: 2,
  },
  statSubtitle3D: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  trendBadge3D: {
    position: 'absolute',
    top: spacing.base,
    right: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  trendText3D: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },

  // Legacy Stat Card (keeping for backward compatibility)
  statCard: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    overflow: 'hidden',
    ...shadows.card,
  },
  statCardWithImage: {
    padding: 0,
  },
  statCardImageBg: {
    flex: 1,
    width: '100%',
    minHeight: 120,
  },
  statCardImageBgCompact: {
    minHeight: 130,
  },
  statCardImageStyle: {
    borderRadius: radius.xl,
  },
  statCardImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: spacing.base,
    borderRadius: radius.xl,
  },
  statCardImageOverlayCompact: {
    padding: spacing.md,
  },
  statCardInner: {
    flex: 1,
  },
  statCardInnerCompact: {
    alignItems: 'flex-start',
  },
  statCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Background Decorations
  bgDecoration: {
    position: 'absolute',
  },
  // Circles style
  bgCircle1: {
    width: 90,
    height: 90,
    borderRadius: 45,
    top: -25,
    right: -25,
  },
  bgCircle2: {
    width: 70,
    height: 70,
    borderRadius: 35,
    bottom: 5,
    right: 25,
  },
  bgCircle3: {
    width: 45,
    height: 45,
    borderRadius: 22,
    top: 35,
    right: 55,
  },
  // Waves style
  bgWave1: {
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -90,
    right: -60,
    transform: [{ scaleX: 1.5 }],
  },
  bgWave2: {
    width: 130,
    height: 130,
    borderRadius: 65,
    bottom: -70,
    left: -50,
    transform: [{ scaleX: 1.3 }],
  },
  // Dots style
  bgDotsContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 60,
    height: 60,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bgDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Diagonal style
  bgDiagonal1: {
    width: 130,
    height: 130,
    top: -70,
    right: -40,
    transform: [{ rotate: '45deg' }],
    borderRadius: 24,
  },
  bgDiagonal2: {
    width: 90,
    height: 90,
    bottom: -50,
    right: 15,
    transform: [{ rotate: '45deg' }],
    borderRadius: 18,
  },
  bgDiagonal3: {
    width: 55,
    height: 55,
    top: 15,
    right: 65,
    transform: [{ rotate: '45deg' }],
    borderRadius: 12,
  },
  statIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statIconContainerGlass: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginBottom: spacing.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statIconContainerGlassCompact: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  statIconGlassInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIconCompact: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginBottom: spacing.sm,
  },
  statContent: {
    flex: 1,
  },
  statContentCompact: {
    flex: 0,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.light.text.primary,
    letterSpacing: -0.5,
  },
  statValueCompact: {
    fontSize: 24,
  },
  statValueWithBg: {
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statTitle: {
    fontSize: 14,
    color: colors.light.text.secondary,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  statTitleCompact: {
    fontSize: 12,
    marginTop: 2,
  },
  statTitleWithBg: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statSubtitle: {
    fontSize: 12,
    color: colors.light.text.tertiary,
    marginTop: 2,
  },
  statSubtitleWithBg: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  trendBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 3,
  },
  trendBadgeGlass: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Action Card
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.sm,
  },
  actionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  actionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  actionArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info Card
  infoCardWrapper: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  infoCard: {
    flexDirection: 'row',
    padding: spacing.base,
    borderRadius: radius.xl,
  },
  infoIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  // Feature Card
  featureCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadows.card,
  },
  featureCardFeatured: {
    backgroundColor: 'transparent',
  },
  featureGradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  featureTitleFeatured: {
    color: '#fff',
  },
  featureDescription: {
    fontSize: 13,
    color: colors.light.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  featureDescriptionFeatured: {
    color: 'rgba(255,255,255,0.85)',
  },

  // Metric Card
  metricCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.card,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 2,
  },
  metricTrendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.light.text.primary,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 13,
    color: colors.light.text.secondary,
    marginTop: spacing.xs,
  },
});

export default Card;
