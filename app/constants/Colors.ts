/**
 * @deprecated This color system is deprecated in favor of the centralized theme system.
 * Please use @/config/theme and the useTheme hook instead for new code.
 * This file is only kept for backward compatibility with legacy Themed components.
 *
 * For new components:
 * - Import: `import { useTheme } from '@/hooks/useTheme'`
 * - Usage: `const { colors } = useTheme()`
 * - See config/theme.ts for the complete theme system
 */
const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
};
