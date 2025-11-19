import { Text, View } from 'react-native';

interface Props {
  count: number;
}

export function StreakChip({ count }: Props) {
  return (
    <View className="flex-row items-center rounded-full bg-accent/10 px-4 py-2">
      <Text className="text-accent font-semibold mr-2">🔥</Text>
      <Text className="text-ink-900 font-semibold">{count} day streak</Text>
    </View>
  );
}
