import { queries } from "@/lib";
import { useSuspenseQuery } from "@tanstack/react-query";

export const useSession = () => {
  const sessionQuery = useSuspenseQuery(queries.session());

  return {
    session: sessionQuery.data,
    isAuthenticated: !!sessionQuery.data,
    refetchSession: sessionQuery.refetch,
  };
};
