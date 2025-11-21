import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View, ScrollView, StyleSheet, ActivityIndicator, Pressable, Image, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { MacroDistributionChart } from '@/components/MacroDistributionChart';
import { AddMealModal } from '@/components/AddMealModal';
import type { MealType } from '@/components/MealTypeSelector';
import { theme } from '@/config/theme';
import { getCachedScan } from '@/lib/mmkv';
import { useHaptics } from '@/hooks/useHaptics';
import { saveMealToFirestore, updateMeal } from '@/lib/api';
import { uploadMealImage } from '@/lib/imageStorage';
import type { Ingredient, ScanResponse } from '@/lib/scan';

function formatNumber(value: number): string {
  return value.toFixed(1);
}

export default function ScanResultScreen() {
  const router = useRouter();
  const { medium, success } = useHaptics();
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [mealAdded, setMealAdded] = useState(false);

  useEffect(() => {
    const cached = getCachedScan('latest');
    console.log('========================================');
    console.log('SCAN RESULT - CACHED DATA:');
    console.log('Has cached data:', !!cached);
    console.log('Cached data:', JSON.stringify(cached, null, 2));
    console.log('========================================');

    if (cached?.ingredientsList) {
      // Support both legacy and new shapes
      if (cached.totals) {
        console.log('Using new scan format');
        console.log('Dish Title:', cached.dishTitle);
        console.log('Ingredients:', cached.ingredientsList.map((i: any) => i.name));
        setScan(cached as ScanResponse);
      } else {
        const legacyIngredients = cached.ingredientsList as Array<{
          name: string;
          grams: number;
          calories: number;
          macros: string;
        }>;

        const ingredientsList: Ingredient[] = legacyIngredients.map((ingredient) => ({
          name: ingredient.name,
          estimated_weight_g: ingredient.grams,
          portion_text: '',
          notes: '',
          calories: ingredient.calories,
          macros: { p: 0, c: 0, f: 0 },
        }));

        const totals = {
          calories: ingredientsList.reduce((sum, i) => sum + i.calories, 0),
          p: ingredientsList.reduce((sum, i) => sum + i.macros.p, 0),
          c: ingredientsList.reduce((sum, i) => sum + i.macros.c, 0),
          f: ingredientsList.reduce((sum, i) => sum + i.macros.f, 0),
        };

        setScan({ dishTitle: 'Mixed Plate', ingredientsList, totals, confidence: 0.8 });
      }
    }
    setIsLoading(false);
  }, []);

  const handleBack = () => {
    if (mealAdded) {
      router.back();
      return;
    }

    Alert.alert(
      'Discard Scan?',
      "You haven't added this meal to today. Are you sure you want to go back?",
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const handleAddToDay = () => {
    medium();
    setShowAddModal(true);
  };

  const handleConfirmAdd = async (mealType: MealType, portionMultiplier: number) => {
    if (!scan) return;

    setShowAddModal(false);
    setIsSaving(true);

    try {
      // Apply portion multiplier to all nutrition values
      const adjustedIngredients = scan.ingredientsList.map((ingredient) => ({
        ...ingredient,
        calories: ingredient.calories * portionMultiplier,
        macros: {
          p: ingredient.macros.p * portionMultiplier,
          c: ingredient.macros.c * portionMultiplier,
          f: ingredient.macros.f * portionMultiplier,
        },
      }));

      const adjustedTotals = {
        calories: scan.totals.calories * portionMultiplier,
        p: scan.totals.p * portionMultiplier,
        c: scan.totals.c * portionMultiplier,
        f: scan.totals.f * portionMultiplier,
      };

      // Step 1: Create meal in Firestore (without image URL yet)
      const result = await saveMealToFirestore({
        dishTitle: scan.dishTitle,
        ingredientsList: adjustedIngredients,
        totals: adjustedTotals,
        confidence: scan.confidence || 0.8,
        mealType,
        portionMultiplier,
      });

      // Step 2: Upload image to Firebase Storage using meal ID as filename
      // (Only for photo-based scans - text-based scans don't have imageUri)
      if (scan.imageUri && result.logId) {
        try {
          const cloudImageUrl = await uploadMealImage(scan.imageUri, result.logId);

          // Step 3: Update meal with the cloud image URL
          await updateMeal(result.logId, { imageUri: cloudImageUrl });
          console.log('Meal image uploaded and linked successfully');
        } catch (imageError) {
          console.warn('Failed to upload meal image (meal saved without image):', imageError);
          // Don't fail the whole operation if image upload fails
        }
      } else if (!scan.imageUri) {
        console.log('Text-based meal - no image to upload');
      }

      success();
      setMealAdded(true);
      router.push('/(app)/home');
    } catch (error) {
      console.warn('Failed to save meal:', error);
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Analyzing your plate...</Text>
        </View>
      </View>
    );
  }

  // Detect if this was a text-based or photo-based scan
  const isTextBased = !scan?.imageUri;

  // Check if food was not detected:
  // 1. No ingredients list or empty (applies to both photo and text)
  // 2. Very low confidence < 0.2 (ONLY for text-based scans - photos use "best effort")
  // 3. Zero total calories (applies to both - likely unrecognized or invalid input)
  const hasNoIngredients = !scan || !scan.ingredientsList || scan.ingredientsList.length === 0;
  const hasLowConfidence = isTextBased && scan && scan.confidence < 0.2; // Only check for text scans
  const hasZeroCalories = scan && scan.totals && scan.totals.calories === 0;

  if (hasNoIngredients || hasLowConfidence || hasZeroCalories) {
    console.log('========================================');
    console.log('NO FOOD DETECTED - Showing error screen');
    console.log('Scan type:', isTextBased ? 'TEXT' : 'PHOTO');
    console.log('Reason:', {
      hasNoIngredients,
      hasLowConfidence: hasLowConfidence ? '(text-based only)' : 'N/A',
      hasZeroCalories,
      confidence: scan?.confidence,
      totalCalories: scan?.totals?.calories,
    });
    console.log('========================================');

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="search-outline" size={56} color={theme.colors.primary[400]} />
          </View>
          <Text style={styles.errorTitle}>No Food Detected</Text>
          <Text style={styles.errorSubtitle}>
            {isTextBased
              ? "We couldn't identify any food in your description. Try describing your meal with more detail, including specific ingredients and quantities."
              : "We couldn't identify any food in this image. Make sure your meal is clearly visible and well-lit, then try again."}
          </Text>
          <View style={styles.errorTips}>
            {isTextBased ? (
              <>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  <Text style={styles.tipText}>Include specific ingredients</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  <Text style={styles.tipText}>Mention quantities or portions</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  <Text style={styles.tipText}>Be clear about preparation methods</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  <Text style={styles.tipText}>Good lighting helps</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  <Text style={styles.tipText}>Get closer to your food</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  <Text style={styles.tipText}>Center your plate</Text>
                </View>
              </>
            )}
          </View>
          <Button variant="primary" onPress={() => router.back()} style={styles.retryButton}>
            Try Again
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={['#F9FAFB', '#FFFFFF']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={theme.colors.ink[900]} />
          </Pressable>
        </View>

        {/* Title Section with Thumbnail */}
        <View style={styles.titleSection}>
          {/* Thumbnail - show image or placeholder icon */}
          {scan.imageUri ? (
            <Pressable onPress={() => setShowFullImage(true)} style={styles.thumbnailButton}>
              <Image
                source={{ uri: scan.imageUri }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
            <View style={styles.placeholderIcon}>
              <Ionicons name="restaurant" size={32} color={theme.colors.primary[500]} />
            </View>
          )}

          {/* Title and Confidence */}
          <View style={styles.titleContent}>
            <Text style={styles.dishTitle}>{scan.dishTitle || 'Your Meal'}</Text>
            <View style={styles.confidenceBadge}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
              <Text style={styles.confidenceText}>
                {Math.round((scan.confidence || 0.8) * 100)}% confident
              </Text>
            </View>
          </View>
        </View>

        {/* Main Calorie Card */}
        <Card variant="elevated" padding="lg" style={styles.calorieCard}>
          <Text style={styles.cardLabel}>Total Calories</Text>
          <View style={styles.calorieRow}>
            <Text style={styles.calorieValue}>{formatNumber(scan.totals.calories)}</Text>
            <Text style={styles.calorieUnit}>kcal</Text>
          </View>

          {/* Macros Distribution */}
          <MacroDistributionChart
            protein={scan.totals.p}
            carbs={scan.totals.c}
            fat={scan.totals.f}
          />
        </Card>

        {/* Ingredients Section */}
        <View style={styles.ingredientsSection}>
          <Text style={styles.sectionTitle}>
            Detected Ingredients ({scan.ingredientsList.length})
          </Text>

          {scan.ingredientsList.map((ingredient, index) => (
            <Card
              key={`${ingredient.name}-${index}`}
              variant="elevated"
              padding="lg"
              style={styles.ingredientCard}
            >
              <View style={styles.ingredientHeader}>
                <View style={styles.ingredientIcon}>
                  {ingredient.imageUrl ? (
                    <Image
                      source={{ uri: ingredient.imageUrl }}
                      style={styles.ingredientImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="restaurant" size={20} color={theme.colors.primary[500]} />
                  )}
                </View>
                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  <Text style={styles.ingredientPortion}>
                    {ingredient.portion_text || `${ingredient.estimated_weight_g}g`}
                  </Text>
                  {ingredient.notes && (
                    <Text style={styles.ingredientNotes}>{ingredient.notes}</Text>
                  )}
                </View>
                <View style={styles.ingredientCalories}>
                  <Text style={styles.ingredientCalorieValue}>
                    {formatNumber(ingredient.calories)}
                  </Text>
                  <Text style={styles.ingredientCalorieUnit}>kcal</Text>
                </View>
              </View>

              {/* Ingredient Macros */}
              <View style={styles.ingredientMacros}>
                <View style={styles.ingredientMacro}>
                  <View style={[styles.macroDot, { backgroundColor: theme.colors.protein.main }]} />
                  <Text style={styles.macroText}>P {formatNumber(ingredient.macros.p)}g</Text>
                </View>
                <View style={styles.ingredientMacro}>
                  <View style={[styles.macroDot, { backgroundColor: theme.colors.carbs.main }]} />
                  <Text style={styles.macroText}>C {formatNumber(ingredient.macros.c)}g</Text>
                </View>
                <View style={styles.ingredientMacro}>
                  <View style={[styles.macroDot, { backgroundColor: theme.colors.fat.main }]} />
                  <Text style={styles.macroText}>F {formatNumber(ingredient.macros.f)}g</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          These are estimates for general wellness only, not medical advice.
        </Text>

        {/* Spacing for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomBar}>
        <LinearGradient
          colors={['transparent', 'rgba(249, 250, 251, 0.95)', '#F9FAFB']}
          style={styles.bottomGradient}
        />
        <View style={styles.bottomContent}>
          <Button
            variant="primary"
            onPress={handleAddToDay}
            disabled={isSaving}
            style={styles.addButton}
          >
            {isSaving ? 'Adding...' : 'Add to Today'}
          </Button>
        </View>
      </View>

      {/* Add Meal Modal */}
      <AddMealModal
        visible={showAddModal}
        baseCalories={scan.totals.calories}
        onClose={() => setShowAddModal(false)}
        onConfirm={handleConfirmAdd}
      />

      {/* Full Screen Image Modal */}
      {scan.imageUri && (
        <Modal
          visible={showFullImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFullImage(false)}
        >
          <Pressable
            style={styles.fullImageModal}
            onPress={() => setShowFullImage(false)}
          >
            <View style={styles.fullImageContainer}>
              <Image
                source={{ uri: scan.imageUri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              <Pressable
                onPress={() => setShowFullImage(false)}
                style={styles.fullImageCloseButton}
              >
                <Ionicons name="close-circle" size={40} color="#FFFFFF" />
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.ink[600],
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.ink[900],
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: theme.colors.ink[600],
    textAlign: 'center',
    lineHeight: 24,
  },
  errorTips: {
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.ink[700],
  },
  retryButton: {
    width: '100%',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  thumbnailButton: {
    flexShrink: 0,
  },
  thumbnailImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary[200],
  },
  placeholderIcon: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleContent: {
    flex: 1,
    justifyContent: 'center',
  },
  dishTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.ink[900],
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.success,
  },
  calorieCard: {
    marginBottom: 24,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink[500],
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  calorieValue: {
    fontSize: 64,
    fontWeight: '700',
    color: theme.colors.primary[500],
    letterSpacing: -2,
  },
  calorieUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.ink[500],
    marginLeft: 8,
  },
  ingredientsSection: {
    gap: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink[900],
    marginBottom: 4,
  },
  ingredientCard: {
    marginTop: 8,
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ingredientIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ingredientImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink[900],
    marginBottom: 4,
  },
  ingredientPortion: {
    fontSize: 14,
    color: theme.colors.ink[500],
  },
  ingredientNotes: {
    fontSize: 12,
    color: theme.colors.ink[400],
    marginTop: 2,
    fontStyle: 'italic',
  },
  ingredientCalories: {
    alignItems: 'flex-end',
  },
  ingredientCalorieValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.ink[900],
  },
  ingredientCalorieUnit: {
    fontSize: 12,
    color: theme.colors.ink[500],
  },
  ingredientMacros: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink[100],
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
  macroText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.ink[700],
  },
  disclaimer: {
    fontSize: 12,
    color: theme.colors.ink[400],
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
  },
  addButton: {
    width: '100%',
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
