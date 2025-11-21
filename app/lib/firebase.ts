import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { Platform } from 'react-native';

import { env } from '@/config/env';

const app = getApps().length ? getApps()[0] : initializeApp(env.firebase);

export const firebaseApp = app;
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Connect to emulators in development (only on first initialization)
if (__DEV__ && getApps().length === 1) {
  try {
    const host =
      env.emulatorHost ||
      (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1');
    const firestoreHost = host;
    const authHost = host;
    const storageHost = host;

    connectFirestoreEmulator(db, firestoreHost, 8080);
    connectAuthEmulator(auth, `http://${authHost}:9099`, { disableWarnings: true });
    if (!env.emulatorStorageDisabled) {
      connectStorageEmulator(storage, storageHost, 9199);
    }

    console.log('[Firebase] Connected to emulators', {
      host,
      firestore: `${firestoreHost}:8080`,
      auth: `${authHost}:9099`,
      storage: env.emulatorStorageDisabled ? 'DISABLED (using prod)' : `${storageHost}:9199`,
      emulatorStorageDisabled: env.emulatorStorageDisabled,
    });
  } catch (error) {
    console.warn('[Firebase] Failed to connect to emulators:', error);
  }
}
