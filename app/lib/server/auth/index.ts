import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor, username } from "better-auth/plugins";
import { env } from "../../env/server";
import { db } from "../db";
import {
  account,
  session,
  twoFactor as twoFactorSchema,
  user,
  verification,
} from "../db/schema";

export const auth = betterAuth({
  appName: env.APP_TITLE,
  emailAndPassword: { enabled: true },
  user: { deleteUser: { enabled: true } },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      twoFactor: twoFactorSchema,
    },
  }),
  plugins: [username(), twoFactor()],
});
