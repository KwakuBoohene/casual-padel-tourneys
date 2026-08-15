import type { Estimate } from "../../types/organizer/tournament";

export function formatSettingsEstimateLine(estimate: Estimate | null, approximate: boolean): string {
  if (approximate) {
    return "Rounds continue until you end the night — no time limit.";
  }
  if (!estimate) return "Enter valid settings to see an estimate.";
  const hours = Math.max(1, Math.round(estimate.durationMinutes / 60));
  return `~${estimate.rounds} rounds · ~${estimate.gamesPerPlayer} matches/player · ~${hours}h`;
}
