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
};

async function callScanApi(imageBase64: string): Promise<ScanResponse> {
  const res = await fetch(`${env.apiBaseUrl}/v1/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  });

  if (!res.ok) {
    throw new Error(`Scan failed with status ${res.status}`);
  }

  return (await res.json()) as ScanResponse;
}

export async function scanImage(base64: string): Promise<ScanResponse> {
  return await callScanApi(base64);
}

export async function scanMealByText(description: string): Promise<ScanResponse> {
  const res = await fetch(`${env.apiBaseUrl}/v1/scan-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });

  if (!res.ok) {
    throw new Error(`Text scan failed with status ${res.status}`);
  }

  return (await res.json()) as ScanResponse;
}
