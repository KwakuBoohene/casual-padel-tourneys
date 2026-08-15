import { KohViewer } from "./KohViewer";
import { isKohPublicHub } from "./kohTypes";
import { TournamentViewer } from "./TournamentViewer";
import type { TournamentViewModel } from "./types";

const defaultApi = "http://localhost:3004";
const internalApiBaseUrl = process.env.INTERNAL_API_BASE_URL ?? process.env.PUBLIC_API_BASE_URL ?? defaultApi;
const publicApiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? defaultApi;

async function getTournament(token: string) {
  const response = await fetch(`${internalApiBaseUrl}/public/${token}`, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { data: unknown };
  return payload.data;
}

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const route = await params;
  const tournament = await getTournament(route.id);
  if (!tournament) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-padel-background text-padel-text px-5">
        <div className="max-w-md w-full rounded-2xl border border-padel-danger/40 bg-padel-danger/10 p-6 space-y-2 text-center">
          <p className="text-sm font-semibold text-padel-danger">Tournament not found</p>
          <p className="text-sm text-padel-muted">
            This share link is invalid or the tournament was removed.
          </p>
        </div>
      </main>
    );
  }

  if (isKohPublicHub(tournament)) {
    return <KohViewer initial={tournament} apiBaseUrl={publicApiBaseUrl} token={route.id} />;
  }

  return (
    <TournamentViewer
      initial={tournament as TournamentViewModel}
      apiBaseUrl={publicApiBaseUrl}
      token={route.id}
    />
  );
}
