// src/config/firebaseConfig.js (ou .ts)

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Descomente se/quando usar Storage
// import { getFunctions } from "firebase/functions"; // Descomente se/quando usar Functions

// Objeto de configuração lendo as variáveis de ambiente do Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID // Opcional, se você estiver usando o Google Analytics
};

// Verificação para garantir que as variáveis foram carregadas (opcional, mas útil para debug)
if (!firebaseConfig.apiKey) {
    console.error("Firebase config: apiKey is missing. Check your .env.local file and ensure it starts with VITE_");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services that you need
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
// const functions = getFunctions(app);

// Export as instâncias dos serviços para usar em outras partes da aplicação
export { app, auth, db , storage };