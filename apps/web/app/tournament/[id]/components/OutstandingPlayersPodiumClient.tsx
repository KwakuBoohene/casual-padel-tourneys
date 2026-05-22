"use client";

import { OutstandingPlayersPodium as OutstandingPlayersPodiumView } from "./OutstandingPlayersPodium";
import type { OutstandingPlayerRow } from "./outstandingPlayers";

export function OutstandingPlayersPodiumClient({
  players,
  title,
  leaderboardHref,
  ctaLabel
}: {
  players: OutstandingPlayerRow[];
  title?: string;
  leaderboardHref?: string;
  ctaLabel?: string;
}) {
  return (
    <OutstandingPlayersPodiumView
      players={players}
      title={title}
      leaderboardHref={leaderboardHref}
      ctaLabel={ctaLabel}
    />
  );
}
