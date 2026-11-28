import type { CreateTournamentResponse } from "../types/organizer/tournament";
import { apiPost } from "./client";

/** Create a tournament from a PadelMix live link; the server fetches and maps it. */
export function importPadelMixTournament(url: string): Promise<CreateTournamentResponse> {
  return apiPost<CreateTournamentResponse>("/tournaments/import/padelmix", { url });
}
