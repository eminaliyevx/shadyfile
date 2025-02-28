import { signOut } from "@/lib/server/fn";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/logout")({
  preload: false,
  loader: () => signOut(),
});
