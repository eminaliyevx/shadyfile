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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useDialog } from "@/context/dialog";
import { useSession } from "@/hooks";
import { useAuth } from "@/hooks/use-auth";
import { DialogProps, getErrorMessage } from "@/lib";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type VerifyTotpDialogProps = DialogProps & {
  totpUri?: string;
};

const schema = z.object({
  code: z.string().min(6, {
    message: getErrorMessage("required", "TOTP code"),
  }),
  trustDevice: z.boolean().optional().default(false),
});

export function VerifyTotpDialog({ dialog, totpUri }: VerifyTotpDialogProps) {
  const router = useRouter();

  const { authClient } = useAuth();

  const { refetchSession } = useSession();

  const { close } = useDialog();

  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
    },
  });

  async function handleSubmit(data: z.infer<typeof schema>) {
    await authClient.twoFactor.verifyTotp(
      { code: data.code, trustDevice: !!totpUri || data.trustDevice },
      {
        onRequest: () => {
          setLoading(true);
        },
        onSuccess: async () => {
          close(dialog.id);

          if (totpUri) {
            toast.success("Two-factor authentication enabled");

            refetchSession();
          } else {
            await refetchSession();

            await router.navigate({ to: "/dashboard" });
          }
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
        <DialogTitle>Two-factor authentication</DialogTitle>

        <DialogDescription>
          {totpUri
            ? "Open your authenticator app and scan the QR code below to enable two-factor authentication."
            : "Enter the code from your authenticator app to verify your account."}
        </DialogDescription>
      </DialogHeader>

      {totpUri && (
        <div className="grid place-items-center bg-white p-4">
          <QRCodeSVG
            value={totpUri}
            width={undefined}
            height={undefined}
            className="max-w-64"
          />
        </div>
      )}

      <Form {...form}>
        <form
          id="verifyTotpForm"
          className="space-y-4"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem className="justify-center">
                <FormControl>
                  <InputOTP
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    containerClassName="justify-center"
                    {...field}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="size-10 sm:size-12" />
                      <InputOTPSlot index={1} className="size-10 sm:size-12" />
                      <InputOTPSlot index={2} className="size-10 sm:size-12" />
                      <InputOTPSlot index={3} className="size-10 sm:size-12" />
                      <InputOTPSlot index={4} className="size-10 sm:size-12" />
                      <InputOTPSlot index={5} className="size-10 sm:size-12" />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          {!totpUri && (
            <FormField
              control={form.control}
              name="trustDevice"
              render={({ field }) => (
                <FormItem className="flex items-center justify-center gap-2">
                  <FormControl>
                    <Checkbox
                      className="size-6"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>

                  <FormLabel className="text-base">Trust this device</FormLabel>
                </FormItem>
              )}
            />
          )}
        </form>
      </Form>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>

        <Button type="submit" form="verifyTotpForm" loading={loading}>
          Verify
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
