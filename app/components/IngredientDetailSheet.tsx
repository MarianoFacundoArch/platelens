import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { BottomSheet } from './BottomSheet';
import { IngredientMacroPie } from './IngredientMacroPie';
import { MacroPieChart } from './MacroPieChart';
import { useUserTargets } from '@/hooks/useUserTargets';
import { DEFAULT_DAILY_TARGETS } from '@/utils/defaultTargets';

type Ingredient = {
  name: string;
  estimated_weight_g?: number;
  calories: number;
  macros: { p: number; c: number; f: number };
  notes?: string;
  portion_text?: string;
  id?: string;
  imageUrl?: string;
};

type IngredientDetailSheetProps = {
  visible: boolean;
  onClose: () => void;
  ingredient: Ingredient | null;
};

function getDominantMacro(macros: { p: number; c: number; f: number }): {
  type: 'protein' | 'carbs' | 'fat';
  percentage: number;
  color: string;
} {
  const proteinCals = macros.p * 4;
  const carbsCals = macros.c * 4;
  const fatCals = macros.f * 9;
  const totalCals = proteinCals + carbsCals + fatCals;

  let type: 'protein' | 'carbs' | 'fat';
  let cals: number;

  if (proteinCals >= carbsCals && proteinCals >= fatCals) {
    type = 'protein';
    cals = proteinCals;
  } else if (carbsCals >= fatCals) {
    type = 'carbs';
    cals = carbsCals;
  } else {
    type = 'fat';
    cals = fatCals;
  }

  const percentage = totalCals > 0 ? (cals / totalCals) * 100 : 0;

  const colorMap = {
    protein: '#FF6B9D',
    carbs: '#FFB84D',
    fat: '#9B59FF',
  };

  return { type, percentage, color: colorMap[type] };
}

