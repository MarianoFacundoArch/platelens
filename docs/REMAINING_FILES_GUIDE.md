# Quick Reference Guide - Update Remaining Files

## Files Still Needing Updates (11 files)

1. SwipeableMealCard.tsx
2. TextMealModal.tsx
3. CalorieRing.tsx
4. AddMealModal.tsx
5. MealTypeSelector.tsx
6. MealTypePicker.tsx
7. PortionSelector.tsx
8. MealEntryFAB.tsx
9. WeeklySummaryView.tsx
10. AnalyticsView.tsx
11. MonthlyCalendarView.tsx (if exists)

## Step-by-Step Pattern (Copy-Paste Friendly)

### Step 1: Update Imports
Find and replace:
```typescript
import { theme } from '@/config/theme';
```
With:
```typescript
import { useTheme } from '@/hooks/useTheme';
```

Also ensure `useMemo` is imported from React:
```typescript
import { useMemo } from 'react';
```

### Step 2: Add Hook to Component
At the top of your component function, add:
```typescript
const { colors } = useTheme();
```

### Step 3: Add Memoized Styles
Before the component's return statement, add:
```typescript
const styles = useMemo(() => createStyles(colors), [colors]);
```

### Step 4: Convert StyleSheet
Find this pattern at the bottom:
```typescript
const styles = StyleSheet.create({
  // ... styles
});
```

Replace with:
```typescript
function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    // ... styles
  });
}
```

### Step 5: Update Color References
Inside the `createStyles` function, replace:

```typescript
// Find → Replace
theme.colors.ink[900] → colors.text.primary
theme.colors.ink[800] → colors.text.primary
theme.colors.ink[700] → colors.text.secondary
theme.colors.ink[600] → colors.text.secondary
theme.colors.ink[500] → colors.text.secondary
theme.colors.ink[400] → colors.text.tertiary
theme.colors.ink[300] → colors.border.strong
theme.colors.ink[200] → colors.border.medium
theme.colors.ink[100] → colors.border.subtle
theme.colors.ink[50]  → colors.background.subtle

theme.colors.background.card → colors.background.card
theme.colors.background.base → colors.background.base
theme.colors.overlay → colors.overlay

// Primary/accent colors stay the same
theme.colors.primary[X] → colors.primary[X]
theme.colors.error → colors.error
theme.colors.success → colors.success
theme.colors.protein.main → colors.protein.main
theme.colors.carbs.main → colors.carbs.main
theme.colors.fat.main → colors.fat.main
```

### Step 6: Update Inline JSX Colors
Find any inline color usage in JSX like:
```typescript
<Ionicons color={theme.colors.ink[500]} />
<View style={{ backgroundColor: theme.colors.ink[50] }} />
```

Replace `theme.colors` with `colors`:
```typescript
<Ionicons color={colors.text.secondary} />
<View style={{ backgroundColor: colors.background.subtle }} />
```

## Common Patterns to Look For

### Pattern 1: Icon Colors
```typescript
// BEFORE:
<Ionicons name="close" color={theme.colors.ink[500]} />

// AFTER:
<Ionicons name="close" color={colors.text.secondary} />
```

### Pattern 2: Borders
```typescript
// BEFORE:
borderColor: theme.colors.ink[100]

// AFTER:
borderColor: colors.border.subtle
```

### Pattern 3: Backgrounds
```typescript
// BEFORE:
backgroundColor: theme.colors.ink[50]

// AFTER:
backgroundColor: colors.background.subtle
```

### Pattern 4: Text Colors
```typescript
// BEFORE:
color: theme.colors.ink[900]  // Dark text
color: theme.colors.ink[500]  // Medium text
color: theme.colors.ink[400]  // Light text

// AFTER:
color: colors.text.primary
color: colors.text.secondary
color: colors.text.tertiary
```

## Example: Complete File Update

```typescript
// BEFORE:
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/config/theme';

export function MyComponent() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.ink[50],
  },
  title: {
    color: theme.colors.ink[900],
  },
});

// AFTER:
import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';

export function MyComponent() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.subtle,
    },
    title: {
      color: colors.text.primary,
    },
  });
}
```

## Semantic Color Mapping Reference

| Old Color | New Semantic Color | Use Case |
|-----------|-------------------|----------|
| `ink[900]` | `text.primary` | Main headings, primary text |
| `ink[800]` | `text.primary` | Strong text |
| `ink[700]` | `text.secondary` | Subheadings |
| `ink[600]` | `text.secondary` | Secondary text |
| `ink[500]` | `text.secondary` | Body text, labels |
| `ink[400]` | `text.tertiary` | Placeholder, hint text |
| `ink[300]` | `border.strong` | Strong borders |
| `ink[200]` | `border.medium` | Medium borders |
| `ink[100]` | `border.subtle` | Light borders, dividers |
| `ink[50]` | `background.subtle` | Light backgrounds, cards |
| `overlay` | `overlay` | Modal overlays |
| `background.card` | `background.card` | Card backgrounds |

## Tips

1. **Search for "theme.colors"** in each file to find all occurrences
2. **Update imports first** - makes the rest easier
3. **Test after each file** - ensure no regressions
4. **Check both light and dark mode** after updates
5. **Use Find & Replace** for repetitive changes

## Testing Checklist

After updating each file:
- [ ] No TypeScript errors
- [ ] Component renders correctly
- [ ] Colors look correct in light mode
- [ ] Colors look correct in dark mode
- [ ] No runtime errors in console
- [ ] Interactions work as expected
