import Peer from "simple-peer";
import { z } from "zod";
import { NodeEnvEnum, ThemeEnum, WebSocketMessageErrorEnum } from "../enums";

export const envSchema = z.object({
  NODE_ENV: NodeEnvEnum.default(NodeEnvEnum.enum.development),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_PORT: z.coerce.number(),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(1),
});

export const themeSchema = ThemeEnum.default(ThemeEnum.enum.dark).catch(
  ThemeEnum.enum.dark,
);

export const webSocketMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("connected"),
    data: z.null(),
  }),
  z.object({
    type: z.literal("join-room"),
    data: z.object({
      id: z.string().min(1),
      username: z.string().min(1),
      roomId: z.string().uuid(),
    }),
  }),
  z.object({
    type: z.literal("room-joined"),
    data: z.object({
      id: z.string().min(1),
      username: z.string().min(1),
      roomId: z.string().uuid(),
      isHost: z.boolean(),
    }),
  }),
  z.object({
    type: z.literal("peer-joined"),
    data: z.object({
      roomId: z.string().uuid(),
      id: z.string().min(1),
      username: z.string().min(1),
      isHost: z.boolean(),
    }),
  }),
  z.object({
    type: z.literal("peer-left"),
    data: z.object({
      roomId: z.string().uuid(),
      id: z.string().min(1),
      username: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal("peer-signal"),
    data: z.object({
      signal: z.any().transform((value: Peer.SignalData) => value),
      roomId: z.string().uuid(),
      from: z.string().min(1),
      to: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal("error"),
    data: z
      .object({
        message: WebSocketMessageErrorEnum.nullish(),
      })
      .nullable(),
  }),
]);

export const roomUserSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
});

export const roomSchema = z.object({
  host: roomUserSchema.optional(),
  users: z.record(z.string().min(1), roomUserSchema),
});

export const fileChunkSchema = z.object({
  fileId: z.string().uuid(),
  chunkIndex: z.coerce.number(),
  totalChunks: z.coerce.number(),
  meta: z.string().nullish(),
});

export const fileRedisSchema = z.object({
  meta: z.string().min(1),
  totalChunks: z.coerce.number(),
});

export const fileMetaSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.coerce.number(),
  fileType: z.string().nullish(),
  totalChunks: z.coerce.number(),
});
