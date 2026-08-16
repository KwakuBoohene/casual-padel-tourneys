import type { SubmitKohScoreInput } from "@padel/shared";
import { createId } from "@padel/shared";

import { logger } from "../../../../lib/logger.js";
import { prisma } from "../../../../lib/prisma.js";
import { validation } from "../../../../shared/kernel/appError.js";
import type { KohTournamentHub } from "../../domain/types.js";
import { getKohHub } from "./loadKohOps.js";
import { replaceMatchSets } from "./kohSetStats.js";

/** Resolve the draft match this submit targets, creating one when the court has none. */
export async function resolveDraftMatch(args: {
  courtId: string;
  matchId?: string;
  kingUnitId: string;
  challengerUnitId: string;
}): Promise<{ matchId: string; unitAId: string; unitBId: string; created: boolean }> {
  if (args.matchId) {
    const existing = await prisma.kohMatch.findFirst({
      where: { id: args.matchId, courtId: args.courtId, completed: false }
    });
    if (!existing) {
      throw validation("Draft match not found.");
    }
    return {
      matchId: existing.id,
      unitAId: existing.unitAId,
      unitBId: existing.unitBId,
      created: false
    };
  }

  const open = await prisma.kohMatch.findFirst({
    where: { courtId: args.courtId, completed: false },
    orderBy: { updatedAt: "desc" }
  });
  if (open) {
    return { matchId: open.id, unitAId: open.unitAId, unitBId: open.unitBId, created: false };
  }
  return {
    matchId: createId("kohmatch"),
    unitAId: args.kingUnitId,
    unitBId: args.challengerUnitId,
    created: true
  };
}

export async function submitKohDraftScore(args: {
  tournamentId: string;
  organizerId: string;
  courtId: string;
  kingUnitId: string;
  challengerUnitId: string;
  input: SubmitKohScoreInput;
}): Promise<KohTournamentHub> {
  const { tournamentId, organizerId, courtId, input } = args;
  const match = await resolveDraftMatch({
    courtId,
    matchId: input.matchId,
    kingUnitId: args.kingUnitId,
    challengerUnitId: args.challengerUnitId
  });

  if (match.created) {
    await prisma.kohMatch.create({
      data: {
        id: match.matchId,
        courtId,
        unitAId: match.unitAId,
        unitBId: match.unitBId,
        completed: false
      }
    });
    await replaceMatchSets(match.matchId, input.sets);
  } else {
    await replaceMatchSets(match.matchId, input.sets);
    await prisma.kohMatch.update({
      where: { id: match.matchId },
      data: { updatedAt: new Date() }
    });
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { version: { increment: 1 }, updatedAt: new Date() }
  });
  logger.info("koh/submitKohCourtScore draft", { tournamentId, courtId, matchId: match.matchId });
  return getKohHub(tournamentId, organizerId);
}
