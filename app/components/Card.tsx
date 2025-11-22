import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
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
  const { colors, shadows } = useTheme();

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
          backgroundColor: colors.background.subtle,
        };
      case 'elevated':
        return {
          backgroundColor: colors.background.card,
          ...shadows.md,
        };
      case 'outlined':
        return {
          backgroundColor: colors.background.card,
          borderWidth: 1,
          borderColor: colors.border.medium,
        };
      default:
        return {};
    }
  };

  const containerStyle: ViewStyle = useMemo(() => ({
    ...styles.container,
    padding: paddingConfig[padding],
    ...getVariantStyles(),
    ...style,
  }), [variant, padding, style, colors]);

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
