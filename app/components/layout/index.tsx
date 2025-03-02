import { PropsWithChildren } from "react";
import { Header } from "./header";

export function Layout({ children }: PropsWithChildren) {
  return (
    <div>
      <Header />

      <main>{children}</main>
    </div>
  );
}
