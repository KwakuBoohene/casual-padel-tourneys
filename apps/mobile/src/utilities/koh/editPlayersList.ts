import type { KohUnit } from "@padel/shared";

import type { KohTournamentHub } from "../../types/koh/create";

export type KohEditUnitRole = "KING" | "NEXT" | "WAIT";

export type KohEditUnitRow = {
  unit: KohUnit;
  courtNumber: number;
  courtId: string;
  role: KohEditUnitRole;
  midMatch: boolean;
};

export function listKohEditUnits(hub: KohTournamentHub): KohEditUnitRow[] {
  const rows: KohEditUnitRow[] = [];
  for (const court of hub.courts) {
    const midMatch = Boolean(court.activeMatch);
    if (court.king) {
      rows.push({
        unit: court.king,
        courtNumber: court.courtNumber,
        courtId: court.id,
        role: "KING",
        midMatch: midMatch && (court.activeMatch?.unitAId === court.king.id ||
          court.activeMatch?.unitBId === court.king.id)
      });
    }
    if (court.challenger) {
      rows.push({
        unit: court.challenger,
        courtNumber: court.courtNumber,
        courtId: court.id,
        role: "NEXT",
        midMatch: midMatch && (court.activeMatch?.unitAId === court.challenger.id ||
          court.activeMatch?.unitBId === court.challenger.id)
      });
    }
    for (const unit of court.waiting) {
      rows.push({
        unit,
        courtNumber: court.courtNumber,
        courtId: court.id,
        role: "WAIT",
        midMatch: false
      });
    }
  }
  return rows;
}
