import type { KohRankingsBoard } from "@padel/shared";

import { sortKohRankings } from "../../../../engine/koh/index.js";
import { validation } from "../../../../shared/kernel/appError.js";
import type { KohDbTournament } from "./kohInclude.js";

export function buildKohRankingsBoard(
  row: KohDbTournament,
  courtNumber?: number
): KohRankingsBoard {
  const promotionEnabled = row.kohPromotionRules.length > 0;

  if (courtNumber !== undefined) {
    if (!Number.isInteger(courtNumber) || courtNumber < 1 || courtNumber > row.courts) {
      throw validation(`courtNumber must be between 1 and ${row.courts}.`);
    }
  }

  const courts =
    courtNumber === undefined
      ? row.kohCourts
      : row.kohCourts.filter((court) => court.courtNumber === courtNumber);

  const nameByUnitId = new Map<string, { playerAName: string; playerBName: string }>();
  const candidates = courts.flatMap((court) =>
    court.units.map((unit) => {
      nameByUnitId.set(unit.id, {
        playerAName: unit.playerA.name,
        playerBName: unit.playerB.name
      });
      return {
        id: unit.id,
        playerAId: unit.playerAId,
        playerBId: unit.playerBId,
        matchesWon: unit.matchesWon,
        matchesLost: unit.matchesLost,
        kingWinStreak: unit.kingWinStreak,
        specialLosses: unit.specialLosses,
        courtNumber: court.courtNumber,
        gamesWon: unit.gamesWon,
        gamesLost: unit.gamesLost
      };
    })
  );

  const sorted = sortKohRankings(candidates);
  const weakestId =
    promotionEnabled && courtNumber !== undefined && sorted.length > 0
      ? sorted[sorted.length - 1].id
      : null;

  return {
    tournamentId: row.id,
    version: row.version,
    promotionEnabled,
    courtNumber: courtNumber ?? null,
    rows: sorted.map((unit, index) => {
      const names = nameByUnitId.get(unit.id)!;
      return {
        rank: index + 1,
        unitId: unit.id,
        courtNumber: unit.courtNumber,
        playerAName: names.playerAName,
        playerBName: names.playerBName,
        matchesWon: unit.matchesWon,
        matchesLost: unit.matchesLost,
        gameDiff: unit.gameDiff,
        specialLosses: unit.specialLosses ?? 0,
        weakest: weakestId !== null && unit.id === weakestId ? true : undefined
      };
    })
  };
}
