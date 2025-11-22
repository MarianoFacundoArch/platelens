import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { MealContributionDonut } from './MealContributionDonut';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { hexToRgba } from '@/config/theme';
import type { MealLog } from '@/hooks/useDailyMeals';
import {
  calculateMealContributions,
  generateInsight,
  getMetricDisplayInfo,
  type MetricType,
} from '@/utils/mealContributions';

type MetricBreakdownSheetProps = {
  visible: boolean;
  onClose: () => void;
  metricType: MetricType;
  meals: MealLog[];
  total: number;
  target?: number;
  onMealPress: (mealId: string) => void;
  selectedDate?: string;
  today?: string;
};

export function MetricBreakdownSheet({
  visible,
  onClose,
  metricType,
  meals,
  total,
  target,
  onMealPress,
  selectedDate,
  today,
}: MetricBreakdownSheetProps) {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Calculate contributions
  const contributions = useMemo(
    () => calculateMealContributions(meals, metricType, colors),
    [meals, metricType, colors]
  );

  // Get display info for the metric
  const metricInfo = getMetricDisplayInfo(metricType);

  // Generate smart insight
  const insight = useMemo(
    () => generateInsight(metricType, contributions, total, target),
    [metricType, contributions, total, target]
  );

  // Build subtitle
  const subtitle = useMemo(() => {
    if (target) {
      const percentage = total > 0 ? Math.round((total / target) * 100) : 0;
      return `${Math.round(total).toLocaleString()} ${metricInfo.unit} of ${target.toLocaleString()} ${
        metricInfo.unit
      } target (${percentage}%)`;
    }
    return `${Math.round(total).toLocaleString()} ${metricInfo.unit}`;
  }, [total, target, metricInfo]);

  // Format date label
  const dateLabel = useMemo(() => {
    if (!selectedDate || !today) return null;
    if (selectedDate === today) return 'Today';
    const date = new Date(`${selectedDate}T00:00:00`);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, [selectedDate, today]);

  const handleMealPress = (mealId: string) => {
    light();
    onMealPress(mealId);
  };

  const handleClose = () => {
    light();
    onClose();
  };

  if (contributions.length === 0) {
    return null;
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose} height={600}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{metricInfo.pluralName} Breakdown</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {dateLabel && <Text style={styles.dateText}>{dateLabel}</Text>}
          </View>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </Pressable>
        </View>

        {/* ScrollView Content */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Optional Insight Card */}
          {insight && (
            <View style={styles.insightCard}>
              <View style={styles.insightIcon}>
                <Ionicons name="bulb" size={16} color={colors.primary[500]} />
              </View>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          )}

          {/* Donut Chart */}
          <View style={styles.chartContainer}>
            <MealContributionDonut
              contributions={contributions}
              total={total}
              metricName={metricInfo.pluralName}
              metricUnit={metricInfo.unit}
              onSegmentPress={handleMealPress}
              size={240}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Meal List */}
          <View style={styles.listContainer}>
            {contributions.map((contribution) => (
              <Pressable
                key={contribution.mealId}
                onPress={() => handleMealPress(contribution.mealId)}
                style={({ pressed }) => [
                  styles.listItem,
                  pressed && styles.listItemPressed,
                ]}
              >
                {/* Background percentage bar */}
                <View
                  style={[
                    styles.listItemBackground,
                    {
                      width: `${contribution.percentage}%`,
                      backgroundColor: hexToRgba(contribution.color, 0.1),
                    },
                  ]}
                />

                {/* Content */}
                <View style={styles.listItemContent}>
                  <View style={styles.listItemLeft}>
                    <View
                      style={[styles.colorDot, { backgroundColor: contribution.color }]}
                    />
                    <Text style={styles.mealName} numberOfLines={1}>
                      {contribution.mealName}
                    </Text>
                  </View>

                  <View style={styles.listItemRight}>
                    <Text style={styles.mealValue}>
                      {Math.round(contribution.value).toLocaleString()} {metricInfo.unit}
                    </Text>
                    <Text style={styles.mealPercentage}>
                      {Math.round(contribution.percentage)}%
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.text.tertiary}
                      style={styles.chevron}
                    />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    headerLeft: {
      flex: 1,
      marginRight: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text.primary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.secondary,
      marginTop: 4,
    },
    dateText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.tertiary,
      marginTop: 4,
      marginBottom: 4,
    },
    closeButton: {
      padding: 4,
    },
    scrollView: {
      flex: 1,
    },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.background.subtle,
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
      gap: 10,
    },
    insightIcon: {
      marginTop: 2,
    },
    insightText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
      lineHeight: 20,
    },
    chartContainer: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.subtle,
      marginVertical: 20,
    },
    listContainer: {
      gap: 12,
    },
    listItem: {
      position: 'relative',
      borderRadius: 12,
      backgroundColor: colors.background.card,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      overflow: 'hidden',
    },
    listItemPressed: {
      backgroundColor: colors.background.subtle,
    },
    listItemBackground: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: 12,
    },
    listItemContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    listItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
      gap: 10,
    },
    colorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    mealName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      flex: 1,
    },
    listItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    mealValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    mealPercentage: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.secondary,
      minWidth: 40,
      textAlign: 'right',
    },
    chevron: {
      marginLeft: 4,
    },
    bottomPadding: {
      height: 20,
    },
  });
}
