import {
  buildMexicanoLadderAssignments,
  createId,
  sortMexicanoStandings
} from "@padel/shared";
import type {
  Match,
  Player,
  PlayerGender,
  Round,
  TournamentConfig,
  TournamentVariant
} from "@padel/shared";

export interface ScheduledTournament {
  players: Player[];
  rounds: Round[];
}

export interface BuildNextMexicanoRoundInput {
  players: Player[];
  courts: number;
  variant: TournamentVariant;
  roundNumber: number;
  /** Optional deterministic RNG in [0, 1). Unused for ladder rounds. */
  random?: () => number;
}

/**
 * Create Mexicano: players + lottery round 1 only.
 * Later rounds come from `buildNextMexicanoRound` after scores update standings.
 */
export function generateMexicano(
  config: TournamentConfig,
  options?: { random?: () => number }
): ScheduledTournament {
  const players: Player[] = config.players.map((input) => ({
    id: createId("player"),
    name: input.name,
    gender: input.gender,
    gamesPlayed: 0,
    totalPoints: 0
  }));
  const round = buildLotteryRound({
    players,
    courts: config.courts,
    variant: config.variant,
    roundNumber: 1,
    random: options?.random
  });
  return { players, rounds: [round] };
}

/**
 * Next Mexicano round from current standings (1+3 vs 2+4, …).
 * MIXED: prefer each side male+female; if impossible, keep classic ladder sides.
 */
export function buildNextMexicanoRound(input: BuildNextMexicanoRoundInput): Round {
  const ordered = sortMexicanoStandings(
    input.players.map((player) => ({
      playerId: player.id,
      totalPoints: player.totalPoints,
      gamesPlayed: player.gamesPlayed
    }))
  );
  const byId = new Map(input.players.map((player) => [player.id, player]));
  const { courts } = buildMexicanoLadderAssignments(
    ordered.map((row) => row.playerId),
    input.courts
  );
  const matches: Match[] = courts.map((assignment) => {
    const sides = pairCourtSides(
      assignment.teamA,
      assignment.teamB,
      input.variant,
      byId
    );
    return {
      id: createId("match"),
      round: input.roundNumber,
      court: assignment.court,
      teamA: sides.teamA,
      teamB: sides.teamB,
      completed: false
    };
  });
  return {
    id: createId("round"),
    roundNumber: input.roundNumber,
    matches,
    isLocked: false
  };
}

function buildLotteryRound(input: BuildNextMexicanoRoundInput): Round {
  const random = input.random ?? Math.random;
  const shuffled = [...input.players];
  shuffleInPlace(shuffled, random);
  const capacity = Math.min(Math.floor(shuffled.length / 4), input.courts) * 4;
  const active = shuffled.slice(0, capacity);
  const byId = new Map(input.players.map((player) => [player.id, player]));
  const matches: Match[] = [];

  for (let index = 0; index < active.length; index += 4) {
    const group = active.slice(index, index + 4);
    const defaultA: [string, string] = [group[0].id, group[1].id];
    const defaultB: [string, string] = [group[2].id, group[3].id];
    const sides = pairCourtSides(defaultA, defaultB, input.variant, byId);
    matches.push({
      id: createId("match"),
      round: input.roundNumber,
      court: matches.length + 1,
      teamA: sides.teamA,
      teamB: sides.teamB,
      completed: false
    });
  }

  return {
    id: createId("round"),
    roundNumber: input.roundNumber,
    matches,
    isLocked: false
  };
}

function pairCourtSides(
  teamA: [string, string],
  teamB: [string, string],
  variant: TournamentVariant,
  byId: Map<string, Player>
): { teamA: [string, string]; teamB: [string, string] } {
  if (variant !== "MIXED") {
    return { teamA, teamB };
  }
  const ids = [teamA[0], teamA[1], teamB[0], teamB[1]] as const;
  const combos: Array<{ teamA: [string, string]; teamB: [string, string] }> = [
    { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] },
    { teamA: [ids[0], ids[2]], teamB: [ids[1], ids[3]] },
    { teamA: [ids[0], ids[3]], teamB: [ids[1], ids[2]] }
  ];
  for (const combo of combos) {
    if (isMixedTeam(combo.teamA, byId) && isMixedTeam(combo.teamB, byId)) {
      return combo;
    }
  }
  return { teamA, teamB };
}

function isMixedTeam(pair: [string, string], byId: Map<string, Player>): boolean {
  const a = byId.get(pair[0])?.gender;
  const b = byId.get(pair[1])?.gender;
  return isOppositeGender(a, b);
}

function isOppositeGender(a?: PlayerGender, b?: PlayerGender): boolean {
  if (!a || !b) return false;
  return (a === "MALE" && b === "FEMALE") || (a === "FEMALE" && b === "MALE");
}

function shuffleInPlace<T>(items: T[], random: () => number): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
}
