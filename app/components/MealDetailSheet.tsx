import { View, Text, StyleSheet, Pressable, ScrollView, Image, Modal, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { PortionSelector } from './PortionSelector';
import { MealTypePicker, type MealType } from './MealTypePicker';
import { MacroPieChart } from './MacroPieChart';
import { IngredientMacroPie } from './IngredientMacroPie';
import { useTheme } from '@/hooks/useTheme';
import { hexToRgba } from '@/config/theme';
import { useHaptics } from '@/hooks/useHaptics';
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

type Meal = {
  id: string;
  dishTitle?: string;
  ingredientsList?: Ingredient[];
  items?: Ingredient[]; // Backwards compatibility
  totalCalories: number;
  macros: { p: number; c: number; f: number };
  createdAt?: string;
  imageUrl?: string;
  imageUri?: string;
  mealType?: 'breakfast' | 'brunch' | 'lunch' | 'snack' | 'dinner' | 'pre-workout' | 'post-workout';
  portionMultiplier?: number;
};

const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: '☀️',
  brunch: '🥐',
  lunch: '🌞',
  snack: '🍎',
  dinner: '🌙',
  'pre-workout': '💪',
  'post-workout': '🏋️',
};

function formatTime(isoString: string | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace('-', ' ');
}

function formatNumber(value: number): string {
  return value.toFixed(1);
}

function getDominantMacro(
  macros: { p: number; c: number; f: number },
  colors: ReturnType<typeof import('@/config/theme').getColors>
): {
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
    protein: colors.macro.protein,
    carbs: colors.macro.carbs,
    fat: colors.macro.fat,
  };

  return { type, percentage, color: colorMap[type] };
}

