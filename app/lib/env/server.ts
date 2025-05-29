import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { NodeEnvEnum } from "../enums";

export const env = createEnv({
  server: {
    NODE_ENV: NodeEnvEnum.default(NodeEnvEnum.enum.development),
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PASSWORD: z.string().min(1),
    POSTGRES_DB: z.string().min(1),
    POSTGRES_PORT: z.coerce.number(),
    DATABASE_URL: z.string().url(),
    REDIS_HOST: z.string(),
    REDIS_PORT: z.coerce.number(),
    REDIS_PASSWORD: z.string(),
    APP_TITLE: z.string().min(1),
    APP_PORT: z.coerce.number(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_TRUSTED_ORIGIN: z.string().url(),
    TWILIO_ACCOUNT_SID: z.string().min(1),
    TWILIO_AUTH_TOKEN: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
