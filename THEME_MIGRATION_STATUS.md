# Theme System Migration - Progress Report

## ✅ COMPLETED FILES (3/17)

### 1. BottomSheet.tsx
- ✅ Added useTheme hook
- ✅ Converted to dynamic styles with useMemo
- ✅ Updated semantic colors (overlay, background.card, border.medium)

### 2. MealDetailSheet.tsx
- ✅ Added useTheme hook
- ✅ Converted to dynamic styles with useMemo
- ✅ Updated all inline color references
- ✅ Updated semantic colors (text.primary, text.secondary, text.tertiary, background.subtle, border.subtle)

### 3. MealList.tsx
- ✅ Added useTheme hook to main component AND PulsingPlaceholder sub-component
- ✅ Converted to dynamic styles with useMemo
- ✅ Updated all inline color references
- ✅ Updated semantic colors (text.primary, text.secondary, text.tertiary, border.subtle)

## 🔄 REMAINING FILES (14/17)

All remaining files follow the same pattern and need these updates:

### Pattern to Apply:
1. Import changes:
   - Remove: `import { theme } from '@/config/theme';`
   - Add: `import { useTheme } from '@/hooks/useTheme';`
   - Add: `import { useMemo } from 'react';` (if not already imported)

2. Component changes:
   - Add at top of component: `const { colors } = useTheme();`
   - Add before return: `const styles = useMemo(() => createStyles(colors), [colors]);`

3. Styles changes:
   - Convert: `const styles = StyleSheet.create({...})`
   - To: `function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) { return StyleSheet.create({...}); }`
   - Replace all `theme.colors.X` with `colors.X`

4. Semantic color mappings:
   - `ink[900]` → `text.primary`
   - `ink[500/600/700]` → `text.secondary`
   - `ink[400]` → `text.tertiary`
   - `ink[100]` → `border.subtle`
   - `ink[50]` → `background.subtle`
   - `background.card` → `background.card`
   - `overlay` → `overlay`

### Files Pending Update:
4. SwipeableMealCard.tsx
5. TextMealModal.tsx
6. CalorieRing.tsx
7. AddMealModal.tsx
8. MealTypeSelector.tsx
9. MealTypePicker.tsx
10. PortionSelector.tsx
11. MealEntryFAB.tsx
12. WeeklySummaryView.tsx
13. AnalyticsView.tsx
14. Input.tsx
15. LoadingSkeleton.tsx
16. Button.tsx
17. MonthlyCalendarView.tsx (if exists)

## 📝 Notes
- The priority file (BottomSheet.tsx) that was causing the error has been fixed
- All completed files now support dark mode through the centralized theme system
- Remaining files are straightforward conversions following the established pattern
