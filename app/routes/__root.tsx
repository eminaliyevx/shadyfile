import { Layout, NavigationProgress } from "@/components";
import { Toaster } from "@/components/ui/sonner";
import { DialogProvider, SessionProvider, ThemeProvider } from "@/context";
import { cn, ThemeEnum } from "@/lib";
import { getSession, getTheme } from "@/lib/server/fn";
import appCss from "@/styles/app.css?url";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { LoadingBarContainer } from "react-top-loading-bar";

export const Route = createRootRoute({
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
  beforeLoad: async () => {
    try {
      const [theme, session] = await Promise.all([getTheme(), getSession()]);

      return {
        theme,
        session,
        isAuthenticated: !!session,
      };
    } catch {
      return {
        theme: ThemeEnum.Enum.dark,
        session: null,
        isAuthenticated: false,
      };
    }
  },
});

function RootComponent() {
  const { theme, session } = Route.useRouteContext();

  return (
    <html lang="en" className={cn({ dark: theme === ThemeEnum.Enum.dark })}>
      <head>
        <HeadContent />
      </head>

      <body>
        <ThemeProvider theme={theme}>
          <SessionProvider session={session}>
            <LoadingBarContainer props={{ color: "var(--foreground)" }}>
              <NavigationProgress>
                <DialogProvider>
                  <Layout>
                    <Outlet />
                  </Layout>
                </DialogProvider>

                <Toaster closeButton />
              </NavigationProgress>
            </LoadingBarContainer>
          </SessionProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
