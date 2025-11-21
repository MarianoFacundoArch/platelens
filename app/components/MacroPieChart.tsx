import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { theme, gradients } from '@/config/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface MacroPieChartProps {
  /** Current macro values */
  current: {
    protein: number;
    carbs: number;
    fat: number;
  };
  /** Target macro values */
  target: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

const macroConfig = {
  protein: {
    label: 'Protein',
    unit: 'g',
    colors: [gradients.protein.colors[0], gradients.protein.colors[1]],
    icon: 'P',
  },
  carbs: {
    label: 'Carbs',
    unit: 'g',
    colors: [gradients.carbs.colors[0], gradients.carbs.colors[1]],
    icon: 'C',
  },
  fat: {
    label: 'Fat',
    unit: 'g',
    colors: [gradients.fat.colors[0], gradients.fat.colors[1]],
    icon: 'F',
  },
};

const PIE_SIZE = 100;
const STROKE_WIDTH = 10;
const RADIUS = (PIE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface PieProps {
  type: 'protein' | 'carbs' | 'fat';
  current: number;
  target: number;
  delay?: number;
}

function MiniPie({ type, current, target, delay = 0 }: PieProps) {
  const baseProgressAnim = useRef(new Animated.Value(0)).current;
  const overageProgressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const config = macroConfig[type];

  // Calculate progress
  const actualProgress = current / target;
  const percentage = Math.round(actualProgress * 100);
  const isOverage = actualProgress > 1;

  // Base progress: 0% to min(100%, actual)
  const baseProgress = Math.min(actualProgress, 1);

  // Overage progress: 100% to actual (only if over 100%)
  const overageProgress = isOverage ? Math.min(actualProgress - 1, 1) : 0; // Cap at 100% (full circle at 200%)

  // Determine percentage text color
  const percentageColor = isOverage ? theme.colors.error : config.colors[1];

  // Animate base progress
  useEffect(() => {
    baseProgressAnim.setValue(0);
    Animated.spring(baseProgressAnim, {
      toValue: baseProgress * 100,
      delay,
      ...theme.animations.easing.spring,
      useNativeDriver: true,
    }).start();

    // Animate overage with delay if over target
    if (isOverage) {
      overageProgressAnim.setValue(0);
      Animated.spring(overageProgressAnim, {
        toValue: overageProgress * 100,
        delay: delay + 200,
        ...theme.animations.easing.spring,
        useNativeDriver: true,
      }).start();
    }
  }, [baseProgress, overageProgress, delay, isOverage]);

  // Pulse effect when over target
  useEffect(() => {
    if (isOverage) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [isOverage]);

  // Calculate stroke dash offsets
  const baseStrokeDashoffset = baseProgressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const overageStrokeDashoffset = overageProgressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
  });

  // Animated shadow opacity for glow
  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.4],
  });

  return (
    <View style={styles.pieContainer}>
      {/* Pie Chart */}
      <Animated.View
        style={[
          styles.pieWrapper,
          theme.shadows.sm,
          isOverage && {
            shadowColor: theme.colors.error,
            shadowOpacity: shadowOpacity,
            shadowRadius: 12,
          },
        ]}
      >
        <Svg width={PIE_SIZE} height={PIE_SIZE}>
          <Defs>
            {/* Base gradient (macro color) */}
            <SvgLinearGradient id={`base-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={config.colors[0]} />
              <Stop offset="100%" stopColor={config.colors[1]} />
            </SvgLinearGradient>
            {/* Overage gradient (red) */}
            <SvgLinearGradient id={`overage-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradients.error.colors[0]} />
              <Stop offset="100%" stopColor={gradients.error.colors[1]} />
            </SvgLinearGradient>
          </Defs>

          {/* Background circle */}
          <Circle
            cx={PIE_SIZE / 2}
            cy={PIE_SIZE / 2}
            r={RADIUS}
            stroke={theme.colors.ink[100]}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
          />

          {/* Base progress circle (macro color, up to 100%) */}
          <AnimatedCircle
            cx={PIE_SIZE / 2}
            cy={PIE_SIZE / 2}
            r={RADIUS}
            stroke={`url(#base-${type})`}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={baseStrokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${PIE_SIZE / 2}, ${PIE_SIZE / 2}`}
          />

          {/* Overage circle (red, from 100% to actual) - only if over target */}
          {isOverage && (
            <AnimatedCircle
              cx={PIE_SIZE / 2}
              cy={PIE_SIZE / 2}
              r={RADIUS}
              stroke={`url(#overage-${type})`}
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={overageStrokeDashoffset}
              strokeLinecap="round"
              rotation="270"
              origin={`${PIE_SIZE / 2}, ${PIE_SIZE / 2}`}
            />
          )}
        </Svg>

        {/* Center value */}
        <View style={styles.centerValue}>
          <Text style={[styles.currentValue, { color: isOverage ? theme.colors.error : config.colors[1] }]}>
            {Math.round(current)}
          </Text>
          <Text style={styles.unit}>{config.unit}</Text>
        </View>
      </Animated.View>

      {/* Label and target */}
      <View style={styles.labelContainer}>
        <View style={[styles.iconBadge, { backgroundColor: isOverage ? theme.colors.error : config.colors[0] }]}>
          <Text style={styles.iconText}>{config.icon}</Text>
        </View>
        <Text style={styles.label}>{config.label}</Text>
        <Text style={[styles.percentage, { color: percentageColor }]}>
          {percentage}%
        </Text>
        <Text style={styles.target}>of {Math.round(target)}{config.unit}</Text>
      </View>
    </View>
  );
}

export function MacroPieChart({ current, target }: MacroPieChartProps) {
  return (
    <View style={styles.container}>
      <MiniPie type="protein" current={current.protein} target={target.protein} delay={0} />
      <MiniPie type="carbs" current={current.carbs} target={target.carbs} delay={100} />
      <MiniPie type="fat" current={current.fat} target={target.fat} delay={200} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pieContainer: {
    alignItems: 'center',
    gap: 12,
  },
  pieWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentValue: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  unit: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.ink[400],
    marginTop: -2,
  },
  labelContainer: {
    alignItems: 'center',
    gap: 4,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.ink[700],
  },
  percentage: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  target: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.ink[400],
  },
});
