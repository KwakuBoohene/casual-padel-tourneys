import type { Player, Round, TournamentConfig } from "@padel/shared";

import { generateTournament } from "./americanoScheduler.js";

export function generateMexicano(config: TournamentConfig): { players: Player[]; rounds: Round[] } {
  const scheduled = generateTournament(config);
  const byPoints = [...scheduled.players].sort((a, b) => b.totalPoints - a.totalPoints);
  if (byPoints.length >= 8) {
    scheduled.rounds.sort((a, b) => a.roundNumber - b.roundNumber);
  }
  return scheduled;
}
