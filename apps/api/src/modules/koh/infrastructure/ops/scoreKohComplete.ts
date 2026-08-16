import type { MatchSet, SubmitKohScoreInput } from "@padel/shared";
import { evaluateMatch } from "@padel/shared";

import { applyKohMatchResult, type KohEngineCourt } from "../../../../engine/koh/index.js";
import { logger } from "../../../../lib/logger.js";
import { prisma } from "../../../../lib/prisma.js";
import { validation } from "../../../../shared/kernel/appError.js";
import type { KohTournamentHub } from "../../domain/types.js";
import type { KohDbCourt, KohDbTournament } from "../mappers/kohInclude.js";
import { regularConfigFromRow } from "../mappers/kohHubMapper.js";
import { restoreTempSwapQueue, toEngineCourt } from "../mappers/kohEngineMapper.js";
import { mapTempSwap } from "../mappers/kohUnitMapper.js";
import { decideKohPromotion } from "./kohPromotionDecision.js";
import { getKohHub } from "./loadKohOps.js";
import { resolveDraftMatch } from "./scoreKohDraft.js";
import { persistCompletedKohMatch } from "./scoreKohPersist.js";

function evaluateKohMatch(row: KohDbTournament, input: SubmitKohScoreInput): "A" | "B" {
  const setsForEval: MatchSet[] = input.sets.map((set) => ({
    setNumber: set.setNumber,
    gamesA: set.gamesA,
    gamesB: set.gamesB,
    tbA: set.tbA,
    tbB: set.tbB
  }));
  const evaluation = evaluateMatch(setsForEval, regularConfigFromRow(row), {
    a: input.matchTbA,
    b: input.matchTbB
  });
  if (!evaluation.complete || !evaluation.winner) {
    throw validation(evaluation.error ?? "Regular match is not complete.");
  }
  return evaluation.winner;
}

/** Reorder the engine queue so the scored pair sits in the king / challenger slots. */
function queueWithMatchPairFirst(
  court: KohEngineCourt,
  unitAId: string,
  unitBId: string
): KohEngineCourt {
  if (court.queue[0]?.id === unitAId && court.queue[1]?.id === unitBId) {
    return court;
  }
  const byId = new Map(court.queue.map((unit) => [unit.id, unit]));
  const a = byId.get(unitAId);
  const b = byId.get(unitBId);
  if (!a || !b) {
    throw validation("Match units are no longer on this court.");
  }
  const rest = court.queue.filter((unit) => unit.id !== unitAId && unit.id !== unitBId);
  return { ...court, queue: [a, b, ...rest] };
}

export async function submitKohCompleteScore(args: {
  row: KohDbTournament;
  court: KohDbCourt;
  organizerId: string;
  kingUnitId: string;
  challengerUnitId: string;
  input: SubmitKohScoreInput;
}): Promise<KohTournamentHub> {
  const { row, court, organizerId, input } = args;
  const tournamentId = row.id;
  const winnerSide = evaluateKohMatch(row, input);

  const match = await resolveDraftMatch({
    courtId: court.id,
    matchId: input.matchId,
    kingUnitId: args.kingUnitId,
    challengerUnitId: args.challengerUnitId
  });
  const winnerUnitId = winnerSide === "A" ? match.unitAId : match.unitBId;

  const engineCourt = queueWithMatchPairFirst(
    toEngineCourt(court),
    match.unitAId,
    match.unitBId
  );
  const { court: engineAfterMatch, event } = applyKohMatchResult(engineCourt, winnerUnitId);
  const tempSwap = mapTempSwap(court);
  const engineAfter: KohEngineCourt = {
    ...engineAfterMatch,
    queue: tempSwap
      ? restoreTempSwapQueue(engineAfterMatch.queue, tempSwap)
      : engineAfterMatch.queue
  };

  if (match.created) {
    await prisma.kohMatch.create({
      data: {
        id: match.matchId,
        courtId: court.id,
        unitAId: match.unitAId,
        unitBId: match.unitBId,
        completed: false
      }
    });
  }

  const promotion = decideKohPromotion({
    row,
    scoredCourtId: court.id,
    scoredCourtNumber: court.courtNumber,
    scoredCourtQueue: engineAfter
  });

  await persistCompletedKohMatch({
    tournamentId,
    tournamentName: row.name,
    organizerId: row.organizerId,
    courtId: court.id,
    matchId: match.matchId,
    unitAId: match.unitAId,
    unitBId: match.unitBId,
    winnerUnitId,
    winnerSide,
    sets: input.sets,
    courtsToPersist: promotion.courtsToPersist,
    scoredCourtQueue: engineAfter,
    pendingPromote: promotion.pendingPromote
  });

  logger.info("koh/submitKohCourtScore complete", {
    tournamentId,
    courtId: court.id,
    matchId: match.matchId,
    winnerUnitId,
    event: event.type,
    courtChange: promotion.courtChange?.type ?? null
  });

  const hub = await getKohHub(tournamentId, organizerId);
  return { ...hub, lastMatchEvent: event, lastCourtChange: promotion.courtChange };
}
