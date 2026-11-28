import { createId } from "@padel/shared";
import type { Match, Player, PlayerGender, Round, TournamentConfig } from "@padel/shared";

import { validation } from "../../../shared/kernel/appError.js";
import type { TournamentState } from "../../../types/state.js";

import { buildLeaderboard } from "./leaderboard.js";
import {
  padelMixFormatSchema,
  padelMixPayloadSchema,
  type PadelMixMatch,
  type PadelMixPayload,
  type PadelMixRound
} from "./padelMixPayload.js";
import { awardPoints, bumpGamesPlayed } from "./pointsScore.js";

type Info = PadelMixPayload["tournamentData"]["information"];

function assertSupportedFormat(raw: unknown): void {
  const parsed = padelMixFormatSchema.safeParse(raw);
  if (!parsed.success) {
    throw validation("That link did not return a PadelMix tournament.");
  }
  const { tournamentType, tournamentVariant, participantType } = parsed.data.tournamentData.information;
  const isClassicAmericano =
    tournamentType === "americano" && (tournamentVariant ?? "classic-americano") === "classic-americano";
  if (!isClassicAmericano || (participantType ?? "individual") !== "individual") {
    throw validation("Only classic Americano tournaments can be imported from PadelMix for now.");
  }
}

function toGender(value: string | null | undefined): PlayerGender | undefined {
  if (value === "male") return "MALE";
  if (value === "female") return "FEMALE";
  return undefined;
}

function buildPlayers(info: Info): { players: Player[]; idBySourceId: Map<string, string> } {
  const idBySourceId = new Map<string, string>();
  const players = info.tournamentParticipants.map((participant): Player => {
    const id = createId("player");
    idBySourceId.set(participant.id, id);
    return { id, name: participant.name, gender: toGender(participant.gender), gamesPlayed: 0, totalPoints: 0 };
  });
  if (idBySourceId.size !== players.length) {
    throw validation("The PadelMix tournament lists the same player twice.");
  }
  return { players, idBySourceId };
}

/** Courts keep PadelMix's numbering when every name resolves uniquely; otherwise match order. */
function courtNumbers(round: PadelMixRound, courtNames: string[]): number[] {
  const named = round.matches.map((match) => courtNames.indexOf(match.courtName ?? "") + 1);
  const usable = named.every((court) => court > 0) && new Set(named).size === named.length;
  return usable ? named : round.matches.map((_, index) => index + 1);
}

function toMatch(source: PadelMixMatch, roundNumber: number, court: number, ids: Map<string, string>): Match {
  const resolve = (sourceId: string): string => {
    const id = ids.get(sourceId);
    if (!id) {
      throw validation(`Round ${roundNumber} references a player that is not in the PadelMix player list.`);
    }
    return id;
  };
  const scoreA = source.teamAScore ?? 0;
  const scoreB = source.teamBScore ?? 0;
  // PadelMix reports unplayed matches as 0–0, which is never a real Americano result.
  const played = scoreA + scoreB > 0;
  return {
    id: createId("match"),
    round: roundNumber,
    court,
    teamA: [resolve(source.teamA.player1.id), resolve(source.teamA.player2.id)],
    teamB: [resolve(source.teamB.player1.id), resolve(source.teamB.player2.id)],
    completed: played,
    ...(played ? { scoreA, scoreB } : {})
  };
}

function toRound(source: PadelMixRound, roundNumber: number, info: Info, ids: Map<string, string>): Round {
  if (source.matches.length > info.numberOfCourts) {
    throw validation(`Round ${roundNumber} has more matches than courts.`);
  }
  const courts = courtNumbers(source, (info.courts ?? []).map((court) => court.name));
  const matches = source.matches.map((match, index) => toMatch(match, roundNumber, courts[index] ?? index + 1, ids));
  const playing = matches.flatMap((match) => [...match.teamA, ...match.teamB]);
  if (new Set(playing).size !== playing.length) {
    throw validation(`Round ${roundNumber} has a player in more than one place.`);
  }
  return {
    id: createId("round"),
    roundNumber,
    matches,
    isLocked: matches.every((match) => match.completed)
  };
}

function buildRounds(payload: PadelMixPayload, ids: Map<string, string>): Round[] {
  const { rounds, information } = payload.tournamentData;
  if (rounds.some((round) => (round.stage ?? "regular") !== "regular")) {
    throw validation("PadelMix tournaments with playoff rounds cannot be imported yet.");
  }
  const scheduled = rounds
    .filter((round) => round.matches.length > 0)
    .sort((a, b) => a.roundNumber - b.roundNumber);
  if (scheduled.length === 0) {
    throw validation("The PadelMix tournament has no scheduled matches yet.");
  }
  return scheduled.map((round, index) => toRound(round, index + 1, information, ids));
}

function scheduledGames(rounds: Round[], playerId: string): number {
  return rounds.filter((round) =>
    round.matches.some((match) => match.teamA.includes(playerId) || match.teamB.includes(playerId))
  ).length;
}

/** Build an Americano aggregate that keeps PadelMix's schedule and scores (no I/O). */
export function buildPadelMixTournamentState(raw: unknown, organizerId: string): TournamentState {
  assertSupportedFormat(raw);
  const parsed = padelMixPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    throw validation("The PadelMix tournament could not be read. It may use a format we do not support yet.");
  }
  const info = parsed.data.tournamentData.information;
  if (!info.pointsPerRound) {
    throw validation("Only PadelMix tournaments played to a fixed number of points can be imported.");
  }
  const { players, idBySourceId } = buildPlayers(info);
  const rounds = buildRounds(parsed.data, idBySourceId);
  for (const match of rounds.flatMap((round) => round.matches)) {
    if (match.completed) {
      bumpGamesPlayed(players, match, 1);
      awardPoints(players, match, match.scoreA ?? 0, match.scoreB ?? 0);
    }
  }
  const name = info.tournamentName?.trim() ?? "";
  const config: TournamentConfig = {
    name: name.length >= 2 ? name : "PadelMix import",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: players.map((player) => ({ name: player.name, gender: player.gender })),
    courts: info.numberOfCourts,
    pointsPerMatch: info.pointsPerRound,
    scoringMode: "AMERICANO_POINTS",
    targetGamesPerPlayer: Math.max(1, ...players.map((player) => scheduledGames(rounds, player.id))),
    contributeToCareerLeaderboard: true
  };
  const createdAt = new Date().toISOString();
  return {
    id: createId("tournament"),
    config,
    players,
    rounds,
    version: 0,
    leaderboard: buildLeaderboard(players, config.scoringMode, rounds),
    publicToken: createId("public"),
    organizerId,
    createdAt,
    updatedAt: createdAt,
    pendingPlayers: [],
    integrationWaveCount: 0,
    endedAt: null
  };
}
