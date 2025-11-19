import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, G } from 'react-native-svg';
import { BRAND } from '../../shared/constants/brand';

interface Props {
  variant?: 'compact' | 'full';
  showText?: boolean;
}

export function Logo({ variant = 'compact', showText = false }: Props) {
  // For compact: just icon, for full: icon + text
  const iconSize = variant === 'compact' ? 36 : 64;
  const scale = iconSize / 64;

  if (!showText) {
    // Icon only version
    return (
      <Svg width={iconSize} height={iconSize} viewBox="0 0 64 64">
        {/* Icon background (rounded square) */}
        <Rect x="0" y="0" width="64" height="64" rx="16" fill="#111827" />

        {/* Plate (simple line) */}
        <Rect x="12" y="36" width="40" height="8" rx="4" fill="#E5E7EB" />
        <Rect x="16" y="32" width="32" height="2" rx="1" fill="#9CA3AF" />

        {/* Lens (circle) */}
        <Circle cx="32" cy="24" r="10" fill="#0EA5E9" />
        <Circle cx="32" cy="24" r="5" fill="#F9FAFB" />

        {/* Small highlight on lens */}
        <Circle cx="28.5" cy="20.5" r="2" fill="#E0F2FE" />
      </Svg>
    );
  }

  // Full version with text
  const width = variant === 'compact' ? 140 : 280;
  const height = variant === 'compact' ? 40 : 80;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox="0 0 280 80">
        {/* Icon background (rounded square) */}
        <Rect x="8" y="8" width="64" height="64" rx="16" fill="#111827" />

        {/* Plate (simple line) */}
        <Rect x="20" y="44" width="40" height="8" rx="4" fill="#E5E7EB" />
        <Rect x="24" y="40" width="32" height="2" rx="1" fill="#9CA3AF" />

        {/* Lens (circle) */}
        <Circle cx="40" cy="32" r="10" fill="#0EA5E9" />
        <Circle cx="40" cy="32" r="5" fill="#F9FAFB" />

        {/* Small highlight on lens */}
        <Circle cx="36.5" cy="28.5" r="2" fill="#E0F2FE" />
      </Svg>

      {/* Text rendered separately for React Native */}
      <View style={[styles.textContainer, variant === 'compact' && styles.textCompact]}>
        <Text style={[styles.textPlate, variant === 'compact' && styles.textPlateCompact]}>
          Plate
        </Text>
        <Text style={[styles.textLens, variant === 'compact' && styles.textLensCompact]}>
          Lens
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  textCompact: {
    marginLeft: 4,
  },
  textPlate: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 0.56,
    color: '#0F172A',
  },
  textPlateCompact: {
    fontSize: 20,
    letterSpacing: 0.4,
  },
  textLens: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 0.56,
    color: '#0EA5E9',
  },
  textLensCompact: {
    fontSize: 20,
    letterSpacing: 0.4,
  },
});
