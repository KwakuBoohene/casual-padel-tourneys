import { useParams } from "react-router-dom";
import { usePublicData, DataStatus } from "../../../lib/usePublicData";
import { KohViewer } from "./KohViewer";
import { isKohPublicHub } from "./kohTypes";
import { TournamentViewer } from "./TournamentViewer";
import type { TournamentViewModel } from "./types";
import { publicApiBaseUrl } from "../../../lib/apiConfig";

export default function TournamentPage() {
  const route = useParams<{ id: string }>();
  const state = usePublicData<unknown>(`/public/${encodeURIComponent(route.id!)}`);
  if (state.loading || state.error) return <DataStatus state={state} />;
  const tournament = state.data;
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
    return <KohViewer initial={tournament} apiBaseUrl={publicApiBaseUrl()} token={route.id!} />;
  }

  return (
    <TournamentViewer
      initial={tournament as TournamentViewModel}
      apiBaseUrl={publicApiBaseUrl()}
      token={route.id!}
    />
  );
}
