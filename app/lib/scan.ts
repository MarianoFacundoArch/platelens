import { env } from '@/config/env';

export type Ingredient = {
  name: string;
  estimated_weight_g: number;
  portion_text: string;
  notes: string;
  calories: number;
  macros: { p: number; c: number; f: number };
  imageUrl?: string;
  id?: string;
};

export type ScanResponse = {
  dishTitle: string;
  ingredientsList: Ingredient[];
  totals: { calories: number; p: number; c: number; f: number };
  confidence: number;
  imageUri?: string;
  timestamp?: number;
  mealId?: string;
  scanId?: string;
};

export type ScanInitResponse = {
  scanId: string;
  storagePath: string;
  uploadUrl: string;
  uploadMethod: 'PUT' | 'POST';
  uploadHeaders: Record<string, string>;
  expiresAt: string;
};

export type QueueScanResponse = {
  scanId: string;
  mealId: string;
  status: string;
  dateISO: string;
};

export type ScanStatusResponse = {
  scanId: string;
  status: string;
  error?: string;
  mealId?: string | null;
  meal?: any;
};

export async function initPhotoScan(): Promise<ScanInitResponse> {
  const res = await fetch(`${env.apiBaseUrl}/v1/scan/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: 'test-user-123' }),
  });

  if (!res.ok) {
    throw new Error(`Init scan failed with status ${res.status}`);
  }

  return (await res.json()) as ScanInitResponse;
}

export async function queuePhotoScan(scanId: string, dateISO?: string): Promise<QueueScanResponse> {
  const res = await fetch(`${env.apiBaseUrl}/v1/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: 'test-user-123', scanId, dateISO, source: 'camera' }),
  });

  if (!res.ok) {
    throw new Error(`Queue scan failed with status ${res.status}`);
  }

  return (await res.json()) as QueueScanResponse;
}

export async function queueTextScan(description: string, dateISO?: string): Promise<QueueScanResponse> {
  const res = await fetch(`${env.apiBaseUrl}/v1/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: 'test-user-123',
      dateISO,
      textDescription: description,
      source: 'text',
    }),
  });

  if (!res.ok) {
    throw new Error(`Text scan failed with status ${res.status}`);
  }

  return (await res.json()) as QueueScanResponse;
}

export async function getScanStatus(scanId: string) {
  const res = await fetch(`${env.apiBaseUrl}/v1/scan/${scanId}`);
  if (!res.ok) {
    throw new Error(`Scan status failed with status ${res.status}`);
  }
  return res.json();
}

export async function waitForScanCompletion(
  scanId: string,
  { attempts = 40, intervalMs = 2000 } = {}
): Promise<ScanResponse & { mealId?: string }> {
  for (let i = 0; i < attempts; i += 1) {
    const status: ScanStatusResponse = await getScanStatus(scanId);

    if (status.status === 'done' && status.meal) {
      const meal = status.meal;
      const totals = {
        calories: meal.totalCalories ?? meal.macros?.calories ?? 0,
        p: meal.macros?.p ?? 0,
        c: meal.macros?.c ?? 0,
        f: meal.macros?.f ?? 0,
      };
      return {
        mealId: status.mealId ?? meal.id,
        dishTitle: meal.dishTitle || 'Meal',
        ingredientsList: meal.ingredientsList || [],
        totals,
        confidence: meal.confidence ?? 0.8,
        imageUri: meal.imageUrl,
        timestamp: Date.now(),
        scanId,
      };
    }

    if (status.status === 'failed' || status.status === 'cancelled') {
      throw new Error(status.error || 'Scan failed');
    }

    // Wait before next poll
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Scan did not complete in time');
}
