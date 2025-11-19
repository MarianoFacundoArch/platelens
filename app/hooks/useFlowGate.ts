import { useMemo } from 'react';

import { useAuthStore } from '@/store/auth';

export function useFlowGate() {
  const { status, onboardingStep } = useAuthStore();

  const needs = useMemo(() => {
    switch (status) {
      case 'logged-out':
        return 'auth';
      case 'needs-onboarding':
        return onboardingStep > 10 ? 'plan' : 'onboarding';
      case 'needs-paywall':
        return 'paywall';
      case 'active':
        return 'app';
      default:
        return 'loading';
    }
  }, [status, onboardingStep]);

  return needs;
}
