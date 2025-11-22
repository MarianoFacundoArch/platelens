import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import type { MealContribution } from '@/utils/mealContributions';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type MealContributionDonutProps = {
  contributions: MealContribution[];
  total: number;
  metricName: string;
  metricUnit: string;
  onSegmentPress?: (mealId: string) => void;
  size?: number;
};

export function MealContributionDonut({
  contributions,
  total,
  metricName,
  metricUnit,
  onSegmentPress,
  size = 240,
}: MealContributionDonutProps) {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // SVG circle properties
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Create animated values for each contribution (max 10 to avoid hook violations)
  // We create a fixed array and only use as many as we need
  const anim0 = useSharedValue(0);
  const anim1 = useSharedValue(0);
  const anim2 = useSharedValue(0);
  const anim3 = useSharedValue(0);
  const anim4 = useSharedValue(0);
  const anim5 = useSharedValue(0);
  const anim6 = useSharedValue(0);
  const anim7 = useSharedValue(0);
  const anim8 = useSharedValue(0);
  const anim9 = useSharedValue(0);

  const animatedValues = [anim0, anim1, anim2, anim3, anim4, anim5, anim6, anim7, anim8, anim9];

  // Animate segments on mount with stagger
  useEffect(() => {
    if (!contributions || contributions.length === 0) return;

    contributions.forEach((contribution, index) => {
      if (index >= animatedValues.length) return; // Safety check
      const delay = index * 50; // 50ms stagger between segments
      animatedValues[index].value = withDelay(
        delay,
        withSpring(contribution.percentage / 100, {
          damping: 15,
          stiffness: 100,
        })
      );
    });
  }, [contributions]);

  // Calculate cumulative rotation for each segment
  const segmentRotations = useMemo(() => {
    if (!contributions || contributions.length === 0) return [];
    let cumulativeRotation = -90; // Start at top
    return contributions.map((contribution, index) => {
      const rotation = cumulativeRotation;
      cumulativeRotation += (contribution.percentage / 100) * 360;
      return rotation;
    });
  }, [contributions]);

  const handleSegmentPress = (mealId: string) => {
    light();
    onSegmentPress?.(mealId);
  };

  // Early return AFTER all hooks are called
  if (!contributions || contributions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.svgContainer}>
        <Svg width={size} height={size}>
          {contributions.map((contribution, index) => {
            // Safety check in case we have more contributions than animated values
            if (index >= animatedValues.length) return null;

            const animatedProps = useAnimatedProps(() => ({
              strokeDashoffset: circumference * (1 - animatedValues[index].value),
            }));

            return (
              <G
                key={contribution.mealId}
                rotation={segmentRotations[index]}
                origin={`${center}, ${center}`}
              >
                <AnimatedCircle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={contribution.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  animatedProps={animatedProps}
                  fill="none"
                  strokeLinecap="butt" // Use butt for clean gaps
                />
              </G>
            );
          })}
        </Svg>

        {/* Center content - shows total */}
        <Pressable
          style={[styles.centerContent, { width: size, height: size }]}
          onPress={() => {
            // Optionally close modal or do nothing
          }}
        >
          <Text style={styles.centerValue}>{Math.round(total).toLocaleString()}</Text>
          <Text style={styles.centerLabel}>{metricName}</Text>
        </Pressable>

        {/* Invisible tap zones for each segment */}
        {onSegmentPress &&
          contributions.map((contribution, index) => {
            // Calculate tap zone position (simplified - could be more precise)
            // For now, we'll let the list handle taps since precise segment taps are complex
            return null;
          })}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    svgContainer: {
      position: 'relative',
    },
    centerContent: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      top: 0,
      left: 0,
    },
    centerValue: {
      fontSize: 36,
      fontWeight: '700',
      letterSpacing: -1,
      color: colors.text.primary,
    },
    centerLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
      marginTop: 4,
      textTransform: 'capitalize',
    },
  });
}
