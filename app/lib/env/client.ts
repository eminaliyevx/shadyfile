import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_APP_TITLE: z.string().min(1),
    VITE_APP_DOMAIN: z.string().min(1),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
