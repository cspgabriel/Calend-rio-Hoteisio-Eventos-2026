import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Configuração fornecida pelo usuário.
// Em produção, considere mover para variáveis de ambiente Vite (VITE_FIREBASE_*)
// e ler daqui para facilitar a troca de projeto/credenciais.
const firebaseConfig = {
  apiKey: 'AIzaSyC9xlWLtHkkvnIsowDjLTiAJG9AzepBRC4',
  authDomain: 'centralas-f05b9.firebaseapp.com',
  projectId: 'centralas-f05b9',
  storageBucket: 'centralas-f05b9.firebasestorage.app',
  messagingSenderId: '1008296122812',
  appId: '1:1008296122812:web:7c61ca7a4ae6d285cef3b9',
  measurementId: 'G-HM8J0WZRNC',
  databaseURL: 'https://centralas-f05b9-default-rtdb.firebaseio.com'
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);

