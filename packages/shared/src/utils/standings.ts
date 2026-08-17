export interface StandingsLine {
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
}

export const STANDINGS_COLUMNS = [
  { key: "mp", header: "MP", title: "Matches played" },
  { key: "w", header: "W", title: "Wins" },
  { key: "l", header: "L", title: "Losses" },
  { key: "d", header: "D", title: "Draws (tied Americano matches)" },
  { key: "gw", header: "GW", title: "Games won" },
  { key: "gl", header: "GL", title: "Games lost" },
  { key: "gd", header: "GD", title: "Game difference" },
  { key: "pts", header: "PTS", title: "Points (1 per match win)" }
] as const;

export type StandingsColumnKey = (typeof STANDINGS_COLUMNS)[number]["key"];

export function formatGameDiff(diff: number): string {
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

export function standingsCells(line: StandingsLine): Record<StandingsColumnKey, string> {
  return {
    mp: String(line.matchesPlayed),
    w: String(line.wins),
    l: String(line.losses),
    d: String(line.draws),
    gw: String(line.gamesWon),
    gl: String(line.gamesLost),
    gd: formatGameDiff(line.gamesWon - line.gamesLost),
    pts: String(line.points)
  };
}

export function standingsLineFromRecord(input: {
  wins: number;
  losses: number;
  draws?: number;
  gamesWon: number;
  gamesLost: number;
}): StandingsLine {
  const draws = input.draws ?? 0;
  return {
    matchesPlayed: input.wins + input.losses + draws,
    wins: input.wins,
    losses: input.losses,
    draws,
    gamesWon: input.gamesWon,
    gamesLost: input.gamesLost,
    points: input.wins
  };
}

export const STANDINGS_LEGEND =
  "MP matches played · W wins · L losses · D draws · GW games won · GL games lost · GD game difference · PTS 1 per match win";

export const STANDINGS_HELP_ABBREVIATIONS: { abbrev: string; meaning: string }[] = [
  ...STANDINGS_COLUMNS.map((col) => ({ abbrev: col.header, meaning: col.title })),
  { abbrev: "PW(A)", meaning: "Americano rally points won" },
  { abbrev: "PL(A)", meaning: "Americano rally points lost" }
];

/** Tie-break order after # rank. There is no separate rating number. */
export const STANDINGS_RANKING_STEPS = [
  "PTS — each match won is +1 point. Draws add 0. More match wins rank higher.",
  "Sets won in regular or King of the Court matches.",
  "Regular games won (GW). Americano rally scores are not games.",
  "Americano rally points (PW(A)), if still tied.",
  "Name, A to Z."
] as const;

export const STANDINGS_HELP_BLURB =
  "There is no separate rating. Rank is this table order. Each match win is +1 PTS. A tied Americano match is a draw: it counts in MP and D, and adds 0 PTS. GW and GL are regular games only. GD is games won minus games lost.";
