import { KohRankingsClient } from "./KohRankingsClient";
import { isKohPublicHub } from "../kohTypes";
import { internalApiBaseUrl, publicApiBaseUrl } from "../../../../lib/apiConfig";


export default async function KohRankingsPage({ params }: { params: Promise<{ id: string }> }) {
  const route = await params;
  const response = await fetch(`${internalApiBaseUrl()}/public/${route.id}`, { cache: "no-store" });
  if (!response.ok) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-padel-background text-padel-text px-5">
        <p className="text-padel-danger font-semibold">Tournament not found</p>
      </main>
    );
  }
  const payload = (await response.json()) as { data: unknown };
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
      token={route.id}
      apiBaseUrl={publicApiBaseUrl()}
      courtCount={Math.max(1, payload.data.courts.length)}
    />
  );
}
