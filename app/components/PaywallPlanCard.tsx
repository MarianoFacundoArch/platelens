import { Text, View } from 'react-native';

interface Props {
  title: string;
  price: string;
  subline: string;
  selected?: boolean;
}

export function PaywallPlanCard({ title, price, subline, selected }: Props) {
  return (
    <View className={`p-4 rounded-2xl border ${selected ? 'border-accent bg-background-card' : 'border-ink-100 bg-background-subtle'}`}>
      <Text className="text-base font-semibold text-ink-900">{title}</Text>
      <Text className="text-3xl font-bold text-ink-900 mt-1">{price}</Text>
      <Text className="text-sm text-ink-500 mt-2">{subline}</Text>
    </View>
  );
}
