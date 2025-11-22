import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Logo } from './Logo';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  title: string;
  rightComponent?: React.ReactNode;
}

export function ScreenHeader({ title, rightComponent }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Logo variant="compact" />
          <Text style={styles.title}>{title}</Text>
        </View>
        {rightComponent && (
          <View style={styles.headerRight}>
            {rightComponent}
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    headerContainer: {
      marginBottom: 24,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text.primary,
      letterSpacing: -0.5,
    },
  });
}
