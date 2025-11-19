import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { theme } from '@/config/theme';

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
    ? theme.colors.error
    : isFocused
    ? theme.colors.primary[500]
    : theme.colors.ink[500];

  const borderColor = error
    ? theme.colors.error
    : isFocused
    ? theme.colors.primary[500]
    : theme.colors.ink[200];

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
            placeholderTextColor={theme.colors.ink[300]}
            selectionColor={theme.colors.primary[500]}
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

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: theme.colors.background.card,
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
    backgroundColor: theme.colors.background.card,
    paddingHorizontal: 4,
    fontWeight: '500',
  },
  input: {
    fontSize: 16,
    color: theme.colors.ink[900],
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
    color: theme.colors.error,
  },
  normalHelperText: {
    color: theme.colors.ink[500],
  },
});
