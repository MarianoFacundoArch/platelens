import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { MealTypeSelector, autoDetectMealType, type MealType } from './MealTypeSelector';
import { PortionSelector } from './PortionSelector';
import { theme } from '@/config/theme';
import { useState, useEffect } from 'react';

interface AddMealModalProps {
  visible: boolean;
  baseCalories: number;
  onClose: () => void;
  onConfirm: (mealType: MealType, portionMultiplier: number) => void;
}

export function AddMealModal({
  visible,
  baseCalories,
  onClose,
  onConfirm,
}: AddMealModalProps) {
  const [mealType, setMealType] = useState<MealType>(autoDetectMealType());
  const [portionMultiplier, setPortionMultiplier] = useState(1.0);

  // Reset and auto-detect whenever modal becomes visible
  useEffect(() => {
    if (visible) {
      setMealType(autoDetectMealType());
      setPortionMultiplier(1.0);
    }
  }, [visible]);

  const handleConfirm = () => {
    onConfirm(mealType, portionMultiplier);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} height={480}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add to Today</Text>
          <Text style={styles.subtitle}>Choose when and how much you ate</Text>
        </View>

        {/* Scrollable Content - Fixed Height */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <MealTypeSelector selected={mealType} onSelect={setMealType} />
          <PortionSelector
            selected={portionMultiplier}
            onSelect={setPortionMultiplier}
            baseCalories={baseCalories}
          />
        </ScrollView>

        {/* Fixed Bottom Buttons - Always Visible */}
        <View style={styles.buttonContainer}>
          <Button variant="secondary" onPress={onClose} style={styles.button}>
            Cancel
          </Button>
          <Button variant="primary" onPress={handleConfirm} style={styles.button}>
            Add Meal
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ink[100],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.ink[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.ink[500],
  },
  scrollView: {
    maxHeight: 260,
    paddingTop: 16,
    paddingBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    flex: 1,
    minHeight: 48,
    maxWidth: 160,
  },
});
