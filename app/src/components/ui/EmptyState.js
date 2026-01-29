import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../theme';

export const EmptyState = ({
  icon = 'document-outline',
  title = 'No data',
  subtitle = '',
  action,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={48} color={colors.light.text.tertiary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.screenHorizontal,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.light.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.headline.small.fontSize,
    fontWeight: '600',
    color: colors.light.text.secondary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.body.medium.fontSize,
    color: colors.light.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  actionContainer: {
    marginTop: spacing.lg,
  },
});

export default EmptyState;
