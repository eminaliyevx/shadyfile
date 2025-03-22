import { Room, Theme, ThemeEnum, themeSchema } from "@/lib";
import { env } from "@/lib/env/server";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { randomUUID } from "crypto";
import twilio from "twilio";
import { auth } from "../auth";
import { assertRequestMiddleware, authMiddleware } from "../middleware";
import { redis } from "../redis";

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

export const createRoom = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const id = randomUUID();

    const room: Room = {
      host: {
        id: context.session.user.id,
        username: context.session.user.username as string,
      },
      users: {},
    };

    await redis.set(`room:${id}`, JSON.stringify(room));

    return id;
  });

export const getIceServers = createServerFn()
  .middleware([authMiddleware])
  .handler(async () => {
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    const { iceServers } = await client.tokens.create({ ttl: 86400 });

    return iceServers;
  });
