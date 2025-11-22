import { View, Text, StyleSheet } from 'react-native';
import { Logo } from './Logo';
import { theme } from '@/config/theme';

interface Props {
  title: string;
  rightComponent?: React.ReactNode;
}

export function ScreenHeader({ title, rightComponent }: Props) {
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

const styles = StyleSheet.create({
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
    color: theme.colors.ink[900],
    letterSpacing: -0.5,
  },
});
