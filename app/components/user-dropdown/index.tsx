import { useDialog } from "@/context";
import { LogoutAlertDialog } from "@/features/auth";
import { CreateRoomDialog } from "@/features/room";
import { useSession } from "@/hooks";
import { getInitialsFromName, selfOrUndefined } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Lock, LogOut, Settings, Share2 } from "lucide-react";
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

  function openCreateRoomDialog() {
    open({
      isAlert: true,
      content: (dialog) => <CreateRoomDialog dialog={dialog} />,
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-10 cursor-pointer">
          <AvatarImage src={selfOrUndefined(session?.user.image)} />

          <AvatarFallback>
            {session?.user.name
              ? getInitialsFromName(session.user.name).toLocaleUpperCase()
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
                  ? getInitialsFromName(session.user.name).toLocaleUpperCase()
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
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={openCreateRoomDialog}
          >
            <Share2 />
            Create room
          </DropdownMenuItem>

          <DropdownMenuItem className="cursor-pointer" asChild>
            <Link to="/share">
              <Lock />
              Share files
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem className="cursor-pointer" asChild>
            <Link to="/settings">
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="cursor-pointer" onClick={openLogoutDialog}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
