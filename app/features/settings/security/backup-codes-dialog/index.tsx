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
import { useAuth, useCopyToClipboard } from "@/hooks";
import { getErrorMessage } from "@/lib";
import { getBackupCodes } from "@/lib/server/fn";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerFn } from "@tanstack/react-start";
import { Copy } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  password: z.string().min(1, {
    message: getErrorMessage("required", "Password"),
  }),
});

export function BackupCodesDialog() {
  const getBackupCodesFn = useServerFn(getBackupCodes);

  const { authClient } = useAuth();

  const { copy } = useCopyToClipboard();

  const [loading, setLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
    },
  });

  async function handleSubmit() {
    setLoading(true);

    try {
      const { backupCodes } = await getBackupCodesFn();

      setBackupCodes(backupCodes);
    } catch {
      toast.error("Backup codes could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function generateNewBackupCodes() {
    await authClient.twoFactor.generateBackupCodes(
      { password: form.getValues("password") },
      {
        onRequest: () => {
          setLoading(true);
        },
        onSuccess: async ({ data }) => {
          setBackupCodes(data.backupCodes);

          toast.success(
            "New backup codes generated. Old codes are no longer valid.",
          );
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

  function handleCopy() {
    copy(backupCodes.join("\n"))
      .then(() => {
        toast.success("Backup codes copied to clipboard.");
      })
      .catch(() => {
        toast.error("Backup codes could not be copied to clipboard.");
      });
  }

  return (
    <DialogContent>
      <DialogTitle>Backup codes</DialogTitle>

      <DialogDescription>
        Backup codes are the only way to recover your account if you lose your
        access. It is recommended to keep your backup codes in a safe spot. If
        you cannot find these codes, you will lose access to your account.
      </DialogDescription>

      {backupCodes.length === 0 && (
        <Form {...form}>
          <form id="backupCodesForm" onSubmit={form.handleSubmit(handleSubmit)}>
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
      )}

      {backupCodes.length > 0 && (
        <>
          <ul className="list-inside list-disc sm:columns-2">
            {backupCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>

          <Button className="justify-self-start" onClick={handleCopy}>
            <Copy /> Copy
          </Button>
        </>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>

        {backupCodes.length === 0 && (
          <Button type="submit" form="backupCodesForm" loading={loading}>
            Continue
          </Button>
        )}

        {backupCodes.length > 0 && (
          <Button loading={loading} onClick={generateNewBackupCodes}>
            Generate new backup codes
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
