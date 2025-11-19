import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';

interface Props {
  question: string;
  placeholder: string;
  onSubmit: (value: string) => void;
  defaultValue?: string;
}

export function OnboardingStepCard({ question, placeholder, onSubmit, defaultValue }: Props) {
  const [value, setValue] = useState(defaultValue ?? '');
  return (
    <View className="bg-white p-6 rounded-3xl border border-ink-100 gap-4">
      <Text className="text-lg font-semibold text-ink-900">{question}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        onChangeText={setValue}
        className="border border-ink-100 rounded-2xl px-4 py-3"
      />
      <PrimaryButton
        label="Save"
        onPress={() => {
          onSubmit(value);
          setValue('');
        }}
      />
    </View>
  );
}
