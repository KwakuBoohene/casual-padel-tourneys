import type { TournamentDraftSummary } from "@padel/shared";

import { formatTournamentMode } from "./formatLabels";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** "Americano · 10 players · 3 courts" */
export function draftMetaLabel(draft: TournamentDraftSummary): string {
  const parts = [formatTournamentMode(draft.mode)];
  parts.push(draft.playerCount > 0 ? plural(draft.playerCount, "player") : "no players yet");
  if (draft.courts) parts.push(plural(draft.courts, "court"));
  return parts.join(" · ");
}

/** "5m ago" style, for list footers. */
export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

/** "Edited 2h ago by Sam" / "Owner Ama · edited 5m ago" for shared drafts. */
export function draftFooterLabel(draft: TournamentDraftSummary, now = Date.now()): string {
  const when = relativeTime(draft.updatedAt, now);
  if (draft.role === "EDITOR") {
    const owner = draft.collaborators[0]?.name;
    return owner ? `Owner ${owner} · edited ${when}` : `Edited ${when}`;
  }
  return `Edited ${when} by ${draft.updatedBy.name}`;
}
