import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const DEFAULT_TARGETS: UserTargets = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
};

const STORAGE_KEY = '@platelens:user_targets';

export function useUserTargets() {
  const [targets, setTargets] = useState<UserTargets>(DEFAULT_TARGETS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTargets();
  }, []);

  const loadTargets = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTargets(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load user targets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTargets = async (newTargets: Partial<UserTargets>) => {
    const updated = { ...targets, ...newTargets };
    setTargets(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save user targets:', error);
    }
  };

  return { targets, updateTargets, isLoading };
}
