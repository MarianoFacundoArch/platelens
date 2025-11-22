import { useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Card } from '@/components/Card';
import { useTheme } from '@/hooks/useTheme';
import { UserTargets } from '@/hooks/useUserTargets';

type HistoryDay = {
  dateISO: string;
  totals: { calories: number; p: number; c: number; f: number };
  logCount: number;
};

type WeekDay = HistoryDay & { dayLabel: string; dateNumber: number; isToday: boolean };

type AnalyticsViewProps = {
  currentDate: string;
  weekDays: WeekDay[];
  targets: UserTargets;
};

const screenWidth = Dimensions.get('window').width;

function calculateTrends(weekDays: WeekDay[]) {
  if (weekDays.length < 2) {
    return {
      caloriesTrend: 0,
      proteinTrend: 0,
      avgCalories: 0,
      avgProtein: 0,
    };
  }

  const midpoint = Math.floor(weekDays.length / 2);
  const firstHalf = weekDays.slice(0, midpoint);
  const secondHalf = weekDays.slice(midpoint);

  const avgCaloriesFirst = firstHalf.reduce((acc, d) => acc + d.totals.calories, 0) / firstHalf.length;
  const avgCaloriesSecond = secondHalf.reduce((acc, d) => acc + d.totals.calories, 0) / secondHalf.length;

  const avgProteinFirst = firstHalf.reduce((acc, d) => acc + d.totals.p, 0) / firstHalf.length;
  const avgProteinSecond = secondHalf.reduce((acc, d) => acc + d.totals.p, 0) / secondHalf.length;

  const caloriesTrend = avgCaloriesFirst !== 0 ? ((avgCaloriesSecond - avgCaloriesFirst) / avgCaloriesFirst) * 100 : 0;
  const proteinTrend = avgProteinFirst !== 0 ? ((avgProteinSecond - avgProteinFirst) / avgProteinFirst) * 100 : 0;

  const avgCalories = weekDays.reduce((acc, d) => acc + d.totals.calories, 0) / weekDays.length;
  const avgProtein = weekDays.reduce((acc, d) => acc + d.totals.p, 0) / weekDays.length;

  return {
    caloriesTrend: Math.round(caloriesTrend),
    proteinTrend: Math.round(proteinTrend),
    avgCalories: Math.round(avgCalories),
    avgProtein: Math.round(avgProtein),
  };
}

