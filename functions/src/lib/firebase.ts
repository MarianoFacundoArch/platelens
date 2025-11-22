import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { env } from './env';

function resolveServiceAccount() {
  // ALWAYS prefer local .keys file first (for emulator development)
  const candidate = path.resolve(__dirname, '..', '..', '.keys', `${env.firebaseProjectId}-b6597c498be3.json`);
  if (fs.existsSync(candidate)) {
    console.log('[firebase] Found local service account, ignoring any env var override');
    return { path: candidate, fromEnv: false };
  }

  // Fallback to env var if local file not found
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { path: process.env.GOOGLE_APPLICATION_CREDENTIALS, fromEnv: true };
  }

  return null;
}

const serviceAccount = resolveServiceAccount();
const defaultAppOptions: admin.AppOptions = {
  storageBucket: `${env.firebaseProjectId}.firebasestorage.app`,
};

if (serviceAccount) {
  try {
    const credentials = JSON.parse(fs.readFileSync(serviceAccount.path, 'utf8'));
    console.log('[firebase] Loaded credentials:', {
      client_email: credentials.client_email,
      project_id: credentials.project_id,
      has_private_key: !!credentials.private_key,
      private_key_id: credentials.private_key_id,
    });
    defaultAppOptions.credential = admin.credential.cert(credentials);
    // Make sure downstream libs see the credential path if they expect it
    process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccount.path;
    console.log('[firebase] Using service account credentials from', serviceAccount.path, serviceAccount.fromEnv ? '(env)' : '(fallback file)');
  } catch (err) {
    console.warn('[firebase] Failed to load service account file', serviceAccount.path, err);
  }
} else {
  console.log('[firebase] Using application default credentials (no service account file found)');
}

if (!admin.apps.length) {
  admin.initializeApp(defaultAppOptions);
}

export const firestore = admin.firestore();
export const storage = admin.storage();
export const auth = admin.auth();
