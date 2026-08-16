import type { FastifyInstance } from "fastify";

import type { OrganizerPlayersDeps } from "../application/ports.js";
import { PrismaOrganizerPlayerRepository } from "../infrastructure/PrismaOrganizerPlayerRepository.js";
import { registerOrganizerPlayerRoutes } from "./playerRoutes.js";

export function createOrganizerPlayersDeps(): OrganizerPlayersDeps {
  return { repo: new PrismaOrganizerPlayerRepository() };
}

export function registerOrganizerPlayersModule(server: FastifyInstance): void {
  registerOrganizerPlayerRoutes(server, createOrganizerPlayersDeps());
}
