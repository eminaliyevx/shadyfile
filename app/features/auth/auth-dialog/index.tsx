import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDialog } from "@/context";
import { useAuth } from "@/hooks";
import { DialogProps } from "@/lib";
import { env } from "@/lib/env/client";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, {
    message: getErrorMessage("required", "Username"),
  }),
  password: z.string().min(1, {
    message: getErrorMessage("required", "Password"),
  }),
  rememberMe: z.boolean().optional().default(false),
});

const signupSchema = z.object({
  username: z.string().min(3, {
    message: getErrorMessage("required", "Username"),
  }),
  name: z.string().min(3, {
    message: getErrorMessage("required", "Name"),
  }),
  password: z.string().min(8, {
    message: getErrorMessage("min", "Password", 8),
  }),
});

export function AuthDialog({ dialog }: DialogProps) {
  const router = useRouter();

  const { authClient } = useAuth();

  const { close } = useDialog();

  const [loading, setLoading] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
    },
  });

  async function handleLogin(data: z.infer<typeof loginSchema>) {
    await authClient.signIn.username(data, {
      onRequest: () => {
        setLoading(true);
      },
      onSuccess: async () => {
        router.navigate({ to: "/dashboard" });
      },
      onError: ({ error }) => {
        toast.error(error.message);
      },
      onResponse: () => {
        setLoading(false);

        close(dialog.id);
      },
    });
  }

  async function handleSignup(data: z.infer<typeof signupSchema>) {
    await authClient.signUp.email(
      {
        ...data,
        email: `${data.username}@${env.VITE_APP_DOMAIN}`,
      },
      {
        onRequest: () => {
          setLoading(true);
        },
        onSuccess: async () => {
          router.navigate({ to: "/dashboard" });
        },
        onError: ({ error }) => {
          toast.error(error.message);
        },
        onResponse: () => {
          setLoading(false);

          close(dialog.id);
        },
      },
    );
  }

  return (
    <DialogContent aria-describedby={undefined}>
      <DialogTitle className="mb-4 text-center">
        {env.VITE_APP_TITLE}
      </DialogTitle>

      <Tabs defaultValue="login">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>

          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Form {...loginForm}>
            <form
              onSubmit={loginForm.handleSubmit(handleLogin)}
              className="space-y-4"
            >
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>

                    <FormControl>
                      <Input {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>

                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>

                    <FormLabel>Remember me</FormLabel>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" loading={loading}>
                Login
              </Button>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="signup">
          <Form {...signupForm}>
            <form
              onSubmit={signupForm.handleSubmit(handleSignup)}
              className="space-y-4"
            >
              <FormField
                control={signupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>

                    <FormControl>
                      <Input {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={signupForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>

                    <FormControl>
                      <Input {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={signupForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>

                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" loading={loading}>
                Sign up
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}
