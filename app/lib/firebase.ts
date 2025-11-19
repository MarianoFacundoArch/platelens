import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
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
    const firestoreHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
    const authHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';

    connectFirestoreEmulator(db, firestoreHost, 8080);
    connectAuthEmulator(auth, `http://${authHost}:9099`, { disableWarnings: true });

    console.log('[Firebase] Connected to emulators');
  } catch (error) {
    console.warn('[Firebase] Failed to connect to emulators:', error);
  }
}
