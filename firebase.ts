// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAfuuX2h8CmIjJVG_XgWqYSc24ARPkImfo",
  authDomain: "landingpages-hoteis.firebaseapp.com",
  projectId: "landingpages-hoteis",
  storageBucket: "landingpages-hoteis.firebasestorage.app",
  messagingSenderId: "1091287955221",
  appId: "1:1091287955221:web:5cace65fc05641308d5b1c",
  measurementId: "G-4FNWQ00TX9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);