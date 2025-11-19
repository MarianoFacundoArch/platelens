import { Text, View } from 'react-native';

interface Props {
  targetCalories: number;
  goalDate: string;
}

export function PlanStats({ targetCalories, goalDate }: Props) {
  return (
    <View className="bg-white rounded-3xl p-6 border border-ink-100 gap-4">
      <View>
        <Text className="text-sm text-ink-500">Daily target</Text>
        <Text className="text-3xl font-bold text-ink-900">{targetCalories} kcal</Text>
      </View>
      <View>
        <Text className="text-sm text-ink-500">Projected goal date</Text>
        <Text className="text-xl font-semibold text-ink-900">{goalDate}</Text>
      </View>
      <Text className="text-sm text-ink-500">
        We keep this updated as you log. Edit anytime in Profile.
      </Text>
    </View>
  );
}
