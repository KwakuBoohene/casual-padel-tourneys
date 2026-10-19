import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import rateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";

import { registerAuthModule } from "./modules/auth/http/register.js";
import { registerKohModule } from "./modules/koh/http/register.js";
import { registerOrganizerPlayersModule } from "./modules/organizerPlayers/http/register.js";
import { registerTournamentModule } from "./modules/tournament/http/register.js";
import { mountSocketHub } from "./realtime/socketHub.js";
import { logger, resolveApiLogLevel } from "./lib/logger.js";
import { registerAppErrorHandler } from "./shared/http/errorHandler.js";
import { registerOpsRoutes } from "./shared/http/opsRoutes.js";
import {
  REQUEST_ID_HEADER,
  normalizeIncomingRequestId,
  registerRequestId,
  serializeRequest
} from "./shared/http/requestContext.js";

export async function createApp() {
  const loggerLevel = resolveApiLogLevel();
  const server = Fastify({
    logger: {
      level: loggerLevel,
      serializers: { req: serializeRequest }
    },
    // Correlation ids are generated here so an incoming header is length-bounded first.
    requestIdHeader: false,
    genReqId: (request) => normalizeIncomingRequestId(request.headers[REQUEST_ID_HEADER])
  });
  logger.info("createApp: starting Fastify server", { loggerLevel });
  await server.register(cors, {
    origin: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "x-organizer-token",
      "Authorization",
      "x-public-token",
      REQUEST_ID_HEADER
    ],
    // Downloads are fetched cross-origin by the app; without exposing this the client cannot
    // read the filename and falls back to a generic one.
    exposedHeaders: [REQUEST_ID_HEADER, "Content-Disposition"]
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
  registerRequestId(server);
  registerAppErrorHandler(server);
  logger.info("createApp: registering routes");
  registerOpsRoutes(server);
  await registerAuthModule(server);
  await registerTournamentModule(server);
  await registerKohModule(server);
  registerOrganizerPlayersModule(server);
  logger.info("createApp: server ready");
  return server;
}
