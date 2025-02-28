import { z } from "zod";
import { NodeEnvEnum, ThemeEnum } from "../enums";

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