export function IngredientDetailSheet({
  visible,
  onClose,
  ingredient,
}: IngredientDetailSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { targets, isLoading: targetsLoading } = useUserTargets();

  // Use user targets or default fallback
  const dailyTargets = useMemo(() => {
    if (targetsLoading || !targets) {
      return DEFAULT_DAILY_TARGETS;
    }
    return targets;
  }, [targets, targetsLoading]);

  if (!ingredient) {
    return null;
  }

  const { macros, calories, estimated_weight_g, portion_text, notes, imageUrl, id } = ingredient;

  // Calculate metrics
  const dominant = getDominantMacro(macros);
  const proteinCals = macros.p * 4;
  const carbsCals = macros.c * 4;
  const fatCals = macros.f * 9;

  // Nutritional density (calories per 100g)
  const caloriesPer100g =
    estimated_weight_g && estimated_weight_g > 0
      ? Math.round((calories / estimated_weight_g) * 100)
      : null;

  // Protein efficiency (calories per 1g protein)
  const proteinEfficiency =
    macros.p > 0 ? Math.round(calories / macros.p) : null;

  // Portion display
  const portionDisplay = portion_text || (estimated_weight_g ? `${estimated_weight_g}g` : '');

  // Dominant macro label
  const dominantLabel = {
    protein: 'Protein Source',
    carbs: 'Carb Source',
    fat: 'Fat Source',
  }[dominant.type];

  // Show loading indicator if image is generating
  const isImageGenerating = id && !imageUrl;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height="auto"
      statusBarTranslucent={true}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header Image */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.imagePlaceholder, styles.image]}>
              {isImageGenerating ? (
                <ActivityIndicator size="large" color={colors.primary[500]} />
              ) : (
                <Ionicons name="restaurant" size={64} color={colors.text.tertiary} />
              )}
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Title & Portion */}
          <View style={styles.header}>
            <Text style={styles.title}>{ingredient.name}</Text>
            {portionDisplay && (
              <Text style={styles.portion}>{portionDisplay}</Text>
            )}
          </View>

          {/* Dominant Macro Badge */}
          <View style={styles.badgeContainer}>
            <View style={[styles.macroDot, { backgroundColor: dominant.color }]} />
            <Text style={styles.badgeText}>
              {dominantLabel} ({Math.round(dominant.percentage)}% of calories)
            </Text>
          </View>

          {/* Nutrition Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.calorieRow}>
              <Text style={styles.calorieValue}>{calories}</Text>
              <Text style={styles.calorieUnit}>calories</Text>
            </View>

            <View style={styles.metricsRow}>
              {caloriesPer100g && (
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{caloriesPer100g}</Text>
                  <Text style={styles.metricLabel}>cal per 100g</Text>
                </View>
              )}
              {proteinEfficiency && (
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{proteinEfficiency}</Text>
                  <Text style={styles.metricLabel}>cal per 1g protein</Text>
                </View>
              )}
            </View>
          </View>

          {/* Macro Breakdown Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contribution to Daily Goals</Text>
            <View style={styles.macroChartContainer}>
              <MacroPieChart
                current={{
                  protein: macros.p,
                  carbs: macros.c,
                  fat: macros.f,
                }}
                target={{
                  protein: dailyTargets.protein,
                  carbs: dailyTargets.carbs,
                  fat: dailyTargets.fat,
                }}
              />
            </View>
          </View>

          {/* Macro Distribution Pie Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Macro Distribution</Text>
            <View style={styles.pieContainer}>
              <IngredientMacroPie macros={macros} size={140} />
            </View>
          </View>

          {/* Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Breakdown</Text>
            {notes && (
              <Text style={styles.notes}>{notes}</Text>
            )}
            <View style={styles.macroTable}>
              {/* Protein Row */}
              <View style={styles.macroRow}>
                <View style={styles.macroLabelContainer}>
                  <View style={[styles.macroDot, { backgroundColor: colors.macro.protein }]} />
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroValues}>
                  <Text style={styles.macroGrams}>{macros.p}g</Text>
                  <Text style={styles.macroCals}>
                    {proteinCals} cal ({Math.round((proteinCals / calories) * 100)}%)
                  </Text>
                </View>
              </View>

              {/* Carbs Row */}
              <View style={styles.macroRow}>
                <View style={styles.macroLabelContainer}>
                  <View style={[styles.macroDot, { backgroundColor: colors.macro.carbs }]} />
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroValues}>
                  <Text style={styles.macroGrams}>{macros.c}g</Text>
                  <Text style={styles.macroCals}>
                    {carbsCals} cal ({Math.round((carbsCals / calories) * 100)}%)
                  </Text>
                </View>
              </View>

              {/* Fat Row */}
              <View style={styles.macroRow}>
                <View style={styles.macroLabelContainer}>
                  <View style={[styles.macroDot, { backgroundColor: colors.macro.fat }]} />
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
                <View style={styles.macroValues}>
                  <Text style={styles.macroGrams}>{macros.f}g</Text>
                  <Text style={styles.macroCals}>
                    {fatCals} cal ({Math.round((fatCals / calories) * 100)}%)
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom padding */}
          <View style={styles.bottomPadding} />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    imageContainer: {
      width: '100%',
      height: 200,
      backgroundColor: colors.background.subtle,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.elevated,
    },
    content: {
      padding: 20,
    },
    header: {
      marginBottom: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 4,
    },
    portion: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text.secondary,
    },
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 20,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.background.subtle,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    macroDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    badgeText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
    summaryCard: {
      backgroundColor: colors.background.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    calorieRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      marginBottom: 16,
    },
    calorieValue: {
      fontSize: 48,
      fontWeight: '700',
      color: colors.text.primary,
      letterSpacing: -1,
    },
    calorieUnit: {
      fontSize: 18,
      fontWeight: '500',
      color: colors.text.secondary,
      marginLeft: 8,
    },
    metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
    },
    metricItem: {
      alignItems: 'center',
    },
    metricValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.primary[500],
      marginBottom: 4,
    },
    metricLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text.secondary,
      textAlign: 'center',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 16,
    },
    macroChartContainer: {
      paddingVertical: 8,
    },
    pieContainer: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    notes: {
      fontSize: 14,
      fontStyle: 'italic',
      color: colors.text.tertiary,
      marginBottom: 16,
      lineHeight: 20,
    },
    macroTable: {
      gap: 12,
    },
    macroRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background.subtle,
      borderRadius: 12,
    },
    macroLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    macroLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    macroValues: {
      alignItems: 'flex-end',
    },
    macroGrams: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 2,
    },
    macroCals: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.secondary,
    },
    bottomPadding: {
      height: 20,
    },
  });
}
