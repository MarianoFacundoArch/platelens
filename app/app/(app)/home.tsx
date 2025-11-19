import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CalorieRing } from '@/components/CalorieRing';
import { MacroPieChart } from '@/components/MacroPieChart';
import { Card } from '@/components/Card';
import { StreakChip } from '@/components/StreakChip';
import { Logo } from '@/components/Logo';
import { theme } from '@/config/theme';
import { track } from '@/lib/analytics';
import { useHaptics } from '@/hooks/useHaptics';
import { deleteMeal, updateMeal } from '@/lib/api';
import { MealDetailSheet } from '@/components/MealDetailSheet';
import { MealList } from '@/components/MealList';
import { MealLog, useDailyMeals } from '@/hooks/useDailyMeals';

export default function HomeScreen() {
  const router = useRouter();
  const { medium, light } = useHaptics();
  const { data: mealData, isLoading, isRefreshing, refresh, reload } = useDailyMeals();
  const [selectedMeal, setSelectedMeal] = useState<{ meal: MealLog; index: number } | null>(null);

  const TARGET_CALORIES = 1950;
  const TARGET_PROTEIN = 140;
  const TARGET_CARBS = 200;
  const TARGET_FAT = 65;

  const handleRefresh = () => {
    refresh();
  };

  const openCamera = () => {
    medium();
    track('camera_opened');
    router.push('/camera');
  };

  const handleMealPress = (meal: MealLog, index: number) => {
    light();
    setSelectedMeal({ meal, index });
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await deleteMeal(mealId);
      await reload({ silent: true }); // Reload meals
    } catch (error) {
      console.warn('Failed to delete meal:', error);
    }
  };

  const handleUpdateMeal = async (
    mealId: string,
    updates: { portionMultiplier?: number; mealType?: string }
  ) => {
    try {
      console.log('[meal-update] submitting', { mealId, updates });
      await updateMeal(mealId, updates);
      console.log('[meal-update] success', { mealId });
      await reload({ silent: true }); // Reload meals
    } catch (error) {
      console.warn('[meal-update] failed', error);
      throw error; // Re-throw so the MealDetailSheet can handle it
    }
  };

  return (
    <View style={styles.container}>
      {/* Vibrant Gradient Background */}
      <LinearGradient
        colors={['#E0F7F4', '#F0FFFE', '#FFFFFF']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.dateLabel}>TODAY</Text>
          <View style={styles.header}>
            <Logo variant="compact" />
            <StreakChip count={4} />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          </View>
        ) : (
          <>
            {/* Calorie Ring Card */}
            <Card variant="elevated" padding="lg" style={styles.ringCard}>
              <CalorieRing
                consumed={mealData?.totals.calories || 0}
                target={TARGET_CALORIES}
                size="lg"
                animated
              />

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>REMAINING</Text>
                  <Text style={styles.statValue}>
                    {Math.max(0, TARGET_CALORIES - (mealData?.totals.calories || 0)).toLocaleString()}
                  </Text>
                  <Text style={styles.statUnit}>kcal</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>BURNED</Text>
                  <Text style={styles.statValue}>2,450</Text>
                  <Text style={styles.statUnit}>kcal</Text>
                </View>
              </View>
            </Card>

            {/* Macros Card */}
            <Card variant="elevated" padding="lg" style={styles.macrosCard}>
              <Text style={styles.sectionTitle}>Macronutrients</Text>
              <MacroPieChart
                current={{
                  protein: mealData?.totals.p || 0,
                  carbs: mealData?.totals.c || 0,
                  fat: mealData?.totals.f || 0,
                }}
                target={{
                  protein: TARGET_PROTEIN,
                  carbs: TARGET_CARBS,
                  fat: TARGET_FAT,
                }}
              />
            </Card>

            {/* Today's Meals */}
            <Card variant="elevated" padding="lg" style={styles.mealsCard}>
              <View style={styles.mealsHeader}>
                <Text style={styles.sectionTitle}>Today's Meals</Text>
                <Ionicons name="restaurant-outline" size={20} color={theme.colors.ink[400]} />
              </View>

              {!mealData?.logs || mealData.logs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="camera-outline" size={48} color={theme.colors.ink[300]} />
                  <Text style={styles.emptyTitle}>No meals logged yet</Text>
                  <Text style={styles.emptySubtitle}>Tap the camera button to get started</Text>
                </View>
              ) : (
                <MealList meals={mealData.logs} onPress={handleMealPress} />
              )}
            </Card>
          </>
        )}

        {/* Spacing for FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button - Camera */}
      <View style={styles.fab}>
        <Pressable
          onPress={openCamera}
          style={({ pressed }) => [
            styles.fabButton,
            pressed && styles.fabPressed,
          ]}
        >
          <LinearGradient
            colors={[theme.colors.primary[500], theme.colors.primary[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="camera" size={32} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Meal Detail Sheet */}
      <MealDetailSheet
        visible={!!selectedMeal}
        meal={selectedMeal?.meal || null}
        mealIndex={selectedMeal?.index || 0}
        onClose={() => setSelectedMeal(null)}
        onDelete={handleDeleteMeal}
        onUpdate={handleUpdateMeal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  headerContainer: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary[600],
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.ink[900],
    letterSpacing: -0.5,
  },
  ringCard: {
    marginBottom: 16,
    alignItems: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink[100],
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.ink[500],
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.ink[900],
  },
  statUnit: {
    fontSize: 14,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.ink[100],
    marginHorizontal: 20,
  },
  macrosCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink[900],
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  macrosContainer: {
    gap: 20,
  },
  mealsCard: {
    marginBottom: 16,
  },
  mealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.ink[700],
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.ink[500],
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: theme.colors.primary[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  fabPressed: {
    transform: [{ scale: 0.92 }],
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
