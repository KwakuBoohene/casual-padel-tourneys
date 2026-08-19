import { buildLeaderboardExport, type ExportTable } from "@padel/shared";

import type { TournamentState } from "../../../types/state.js";
import { buildTournamentExportRows } from "../domain/exportRows.js";

function scoringLabel(tournament: TournamentState): string {
  if ((tournament.config.scoringMode ?? "AMERICANO_POINTS") === "REGULAR") {
    return "Regular scoring";
  }
  return "Americano scoring";
}

function subtitleFor(tournament: TournamentState): string {
  const roundCount = tournament.rounds.length;
  const parts = [
    scoringLabel(tournament),
    `${roundCount} round${roundCount === 1 ? "" : "s"}`
  ];
  if (tournament.endedAt) {
    parts.push("completed");
  }
  return parts.join(" \u00b7 ");
}

/** Format-neutral table for one tournament's leaderboard. */
export function buildTournamentExportTable(tournament: TournamentState): ExportTable {
  return buildLeaderboardExport(buildTournamentExportRows(tournament), {
    title: tournament.config.name,
    subtitle: subtitleFor(tournament)
  });
}
