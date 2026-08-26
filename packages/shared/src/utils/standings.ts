export interface StandingsLine {
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  gamesWon: number;
  gamesLost: number;
  americanoPointsWon: number;
  americanoPointsLost: number;
  points: number;
}

/**
 * A win rate is noise until there is a sample behind it. Either arm qualifies, because the two
 * formats produce very different volumes: a regular match yields many games, while an Americano
 * match records none at all (see `gameWinRate`), so an Americano player only ever qualifies on
 * matches.
 */
export const WIN_RATE_MIN_GAMES = 15;
export const WIN_RATE_MIN_MATCHES = 5;

/** Shown when a rate is not computable. Never `0%`, which reads as "lost everything". */
export const WIN_RATE_UNAVAILABLE = "—";

const WIN_RATE_GATE_NOTE = `needs ${WIN_RATE_MIN_GAMES} games or ${WIN_RATE_MIN_MATCHES} matches`;

export const STANDINGS_COLUMNS = [
  { key: "mp", header: "MP", title: "Matches played" },
  { key: "w", header: "W", title: "Wins" },
  { key: "l", header: "L", title: "Losses" },
  { key: "d", header: "D", title: "Draws (tied Americano matches)" },
  { key: "gw", header: "GW", title: "Games won" },
  { key: "gl", header: "GL", title: "Games lost" },
  { key: "gd", header: "GD", title: "Game difference" },
  { key: "pwa", header: "PW(A)", title: "Americano rally points won" },
  { key: "pla", header: "PL(A)", title: "Americano rally points lost" },
  { key: "pts", header: "PTS", title: "Points (1 per match win)" },
  { key: "mwr", header: "MWR", title: `Match win rate (${WIN_RATE_GATE_NOTE})` },
  { key: "gwr", header: "GWR", title: `Game win rate (${WIN_RATE_GATE_NOTE})` }
] as const;

export type StandingsColumnKey = (typeof STANDINGS_COLUMNS)[number]["key"];

export function isWinRateEligible(line: StandingsLine): boolean {
  return (
    line.gamesWon + line.gamesLost >= WIN_RATE_MIN_GAMES ||
    line.matchesPlayed >= WIN_RATE_MIN_MATCHES
  );
}

/**
 * Match wins ÷ matches played. A draw dilutes exactly like a loss, matching the `points = wins`
 * rule where a draw scores 0. `null` when ineligible or nothing has been played.
 */
export function matchWinRate(line: StandingsLine): number | null {
  if (!isWinRateEligible(line) || line.matchesPlayed === 0) return null;
  return line.wins / line.matchesPlayed;
}

/**
 * Games won ÷ games played. Americano matches record no games, so an Americano-only player is
 * `null` here however many matches they have played — that is correct, not missing data.
 */
export function gameWinRate(line: StandingsLine): number | null {
  const gamesPlayed = line.gamesWon + line.gamesLost;
  if (!isWinRateEligible(line) || gamesPlayed === 0) return null;
  return line.gamesWon / gamesPlayed;
}

/** One decimal always, so the column stays aligned: `100.0%`, not `100%`. */
export function formatWinRate(rate: number | null): string {
  if (rate === null) return WIN_RATE_UNAVAILABLE;
  return `${(rate * 100).toFixed(1)}%`;
}

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
    pwa: String(line.americanoPointsWon),
    pla: String(line.americanoPointsLost),
    pts: String(line.points),
    mwr: formatWinRate(matchWinRate(line)),
    gwr: formatWinRate(gameWinRate(line))
  };
}

export function standingsLineFromRecord(input: {
  wins: number;
  losses: number;
  draws?: number;
  gamesWon: number;
  gamesLost: number;
  americanoPointsWon?: number;
  americanoPointsLost?: number;
}): StandingsLine {
  const draws = input.draws ?? 0;
  return {
    matchesPlayed: input.wins + input.losses + draws,
    wins: input.wins,
    losses: input.losses,
    draws,
    gamesWon: input.gamesWon,
    gamesLost: input.gamesLost,
    americanoPointsWon: input.americanoPointsWon ?? 0,
    americanoPointsLost: input.americanoPointsLost ?? 0,
    points: input.wins
  };
}

export const STANDINGS_LEGEND =
  "MP matches played · W wins · L losses · D draws · GW games won · GL games lost · GD game difference · PW(A) Americano rally points won · PL(A) Americano rally points lost · PTS 1 per match win" +
  ` · MWR match win rate · GWR game win rate (each ${WIN_RATE_GATE_NOTE})`;

export const STANDINGS_HELP_ABBREVIATIONS: { abbrev: string; meaning: string }[] = STANDINGS_COLUMNS.map(
  (col) => ({ abbrev: col.header, meaning: col.title })
);

/** Tie-break order after # rank. There is no separate rating number. */
export const STANDINGS_RANKING_STEPS = [
  "PTS — each match won is +1 point. Draws add 0. More match wins rank higher.",
  "Sets won in regular or King of the Court matches.",
  "Regular games won (GW). Americano rally scores are not games.",
  "Americano rally points (PW(A)), if still tied.",
  "Name, A to Z."
] as const;

export const STANDINGS_HELP_BLURB =
  "There is no separate rating. Rank is this table order. Each match win is +1 PTS. A tied Americano match is a draw: it counts in MP and D, and adds 0 PTS. GW and GL are regular games only. GD is games won minus games lost. PW(A) and PL(A) are Americano rally points." +
  ` MWR is match wins divided by matches played, and a draw counts against it just like a loss. GWR is games won divided by games played, so Americano-only players show ${WIN_RATE_UNAVAILABLE} there because Americano records no games. Both rates appear once you have played ${WIN_RATE_MIN_GAMES} games or ${WIN_RATE_MIN_MATCHES} matches, and show ${WIN_RATE_UNAVAILABLE} until then. Neither rate changes your rank.`;
