"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { LiveTournament } from "./LiveTournament";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { formatScoringLabel, type TournamentViewModel } from "./types";

export function TournamentViewer({
  initial,
  apiBaseUrl,
  token
}: {
  initial: TournamentViewModel;
  apiBaseUrl: string;
  token: string;
}) {
  const [connectionState, setConnectionState] = useState({
    connected: true,
    lastUpdate: initial.updatedAt
  });
  const [roundNumber, setRoundNumber] = useState(1);
  const onRoundChange = useCallback((n: number) => setRoundNumber(n), []);

  const scoringLabel = formatScoringLabel(
    String(initial.config.mode),
    initial.config.scoringMode,
    String(initial.config.variant)
  );
  const isMexicano = initial.config.mode === "MEXICANO";

  return (
    <main className="min-h-screen bg-padel-background text-padel-text px-5 py-8 md:px-10 md:py-8">
      <header className="mb-6 space-y-3 max-w-6xl mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-[32px] font-bold tracking-tight text-padel-text">
              {initial.config.name}
            </h1>
            <p className="text-sm text-padel-muted">
              Spectator · {scoringLabel} · Round {roundNumber} · read-only
            </p>
            {isMexicano ? (
              <p className="text-xs text-padel-muted">
                Rounds appear as they are generated — not a fixed bracket.
              </p>
            ) : null}
          </div>
          <Link
            href={`/tournament/${token}/leaderboard`}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-padel-border bg-padel-surface px-4 text-[17px] font-semibold text-padel-text hover:bg-padel-surfaceAlt transition shrink-0"
          >
            Leaderboard
          </Link>
        </div>

        <ConnectionStatus
          connected={connectionState.connected}
          lastUpdate={connectionState.lastUpdate}
          variant={connectionState.connected ? "inline" : "banner"}
        />
      </header>

      <div className="max-w-6xl mx-auto">
        <LiveTournament
          initial={initial}
          token={token}
          apiBaseUrl={apiBaseUrl}
          onConnectionChange={setConnectionState}
          onRoundChange={onRoundChange}
        />
      </div>
    </main>
  );
}
