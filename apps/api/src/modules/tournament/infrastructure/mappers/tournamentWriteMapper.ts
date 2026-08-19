import type { TournamentState } from "../../../../types/state.js";

export function nestedPlayers(state: TournamentState) {
  return state.players.map((player) => ({
    id: player.id,
    name: player.name,
    gender: player.gender ?? null,
    gamesPlayed: player.gamesPlayed,
    totalPoints: player.totalPoints,
    matchesWon: player.matchesWon ?? 0,
    matchesLost: player.matchesLost ?? 0,
    setsWon: player.setsWon ?? 0,
    setsLost: player.setsLost ?? 0,
    gamesWon: player.gamesWon ?? 0,
    gamesLost: player.gamesLost ?? 0,
    handicap: player.handicap ?? null,
    integrationWave: player.integrationWave ?? null,
    pairId: player.pairId ?? null,
    integratedAt: null as null
  }));
}

export function nestedRounds(state: TournamentState) {
  return state.rounds.map((round) => ({
    id: round.id,
    roundNumber: round.roundNumber,
    isLocked: round.isLocked,
    matches: {
      create: round.matches.map((match) => ({
        id: match.id,
        court: match.court,
        teamA: match.teamA,
        teamB: match.teamB,
        scoreA: match.scoreA ?? null,
        scoreB: match.scoreB ?? null,
        matchTbA: match.matchTbA ?? null,
        matchTbB: match.matchTbB ?? null,
        completed: match.completed,
        voidedAt: match.voidedAt ? new Date(match.voidedAt) : null,
        sets: {
          create: (match.sets ?? []).map((set) => ({
            setNumber: set.setNumber,
            gamesA: set.gamesA,
            gamesB: set.gamesB,
            tbA: set.tbA ?? null,
            tbB: set.tbB ?? null,
            winMethodsA: set.winMethodsA ?? [],
            winMethodsB: set.winMethodsB ?? []
          }))
        }
      }))
    }
  }));
}

export function scalarTournamentData(state: TournamentState) {
  return {
    name: state.config.name,
    mode: state.config.mode,
    variant: state.config.variant,
    schedulingMode: state.config.schedulingMode,
    courts: state.config.courts,
    pointsPerMatch: state.config.pointsPerMatch,
    scoringMode: state.config.scoringMode ?? "AMERICANO_POINTS",
    regularSetFormat: state.config.regularScoring?.setFormat ?? null,
    regularGameWinBy: state.config.regularScoring?.gameWinBy ?? null,
    regularDeuceMode: state.config.regularScoring?.deuceMode ?? null,
    regularSetsToWin: state.config.regularScoring?.setsToWin ?? null,
    regularSetTiebreakTo: state.config.regularScoring?.setTiebreakTo ?? null,
    regularMatchTiebreak: state.config.regularScoring?.matchTiebreak ?? null,
    targetGamesPerPlayer: state.config.targetGamesPerPlayer ?? null,
    tournamentTimeMinutes: state.config.tournamentTimeMinutes ?? null,
    integrationWaveCount: state.integrationWaveCount,
    enableAutoIntegration: state.config.enableAutoIntegration ?? false,
    integrationThreshold: state.config.integrationThreshold ?? 2,
    version: state.version,
    updatedAt: new Date(state.updatedAt),
    endedAt: state.endedAt ? new Date(state.endedAt) : null
  };
}
