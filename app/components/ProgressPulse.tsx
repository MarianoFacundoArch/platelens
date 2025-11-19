import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

const steps = ['Analyzing meals', 'Setting daily target', 'Preparing your plan'];

export function ProgressPulse() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % steps.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <View className="items-center">
      <View className="h-32 w-32 rounded-full border-4 border-accent items-center justify-center">
        <View className="h-24 w-24 rounded-full bg-accent/10 items-center justify-center">
          <Text className="text-accent font-semibold">{Math.round(((index + 1) / steps.length) * 100)}%</Text>
        </View>
      </View>
      <Text className="text-base mt-6 text-ink-700">{steps[index]}</Text>
    </View>
  );
}
