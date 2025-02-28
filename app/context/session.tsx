import type { Nullable, Session } from "@/lib";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from "react";

type SessionContextType = {
  session: Nullable<Session>;
  isAuthenticated: boolean;
};

const SessionContext = createContext<Nullable<SessionContextType>>(null);

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return context;
}

export function SessionProvider({
  session,
  children,
}: PropsWithChildren<{ session: Nullable<Session> }>) {
  const isAuthenticated = useMemo(() => !!session, [session]);

  return (
    <SessionContext.Provider value={{ session, isAuthenticated }}>
      {children}
    </SessionContext.Provider>
  );
}
