import { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  background?: string;
}

export function Screen({ children, scroll = true, background = '#F5F7F8' }: Props) {
  if (scroll) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>{children}</ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
      <View style={{ flex: 1, padding: 20, gap: 16 }}>{children}</View>
    </SafeAreaView>
  );
}
