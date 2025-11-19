import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { theme } from '@/config/theme';
import { useHaptics } from '@/hooks/useHaptics';

interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Card variant for elevation */
  variant?: 'flat' | 'elevated' | 'outlined';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Make card pressable */
  onPress?: () => void;
  /** Custom style */
  style?: ViewStyle;
  /** Enable haptic feedback on press */
  haptics?: boolean;
}

export function Card({
  children,
  variant = 'elevated',
  padding = 'md',
  onPress,
  style,
  haptics: enableHaptics = true,
}: CardProps) {
  const { light } = useHaptics();

  const paddingConfig = {
    none: 0,
    sm: 12,
    md: 16,
    lg: 20,
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'flat':
        return {
          backgroundColor: theme.colors.background.subtle,
        };
      case 'elevated':
        return {
          backgroundColor: theme.colors.background.card,
          ...theme.shadows.md,
        };
      case 'outlined':
        return {
          backgroundColor: theme.colors.background.card,
          borderWidth: 1,
          borderColor: theme.colors.ink[200],
        };
      default:
        return {};
    }
  };

  const containerStyle: ViewStyle = {
    ...styles.container,
    padding: paddingConfig[padding],
    ...getVariantStyles(),
    ...style,
  };

  const handlePress = () => {
    if (enableHaptics) {
      light();
    }
    onPress?.();
  };

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          containerStyle,
          pressed && styles.pressed,
        ]}
        accessible
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
