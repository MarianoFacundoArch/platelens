# PlateLens Development Guide

## Theming System

This project uses a **centralized theme system** that supports both light and dark modes. All components MUST follow these guidelines to ensure consistent appearance across the app.

---

## Critical Rules

### 1. React Hooks Rules of Compliance

**ALWAYS call hooks before any early returns or conditional logic.**

❌ **WRONG:**
```typescript
function MyComponent({ data }) {
  if (!data) return null; // Early return

  const { colors } = useTheme(); // ❌ Hook called after early return
  const styles = useMemo(() => createStyles(colors), [colors]);

  return <View style={styles.container}>...</View>;
}
```

✅ **CORRECT:**
```typescript
function MyComponent({ data }) {
  const { colors } = useTheme(); // ✅ Hook called first
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!data) return null; // Early return after hooks

  return <View style={styles.container}>...</View>;
}
```

**Why:** React requires hooks to be called in the same order on every render. Conditional hook calls violate the Rules of Hooks and will cause errors.

---

### 2. Never Hardcode Colors

**NEVER use hardcoded color values.** Always use the theme system.

❌ **WRONG:**
```typescript
backgroundColor: '#FFFFFF'
color: '#000000'
borderColor: '#E5E5E5'
```

✅ **CORRECT:**
```typescript
backgroundColor: colors.background.card
color: colors.text.primary
borderColor: colors.border.subtle
```

**Why:** Hardcoded colors don't adapt to dark mode and break the visual consistency of the app.

---

### 3. Use Dynamic Styles Pattern

All components should use the `createStyles(colors)` pattern with `useMemo` for performance.

✅ **CORRECT Pattern:**
```typescript
import { useTheme } from '@/hooks/useTheme';
import { useMemo } from 'react';

export function MyComponent() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return <View style={styles.container}>...</View>;
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.card,
      borderColor: colors.border.subtle,
    },
    text: {
      color: colors.text.primary,
    },
  });
}
```

---

## Theme Structure

### Color Palette

The theme provides semantic color names that automatically adapt to light/dark mode:

#### Background Colors
```typescript
colors.background.base      // Main app background (#FFFFFF / #000000)
colors.background.card      // Card background (#FFFFFF / #1A1A1A)
colors.background.subtle    // Subtle background (#F9FAFB / #1A1A1A)
colors.background.elevated  // Elevated elements (#FFFFFF / #2A2A2A)
```

#### Text Colors
```typescript
colors.text.primary    // Primary text (#0B1215 / #F5F5F5)
colors.text.secondary  // Secondary text (#405060 / #B0B0B0)
colors.text.tertiary   // Tertiary text (#6B7A87 / #9A9A9A)
```

#### Border Colors
```typescript
colors.border.subtle  // Subtle borders (#E5E7EB / #404040)
colors.border.medium  // Medium borders (#D1D5DB / #606060)
```

#### Overlay
```typescript
colors.overlay  // Modal/sheet overlays (rgba(0,0,0,0.5) / rgba(0,0,0,0.7))
```

#### Gradient
```typescript
colors.gradient.start   // Gradient start (#E0F7F4 / #0B1215)
colors.gradient.middle  // Gradient middle (#F0FFFE / #0F2027)
colors.gradient.end     // Gradient end (#FFFFFF / #1A1A1A)
```

#### Primary Colors
```typescript
colors.primary[25]   // Lightest teal
colors.primary[50]   // Very light teal (#E0F7F4 / #1A1A1A)
colors.primary[100]  // Light teal (#C0EFE9 / #2A2A2A)
colors.primary[200]  // (#80E2D7 / #3A3A3A)
colors.primary[300]  // (#40D5C5 / #4A4A4A)
colors.primary[400]  // (#14B8A6 / #14B8A6) ← Same in both modes
colors.primary[500]  // Main teal (#0D9488 / #0D9488)
colors.primary[600]  // (#0A7C72 / #0A7C72)
colors.primary[700]  // (#00A385 / #00A385)
colors.primary[800]  // (#005F51 / #005F51)
colors.primary[900]  // Darkest teal
```

#### Macro Colors
```typescript
colors.protein.main    // Protein color
colors.protein.light   // Light variant
colors.carbs.main      // Carbs color
colors.carbs.light     // Light variant
colors.fat.main        // Fat color
colors.fat.light       // Light variant
```

#### Status Colors
```typescript
colors.success  // Success state (#22C55E)
colors.warning  // Warning state (#F59E0B)
colors.error    // Error state (#EF4444)
colors.info     // Info state (#3B82F6)
```

---

## Common Patterns

### 1. Background Gradients

✅ **CORRECT:**
```typescript
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={[colors.gradient.start, colors.gradient.middle, colors.gradient.end]}
  locations={[0, 0.5, 1]}
  style={StyleSheet.absoluteFillObject}
/>
```

❌ **WRONG:**
```typescript
<LinearGradient
  colors={['#E0F7F4', '#F0FFFE', '#FFFFFF']}  // Hardcoded!
  locations={[0, 0.5, 1]}
  style={StyleSheet.absoluteFillObject}
/>
```

**Examples:** See `app/(app)/home.tsx`, `app/(app)/history.tsx`, `app/(app)/profile.tsx`

---

### 2. Shadows

Access shadows through the theme:

✅ **CORRECT:**
```typescript
const { colors, shadows } = useTheme();

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    ...shadows.md,
  },
});
```

