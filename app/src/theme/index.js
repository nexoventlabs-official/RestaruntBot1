// Theme Index - Export all theme values
export { colors, default as Colors } from './colors';
export { typography, default as Typography } from './typography';
export { spacing, default as Spacing } from './spacing';
export { radius, default as Radius } from './radius';
export { shadows, default as Shadows } from './shadows';

// Convenience re-export
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
};

export default theme;
