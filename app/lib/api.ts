import { env } from '@/config/env';

// TODO: Replace with real Firebase Auth UID
// For now, use a mock UID for testing
const MOCK_UID = 'test-user-123';

export async function saveMealToFirestore(data: {
  dishTitle: string;
  ingredientsList: any[];
  totals: { calories: number; p: number; c: number; f: number };
  confidence: number;
  photoId?: string;
  imageStoragePath?: string;
  mealType?: string;
  portionMultiplier?: number;
}) {
  const response = await fetch(`${env.apiBaseUrl}/v1/meals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid: MOCK_UID,
      ...data,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save meal: ${response.status}`);
  }

  return response.json();
}

export async function getMeals(dateISO?: string) {
  const params = new URLSearchParams({ uid: MOCK_UID });
  if (dateISO) {
    params.append('dateISO', dateISO);
  }

  const response = await fetch(`${env.apiBaseUrl}/v1/meals?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get meals: ${response.status}`);
  }

  return response.json();
}

export const getTodaysMeals = getMeals;

export async function getMealHistory(params: { startDate?: string; endDate?: string }) {
  const searchParams = new URLSearchParams({ uid: MOCK_UID });

  if (params.startDate) {
    searchParams.append('startDate', params.startDate);
  }
  if (params.endDate) {
    searchParams.append('endDate', params.endDate);
  }

  const response = await fetch(`${env.apiBaseUrl}/v1/meals/history?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get meal history: ${response.status}`);
  }

  return response.json();
}

export async function deleteMeal(mealId: string) {
  const response = await fetch(`${env.apiBaseUrl}/v1/meals`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid: MOCK_UID,
      mealId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete meal: ${response.status}`);
  }

  return response.json();
}

export async function updateMeal(
  mealId: string,
  updates: {
    portionMultiplier?: number;
    mealType?: string;
    imageStoragePath?: string;
  }
) {
  const requestBody = {
    uid: MOCK_UID,
    mealId,
    ...updates,
  };

  console.log('[updateMeal API] Sending PATCH request to:', `${env.apiBaseUrl}/v1/meals`);
  console.log('[updateMeal API] Request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${env.apiBaseUrl}/v1/meals`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log('[updateMeal API] Response status:', response.status);
  console.log('[updateMeal API] Response ok:', response.ok);

  if (!response.ok) {
    let errorMessage = 'Failed to save changes';

    switch (response.status) {
      case 404:
        errorMessage = 'Meal not found. It may have been deleted.';
        break;
      case 403:
        errorMessage = 'You do not have permission to edit this meal.';
        break;
      case 400:
        errorMessage = 'Invalid changes. Please check your inputs.';
        break;
      case 500:
      case 502:
      case 503:
        errorMessage = 'Server error. Please try again later.';
        break;
      default:
        errorMessage = `Failed to save changes (Error ${response.status})`;
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export async function initScan() {
  const response = await fetch(`${env.apiBaseUrl}/v1/scan/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uid: MOCK_UID }),
  });

  if (!response.ok) {
    throw new Error(`Failed to init scan: ${response.status}`);
  }

  return response.json();
}

export async function queueScan(payload: {
  scanId?: string;
  dateISO?: string;
  textDescription?: string;
  source?: 'camera' | 'text';
}) {
  const response = await fetch(`${env.apiBaseUrl}/v1/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid: MOCK_UID,
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to queue scan: ${response.status}`);
  }

  return response.json();
}

export async function getScanStatus(scanId: string) {
  const response = await fetch(`${env.apiBaseUrl}/v1/scan/${scanId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get scan status: ${response.status}`);
  }

  return response.json();
}

// Analytics endpoints
export async function getAnalyticsTrends(params: { startDate: string; endDate: string }) {
  const searchParams = new URLSearchParams({
    uid: MOCK_UID,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  const response = await fetch(`${env.apiBaseUrl}/v1/analytics/trends?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get analytics trends: ${response.status}`);
  }

  return response.json();
}

export async function getAnalyticsStreaks() {
  const searchParams = new URLSearchParams({ uid: MOCK_UID });

  const response = await fetch(`${env.apiBaseUrl}/v1/analytics/streaks?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get analytics streaks: ${response.status}`);
  }

  return response.json();
}

export async function getAnalyticsMonthlySummary(year: number, month: number) {
  const searchParams = new URLSearchParams({
    uid: MOCK_UID,
    year: year.toString(),
    month: month.toString(),
  });

  const response = await fetch(`${env.apiBaseUrl}/v1/analytics/monthly?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get monthly summary: ${response.status}`);
  }

  return response.json();
}
