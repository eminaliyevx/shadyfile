import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth, useSession } from "@/hooks";
import { getErrorMessage, selfOrUndefined } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_authed/settings/profile")({
  component: Profile,
});

const schema = z.object({
  name: z.string().min(1, {
    message: getErrorMessage("required", "Name"),
  }),
  username: z.string().min(1, {
    message: getErrorMessage("required", "Username"),
  }),
});

function Profile() {
  const { session, refetchSession } = useSession();

  const { authClient } = useAuth();

  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: session?.user.name,
      username: selfOrUndefined(session?.user.username),
    },
  });

  async function handleSubmit(data: z.infer<typeof schema>) {
    await authClient.updateUser(data, {
      onRequest: () => {
        setLoading(true);
      },
      onSuccess: () => {
        toast.success("Your profile has been updated");

        form.reset(data);

        refetchSession();
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
    <>
      <h3 className="text-xl font-semibold">Profile</h3>

      <Separator className="my-4" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>

                <FormControl>
                  <Input {...field} />
                </FormControl>

                <FormDescription>
                  This is your private display name. Refrain from using your
                  real name for maximum privacy.
                </FormDescription>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>

                <FormControl>
                  <Input {...field} />
                </FormControl>

                <FormDescription>
                  This is your public username. Refrain from using your real
                  name for maximum privacy.
                </FormDescription>

                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={!form.formState.isDirty}
          >
            Save
          </Button>
        </form>
      </Form>
    </>
  );
}
