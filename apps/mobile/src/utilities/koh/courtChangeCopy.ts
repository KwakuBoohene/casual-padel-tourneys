import type { KohCourtChange, KohUnit } from "@padel/shared";

function unitLabel(unit: KohUnit | null | undefined): string {
  if (!unit) return "Unknown pair";
  return `${unit.playerAName} / ${unit.playerBName}`;
}

function findUnit(
  units: KohUnit[],
  id: string
): KohUnit | undefined {
  return units.find((unit) => unit.id === id);
}

export function formatCourtChangeLines(
  change: KohCourtChange,
  allUnits: KohUnit[]
): { upLine: string | null; downLine: string | null; body: string } {
  if (change.type === "NEEDS_ORGANIZER_PICK") {
    const promoted = findUnit(allUnits, change.promotedUnitId);
    return {
      upLine: `${unitLabel(promoted)} · Court ${change.fromCourtNumber} → Court ${change.toCourtNumber}`,
      downLine: null,
      body: "Multiple weakest pairs tied — pick who moves down."
    };
  }
  const promoted = findUnit(allUnits, change.promotedUnitId);
  const demoted = findUnit(allUnits, change.demotedUnitId);
  return {
    upLine: `${unitLabel(promoted)} · Court ${change.fromCourtNumber} → Court ${change.toCourtNumber}`,
    downLine: `${unitLabel(demoted)} · Court ${change.toCourtNumber} → Court ${change.fromCourtNumber}`,
    body: `Weakest on Court ${change.toCourtNumber} swaps down. Acknowledge before returning to the court hub.`
  };
}

export function collectHubUnits(
  courts: Array<{ king: KohUnit | null; challenger: KohUnit | null; waiting: KohUnit[] }>
): KohUnit[] {
  const units: KohUnit[] = [];
  for (const court of courts) {
    if (court.king) units.push(court.king);
    if (court.challenger) units.push(court.challenger);
    units.push(...court.waiting);
  }
  return units;
}
