import { signOut } from "@/lib/server/fn";
import { queries } from "@/queries";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/logout")({
  preload: false,
  loader: async ({ context }) => {
    await signOut();

    await context.queryClient.refetchQueries({
      queryKey: queries.session().queryKey,
    });

    throw redirect({ href: "/" });
  },
});
