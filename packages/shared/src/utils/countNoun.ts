/** English count nouns: 1 is singular; 0 and 2+ are plural. */
export function noun(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function countNoun(count: number, singular: string, plural: string): string {
  return `${count} ${noun(count, singular, plural)}`;
}

export function formatWonLost(won: number, lost: number): string {
  return `${won}–${lost}`;
}

/** W–L record; singular when exactly one contest is in the record. */
export function wonLostNoun(won: number, lost: number, singular: string, plural: string): string {
  return `${formatWonLost(won, lost)} ${noun(won + lost, singular, plural)}`;
}

export function formatCareerStandings(row: {
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
}): string {
  return [
    wonLostNoun(row.matchesWon, row.matchesLost, "match", "matches"),
    wonLostNoun(row.setsWon, row.setsLost, "set", "sets"),
    wonLostNoun(row.gamesWon, row.gamesLost, "game", "games")
  ].join(" · ");
}

export function formatRegularStandings(row: {
  wins: number;
  losses: number;
  setsWon?: number;
  gamesWon?: number;
}): string {
  return [
    wonLostNoun(row.wins, row.losses, "match", "matches"),
    countNoun(row.setsWon ?? 0, "set", "sets"),
    countNoun(row.gamesWon ?? 0, "game", "games")
  ].join(" · ");
}
