import type {
  FixedPair,
  PendingPlayer as DomainPendingPlayer,
  Player as DomainPlayer,
  RegularScoringConfig,
  SchedulingMode,
  TournamentConfig
} from "@padel/shared";
import { resolveDeuceMode } from "@padel/shared";
import type { Tournament as DbTournament } from "@prisma/client";

import type { TournamentState } from "../../../../types/state.js";
import { buildLeaderboard } from "../../domain/leaderboard.js";
import { mapRoundsFromDb } from "./mapRounds.js";
import type { DbTournamentGraph } from "./tournamentDbTypes.js";

export type { DbTournamentGraph, DbMatchWithSets } from "./tournamentDbTypes.js";
export { tournamentInclude } from "./tournamentDbTypes.js";

function regularConfigFromRow(tournament: DbTournament): RegularScoringConfig | undefined {
  if (tournament.scoringMode !== "REGULAR" || !tournament.regularSetFormat) {
    return undefined;
  }
  const gameWinBy = (tournament.regularGameWinBy === 2 ? 2 : 1) as 1 | 2;
  const stored =
    tournament.regularDeuceMode === "ADVANTAGE" ||
    tournament.regularDeuceMode === "GOLDEN" ||
    tournament.regularDeuceMode === "STAR"
      ? tournament.regularDeuceMode
      : undefined;
  return {
    setFormat: tournament.regularSetFormat,
    gameWinBy,
    deuceMode: resolveDeuceMode({ gameWinBy, deuceMode: stored }),
    setsToWin: tournament.regularSetsToWin ?? 1,
    setTiebreakTo:
      tournament.regularSetTiebreakTo === 7 || tournament.regularSetTiebreakTo === 10
        ? tournament.regularSetTiebreakTo
        : undefined,
    matchTiebreak: tournament.regularMatchTiebreak ?? undefined
  };
}

function fixedPairsFromPlayers(players: DomainPlayer[]): FixedPair[] {
  const byPair = new Map<string, DomainPlayer[]>();
  for (const player of players) {
    if (!player.pairId) continue;
    const group = byPair.get(player.pairId) ?? [];
    group.push(player);
    byPair.set(player.pairId, group);
  }
  const pairs: FixedPair[] = [];
  for (const [pairId, group] of byPair) {
    if (group.length < 2) continue;
    pairs.push({ id: pairId, playerAId: group[0].id, playerBId: group[1].id });
  }
  return pairs;
}

export function mapDbTournamentToState(tournament: DbTournamentGraph): TournamentState {
  const regularScoring = regularConfigFromRow(tournament);
  const config: TournamentConfig = {
    name: tournament.name,
    mode: tournament.mode,
    variant: tournament.variant,
    schedulingMode: tournament.schedulingMode as SchedulingMode,
    players: tournament.players.map((player) => ({ name: player.name })),
    courts: tournament.courts,
    pointsPerMatch: tournament.pointsPerMatch,
    scoringMode: tournament.scoringMode,
    regularScoring,
    targetGamesPerPlayer: tournament.targetGamesPerPlayer ?? undefined,
    tournamentTimeMinutes: tournament.tournamentTimeMinutes ?? undefined,
    enableAutoIntegration: tournament.enableAutoIntegration,
    integrationThreshold: tournament.integrationThreshold,
    contributeToCareerLeaderboard: tournament.contributeToCareerLeaderboard
  };

  const players: DomainPlayer[] = tournament.players.map((player) => ({
    id: player.id,
    name: player.name,
    gender: player.gender === "MALE" || player.gender === "FEMALE" ? player.gender : undefined,
    gamesPlayed: player.gamesPlayed,
    totalPoints: player.totalPoints,
    handicap: player.handicap ?? undefined,
    integrationWave: player.integrationWave ?? undefined,
    pairId: player.pairId ?? undefined,
    matchesWon: player.matchesWon,
    matchesLost: player.matchesLost,
    setsWon: player.setsWon,
    setsLost: player.setsLost,
    gamesWon: player.gamesWon,
    gamesLost: player.gamesLost
  }));

  const fixedPairs = fixedPairsFromPlayers(players);
  const pendingPlayers: DomainPendingPlayer[] = tournament.pendingPlayers.map((pp) => ({
    id: pp.id,
    name: pp.name,
    gender: pp.gender === "MALE" || pp.gender === "FEMALE" ? pp.gender : undefined,
    createdAt: pp.createdAt.toISOString()
  }));

  return {
    id: tournament.id,
    config,
    players,
    rounds: mapRoundsFromDb(tournament),
    version: tournament.version,
    leaderboard: buildLeaderboard(players, config.scoringMode),
    publicToken: tournament.publicToken,
    createdAt: tournament.createdAt.toISOString(),
    updatedAt: tournament.updatedAt.toISOString(),
    endedAt: tournament.endedAt ? tournament.endedAt.toISOString() : null,
    organizerId: tournament.organizerId ?? undefined,
    pendingPlayers,
    integrationWaveCount: tournament.integrationWaveCount,
    fixedPairs: fixedPairs.length > 0 ? fixedPairs : undefined
  };
}
