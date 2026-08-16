import type { LeaderboardEntry, Player, TournamentConfig } from "@padel/shared";

export function buildLeaderboard(
  players: Player[],
  scoringMode?: TournamentConfig["scoringMode"]
): LeaderboardEntry[] {
  const regular = scoringMode === "REGULAR";
  return [...players]
    .sort((a, b) => {
      if (!regular) {
        return b.totalPoints - a.totalPoints;
      }
      const byMatches = (b.matchesWon ?? 0) - (a.matchesWon ?? 0);
      if (byMatches !== 0) {
        return byMatches;
      }
      const bySets = (b.setsWon ?? 0) - (a.setsWon ?? 0);
      if (bySets !== 0) {
        return bySets;
      }
      return (b.gamesWon ?? 0) - (a.gamesWon ?? 0);
    })
    .map((player, index) => ({
      playerId: player.id,
      name: player.name,
      totalPoints: player.totalPoints,
      gamesPlayed: player.gamesPlayed,
      rank: index + 1,
      matchesWon: player.matchesWon,
      matchesLost: player.matchesLost,
      setsWon: player.setsWon,
      setsLost: player.setsLost,
      gamesWon: player.gamesWon,
      gamesLost: player.gamesLost
    }));
}
