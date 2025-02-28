import { useDialog, useSession } from "@/context";
import { LogoutAlertDialog } from "@/features/auth";
import { getInitialsFromName, selfOrUndefined } from "@/lib/utils";
import { LogOutIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

      <DropdownMenuContent>
        <DropdownMenuItem onClick={openLogoutDialog}>
          <LogOutIcon className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
