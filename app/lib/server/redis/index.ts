import { consola } from "consola";
import Redis from "ioredis";
import { env } from "../../env/server";

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
});

redis.on("connect", () => {
  consola.success("Connected to Redis");
});

redis.on("error", (error) => {
  consola.error("Redis connection error", error);
});
