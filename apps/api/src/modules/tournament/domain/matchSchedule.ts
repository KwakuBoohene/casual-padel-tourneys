import {
  formatMatchScore,
  isMatchVoided,
  type Match,
  type MatchScheduleDocument,
  type MatchScheduleResult,
  type MatchScheduleRound,
  type RegularScoringConfig,
  type TournamentConfig
} from "@padel/shared";

import type { TournamentState } from "../../../types/state.js";

const VARIANT_LABEL: Record<string, string> = { CLASSIC: "Classic", MIXED: "Mixed", TEAM: "Team" };
const MODE_LABEL: Record<string, string> = { AMERICANO: "Americano", MEXICANO: "Mexicano" };

function formatLabel(config: TournamentConfig): string {
  const mode = MODE_LABEL[config.mode] ?? config.mode;
  return `${VARIANT_LABEL[config.variant] ?? config.variant} ${mode}`;
}

function regularTarget(config: RegularScoringConfig | undefined): string {
  if (!config) return "Regular scoring";
  if (config.setFormat === "BO3_GAMES") return "Best of 3 games";
  if (config.setFormat === "BO5_GAMES") return "Best of 5 games";
  return config.gameWinBy === 2 ? "Full set" : "Set to 6";
}

/** What every match on the sheet is played to. */
export function matchTargetLabel(config: TournamentConfig): string {
  if ((config.scoringMode ?? "AMERICANO_POINTS") === "REGULAR") {
    return regularTarget(config.regularScoring);
  }
  return config.pointsPerMatch ? `First to ${config.pointsPerMatch}` : "Americano points";
}

function resultFor(match: Match, config: TournamentConfig): MatchScheduleResult {
  if (isMatchVoided(match)) return { kind: "text", value: "Void" };
  if (!match.completed) return { kind: "blank" };
  if ((config.scoringMode ?? "AMERICANO_POINTS") !== "REGULAR") {
    if (match.scoreA === undefined || match.scoreB === undefined) return { kind: "blank" };
    return { kind: "points", a: String(match.scoreA), b: String(match.scoreB) };
  }
  const score = formatMatchScore(match, "REGULAR");
  return score ? { kind: "text", value: score } : { kind: "blank" };
}

function dateLabels(iso: string): { dateLabel: string; shortDateLabel: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { dateLabel: "", shortDateLabel: "" };
  // Events are local to the venue; UTC matches the Africa/Accra reporting day the app uses.
  const long = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
  const short = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
  return { dateLabel: long.format(date).replace(/^(\w+) /, "$1, "), shortDateLabel: short.format(date) };
}

function buildRound(
  round: TournamentState["rounds"][number],
  state: TournamentState,
  names: Map<string, string>
): MatchScheduleRound {
  const name = (id: string): string => names.get(id) ?? id;
  const matches = [...round.matches].sort((a, b) => a.court - b.court);
  const onCourt = new Set(matches.flatMap((match) => [...match.teamA, ...match.teamB]));
  return {
    roundNumber: round.roundNumber,
    courts: matches.map((match) => ({
      label: `COURT ${match.court}`,
      teamA: [name(match.teamA[0]), name(match.teamA[1])],
      teamB: [name(match.teamB[0]), name(match.teamB[1])],
      result: resultFor(match, state.config)
    })),
    sittingOut: state.players.filter((player) => !onCourt.has(player.id)).map((player) => player.name)
  };
}

/**
 * The printable round-by-round matchups. Pure: reads tournament state, returns the document the
 * PDF renderer draws. Only rounds that exist are listed — Mexicano generates them as it goes.
 */
export function buildMatchSchedule(state: TournamentState): MatchScheduleDocument {
  const names = new Map(state.players.map((player) => [player.id, player.name]));
  const rounds = [...state.rounds]
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map((round) => buildRound(round, state, names));
  const matchTarget = matchTargetLabel(state.config);
  return {
    title: state.config.name,
    ...dateLabels(state.createdAt),
    facts: [
      { label: "Format", value: formatLabel(state.config) },
      { label: "Players", value: String(state.players.length) },
      { label: "Courts", value: String(state.config.courts) },
      { label: "Rounds", value: String(rounds.length) },
      { label: "Each match", value: matchTarget }
    ],
    matchTarget,
    rounds
  };
}
