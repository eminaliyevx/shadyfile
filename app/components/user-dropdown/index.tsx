import { useDialog, useSession } from "@/context";
import { LogoutAlertDialog } from "@/features/auth";
import { getInitialsFromName, selfOrUndefined } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const ANONYMOUS_INITIALS = "A";

export function UserDropdown() {
  const { session } = useSession();

  const { open } = useDialog();

  function openLogoutDialog() {
    open({
      isAlert: true,
      content: () => <LogoutAlertDialog />,
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-10">
          <AvatarImage src={selfOrUndefined(session?.user.image)} />

          <AvatarFallback>
            {session?.user.name
              ? getInitialsFromName(session.user.name)
              : ANONYMOUS_INITIALS}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-50">
        <DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <Avatar className="size-10">
              <AvatarImage
                src={selfOrUndefined(session?.user.image)}
                alt={session?.user.name}
              />

              <AvatarFallback>
                {session?.user.name
                  ? getInitialsFromName(session.user.name)
                  : ANONYMOUS_INITIALS}
              </AvatarFallback>
            </Avatar>

            <div className="grid flex-1">
              <span className="font-semibold">{session?.user.name}</span>
              <span className="text-xs">@{session?.user.username}</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={openLogoutDialog}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
