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
import { Input } from "@/components/ui/input";
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
  code: z.string().min(1, {
    message: getErrorMessage("required", "Backup code"),
  }),
});

export function VerifyBackupCodeDialog({ dialog }: DialogProps) {
  const router = useRouter();

  const { refetchSession } = useSession();

  const { authClient } = useAuth();

  const { close } = useDialog();

  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
    },
  });

  async function handleSubmit(data: z.infer<typeof schema>) {
    await authClient.twoFactor.verifyBackupCode(data, {
      onRequest: () => {
        setLoading(true);
      },
      onSuccess: async () => {
        close(dialog.id);

        toast.success("Your account has been recovered");

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
      <DialogTitle>Recover with backup code</DialogTitle>

      <DialogDescription>
        Once used, a backup code will no longer be valid.
      </DialogDescription>

      <Form {...form}>
        <form
          id="verifyBackupCodeForm"
          onSubmit={form.handleSubmit(handleSubmit)}
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
        </form>
      </Form>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>

        <Button type="submit" form="verifyBackupCodeForm" loading={loading}>
          Verify
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
