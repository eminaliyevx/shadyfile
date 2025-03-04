import { getSession, getTheme } from "@/lib/server/fn";
import { queryOptions } from "@tanstack/react-query";

export const queries = {
  theme: () =>
    queryOptions({
      queryKey: ["theme"],
      queryFn: () => getTheme(),
      staleTime: Infinity,
    }),
  session: () =>
    queryOptions({
      queryKey: ["session"],
      queryFn: () => getSession(),
      staleTime: Infinity,
    }),
};
