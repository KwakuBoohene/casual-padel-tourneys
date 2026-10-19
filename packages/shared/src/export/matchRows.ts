import { isMatchVoided } from "../scoring/matchVoid.js";
import type { Match, MatchSet, ScoringMode } from "../types/domain.js";
import type { ExportSection } from "./exportTable.js";

export const TOURNAMENT_MATCH_HEADERS = [
  "Round",
  "Court",
  "Team A",
  "Team B",
  "Score",
  "Status"
] as const;

export type MatchStatusLabel = "Completed" | "Void" | "Not played";

export function matchStatusLabel(match: Pick<Match, "completed" | "voidedAt">): MatchStatusLabel {
  // Void wins: an abandoned match is never a result, whatever was entered before it stopped.
  if (isMatchVoided(match)) return "Void";
  return match.completed ? "Completed" : "Not played";
}

function formatSets(sets: MatchSet[] | undefined): string {
  if (!sets?.length) return "";
  return sets
    .map((set) => {
      const tb =
        set.tbA !== undefined && set.tbB !== undefined ? `(${set.tbA}-${set.tbB})` : "";
      return `${set.gamesA}-${set.gamesB}${tb}`;
    })
    .join(" ");
}

/**
 * Score as an organizer would read it. A voided match shows nothing — showing the partial score
 * it stopped at would present a result nobody played.
 */
export function formatMatchScore(
  match: Pick<Match, "completed" | "voidedAt" | "scoreA" | "scoreB" | "sets" | "matchTbA" | "matchTbB">,
  scoringMode: ScoringMode | undefined
): string {
  if (isMatchVoided(match)) return "";
  if ((scoringMode ?? "AMERICANO_POINTS") === "REGULAR") {
    const sets = formatSets(match.sets);
    const matchTb =
      match.matchTbA !== undefined && match.matchTbB !== undefined
        ? `TB ${match.matchTbA}-${match.matchTbB}`
        : "";
    return [sets, matchTb].filter(Boolean).join(" ");
  }
  if (match.scoreA === undefined || match.scoreB === undefined) return "";
  return `${match.scoreA}-${match.scoreB}`;
}

export interface TournamentMatchesInput {
  rounds: Array<{
    roundNumber: number;
    matches: Array<
      Pick<
        Match,
        "court" | "teamA" | "teamB" | "completed" | "voidedAt" | "scoreA" | "scoreB" | "sets" | "matchTbA" | "matchTbB"
      >
    >;
  }>;
  playerNameById: Map<string, string>;
  scoringMode?: ScoringMode;
  heading?: string;
}

function teamLabel(ids: readonly string[], names: Map<string, string>): string {
  return ids.map((id) => names.get(id) ?? id).join(" / ");
}

/** Every match of the night, in the order it was played: round, then court. */
export function buildTournamentMatchesSection(input: TournamentMatchesInput): ExportSection {
  const rows = input.rounds
    .slice()
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .flatMap((round) =>
      round.matches
        .slice()
        .sort((a, b) => a.court - b.court)
        .map((match) => [
          String(round.roundNumber),
          String(match.court),
          teamLabel(match.teamA, input.playerNameById),
          teamLabel(match.teamB, input.playerNameById),
          formatMatchScore(match, input.scoringMode),
          matchStatusLabel(match)
        ])
    );

  return {
    heading: input.heading ?? "Rounds and matches",
    headers: [...TOURNAMENT_MATCH_HEADERS],
    rows
  };
}

export const TOURNAMENT_SUMMARY_HEADERS = [
  "Date",
  "Tournament",
  "Mode",
  "Players",
  "Matches"
] as const;

export interface TournamentSummaryInput {
  tournamentId: string;
  tournamentName: string;
  tournamentMode: string;
  matchId: string;
  playerName: string;
  occurredAt: string;
}

/**
 * One row per event behind an account leaderboard. Built from the credited matches already
 * fetched, so listing the events costs no extra query.
 *
 * `Matches` counts **distinct match ids**, not credit rows — one match writes a row per player,
 * and a player with no career identity writes none, so any per-row arithmetic would be wrong.
 */
export function buildTournamentsSection(
  rows: TournamentSummaryInput[],
  heading = "Tournaments"
): ExportSection {
  const byTournament = new Map<
    string,
    { name: string; mode: string; players: Set<string>; matches: Set<string>; latest: string }
  >();

  for (const row of rows) {
    const existing = byTournament.get(row.tournamentId);
    if (existing) {
      existing.players.add(row.playerName);
      existing.matches.add(row.matchId);
      if (row.occurredAt > existing.latest) existing.latest = row.occurredAt;
      continue;
    }
    byTournament.set(row.tournamentId, {
      name: row.tournamentName,
      mode: row.tournamentMode,
      players: new Set([row.playerName]),
      matches: new Set([row.matchId]),
      latest: row.occurredAt
    });
  }

  const ordered = [...byTournament.values()].sort((a, b) => b.latest.localeCompare(a.latest));
  return {
    heading,
    headers: [...TOURNAMENT_SUMMARY_HEADERS],
    rows: ordered.map((event) => [
      event.latest.slice(0, 10),
      event.name,
      event.mode,
      String(event.players.size),
      String(event.matches.size)
    ])
  };
}
