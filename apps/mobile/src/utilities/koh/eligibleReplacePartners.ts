import type { KohTournamentHub } from "../../types/koh/create";

import { listKohEditUnits, type KohEditUnitRole } from "./editPlayersList";

export type EligibleReplacePartner = {
  playerId: string;
  name: string;
  partnerName: string;
  courtNumber: number;
  role: KohEditUnitRole;
  sameCourt: boolean;
};

export function eligibleReplacePartners(
  hub: KohTournamentHub,
  leavePlayerId: string,
  stayPlayerId: string,
  selectedCourtNumber: number
): EligibleReplacePartner[] {
  const skip = new Set([leavePlayerId, stayPlayerId]);
  const rows: EligibleReplacePartner[] = [];
  for (const row of listKohEditUnits(hub)) {
    const unit = row.unit;
    const people: { playerId: string; name: string; partnerName: string }[] = [
      { playerId: unit.playerAId, name: unit.playerAName, partnerName: unit.playerBName },
      { playerId: unit.playerBId, name: unit.playerBName, partnerName: unit.playerAName }
    ];
    for (const person of people) {
      if (skip.has(person.playerId)) continue;
      rows.push({
        playerId: person.playerId,
        name: person.name,
        partnerName: person.partnerName,
        courtNumber: row.courtNumber,
        role: row.role,
        sameCourt: row.courtNumber === selectedCourtNumber
      });
    }
  }
  return rows.sort((a, b) => {
    if (a.sameCourt !== b.sameCourt) return a.sameCourt ? -1 : 1;
    if (a.courtNumber !== b.courtNumber) return a.courtNumber - b.courtNumber;
    return a.name.localeCompare(b.name);
  });
}
