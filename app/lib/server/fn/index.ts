import { ThemeEnum, themeSchema, type Theme } from "@/lib";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { auth } from "../auth";
import { assertRequestMiddleware, authMiddleware } from "../middleware";

export const getTheme = createServerFn({ method: "GET" }).handler(() => {
  const theme = themeSchema.parse(getCookie("theme"));

  setCookie("theme", theme, {
    maxAge: 30 * 24 * 60 * 60,
  });

  return theme;
});

export const setTheme = createServerFn({ method: "POST" })
  .validator((theme: Theme) => ThemeEnum.parse(theme))
  .handler(({ data }) => {
    setCookie("theme", data, {
      maxAge: 30 * 24 * 60 * 60,
    });
  });

export const getSession = createServerFn()
  .middleware([assertRequestMiddleware])
  .handler(({ context }) => {
    return auth.api.getSession({
      headers: context.request.headers,
    });
  });

export const signOut = createServerFn()
  .middleware([assertRequestMiddleware, authMiddleware])
  .handler(({ context }) => {
    return auth.api.signOut({ headers: context.request.headers });
  });

export const getBackupCodes = createServerFn()
  .middleware([authMiddleware])
  .handler(({ context }) => {
    return auth.api.viewBackupCodes({
      body: { userId: context.session.user.id },
    });
  });
