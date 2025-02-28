import { DialogInstance } from "@/context";
import { authClient } from "@/hooks";
import { z } from "zod";
import { envSchema, themeSchema } from "../schemas";

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type Nullish<T> = T | null | undefined;

export type Env = z.infer<typeof envSchema>;

export type Theme = z.infer<typeof themeSchema>;

export type Session = typeof authClient.$Infer.Session;

export type DialogProps = {
  dialog: DialogInstance;
};
