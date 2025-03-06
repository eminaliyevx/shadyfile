import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDialog } from "@/context";
import {
  BackupCodesDialog,
  ChangePasswordDialog,
  DeleteAccountDialog,
  ManageTwoFactorDialog,
} from "@/features/settings";
import { useSession } from "@/hooks";
import { cn } from "@/lib";
import { createFileRoute } from "@tanstack/react-router";
import { LockKeyhole, RectangleEllipsis, UserRoundX } from "lucide-react";
import { toast } from "sonner";

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

  function openBackupCodesDialog() {
    if (!session?.user.twoFactorEnabled) {
      return toast.error("Two-factor authentication must be enabled first.");
    }

    open({
      content: () => <BackupCodesDialog />,
    });
  }

  return (
    <>
      <h3 className="text-xl font-semibold">Security</h3>

      <Separator className="my-4" />

      <Button
        variant="outline"
        className="mb-4 h-auto w-full justify-between"
        onClick={openChangePasswordDialog}
      >
        <div className="grid text-left text-balance">
          <span className="text-lg">Change password</span>
          <span className="text-sm text-muted-foreground">
            Use stronger passwords to protect your account.
          </span>
        </div>

        <LockKeyhole className="size-6" />
      </Button>

      <div
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mb-4 h-auto w-full flex-wrap justify-between",
        )}
      >
        <div className="grid text-left text-balance">
          <span className="text-lg">Two-factor authentication</span>
          <span className="text-sm text-muted-foreground">
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
        variant="outline"
        className="mb-4 h-auto w-full justify-between"
        onClick={openBackupCodesDialog}
      >
        <div className="grid text-left text-balance">
          <span className="text-lg">Backup codes (experimental)</span>
          <span className="text-sm text-muted-foreground">
            Backup codes are the only way to recover your account if you lose
            your access.
          </span>
        </div>

        <RectangleEllipsis className="size-6" />
      </Button>

      <Button
        variant="destructive"
        className="mb-4 h-auto w-full justify-between"
        onClick={openDeleteAccountDialog}
      >
        <div className="grid text-left text-balance">
          <span className="text-lg">Delete account</span>
          <span className="text-sm">Permanently delete your account.</span>
        </div>

        <UserRoundX className="size-6" />
      </Button>
    </>
  );
}
