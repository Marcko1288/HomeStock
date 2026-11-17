// Preferenze utente in users/{uid}/settings/app (documento opzionale, aggiunto in v3).
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./db.js";

const settingsDoc = (uid) => doc(db, "users", uid, "settings", "app");

export function subscribeSettings(uid, onData, onError) {
  return onSnapshot(settingsDoc(uid), (snap) => onData(snap.exists() ? snap.data() : {}), onError);
}

export const saveSettings = (uid, patch) => setDoc(settingsDoc(uid), patch, { merge: true });
