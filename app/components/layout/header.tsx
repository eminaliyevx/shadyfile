import { useDialog } from "@/context";
import { AuthDialog } from "@/features/auth";
import { useSession } from "@/hooks";
import { env } from "@/lib/env/client";
import { Link } from "@tanstack/react-router";
import { ThemeSwitcher } from "../theme-switcher";
import { Button } from "../ui/button";
import { UserDropdown } from "../user-dropdown";

export function Header() {
  const { isAuthenticated } = useSession();

  const { open } = useDialog();

  function openAuthDialog() {
    open({
      content: (dialog) => <AuthDialog dialog={dialog} />,
    });
  }

  return (
    <header className="sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-4 flex h-16 items-center justify-between">
        <Link to="/" className="text-2xl font-bold">
          {env.VITE_APP_TITLE}
        </Link>

        <div className="flex items-center gap-2">
          {isAuthenticated && <UserDropdown />}

          {!isAuthenticated && <Button onClick={openAuthDialog}>Login</Button>}

          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
