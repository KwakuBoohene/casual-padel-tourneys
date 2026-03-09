import { LiveTournament } from "./LiveTournament";

const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:3001";

interface TournamentViewModel {
  id: string;
  config: { name: string; mode: string; variant: string };
  updatedAt: string;
  leaderboard: Array<{ name: string; totalPoints: number; rank: number }>;
  rounds: Array<{
    id: string;
    roundNumber: number;
    matches: Array<{
      id: string;
      court: number;
      teamA: [string, string];
      teamB: [string, string];
      scoreA?: number;
      scoreB?: number;
    }>;
  }>;
}

async function getTournament(token: string) {
  const response = await fetch(`${apiBaseUrl}/public/${token}`, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { data: TournamentViewModel };
  return payload.data;
}

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const route = await params;
  const tournament = await getTournament(route.id);
  if (!tournament) {
    return <p>Tournament not found for token: {route.id}</p>;
  }
  return (
    <main>
      <h1>{tournament.config.name}</h1>
      <p>
        {tournament.config.mode} / {tournament.config.variant}
      </p>
      <LiveTournament initial={tournament} apiBaseUrl={apiBaseUrl} />
    </main>
  );
}
