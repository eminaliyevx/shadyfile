import { createMiddleware } from "@tanstack/react-start";
import { createError, getWebRequest } from "@tanstack/react-start/server";
import { auth } from "../auth";

export const assertRequestMiddleware = createMiddleware().server(
  async ({ next }) => {
    const request = getWebRequest();

    if (!request) {
      throw createError({
        status: 500,
        message: "Request must be provided",
      });
    }

    return next({ context: { request } });
  },
);

export const authMiddleware = createMiddleware()
  .middleware([assertRequestMiddleware])
  .server(async ({ context, next }) => {
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });

    if (!session) {
      throw createError({
        status: 401,
        message: "Unauthorized",
      });
    }

    return next({ context: { session } });
  });
