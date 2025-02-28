import { Button } from "@/components/ui/button";
import { useTheme } from "@/context";
import { ThemeEnum } from "@/lib";
import { MoonIcon, SunIcon } from "lucide-react";

export function ThemeSwitcher() {
  const { isDark, switchTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() =>
        switchTheme(isDark ? ThemeEnum.enum.light : ThemeEnum.enum.dark)
      }
    >
      {isDark ? <SunIcon /> : <MoonIcon />}

      <span className="sr-only">Switch theme</span>
    </Button>
  );
}
