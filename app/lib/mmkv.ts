import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'scan:';
const memoryCache = new Map<string, string>();

export type CachedScan = {
  dishTitle: string;
  ingredientsList: Array<{
    name: string;
    estimated_weight_g: number;
    portion_text: string;
    notes: string;
    calories: number;
    macros: { p: number; c: number; f: number };
    imageUrl?: string;
    id?: string;
  }>;
  totals: { calories: number; p: number; c: number; f: number };
  confidence: number;
  imageUri?: string;
  timestamp?: number;
  mealId?: string;
  scanId?: string;
  status?: string;
};

export function setCachedScan(hash: string, payload: string) {
  const key = `${PREFIX}${hash}`;
  memoryCache.set(key, payload);

  // Persist in the background; ignore failures in Expo Go.
  AsyncStorage.setItem(key, payload).catch((error) => {
    console.warn('setCachedScan storage error', error);
  });
}

export function getCachedScan(hash: string): CachedScan | null {
  const key = `${PREFIX}${hash}`;
  const inMemory = memoryCache.get(key);
  if (inMemory) {
    return JSON.parse(inMemory);
  }

  // Hydrate memory cache for future reads; return null synchronously now.
  AsyncStorage.getItem(key)
    .then((value) => {
      if (value != null) {
        memoryCache.set(key, value);
      }
    })
    .catch((error) => {
      console.warn('getCachedScan storage error', error);
    });

  return null;
}