// Inline Ingredient Detail View Component
function IngredientDetailView({
  ingredient,
  onBack,
  onClose,
  colors,
}: {
  ingredient: Ingredient;
  onBack: () => void;
  onClose: () => void;
  colors: ReturnType<typeof import('@/config/theme').getColors>;
}) {
  const { targets, isLoading: targetsLoading } = useUserTargets();
  const dailyTargets = targetsLoading || !targets ? DEFAULT_DAILY_TARGETS : targets;
  const ingredientStyles = useMemo(() => createIngredientStyles(colors), [colors]);

  const { macros, calories, estimated_weight_g, portion_text, notes, imageUrl, id } = ingredient;
  const dominant = getDominantMacro(macros, colors);
  const proteinCals = macros.p * 4;
  const carbsCals = macros.c * 4;
  const fatCals = macros.f * 9;

  const caloriesPer100g =
    estimated_weight_g && estimated_weight_g > 0
      ? Math.round((calories / estimated_weight_g) * 100)
      : null;

  const proteinEfficiency = macros.p > 0 ? Math.round(calories / macros.p) : null;
  const portionDisplay = portion_text || (estimated_weight_g ? `${estimated_weight_g}g` : '');
  const dominantLabel = {
    protein: 'Protein Source',
    carbs: 'Carb Source',
    fat: 'Fat Source',
  }[dominant.type];
  const isImageGenerating = id && !imageUrl;

  const [showFullImage, setShowFullImage] = useState(false);

  return (
    <>
    <View style={ingredientStyles.container}>
      {/* Fixed Header */}
      <View style={ingredientStyles.header}>
        <View style={ingredientStyles.headerLeft}>
          {/* Thumbnail Image */}
          {imageUrl || isImageGenerating ? (
            <Pressable
              onPress={() => {
                if (imageUrl) setShowFullImage(true);
              }}
              style={ingredientStyles.thumbnailButton}
            >
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={ingredientStyles.thumbnailImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[ingredientStyles.thumbnailImage, ingredientStyles.generatingContainer, { backgroundColor: colors.background.elevated }]}>
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                </View>
              )}
            </Pressable>
          ) : (
            <View style={[ingredientStyles.textIngredientIcon, { backgroundColor: colors.background.elevated }]}>
              <Ionicons name="restaurant" size={24} color={colors.primary[400]} />
            </View>
          )}

          {/* Title & Info */}
          <View style={ingredientStyles.titleContainer}>
            <Text style={ingredientStyles.ingredientLabel}>INGREDIENT DETAILS</Text>
            <Text style={[ingredientStyles.title, { color: colors.text.primary }]} numberOfLines={2}>
              {ingredient.name}
            </Text>
            {portionDisplay && (
              <Text style={[ingredientStyles.portion, { color: colors.text.secondary }]} numberOfLines={1}>
                {portionDisplay}
              </Text>
            )}
          </View>
        </View>

        {/* Dismiss Button */}
        <Pressable onPress={onBack} style={ingredientStyles.dismissButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </Pressable>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={ingredientStyles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={ingredientStyles.content}>

        {/* Dominant Macro Badge */}
        <View style={[ingredientStyles.badgeContainer, { backgroundColor: colors.background.subtle }]}>
          <View style={[ingredientStyles.macroDot, { backgroundColor: dominant.color }]} />
          <Text style={[ingredientStyles.badgeText, { color: colors.text.primary }]}>
            {dominantLabel} ({Math.round(dominant.percentage)}% of calories)
          </Text>
        </View>

        {/* Nutrition Summary */}
        <View style={[ingredientStyles.summaryCard, { backgroundColor: colors.background.card, borderColor: colors.border.subtle }]}>
          <View style={ingredientStyles.calorieRow}>
            <Text style={[ingredientStyles.calorieValue, { color: colors.text.primary }]}>{calories}</Text>
            <Text style={[ingredientStyles.calorieUnit, { color: colors.text.secondary }]}>calories</Text>
          </View>

          <View style={[ingredientStyles.metricsRow, { borderTopColor: colors.border.subtle }]}>
            {caloriesPer100g && (
              <View style={ingredientStyles.metricItem}>
                <Text style={[ingredientStyles.metricValue, { color: colors.primary[500] }]}>{caloriesPer100g}</Text>
                <Text style={[ingredientStyles.metricLabel, { color: colors.text.secondary }]}>cal per 100g</Text>
              </View>
            )}
            {proteinEfficiency && (
              <View style={ingredientStyles.metricItem}>
                <Text style={[ingredientStyles.metricValue, { color: colors.primary[500] }]}>{proteinEfficiency}</Text>
                <Text style={[ingredientStyles.metricLabel, { color: colors.text.secondary }]}>cal per 1g protein</Text>
              </View>
            )}
          </View>
        </View>

        {/* Macro Breakdown Section */}
        <View style={ingredientStyles.section}>
          <Text style={[ingredientStyles.sectionTitle, { color: colors.text.primary }]}>Contribution to Daily Goals</Text>
          <View style={ingredientStyles.macroChartContainer}>
            <MacroPieChart
              current={{ protein: macros.p, carbs: macros.c, fat: macros.f }}
              target={{ protein: dailyTargets.protein, carbs: dailyTargets.carbs, fat: dailyTargets.fat }}
            />
          </View>
        </View>

        {/* Macro Distribution Pie Chart */}
        <View style={ingredientStyles.section}>
          <Text style={[ingredientStyles.sectionTitle, { color: colors.text.primary }]}>Macro Distribution</Text>
          <View style={ingredientStyles.pieContainer}>
            <IngredientMacroPie macros={macros} size={140} />
          </View>
        </View>

        {/* Details Section */}
        <View style={ingredientStyles.section}>
          <Text style={[ingredientStyles.sectionTitle, { color: colors.text.primary }]}>Breakdown</Text>
          {notes && <Text style={[ingredientStyles.notes, { color: colors.text.tertiary }]}>{notes}</Text>}
          <View style={ingredientStyles.macroTable}>
            {/* Protein Row */}
            <View style={[ingredientStyles.macroRow, { backgroundColor: colors.background.subtle }]}>
              <View style={ingredientStyles.macroLabelContainer}>
                <View style={[ingredientStyles.macroDot, { backgroundColor: colors.macro.protein }]} />
                <Text style={[ingredientStyles.macroLabel, { color: colors.text.primary }]}>Protein</Text>
              </View>
              <View style={ingredientStyles.macroValues}>
                <Text style={[ingredientStyles.macroGrams, { color: colors.text.primary }]}>{macros.p}g</Text>
                <Text style={[ingredientStyles.macroCals, { color: colors.text.secondary }]}>
                  {proteinCals} cal ({Math.round((proteinCals / calories) * 100)}%)
                </Text>
              </View>
            </View>

            {/* Carbs Row */}
            <View style={[ingredientStyles.macroRow, { backgroundColor: colors.background.subtle }]}>
              <View style={ingredientStyles.macroLabelContainer}>
                <View style={[ingredientStyles.macroDot, { backgroundColor: colors.macro.carbs }]} />
                <Text style={[ingredientStyles.macroLabel, { color: colors.text.primary }]}>Carbs</Text>
              </View>
              <View style={ingredientStyles.macroValues}>
                <Text style={[ingredientStyles.macroGrams, { color: colors.text.primary }]}>{macros.c}g</Text>
                <Text style={[ingredientStyles.macroCals, { color: colors.text.secondary }]}>
                  {carbsCals} cal ({Math.round((carbsCals / calories) * 100)}%)
                </Text>
              </View>
            </View>

            {/* Fat Row */}
            <View style={[ingredientStyles.macroRow, { backgroundColor: colors.background.subtle }]}>
              <View style={ingredientStyles.macroLabelContainer}>
                <View style={[ingredientStyles.macroDot, { backgroundColor: colors.macro.fat }]} />
                <Text style={[ingredientStyles.macroLabel, { color: colors.text.primary }]}>Fat</Text>
              </View>
              <View style={ingredientStyles.macroValues}>
                <Text style={[ingredientStyles.macroGrams, { color: colors.text.primary }]}>{macros.f}g</Text>
                <Text style={[ingredientStyles.macroCals, { color: colors.text.secondary }]}>
                  {fatCals} cal ({Math.round((fatCals / calories) * 100)}%)
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={ingredientStyles.bottomPadding} />
        </View>
      </ScrollView>
    </View>

    {/* Full Screen Image Modal */}
    <Modal
      visible={showFullImage}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFullImage(false)}
    >
      <Pressable
        style={ingredientStyles.fullImageModal}
        onPress={() => setShowFullImage(false)}
      >
        <View style={ingredientStyles.fullImageContainer}>
          {imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              style={ingredientStyles.fullImage}
              resizeMode="contain"
            />
          )}
          <Pressable
            onPress={() => setShowFullImage(false)}
            style={ingredientStyles.fullImageCloseButton}
          >
            <Ionicons name="close-circle" size={40} color={colors.text.inverse} />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
    </>
  );
}

