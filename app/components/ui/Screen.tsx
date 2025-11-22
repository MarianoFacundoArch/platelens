import { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  background?: string;
}

export function Screen({ children, scroll = true, background }: Props) {
  const { colors } = useTheme();
  const bgColor = background ?? colors.background.subtle;
  if (scroll) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>{children}</ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <View style={{ flex: 1, padding: 20, gap: 16 }}>{children}</View>
    </SafeAreaView>
  );
}
