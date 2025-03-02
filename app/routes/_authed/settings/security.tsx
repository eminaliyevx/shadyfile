import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDialog, useSession } from "@/context";
import {
  ChangePasswordDialog,
  DeleteAccountDialog,
  ManageTwoFactorDialog,
} from "@/features/settings";
import { cn } from "@/lib";
import { createFileRoute } from "@tanstack/react-router";
import { LockKeyhole, UserRoundX } from "lucide-react";

export const Route = createFileRoute("/_authed/settings/security")({
  component: Security,
});

function Security() {
  const { session } = useSession();

  const { open } = useDialog();

  function openDeleteAccountDialog() {
    open({
      content: (dialog) => <DeleteAccountDialog dialog={dialog} />,
    });
  }

  function openChangePasswordDialog() {
    open({
      content: (dialog) => <ChangePasswordDialog dialog={dialog} />,
    });
  }

  function openManageTwoFactorDialog(enabled?: boolean) {
    open({
      content: (dialog) => (
        <ManageTwoFactorDialog dialog={dialog} enabled={enabled} />
      ),
    });
  }

  return (
    <>
      <h3 className="text-xl font-semibold">Security</h3>

      <Separator className="my-4" />

      <Button
        variant="outline"
        className="mb-4 h-20 w-full justify-between"
        onClick={openChangePasswordDialog}
      >
        <div className="grid text-left">
          <span className="text-lg">Change password</span>
          <span className="truncate text-sm text-muted-foreground">
            Use stronger passwords to protect your account.
          </span>
        </div>

        <LockKeyhole className="size-6" />
      </Button>

      <div
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mb-4 h-20 w-full justify-between",
        )}
      >
        <div className="grid text-left">
          <span className="text-lg">Two-factor authentication</span>
          <span className="truncate text-sm text-muted-foreground">
            Add an extra layer of security to your account.
          </span>
        </div>

        {session?.user.twoFactorEnabled ? (
          <Button
            variant="destructive"
            onClick={() => openManageTwoFactorDialog(false)}
          >
            Disable
          </Button>
        ) : (
          <Button onClick={() => openManageTwoFactorDialog(true)}>
            Enable
          </Button>
        )}
      </div>

      <Button
        variant="destructive"
        className="mb-4 h-20 w-full justify-between"
        onClick={openDeleteAccountDialog}
      >
        <div className="grid text-left text-wrap">
          <span className="text-lg">Delete account</span>
          <span className="truncate text-sm">
            Permanently delete your account.
          </span>
        </div>

        <UserRoundX className="size-6" />
      </Button>
    </>
  );
}
