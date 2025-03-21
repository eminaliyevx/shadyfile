import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLoadingBar } from "react-top-loading-bar";

export function NavigationProgress() {
  const router = useRouter();

  const { start, complete } = useLoadingBar({
    height: 2,
    waitingTime: 200,
  });

  useEffect(() => {
    const unsubOnBeforeNavigate = router.subscribe("onBeforeNavigate", () => {
      start();
    });

    const unsubOnLoad = router.subscribe("onLoad", () => {
      complete();
    });

    return () => {
      unsubOnBeforeNavigate();
      unsubOnLoad();
    };
  });

  return <></>;
}
