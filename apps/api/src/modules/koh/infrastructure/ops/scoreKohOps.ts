import type { SubmitKohScoreInput } from "@padel/shared";

import { validation } from "../../../../shared/kernel/appError.js";
import type { KohTournamentHub } from "../../domain/types.js";
import { assertKohLive, requireKohTournament } from "./loadKohOps.js";
import { assertKohVersion } from "./kohVersion.js";
import { submitKohCompleteScore } from "./scoreKohComplete.js";
import { submitKohDraftScore } from "./scoreKohDraft.js";

/**
 * Submit DRAFT or COMPLETE Regular score for the on-court king vs challenger.
 * Side A = king, side B = challenger at the time of submit (or of the existing draft).
 */
export async function submitKohCourtScore(
  tournamentId: string,
  organizerId: string,
  courtId: string,
  input: SubmitKohScoreInput
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  assertKohVersion(row, input.expectedVersion);

  const court = row.kohCourts.find((entry) => entry.id === courtId);
  if (!court) {
    throw validation("Court not found.");
  }
  if (court.units.length < 2) {
    throw validation("Court needs at least king and challenger to score.");
  }

  const ordered = [...court.units].sort((a, b) => a.queuePosition - b.queuePosition);
  const kingUnitId = ordered[0].id;
  const challengerUnitId = ordered[1].id;

  if (input.status === "DRAFT") {
    return submitKohDraftScore({
      tournamentId,
      organizerId,
      courtId,
      kingUnitId,
      challengerUnitId,
      input
    });
  }

  return submitKohCompleteScore({
    row,
    court,
    organizerId,
    kingUnitId,
    challengerUnitId,
    input
  });
}