type MealDetailSheetProps = {
  visible: boolean;
  meal: Meal | null;
  mealIndex: number;
  onClose: () => void;
  onDelete: (mealId: string) => void;
  onUpdate?: (mealId: string, updates: { portionMultiplier?: number; mealType?: MealType }) => Promise<void>;
};

export function MealDetailSheet({
  visible,
  meal,
  mealIndex,
  onClose,
  onDelete,
  onUpdate,
}: MealDetailSheetProps) {
  const { colors } = useTheme();
  const { light, warning, success, error: errorHaptic } = useHaptics();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPortion, setEditedPortion] = useState<number>(1.0);
  const [editedMealType, setEditedMealType] = useState<MealType | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [viewMode, setViewMode] = useState<'meal' | 'ingredient'>('meal');
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  // Initialize editing state when meal changes
  useEffect(() => {
    if (meal) {
      setEditedPortion(meal.portionMultiplier || 1.0);
      setEditedMealType(meal.mealType);
    }
  }, [meal]);

  // Reset edit mode and view mode when sheet closes
  useEffect(() => {
    if (!visible) {
      setIsEditing(false);
      setError(null);
      setViewMode('meal');
      setSelectedIngredient(null);
    }
  }, [visible]);

  // Clear error when user makes changes
  useEffect(() => {
    if (isEditing && error) {
      setError(null);
    }
  }, [editedPortion, editedMealType]);

  // Update selectedIngredient when ingredients change (e.g., image generated)
  useEffect(() => {
    if (selectedIngredient && meal?.ingredientsList) {
      // Find the updated ingredient by name
      const updatedIngredient = meal.ingredientsList.find(
        (ing) => ing.name === selectedIngredient.name
      );
      if (updatedIngredient) {
        // Update if imageUrl changed
        if (updatedIngredient.imageUrl !== selectedIngredient.imageUrl) {
          setSelectedIngredient(updatedIngredient);
        }
      }
    }
  }, [meal?.ingredientsList, selectedIngredient]);

  // IMPORTANT: useMemo must be called before any early returns to comply with Rules of Hooks
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!meal) return null;

  // Backwards compatibility: support both ingredientsList and items
  const ingredients = meal.ingredientsList || []; // items no longer used

  const handleDelete = () => {
    Alert.alert(
      'Delete meal?',
      'This meal will be removed permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            warning();
            onDelete(meal.id);
            onClose();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleEdit = () => {
    light();
    setIsEditing(true);
    setError(null); // Clear any previous errors
  };

  const handleCancel = () => {
    light();
    // Reset to original values
    setEditedPortion(meal.portionMultiplier || 1.0);
    setEditedMealType(meal.mealType);
    setIsEditing(false);
    setError(null); // Clear any errors
  };

  const hasChanges =
    editedPortion !== (meal.portionMultiplier || 1.0) ||
    editedMealType !== meal.mealType;

  const handleSave = async () => {
    if (!onUpdate || !hasChanges) return;

    setIsSaving(true);
    setError(null); // Clear any previous errors
    try {
      const updates: { portionMultiplier?: number; mealType?: MealType } = {};

      if (editedPortion !== (meal.portionMultiplier || 1.0)) {
        updates.portionMultiplier = editedPortion;
      }

      if (editedMealType !== meal.mealType) {
        updates.mealType = editedMealType;
      }

      console.log('Saving meal changes', { mealId: meal.id, updates });

      await onUpdate(meal.id, updates);
      success();
      setIsEditing(false);
      onClose();
    } catch (err) {
      errorHaptic();
      console.warn('Failed to update meal:', err);
      // Set user-friendly error message
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
      setError(errorMessage);
      // Don't close the sheet - let the user try again or cancel
    } finally {
      setIsSaving(false);
    }
  };

  // Use edited values when in edit mode, original values otherwise
  const displayMealType = isEditing ? editedMealType : meal.mealType;
  const displayPortion = isEditing ? editedPortion : (meal.portionMultiplier || 1.0);

  const emoji = displayMealType ? MEAL_TYPE_EMOJI[displayMealType] : '🍽️';
  const timeLabel = formatTime(meal.createdAt);

  // Calculate adjusted calories and macros based on portion
  const adjustedCalories = meal.totalCalories * displayPortion / (meal.portionMultiplier || 1.0);
  const adjustedMacros = {
    p: meal.macros.p * displayPortion / (meal.portionMultiplier || 1.0),
    c: meal.macros.c * displayPortion / (meal.portionMultiplier || 1.0),
    f: meal.macros.f * displayPortion / (meal.portionMultiplier || 1.0),
  };

  const portionLabel = displayPortion !== 1.0 ? `${displayPortion}x portion` : 'Full portion';

  // Build subtitle parts
  const subtitleParts = [];
  if (meal.dishTitle && displayMealType) {
    subtitleParts.push(`${emoji} ${capitalize(displayMealType)}`);
  }
  if (timeLabel) subtitleParts.push(timeLabel);
  subtitleParts.push(`${formatNumber(adjustedCalories)} kcal`);
  subtitleParts.push(portionLabel);

  return (
    <BottomSheet visible={visible} onClose={onClose} height={600}>
      <View style={styles.container}>
        {viewMode === 'ingredient' && selectedIngredient ? (
          /* Ingredient Detail View */
          <IngredientDetailView
            ingredient={selectedIngredient}
            onBack={() => {
              light();
              setViewMode('meal');
            }}
            onClose={onClose}
            colors={colors}
          />
        ) : (
          /* Meal Detail View */
          <>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Thumbnail Image or Icon for text-based meals */}
            {(meal.imageUrl || meal.imageUri) ? (
              <Pressable
                onPress={() => {
                  light();
                  setShowFullImage(true);
                }}
                style={styles.thumbnailButton}
              >
                <Image
                  source={{ uri: meal.imageUrl || meal.imageUri }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              </Pressable>
            ) : (
              <View style={styles.textMealIcon}>
                <Ionicons name="restaurant" size={28} color={colors.primary[400]} />
              </View>
            )}

            {/* Title Container - Same for both view and edit mode */}
            <View style={styles.titleContainer}>
              {isEditing && (
                <Text style={styles.editModeLabel}>Editing</Text>
              )}
              <View style={styles.titleRow}>
                {!meal.dishTitle && <Text style={styles.titleEmoji}>{emoji}</Text>}
                <Text style={styles.title}>
                  {meal.dishTitle || (displayMealType ? capitalize(displayMealType) : `Meal ${mealIndex + 1}`)}
                </Text>
              </View>
              <Text style={styles.subtitle}>
                {subtitleParts.join(' • ')}
              </Text>
            </View>
          </View>
          {!isEditing && onUpdate && (
            <Pressable onPress={handleEdit} style={styles.editButton}>
              <Ionicons name="pencil" size={20} color={colors.primary[600]} />
            </Pressable>
          )}
          {!isEditing && (
            <Pressable onPress={handleDelete} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </Pressable>
          )}
          {isEditing ? (
            <Pressable
              onPress={() => {
                light();
                handleCancel();
              }}
              style={styles.dismissButton}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                light();
                onClose();
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </Pressable>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isEditing ? (
            /* EDIT MODE */
            <>
              {/* Edit Controls */}
              <View style={styles.editContent}>
                <MealTypePicker
                  selected={editedMealType}
                  onSelect={setEditedMealType}
                />

                <PortionSelector
                  selected={editedPortion}
                  onSelect={setEditedPortion}
                  baseCalories={meal.totalCalories / (meal.portionMultiplier || 1.0)}
                />

                {/* Live Macro Preview */}
                <View style={styles.previewSection}>
                  <Text style={styles.previewTitle}>Preview</Text>
                  <View style={styles.macrosGrid}>
                    <View style={styles.macroCard}>
                      <View style={[styles.macroDot, { backgroundColor: colors.macro.protein }]} />
                      <Text style={styles.macroLabel}>Protein</Text>
                      <Text style={styles.macroValue}>{formatNumber(adjustedMacros.p)}g</Text>
                    </View>
                    <View style={styles.macroCard}>
                      <View style={[styles.macroDot, { backgroundColor: colors.macro.carbs }]} />
                      <Text style={styles.macroLabel}>Carbs</Text>
                      <Text style={styles.macroValue}>{formatNumber(adjustedMacros.c)}g</Text>
                    </View>
                    <View style={styles.macroCard}>
                      <View style={[styles.macroDot, { backgroundColor: colors.macro.fat }]} />
                      <Text style={styles.macroLabel}>Fat</Text>
                      <Text style={styles.macroValue}>{formatNumber(adjustedMacros.f)}g</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Save/Cancel Buttons */}
              <View style={styles.editActions}>
                <Button
                  variant="primary"
                  onPress={handleSave}
                  disabled={!hasChanges}
                  loading={isSaving}
                  style={styles.saveButton}
                >
                  Save Changes
                </Button>
                <Pressable onPress={handleCancel} disabled={isSaving} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : (
            /* VIEW MODE */
            <>
              {/* Macros Summary */}
              <View style={styles.macrosSection}>
                <Text style={styles.sectionTitle}>Macronutrients</Text>
                <View style={styles.macrosGrid}>
                  <View style={styles.macroCard}>
                    <View style={[styles.macroDot, { backgroundColor: colors.macro.protein }]} />
                    <Text style={styles.macroLabel}>Protein</Text>
                    <Text style={styles.macroValue}>{formatNumber(adjustedMacros.p)}g</Text>
                  </View>
                  <View style={styles.macroCard}>
                    <View style={[styles.macroDot, { backgroundColor: colors.macro.carbs }]} />
                    <Text style={styles.macroLabel}>Carbs</Text>
                    <Text style={styles.macroValue}>{formatNumber(adjustedMacros.c)}g</Text>
                  </View>
                  <View style={styles.macroCard}>
                    <View style={[styles.macroDot, { backgroundColor: colors.macro.fat }]} />
                    <Text style={styles.macroLabel}>Fat</Text>
                    <Text style={styles.macroValue}>{formatNumber(adjustedMacros.f)}g</Text>
                  </View>
                </View>
              </View>

              {/* Ingredients List */}
              <View style={styles.ingredientsSection}>
                <Text style={styles.sectionTitle}>Ingredients ({ingredients.length})</Text>
                {ingredients.map((ingredient, index) => (
                  <TouchableOpacity
                    key={`${ingredient.name}-${index}`}
                    style={styles.ingredientCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      light();
                      setSelectedIngredient(ingredient);
                      setViewMode('ingredient');
                    }}
                  >
                    <View style={styles.ingredientHeader}>
                      <View style={styles.ingredientIcon}>
                        {ingredient.imageUrl ? (
                          <Image
                            source={{ uri: ingredient.imageUrl }}
                            style={styles.ingredientImage}
                            resizeMode="cover"
                          />
                        ) : ingredient.id ? (
                          // Has ID but no image URL = image is generating
                          <View style={styles.generatingImageContainer}>
                            <ActivityIndicator size="small" color={colors.primary[400]} />
                          </View>
                        ) : (
                          // No ID = no image available
                          <Ionicons name="restaurant" size={16} color={colors.primary[400]} />
                        )}
                      </View>
                      <View style={styles.ingredientInfo}>
                        <Text style={styles.ingredientName}>{ingredient.name}</Text>
                        {ingredient.estimated_weight_g && (
                          <Text style={styles.ingredientWeight}>{ingredient.estimated_weight_g}g</Text>
                        )}
                        {ingredient.notes && (
                          <Text style={styles.ingredientNotes}>{ingredient.notes}</Text>
                        )}
                      </View>
                      <Text style={styles.ingredientCalories}>{formatNumber(ingredient.calories)} kcal</Text>
                    </View>
                    <View style={styles.ingredientMacros}>
                      <View style={styles.ingredientMacro}>
                        <View style={[styles.macroDot, { backgroundColor: colors.macro.protein }]} />
                        <Text style={styles.ingredientMacroText}>P {formatNumber(ingredient.macros.p)}g</Text>
                      </View>
                      <View style={styles.ingredientMacro}>
                        <View style={[styles.macroDot, { backgroundColor: colors.macro.carbs }]} />
                        <Text style={styles.ingredientMacroText}>C {formatNumber(ingredient.macros.c)}g</Text>
                      </View>
                      <View style={styles.ingredientMacro}>
                        <View style={[styles.macroDot, { backgroundColor: colors.macro.fat }]} />
                        <Text style={styles.ingredientMacroText}>F {formatNumber(ingredient.macros.f)}g</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Actions */}
              <View style={styles.actionsSection}>
                {onUpdate && (
                  <Button
                    variant="secondary"
                    onPress={handleEdit}
                    style={styles.actionButton}
                  >
                    Edit Meal
                  </Button>
                )}
                <Button variant="danger" onPress={handleDelete} style={styles.actionButton}>
                  Delete Meal
                </Button>
              </View>
            </>
          )}
        </ScrollView>
        </>
        )}
      </View>

      {/* Full Screen Image Modal */}
      <Modal
        visible={showFullImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          light();
          setShowFullImage(false);
        }}
      >
        <Pressable
          style={styles.fullImageModal}
          onPress={() => {
            light();
            setShowFullImage(false);
          }}
        >
          <View style={styles.fullImageContainer}>
            {(meal.imageUrl || meal.imageUri) && (
              <Image
                source={{ uri: meal.imageUrl || meal.imageUri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
            <Pressable
              onPress={() => {
                light();
                setShowFullImage(false);
              }}
              style={styles.fullImageCloseButton}
            >
              <Ionicons name="close-circle" size={40} color={colors.text.inverse} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
      marginBottom: 24,
    },
    headerLeft: {
      flex: 1,
      marginRight: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    thumbnailButton: {
      marginRight: 12,
    },
    thumbnailImage: {
      width: 56,
      height: 56,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border.medium,
    },
    textMealIcon: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: colors.background.elevated,
      borderWidth: 2,
      borderColor: colors.border.medium,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    titleContainer: {
      flex: 1,
    },
    editModeLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    titleEmoji: {
      fontSize: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text.primary,
      flex: 1,
    },
    subtitle: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
    },
    editButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background.elevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    deleteButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: hexToRgba(colors.error, 0.06),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.border.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dismissButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background.elevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
    },
    editContent: {
      gap: 16,
    },
    previewSection: {
      marginTop: 8,
    },
    previewTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    macrosSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 12,
    },
    macrosGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    macroCard: {
      flex: 1,
      backgroundColor: colors.background.subtle,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    macroDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginBottom: 8,
    },
    macroLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      marginBottom: 4,
    },
    macroValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },
    ingredientsSection: {
      marginBottom: 24,
    },
    ingredientCard: {
      backgroundColor: colors.background.subtle,
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
    },
    ingredientHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    ingredientIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.background.elevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    ingredientImage: {
      width: 28,
      height: 28,
      borderRadius: 8,
    },
    generatingImageContainer: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ingredientInfo: {
      flex: 1,
    },
    ingredientName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 2,
    },
    ingredientWeight: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    ingredientNotes: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontStyle: 'italic',
      marginTop: 2,
    },
    ingredientCalories: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
    },
    ingredientMacros: {
      flexDirection: 'row',
      gap: 16,
      paddingLeft: 38,
    },
    ingredientMacro: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    macroDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    ingredientMacroText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    actionsSection: {
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
      gap: 12,
    },
    actionButton: {
      marginBottom: 0,
    },
    errorContainer: {
      marginTop: 16,
      padding: 12,
      backgroundColor: hexToRgba(colors.error, 0.06),
      borderRadius: 8,
      borderWidth: 1,
      borderColor: hexToRgba(colors.error, 0.19),
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      color: colors.error,
      fontWeight: '500',
    },
    editActions: {
      marginTop: 32,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
    },
    saveButton: {
      marginBottom: 12,
    },
    cancelButton: {
      padding: 12,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    fullImageModal: {
      flex: 1,
      backgroundColor: colors.modal.fullScreen,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullImageContainer: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullImage: {
      width: '100%',
      height: '100%',
    },
    fullImageCloseButton: {
      position: 'absolute',
      top: 60,
      right: 20,
    },
  });
}

