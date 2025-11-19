import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/config/theme';
import { useHaptics } from '@/hooks/useHaptics';

interface ButtonProps {
  /** Button text */
  children: string;
  /** Press handler */
  onPress?: () => void;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Custom style */
  style?: ViewStyle;
  /** Enable haptic feedback */
  haptics?: boolean;
  /** Icon component to display before text */
  icon?: React.ReactNode;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  haptics: enableHaptics = true,
  icon,
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { medium } = useHaptics();

  const sizeConfig = {
    sm: { height: 36, paddingHorizontal: 16, fontSize: 14 },
    md: { height: 48, paddingHorizontal: 24, fontSize: 16 },
    lg: { height: 56, paddingHorizontal: 32, fontSize: 18 },
  };

  const config = sizeConfig[size];

  // Animation handlers
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      damping: 15,
      mass: 1,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 15,
      mass: 1,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (enableHaptics) {
      medium();
    }
    onPress?.();
  };

  // Get variant styles
  const getVariantStyles = () => {
    const isDisabled = disabled || loading;

    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: isDisabled ? theme.colors.ink[200] : theme.colors.primary[500],
          },
          text: {
            color: '#FFFFFF',
          },
          useGradient: !isDisabled,
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: isDisabled ? theme.colors.ink[100] : theme.colors.ink[50],
            borderWidth: 2,
            borderColor: isDisabled ? theme.colors.ink[200] : theme.colors.ink[300],
          },
          text: {
            color: isDisabled ? theme.colors.ink[400] : theme.colors.ink[900],
          },
          useGradient: false,
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
          },
          text: {
            color: isDisabled ? theme.colors.ink[400] : theme.colors.primary[500],
          },
          useGradient: false,
        };
      case 'danger':
        return {
          container: {
            backgroundColor: isDisabled ? theme.colors.ink[200] : theme.colors.error,
          },
          text: {
            color: '#FFFFFF',
          },
          useGradient: false,
        };
      default:
        return {
          container: {},
          text: {},
          useGradient: false,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const containerStyle: ViewStyle[] = [
    styles.container,
    {
      height: config.height,
      paddingHorizontal: config.paddingHorizontal,
    },
    fullWidth && styles.fullWidth,
    variantStyles.container,
    style,
  ];

  const textStyle: TextStyle = {
    ...styles.text,
    fontSize: config.fontSize,
    ...variantStyles.text,
  };

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color} size="small" />
      ) : (
        <>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={textStyle}>{children}</Text>
        </>
      )}
    </View>
  );

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && { width: '100%' },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        accessible
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
      >
        {variantStyles.useGradient ? (
          <LinearGradient
            colors={[theme.colors.primary[500], theme.colors.primary[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={containerStyle}
          >
            {content}
          </LinearGradient>
        ) : (
          <View style={containerStyle}>{content}</View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
