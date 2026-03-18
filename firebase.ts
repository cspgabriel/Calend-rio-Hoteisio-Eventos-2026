import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Default config for the eventos-d16c9 project.
// Values can be overridden at build time via VITE_FIREBASE_* environment variables.
// Firebase client credentials are public by design; security is enforced by Firestore Rules.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyCwYnp8E73Or7osEouOlioBaPSGlkN6Ytc',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'eventos-d16c9.firebaseapp.com',
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL       || 'https://eventos-d16c9.firebaseio.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'eventos-d16c9',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'eventos-d16c9.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '271681547398',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:271681547398:web:1806de7516daa7bf9b3507',
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || 'G-2MMXC40XS4',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
