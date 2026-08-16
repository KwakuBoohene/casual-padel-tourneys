/**
 * Tournament HTTP module entry.
 * Temporary dual-path note: KOH create/detail still delegates to `routes/koh` / `kohStore`
 * until epic-10. Americano/Mexicano live behind use-cases + Prisma repository.
 */
import type { FastifyInstance } from "fastify";

import { createTournamentDeps } from "./deps.js";
import { registerTournamentCreateRoutes } from "./createRoutes.js";
import { registerTournamentEditRoutes } from "./editRoutes.js";
import { registerTournamentLifecycleRoutes } from "./lifecycleRoutes.js";
import { registerTournamentQueryRoutes } from "./queryRoutes.js";
import { registerTournamentScoreRoutes } from "./scoreRoutes.js";

export async function registerTournamentModule(server: FastifyInstance): Promise<void> {
  const deps = createTournamentDeps(server);
  registerTournamentQueryRoutes(server, deps);
  registerTournamentCreateRoutes(server, deps);
  registerTournamentScoreRoutes(server, deps);
  registerTournamentEditRoutes(server, deps);
  registerTournamentLifecycleRoutes(server, deps);
}
