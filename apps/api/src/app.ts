import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import rateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";

import { registerAuthModule } from "./modules/auth/http/register.js";
import { registerKohModule } from "./modules/koh/http/register.js";
import { registerTournamentModule } from "./modules/tournament/http/register.js";
import { mountSocketHub } from "./realtime/socketHub.js";
import { logger } from "./lib/logger.js";

export async function createApp() {
  const loggerLevel = process.env.API_LOG_LEVEL ?? "info";
  const server = Fastify({
    logger: {
      level: loggerLevel
    }
  });
  logger.info("createApp: starting Fastify server", { loggerLevel });
  await server.register(cors, {
    origin: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-organizer-token", "Authorization", "x-public-token"]
  });
  await server.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await server.register(websocket);
  if (process.env.REDIS_URL) {
    logger.info("createApp: connecting Redis", { url: process.env.REDIS_URL });
    server.decorate("redis", new Redis(process.env.REDIS_URL));
  } else {
    logger.warn("createApp: REDIS_URL not set, realtime pub/sub disabled");
    server.decorate("redis", undefined);
  }
  server.decorate("subscriptions", mountSocketHub(server));
  logger.info("createApp: registering routes");
  await registerAuthModule(server);
  await registerTournamentModule(server);
  await registerKohModule(server);
  const { registerMePlayerRoutes } = await import("./routes/mePlayers.js");
  await registerMePlayerRoutes(server);
  logger.info("createApp: server ready");
  return server;
}
