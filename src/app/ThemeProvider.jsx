import { createContext, useCallback, useContext, useEffect, useState } from "react";

const KEY = "homestock.theme";
const ThemeContext = createContext({ theme: "system", setTheme: () => {} });

function readTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    // La barra di stato/area superiore segue il tema scelto.
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    metas.forEach((m) => {
      if (theme === "system") {
        m.content = m.media.includes("dark") ? "#000000" : "#f2f2f7";
      } else {
        m.content = theme === "dark" ? "#000000" : "#f2f2f7";
      }
    });
  }, [theme]);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    try {
      if (t === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch {
      // archiviazione non disponibile: il tema vale solo per questa sessione
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