// Styles for ingredient detail view
function createIngredientStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    headerLeft: {
      flex: 1,
      marginRight: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    thumbnailButton: {
      marginRight: 12,
    },
    thumbnailImage: {
      width: 56,
      height: 56,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border.medium,
    },
    generatingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    textIngredientIcon: {
      width: 56,
      height: 56,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.elevated,
      borderWidth: 2,
      borderColor: colors.border.medium,
      marginRight: 12,
    },
    titleContainer: {
      flex: 1,
    },
    ingredientLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 4,
      color: colors.text.primary,
    },
    portion: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.secondary,
    },
    dismissButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background.elevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
  content: {
    paddingHorizontal: 20,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.background.subtle,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    backgroundColor: colors.background.card,
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
    letterSpacing: -1,
    color: colors.text.primary,
  },
  calorieUnit: {
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 8,
    color: colors.text.secondary,
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
    marginBottom: 4,
    color: colors.primary[500],
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    color: colors.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
    color: colors.text.primary,
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
    marginBottom: 16,
    lineHeight: 20,
    color: colors.text.tertiary,
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
    borderRadius: 12,
    backgroundColor: colors.background.subtle,
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
    marginBottom: 2,
    color: colors.text.primary,
  },
  macroCals: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  bottomPadding: {
    height: 20,
  },
  fullImageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  fullImageCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  });
}
