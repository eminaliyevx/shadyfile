import { ThemeEnum, type Theme } from "@/lib";
import { setTheme } from "@/lib/server/fn";
import { queries } from "@/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

export const useTheme = () => {
  const themeQuery = useSuspenseQuery(queries.theme());

  const setThemeFn = useServerFn(setTheme);

  const [clientTheme, setClientTheme] = useState<Theme>(themeQuery.data);

  const isDark = useMemo(
    () => clientTheme === ThemeEnum.enum.dark,
    [clientTheme],
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  function switchTheme(theme: Theme) {
    setClientTheme(theme);
    setThemeFn({ data: theme });
  }

  return { theme: clientTheme, isDark, switchTheme };
};
