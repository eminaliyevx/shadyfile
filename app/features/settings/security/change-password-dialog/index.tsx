import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/input";
import { useDialog } from "@/context";
import { useAuth } from "@/hooks";
import { DialogProps, getErrorMessage } from "@/lib";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z
  .object({
    currentPassword: z.string().min(1, {
      message: getErrorMessage("required", "Current password"),
    }),
    newPassword: z.string().min(8, {
      message: getErrorMessage("min", "New password", 8),
    }),
    confirmPassword: z.string().min(1, {
      message: "Please confirm your password",
    }),
    revokeOtherSessions: z.boolean().optional().default(true),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function ChangePasswordDialog({ dialog }: DialogProps) {
  const router = useRouter();

  const { authClient } = useAuth();

  const { close } = useDialog();

  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      revokeOtherSessions: true,
    },
  });

  async function handleSubmit(data: z.infer<typeof schema>) {
    await authClient.changePassword(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: data.revokeOtherSessions,
      },
      {
        onRequest: () => {
          setLoading(true);
        },
        onSuccess: () => {
          close(dialog.id);

          toast.success("Your password has been changed");

          router.invalidate();
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

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Change password</DialogTitle>
      </DialogHeader>

      <DialogDescription>
        Use a strong password to protect your account.
      </DialogDescription>

      <Form {...form}>
        <form
          id="changePasswordForm"
          className="space-y-4"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current password</FormLabel>

                <FormControl>
                  <PasswordInput {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>

                <FormControl>
                  <PasswordInput {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>

                <FormControl>
                  <PasswordInput {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="revokeOtherSessions"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>

                <FormLabel>Log out from other sessions</FormLabel>
              </FormItem>
            )}
          />
        </form>
      </Form>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>

        <Button type="submit" form="changePasswordForm" loading={loading}>
          Change password
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
