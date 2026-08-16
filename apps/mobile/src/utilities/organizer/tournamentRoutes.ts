/** Expo Router paths for Americano / Mexicano organizer tournament surfaces. */

export function tournamentLivePath(tournamentId: string, edit = false): string {
  return edit ? `/tournaments/${tournamentId}?edit=1` : `/tournaments/${tournamentId}`;
}

export function tournamentLeaderboardPath(tournamentId: string): string {
  return `/tournaments/${tournamentId}/leaderboard`;
}

export function tournamentPlayerGamesPath(tournamentId: string, playerId: string): string {
  return `/tournaments/${tournamentId}/players/${playerId}`;
}
