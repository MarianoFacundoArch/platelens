import { useMemo } from 'react';

import { pricing } from '@/config/pricing';

export function usePaywallOptions() {
  return useMemo(
    () => [
      {
        id: 'annual',
        title: `Annual • ${pricing.annual.trialDays}-day free trial`,
        price: `$${pricing.annual.price}/yr`,
        subline: `${pricing.annual.perMonth}/mo effective`,
        default: true,
      },
      {
        id: 'monthly',
        title: 'Monthly',
        price: `$${pricing.monthly.price}/mo`,
        subline: 'Pause anytime. No trial.',
        default: false,
      },
    ],
    [],
  );
}
