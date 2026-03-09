import type { Estimate, LeaderboardRow, LiveTournamentState, PlayerGameRow } from "./types";

export function computeEstimate(input: {
  courtsText: string;
  pointsText: string;
  mode: "AMERICANO" | "MEXICANO";
  targetGamesText: string;
  tournamentTimeText: string;
  playersCount: number;
}): Estimate | null {
  const courts = Number(input.courtsText);
  const pointsPerMatch = Number(input.pointsText);
  if (!Number.isFinite(courts) || !Number.isFinite(pointsPerMatch) || courts < 1 || pointsPerMatch < 1) {
    return null;
  }
  const playersPerRound = courts * 4;
  const matchTime = (pointsPerMatch * 35) / 60;
  if (playersPerRound <= 0 || input.playersCount === 0) {
    return null;
  }

  let rounds = 0;
  if (input.mode === "AMERICANO") {
    const targetGames = Number(input.targetGamesText);
    if (!Number.isFinite(targetGames) || targetGames < 1) {
      return null;
    }
    rounds = Math.ceil((input.playersCount * targetGames) / playersPerRound);
  } else {
    const tournamentTime = Number(input.tournamentTimeText);
    if (!Number.isFinite(tournamentTime) || tournamentTime < 10) {
      return null;
    }
    rounds = Math.ceil(tournamentTime / matchTime);
  }
  const durationMinutes = Math.ceil(rounds * matchTime);
  const gamesPerPlayer = Math.max(1, Math.round((rounds * playersPerRound) / input.playersCount));
  return { rounds, gamesPerPlayer, durationMinutes };
}

export function buildLeaderboardRows(tournament: LiveTournamentState): LeaderboardRow[] {
  const stats = new Map<string, LeaderboardRow>();
  for (const entry of tournament.leaderboard ?? []) {
    stats.set(entry.playerId, {
      playerId: entry.playerId,
      name: entry.name,
      wins: 0,
      losses: 0,
      draws: 0,
      gamesPlayed: entry.gamesPlayed,
      totalPoints: entry.totalPoints
    });
  }

  for (const player of tournament.players) {
    if (!stats.has(player.id)) {
      stats.set(player.id, {
        playerId: player.id,
        name: player.name,
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0,
        totalPoints: 0
      });
    }
  }

  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (!match.completed || match.scoreA === undefined || match.scoreB === undefined) {
        continue;
      }
      const teamAResult = match.scoreA === match.scoreB ? "DRAW" : match.scoreA > match.scoreB ? "WIN" : "LOSS";
      const teamBResult = match.scoreA === match.scoreB ? "DRAW" : match.scoreB > match.scoreA ? "WIN" : "LOSS";
      for (const playerId of match.teamA) {
        bumpResult(stats, playerId, teamAResult);
      }
      for (const playerId of match.teamB) {
        bumpResult(stats, playerId, teamBResult);
      }
    }
  }

  return [...stats.values()].sort((a, b) => b.totalPoints - a.totalPoints);
}

export function buildPlayerGameRows(input: {
  tournament: LiveTournamentState;
  selectedPlayerId: string;
  playerNameById: Map<string, string>;
}): PlayerGameRow[] {
  const rows: PlayerGameRow[] = [];
  for (const round of input.tournament.rounds) {
    for (const match of round.matches) {
      const inTeamA = match.teamA.includes(input.selectedPlayerId);
      const inTeamB = match.teamB.includes(input.selectedPlayerId);
      if (!inTeamA && !inTeamB) {
        continue;
      }
      const myTeam = inTeamA ? match.teamA : match.teamB;
      const otherTeam = inTeamA ? match.teamB : match.teamA;
      const partnerId = myTeam.find((playerId) => playerId !== input.selectedPlayerId) ?? input.selectedPlayerId;
      const myScore = inTeamA ? match.scoreA : match.scoreB;
      const theirScore = inTeamA ? match.scoreB : match.scoreA;
      let result: PlayerGameRow["result"] = "PENDING";
      if (match.completed && myScore !== undefined && theirScore !== undefined) {
        result = myScore === theirScore ? "DRAW" : myScore > theirScore ? "WIN" : "LOSS";
      }
      rows.push({
        matchId: match.id,
        roundNumber: round.roundNumber,
        court: match.court,
        partner: input.playerNameById.get(partnerId) ?? partnerId,
        opponents: [input.playerNameById.get(otherTeam[0]) ?? otherTeam[0], input.playerNameById.get(otherTeam[1]) ?? otherTeam[1]],
        scoreText: myScore !== undefined && theirScore !== undefined ? `${myScore}-${theirScore}` : "Pending",
        result
      });
    }
  }
  return rows.sort((a, b) => a.roundNumber - b.roundNumber);
}

function bumpResult(stats: Map<string, LeaderboardRow>, playerId: string, result: "WIN" | "LOSS" | "DRAW"): void {
  const row = stats.get(playerId);
  if (!row) {
    return;
  }
  if (result === "WIN") {
    row.wins += 1;
  } else if (result === "LOSS") {
    row.losses += 1;
  } else {
    row.draws += 1;
  }
}
