const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

/** Build `ws(s)://…/ws/tournaments/:id?token=` for API realtime. */
export function buildTournamentWsUrl(tournamentId: string, publicToken: string): string {
  const wsBase = apiBaseUrl.replace(/^http/, "ws");
  return `${wsBase}/ws/tournaments/${tournamentId}?token=${encodeURIComponent(publicToken)}`;
}
