import type { CreateKohTournamentInput } from "@padel/shared";
import { createId } from "@padel/shared";

import { logger } from "../../../../lib/logger.js";
import { prisma } from "../../../../lib/prisma.js";
import type { KohTournamentHub } from "../../domain/types.js";
import { getKohHub } from "./loadKohOps.js";

export async function createKohTournament(
  input: CreateKohTournamentInput,
  organizerId: string
): Promise<KohTournamentHub> {
  const id = createId("tournament");
  const publicToken = createId("public");
  const now = new Date();
  const pairingMode = input.pairingMode ?? "WINNER_STAYS";

  await prisma.tournament.create({
    data: {
      id,
      name: input.name,
      mode: "KING_OF_THE_COURT",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      courts: input.courts,
      pointsPerMatch: 24,
      scoringMode: "REGULAR",
      regularSetFormat: input.regularScoring.setFormat,
      regularGameWinBy: input.regularScoring.gameWinBy,
      regularDeuceMode: input.regularScoring.deuceMode ?? null,
      regularSetsToWin: input.regularScoring.setsToWin,
      regularSetTiebreakTo: input.regularScoring.setTiebreakTo ?? null,
      regularMatchTiebreak: input.regularScoring.matchTiebreak ?? null,
      contributeToCareerLeaderboard: input.contributeToCareerLeaderboard ?? true,
      pairingMode,
      publicToken,
      organizerId,
      version: 0,
      createdAt: now,
      updatedAt: now,
      kohCourts: {
        create: Array.from({ length: input.courts }, (_, index) => ({
          id: createId("kohcourt"),
          courtNumber: index + 1
        }))
      },
      kohPromotionRules: {
        create: (input.promotionRules ?? []).map((rule) => ({
          id: createId("kohpromo"),
          courtNumber: rule.courtNumber,
          winsRequired: rule.winsRequired,
          promoteToCourtNumber: rule.promoteToCourtNumber ?? null
        }))
      }
    }
  });

  logger.info("koh/createKohTournament", { id, courts: input.courts, organizerId });
  return getKohHub(id, organizerId);
}
