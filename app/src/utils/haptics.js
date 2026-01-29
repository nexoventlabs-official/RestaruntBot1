import * as Haptics from 'expo-haptics';

// Haptic Feedback Utility for Premium UX
export const haptics = {
  // Light tap - for toggles, selections, minor interactions
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  
  // Medium tap - for button presses, card taps
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  
  // Heavy tap - for important actions, confirmations
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  
  // Success - for completed actions (order delivered, login success)
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  
  // Warning - for alerts, confirmations needed
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  
  // Error - for failures, validation errors
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  
  // Selection - for picker changes, tab switches
  selection: () => Haptics.selectionAsync(),
};

export default haptics;
