export type UserDoc = {
  uid: string;
  createdAt: string;
  authProvider: 'apple' | 'google';
  email?: string;
  applePrivateRelayEmail?: string;
  displayName?: string;
  photoUrl?: string;
  heightCm?: number;
  weightKg?: number;
  sex?: 'male' | 'female' | 'other';
  goalType?: 'cut' | 'bulk' | 'maintain';
  targetChangeKg?: number;
  dietaryPrefs?: string[];
  notificationOptIn?: boolean;
  streakCount: number;
  lastLogDate?: string;
  subscriptionStatus: 'none' | 'trialing' | 'active' | 'expired';
  rcAppUserId?: string;
  currency?: string;
};

export type LogDoc = {
  id: string;
  uid: string;
  dateISO: string;
  createdAt: string; // ISO timestamp
  dishTitle?: string;
  items: Array<{
    name: string;
    estimated_weight_g: number;
    calories: number;
    macros: { p: number; c: number; f: number };
    notes?: string;
  }>;
  totalCalories: number;
  macros: { p: number; c: number; f: number };
  source: { photoId?: string; method: 'camera' | 'text' };
  confidence: number;
  mealType?: 'breakfast' | 'brunch' | 'lunch' | 'snack' | 'dinner' | 'pre-workout' | 'post-workout';
  portionMultiplier?: number;
};

export type ScanDoc = {
  id: string;
  uid: string;
  createdAt: string;
  resultJSON: string;
  confidence: number;
  model: string;
  tokensUsed: number;
  costEstimateUsd: number;
};
