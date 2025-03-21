import { Layout, NavigationProgress } from "@/components";
import { Toaster } from "@/components/ui/sonner";
import { DialogProvider } from "@/context";
import { useTheme } from "@/hooks";
import { cn, queries, ThemeEnum } from "@/lib";
import appCss from "@/styles/app.css?url";
import { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { LoadingBarContainer } from "react-top-loading-bar";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    beforeLoad: async ({ context }) => {
      await Promise.all([
        context.queryClient.ensureQueryData(queries.theme()),
        context.queryClient.ensureQueryData(queries.session()),
      ]);
    },
    head: () => ({
      meta: [
        {
          charSet: "utf8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: "ShadyFile",
        },
        {
          name: "apple-mobile-web-app-title",
          content: "ShadyFile",
        },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        {
          rel: "icon",
          type: "image/png",
          href: "/favicon-96x96.png",
          sizes: "96x96",
        },
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
        {
          rel: "shortcut icon",
          href: "/favicon.ico",
        },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png",
        },
        {
          rel: "manifest",
          href: "/site.webmanifest",
        },
      ],
    }),
    component: RootComponent,
  },
);

function RootComponent() {
  const { theme } = useTheme();

  return (
    <html lang="en" className={cn({ dark: theme === ThemeEnum.Enum.dark })}>
      <head>
        <HeadContent />
      </head>

      <body>
        <LoadingBarContainer props={{ color: "var(--foreground)" }}>
          <NavigationProgress />

          <DialogProvider>
            <Layout>
              <Outlet />
            </Layout>
          </DialogProvider>

          <Toaster closeButton />
        </LoadingBarContainer>
        <Scripts />
      </body>
    </html>
  );
}
