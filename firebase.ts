import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 🔐 Configure these values in your .env file (Vite uses VITE_ prefix)
// Example .env:
// VITE_FIREBASE_API_KEY=…
// VITE_FIREBASE_AUTH_DOMAIN=…
// VITE_FIREBASE_PROJECT_ID=…
// VITE_FIREBASE_STORAGE_BUCKET=…
// VITE_FIREBASE_MESSAGING_SENDER_ID=…
// VITE_FIREBASE_APP_ID=…

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Vite will inline env vars, so we can do a quick check
const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let db = null as ReturnType<typeof getFirestore> | null;

if (hasFirebaseConfig) {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
} else {
  // eslint-disable-next-line no-console
  console.warn('Firebase is not configured. Create a .env file with VITE_FIREBASE_... variables to enable Firestore.');
}

export { db };
