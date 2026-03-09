import type Redis from "ioredis";
import type { WebSocket } from "@fastify/websocket";

declare module "fastify" {
  interface FastifyInstance {
    redis?: Redis;
    subscriptions: Map<string, Set<WebSocket>>;
  }
}
