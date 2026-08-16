import type { KohHubCourt } from "../../domain/types.js";
import { mapLastResult, mapTempSwap, mapUnit } from "./kohUnitMapper.js";

export function mapCourt(row: {
  id: string;
  courtNumber: number;
  tempSwapSlot?: string | null;
  tempSwapInUnitId?: string | null;
  tempSwapOutUnitId?: string | null;
  tempSwapReason?: string | null;
  units: Array<{
    id: string;
    queuePosition: number;
    playerAId: string;
    playerBId: string;
    playerA: { name: string };
    playerB: { name: string };
    matchesWon?: number;
    matchesLost?: number;
  }>;
  matches?: Array<{
    id: string;
    unitAId: string;
    unitBId: string;
    completed: boolean;
    sets: Array<{
      setNumber: number;
      gamesA: number;
      gamesB: number;
      tbA: number | null;
      tbB: number | null;
      winMethodsA: Array<"REGULAR" | "GOLDEN" | "STAR">;
      winMethodsB: Array<"REGULAR" | "GOLDEN" | "STAR">;
    }>;
  }>;
}): KohHubCourt {
  const ordered = [...row.units].sort((a, b) => a.queuePosition - b.queuePosition);
  const mapped = ordered.map(mapUnit);
  const matches = row.matches ?? [];
  const draft = matches.find((match) => !match.completed);
  return {
    id: row.id,
    courtNumber: row.courtNumber,
    king: mapped[0] ?? null,
    challenger: mapped[1] ?? null,
    waiting: mapped.slice(2),
    tempSwap: mapTempSwap({
      tempSwapSlot: row.tempSwapSlot ?? null,
      tempSwapInUnitId: row.tempSwapInUnitId ?? null,
      tempSwapOutUnitId: row.tempSwapOutUnitId ?? null,
      tempSwapReason: row.tempSwapReason ?? null
    }),
    lastResult: mapLastResult(matches),
    unitCount: mapped.length,
    activeMatch: draft
      ? {
          id: draft.id,
          unitAId: draft.unitAId,
          unitBId: draft.unitBId,
          completed: draft.completed,
          sets: draft.sets.map((set) => ({
            setNumber: set.setNumber,
            gamesA: set.gamesA,
            gamesB: set.gamesB,
            tbA: set.tbA ?? undefined,
            tbB: set.tbB ?? undefined,
            winMethodsA: set.winMethodsA.length > 0 ? set.winMethodsA : undefined,
            winMethodsB: set.winMethodsB.length > 0 ? set.winMethodsB : undefined
          }))
        }
      : null
  };
}
