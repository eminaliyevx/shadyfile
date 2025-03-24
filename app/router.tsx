import { QueryClient } from "@tanstack/react-query";
import {
  createRouter as createTanStackRouter,
  Navigate,
} from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  });

  const router = routerWithQueryClient(
    createTanStackRouter({
      routeTree,
      scrollRestoration: true,
      context: {
        queryClient,
      },
      defaultPendingMs: 0,
      defaultPendingMinMs: 0,
      notFoundMode: "root",
      defaultNotFoundComponent: () => <Navigate to="/" />,
    }),
    queryClient,
  );

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
