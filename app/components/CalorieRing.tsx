import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, G } from 'react-native-svg';
import { gradients } from '@/config/theme';
import { useTheme } from '@/hooks/useTheme';

interface CalorieRingProps {
  /** Calories consumed */
  consumed: number;
  /** Daily calorie target */
  target: number;
  /** Size of the ring (sm: 120, md: 180, lg: 240) */
  size?: 'sm' | 'md' | 'lg';
  /** Animate on mount */
  animated?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function CalorieRing({
  consumed,
  target,
  size = 'lg',
  animated = true,
}: CalorieRingProps) {
  const { colors, shadows, animations } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Animation values
  const baseProgressAnim = useRef(new Animated.Value(0)).current;
  const overageProgressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Size configuration
  const sizeConfig = {
    sm: { diameter: 120, strokeWidth: 8, fontSize: 36, percentSize: 14, targetSize: 11 },
    md: { diameter: 180, strokeWidth: 12, fontSize: 48, percentSize: 16, targetSize: 13 },
    lg: { diameter: 240, strokeWidth: 16, fontSize: 64, percentSize: 20, targetSize: 14 },
  };

  const config = sizeConfig[size];
  const { diameter, strokeWidth } = config;

  // Calculate dimensions
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = diameter / 2;

  // Calculate progress
  const actualProgress = consumed / target;
  const percentage = Math.round(actualProgress * 100);
  const isOverage = actualProgress > 1;

  // Base ring: 0% to min(100%, actual)
  const baseProgress = Math.min(actualProgress, 1);
  const baseStrokeDashoffset = circumference - baseProgress * circumference;

  // Overage ring: 100% to actual (only if over 100%)
  const overageProgress = isOverage ? Math.min(actualProgress - 1, 1) : 0; // Cap overage display at 100% (full circle at 200%)
  const overageStrokeDashoffset = circumference - overageProgress * circumference;

  // Determine percentage text color
  const getPercentageColor = () => {
    if (isOverage) return colors.error;
    return colors.primary[600];
  };

  // Animate rings on mount
  useEffect(() => {
    if (animated) {
      // Animate base ring
      baseProgressAnim.setValue(0);
      Animated.spring(baseProgressAnim, {
        toValue: 1,
        ...animations.easing.spring,
        useNativeDriver: false,
      }).start();

      // Animate overage ring with delay
      if (isOverage) {
        overageProgressAnim.setValue(0);
        Animated.spring(overageProgressAnim, {
          toValue: 1,
          delay: 300, // Start after base ring
          ...animations.easing.spring,
          useNativeDriver: false,
        }).start();
      }
    } else {
      baseProgressAnim.setValue(1);
      overageProgressAnim.setValue(1);
    }
  }, [consumed, target, animated, isOverage]);

  // Pulse glow effect when exceeding target
  useEffect(() => {
    if (isOverage) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [isOverage]);

  // Animated stroke dash offsets
  const animatedBaseStrokeDashoffset = baseProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, baseStrokeDashoffset],
  });

  const animatedOverageStrokeDashoffset = overageProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, overageStrokeDashoffset],
  });

  // Animated glow opacity
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

  return (
    <View style={styles.container} accessible accessibilityLabel={`${consumed} of ${target} calories consumed`}>
      {/* Shadow/Glow container */}
      <Animated.View
        style={[
          styles.ringContainer,
          shadows.md,
          isOverage && {
            shadowColor: colors.error,
            shadowOpacity: glowOpacity,
            shadowRadius: 20,
          },
        ]}
      >
        {/* SVG Ring */}
        <Svg width={diameter} height={diameter}>
          <Defs>
            {/* Teal gradient for base ring */}
            <SvgLinearGradient id="baseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradients.calorie.colors[0]} stopOpacity="1" />
              <Stop offset="100%" stopColor={gradients.calorie.colors[1]} stopOpacity="1" />
            </SvgLinearGradient>
            {/* Red gradient for overage ring */}
            <SvgLinearGradient id="overageGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradients.error.colors[0]} stopOpacity="1" />
              <Stop offset="100%" stopColor={gradients.error.colors[1]} stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>

          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background ring */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={colors.border.subtle}
              strokeWidth={strokeWidth}
              fill="none"
            />

            {/* Base progress ring (teal, up to 100%) */}
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#baseGradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={animatedBaseStrokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          </G>

          {/* Overage ring in separate group - rotated to start where base ends */}
          {isOverage && (
            <G rotation="270" origin={`${center}, ${center}`}>
              <AnimatedCircle
                cx={center}
                cy={center}
                r={radius}
                stroke="url(#overageGradient)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={animatedOverageStrokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </G>
          )}
        </Svg>
      </Animated.View>

      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Calorie number */}
        <Text
          style={[
            styles.consumedText,
            {
              fontSize: config.fontSize,
              color: isOverage ? colors.error : gradients.calorie.colors[1],
            },
          ]}
        >
          {Math.round(consumed)}
        </Text>

        {/* Percentage indicator */}
        <Text
          style={[
            styles.percentageText,
            {
              fontSize: config.percentSize,
              color: getPercentageColor(),
            },
          ]}
        >
          {percentage}%
        </Text>

        {/* Target info */}
        <Text
          style={[
            styles.targetText,
            { fontSize: config.targetSize, color: colors.text.tertiary },
          ]}
        >
          Target: {Math.round(target)} kcal
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    ringContainer: {
      // Shadow will be applied dynamically
    },
    centerContent: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    consumedText: {
      fontWeight: '800',
      letterSpacing: -2,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    percentageText: {
      fontWeight: '700',
      marginTop: 4,
      letterSpacing: -0.5,
    },
    targetText: {
      marginTop: 6,
      fontWeight: '500',
      letterSpacing: 0.2,
    },
  });
}
