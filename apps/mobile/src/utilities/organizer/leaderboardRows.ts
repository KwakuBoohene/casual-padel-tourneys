import type { LeaderboardRow, LiveTournamentState , PlayerGameRow } from "../../types/organizer/tournament";
import { evaluateMatch } from "@padel/shared";

import { formatRegularMatchScore } from "./regularMatchDisplay";

function isRegular(tournament: LiveTournamentState): boolean {
  return (tournament.config.scoringMode ?? "AMERICANO_POINTS") === "REGULAR";
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

function ensureRow(
  stats: Map<string, LeaderboardRow>,
  playerId: string,
  name: string,
  seed?: Partial<LeaderboardRow>
): LeaderboardRow {
  const existing = stats.get(playerId);
  if (existing) {
    return existing;
  }
  const row: LeaderboardRow = {
    playerId,
    name,
    wins: seed?.wins ?? 0,
    losses: seed?.losses ?? 0,
    draws: seed?.draws ?? 0,
    gamesPlayed: seed?.gamesPlayed ?? 0,
    totalPoints: seed?.totalPoints ?? 0,
    setsWon: seed?.setsWon ?? 0,
    gamesWon: seed?.gamesWon ?? 0,
    isRegular: seed?.isRegular
  };
  stats.set(playerId, row);
  return row;
}

export function compareLeaderboardRows(a: LeaderboardRow, b: LeaderboardRow): number {
  if (a.isRegular || b.isRegular) {
    const byMatches = b.wins - a.wins;
    if (byMatches !== 0) return byMatches;
    const bySets = (b.setsWon ?? 0) - (a.setsWon ?? 0);
    if (bySets !== 0) return bySets;
    return (b.gamesWon ?? 0) - (a.gamesWon ?? 0);
  }
  return b.totalPoints - a.totalPoints;
}

export function buildLeaderboardRows(tournament: LiveTournamentState): LeaderboardRow[] {
  const regular = isRegular(tournament);
  const stats = new Map<string, LeaderboardRow>();

  for (const entry of tournament.leaderboard ?? []) {
    ensureRow(stats, entry.playerId, entry.name, {
      wins: regular ? entry.matchesWon ?? 0 : 0,
      losses: regular ? entry.matchesLost ?? 0 : 0,
      gamesPlayed: entry.gamesPlayed,
      totalPoints: entry.totalPoints,
      setsWon: entry.setsWon ?? 0,
      gamesWon: entry.gamesWon ?? 0,
      isRegular: regular
    });
  }

  for (const player of tournament.players) {
    ensureRow(stats, player.id, player.name, {
      wins: regular ? player.matchesWon ?? 0 : 0,
      losses: regular ? player.matchesLost ?? 0 : 0,
      gamesPlayed: 0,
      totalPoints: player.totalPoints ?? 0,
      setsWon: player.setsWon ?? 0,
      gamesWon: player.gamesWon ?? 0,
      isRegular: regular
    });
  }

  if (!regular) {
    for (const round of tournament.rounds) {
      for (const match of round.matches) {
        if (!match.completed || match.scoreA === undefined || match.scoreB === undefined) {
          continue;
        }
        const teamAResult =
          match.scoreA === match.scoreB ? "DRAW" : match.scoreA > match.scoreB ? "WIN" : "LOSS";
        const teamBResult =
          match.scoreA === match.scoreB ? "DRAW" : match.scoreB > match.scoreA ? "WIN" : "LOSS";
        for (const playerId of match.teamA) {
          bumpResult(stats, playerId, teamAResult);
        }
        for (const playerId of match.teamB) {
          bumpResult(stats, playerId, teamBResult);
        }
      }
    }
  }

  return [...stats.values()].map((row) => ({ ...row, isRegular: regular })).sort(compareLeaderboardRows);
}

export function buildPlayerGameRows(input: {
  tournament: LiveTournamentState;
  selectedPlayerId: string;
  playerNameById: Map<string, string>;
}): PlayerGameRow[] {
  const regular = isRegular(input.tournament);
  const config = input.tournament.config.regularScoring;
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

      let result: PlayerGameRow["result"] = "PENDING";
      let scoreText = "Pending";
      let pointsEarned: number | null = null;

      if (regular) {
        const line = formatRegularMatchScore(match.sets);
        scoreText = line ?? "Pending";
        if (match.completed && config && match.sets) {
          const evaluation = evaluateMatch(match.sets, config, {
            a: match.matchTbA,
            b: match.matchTbB
          });
          if (evaluation.winner === "A") {
            result = inTeamA ? "WIN" : "LOSS";
          } else if (evaluation.winner === "B") {
            result = inTeamB ? "WIN" : "LOSS";
          }
        }
      } else {
        const myScore = inTeamA ? match.scoreA : match.scoreB;
        const theirScore = inTeamA ? match.scoreB : match.scoreA;
        if (match.completed && myScore !== undefined && theirScore !== undefined) {
          result = myScore === theirScore ? "DRAW" : myScore > theirScore ? "WIN" : "LOSS";
          scoreText = `${myScore}-${theirScore}`;
          pointsEarned = myScore;
        } else if (myScore !== undefined && theirScore !== undefined) {
          scoreText = `${myScore}-${theirScore}`;
        }
      }

      rows.push({
        matchId: match.id,
        roundNumber: round.roundNumber,
        court: match.court,
        partner: input.playerNameById.get(partnerId) ?? partnerId,
        opponents: [
          input.playerNameById.get(otherTeam[0]) ?? otherTeam[0],
          input.playerNameById.get(otherTeam[1]) ?? otherTeam[1]
        ],
        scoreText,
        pointsEarned,
        result
      });
    }
  }
  return rows.sort((a, b) => a.roundNumber - b.roundNumber);
}
