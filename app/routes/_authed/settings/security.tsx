import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDialog } from "@/context";
import { DeleteAccountDialog } from "@/features/settings";
import { createFileRoute } from "@tanstack/react-router";
import { LockKeyhole, UserRoundX } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_authed/settings/security")({
  component: Security,
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, {
      message: "Current password is required",
    }),
    newPassword: z.string().min(8, {
      message: "Password must be at least 8 characters",
    }),
    confirmPassword: z.string().min(1, {
      message: "Please confirm your password",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

function Security() {
  const { open } = useDialog();

  function openDeleteAccountDialog() {
    open({
      content: (dialog) => <DeleteAccountDialog dialog={dialog} />,
    });
  }

  return (
    <>
      <h3 className="text-xl font-semibold">Security</h3>

      <Separator className="my-4" />

      <Button variant="outline" className="mb-4 h-20 w-full justify-between">
        <div className="grid text-left">
          <span className="text-lg">Change password</span>
          <span className="truncate text-sm text-muted-foreground">
            Use stronger passwords to protect your account.
          </span>
        </div>

        <LockKeyhole className="size-6" />
      </Button>

      <Button
        variant="destructive"
        className="mb-4 h-20 w-full justify-between"
        onClick={openDeleteAccountDialog}
      >
        <div className="grid text-left text-wrap">
          <span className="text-lg">Delete account</span>
          <span className="truncate text-sm">
            Once you delete your account, you will not be able to access your
            account or any of your data.
          </span>
        </div>

        <UserRoundX className="size-6" />
      </Button>
    </>
  );
}
