import type { FastifyInstance } from "fastify";

import type { OrganizerPlayersDeps } from "../application/ports.js";
import { PrismaOrganizerPlayerRepository } from "../infrastructure/PrismaOrganizerPlayerRepository.js";
import { registerOrganizerPlayerExportRoutes } from "./exportRoutes.js";
import { registerOrganizerPlayerManagementRoutes } from "./managementRoutes.js";
import { registerOrganizerPlayerRoutes } from "./playerRoutes.js";
import { registerCareerShareRoutes } from "./shareRoutes.js";

export function createOrganizerPlayersDeps(): OrganizerPlayersDeps {
  return { repo: new PrismaOrganizerPlayerRepository() };
}

export function registerOrganizerPlayersModule(server: FastifyInstance): void {
  const deps = createOrganizerPlayersDeps();
  registerOrganizerPlayerManagementRoutes(server, deps);
  registerOrganizerPlayerRoutes(server, deps);
  registerOrganizerPlayerExportRoutes(server, deps);
  registerCareerShareRoutes(server, deps);
}
