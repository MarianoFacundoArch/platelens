import { ActivityIndicator, Pressable, Text } from 'react-native';

import { Brand } from '@/config/brand';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export function PrimaryButton({ label, onPress, variant = 'primary', loading }: Props) {
  const base =
    variant === 'primary'
      ? 'bg-accent'
      : 'bg-white border border-ink-100 dark:bg-transparent dark:border-ink-500';

  return (
    <Pressable
      className={`rounded-xl py-4 px-4 items-center ${base}`}
      accessibilityRole="button"
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Brand.accent} />
      ) : (
        <Text
          className={`font-semibold text-base ${variant === 'primary' ? 'text-white' : 'text-ink-900'}`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
