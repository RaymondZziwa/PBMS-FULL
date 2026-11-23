import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const KEY = "monk.theme";
const Ctx = createContext<{ theme: Theme; toggle: () => void; set: (t: Theme) => void }>({ theme: "light", toggle: () => {}, set: () => {} });

const initial = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(initial);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0B0F17" : "#1C2C57");
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return <Ctx.Provider value={{ theme, toggle, set: setTheme }}>{children}</Ctx.Provider>;
};

export const useTheme = () => useContext(Ctx);
