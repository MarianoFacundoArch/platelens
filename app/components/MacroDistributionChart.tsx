import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { theme } from '@/config/theme';

interface MacroDistributionChartProps {
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}

const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
};

export function MacroDistributionChart({ protein, carbs, fat }: MacroDistributionChartProps) {
  // Calculate calories from each macro
  const proteinCals = protein * CALORIES_PER_GRAM.protein;
  const carbsCals = carbs * CALORIES_PER_GRAM.carbs;
  const fatCals = fat * CALORIES_PER_GRAM.fat;
  const totalCals = proteinCals + carbsCals + fatCals;

  // Calculate percentages
  const proteinPercent = totalCals > 0 ? (proteinCals / totalCals) * 100 : 0;
  const carbsPercent = totalCals > 0 ? (carbsCals / totalCals) * 100 : 0;
  const fatPercent = totalCals > 0 ? (fatCals / totalCals) * 100 : 0;

  // Pie chart settings
  const size = 160;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke dash offsets for each segment
  const proteinDash = (proteinPercent / 100) * circumference;
  const carbsDash = (carbsPercent / 100) * circumference;
  const fatDash = (fatPercent / 100) * circumference;

  // Starting angles
  const proteinStart = 0;
  const carbsStart = proteinDash;
  const fatStart = carbsStart + carbsDash;

  return (
    <View style={styles.container}>
      {/* Pie Chart */}
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {/* Protein segment */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.colors.protein.main}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${proteinDash} ${circumference - proteinDash}`}
              strokeDashoffset={0}
              strokeLinecap="butt"
            />
            {/* Carbs segment */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.colors.carbs.main}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${carbsDash} ${circumference - carbsDash}`}
              strokeDashoffset={-carbsStart}
              strokeLinecap="butt"
            />
            {/* Fat segment */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.colors.fat.main}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${fatDash} ${circumference - fatDash}`}
              strokeDashoffset={-fatStart}
              strokeLinecap="butt"
            />
          </G>
        </Svg>

        {/* Center text */}
        <View style={styles.centerText}>
          <Text style={styles.centerLabel}>Macros</Text>
          <Text style={styles.centerSubtext}>Distribution</Text>
        </View>
      </View>

      {/* Legend with values */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.colorDot, { backgroundColor: theme.colors.protein.main }]} />
          <Text style={styles.macroLabel}>Protein</Text>
          <View style={styles.spacer} />
          <Text style={styles.macroValue}>{protein.toFixed(1)}g</Text>
          <Text style={styles.macroPercent}>({proteinPercent.toFixed(0)}%)</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.colorDot, { backgroundColor: theme.colors.carbs.main }]} />
          <Text style={styles.macroLabel}>Carbs</Text>
          <View style={styles.spacer} />
          <Text style={styles.macroValue}>{carbs.toFixed(1)}g</Text>
          <Text style={styles.macroPercent}>({carbsPercent.toFixed(0)}%)</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.colorDot, { backgroundColor: theme.colors.fat.main }]} />
          <Text style={styles.macroLabel}>Fat</Text>
          <View style={styles.spacer} />
          <Text style={styles.macroValue}>{fat.toFixed(1)}g</Text>
          <Text style={styles.macroPercent}>({fatPercent.toFixed(0)}%)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  chartContainer: {
    position: 'relative',
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink[900],
  },
  centerSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  legend: {
    width: '100%',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink[700],
    minWidth: 60,
  },
  spacer: {
    flex: 1,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink[900],
  },
  macroPercent: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.ink[500],
    marginLeft: 4,
  },
});
