import { createContext, useContext, useEffect, useState } from "react";
import { watchUser } from "../services/authService.js";

const AuthContext = createContext({ user: undefined });

export function AuthProvider({ children }) {
  // undefined = in verifica, null = non autenticato
  const [user, setUser] = useState(undefined);
  useEffect(() => watchUser(setUser), []);
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** uid dell'utente autenticato (le schermate protette sono montate solo da autenticati). */
export const useUid = () => useContext(AuthContext).user?.uid;
