import type { TournamentDraftSummary } from "@padel/shared";

import type { LiveTournamentState } from "../../types/organizer/tournament";

export type TournamentListRow =
  | { type: "label"; id: string; label: string }
  | { type: "draft"; id: string; draft: TournamentDraftSummary }
  | { type: "tournament"; id: string; tournament: LiveTournamentState; status: "LIVE" | "COMPLETED" };

export function isActiveTournament(tournament: LiveTournamentState): boolean {
  if (tournament.config.mode === "KING_OF_THE_COURT") return !tournament.endedAt;
  if (tournament.config.mode === "MEXICANO") return !tournament.endedAt;
  return !tournament.rounds.every((round) => round.matches.every((match) => match.completed));
}

/** Drafts, then drafts shared with you, then live and completed tournaments (Figma 01 · `3:5`). */
export function buildTournamentListRows(input: {
  tournaments: LiveTournamentState[];
  ownDrafts: TournamentDraftSummary[];
  sharedDrafts: TournamentDraftSummary[];
}): TournamentListRow[] {
  const rows: TournamentListRow[] = [];
  const drafts = (label: string, list: TournamentDraftSummary[]) => {
    if (list.length === 0) return;
    rows.push({ type: "label", id: `label:${label}`, label });
    for (const draft of list) rows.push({ type: "draft", id: `draft:${draft.id}`, draft });
  };
  drafts(`DRAFTS · ${input.ownDrafts.length}`, input.ownDrafts);
  drafts("SHARED WITH YOU", input.sharedDrafts);

  const live = input.tournaments.filter(isActiveTournament);
  const done = input.tournaments.filter((tournament) => !isActiveTournament(tournament));
  if (rows.length > 0 && input.tournaments.length > 0)
    rows.push({ type: "label", id: "label:tournaments", label: "TOURNAMENTS" });
  for (const tournament of live) rows.push({ type: "tournament", id: tournament.id, tournament, status: "LIVE" });
  for (const tournament of done) rows.push({ type: "tournament", id: tournament.id, tournament, status: "COMPLETED" });
  return rows;
}
