import { initializeApp } from "firebase/app";
import { browserLocalPersistence, connectAuthEmulator, indexedDBLocalPersistence, initializeAuth } from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(config);

// initializeAuth (invece di getAuth) evita di caricare il codice per popup/redirect, non usato.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});

export const storageBucket = config.storageBucket;

/** Solo sviluppo: VITE_USE_EMULATORS=true collega l'app agli emulatori locali (firebase emulators:start). */
export const emulatorsEnabled = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true";
if (emulatorsEnabled) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
