import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  projectId: "nodal-cedar-hr6mz",
  appId: "1:520287456947:web:6a8e119a12d99122612ac6",
  apiKey: "AIzaSyCB-7qQ6BvHiGIc7_FvePCF1JvEyJGtorY",
  authDomain: "nodal-cedar-hr6mz.firebaseapp.com",
  storageBucket: "nodal-cedar-hr6mz.firebasestorage.app",
  messagingSenderId: "520287456947",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = initializeFirestore(app, {}, "ai-studio-77e100df-5c5f-44bb-b274-826cb4fc53ae");
export const storage = getStorage(app);

// Initialize Firebase Cloud Messaging (only works in supported browsers)
export const messaging = typeof window !== 'undefined' && 'Notification' in window ? getMessaging(app) : null;

