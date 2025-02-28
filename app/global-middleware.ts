import { registerGlobalMiddleware } from "@tanstack/react-start";
import { assertRequestMiddleware } from "./lib/server/middleware";

registerGlobalMiddleware({
  middleware: [assertRequestMiddleware],
});
