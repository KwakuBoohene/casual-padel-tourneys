import type { FastifyInstance } from "fastify";

import { endKohTournament } from "../application/endKohTournament.js";
import { createKohDeps } from "./deps.js";

/**
 * King of the Court branch of `POST /tournaments/:id/close`. The tournament module owns the
 * route and delegates here, because the KOC aggregate has its own repository.
 */
export async function handleCloseKohTournament(
  server: FastifyInstance,
  tournamentId: string,
  organizerId: string,
  expectedVersion: number
): Promise<{ tournament: unknown; voidedMatchCount: number }> {
  const result = await endKohTournament(createKohDeps(server), {
    tournamentId,
    organizerId,
    expectedVersion
  });
  return { tournament: result.hub, voidedMatchCount: result.voidedMatchCount };
}
