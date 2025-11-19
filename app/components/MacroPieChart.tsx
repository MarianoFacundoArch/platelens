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
  const progressAnim = useRef(new Animated.Value(0)).current;
  const config = macroConfig[type];

  // Calculate progress percentage (capped at 100%)
  const progress = Math.min((current / target) * 100, 100);

  // Animate progress
  useEffect(() => {
    progressAnim.setValue(0);
    Animated.spring(progressAnim, {
      toValue: progress,
      delay,
      damping: 15,
      mass: 1,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);

  // Calculate stroke dash offset for animated circle
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.pieContainer}>
      {/* Pie Chart */}
      <View style={styles.pieWrapper}>
        <Svg width={PIE_SIZE} height={PIE_SIZE}>
          <Defs>
            <SvgLinearGradient id={`gradient-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={config.colors[0]} />
              <Stop offset="100%" stopColor={config.colors[1]} />
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

          {/* Progress circle */}
          <AnimatedCircle
            cx={PIE_SIZE / 2}
            cy={PIE_SIZE / 2}
            r={RADIUS}
            stroke={`url(#gradient-${type})`}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${PIE_SIZE / 2}, ${PIE_SIZE / 2}`}
          />
        </Svg>

        {/* Center value */}
        <View style={styles.centerValue}>
          <Text style={[styles.currentValue, { color: config.colors[1] }]}>
            {current.toFixed(1)}
          </Text>
          <Text style={styles.unit}>{config.unit}</Text>
        </View>
      </View>

      {/* Label and target */}
      <View style={styles.labelContainer}>
        <View style={[styles.iconBadge, { backgroundColor: config.colors[0] }]}>
          <Text style={styles.iconText}>{config.icon}</Text>
        </View>
        <Text style={styles.label}>{config.label}</Text>
        <Text style={styles.target}>/ {target.toFixed(1)}{config.unit}</Text>
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
  target: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.ink[400],
  },
});
