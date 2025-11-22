import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type IngredientMacroPieProps = {
  macros: {
    p: number; // protein grams
    c: number; // carbs grams
    f: number; // fat grams
  };
  size?: number;
};

export function IngredientMacroPie({ macros, size = 140 }: IngredientMacroPieProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Calculate calorie breakdown
  const proteinCals = macros.p * 4;
  const carbsCals = macros.c * 4;
  const fatCals = macros.f * 9;
  const totalCals = proteinCals + carbsCals + fatCals;

  // Calculate percentages
  const proteinPercent = totalCals > 0 ? (proteinCals / totalCals) * 100 : 0;
  const carbsPercent = totalCals > 0 ? (carbsCals / totalCals) * 100 : 0;
  const fatPercent = totalCals > 0 ? (fatCals / totalCals) * 100 : 0;

  // Determine dominant macro
  const dominantMacro = useMemo(() => {
    if (proteinCals >= carbsCals && proteinCals >= fatCals) return 'protein';
    if (carbsCals >= fatCals) return 'carbs';
    return 'fat';
  }, [proteinCals, carbsCals, fatCals]);

  const dominantPercent = useMemo(() => {
    if (dominantMacro === 'protein') return proteinPercent;
    if (dominantMacro === 'carbs') return carbsPercent;
    return fatPercent;
  }, [dominantMacro, proteinPercent, carbsPercent, fatPercent]);

  const dominantColor = useMemo(() => {
    if (dominantMacro === 'protein') return colors.macro.protein;
    if (dominantMacro === 'carbs') return colors.macro.carbs;
    return colors.macro.fat;
  }, [dominantMacro, colors.macro]);

  // SVG circle properties
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animated values for each segment
  const proteinProgress = useSharedValue(0);
  const carbsProgress = useSharedValue(0);
  const fatProgress = useSharedValue(0);

  // Animate on mount
  useEffect(() => {
    proteinProgress.value = withDelay(0, withSpring(proteinPercent / 100));
    carbsProgress.value = withDelay(100, withSpring(carbsPercent / 100));
    fatProgress.value = withDelay(200, withSpring(fatPercent / 100));
  }, [proteinPercent, carbsPercent, fatPercent]);

  // Animated props for each segment
  const proteinProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - proteinProgress.value),
  }));

  const carbsProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - carbsProgress.value),
  }));

  const fatProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fatProgress.value),
  }));

  // Calculate rotation angles for each segment
  const proteinRotation = -90;
  const carbsRotation = proteinRotation + (proteinPercent / 100) * 360;
  const fatRotation = carbsRotation + (carbsPercent / 100) * 360;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G rotation={proteinRotation} origin={`${center}, ${center}`}>
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.macro.protein}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            animatedProps={proteinProps}
            fill="none"
            strokeLinecap="round"
          />
        </G>
        <G rotation={carbsRotation} origin={`${center}, ${center}`}>
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.macro.carbs}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            animatedProps={carbsProps}
            fill="none"
            strokeLinecap="round"
          />
        </G>
        <G rotation={fatRotation} origin={`${center}, ${center}`}>
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.macro.fat}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            animatedProps={fatProps}
            fill="none"
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Center content */}
      <View style={[styles.centerContent, { width: size, height: size }]}>
        <Text style={[styles.centerPercent, { color: dominantColor }]}>
          {Math.round(dominantPercent)}%
        </Text>
        <Text style={styles.centerLabel}>
          {dominantMacro === 'protein' ? 'Protein' : dominantMacro === 'carbs' ? 'Carbs' : 'Fat'}
        </Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.macro.protein }]} />
          <Text style={styles.legendText}>P: {Math.round(proteinPercent)}%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.macro.carbs }]} />
          <Text style={styles.legendText}>C: {Math.round(carbsPercent)}%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.macro.fat }]} />
          <Text style={styles.legendText}>F: {Math.round(fatPercent)}%</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    centerContent: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
    },
    centerPercent: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    centerLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.secondary,
      marginTop: 2,
    },
    legend: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 16,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.secondary,
    },
  });
}
