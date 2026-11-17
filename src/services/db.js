// Firestore viene inizializzato solo dopo il login (la pagina di accesso resta leggera).
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { app, emulatorsEnabled } from "./firebase.js";

function createFirestore() {
  try {
    // Cache persistente su IndexedDB: l'app si apre e funziona anche senza rete,
    // le scritture vengono accodate e sincronizzate al ritorno della connessione.
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return initializeFirestore(app, { localCache: memoryLocalCache() });
  }
}

export const db = createFirestore();

if (emulatorsEnabled) connectFirestoreEmulator(db, "127.0.0.1", 8080);
