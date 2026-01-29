import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography, shadows } from '../../theme';

export const Button = ({
  title,
  onPress,
  variant = 'primary', // primary, secondary, success, danger, outline, ghost
  size = 'md', // sm, md, lg
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = true,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { gradient: [colors.zomato.red, colors.zomato.darkRed], textColor: '#fff' };
      case 'secondary':
        return { gradient: [colors.light.surfaceSecondary, colors.light.surfaceSecondary], textColor: colors.light.text.primary };
      case 'success':
        return { gradient: ['#22C55E', '#16A34A'], textColor: '#fff' };
      case 'danger':
        return { gradient: ['#EF4444', '#DC2626'], textColor: '#fff' };
      case 'outline':
        return { gradient: ['transparent', 'transparent'], textColor: colors.zomato.red, borderColor: colors.zomato.red };
      case 'ghost':
        return { gradient: ['transparent', 'transparent'], textColor: colors.zomato.red };
      default:
        return { gradient: [colors.zomato.red, colors.zomato.darkRed], textColor: '#fff' };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { height: 36, paddingHorizontal: spacing.md, fontSize: typography.label.medium.fontSize };
      case 'lg':
        return { height: 56, paddingHorizontal: spacing.xl, fontSize: typography.title.large.fontSize };
      default:
        return { height: 48, paddingHorizontal: spacing.lg, fontSize: typography.title.medium.fontSize };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const buttonContent = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={variantStyles.textColor} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={[styles.text, { color: variantStyles.textColor, fontSize: sizeStyles.fontSize }, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </>
      )}
    </View>
  );

  if (variant === 'outline' || variant === 'ghost') {
    return (
      <TouchableOpacity
        style={[
          styles.button,
          {
            height: sizeStyles.height,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            borderWidth: variant === 'outline' ? 2 : 0,
            borderColor: variantStyles.borderColor,
            backgroundColor: 'transparent',
          },
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          style,
        ]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
      >
        {buttonContent}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[fullWidth && styles.fullWidth, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={disabled ? ['#D1D5DB', '#D1D5DB'] : variantStyles.gradient}
        style={[
          styles.gradient,
          { height: sizeStyles.height, paddingHorizontal: sizeStyles.paddingHorizontal },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {buttonContent}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
});

export default Button;
