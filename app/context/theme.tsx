import { type Nullable, type Theme, ThemeEnum } from "@/lib";
import { setTheme } from "@/lib/server/fn";
import { useServerFn } from "@tanstack/react-start";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  switchTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<Nullable<ThemeContextType>>(null);

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}

export function ThemeProvider({
  theme: serverTheme,
  children,
}: PropsWithChildren<{ theme: Theme }>) {
  const setThemeServerFn = useServerFn(setTheme);

  const [clientTheme, setClientTheme] = useState<Theme>(serverTheme);

  const isDark = useMemo(
    () => clientTheme === ThemeEnum.enum.dark,
    [clientTheme],
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  function switchTheme(theme: Theme) {
    setClientTheme(theme);
    setThemeServerFn({ data: theme });
  }

  return (
    <ThemeContext.Provider value={{ theme: clientTheme, isDark, switchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