export function AnalyticsView({
  weekDays,
  targets,
}: AnalyticsViewProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');

  const trends = useMemo(() => calculateTrends(weekDays), [weekDays]);

  const chartConfig = useMemo(() => ({
    backgroundColor: colors.background.subtle,
    backgroundGradientFrom: colors.background.card,
    backgroundGradientTo: colors.background.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(6, 182, 212, ${opacity})`,
    labelColor: (opacity = 1) =>
      isDark
        ? `rgba(176, 176, 176, ${opacity})`
        : `rgba(64, 80, 96, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: colors.primary[300],
    },
    propsForBackgroundLines: {
      strokeWidth: 1,
      stroke: colors.border.subtle,
      strokeDasharray: '0',
    },
  }), [colors, isDark]);

  // Prepare line chart data
  const calorieChartData = useMemo(() => {
    const daysWithData = weekDays.filter((d) => d.logCount > 0);

    if (daysWithData.length === 0) {
      return null;
    }

    return {
      labels: daysWithData.map((d) => d.dayLabel[0]), // First letter of day
      datasets: [
        {
          data: daysWithData.map((d) => d.totals.calories),
          color: (opacity = 1) => `rgba(6, 182, 212, ${opacity})`,
          strokeWidth: 3,
        },
        {
          data: [targets.calories], // Target line
          color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
          strokeWidth: 2,
          withDots: false,
        },
      ],
      legend: ['Actual', 'Target'],
    };
  }, [weekDays, targets.calories]);

  // Prepare macro pie chart data
  const macroPieData = useMemo(() => {
    const totalProtein = weekDays.reduce((acc, d) => acc + d.totals.p, 0);
    const totalCarbs = weekDays.reduce((acc, d) => acc + d.totals.c, 0);
    const totalFat = weekDays.reduce((acc, d) => acc + d.totals.f, 0);

    const proteinCals = totalProtein * 4;
    const carbsCals = totalCarbs * 4;
    const fatCals = totalFat * 9;

    const total = proteinCals + carbsCals + fatCals;

    if (total === 0) {
      return null;
    }

    return [
      {
        name: `Protein ${Math.round((proteinCals / total) * 100)}%`,
        population: proteinCals,
        color: colors.primary[500],
        legendFontColor: colors.text.secondary,
        legendFontSize: 12,
      },
      {
        name: `Carbs ${Math.round((carbsCals / total) * 100)}%`,
        population: carbsCals,
        color: colors.text.tertiary,
        legendFontColor: colors.text.secondary,
        legendFontSize: 12,
      },
      {
        name: `Fat ${Math.round((fatCals / total) * 100)}%`,
        population: fatCals,
        color: colors.ink[200],
        legendFontColor: colors.text.secondary,
        legendFontSize: 12,
      },
    ];
  }, [weekDays, colors]);

  // Calculate insights
  const insights = useMemo(() => {
    const results: string[] = [];

    // Calorie trend insight
    if (trends.caloriesTrend > 5) {
      results.push(`📈 Calories increased by ${trends.caloriesTrend}% this week`);
    } else if (trends.caloriesTrend < -5) {
      results.push(`📉 Calories decreased by ${Math.abs(trends.caloriesTrend)}% this week`);
    } else {
      results.push(`✅ Calories remained steady this week`);
    }

    // Target comparison
    const avgDiff = trends.avgCalories - targets.calories;
    if (avgDiff > 100) {
      results.push(`⚠️ Averaging ${Math.round(avgDiff)} cal/day over target`);
    } else if (avgDiff < -100) {
      results.push(`⚠️ Averaging ${Math.round(Math.abs(avgDiff))} cal/day under target`);
    } else {
      results.push(`🎯 Right on track with your calorie target!`);
    }

    // Protein insight
    const proteinDiff = trends.avgProtein - targets.protein;
    if (proteinDiff > 10) {
      results.push(`💪 Exceeding protein target by ${Math.round(proteinDiff)}g/day`);
    } else if (proteinDiff < -10) {
      results.push(`📊 ${Math.round(Math.abs(proteinDiff))}g/day below protein target`);
    } else {
      results.push(`💪 Meeting protein goals consistently`);
    }

    // Consistency insight
    const daysLogged = weekDays.filter((d) => d.logCount > 0).length;
    if (daysLogged === weekDays.length) {
      results.push(`🔥 Perfect logging streak: ${daysLogged} days!`);
    } else if (daysLogged >= weekDays.length * 0.8) {
      results.push(`📝 Strong logging: ${daysLogged}/${weekDays.length} days`);
    }

    return results;
  }, [trends, targets, weekDays]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Insights Cards */}
      <Card variant="elevated" padding="lg" style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Insights</Text>
        <View style={styles.insightsList}>
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Calorie Trend Chart */}
      {calorieChartData && (
        <Card variant="elevated" padding="lg" style={styles.card}>
          <Text style={styles.cardTitle}>Calorie Trend</Text>
          <Text style={styles.cardSubtitle}>Daily calories vs target</Text>
          <LineChart
            data={calorieChartData}
            width={screenWidth - 80}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines
            withOuterLines
            withVerticalLines={false}
            withHorizontalLines
            withVerticalLabels
            withHorizontalLabels
            fromZero
          />
        </Card>
      )}

      {/* Macro Distribution */}
      {macroPieData && (
        <Card variant="elevated" padding="lg" style={styles.card}>
          <Text style={styles.cardTitle}>Macro Distribution</Text>
          <Text style={styles.cardSubtitle}>Weekly calorie breakdown</Text>
          <PieChart
            data={macroPieData}
            width={screenWidth - 80}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute={false}
            style={styles.chart}
          />
        </Card>
      )}

      {/* Trend Summary */}
      <Card variant="elevated" padding="lg" style={styles.card}>
        <Text style={styles.cardTitle}>Week-over-Week Changes</Text>

        <View style={styles.trendRow}>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Calories</Text>
            <Text
              style={[
                styles.trendValue,
                trends.caloriesTrend > 0 && styles.trendUp,
                trends.caloriesTrend < 0 && styles.trendDown,
              ]}
            >
              {trends.caloriesTrend > 0 ? '+' : ''}
              {trends.caloriesTrend}%
            </Text>
          </View>

          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Protein</Text>
            <Text
              style={[
                styles.trendValue,
                trends.proteinTrend > 0 && styles.trendUp,
                trends.proteinTrend < 0 && styles.trendDown,
              ]}
            >
              {trends.proteinTrend > 0 ? '+' : ''}
              {trends.proteinTrend}%
            </Text>
          </View>

          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Avg/Day</Text>
            <Text style={styles.trendValue}>{trends.avgCalories}</Text>
            <Text style={styles.trendSubtext}>kcal</Text>
          </View>
        </View>
      </Card>

      {/* Detailed Stats */}
      <Card variant="elevated" padding="lg" style={styles.card}>
        <Text style={styles.cardTitle}>Detailed Statistics</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Average Calories</Text>
          <Text style={styles.statValue}>{trends.avgCalories} kcal</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Target</Text>
          <Text style={styles.statValue}>{targets.calories} kcal</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Difference</Text>
          <Text
            style={[
              styles.statValue,
              trends.avgCalories > targets.calories && styles.textOver,
              trends.avgCalories < targets.calories && styles.textUnder,
            ]}
          >
            {trends.avgCalories > targets.calories ? '+' : ''}
            {Math.round(trends.avgCalories - targets.calories)} kcal
          </Text>
        </View>

        <View style={[styles.statRow, styles.separator]}>
          <Text style={styles.statLabel}>Average Protein</Text>
          <Text style={styles.statValue}>{trends.avgProtein}g</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Target</Text>
          <Text style={styles.statValue}>{targets.protein}g</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Difference</Text>
          <Text
            style={[
              styles.statValue,
              trends.avgProtein > targets.protein && styles.textOver,
              trends.avgProtein < targets.protein && styles.textUnder,
            ]}
          >
            {trends.avgProtein > targets.protein ? '+' : ''}
            {Math.round(trends.avgProtein - targets.protein)}g
          </Text>
        </View>
      </Card>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    card: {
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: 16,
    },
    chart: {
      marginVertical: 8,
      borderRadius: 16,
    },
    insightsList: {
      gap: 12,
    },
    insightItem: {
      padding: 12,
      backgroundColor: colors.background.subtle,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary[500],
    },
    insightText: {
      fontSize: 14,
      color: colors.text.primary,
      lineHeight: 20,
    },
    trendRow: {
      flexDirection: 'row',
      gap: 12,
    },
    trendItem: {
      flex: 1,
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.background.subtle,
      borderRadius: 12,
    },
    trendLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      marginBottom: 8,
    },
    trendValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text.primary,
    },
    trendSubtext: {
      fontSize: 11,
      color: colors.text.secondary,
      marginTop: 2,
    },
    trendUp: {
      color: '#ef4444',
    },
    trendDown: {
      color: colors.primary[600],
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },
    separator: {
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
      marginTop: 12,
      paddingTop: 20,
    },
    statLabel: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    statValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
    textOver: {
      color: '#ef4444',
    },
    textUnder: {
      color: colors.primary[600],
    },
  });
}
