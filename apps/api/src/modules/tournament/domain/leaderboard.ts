import {
  isMatchCountable,
  type LeaderboardEntry,
  type Player,
  type Round,
  type TournamentConfig
} from "@padel/shared";

/**
 * Tied matches per player.
 *
 * Only points scoring can draw: a Regular or King of the Court match is played until somebody
 * wins, so equal scores there mean a scoring bug, not a draw — counting them would quietly invent
 * draws. Voided and unfinished matches are excluded, so a tournament closed with unplayed matches
 * (epic 25) never credits a draw for a match nobody played.
 */
function drawsByPlayer(rounds: Round[]): Map<string, number> {
  const draws = new Map<string, number>();
  for (const round of rounds) {
    for (const match of round.matches) {
      if (!isMatchCountable(match)) continue;
      if (match.scoreA === undefined || match.scoreB === undefined) continue;
      if (match.scoreA !== match.scoreB) continue;
      for (const playerId of [...match.teamA, ...match.teamB]) {
        draws.set(playerId, (draws.get(playerId) ?? 0) + 1);
      }
    }
  }
  return draws;
}

export function buildLeaderboard(
  players: Player[],
  scoringMode: TournamentConfig["scoringMode"],
  rounds: Round[]
): LeaderboardEntry[] {
  const regular = scoringMode === "REGULAR";
  const draws = regular ? new Map<string, number>() : drawsByPlayer(rounds);
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
      matchesDrawn: draws.get(player.id) ?? 0,
      setsWon: player.setsWon,
      setsLost: player.setsLost,
      gamesWon: player.gamesWon,
      gamesLost: player.gamesLost
    }));
}
