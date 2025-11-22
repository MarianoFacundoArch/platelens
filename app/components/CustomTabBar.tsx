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
  const currentAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Animation values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Tab order: Home, History, [FAB], Coach, Profile
  const leftTabs = ['home', 'history'];
  const rightTabs = ['coach', 'profile'];

  // Handle FAB expansion animation
  useEffect(() => {
    // Cancel any ongoing animation
    if (currentAnimation.current) {
      currentAnimation.current.stop();
    }

    if (isExpanded) {
      setShowOptions(true);
    }

    const toValue = isExpanded ? 1 : 0;

    currentAnimation.current = Animated.parallel([
      Animated.spring(rotateAnim, {
        toValue,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.spring(overlayOpacity, {
        toValue,
        useNativeDriver: true,
        friction: 10,
        tension: 100,
      }),
    ]);

    currentAnimation.current.start(({ finished }) => {
      if (finished) {
        currentAnimation.current = null;
        if (!isExpanded) {
          setShowOptions(false);
        }
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

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  // Color interpolation from teal to red (iOS-style close button)
  const fabColor = overlayOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary[500], '#EF4444'], // Teal → Red
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
        <Animated.View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: TAB_BAR_HEIGHT + 24,
            zIndex: 1001,
            opacity: overlayOpacity,
            transform: [
              {
                translateY: overlayOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          }}
        >
          <View style={{
            backgroundColor: colors.background.card,
            borderRadius: 16,
            overflow: 'hidden',
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}>
            {/* COLUMN LAYOUT */}
            <View style={{
              flexDirection: 'row',
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}>
              {/* LEFT COLUMN - Icons */}
              <View style={{
                width: 56,
                alignItems: 'center',
              }}>
                {/* Camera Icon */}
                <Pressable
                  onPress={() => handleOptionPress('camera')}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: colors.primary[500],
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Ionicons name="camera" size={24} color="#FFFFFF" />
                </Pressable>

                {/* Text Entry Icon */}
                <Pressable
                  onPress={() => handleOptionPress('text')}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: colors.primary[500],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* RIGHT COLUMN - Text Content */}
              <View style={{
                flex: 1,
                paddingLeft: 12,
                justifyContent: 'space-around',
              }}>
                {/* Camera Text */}
                <Pressable
                  onPress={() => handleOptionPress('camera')}
                  style={{
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{
                    fontSize: 17,
                    fontWeight: '600',
                    color: colors.text.primary,
                    marginBottom: 3,
                    letterSpacing: -0.4,
                  }}>
                    Take Photo
                  </Text>
                  <Text style={{
                    fontSize: 13,
                    color: colors.text.secondary,
                    letterSpacing: -0.08,
                  }}>
                    Scan your meal with camera
                  </Text>
                </Pressable>

                {/* Text Entry Text */}
                <Pressable
                  onPress={() => handleOptionPress('text')}
                  style={{
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{
                    fontSize: 17,
                    fontWeight: '600',
                    color: colors.text.primary,
                    marginBottom: 3,
                    letterSpacing: -0.4,
                  }}>
                    Describe Meal
                  </Text>
                  <Text style={{
                    fontSize: 13,
                    color: colors.text.secondary,
                    letterSpacing: -0.08,
                  }}>
                    Type what you ate
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
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
          <Animated.View
            style={[
              styles.fab,
              shadows.lg,
              {
                backgroundColor: fabColor,
              },
            ]}
          >
            <Animated.View
              style={{
                transform: [{ rotate: rotateInterpolate }],
              }}
            >
              <Ionicons name="add" size={32} color={colors.text.inverse} />
            </Animated.View>
          </Animated.View>
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
      left: 16,
      right: 16,
      bottom: TAB_BAR_HEIGHT + 24,
      zIndex: 1001,
    },
    menuCard: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 0.5,
      minHeight: 70,
    },
    menuItemPressed: {
      opacity: 0.6,
    },
    menuIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    menuContent: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
    },
    menuTitle: {
      fontSize: 17,
      fontFamily: 'Inter_600SemiBold',
      letterSpacing: -0.4,
      marginBottom: 2,
    },
    menuSubtitle: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      letterSpacing: -0.08,
      lineHeight: 16,
    },
  });
}
