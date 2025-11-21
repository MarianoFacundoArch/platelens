import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { theme } from '@/config/theme';
import { useHaptics } from '@/hooks/useHaptics';

interface BottomSheetProps {
  /** Visibility state */
  visible: boolean;
  /** Close handler */
  onClose: () => void;
  /** Sheet content */
  children: React.ReactNode;
  /** Height of the sheet */
  height?: number | 'auto';
  /** Custom style */
  style?: ViewStyle;
  /** Enable haptic feedback */
  haptics?: boolean;
  /** Lift sheet when keyboard is visible */
  avoidKeyboard?: boolean;
  /** Optional keyboard offset for avoiding view */
  keyboardOffset?: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Snap points
const DEFAULT_MEDIUM_HEIGHT = SCREEN_HEIGHT * 0.65; // 65% of screen height
const DEFAULT_FULL_HEIGHT = SCREEN_HEIGHT * 0.95; // 95% to leave some space at top
const DISMISS_DRAG_LIMIT = SCREEN_HEIGHT * 0.35; // Max distance the sheet follows the finger before dismiss
const DISMISS_TRIGGER = 120; // Distance needed to trigger a dismissal when dragging down

export function BottomSheet({
  visible,
  onClose,
  children,
  height = 'auto',
  style,
  haptics: enableHaptics = true,
  avoidKeyboard = false,
  keyboardOffset,
}: BottomSheetProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { light } = useHaptics();
  const mediumSnapPoint = typeof height === 'number'
    ? Math.min(height, DEFAULT_FULL_HEIGHT)
    : DEFAULT_MEDIUM_HEIGHT;
  const fullSnapPoint = Math.max(mediumSnapPoint, DEFAULT_FULL_HEIGHT);
  const isClosingRef = useRef(false);

  // Reanimated shared values
  const translateY = useSharedValue(SCREEN_HEIGHT); // Start off-screen for smoother entry
  const sheetHeight = useSharedValue(mediumSnapPoint);
  const context = useSharedValue({ y: 0, startHeight: mediumSnapPoint });
  const lastSnapPoint = useSharedValue<'medium' | 'full'>('medium');

  // Haptic feedback helper
  const triggerHaptic = () => {
    if (enableHaptics) {
      light();
    }
  };

  const resetClosing = () => {
    isClosingRef.current = false;
  };

  const finishClose = () => {
    isClosingRef.current = false;
    onClose();
  };

  const animateClose = (shouldHaptic: boolean = true) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (shouldHaptic) {
      triggerHaptic();
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();

    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(finishClose)();
      } else {
        runOnJS(resetClosing)();
      }
    });
  };

  // Pan gesture for drag-to-expand/dismiss
  const panGesture = Gesture.Pan()
    .activeOffsetY([-5, 5]) // Enable vertical pan in both directions
    .failOffsetX([-10, 10]) // Prevent horizontal interference
    .onStart(() => {
      context.value = { y: translateY.value, startHeight: sheetHeight.value };
    })
    .onUpdate((event) => {
      const translation = event.translationY;
      const startHeight = context.value.startHeight;

      // Calculate new height (dragging up = negative translation = increase height)
      const newHeight = startHeight - translation;

      // Dragging downward: first shrink to medium, then follow the finger for dismiss gesture
      if (translation >= 0) {
        if (startHeight > mediumSnapPoint) {
          const heightDelta = Math.max(0, startHeight - mediumSnapPoint);
          const remainingAfterSnap = translation - heightDelta;

          if (remainingAfterSnap < 0) {
            // Shrinking from full toward medium
            sheetHeight.value = Math.max(mediumSnapPoint, Math.min(fullSnapPoint, newHeight));
            translateY.value = 0;
            return;
          }

          // Past the medium snap: follow the finger downwards
          sheetHeight.value = mediumSnapPoint;
          translateY.value = Math.min(DISMISS_DRAG_LIMIT, remainingAfterSnap);
          return;
        }

        sheetHeight.value = mediumSnapPoint;
        translateY.value = Math.min(DISMISS_DRAG_LIMIT, translation);
        return;
      }

      // Dragging up: expand toward full height
      sheetHeight.value = Math.max(
        mediumSnapPoint,
        Math.min(fullSnapPoint, newHeight)
      );
      translateY.value = 0;
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      const currentHeight = sheetHeight.value;

      // If in dismiss zone (dragged down past medium height) or very fast swipe down
      if (translateY.value > DISMISS_TRIGGER || velocity > 800) {
        runOnJS(animateClose)();
        return;
      }

      // Snap to nearest point based on current height and velocity
      const midPoint = (mediumSnapPoint + fullSnapPoint) / 2;

      if (currentHeight > midPoint || velocity < -500) {
        // Snap to full screen
        if (lastSnapPoint.value !== 'full') {
          runOnJS(triggerHaptic)();
        }
        lastSnapPoint.value = 'full';
        sheetHeight.value = withSpring(fullSnapPoint, { damping: 20, stiffness: 100 });
      } else {
        // Snap to medium
        if (lastSnapPoint.value === 'full') {
          runOnJS(triggerHaptic)();
        }
        lastSnapPoint.value = 'medium';
        sheetHeight.value = withSpring(mediumSnapPoint, { damping: 20, stiffness: 100 });
      }

      // Reset any dismiss translation
      translateY.value = withSpring(0, { damping: 20, stiffness: 100 });
    });

  // Animated style for the sheet
  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      height: sheetHeight.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  useEffect(() => {
    if (visible) {
      // Reset to medium height when opening
      isClosingRef.current = false;
      sheetHeight.value = mediumSnapPoint;
      translateY.value = SCREEN_HEIGHT;
      lastSnapPoint.value = 'medium';

      // Fade in backdrop
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Slide sheet in from bottom to medium snap-point
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 140,
      });

      if (enableHaptics) {
        light();
      }
      return;
    }

    // Fade out backdrop and ensure sheet is tucked away if parent hides it
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 220 });
  }, [visible, mediumSnapPoint, enableHaptics, light, sheetHeight, translateY, lastSnapPoint]);

  const keyboardOffsetValue = keyboardOffset ?? (Platform.OS === 'ios' ? 12 : 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={animateClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={styles.backdropPressable} onPress={animateClose} />
        </Animated.View>

        {/* Bottom Sheet */}
        <KeyboardAvoidingView
          enabled={avoidKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardOffsetValue}
          style={styles.avoider}
        >
          <GestureDetector gesture={panGesture}>
            <Reanimated.View
              style={[
                styles.sheet,
                animatedSheetStyle,
                style,
              ]}
            >
              {/* Handle */}
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>

              {/* Content */}
              <View style={styles.content}>{children}</View>
            </Reanimated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  avoider: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: theme.colors.background.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...theme.shadows.xl,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.ink[300],
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});
