import { PropsWithChildren } from "react";
import { Header } from "./header";

export function Layout({ children }: PropsWithChildren) {
  return (
    <div>
      <Header />

      {children}
    </div>
  );
}
