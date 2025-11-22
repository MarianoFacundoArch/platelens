import React, { useRef, useMemo } from 'react';
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
import { useTheme } from '@/hooks/useTheme';
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
  const { colors } = useTheme();
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
            backgroundColor: isDisabled ? colors.border.medium : colors.primary[500],
          },
          text: {
            color: '#FFFFFF',
          },
          useGradient: !isDisabled,
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: isDisabled ? colors.border.subtle : colors.background.subtle,
            borderWidth: 2,
            borderColor: isDisabled ? colors.border.medium : colors.border.strong,
          },
          text: {
            color: isDisabled ? colors.text.tertiary : colors.text.primary,
          },
          useGradient: false,
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
          },
          text: {
            color: isDisabled ? colors.text.tertiary : colors.primary[500],
          },
          useGradient: false,
        };
      case 'danger':
        return {
          container: {
            backgroundColor: isDisabled ? colors.border.medium : colors.error,
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
  const styles = useMemo(() => createStyles(colors), [colors]);

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
            colors={[colors.primary[500], colors.primary[600]]}
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

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
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
}
