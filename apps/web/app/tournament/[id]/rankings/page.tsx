import { useParams } from "react-router-dom";
import { usePublicData, DataStatus } from "../../../../lib/usePublicData";
import { KohRankingsClient } from "./KohRankingsClient";
import { isKohPublicHub } from "../kohTypes";
import { publicApiBaseUrl } from "../../../../lib/apiConfig";

export default function KohRankingsPage() {
  const route = useParams<{ id: string }>();
  const state = usePublicData<unknown>(`/public/${encodeURIComponent(route.id!)}`);
  if (state.loading || state.error) return <DataStatus state={state} />;
  if (!state.data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-padel-background text-padel-text px-5">
        <p className="text-padel-danger font-semibold">Tournament not found</p>
      </main>
    );
  }
  const payload = { data: state.data };
  if (!isKohPublicHub(payload.data)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-padel-background text-padel-text px-5">
        <div className="text-center space-y-2">
          <p className="font-semibold">Rankings are for King of the Court events.</p>
          <a href={`/tournament/${route.id}`} className="text-sm text-padel-muted underline">
            Back to live
          </a>
        </div>
      </main>
    );
  }

  return (
    <KohRankingsClient
      token={route.id!}
      apiBaseUrl={publicApiBaseUrl()}
      courtCount={Math.max(1, payload.data.courts.length)}
    />
  );
}
