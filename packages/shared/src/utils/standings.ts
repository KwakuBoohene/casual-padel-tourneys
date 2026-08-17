export interface StandingsLine {
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  gamesWon: number;
  gamesLost: number;
}

export const STANDINGS_COLUMNS = [
  { key: "mp", header: "MP", title: "Matches played" },
  { key: "w", header: "W", title: "Wins" },
  { key: "l", header: "L", title: "Losses" },
  { key: "d", header: "D", title: "Draws" },
  { key: "gw", header: "GW", title: "Games won" },
  { key: "gl", header: "GL", title: "Games lost" },
  { key: "gd", header: "GD", title: "Game difference" }
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
    gd: formatGameDiff(line.gamesWon - line.gamesLost)
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
    gamesLost: input.gamesLost
  };
}

export const STANDINGS_LEGEND =
  "MP matches played · W wins · L losses · D draws · GW games won · GL games lost · GD game difference";
