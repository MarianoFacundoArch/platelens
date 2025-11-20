import React, { useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@/config/theme';

const ACTION_WIDTH = 160; // Width of the action buttons area (80px each button)
const SWIPE_THRESHOLD = 80; // Minimum swipe distance to reveal actions

interface SwipeableMealCardProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onPress: () => void;
  mealTitle: string;
}

export interface SwipeableMealCardRef {
  close: () => void;
}

const SwipeableMealCard = forwardRef<SwipeableMealCardRef, SwipeableMealCardProps>(
  ({ children, onEdit, onDelete, onPress, mealTitle }, ref) => {
    const translateX = useSharedValue(0);
    const isOpen = useSharedValue(false);

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
        // Only allow swiping left (negative translation)
        if (event.translationX < 0) {
          // Limit swipe to ACTION_WIDTH
          translateX.value = Math.max(event.translationX, -ACTION_WIDTH);
        } else if (isOpen.value) {
          // If already open, allow swiping right to close
          translateX.value = Math.max(event.translationX - ACTION_WIDTH, -ACTION_WIDTH);
        }
      })
      .onEnd(() => {
        if (translateX.value < -SWIPE_THRESHOLD) {
          // Swipe threshold met - open actions
          translateX.value = withSpring(-ACTION_WIDTH, {
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
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={onEdit}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
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
            <Pressable onPress={onPress} style={styles.mealItem}>
              {children}
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);

const styles = StyleSheet.create({
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.ink[100],
  },
});

export default SwipeableMealCard;
