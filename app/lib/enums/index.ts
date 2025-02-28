import { z } from "zod";

export const NodeEnvEnum = z.enum(["development", "staging", "production"]);

export const ThemeEnum = z.enum(["light", "dark"]);
