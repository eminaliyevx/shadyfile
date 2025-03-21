import { queries } from "@/lib";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(
      queries.session(),
    );

    if (!session) {
      throw redirect({ href: "/" });
    }
  },
});
