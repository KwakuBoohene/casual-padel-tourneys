import type { FastifyInstance } from "fastify";

import { PrismaTournamentRepository } from "../infrastructure/PrismaTournamentRepository.js";
import { RealtimeTournamentEvents } from "../infrastructure/RealtimeTournamentEvents.js";
import type { TournamentModuleDeps } from "../application/ports.js";

export function createTournamentDeps(server: FastifyInstance): TournamentModuleDeps {
  return {
    repo: new PrismaTournamentRepository(),
    events: new RealtimeTournamentEvents(server.redis, server.subscriptions)
  };
}
