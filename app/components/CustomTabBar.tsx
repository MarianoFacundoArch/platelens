import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 80;
const FAB_SIZE = 64;
const OPTION_BUTTON_SIZE = 56;

interface TabConfig {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  home: {
    name: 'home',
    label: 'Home',
    icon: 'home-outline',
    iconActive: 'home',
  },
  history: {
    name: 'history',
    label: 'History',
    icon: 'calendar-outline',
    iconActive: 'calendar',
  },
  coach: {
    name: 'coach',
    label: 'Coach',
    icon: 'sparkles-outline',
    iconActive: 'sparkles',
  },
  profile: {
    name: 'profile',
    label: 'Profile',
    icon: 'person-outline',
    iconActive: 'person',
  },
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { selection, medium } = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // FAB expansion state
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // Animation values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const option1Anim = useRef(new Animated.Value(0)).current; // Camera
  const option2Anim = useRef(new Animated.Value(0)).current; // Text
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Tab order: Home, History, [FAB], Coach, Profile
  const leftTabs = ['home', 'history'];
  const rightTabs = ['coach', 'profile'];

  // Handle FAB expansion animation
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
      if (!isExpanded) {
        setShowOptions(false);
      }
    });
  }, [isExpanded]);

  const handleFABPress = () => {
    medium();
    setIsExpanded(!isExpanded);
  };

  const handleOptionPress = (option: 'camera' | 'text') => {
    medium();
    setIsExpanded(false);

    // Navigate to respective entry method
    if (option === 'camera') {
      const today = new Date().toISOString().split('T')[0];
      router.push({ pathname: '/camera' as any, params: { dateISO: today } });
    } else {
      router.push('/text-entry' as any);
    }
  };

  const handleOverlayPress = () => {
    selection();
    setIsExpanded(false);
  };

  const handleTabPress = (routeName: string, isFocused: boolean) => {
    selection();

    if (!isFocused) {
      const event = navigation.emit({
        type: 'tabPress',
        target: state.routes.find((r) => r.name === routeName)?.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.navigate(routeName);
      }
    }
  };

  const renderTab = (routeName: string) => {
    const config = TAB_CONFIG[routeName];
    if (!config) return null;

    const isFocused = state.routes[state.index]?.name === routeName;
    const icon = isFocused ? config.iconActive : config.icon;

    return (
      <Pressable
        key={routeName}
        onPress={() => handleTabPress(routeName, isFocused)}
        style={styles.tab}
      >
        <Ionicons
          name={icon}
          size={24}
          color={isFocused ? colors.primary[500] : colors.text.tertiary}
        />
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? colors.primary[500] : colors.text.tertiary,
              fontFamily: isFocused ? 'Inter_700Bold' : 'Inter_600SemiBold',
            },
          ]}
        >
          {config.label}
        </Text>
      </Pressable>
    );
  };

  const option1TranslateY = option1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  const option2TranslateY = option2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      {/* Overlay backdrop */}
      {showOptions && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleOverlayPress}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: colors.overlay,
                opacity: overlayOpacity,
              },
            ]}
          />
        </Pressable>
      )}

      {/* Expanded options menu */}
      {showOptions && (
        <View style={styles.menuContainer} pointerEvents="box-none">
          <View style={styles.menuContent}>
            {/* Option 2: Text Entry */}
            <Animated.View
              style={[
                styles.optionContainer,
                {
                  opacity: option2Anim,
                  transform: [{ translateY: option2TranslateY }],
                },
              ]}
            >
              <Pressable
                onPress={() => handleOptionPress('text')}
                style={[
                  styles.optionButton,
                  { backgroundColor: colors.background.elevated },
                ]}
              >
                <Ionicons
                  name="text-outline"
                  size={24}
                  color={colors.primary[500]}
                />
              </Pressable>
              <Text style={[styles.optionLabel, { color: colors.text.inverse }]}>
                Describe Meal
              </Text>
            </Animated.View>

            {/* Option 1: Camera */}
            <Animated.View
              style={[
                styles.optionContainer,
                {
                  opacity: option1Anim,
                  transform: [{ translateY: option1TranslateY }],
                },
              ]}
            >
              <Pressable
                onPress={() => handleOptionPress('camera')}
                style={[
                  styles.optionButton,
                  { backgroundColor: colors.background.elevated },
                ]}
              >
                <Ionicons
                  name="camera-outline"
                  size={24}
                  color={colors.primary[500]}
                />
              </Pressable>
              <Text style={[styles.optionLabel, { color: colors.text.inverse }]}>
                Take Photo
              </Text>
            </Animated.View>
          </View>
        </View>
      )}

      {/* Tab bar */}
      <View
        style={[
          styles.tabBar,
          {
            paddingBottom: insets.bottom || 20,
            backgroundColor: colors.background.base,
            borderTopColor: colors.border.subtle,
          },
        ]}
      >
        {/* Left tabs */}
        <View style={styles.tabGroup}>
          {leftTabs.map((routeName) => renderTab(routeName))}
        </View>

        {/* Center FAB */}
        <Pressable onPress={handleFABPress} style={styles.fabContainer}>
          <LinearGradient
            colors={[colors.primary[500], colors.primary[600]]}
            style={[styles.fab, shadows.lg]}
          >
            <Animated.View
              style={{
                transform: [{ rotate: rotateInterpolate }],
              }}
            >
              <Ionicons name="add" size={32} color={colors.text.inverse} />
            </Animated.View>
          </LinearGradient>
        </Pressable>

        {/* Right tabs */}
        <View style={styles.tabGroup}>
          {rightTabs.map((routeName) => renderTab(routeName))}
        </View>
      </View>
    </>
  );
}

function createStyles(
  colors: ReturnType<typeof import('@/config/theme').getColors>,
  shadows: any
) {
  return StyleSheet.create({
    tabBar: {
      flexDirection: 'row',
      height: TAB_BAR_HEIGHT,
      borderTopWidth: 1,
      paddingTop: 8,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      ...Platform.select({
        ios: shadows.md,
        android: {
          elevation: 8,
        },
      }),
    },
    tabGroup: {
      flexDirection: 'row',
      flex: 1,
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    tab: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
      paddingHorizontal: 12,
      minWidth: 60,
      minHeight: 44, // Accessibility minimum
    },
    tabLabel: {
      fontSize: 11,
      marginTop: 4,
      letterSpacing: 0.2,
    },
    fabContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 16,
      marginTop: -32, // Elevate above tab bar
    },
    fab: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary[500],
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 16,
    },
    menuContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: TAB_BAR_HEIGHT + 16,
      alignItems: 'center',
      zIndex: 1001,
    },
    menuContent: {
      alignItems: 'center',
      gap: 16,
    },
    optionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    optionButton: {
      width: OPTION_BUTTON_SIZE,
      height: OPTION_BUTTON_SIZE,
      borderRadius: OPTION_BUTTON_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: shadows.md,
        android: {
          elevation: 4,
        },
      }),
    },
    optionLabel: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
  });
}
