import { useRouter } from "@tanstack/react-router";
import { PropsWithChildren, useEffect } from "react";
import { useLoadingBar } from "react-top-loading-bar";

export function NavigationProgress({ children }: PropsWithChildren) {
  const router = useRouter();

  const { start, complete } = useLoadingBar({
    height: 2,
    waitingTime: 200,
  });

  useEffect(() => {
    const unsubOnBeforeNavigate = router.subscribe("onBeforeNavigate", () => {
      start();
    });

    const unsubOnRendered = router.subscribe("onRendered", () => {
      complete();
    });

    return () => {
      unsubOnBeforeNavigate();
      unsubOnRendered();
    };
  });

  return <>{children}</>;
}
