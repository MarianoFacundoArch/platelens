import { useColorScheme } from 'react-native';
import { getColors, theme } from '@/config/theme';

/**
 * Custom hook to get the current theme with dark mode support
 * Automatically adapts colors based on system color scheme
 */
export function useTheme() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  return {
    colors,
    colorScheme,
    isDark: colorScheme === 'dark',
    ...theme, // Spread static theme values (spacing, typography, etc.)
  };
}
