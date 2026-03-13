import { TournamentViewer } from "./TournamentViewer";

const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:3001";

interface TournamentViewModel {
  id: string;
  config: { name: string; mode: string; variant: string };
  updatedAt: string;
  players: Array<{ id: string; name: string }>;
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
    return (
      <main className="min-h-screen flex items-center justify-center bg-padel-background text-padel-text">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-padel-muted">Casual Padel Tourneys</p>
          <p className="text-sm text-padel-muted">Tournament not found for token: {route.id}</p>
        </div>
      </main>
    );
  }
  return <TournamentViewer initial={tournament} apiBaseUrl={apiBaseUrl} />;
}
