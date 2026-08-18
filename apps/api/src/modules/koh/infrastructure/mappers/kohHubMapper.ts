import type { KohPendingPromote } from "@padel/shared";
import { defaultGameWinByForSetFormat, resolveDeuceMode } from "@padel/shared";

import { computeBalanceHint } from "../../domain/balanceHint.js";
import type { KohTournamentHub } from "../../domain/types.js";
import type { KohDbTournament } from "./kohInclude.js";
import { mapCourt } from "./kohCourtMapper.js";

export function parsePendingPromote(value: unknown): KohPendingPromote | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.fromCourtNumber !== "number" ||
    typeof row.toCourtNumber !== "number" ||
    typeof row.promotedUnitId !== "string" ||
    !Array.isArray(row.candidateUnitIds) ||
    !row.candidateUnitIds.every((id) => typeof id === "string")
  ) {
    return null;
  }
  return {
    fromCourtNumber: row.fromCourtNumber,
    toCourtNumber: row.toCourtNumber,
    promotedUnitId: row.promotedUnitId,
    candidateUnitIds: row.candidateUnitIds as string[]
  };
}

export function regularConfigFromRow(row: KohDbTournament) {
  const setFormat = row.regularSetFormat ?? ("FULL_SET" as const);
  const gameWinBy =
    row.regularGameWinBy === 1 || row.regularGameWinBy === 2
      ? (row.regularGameWinBy as 1 | 2)
      : defaultGameWinByForSetFormat(setFormat);
  const stored =
    row.regularDeuceMode === "ADVANTAGE" ||
    row.regularDeuceMode === "GOLDEN" ||
    row.regularDeuceMode === "STAR"
      ? row.regularDeuceMode
      : undefined;
  return {
    setFormat,
    gameWinBy,
    deuceMode: resolveDeuceMode({ gameWinBy, deuceMode: stored }),
    setsToWin: row.regularSetsToWin ?? 1,
    setTiebreakTo:
      row.regularSetTiebreakTo === 7 || row.regularSetTiebreakTo === 10
        ? (row.regularSetTiebreakTo as 7 | 10)
        : undefined,
    matchTiebreak: row.regularMatchTiebreak ?? undefined
  };
}

export function toHub(row: KohDbTournament): KohTournamentHub {
  const courts = row.kohCourts.map(mapCourt);
  const unitCounts = courts.map((court) => court.unitCount);
  const ready = courts.length > 0 && courts.every((court) => court.unitCount >= 2);

  return {
    id: row.id,
    publicToken: row.publicToken,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    organizerId: row.organizerId ?? undefined,
    config: {
      name: row.name,
      mode: "KING_OF_THE_COURT",
      pairingMode: row.pairingMode === "ROUND_ROBIN_PAIRS" ? "ROUND_ROBIN_PAIRS" : "WINNER_STAYS",
      courts: row.courts,
      scoringMode: "REGULAR",
      regularScoring: regularConfigFromRow(row),
      promotionRules: row.kohPromotionRules.map((rule) => ({
        courtNumber: rule.courtNumber,
        winsRequired: rule.winsRequired,
        promoteToCourtNumber: rule.promoteToCourtNumber ?? undefined
      })),
      contributeToCareerLeaderboard: row.contributeToCareerLeaderboard
    },
    players: row.players.map((player) => ({
      id: player.id,
      name: player.name,
      gender: player.gender === "MALE" || player.gender === "FEMALE" ? player.gender : undefined
    })),
    courts,
    ready,
    balanceHint: computeBalanceHint(unitCounts),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    pendingPromote: parsePendingPromote(row.kohPendingPromote)
  };
}
