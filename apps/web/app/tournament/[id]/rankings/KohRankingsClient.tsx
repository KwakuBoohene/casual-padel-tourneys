"use client";

import { useEffect, useState } from "react";
import type { KohRankingRow, KohRankingsBoard } from "@padel/shared";

function formatStats(row: KohRankingRow): string {
  const diff = row.gameDiff > 0 ? `+${row.gameDiff}` : String(row.gameDiff);
  const special = row.specialLosses > 0 ? ` G-lost ${row.specialLosses}` : "";
  return `${row.matchesWon}-${row.matchesLost} ${diff}${special}`;
}

export function KohRankingsClient(props: {
  token: string;
  apiBaseUrl: string;
  courtCount: number;
}) {
  const [scope, setScope] = useState<"court" | "all">("court");
  const [courtNumber, setCourtNumber] = useState(1);
  const [board, setBoard] = useState<KohRankingsBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const query = scope === "court" ? `?courtNumber=${courtNumber}` : "";
      try {
        const response = await fetch(`${props.apiBaseUrl}/public/${props.token}/rankings${query}`, {
          cache: "no-store"
        });
        if (!response.ok) throw new Error("Could not load rankings.");
        const payload = (await response.json()) as { data: KohRankingsBoard };
        if (!cancelled) setBoard(payload.data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [props.apiBaseUrl, props.token, scope, courtNumber]);

  return (
    <main className="min-h-screen bg-padel-background text-padel-text px-5 py-8 md:px-10">
      <div className="max-w-2xl mx-auto space-y-4">
        <a href={`/tournament/${props.token}`} className="text-sm font-semibold text-padel-muted">
          ← Live
        </a>
        <h1 className="text-2xl font-bold">Rankings</h1>
        <p className="text-sm text-padel-muted">Spectator · read-only</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setScope("court")}
            className={`flex-1 min-h-12 rounded-full font-semibold ${
              scope === "court"
                ? "bg-padel-primary text-padel-onPrimary"
                : "border border-padel-border bg-padel-surface"
            }`}
          >
            Court {courtNumber}
          </button>
          <button
            type="button"
            onClick={() => setScope("all")}
            className={`flex-1 min-h-12 rounded-full font-semibold ${
              scope === "all"
                ? "bg-padel-primary text-padel-onPrimary"
                : "border border-padel-border bg-padel-surface"
            }`}
          >
            All courts
          </button>
        </div>
        {scope === "court" && props.courtCount > 1 ? (
          <div className="flex gap-2 overflow-x-auto">
            {Array.from({ length: props.courtCount }, (_, index) => index + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCourtNumber(n)}
                className={`min-h-10 px-3 rounded-full text-sm font-semibold shrink-0 ${
                  courtNumber === n
                    ? "bg-padel-primary text-padel-onPrimary"
                    : "border border-padel-border"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        ) : null}
        {loading ? <p className="text-padel-muted">Loading…</p> : null}
        {error ? <p className="text-padel-danger">{error}</p> : null}
        <ul className="space-y-3">
          {(board?.rows ?? []).map((row) => (
            <li
              key={row.unitId}
              className={`rounded-2xl border p-4 flex gap-3 items-center ${
                row.weakest ? "border-padel-primary" : "border-padel-border bg-padel-surface"
              }`}
            >
              <span className="text-padel-muted font-bold w-7">{row.rank}</span>
              <div className="flex-1">
                <p className="font-bold">
                  {row.playerAName} / {row.playerBName}
                </p>
                <p className="text-sm text-padel-muted">{formatStats(row)}</p>
              </div>
              {row.weakest ? (
                <span className="text-xs font-bold text-padel-primary">weakest</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
