import { View, Text, Image, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  variant?: 'compact' | 'full';
  showText?: boolean;
}

export function Logo({ variant = 'compact', showText = false }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // For compact: just icon, for full: icon + text
  const iconSize = variant === 'compact' ? 36 : 64;

  if (!showText) {
    // Icon only version
    return (
      <Image
        source={require('../assets/images/icon.png')}
        style={{ width: iconSize, height: iconSize }}
        resizeMode="contain"
      />
    );
  }

  // Full version with text
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/icon.png')}
        style={{ width: iconSize, height: iconSize }}
        resizeMode="contain"
      />

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

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
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
      color: colors.text.primary,
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
      color: colors.primary[400],
    },
    textLensCompact: {
      fontSize: 20,
      letterSpacing: 0.4,
    },
  });
}
