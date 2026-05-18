"use client";

import Link from "next/link";

import { ThemeToggle } from "./ThemeToggle";

interface LeaderboardHeaderActionsProps {
  tournamentId: string;
}

export function LeaderboardHeaderActions({ tournamentId }: LeaderboardHeaderActionsProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-padel-muted">
      <ThemeToggle />
      <Link
        href={`/tournament/${tournamentId}`}
        className="inline-flex items-center gap-2 rounded-full border border-padel-border px-4 py-2 bg-padel-surface hover:bg-padel-surfaceAlt transition"
      >
        <span className="text-[10px] uppercase tracking-[0.2em]">Back to live view</span>
      </Link>
    </div>
  );
}
