import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface InputProps extends TextInputProps {
  /** Input label */
  label: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Left icon component */
  leftIcon?: React.ReactNode;
  /** Right icon component */
  rightIcon?: React.ReactNode;
  /** Custom container style */
  style?: ViewStyle;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  style,
  value,
  onFocus,
  onBlur,
  ...textInputProps
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  // Animate label on focus/blur and value change
  useEffect(() => {
    Animated.spring(labelAnim, {
      toValue: isFocused || value ? 1 : 0,
      damping: 15,
      mass: 1,
      stiffness: 150,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  // Label position and size interpolation
  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -8],
  });

  const labelFontSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

  const labelColor = error
    ? colors.error
    : isFocused
    ? colors.primary[500]
    : colors.text.secondary;

  const borderColor = error
    ? colors.error
    : isFocused
    ? colors.primary[500]
    : colors.border.medium;

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Input field */}
      <View style={[styles.inputContainer, { borderColor }]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <View style={styles.inputWrapper}>
          {/* Floating label */}
          <Animated.Text
            style={[
              styles.label,
              {
                top: labelTop,
                fontSize: labelFontSize,
                color: labelColor,
              },
            ]}
          >
            {label}
          </Animated.Text>

          {/* Text input */}
          <TextInput
            style={[styles.input, leftIcon && styles.inputWithLeftIcon]}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={colors.border.strong}
            selectionColor={colors.primary[500]}
            {...textInputProps}
          />
        </View>

        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>

      {/* Helper text or error */}
      {(error || helperText) && (
        <Text
          style={[
            styles.helperText,
            error ? styles.errorText : styles.normalHelperText,
          ]}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      width: '100%',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 56,
      borderWidth: 2,
      borderRadius: 12,
      backgroundColor: colors.background.card,
      paddingHorizontal: 16,
    },
    inputWrapper: {
      flex: 1,
      justifyContent: 'center',
      position: 'relative',
    },
    label: {
      position: 'absolute',
      left: 0,
      backgroundColor: colors.background.card,
      paddingHorizontal: 4,
      fontWeight: '500',
    },
    input: {
      fontSize: 16,
      color: colors.text.primary,
      paddingTop: 8,
      paddingBottom: 0,
      height: '100%',
    },
    inputWithLeftIcon: {
      marginLeft: 8,
    },
    leftIcon: {
      marginRight: 8,
    },
    rightIcon: {
      marginLeft: 8,
    },
    helperText: {
      fontSize: 12,
      marginTop: 6,
      marginLeft: 16,
    },
    errorText: {
      color: colors.error,
    },
    normalHelperText: {
      color: colors.text.secondary,
    },
  });
}
