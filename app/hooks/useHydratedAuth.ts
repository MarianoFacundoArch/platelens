import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore, AuthStatus, type AuthState } from '@/store/auth';

export function useHydratedAuth() {
  const setStatus = useAuthStore((state: AuthState) => state.setStatus);
  useEffect(() => {
    AsyncStorage.getItem('platelens:authStatus').then((value) => {
      if (!value) {
        setStatus('logged-out');
        return;
      }
      setStatus(value as AuthStatus);
    });
  }, [setStatus]);
}
