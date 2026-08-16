/**
 * Tournament HTTP module entry.
 * Dual-path note: `POST /tournaments` and the organizer / public token reads branch on
 * `mode === "KING_OF_THE_HILL"` and delegate to `modules/koh`. Americano/Mexicano live
 * behind this module's use-cases + Prisma repository.
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