Available shadow sizes:
- `shadows.sm` - Small shadow
- `shadows.md` - Medium shadow
- `shadows.lg` - Large shadow

**Examples:** See `app/components/Card.tsx`, `app/components/CalorieRing.tsx`

---

### 3. Animations

Access animations through the theme:

✅ **CORRECT:**
```typescript
const { colors, animations } = useTheme();

Animated.spring(value, {
  toValue: 1,
  ...animations.easing.spring,
  useNativeDriver: true,
}).start();
```

**Examples:** See `app/components/CalorieRing.tsx`, `app/components/MacroPieChart.tsx`

---

### 4. Cards and Elevated Surfaces

For cards and elevated UI elements, use semantic background colors:

✅ **CORRECT:**
```typescript
// Main card background
backgroundColor: colors.background.card

// Elevated/hover states
backgroundColor: colors.background.elevated

// Subtle backgrounds (input fields, disabled states)
backgroundColor: colors.background.subtle
```

**Examples:** See `app/components/SwipeableMealCard.tsx`, `app/components/MealDetailSheet.tsx`

---

### 5. Buttons and Interactive Elements

For interactive elements that need visibility in both modes:

✅ **CORRECT:**
```typescript
// Primary button background
backgroundColor: colors.primary[500]

// Secondary/subtle button background
backgroundColor: colors.background.elevated

// Disabled state
backgroundColor: colors.background.subtle
opacity: 0.6
```

**Examples:** See `app/components/Button.tsx`, `app/components/TabSelector.tsx`

---

## Dark Mode Best Practices

### Color Contrast Guidelines

1. **Light backgrounds in dark mode need lighter variants:**
   - Use `colors.background.elevated` instead of `colors.primary[50]`
   - Example: Edit buttons, active tab backgrounds

2. **Dark text in dark mode needs lighter variants:**
   - Use `colors.primary[400]` instead of `colors.primary[700]`
   - Example: Active tab labels, emphasized text

3. **Test both modes:**
   - Always preview your changes in both light and dark mode
   - Use device settings to toggle: Settings → Display → Dark Mode

### Common Dark Mode Issues

| Issue | Problem | Solution |
|-------|---------|----------|
| White cards in dark mode | Hardcoded `#FFFFFF` | Use `colors.background.card` |
| Invisible buttons | Using `colors.primary[50]` | Use `colors.background.elevated` |
| Unreadable text | Using `colors.primary[700]` | Use `colors.primary[400]` |
| Wrong gradient | Hardcoded gradient values | Use `colors.gradient.*` |

---

## Migration Checklist

When converting a component to use the centralized theme:

- [ ] Import `useTheme` hook: `import { useTheme } from '@/hooks/useTheme';`
- [ ] Import `useMemo` if not already: `import { useMemo } from 'react';`
- [ ] Call hooks at the top (before any early returns):
  ```typescript
  const { colors, shadows, animations } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  ```
- [ ] Convert inline styles to `createStyles` function
- [ ] Replace all hardcoded colors with semantic color names
- [ ] Replace hardcoded gradients with `colors.gradient.*`
- [ ] Replace `theme.shadows.*` with destructured `shadows.*`
- [ ] Replace `theme.animations.*` with destructured `animations.*`
- [ ] Test in both light and dark mode
- [ ] Verify all interactive elements have proper contrast

---

## Examples

### Good Examples (Follow These)

1. **app/(app)/home.tsx** - Proper gradient, dynamic styles, theme integration
2. **app/(app)/history.tsx** - Correct use of theme colors throughout
3. **app/components/Card.tsx** - Clean theme integration with variants
4. **app/components/CalorieRing.tsx** - Proper shadow and animation usage
5. **app/components/MacroPieChart.tsx** - Passing theme props correctly

### Recently Fixed (What NOT to do)

1. ~~**app/components/SwipeableMealCard.tsx**~~ - Had hardcoded `#FFFFFF` background
2. ~~**app/components/MealDetailSheet.tsx**~~ - Used `colors.primary[50]` for edit button (poor contrast)
3. ~~**app/(app)/profile.tsx**~~ - Had hardcoded gradient values
4. ~~**app/components/TabSelector.tsx**~~ - Active tab colors didn't work in dark mode

---

## Quick Reference

### Most Common Color Mappings

| Old Hardcoded Value | New Dynamic Value | Use Case |
|---------------------|-------------------|----------|
| `'#FFFFFF'` | `colors.background.card` | Card backgrounds |
| `'#F9FAFB'` | `colors.background.subtle` | Subtle backgrounds |
| `'#000000'` | `colors.text.primary` | Primary text |
| `'#E5E7EB'` | `colors.border.subtle` | Borders |
| `colors.primary[50]` | `colors.background.elevated` | Interactive element backgrounds |
| `colors.primary[700]` | `colors.primary[400]` | Active/emphasized text in dark mode |

### useTheme() Returns

```typescript
const {
  colors,      // All dynamic colors
  shadows,     // Shadow styles (sm, md, lg)
  animations,  // Animation configs
  colorScheme, // 'light' | 'dark' | null
  isDark,      // boolean
} = useTheme();
```

---

## Questions?

If you're unsure which color to use:
1. Check similar components in the codebase (especially home.tsx, history.tsx)
2. Refer to the Color Palette section above
3. Test in both light and dark mode
4. When in doubt, use semantic names (text.primary, background.card, etc.) over numbered scales
