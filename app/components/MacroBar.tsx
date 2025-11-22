import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/config/theme';
import { useTheme } from '@/hooks/useTheme';

interface MacroBarProps {
  /** Macro type */
  type: 'protein' | 'carbs' | 'fat';
  /** Current value in grams */
  current: number;
  /** Target value in grams */
  target: number;
  /** Show label */
  showLabel?: boolean;
  /** Animate on mount */
  animated?: boolean;
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

export function MacroBar({
  type,
  current,
  target,
  showLabel = true,
  animated = true,
}: MacroBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const config = macroConfig[type];

  // Calculate progress percentage (capped at 100%)
  const progress = Math.min((current / target) * 100, 100);

  // Animate progress bar
  useEffect(() => {
    if (animated) {
      progressAnim.setValue(0);
      Animated.spring(progressAnim, {
        toValue: progress,
        damping: 15,
        mass: 1,
        stiffness: 150,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(progress);
    }
  }, [progress, animated]);

  // Interpolate width
  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container} accessible accessibilityLabel={`${config.label}: ${current} of ${target} grams`}>
      {/* Header with label and values */}
      {showLabel && (
        <View style={styles.header}>
          <View style={styles.labelContainer}>
            <View style={[styles.icon, { backgroundColor: config.colors[0] }]}>
              <Text style={styles.iconText}>{config.icon}</Text>
            </View>
            <Text style={styles.label} className="text-ink-700">
              {config.label}
            </Text>
          </View>
          <Text style={styles.values} className="text-ink-500">
            <Text className="text-ink-900 font-semibold">{current.toFixed(1)}</Text> / {target.toFixed(1)}{config.unit}
          </Text>
        </View>
      )}

      {/* Progress bar */}
      <View style={styles.barContainer}>
        <View style={styles.barBackground} className="bg-ink-100">
          <Animated.View style={[styles.barFill, { width: animatedWidth }]}>
            <LinearGradient
              colors={config.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      width: '100%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    icon: {
      width: 24,
      height: 24,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconText: {
      color: colors.text.inverse,
      fontSize: 12,
      fontWeight: '700',
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
    },
    values: {
      fontSize: 14,
    },
    barContainer: {
      width: '100%',
    },
    barBackground: {
      height: 8,
      borderRadius: 8,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 8,
    },
    gradient: {
      flex: 1,
      borderRadius: 8,
    },
  });
}
