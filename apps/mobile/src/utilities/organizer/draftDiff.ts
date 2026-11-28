import type { AmericanoMexicanoDraftPayload } from "@padel/shared";

type Payload = AmericanoMexicanoDraftPayload;
type Field = keyof Payload;
type DraftPlayer = NonNullable<Payload["players"]>[number];

export interface DraftChange {
  field: Field;
  label: string;
  /** Only on "mine": the other person changed this field too, and re-applying overwrites it. */
  overwritesTheirs?: boolean;
}

export interface DraftDiff {
  theirs: DraftChange[];
  mine: DraftChange[];
  /** The latest payload with my changed fields re-applied on top. */
  merged: Payload;
}

const FIELDS: Field[] = [
  "name",
  "mode",
  "variant",
  "players",
  "teams",
  "courts",
  "scoringMode",
  "pointsPerMatch",
  "regularScoring",
  "schedulingMode",
  "targetGamesPerPlayer",
  "tournamentTimeMinutes",
  "contributeToCareerLeaderboard"
];

const FIELD_NAMES: Partial<Record<Field, string>> = {
  mode: "Mode",
  variant: "Format",
  schedulingMode: "Scheduling",
  scoringMode: "Scoring"
};

const same =(a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const named = (players: Payload["players"]) => (players ?? []).map((player) => player.name.trim()).filter(Boolean);
const listNames = (names: string[]) => (names.length > 2 ? `${names.length} players` : names.join(", "));
const plain = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");

function playersLabel(before: Payload["players"], after: Payload["players"]): string {
  const old = new Set(named(before));
  const next = new Set(named(after));
  const added = [...next].filter((name) => !old.has(name));
  const removed = [...old].filter((name) => !next.has(name));
  const parts = [
    added.length ? `added ${listNames(added)}` : "",
    removed.length ? `removed ${listNames(removed)}` : ""
  ].filter(Boolean);
  const text = parts.join(" · ") || "edited player names";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function changeLabel(field: Field, before: Payload, after: Payload): string {
  const value = after[field];
  switch (field) {
    case "name":
      return `Renamed to "${after.name?.trim() || "Untitled"}"`;
    case "players":
      return playersLabel(before.players, after.players);
    case "teams":
      return `Teams → ${after.teams?.length ?? 0}`;
    case "courts":
      return `Courts → ${value ?? "not set"}`;
    case "pointsPerMatch":
      return `Points per match → ${value ?? "not set"}`;
    case "targetGamesPerPlayer":
      return `Games per player → ${value ?? "not set"}`;
    case "tournamentTimeMinutes":
      return `Time → ${value ? `${value} min` : "not set"}`;
    case "regularScoring":
      return "Changed set scoring";
    case "contributeToCareerLeaderboard":
      return after.contributeToCareerLeaderboard === false ? "Off the career leaderboard" : "On the career leaderboard";
    default:
      return `${FIELD_NAMES[field] ?? plain(String(field))} → ${typeof value === "string" ? plain(value) : String(value ?? "not set")}`;
  }
}

/** Players I added / removed applied on top of theirs, so both people's roster edits survive. */
function mergePlayers(base: Payload["players"], latest: Payload["players"], local: Payload["players"]): DraftPlayer[] {
  const baseNames = new Set(named(base));
  const localNames = new Set(named(local));
  const removedByMe = new Set([...baseNames].filter((name) => !localNames.has(name)));
  const kept = (latest ?? []).filter((player) => !removedByMe.has(player.name.trim()));
  const present = new Set(kept.map((player) => player.name.trim()));
  const addedByMe = (local ?? []).filter((player) => {
    const name = player.name.trim();
    return name && !baseNames.has(name) && !present.has(name);
  });
  return [...kept, ...addedByMe];
}

/**
 * Three-way diff for the conflict sheet: `base` is what I last loaded, `latest` what the server has
 * now, `local` my unsaved wizard state. On re-apply my changed fields win.
 */
export function diffDraftPayload(base: Payload, latest: Payload, local: Payload): DraftDiff {
  const theirFields = FIELDS.filter((field) => !same(base[field], latest[field]));
  const myFields = FIELDS.filter((field) => !same(base[field], local[field]));
  const merged: Record<string, unknown> = { ...latest };

  for (const field of myFields) {
    if (field === "players" && theirFields.includes("players")) {
      merged.players = mergePlayers(base.players, latest.players, local.players);
    } else if (local[field] === undefined) {
      delete merged[field];
    } else {
      merged[field] = local[field];
    }
  }

  return {
    theirs: theirFields.map((field) => ({ field, label: changeLabel(field, base, latest) })),
    mine: myFields.map((field) => ({
      field,
      label: changeLabel(field, base, local),
      ...(theirFields.includes(field) && field !== "players" ? { overwritesTheirs: true } : {})
    })),
    merged: merged as Payload
  };
}
