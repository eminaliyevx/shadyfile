import { type Nullable, type Theme, ThemeEnum } from "@/lib";
import { setTheme } from "@/lib/server/fn";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from "react";

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  switchTheme: (theme: Theme) => Promise<void>;
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
  theme,
  children,
}: PropsWithChildren<{ theme: Theme }>) {
  const router = useRouter();

  const setThemeFn = useServerFn(setTheme);

  const isDark = useMemo(() => theme === ThemeEnum.enum.dark, [theme]);

  async function switchTheme(theme: Theme) {
    await setThemeFn({ data: theme });

    await router.invalidate();
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, switchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
