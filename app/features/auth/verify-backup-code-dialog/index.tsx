import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input, PasswordInput } from "@/components/ui/input";
import { useDialog } from "@/context";
import { useAuth, useSession } from "@/hooks";
import { getErrorMessage } from "@/lib";
import { updatePassword } from "@/lib/server/fn";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BetterFetchError } from "better-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(1, {
    message: getErrorMessage("required", "Backup code"),
  }),
  password: z.string().min(8, {
    message: getErrorMessage("min", "Password", 8),
  }),
});

export function VerifyBackupCodeDialog() {
  const router = useRouter();

  const { refetchSession } = useSession();

  const { authClient } = useAuth();

  const updatePasswordFn = useServerFn(updatePassword);

  const { closeAll } = useDialog();

  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      password: "",
    },
  });

  async function handleSubmit(data: z.infer<typeof schema>) {
    await authClient.twoFactor.verifyBackupCode(data, {
      onRequest: () => {
        setLoading(true);
      },
      onSuccess: async () => {
        try {
          await updatePasswordFn({ data });

          await refetchSession();

          await router.navigate({ to: "/" });

          setLoading(false);

          toast.success("Your account has been recovered");
        } catch (error: unknown) {
          toast.error((error as BetterFetchError).message);
        } finally {
          closeAll();
        }
      },
      onError: ({ error }) => {
        setLoading(false);

        toast.error(error.message);
      },
    });
  }

  return (
    <DialogContent>
      <DialogTitle>Recover with backup code</DialogTitle>

      <DialogDescription>
        Once used, a backup code will no longer be valid.
      </DialogDescription>

      <Form {...form}>
        <form
          id="verifyBackupCodeForm"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Backup code</FormLabel>

                <FormControl>
                  <Input {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>

                <FormControl>
                  <PasswordInput {...field} />
                </FormControl>

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

        <Button type="submit" form="verifyBackupCodeForm" loading={loading}>
          Recover
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
