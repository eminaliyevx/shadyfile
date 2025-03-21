import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
    ],
    resolve: {
      alias: {
        "simple-peer": "simple-peer/simplepeer.min.js",
      },
    },
  },
  server: {
    experimental: {
      websocket: true,
    },
  },
}).then((config) => {
  return config.addRouter({
    name: "websocket",
    type: "http",
    handler: "./app/ws.ts",
    target: "server",
    base: "/_ws",
  });
});
