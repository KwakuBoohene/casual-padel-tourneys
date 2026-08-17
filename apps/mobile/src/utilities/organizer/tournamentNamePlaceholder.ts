import type { TournamentMode } from "@padel/shared";

import { formatTournamentMode } from "./formatLabels";

function timeOfDayLabel(hour: number): string {
  if (hour >= 5 && hour <= 11) return "Morning";
  if (hour >= 12 && hour <= 16) return "Afternoon";
  if (hour >= 17 && hour <= 21) return "Evening";
  return "Night";
}

/** Suggested tournament name: e.g. "Sunday Evening Americano". */
export function tournamentNamePlaceholder(now: Date, mode?: TournamentMode | null): string {
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const timeOfDay = timeOfDayLabel(now.getHours());
  const style = formatTournamentMode(mode ?? "AMERICANO");
  return `${weekday} ${timeOfDay} ${style}`;
}
