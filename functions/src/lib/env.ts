type EnvShape = {
  OPENAI_API_KEY?: string;
  OPENAI_IMAGE_API_KEY?: string;
  AI_MODEL?: string;
  REVENUECAT_WEBHOOK_SECRET?: string;
  REVENUECAT_API_KEY?: string;
  EXPO_ACCESS_TOKEN?: string;
  BRANCH_KEY?: string;
  POSTHOG_KEY?: string;
  POSTHOG_HOST?: string;
  PLATELENS_FIREBASE_PROJECT_ID?: string;
};

const rawEnv: EnvShape = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_IMAGE_API_KEY: process.env.OPENAI_IMAGE_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  REVENUECAT_WEBHOOK_SECRET: process.env.REVENUECAT_WEBHOOK_SECRET,
  REVENUECAT_API_KEY: process.env.REVENUECAT_API_KEY,
  EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN,
  BRANCH_KEY: process.env.BRANCH_KEY,
  POSTHOG_KEY: process.env.POSTHOG_KEY,
  POSTHOG_HOST: process.env.POSTHOG_HOST,
  PLATELENS_FIREBASE_PROJECT_ID: process.env.PLATELENS_FIREBASE_PROJECT_ID,
};

export const env = {
  ...rawEnv,
  firebaseProjectId:
    rawEnv.PLATELENS_FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    'platelens-3333',
};

export function requireEnv(key: keyof EnvShape): string {
  const value = rawEnv[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}
