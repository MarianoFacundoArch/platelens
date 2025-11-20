# Swipeable Meal Cards Implementation

## Overview
Added iOS-style swipe-to-reveal actions for meal cards in the Today's Meals list and History Daily view.

## What Was Implemented

### 1. New Component: SwipeableMealCard
**Location:** `app/components/SwipeableMealCard.tsx`

**Features:**
- **Swipe Left** → Reveals Edit (blue) and Delete (red) action buttons
- **Swipe Right** → Closes the actions if already open
- **Tap** → Original functionality (opens MealDetailSheet) still works
- **Haptic Feedback** → Light haptic when actions are revealed
- **Auto-close** → Only one card can be swiped open at a time
- **Spring Animation** → Smooth, natural iOS-style animation

**Technical Details:**
- Uses `react-native-gesture-handler` for pan gestures
- Uses `react-native-reanimated` for performant animations
- Swipe threshold: 80px (half the action width)
- Action buttons width: 160px total (80px each)
- Gesture handler configured to not interfere with vertical scrolling

### 2. Updated Components

#### MealList.tsx
- Added `onEdit` and `onDelete` props
- Wraps each meal card with `SwipeableMealCard`
- Manages refs to ensure only one card is open at a time
- Closes all cards when user taps on a meal or triggers an action

#### DailyView.tsx
- Added `onMealEdit` and `onMealDelete` props
- Passes callbacks through to MealList

#### Home Screen (home.tsx)
- Passes `handleMealPress` for edit action
- Passes `handleDeleteMeal` for delete action

#### History Screen (history.tsx)
- Passes `handleMealPress` for edit action
- Passes `handleDeleteMeal` for delete action

## How It Works

### User Interaction Flow

1. **Normal Tap** → Opens MealDetailSheet (existing behavior)
2. **Swipe Left** → Reveals Edit and Delete buttons
3. **Tap Edit** → Closes swipe, opens MealDetailSheet
4. **Tap Delete** → Shows confirmation alert, then deletes if confirmed
5. **Swipe Another Card** → Auto-closes the previously open card
6. **Scroll List** → Cards remain in their current state (open/closed)

### Gesture Configuration

```typescript
activeOffsetX: [-10, 10]     // Requires 10px horizontal movement
failOffsetY: [-10, 10]       // Cancels if vertical > 10px (no scroll interference)
```

This ensures:
- Vertical scrolling works normally
- Swipe gestures don't trigger accidentally
- Only intentional horizontal swipes activate the feature

## Testing Checklist

### Basic Functionality
- [ ] Swipe left reveals Edit and Delete buttons
- [ ] Swipe right or tap elsewhere closes actions
- [ ] Tap Edit button opens MealDetailSheet
- [ ] Tap Delete button shows confirmation alert
- [ ] Confirming delete removes the meal and reloads list

### Gesture Interactions
- [ ] Vertical scrolling works without triggering swipe
- [ ] Can tap meal card normally to open detail sheet
- [ ] Haptic feedback occurs when actions reveal
- [ ] Smooth spring animation on open/close
- [ ] Only one card can be open at a time

### Edge Cases
- [ ] Swipe works with meal cards of varying content sizes
- [ ] Works with meals that have images
- [ ] Works with meals without images
- [ ] Swipe on first meal in list
- [ ] Swipe on last meal in list
- [ ] Rapid swipes don't break the UI
- [ ] Delete last meal in list doesn't crash

### Cross-Screen Testing
- [ ] Works in Home screen Today's Meals
- [ ] Works in History Daily view
- [ ] Both screens properly reload after delete
- [ ] Edit functionality works the same in both screens

## Color Scheme

**Edit Button:**
- Background: `#007AFF` (iOS blue)
- Icon: ✏️ (pencil emoji)
- Text: "Edit" in white

**Delete Button:**
- Background: `#FF3B30` (iOS red)
- Icon: 🗑️ (trash emoji)
- Text: "Delete" in white

## Future Enhancements (Optional)

1. **Quick Delete:** Full swipe triggers instant delete (with undo toast)
2. **Swipe Right Actions:** Add quick actions like "Duplicate" or "Share"
3. **Custom Actions:** Allow different actions per meal type
4. **Animated Icons:** Add micro-animations to action buttons on reveal
5. **Auto-close on Scroll:** Close open cards when user scrolls the list

## Files Modified

- ✨ **New:** `app/components/SwipeableMealCard.tsx`
- 📝 **Modified:** `app/components/MealList.tsx`
- 📝 **Modified:** `app/components/views/DailyView.tsx`
- 📝 **Modified:** `app/app/(app)/home.tsx`
- 📝 **Modified:** `app/app/(app)/history.tsx`

## Dependencies Used

All dependencies are already in your project:
- `react-native-gesture-handler`
- `react-native-reanimated`
- `expo-haptics`

No additional packages needed!
