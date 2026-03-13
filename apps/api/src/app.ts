import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import rateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";

import { registerTournamentRoutes } from "./routes/tournaments.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { mountSocketHub } from "./realtime/socketHub.js";

export async function createApp() {
  const server = Fastify({ logger: false });
  await server.register(cors, {
    origin: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-organizer-token", "Authorization"]
  });
  await server.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await server.register(websocket);
  if (process.env.REDIS_URL) {
    server.decorate("redis", new Redis(process.env.REDIS_URL));
  } else {
    server.decorate("redis", undefined);
  }
  server.decorate("subscriptions", mountSocketHub(server));
  await registerAuthRoutes(server);
  await registerTournamentRoutes(server);
  return server;
}
