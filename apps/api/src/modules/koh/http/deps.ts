import type { FastifyInstance } from "fastify";

import type { KohModuleDeps } from "../application/ports.js";
import { PrismaKohRepository } from "../infrastructure/PrismaKohRepository.js";
import { RealtimeKohEvents } from "../infrastructure/RealtimeKohEvents.js";

export function createKohDeps(server: FastifyInstance): KohModuleDeps {
  return {
    repo: new PrismaKohRepository(),
    events: new RealtimeKohEvents(server.redis, server.subscriptions)
  };
}
