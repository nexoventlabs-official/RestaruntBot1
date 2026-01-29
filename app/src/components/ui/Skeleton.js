import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, radius } from '../../theme';

const SkeletonBase = ({ style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={[styles.skeleton, { opacity }, style]} />
  );
};

export const StatsCardSkeleton = () => (
  <View style={styles.statsCard}>
    <SkeletonBase style={styles.statsIcon} />
    <SkeletonBase style={styles.statsValue} />
    <SkeletonBase style={styles.statsTitle} />
  </View>
);

export const OrderCardSkeleton = () => (
  <View style={styles.orderCard}>
    <View style={styles.orderHeader}>
      <SkeletonBase style={styles.orderId} />
      <SkeletonBase style={styles.statusBadge} />
    </View>
    <View style={styles.orderBody}>
      <SkeletonBase style={styles.customerName} />
      <SkeletonBase style={styles.address} />
    </View>
    <View style={styles.orderFooter}>
      <SkeletonBase style={styles.amount} />
      <SkeletonBase style={styles.button} />
    </View>
  </View>
);

export const MenuItemSkeleton = () => (
  <View style={styles.menuItem}>
    <SkeletonBase style={styles.menuImage} />
    <View style={styles.menuInfo}>
      <SkeletonBase style={styles.menuName} />
      <SkeletonBase style={styles.menuCategory} />
      <SkeletonBase style={styles.menuPrice} />
    </View>
  </View>
);

export const ListItemSkeleton = () => (
  <View style={styles.listItem}>
    <SkeletonBase style={styles.listAvatar} />
    <View style={styles.listContent}>
      <SkeletonBase style={styles.listTitle} />
      <SkeletonBase style={styles.listSubtitle} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.light.border,
    borderRadius: radius.sm,
  },
  // Stats Card
  statsCard: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginRight: spacing.md,
  },
  statsIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    marginBottom: spacing.md,
  },
  statsValue: {
    width: 60,
    height: 28,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  statsTitle: {
    width: 80,
    height: 16,
    borderRadius: radius.xs,
  },
  // Order Card
  orderCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  orderId: {
    width: 80,
    height: 20,
    borderRadius: radius.sm,
  },
  statusBadge: {
    width: 70,
    height: 24,
    borderRadius: radius.full,
  },
  orderBody: {
    marginBottom: spacing.md,
  },
  customerName: {
    width: 120,
    height: 18,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  address: {
    width: '80%',
    height: 16,
    borderRadius: radius.sm,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderLight,
  },
  amount: {
    width: 60,
    height: 24,
    borderRadius: radius.sm,
  },
  button: {
    width: 100,
    height: 40,
    borderRadius: radius.lg,
  },
  // Menu Item
  menuItem: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  menuImage: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
  },
  menuInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  menuName: {
    width: '70%',
    height: 18,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  menuCategory: {
    width: '50%',
    height: 14,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  menuPrice: {
    width: 50,
    height: 20,
    borderRadius: radius.sm,
  },
  // List Item
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  listAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  listContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  listTitle: {
    width: '60%',
    height: 16,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  listSubtitle: {
    width: '40%',
    height: 14,
    borderRadius: radius.sm,
  },
});

export default { StatsCardSkeleton, OrderCardSkeleton, MenuItemSkeleton, ListItemSkeleton };
