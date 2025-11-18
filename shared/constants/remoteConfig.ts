export type RemoteFlagKey =
  | 'paywall_layout_variant'
  | 'trial_length_days'
  | 'notification_cadence'
  | 'enable_free_mode'
  | 'ai_model_override';

export const defaultRemoteConfig: Record<RemoteFlagKey, string> = {
  paywall_layout_variant: 'focus-a',
  trial_length_days: '7',
  notification_cadence: 'aggressive',
  enable_free_mode: 'off',
  ai_model_override: 'gpt-4o-mini',
};
