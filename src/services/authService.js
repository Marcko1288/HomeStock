import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase.js";

export const watchUser = (callback) => onAuthStateChanged(auth, callback);

export const signIn = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password);

export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());

export const logout = () => signOut(auth);

export function authErrorMessage(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-email":
      return "Email o password non corretti.";
    case "auth/too-many-requests":
      return "Troppi tentativi. Attendi qualche minuto e riprova.";
    case "auth/network-request-failed":
      return "Nessuna connessione. Per il primo accesso serve Internet.";
    default:
      return "Impossibile effettuare l'accesso. Riprova.";
  }
}
