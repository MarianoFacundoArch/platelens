import { View, Text, StyleSheet } from 'react-native';
import { useRef } from 'react';
import Slider from '@react-native-community/slider';
import { theme } from '@/config/theme';
import { useHaptics } from '@/hooks/useHaptics';

const PORTION_VALUES = [0.25, 0.5, 0.75, 1.0, 2.0, 4.0, 8.0];
const PORTION_LABELS: Record<number, string> = {
  0.25: '1/4',
  0.5: '1/2',
  0.75: '3/4',
  1.0: 'Full',
  2.0: '2x',
  4.0: '4x',
  8.0: '8x',
};

interface PortionSelectorProps {
  selected: number;
  onSelect: (multiplier: number) => void;
  baseCalories: number;
}

export function PortionSelector({ selected, onSelect, baseCalories }: PortionSelectorProps) {
  const { selection } = useHaptics();
  const previousIndexRef = useRef<number>(PORTION_VALUES.indexOf(selected));
  const displayCalories = (baseCalories * selected).toFixed(1);
  const sliderIndex = PORTION_VALUES.indexOf(selected);

  const handleSliderChange = (value: number) => {
    const index = Math.round(value);

    // Only trigger haptic if the index actually changed (discrete step)
    if (index !== previousIndexRef.current) {
      selection();
      previousIndexRef.current = index;
    }

    onSelect(PORTION_VALUES[index]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Portion Size</Text>
        <View style={styles.valueContainer}>
          <Text style={styles.portionLabel}>{PORTION_LABELS[selected]}</Text>
          <Text style={styles.caloriePreview}>{displayCalories} kcal</Text>
        </View>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={PORTION_VALUES.length - 1}
        step={1}
        value={sliderIndex}
        onValueChange={handleSliderChange}
        minimumTrackTintColor={theme.colors.primary[500]}
        maximumTrackTintColor={theme.colors.ink[200]}
        thumbTintColor={theme.colors.primary[500]}
      />

      <View style={styles.labels}>
        {PORTION_VALUES.map((value) => (
          <Text
            key={value}
            style={[
              styles.labelText,
              selected === value && styles.labelTextActive,
            ]}
          >
            {PORTION_LABELS[value]}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.ink[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  portionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
  caloriePreview: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.ink[400],
  },
  labelTextActive: {
    color: theme.colors.primary[600],
    fontWeight: '700',
  },
});
