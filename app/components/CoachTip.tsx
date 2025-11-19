import { Text, View } from 'react-native';

export function CoachTip() {
  return (
    <View className="bg-white rounded-2xl p-4 border border-ink-100">
      <Text className="text-xs uppercase tracking-wide text-ink-500">Coach tip</Text>
      <Text className="text-base text-ink-900 mt-1">
        Snap within 5 seconds of plating to keep AI accuracy high.
      </Text>
    </View>
  );
}
