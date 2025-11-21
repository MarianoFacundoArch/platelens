import { View, Text, StyleSheet, Pressable, ScrollView, Image, Modal, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { PortionSelector } from './PortionSelector';
import { MealTypePicker, type MealType } from './MealTypePicker';
import { theme } from '@/config/theme';
import { useHaptics } from '@/hooks/useHaptics';

type Ingredient = {
  name: string;
  estimated_weight_g: number;
  calories: number;
  macros: { p: number; c: number; f: number };
  notes?: string;
};

type Meal = {
  id: string;
  dishTitle?: string;
  ingredientsList?: Ingredient[];
  items?: Ingredient[]; // Backwards compatibility
  totalCalories: number;
  macros: { p: number; c: number; f: number };
  createdAt?: string;
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
  const { light, warning, success, error: errorHaptic } = useHaptics();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPortion, setEditedPortion] = useState<number>(1.0);
  const [editedMealType, setEditedMealType] = useState<MealType | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);

  // Initialize editing state when meal changes
  useEffect(() => {
    if (meal) {
      setEditedPortion(meal.portionMultiplier || 1.0);
      setEditedMealType(meal.mealType);
    }
  }, [meal]);

  // Reset edit mode when sheet closes
  useEffect(() => {
    if (!visible) {
      setIsEditing(false);
      setError(null);
    }
  }, [visible]);

  // Clear error when user makes changes
  useEffect(() => {
    if (isEditing && error) {
      setError(null);
    }
  }, [editedPortion, editedMealType]);

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Thumbnail Image or Icon for text-based meals */}
            {!isEditing && (
              meal.imageUri ? (
                <Pressable
                  onPress={() => {
                    light();
                    setShowFullImage(true);
                  }}
                  style={styles.thumbnailButton}
                >
                  <Image
                    source={{ uri: meal.imageUri }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </Pressable>
              ) : (
                <View style={styles.textMealIcon}>
                  <Ionicons name="restaurant" size={28} color={theme.colors.primary[500]} />
                </View>
              )
            )}

            {isEditing ? (
              // Edit Mode Header
              <>
                <Pressable onPress={handleCancel} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color={theme.colors.ink[700]} />
                </Pressable>
                <Text style={styles.editModeTitle}>Edit Meal</Text>
              </>
            ) : (
              // View Mode Header
              <View style={styles.titleContainer}>
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
            )}
          </View>
          {!isEditing && onUpdate && (
            <Pressable onPress={handleEdit} style={styles.editButton}>
              <Ionicons name="pencil" size={20} color={theme.colors.primary[600]} />
            </Pressable>
          )}
          {!isEditing && (
            <Pressable onPress={handleDelete} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              light();
              onClose();
            }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={theme.colors.ink[500]} />
          </Pressable>
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
                      <View style={[styles.macroDot, { backgroundColor: theme.colors.protein.main }]} />
                      <Text style={styles.macroLabel}>Protein</Text>
                      <Text style={styles.macroValue}>{formatNumber(adjustedMacros.p)}g</Text>
                    </View>
                    <View style={styles.macroCard}>
                      <View style={[styles.macroDot, { backgroundColor: theme.colors.carbs.main }]} />
                      <Text style={styles.macroLabel}>Carbs</Text>
                      <Text style={styles.macroValue}>{formatNumber(adjustedMacros.c)}g</Text>
                    </View>
                    <View style={styles.macroCard}>
                      <View style={[styles.macroDot, { backgroundColor: theme.colors.fat.main }]} />
                      <Text style={styles.macroLabel}>Fat</Text>
                      <Text style={styles.macroValue}>{formatNumber(adjustedMacros.f)}g</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
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
                    <View style={[styles.macroDot, { backgroundColor: theme.colors.protein.main }]} />
                    <Text style={styles.macroLabel}>Protein</Text>
                    <Text style={styles.macroValue}>{formatNumber(adjustedMacros.p)}g</Text>
                  </View>
                  <View style={styles.macroCard}>
                    <View style={[styles.macroDot, { backgroundColor: theme.colors.carbs.main }]} />
                    <Text style={styles.macroLabel}>Carbs</Text>
                    <Text style={styles.macroValue}>{formatNumber(adjustedMacros.c)}g</Text>
                  </View>
                  <View style={styles.macroCard}>
                    <View style={[styles.macroDot, { backgroundColor: theme.colors.fat.main }]} />
                    <Text style={styles.macroLabel}>Fat</Text>
                    <Text style={styles.macroValue}>{formatNumber(adjustedMacros.f)}g</Text>
                  </View>
                </View>
              </View>

              {/* Ingredients List */}
              <View style={styles.ingredientsSection}>
                <Text style={styles.sectionTitle}>Ingredients ({ingredients.length})</Text>
                {ingredients.map((ingredient, index) => (
                  <View key={`${ingredient.name}-${index}`} style={styles.ingredientCard}>
                    <View style={styles.ingredientHeader}>
                      <View style={styles.ingredientIcon}>
                        {ingredient.imageUrl ? (
                          <Image
                            source={{ uri: ingredient.imageUrl }}
                            style={styles.ingredientImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons name="restaurant" size={16} color={theme.colors.primary[500]} />
                        )}
                      </View>
                      <View style={styles.ingredientInfo}>
                        <Text style={styles.ingredientName}>{ingredient.name}</Text>
                        <Text style={styles.ingredientWeight}>{ingredient.estimated_weight_g}g</Text>
                        {ingredient.notes && (
                          <Text style={styles.ingredientNotes}>{ingredient.notes}</Text>
                        )}
                      </View>
                      <Text style={styles.ingredientCalories}>{formatNumber(ingredient.calories)} kcal</Text>
                    </View>
                    <View style={styles.ingredientMacros}>
                      <Text style={styles.ingredientMacroText}>P {formatNumber(ingredient.macros.p)}g</Text>
                      <Text style={styles.ingredientMacroSeparator}>•</Text>
                      <Text style={styles.ingredientMacroText}>C {formatNumber(ingredient.macros.c)}g</Text>
                      <Text style={styles.ingredientMacroSeparator}>•</Text>
                      <Text style={styles.ingredientMacroText}>F {formatNumber(ingredient.macros.f)}g</Text>
                    </View>
                  </View>
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
            {meal.imageUri && (
              <Image
                source={{ uri: meal.imageUri }}
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
              <Ionicons name="close-circle" size={40} color="#FFFFFF" />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
    borderColor: theme.colors.primary[200],
  },
  textMealIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 2,
    borderColor: theme.colors.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.ink[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  editModeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.ink[900],
  },
  titleContainer: {
    flex: 1,
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
    color: theme.colors.ink[900],
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.ink[500],
    lineHeight: 18,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.error + '10', // Light red background
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.ink[100],
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
    color: theme.colors.ink[600],
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
    color: theme.colors.ink[900],
    marginBottom: 12,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: theme.colors.ink[50],
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
    color: theme.colors.ink[500],
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink[900],
  },
  ingredientsSection: {
    marginBottom: 24,
  },
  ingredientCard: {
    backgroundColor: theme.colors.ink[50],
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
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  ingredientImage: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink[900],
    marginBottom: 2,
  },
  ingredientWeight: {
    fontSize: 12,
    color: theme.colors.ink[500],
  },
  ingredientNotes: {
    fontSize: 11,
    color: theme.colors.ink[400],
    fontStyle: 'italic',
    marginTop: 2,
  },
  ingredientCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.ink[900],
  },
  ingredientMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 38,
  },
  ingredientMacroText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.ink[600],
  },
  ingredientMacroSeparator: {
    fontSize: 12,
    color: theme.colors.ink[400],
  },
  actionsSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink[100],
    gap: 12,
  },
  actionButton: {
    marginBottom: 0,
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.colors.error + '10', // 10% opacity
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.error + '30', // 30% opacity
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
    fontWeight: '500',
  },
  editActions: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink[100],
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
    color: theme.colors.ink[600],
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
