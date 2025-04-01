import {
  fileChunkSchema,
  fileRedisSchema,
  Room,
  safeJsonParse,
  Theme,
  themeSchema,
} from "@/lib";
import { env } from "@/lib/env/server";
import { createServerFn } from "@tanstack/react-start";
import {
  createError,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";
import { consola } from "consola";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import twilio from "twilio";
import { z } from "zod";
import { auth } from "../auth";
import { assertRequestMiddleware, authMiddleware } from "../middleware";
import { redis } from "../redis";

const UPLOADS_DIR = "./uploads";

const FILE_EXPIRY_TIME = 60 * 60 * 24;

export const getTheme = createServerFn({ method: "GET" }).handler(() => {
  const theme = themeSchema.parse(getCookie("theme"));

  setCookie("theme", theme, {
    maxAge: 30 * 24 * 60 * 60,
  });

  return theme;
});

export const setTheme = createServerFn({ method: "POST" })
  .validator((theme: Theme) => themeSchema.parse(theme))
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

export const updatePassword = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { password: string }) =>
    z.object({ password: z.string().min(8) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    try {
      const ctx = await auth.$context;

      const hash = await ctx.password.hash(data.password);

      await ctx.internalAdapter.updatePassword(context.session.user.id, hash);

      return { success: true };
    } catch {
      throw createError({
        status: 400,
        message: "Failed to recover your account",
      });
    }
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

export const uploadFileChunk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw createError({
        status: 400,
        message: "Bad request",
      });
    }

    const chunkData = data.get("chunkData");

    if (!(chunkData instanceof File)) {
      throw createError({
        status: 400,
        message: "Bad request",
      });
    }

    const fileChunk = fileChunkSchema.safeParse({
      fileId: data.get("fileId"),
      chunkIndex: data.get("chunkIndex"),
      totalChunks: data.get("totalChunks"),
      meta: data.get("meta"),
    });

    if (!fileChunk.success) {
      throw createError({
        status: 400,
        message: "Bad request",
      });
    }

    return { ...fileChunk.data, chunkData };
  })
  .handler(async ({ data }) => {
    if (data.meta) {
      await redis.set(
        `file:${data.fileId}`,
        JSON.stringify({ meta: data.meta, totalChunks: data.totalChunks }),
        "EX",
        FILE_EXPIRY_TIME,
      );
    }

    try {
      const buffer = await data.chunkData.arrayBuffer();

      if (!existsSync(`${UPLOADS_DIR}/${data.fileId}`)) {
        await mkdir(`${UPLOADS_DIR}/${data.fileId}`, { recursive: true });
      }

      await writeFile(
        `${UPLOADS_DIR}/${data.fileId}/${data.chunkIndex}.bin`,
        new Uint8Array(buffer),
      );

      return {
        success: true,
      };
    } catch (error) {
      consola.error("Failed to upload file chunk:", error);

      return {
        success: false,
      };
    }
  });

export const getFileMeta = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: string) => z.string().uuid().parse(data))
  .handler(async ({ data: fileId }) => {
    try {
      const file = fileRedisSchema.parse(
        safeJsonParse(await redis.get(`file:${fileId}`)),
      );

      if (!file) {
        throw createError({
          status: 404,
          message: "File not found",
        });
      }

      return file.meta;
    } catch {
      throw createError({
        status: 404,
        message: "File not found",
      });
    }
  });

export const downloadFile = createServerFn({ method: "GET", response: "raw" })
  .middleware([authMiddleware])
  .validator((data: { fileId: string; fileSize: number }) =>
    z.object({ fileId: z.string().uuid(), fileSize: z.number() }).parse(data),
  )
  .handler(async ({ data: { fileId, fileSize }, signal }) => {
    try {
      const file = fileRedisSchema.parse(
        safeJsonParse(await redis.get(`file:${fileId}`)),
      );

      if (!file) {
        throw createError({
          status: 404,
          message: "File not found",
        });
      }

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for (let i = 0; i < file.totalChunks; i++) {
              const buffer = await readFile(
                `${UPLOADS_DIR}/${fileId}/${i}.bin`,
              );

              controller.enqueue(buffer);
            }

            controller.close();
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }

          signal.addEventListener("abort", () => {
            controller.close();
          });
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": fileSize.toString(),
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch {
      throw createError({
        status: 404,
        message: "File not found",
      });
    }
  });

export const downloadFileChunk = createServerFn({
  method: "GET",
  response: "raw",
})
  .middleware([authMiddleware])
  .validator((data: { fileId: string; fileSize: number; chunkIndex: number }) =>
    z
      .object({
        fileId: z.string().uuid(),
        fileSize: z.number(),
        chunkIndex: z.number(),
      })
      .parse(data),
  )
  .handler(async ({ data: { fileId, chunkIndex }, signal }) => {
    try {
      const file = fileRedisSchema.parse(
        safeJsonParse(await redis.get(`file:${fileId}`)),
      );

      if (!file) {
        throw createError({
          status: 404,
          message: "File not found",
        });
      }

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const buffer = await readFile(
              `${UPLOADS_DIR}/${fileId}/${chunkIndex}.bin`,
            );

            controller.enqueue(buffer);

            controller.close();
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }

          signal.addEventListener("abort", () => {
            controller.close();
          });
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch {
      throw createError({
        status: 404,
        message: "File not found",
      });
    }
  });
