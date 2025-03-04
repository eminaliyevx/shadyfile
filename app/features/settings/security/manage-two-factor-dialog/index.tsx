import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/input";
import { useDialog } from "@/context";
import { useAuth, useSession } from "@/hooks";
import { DialogProps, getErrorMessage } from "@/lib";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { VerifyTotpDialog } from "../verify-totp-dialog";

type ManageTwoFactorDialogProps = DialogProps & {
  enabled?: boolean;
};

const schema = z.object({
  password: z.string().min(1, {
    message: getErrorMessage("required", "Password"),
  }),
});

export function ManageTwoFactorDialog({
  dialog,
  enabled,
}: ManageTwoFactorDialogProps) {
  const { authClient } = useAuth();

  const { refetchSession } = useSession();

  const { open, close } = useDialog();

  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
    },
  });

  async function handleSubmit({ password }: z.infer<typeof schema>) {
    if (enabled) {
      const { data } = await authClient.twoFactor.enable(
        { password },
        {
          onRequest: () => {
            setLoading(true);
          },
          onSuccess: () => {
            close(dialog.id);
          },
          onError: ({ error }) => {
            toast.error(error.message);
          },
          onResponse: () => {
            setLoading(false);
          },
        },
      );

      if (data) {
        open({
          content: (dialog) => (
            <VerifyTotpDialog totpUri={data.totpURI} dialog={dialog} />
          ),
        });
      }
    } else {
      await authClient.twoFactor.disable(
        { password },
        {
          onRequest: () => {
            setLoading(true);
          },
          onSuccess: () => {
            close(dialog.id);

            toast.success("Two-factor authentication disabled");

            refetchSession();
          },
          onError: ({ error }) => {
            toast.error(error.message);
          },
          onResponse: () => {
            setLoading(false);
          },
        },
      );
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {enabled
            ? "Enable two-factor authentication"
            : "Disable two-factor authentication"}
        </DialogTitle>

        <DialogDescription>
          {enabled
            ? "Set up two-factor authentication to protect your account."
            : "Disabling two-factor authentication will remove the extra layer of security from your account."}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          id="manageTwoFactorForm"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>

                <FormControl>
                  <PasswordInput {...field} />
                </FormControl>

                <FormDescription>
                  Please enter your password to confirm your identity.
                </FormDescription>

                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>

        <Button
          type="submit"
          form="manageTwoFactorForm"
          variant={enabled ? "default" : "destructive"}
          loading={loading}
        >
          {enabled ? "Enable 2FA" : "Disable 2FA"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
