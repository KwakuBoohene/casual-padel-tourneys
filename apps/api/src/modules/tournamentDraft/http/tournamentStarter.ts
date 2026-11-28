import type { FastifyInstance } from "fastify";
import {
  assignKohCourtsSchema,
  createKohTournamentSchema,
  createTournamentSchema,
  isKingOfTheCourtMode
} from "@padel/shared";

import { prisma } from "../../../lib/prisma.js";
import { assignKohCourts } from "../../koh/application/assignKohCourts.js";
import { createKohTournament } from "../../koh/application/createKohTournament.js";
import { getKohHub } from "../../koh/application/readKohHub.js";
import { createKohDeps } from "../../koh/http/deps.js";
import { createTournament } from "../../tournament/application/createTournament.js";
import { toTournamentConfig } from "../../tournament/application/toTournamentConfig.js";
import { createTournamentDeps } from "../../tournament/http/deps.js";
import type { DraftTournamentStarter } from "../application/ports.js";

/**
 * Adapter onto the existing create use-cases, so a started draft is byte-for-byte a normal
 * tournament. Repositories join the request transaction; realtime events publish after commit.
 */
export function createDraftTournamentStarter(server: FastifyInstance): DraftTournamentStarter {
  const tournaments = createTournamentDeps(server);
  const koh = createKohDeps(server);
  return {
    async start(organizerId, bodies) {
      if (bodies.kind === "KING_OF_THE_COURT") {
        const config = createKohTournamentSchema.parse(bodies.create);
        const assignment = assignKohCourtsSchema.parse(bodies.assign);
        const created = await createKohTournament(koh, { organizerId, config });
        return assignKohCourts(koh, { tournamentId: created.id, organizerId, assignment });
      }
      const data = createTournamentSchema.parse(bodies.create);
      return createTournament(tournaments, { organizerId, config: toTournamentConfig(data) });
    },

    async load(tournamentId, organizerId) {
      const row = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { mode: true, organizerId: true }
      });
      if (!row || row.organizerId !== organizerId) return null;
      if (isKingOfTheCourtMode(row.mode)) return getKohHub(koh, { tournamentId, organizerId });
      return tournaments.repo.getById(tournamentId);
    }
  };
}
