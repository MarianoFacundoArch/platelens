import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { theme, gradients } from '@/config/theme';

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
  // Animation value
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Size configuration
  const sizeConfig = {
    sm: { diameter: 120, strokeWidth: 8, fontSize: 32, captionSize: 12 },
    md: { diameter: 180, strokeWidth: 12, fontSize: 40, captionSize: 14 },
    lg: { diameter: 240, strokeWidth: 16, fontSize: 48, captionSize: 16 },
  };

  const config = sizeConfig[size];
  const { diameter, strokeWidth } = config;

  // Calculate dimensions
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = diameter / 2;

  // Calculate progress (capped at 100%)
  const progress = Math.min(consumed / target, 1);
  const strokeDashoffset = circumference - progress * circumference;

  // Determine color based on progress
  const getProgressColor = () => {
    if (progress >= 1) return theme.colors.warning; // Over target
    if (progress >= 0.9) return theme.colors.primary[500]; // Close to target
    return theme.colors.primary[500]; // Normal
  };

  // Animate ring on mount
  useEffect(() => {
    if (animated) {
      progressAnim.setValue(0);
      Animated.spring(progressAnim, {
        toValue: 1,
        damping: 15,
        mass: 1,
        stiffness: 150,
        useNativeDriver: false, // Can't use native driver with SVG
      }).start();
    } else {
      progressAnim.setValue(1);
    }
  }, [consumed, target, animated]);

  // Animated stroke dash offset
  const animatedStrokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, strokeDashoffset],
  });

  return (
    <View style={styles.container} accessible accessibilityLabel={`${consumed} of ${target} calories consumed`}>
      {/* SVG Ring */}
      <Svg width={diameter} height={diameter}>
        <Defs>
          {/* Gradient for progress ring */}
          <LinearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradients.calorie.colors[0]} stopOpacity="1" />
            <Stop offset="100%" stopColor={gradients.calorie.colors[1]} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background ring */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={theme.colors.ink[100]}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress ring */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#calorieGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={animatedStrokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        <Text
          style={[styles.consumedText, { fontSize: config.fontSize }]}
          className="font-bold text-ink-900"
        >
          {consumed.toFixed(1)}
        </Text>
        <Text
          style={[styles.targetText, { fontSize: config.captionSize }]}
          className="text-ink-500"
        >
          of {target.toFixed(1)} kcal
        </Text>
        {progress >= 1 && (
          <Text style={[styles.statusText, { fontSize: config.captionSize - 2 }]} className="text-warning mt-1">
            Target reached
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consumedText: {
    fontWeight: '700',
    letterSpacing: -1,
  },
  targetText: {
    marginTop: 2,
  },
  statusText: {
    fontWeight: '600',
  },
});
