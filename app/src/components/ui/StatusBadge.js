import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../theme';

const STATUS_CONFIG = {
  pending: { color: '#F59E0B', bg: '#FEF3C7', icon: 'time-outline', label: 'Pending' },
  confirmed: { color: '#3B82F6', bg: '#DBEAFE', icon: 'checkmark-circle-outline', label: 'Confirmed' },
  preparing: { color: '#8B5CF6', bg: '#EDE9FE', icon: 'restaurant-outline', label: 'Preparing' },
  ready: { color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-done-outline', label: 'Ready' },
  out_for_delivery: { color: '#06B6D4', bg: '#CFFAFE', icon: 'bicycle-outline', label: 'Out for Delivery' },
  delivered: { color: '#22C55E', bg: '#DCFCE7', icon: 'checkmark-circle', label: 'Delivered' },
  cancelled: { color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle-outline', label: 'Cancelled' },
  refunded: { color: '#6B7280', bg: '#F3F4F6', icon: 'refresh-outline', label: 'Refunded' },
};

export const StatusBadge = ({ status, size = 'md', showIcon = true }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { paddingHorizontal: spacing.sm, paddingVertical: 2, fontSize: typography.label.small.fontSize, iconSize: 10 };
      case 'lg':
        return { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, fontSize: typography.label.large.fontSize, iconSize: 16 };
      default:
        return { paddingHorizontal: spacing.md, paddingVertical: 4, fontSize: typography.label.medium.fontSize, iconSize: 12 };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[
      styles.badge,
      { backgroundColor: config.bg, paddingHorizontal: sizeStyles.paddingHorizontal, paddingVertical: sizeStyles.paddingVertical }
    ]}>
      {showIcon && (
        <Ionicons name={config.icon} size={sizeStyles.iconSize} color={config.color} style={styles.icon} />
      )}
      <Text style={[styles.text, { color: config.color, fontSize: sizeStyles.fontSize }]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
  },
});

export default StatusBadge;
