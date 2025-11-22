import React, { useImperativeHandle, forwardRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';

const ACTION_WIDTH = 160; // Width of the action buttons area (80px each button)
const SWIPE_THRESHOLD = 80; // Minimum swipe distance to reveal actions

interface SwipeableMealCardProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onPress: () => void;
  mealTitle: string;
  isPending?: boolean;
}

export interface SwipeableMealCardRef {
  close: () => void;
}

const SwipeableMealCard = forwardRef<SwipeableMealCardRef, SwipeableMealCardProps>(
  ({ children, onEdit, onDelete, onPress, mealTitle, isPending = false }, ref) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const translateX = useSharedValue(0);
    const isOpen = useSharedValue(false);

    // Pending meals only show delete button (80px), normal meals show both (160px)
    const actionWidth = isPending ? 80 : ACTION_WIDTH;
    const actionWidthShared = useSharedValue(actionWidth);

    // Use a smaller threshold for pending items (50% of width vs full SWIPE_THRESHOLD)
    const swipeThreshold = isPending ? 40 : SWIPE_THRESHOLD;
    const swipeThresholdShared = useSharedValue(swipeThreshold);

    // Update shared values when isPending changes
    useEffect(() => {
      actionWidthShared.value = isPending ? 80 : ACTION_WIDTH;
      swipeThresholdShared.value = isPending ? 40 : SWIPE_THRESHOLD;
    }, [isPending, actionWidthShared, swipeThresholdShared]);

    // Expose close method to parent
    useImperativeHandle(ref, () => ({
      close: () => {
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
        });
        isOpen.value = false;
      },
    }));

    const triggerHaptic = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleDelete = () => {
      Alert.alert(
        'Delete Meal',
        `Are you sure you want to delete "${mealTitle}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: onDelete,
          },
        ]
      );
    };

    const pan = Gesture.Pan()
      .activeOffsetX([-10, 10]) // Require 10px horizontal movement to activate
      .failOffsetY([-10, 10]) // Cancel if vertical movement exceeds 10px (don't interfere with scroll)
      .onUpdate((event) => {
        'worklet';
        // Only allow swiping left (negative translation)
        if (event.translationX < 0) {
          // Limit swipe to actionWidthShared
          translateX.value = Math.max(event.translationX, -actionWidthShared.value);
        } else if (isOpen.value) {
          // If already open, allow swiping right to close
          translateX.value = Math.max(event.translationX - actionWidthShared.value, -actionWidthShared.value);
        }
      })
      .onEnd(() => {
        'worklet';
        if (translateX.value < -swipeThresholdShared.value) {
          // Swipe threshold met - open actions
          translateX.value = withSpring(-actionWidthShared.value, {
            damping: 20,
            stiffness: 300,
          });
          isOpen.value = true;
          runOnJS(triggerHaptic)();
        } else {
          // Swipe threshold not met - close
          translateX.value = withSpring(0, {
            damping: 20,
            stiffness: 300,
          });
          isOpen.value = false;
        }
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    return (
      <View style={styles.container}>
        {/* Action buttons - positioned behind the card */}
        <View style={[styles.actionsContainer, { width: actionWidth }]}>
          {!isPending && (
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={onEdit}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>✏️</Text>
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>🗑️</Text>
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Swipeable card */}
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.card, animatedStyle]}>
            <Pressable
              onPress={isPending ? undefined : onPress}
              style={[styles.mealItem, isPending && styles.mealItemDisabled]}
              disabled={isPending}
            >
              {children}
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      position: 'relative',
      width: '100%',
      overflow: 'hidden',
      borderRadius: 16,
    },
    actionsContainer: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      flexDirection: 'row',
      width: ACTION_WIDTH,
    },
    actionButton: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 4,
    },
    editButton: {
      backgroundColor: '#007AFF', // iOS blue
    },
    deleteButton: {
      backgroundColor: '#FF3B30', // iOS red
    },
    actionIcon: {
      fontSize: 24,
      marginBottom: 4,
    },
    actionText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    card: {
      width: '100%',
    },
    mealItem: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.background.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    mealItemDisabled: {
      backgroundColor: colors.primary[25] || '#F8FCFC',
      borderColor: colors.primary[200],
    },
  });
}

export default SwipeableMealCard;
