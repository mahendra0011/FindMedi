import { createContext, useContext, useState, useEffect, useCallback } from "react";

const THEMES = [
  { id: "default", label: "Default Dark", icon: "🌙", colors: "bg-blue-900/20" },
  { id: "lavender", label: "Lavender", icon: "💜", colors: "bg-purple-900/20" },
  { id: "sky", label: "Sky Blue", icon: "🌤️", colors: "bg-sky-900/20" },
  { id: "mint", label: "Mint Green", icon: "🌿", colors: "bg-emerald-900/20" },
  { id: "soft", label: "Soft Light", icon: "☀️", colors: "bg-amber-100/40" },
];

const STORAGE_KEY = "mindsupport_theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "default";
  });

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    document.documentElement.dataset.theme = newTheme === "default" ? "" : newTheme;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || "default";
    document.documentElement.dataset.theme = saved === "default" ? "" : saved;
    setThemeState(saved);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}

export { THEMES };
