import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';
import firebaseAppletConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: firebaseAppletConfig.projectId || "velora-e70db",
  appId: firebaseAppletConfig.appId || "1:36064826206:web:c4c6625b50597f821835cf",
  apiKey: firebaseAppletConfig.apiKey || "AIzaSyDcLc_SRgUiT4KRxqc5V9uvOKipm2SH3zk",
  authDomain: firebaseAppletConfig.authDomain || "velora-e70db.firebaseapp.com",
  storageBucket: firebaseAppletConfig.storageBucket || "velora-e70db.firebasestorage.app",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || "36064826206",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

const firestoreDbId = firebaseAppletConfig.firestoreDatabaseId || "(default)";
export const db = firestoreDbId && firestoreDbId !== "(default)"
  ? initializeFirestore(app, {}, firestoreDbId)
  : getFirestore(app);

export const storage = getStorage(app);

// Initialize Firebase Cloud Messaging (only works in supported browsers)
export const messaging = typeof window !== 'undefined' && 'Notification' in window ? getMessaging(app) : null;

/**
 * Strips all `undefined` values recursively from an object/array before writing to Firestore.
 * Firestore throws errors if any nested field contains `undefined`.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}


