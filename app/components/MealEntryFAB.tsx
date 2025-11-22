import { View, Pressable, StyleSheet, Animated, Text, Dimensions, PanResponder } from 'react-native';
import { useState, useRef, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';

type MealEntryFABProps = {
  onCameraPress: () => void;
  onTextPress: () => void;
};

const STORAGE_KEY = 'platelens:fabPosition';
const BUTTON_SIZE = 64;
const OPTION_BUTTON_SIZE = 56;
const MENU_GAP = 12; // Gap between icon and label
const EDGE_PADDING = 16;
const TAB_BAR_HEIGHT = 50; // Actual React Navigation tab bar height
const TAB_OVERLAP_ALLOWANCE = 10; // Allow minimal overlap with tab bar
const BOTTOM_EXTRA_PADDING = 12; // Additional padding to account for shadow/glow effects

type EdgeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

function clampPosition(
  pos: { x: number; y: number },
  screenWidth: number,
  screenHeight: number,
  insets: EdgeInsets
) {
  const maxX = screenWidth - BUTTON_SIZE - EDGE_PADDING - insets.right;
  // Keep FAB above tab bar with extra padding for shadow/glow effects
  const maxY = screenHeight - BUTTON_SIZE - EDGE_PADDING - insets.bottom - (TAB_BAR_HEIGHT - TAB_OVERLAP_ALLOWANCE) - BOTTOM_EXTRA_PADDING;
  const minX = EDGE_PADDING + insets.left;
  // Allow FAB closer to top by only using safe area inset
  const minY = insets.top;

  return {
    x: Math.min(Math.max(pos.x, minX), maxX),
    y: Math.min(Math.max(pos.y, minY), maxY),
  };
}

export function MealEntryFAB({ onCameraPress, onTextPress }: MealEntryFABProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { medium, light } = useHaptics();
  const insets = useSafeAreaInsets();

  // Track menu positioning based on FAB location
  const [menuPosition, setMenuPosition] = useState<'above' | 'below'>('above');
  const [menuAlign, setMenuAlign] = useState<'left' | 'right'>('right');

  // Use screen dimensions instead of window dimensions
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('screen');
    return { width, height };
  });

  const defaultPosition = useRef(
    clampPosition(
      {
        x: dimensions.width - BUTTON_SIZE - EDGE_PADDING,
        y: dimensions.height - BUTTON_SIZE - EDGE_PADDING - TAB_BAR_HEIGHT,
      },
      dimensions.width,
      dimensions.height,
      insets
    ),
  ).current;
  const [position, setPosition] = useState(defaultPosition);
  const pan = useRef(new Animated.ValueXY(defaultPosition)).current;

  // Debug log to verify FAB initialization and set initial menu position
  useEffect(() => {
    console.log('FAB initialized at position:', defaultPosition);
    console.log('Screen dimensions:', dimensions);
    console.log('Safe area insets:', insets);
    updateMenuPosition(defaultPosition); // Set initial menu position
  }, [defaultPosition, dimensions, insets]);

  // Listen for dimension changes (orientation, etc.)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ screen }) => {
      setDimensions({ width: screen.width, height: screen.height });
      // Re-clamp position to ensure it stays within new bounds
      const currentPos = pan.__getValue() as any;
      const reclamped = clampPosition(currentPos, screen.width, screen.height, insets);
      if (currentPos.x !== reclamped.x || currentPos.y !== reclamped.y) {
        setPosition(reclamped);
        pan.setValue(reclamped);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reclamped)).catch(() => {});
      }
    });

    return () => subscription?.remove();
  }, [pan, insets]);

  // Animated values for expansion
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const option1Anim = useRef(new Animated.Value(0)).current;
  const option2Anim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const expandedRef = useRef(isExpanded);

  // Load saved position
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!value) return;
        try {
          const parsed = JSON.parse(value);
          // Validate the parsed position is valid
          if (
            typeof parsed?.x === 'number' &&
            typeof parsed?.y === 'number' &&
            !isNaN(parsed.x) &&
            !isNaN(parsed.y) &&
            isFinite(parsed.x) &&
            isFinite(parsed.y)
          ) {
            const clamped = clampPosition(parsed, dimensions.width, dimensions.height, insets);
            // Additional safety check: ensure clamped position is valid
            if (
              clamped.x >= 0 &&
              clamped.y >= 0 &&
              clamped.x < dimensions.width &&
              clamped.y < dimensions.height
            ) {
              setPosition(clamped);
              pan.setValue(clamped);
              updateMenuPosition(clamped); // Update menu position on load
            } else {
              // Position is out of bounds, reset to default
              console.warn('FAB position out of bounds, resetting to default');
              AsyncStorage.removeItem(STORAGE_KEY);
            }
          } else {
            // Invalid position data, reset to default
            console.warn('Invalid FAB position data, resetting to default');
            AsyncStorage.removeItem(STORAGE_KEY);
          }
        } catch (e) {
          // Failed to parse, reset to default
          console.warn('Failed to parse FAB position, resetting to default');
          AsyncStorage.removeItem(STORAGE_KEY);
        }
      })
      .catch(() => {
        // ignore storage failures
      });
  }, [pan, dimensions, insets]);

  // Update menu positioning based on FAB location
  const updateMenuPosition = (pos: { x: number; y: number }) => {
    const screenMidY = dimensions.height / 2;
    const screenMidX = dimensions.width / 2;

    // If FAB is in bottom half, show options above; if in top half, show below
    setMenuPosition(pos.y > screenMidY ? 'above' : 'below');

    // If FAB is on right side, align options to right; if on left, align to left
    setMenuAlign(pos.x > screenMidX ? 'right' : 'left');
  };

  const persistPosition = (pos: { x: number; y: number }) => {
    const clamped = clampPosition(pos, dimensions.width, dimensions.height, insets);

    // Additional safety validation before persisting
    if (
      clamped.x < 0 ||
      clamped.y < 0 ||
      clamped.x > dimensions.width ||
      clamped.y > dimensions.height
    ) {
      console.warn('Attempted to persist invalid FAB position, using default');
      return;
    }

    setPosition(clamped);
    pan.setValue(clamped);
    updateMenuPosition(clamped); // Update menu position when FAB moves
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clamped)).catch(() => {
      // ignore storage failures
    });
  };

  const dragStartRef = useRef(position);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6,
      onPanResponderGrant: () => {
        // Get current position directly from pan to avoid stale closure
        dragStartRef.current = pan.__getValue() as { x: number; y: number };
        setIsDragging(true);
      },
      onPanResponderMove: (_, gestureState) => {
        const next = clampPosition(
          {
            x: dragStartRef.current.x + gestureState.dx,
            y: dragStartRef.current.y + gestureState.dy,
          },
          dimensions.width,
          dimensions.height,
          insets
        );
        pan.setValue(next);
        updateMenuPosition(next); // Update menu orientation in real-time while dragging
      },
      onPanResponderRelease: (_, gestureState) => {
        const throwMultiplier = 40; // Reduced from 140 to prevent flying off-screen
        const target = clampPosition(
          {
            x: dragStartRef.current.x + gestureState.dx + gestureState.vx * throwMultiplier,
            y: dragStartRef.current.y + gestureState.dy + gestureState.vy * throwMultiplier,
          },
          dimensions.width,
          dimensions.height,
          insets
        );
        Animated.spring(pan, {
          toValue: target,
          useNativeDriver: false,
          speed: 15,
          bounciness: 5, // Reduced from 10
          overshootClamping: true, // Prevent overshooting bounds
        }).start(() => {
          // Double-check position after animation completes
          const finalPos = pan.__getValue() as any;
          const safeFinal = clampPosition(finalPos, dimensions.width, dimensions.height, insets);
          if (finalPos.x !== safeFinal.x || finalPos.y !== safeFinal.y) {
            pan.setValue(safeFinal);
          }
          persistPosition(safeFinal);
        });
        setIsDragging(false);
      },
      onPanResponderTerminate: () => {
        const currentPos = pan.__getValue() as any;
        const safePos = clampPosition(currentPos, dimensions.width, dimensions.height, insets);
        persistPosition(safePos);
        setIsDragging(false);
      },
      })
  ).current;

  useEffect(() => {
    expandedRef.current = isExpanded;
  }, [isExpanded]);

  // Ensure animated value matches persisted position after hydration
  useEffect(() => {
    pan.setValue(position);
  }, [pan, position]);

  // Keep dragStartRef in sync with position changes
  useEffect(() => {
    dragStartRef.current = position;
  }, [position]);

  const toggleExpand = () => {
    medium();
    setIsExpanded((prev) => !prev);
  };

  const handleCameraPress = () => {
    light();
    toggleExpand();
    // Small delay for animation to start before navigation
    setTimeout(() => onCameraPress(), 100);
  };

  const handleTextPress = () => {
    light();
    toggleExpand();
    setTimeout(() => onTextPress(), 100);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const option1TranslateY = option1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  const option2TranslateY = option2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  // Drive animations from state to avoid desync between UI and overlay
  useEffect(() => {
    if (isExpanded) {
      setShowOptions(true);
    }

    const toValue = isExpanded ? 1 : 0;

    Animated.parallel([
      Animated.spring(rotateAnim, {
        toValue,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.stagger(50, [
        Animated.spring(option1Anim, {
          toValue,
          useNativeDriver: true,
          friction: 8,
        }),
        Animated.spring(option2Anim, {
          toValue,
          useNativeDriver: true,
          friction: 8,
        }),
      ]),
      Animated.timing(overlayOpacity, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (!expandedRef.current) {
        setShowOptions(false);
        // Guarantee final closed state in case the animation was interrupted
        rotateAnim.setValue(0);
        option1Anim.setValue(0);
        option2Anim.setValue(0);
        overlayOpacity.setValue(0);
      }
    });
  }, [isExpanded]);

  return (
    <>
      {/* Overlay to close when tapping outside */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlayOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={toggleExpand} />
        </Animated.View>
      )}

      {/* Menu Items Container - separate from FAB */}
      {showOptions && (() => {
        // Calculate icon position to align vertically with FAB center
        const fabCenterX = Animated.add(pan.x, BUTTON_SIZE / 2);
        const iconLeftEdge = Animated.subtract(fabCenterX, OPTION_BUTTON_SIZE / 2);

        return (
          <Animated.View
            style={[
              styles.menuContainer,
              {
                // Position container so icons align with FAB
                left: iconLeftEdge,
                top: menuPosition === 'above'
                  ? Animated.subtract(pan.y, 140) // Above FAB (approximate menu height)
                  : Animated.add(pan.y, BUTTON_SIZE + 8), // Below FAB
                // Align items to start (icon position) or end (for right-aligned)
                alignItems: menuAlign === 'right' ? 'flex-end' : 'flex-start',
              }
            ]}
          >
            {/* Menu items in vertical stack */}
            <Animated.View
              pointerEvents={isExpanded ? 'auto' : 'none'}
              style={[
                styles.menuOptionWrapper,
                {
                  transform: [{ translateY: option2TranslateY }],
                  opacity: option2Anim,
                },
              ]}
            >
              <Pressable
                onPress={handleTextPress}
                style={({ pressed }) => [
                  styles.optionButton,
                  pressed && styles.optionPressed,
                ]}
              >
                <View style={styles.optionButtonInner}>
                  <Ionicons name="create-outline" size={24} color={colors.primary[600]} />
                </View>
              </Pressable>

              {menuAlign === 'left' && (
                <View style={styles.optionLabelContainer}>
                  <Text style={styles.optionLabel}>Describe Meal</Text>
                </View>
              )}
              {menuAlign === 'right' && (
                <View style={[styles.optionLabelContainer, { position: 'absolute', right: OPTION_BUTTON_SIZE + MENU_GAP }]}>
                  <Text style={styles.optionLabel}>Describe Meal</Text>
                </View>
              )}
            </Animated.View>

            <Animated.View
              pointerEvents={isExpanded ? 'auto' : 'none'}
              style={[
                styles.menuOptionWrapper,
                {
                  transform: [{ translateY: option1TranslateY }],
                  opacity: option1Anim,
                },
              ]}
            >
              <Pressable
                onPress={handleCameraPress}
                style={({ pressed }) => [
                  styles.optionButton,
                  pressed && styles.optionPressed,
                ]}
              >
                <View style={styles.optionButtonInner}>
                  <Ionicons name="camera-outline" size={24} color={colors.primary[600]} />
                </View>
              </Pressable>

              {menuAlign === 'left' && (
                <View style={styles.optionLabelContainer}>
                  <Text style={styles.optionLabel}>Take Photo</Text>
                </View>
              )}
              {menuAlign === 'right' && (
                <View style={[styles.optionLabelContainer, { position: 'absolute', right: OPTION_BUTTON_SIZE + MENU_GAP }]}>
                  <Text style={styles.optionLabel}>Take Photo</Text>
                </View>
              )}
            </Animated.View>
          </Animated.View>
        );
      })()}

      {/* Main FAB - completely separate, never moves except when dragged */}
      <Animated.View
        style={[
          styles.fabButton,
          pan.getLayout(),
          { opacity: isDragging ? 0.9 : 1 },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Main FAB button only - no menu items here */}
        <Pressable
          onPress={toggleExpand}
          style={({ pressed }) => [
            styles.mainButton,
            pressed && styles.mainPressed,
          ]}
        >
          <LinearGradient
            colors={[colors.primary[500], colors.primary[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainGradient}
          >
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <Ionicons name="add" size={32} color={colors.text.inverse} />
            </Animated.View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlay,
      zIndex: 999,
    },
    menuContainer: {
      position: 'absolute',
      zIndex: 1001,
      gap: 8,
    },
    menuOptionWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: MENU_GAP,
      marginBottom: 8,
    },
    fabButton: {
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 1002,
    },
    optionLabelContainer: {
      backgroundColor: colors.background.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      maxWidth: 160,
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
    optionButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      shadowColor: colors.primary[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    optionButtonInner: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.background.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.primary[100],
    },
    optionPressed: {
      transform: [{ scale: 0.92 }],
    },
    mainButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      shadowColor: colors.primary[500],
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 12,
      overflow: 'hidden',
    },
    mainPressed: {
      transform: [{ scale: 0.92 }],
    },
    mainGradient: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
