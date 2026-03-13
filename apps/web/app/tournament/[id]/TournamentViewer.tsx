"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { LiveTournament } from "./LiveTournament";

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

export function TournamentViewer({ initial, apiBaseUrl }: { initial: TournamentViewModel; apiBaseUrl: string }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();

  const handleOpenLeaderboard = () => {
    setSettingsOpen(false);
    router.push(`/tournament/${initial.id}/leaderboard`);
  };

  return (
    <main className="min-h-screen bg-padel-background text-padel-text px-4 py-6 md:px-10 md:py-10">
      <header className="mb-8 border-b border-padel-border pb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-padel-muted mb-1">Casual Padel Tourneys</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{initial.config.name}</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-padel-muted">
            {initial.config.mode} / {initial.config.variant}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-padel-muted">
          <span>Public viewer</span>
          <button
            type="button"
            aria-label="Open viewer menu"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-padel-border bg-padel-surface hover:bg-padel-surfaceAlt transition"
          >
            <span className="sr-only">Open menu</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 text-padel-muted"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            >
              <path
                d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm7.438-3.5a7.44 7.44 0 0 0-.093-1l1.902-1.486a.75.75 0 0 0 .18-.955l-1.8-3.118a.75.75 0 0 0-.908-.34l-2.24.896a7.52 7.52 0 0 0-1.732-1l-.34-2.39A.75.75 0 0 0 13.7 2h-3.4a.75.75 0 0 0-.743.632l-.34 2.39a7.52 7.52 0 0 0-1.732 1l-2.24-.896a.75.75 0 0 0-.908.34l-1.8 3.118a.75.75 0 0 0 .18.955L4.655 11a7.44 7.44 0 0 0 0 2L2.753 14.486a.75.75 0 0 0-.18.955l1.8 3.118a.75.75 0 0 0 .908.34l2.24-.896a7.52 7.52 0 0 0 1.732 1l.34 2.39A.75.75 0 0 0 10.3 22h3.4a.75.75 0 0 0 .743-.632l.34-2.39a7.52 7.52 0 0 0 1.732-1l2.24.896a.75.75 0 0 0 .908-.34l1.8-3.118a.75.75 0 0 0-.18-.955L19.345 13a7.44 7.44 0 0 0 .093-1Z"
              />
            </svg>
          </button>
        </div>
      </header>

      <LiveTournament initial={initial} apiBaseUrl={apiBaseUrl} />

      {settingsOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xs rounded-2xl bg-padel-surface border border-padel-border p-4 space-y-3">
            <h2 className="text-sm font-semibold text-padel-text">Viewer menu</h2>
            <button
              type="button"
              onClick={handleOpenLeaderboard}
              className="w-full rounded-xl bg-padel-primary text-padel-background text-sm font-semibold py-2"
            >
              Leaderboard
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="w-full rounded-xl border border-padel-border text-padel-text text-sm font-semibold py-2 bg-padel-surfaceAlt"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

