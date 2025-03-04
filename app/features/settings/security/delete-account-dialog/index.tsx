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
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  password: z.string().min(1, {
    message: getErrorMessage("required", "Password"),
  }),
});

export function DeleteAccountDialog({ dialog }: DialogProps) {
  const router = useRouter();

  const { refetchSession } = useSession();

  const { authClient } = useAuth();

  const { close } = useDialog();

  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
    },
  });

  async function handleSubmit(data: z.infer<typeof schema>) {
    await authClient.deleteUser(data, {
      onRequest: () => {
        setLoading(true);
      },
      onSuccess: async () => {
        close(dialog.id);

        toast.success("Your account has been deleted");

        await refetchSession();

        await router.navigate({ to: "/" });
      },
      onError: ({ error }) => {
        toast.error(error.message);
      },
      onResponse: () => {
        setLoading(false);
      },
    });
  }

  return (
    <DialogContent>
      <DialogTitle>Are you sure you want to delete your account?</DialogTitle>

      <DialogDescription>
        Deleting your account will permanently remove all your data from our
        servers. This action is irreversible.
      </DialogDescription>

      <Form {...form}>
        <form id="deleteAccountForm" onSubmit={form.handleSubmit(handleSubmit)}>
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
          form="deleteAccountForm"
          variant="destructive"
          loading={loading}
        >
          Delete account
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
