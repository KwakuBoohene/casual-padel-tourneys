import {
  buildLeaderboardSection,
  buildTournamentMatchesSection,
  type ExportScope,
  type ExportTable
} from "@padel/shared";

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

/**
 * The whole night in one document: final standings, then every match and score. King of the
 * Court is not routed here — it has no Round/Match aggregate to list.
 */
export function buildTournamentExportTable(
  tournament: TournamentState,
  scope: ExportScope = "full"
): ExportTable {
  const playerNameById = new Map(tournament.players.map((player) => [player.id, player.name]));
  const leaderboard = buildLeaderboardSection(
    buildTournamentExportRows(tournament),
    scope === "full" ? "Leaderboard" : undefined
  );
  if (scope === "leaderboard") {
    return { title: tournament.config.name, subtitle: subtitleFor(tournament), sections: [leaderboard] };
  }
  return {
    title: tournament.config.name,
    subtitle: subtitleFor(tournament),
    sections: [
      leaderboard,
      buildTournamentMatchesSection({
        rounds: tournament.rounds,
        playerNameById,
        scoringMode: tournament.config.scoringMode
      })
    ]
  };
}
