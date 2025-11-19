import { Text, View } from 'react-native';

const cadence = [
  'Day 0: Welcome push within minutes',
  'Day 1: Morning + evening nudges',
  'Day 2: Escalate with streak framing',
  'Day 3: Final reminder before lock',
];

export function ReminderList() {
  return (
    <View className="bg-white rounded-3xl p-4 border border-ink-100 gap-3">
      {cadence.map((line) => (
        <View key={line} className="flex-row items-start gap-2">
          <Text className="text-accent">•</Text>
          <Text className="text-ink-700 flex-1">{line}</Text>
        </View>
      ))}
    </View>
  );
}
