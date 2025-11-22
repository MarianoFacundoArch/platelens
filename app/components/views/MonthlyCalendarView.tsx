import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { useTheme } from '@/hooks/useTheme';
import { UserTargets } from '@/hooks/useUserTargets';
import { useMonthlyHistory } from '@/hooks/useMonthlyHistory';
import { formatLocalDateISO } from '@/lib/dateUtils';

type HistoryDay = {
  dateISO: string;
  totals: { calories: number; p: number; c: number; f: number };
  logCount: number;
};

type MonthlyCalendarViewProps = {
  currentDate: string;
  history: HistoryDay[];
  targets: UserTargets;
  onDateSelect: (dateISO: string) => void;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDate(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`);
}

function getDayState(day: HistoryDay | null, targetCalories: number): 'on-target' | 'off-target' | 'no-data' {
  if (!day || day.logCount === 0) return 'no-data';

  const diff = Math.abs(day.totals.calories - targetCalories);
  const threshold = targetCalories * 0.15; // Within 15% of target

  return diff <= threshold ? 'on-target' : 'off-target';
}

export function MonthlyCalendarView({
  currentDate,
  targets,
  onDateSelect,
}: MonthlyCalendarViewProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectedDate = toDate(currentDate);
  const [viewingMonth, setViewingMonth] = useState(selectedDate.getMonth());
  const [viewingYear, setViewingYear] = useState(selectedDate.getFullYear());

  const { data: monthData, isLoading } = useMonthlyHistory(viewingYear, viewingMonth);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewingYear, viewingMonth, 1);
    const lastDayOfMonth = new Date(viewingYear, viewingMonth + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: Array<{
      dateISO: string | null;
      dayNumber: number | null;
      isCurrentMonth: boolean;
      data: HistoryDay | null;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({
        dateISO: null,
        dayNumber: null,
        isCurrentMonth: false,
        data: null,
        isToday: false,
        isSelected: false,
      });
    }

    // Add days of the month
    const today = formatLocalDateISO();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewingYear, viewingMonth, day);
      const dateISO = formatLocalDateISO(date);
      const dayData = monthData.find((d) => d.dateISO === dateISO) || null;

      days.push({
        dateISO,
        dayNumber: day,
        isCurrentMonth: true,
        data: dayData,
        isToday: dateISO === today,
        isSelected: dateISO === currentDate,
      });
    }

    return days;
  }, [viewingYear, viewingMonth, monthData, currentDate]);

  const monthName = new Date(viewingYear, viewingMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const goToPreviousMonth = () => {
    if (viewingMonth === 0) {
      setViewingMonth(11);
      setViewingYear(viewingYear - 1);
    } else {
      setViewingMonth(viewingMonth - 1);
    }
  };

  const goToNextMonth = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Don't allow navigating beyond current month
    if (viewingYear === currentYear && viewingMonth === currentMonth) {
      return;
    }

    if (viewingMonth === 11) {
      setViewingMonth(0);
      setViewingYear(viewingYear + 1);
    } else {
      setViewingMonth(viewingMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setViewingMonth(today.getMonth());
    setViewingYear(today.getFullYear());
  };

  const stats = useMemo(() => {
    const daysWithData = monthData.filter((d) => d.logCount > 0);
    const onTargetDays = daysWithData.filter((d) => {
      const diff = Math.abs(d.totals.calories - targets.calories);
      return diff <= targets.calories * 0.15;
    });

    return {
      totalDays: daysWithData.length,
      onTargetDays: onTargetDays.length,
      avgCalories: daysWithData.length
        ? Math.round(daysWithData.reduce((acc, d) => acc + d.totals.calories, 0) / daysWithData.length)
        : 0,
    };
  }, [monthData, targets.calories]);

  const isCurrentMonth = useMemo(() => {
    const today = new Date();
    return viewingYear === today.getFullYear() && viewingMonth === today.getMonth();
  }, [viewingYear, viewingMonth]);

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <Card variant="elevated" padding="md" style={styles.card}>
        <View style={styles.monthNav}>
          <Pressable onPress={goToPreviousMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
          </Pressable>

          <Text style={styles.monthTitle}>{monthName}</Text>

          <Pressable
            onPress={goToNextMonth}
            style={[styles.navButton, isCurrentMonth && styles.navButtonDisabled]}
            disabled={isCurrentMonth}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isCurrentMonth ? colors.ink[300] : colors.text.secondary}
            />
          </Pressable>
        </View>

        {!isCurrentMonth && (
          <Pressable onPress={goToToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>Jump to Today</Text>
          </Pressable>
        )}
      </Card>

      {/* Month Stats */}
      <Card variant="elevated" padding="lg" style={styles.card}>
        <Text style={styles.statsTitle}>Month Summary</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalDays}</Text>
            <Text style={styles.statLabel}>Days Logged</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.onTargetDays}</Text>
            <Text style={styles.statLabel}>Days On Target</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.avgCalories}</Text>
            <Text style={styles.statLabel}>Avg Calories</Text>
          </View>
        </View>
      </Card>

      {/* Calendar Grid */}
      <Card variant="elevated" padding="md" style={styles.card}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary[500]} />
            <Text style={styles.loadingText}>Loading calendar...</Text>
          </View>
        ) : (
          <>
            {/* Weekday Headers */}
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((day) => (
                <View key={day} style={styles.weekdayHeader}>
                  <Text style={styles.weekdayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Days */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => {
                if (!day.isCurrentMonth) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const dayState = getDayState(day.data, targets.calories);
                const isToday = day.isToday;
                const isSelected = day.isSelected;

                return (
                  <Pressable
                    key={day.dateISO}
                    style={[
                      styles.dayCell,
                      styles.dayCellActive,
                      dayState === 'on-target' && styles.dayCellOnTarget,
                      dayState === 'off-target' && styles.dayCellOffTarget,
                      dayState === 'no-data' && styles.dayCellNoData,
                      isToday && styles.dayCellToday,
                      isSelected && styles.dayCellSelected,
                    ]}
                    onPress={() => day.dateISO && onDateSelect(day.dateISO)}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        dayState === 'on-target' && styles.dayNumberOnTarget,
                        dayState === 'off-target' && styles.dayNumberOffTarget,
                        isToday && styles.dayNumberToday,
                        isSelected && styles.dayNumberSelected,
                      ]}
                    >
                      {day.dayNumber}
                    </Text>
                    {day.data && day.data.logCount > 0 && (
                      <View style={styles.mealDot} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendOnTarget]} />
                <Text style={styles.legendText}>On Target</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendOffTarget]} />
                <Text style={styles.legendText}>Off Target</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendNoData]} />
                <Text style={styles.legendText}>No Data</Text>
              </View>
            </View>
          </>
        )}
      </Card>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      gap: 16,
    },
    card: {
      marginBottom: 0,
    },
    monthNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    navButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background.subtle,
    },
    navButtonDisabled: {
      opacity: 0.3,
    },
    monthTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },
    todayButton: {
      alignSelf: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: colors.primary[50],
      borderRadius: 8,
      marginTop: 8,
    },
    todayButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary[600],
    },
    statsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.background.subtle,
      borderRadius: 12,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
    },
    statLabel: {
      fontSize: 11,
      color: colors.text.secondary,
      marginTop: 4,
      textAlign: 'center',
    },
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    weekdaysRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    weekdayHeader: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
    },
    weekdayText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 16,
    },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
    },
    dayCellActive: {
      borderRadius: 8,
    },
    dayCellOnTarget: {
      backgroundColor: colors.primary[100],
    },
    dayCellOffTarget: {
      backgroundColor: colors.ink[200],
    },
    dayCellNoData: {
      backgroundColor: colors.background.subtle,
    },
    dayCellToday: {
      borderWidth: 2,
      borderColor: colors.primary[500],
    },
    dayCellSelected: {
      borderWidth: 2,
      borderColor: colors.primary[700],
      backgroundColor: colors.primary[200],
    },
    dayNumber: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    dayNumberOnTarget: {
      color: colors.primary[700],
    },
    dayNumberOffTarget: {
      color: colors.text.secondary,
    },
    dayNumberToday: {
      fontWeight: '700',
    },
    dayNumberSelected: {
      color: colors.primary[900],
      fontWeight: '700',
    },
    mealDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primary[600],
      marginTop: 2,
    },
    legend: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendBox: {
      width: 16,
      height: 16,
      borderRadius: 4,
    },
    legendOnTarget: {
      backgroundColor: colors.primary[100],
    },
    legendOffTarget: {
      backgroundColor: colors.ink[200],
    },
    legendNoData: {
      backgroundColor: colors.background.subtle,
    },
    legendText: {
      fontSize: 11,
      color: colors.text.secondary,
    },
  });
}
