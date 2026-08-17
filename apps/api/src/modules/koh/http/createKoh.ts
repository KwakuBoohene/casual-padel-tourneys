import type { FastifyInstance } from "fastify";
import { createKohTournamentSchema } from "@padel/shared";

import { createKohTournament } from "../application/createKohTournament.js";
import { createKohDeps } from "./deps.js";

/**
 * KOH branch of `POST /tournaments`. The tournament module owns the route and
 * delegates here when `mode === "KING_OF_THE_COURT"`.
 */
export async function handleCreateKohTournament(
  server: FastifyInstance,
  body: unknown,
  organizerId: string
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const parsed = createKohTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, payload: { errors: parsed.error.flatten() } };
  }
  const data = await createKohTournament(createKohDeps(server), {
    organizerId,
    config: parsed.data
  });
  return { status: 200, payload: { data } };
}
