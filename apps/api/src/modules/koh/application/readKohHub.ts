import type { KohRankingsBoard } from "@padel/shared";

import type { KohTournamentHub } from "../domain/types.js";
import type { KohModuleDeps } from "./ports.js";

export function getKohHub(
  deps: Pick<KohModuleDeps, "repo">,
  input: { tournamentId: string; organizerId: string }
): Promise<KohTournamentHub> {
  return deps.repo.getHub(input.tournamentId, input.organizerId);
}

export function getKohRankings(
  deps: Pick<KohModuleDeps, "repo">,
  input: { tournamentId: string; organizerId: string; courtNumber?: number }
): Promise<KohRankingsBoard> {
  return deps.repo.getRankings(input.tournamentId, input.organizerId, input.courtNumber);
}

/** Public viewer read — no organizer scope, returns null when the token is not a KOH night. */
export function getKohHubByPublicToken(
  deps: Pick<KohModuleDeps, "repo">,
  publicToken: string
): Promise<KohTournamentHub | null> {
  return deps.repo.getHubByPublicToken(publicToken);
}

export function getKohRankingsByPublicToken(
  deps: Pick<KohModuleDeps, "repo">,
  publicToken: string,
  courtNumber?: number
): Promise<KohRankingsBoard | null> {
  return deps.repo.getRankingsByPublicToken(publicToken, courtNumber);
}
