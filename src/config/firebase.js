import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration — سيتم تحديثه ببيانات المشروع الفعلية
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'PLACEHOLDER',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'PLACEHOLDER',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'PLACEHOLDER',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'PLACEHOLDER',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'PLACEHOLDER',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'PLACEHOLDER',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
