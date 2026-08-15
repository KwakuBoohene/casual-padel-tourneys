"use client";

import { useEffect, useState } from "react";

import { ConnectionStatus } from "./components/ConnectionStatus";
import { KohCourtCard } from "./KohCourtCard";
import { isKohPublicHub, type KohPublicHub } from "./kohTypes";

export function KohViewer({
  initial,
  apiBaseUrl,
  token
}: {
  initial: KohPublicHub;
  apiBaseUrl: string;
  token: string;
}) {
  const [hub, setHub] = useState(initial);
  const [connected, setConnected] = useState(true);
  const [courtIndex, setCourtIndex] = useState(0);
  const court = hub.courts[courtIndex] ?? hub.courts[0];

  useEffect(() => {
    const wsBase = apiBaseUrl.replace(/^http/, "ws");
    const socket = new WebSocket(
      `${wsBase}/ws/tournaments/${initial.id}?token=${encodeURIComponent(token)}`
    );

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as {
          payload?: { payload?: unknown; type?: string };
        };
        const next = parsed?.payload?.payload;
        if (isKohPublicHub(next)) {
          setHub(next);
          setConnected(true);
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => socket.close();
  }, [apiBaseUrl, initial.id, token]);

  return (
    <main className="min-h-screen bg-padel-background text-padel-text px-5 py-8 md:px-10">
      <header className="mb-6 space-y-3 max-w-6xl mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-[32px] font-bold tracking-tight">{hub.config.name}</h1>
            <p className="text-sm text-padel-muted">Spectator · read-only · Winner-stays</p>
          </div>
          <a
            href={`/tournament/${token}/rankings`}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-padel-border bg-padel-surface px-4 text-[17px] font-semibold hover:bg-padel-surfaceAlt transition shrink-0"
          >
            Rankings
          </a>
        </div>
        <ConnectionStatus
          connected={connected}
          lastUpdate={hub.updatedAt}
          variant={connected ? "inline" : "banner"}
        />
      </header>

      {/* Mobile: single court pager */}
      <div className="max-w-lg mx-auto md:hidden space-y-4">
        {hub.courts.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {hub.courts.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setCourtIndex(index)}
                className={`min-h-12 px-4 rounded-full border text-sm font-semibold shrink-0 ${
                  index === courtIndex
                    ? "bg-padel-primary text-padel-onPrimary border-padel-primary"
                    : "bg-padel-surface text-padel-text border-padel-border"
                }`}
              >
                Court {entry.courtNumber}
              </button>
            ))}
          </div>
        ) : null}
        {court ? <KohCourtCard court={court} /> : null}
      </div>

      {/* Desktop: court columns */}
      <div className="hidden md:grid max-w-6xl mx-auto grid-cols-2 lg:grid-cols-3 gap-4">
        {hub.courts.map((entry) => (
          <KohCourtCard key={entry.id} court={entry} />
        ))}
      </div>

      <p className="max-w-6xl mx-auto mt-8 text-xs text-padel-muted">
        No edit / score / swap controls on spectator link.
      </p>
    </main>
  );
}
