import { AMERICANO_MIN_TEAMS } from "../americano/teams.js";
import { MEXICANO_MIN_PLAYERS, MEXICANO_MIN_TEAMS } from "../mexicano/ladder.js";
import type { AmericanoMexicanoDraftPayload, KohDraftPayload } from "../schemas/tournamentDraft.js";
import { namedPlayers, startedPairs } from "./createBodies.js";

export type DraftReadinessKey = "name" | "format" | "courts" | "scoring" | "players";
export type DraftReadinessStatus = "ok" | "missing";

export interface DraftReadinessItem {
  key: DraftReadinessKey;
  label: string;
  status: DraftReadinessStatus;
}

const AMERICANO_MIN_PLAYERS = 4;
const KOH_MIN_PAIRS_PER_COURT = 2;

const ok = (key: DraftReadinessKey, label: string): DraftReadinessItem => ({ key, label, status: "ok" });
const missing = (key: DraftReadinessKey, label: string): DraftReadinessItem => ({ key, label, status: "missing" });
const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;
const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

export function nameItem(name: string | undefined): DraftReadinessItem {
  const trimmed = (name ?? "").trim();
  return trimmed.length >= 2 ? ok("name", trimmed) : missing("name", "Add a tournament name");
}

export function courtsItem(courts: number | undefined): DraftReadinessItem {
  return courts ? ok("courts", plural(courts, "court")) : missing("courts", "Set the number of courts");
}

function regularScoringLabel(scoring: AmericanoMexicanoDraftPayload["regularScoring"]): string | null {
  if (!scoring?.setFormat || !scoring.setsToWin) return null;
  return `Regular scoring · first to ${plural(scoring.setsToWin, "set")}`;
}

export function americanoMexicanoFormatItem(payload: AmericanoMexicanoDraftPayload): DraftReadinessItem {
  if (!payload.variant || !payload.schedulingMode) return missing("format", "Choose a format");
  return ok("format", `${titleCase(payload.mode)} · ${titleCase(payload.variant)}`);
}

export function americanoMexicanoScoringItem(payload: AmericanoMexicanoDraftPayload): DraftReadinessItem {
  const isMexicano = payload.mode === "MEXICANO";
  if (!isMexicano && payload.schedulingMode === "TARGET_GAMES" && !payload.targetGamesPerPlayer)
    return missing("scoring", "Set games per player");
  if (!isMexicano && payload.schedulingMode === "TOTAL_TIME" && !payload.tournamentTimeMinutes)
    return missing("scoring", "Set the tournament length");
  if ((payload.scoringMode ?? "AMERICANO_POINTS") === "REGULAR") {
    const label = regularScoringLabel(payload.regularScoring);
    return label ? ok("scoring", label) : missing("scoring", "Choose a set format");
  }
  if (!payload.pointsPerMatch) return missing("scoring", "Set points per match");
  const games = payload.targetGamesPerPlayer ? ` · ${plural(payload.targetGamesPerPlayer, "game")} each` : "";
  return ok("scoring", `To ${payload.pointsPerMatch} points${games}`);
}

export function americanoMexicanoPlayersItem(payload: AmericanoMexicanoDraftPayload): DraftReadinessItem {
  const isMexicano = payload.mode === "MEXICANO";
  if (payload.variant === "TEAM") {
    const pairs = startedPairs(payload.teams);
    const complete = pairs.filter((pair) => pair.playerA.name && pair.playerB.name).length;
    const needed = isMexicano ? MEXICANO_MIN_TEAMS : AMERICANO_MIN_TEAMS;
    if (complete < pairs.length) return missing("players", "Finish every team (two players each)");
    if (complete < needed) return missing("players", `Add ${plural(needed - complete, "more team")} to start`);
    return ok("players", `${plural(complete, "team")}`);
  }
  const players = namedPlayers(payload.players);
  const needed = isMexicano ? MEXICANO_MIN_PLAYERS : AMERICANO_MIN_PLAYERS;
  if (players.length < needed) {
    return missing("players", `Add ${plural(needed - players.length, "more player")} to start`);
  }
  if (payload.variant === "MIXED") {
    const withoutGender = players.filter((player) => !player.gender).length;
    if (withoutGender > 0) return missing("players", `Set gender for ${plural(withoutGender, "player")}`);
  }
  return ok("players", plural(players.length, "player"));
}

export function kohScoringItem(payload: KohDraftPayload): DraftReadinessItem {
  const label = regularScoringLabel(payload.regularScoring);
  return label ? ok("scoring", label) : missing("scoring", "Choose a match format");
}

export function kohPlayersItem(payload: KohDraftPayload): DraftReadinessItem {
  const courts = payload.courts ?? 0;
  const assignments = payload.courtAssignments ?? [];
  const names: string[] = [];
  let pairs = 0;
  for (let courtNumber = 1; courtNumber <= courts; courtNumber += 1) {
    const units = startedPairs(assignments.find((court) => court.courtNumber === courtNumber)?.units);
    if (units.some((unit) => !unit.playerA.name || !unit.playerB.name))
      return missing("players", `Finish every pair on court ${courtNumber}`);
    if (units.length < KOH_MIN_PAIRS_PER_COURT)
      return missing("players", `Court ${courtNumber} needs at least ${KOH_MIN_PAIRS_PER_COURT} pairs`);
    pairs += units.length;
    for (const unit of units) names.push(unit.playerA.name.toLowerCase(), unit.playerB.name.toLowerCase());
  }
  if (courts === 0) return missing("players", "Add pairs to each court");
  if (new Set(names).size !== names.length) return missing("players", "Each player can only appear once");
  return ok("players", plural(pairs, "pair"));
}
