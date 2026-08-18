import type { RegularScoringConfig } from "@padel/shared";
import { deuceModeLabel } from "@padel/shared";

import type { KohTournamentHub } from "../../types/koh/create";
import type { LiveTournamentState } from "../../types/organizer/tournament";
import {
  formatSchedulingMode,
  formatScoringLabel,
  formatTournamentMode,
  formatTournamentModeVariant
} from "./formatLabels";

export interface ConfigSummaryRow {
  label: string;
  value: string;
}

function formatRegularSetFormat(config: RegularScoringConfig): string {
  if (config.setFormat === "FULL_SET") {
    return config.gameWinBy === 2 ? "Full set with tiebreak" : "Full set to 6";
  }
  if (config.setFormat === "BO3_GAMES") return "Best of 3 games";
  return "Best of 5 games";
}

function formatRegularMatchLength(config: RegularScoringConfig): string | null {
  if (config.matchTiebreak && config.setsToWin === 2) return "Two sets + match tiebreak";
  if (config.setsToWin === 1) return "One set";
  if (config.setsToWin === 2) return "Best of 3 sets";
  if (config.setsToWin === 3) return "Best of 5 sets";
  if (config.setsToWin === 4) return "Best of 7 sets";
  return null;
}

function formatRegularScoringRows(config: RegularScoringConfig): ConfigSummaryRow[] {
  const rows: ConfigSummaryRow[] = [
    { label: "Set format", value: formatRegularSetFormat(config) }
  ];
  const matchLength = formatRegularMatchLength(config);
  if (matchLength) {
    rows.push({ label: "Match length", value: matchLength });
  }
  if (config.deuceMode) {
    rows.push({ label: "Deuce", value: deuceModeLabel(config.deuceMode) });
  }
  return rows;
}

export function buildLiveTournamentConfigRows(
  config: LiveTournamentState["config"]
): ConfigSummaryRow[] {
  const isMexicano = config.mode === "MEXICANO";
  const rows: ConfigSummaryRow[] = [
    { label: "Format", value: formatTournamentModeVariant(config.mode, config.variant) },
    { label: "Scheduling", value: formatSchedulingMode(config.schedulingMode, isMexicano) },
    { label: "Scoring", value: formatScoringLabel(config.mode, config.scoringMode) },
    { label: "Courts", value: String(config.courts) }
  ];

  if (isMexicano) {
    rows.push({
      label: "Duration",
      value: config.tournamentTimeMinutes ? `${config.tournamentTimeMinutes} min` : "Open-ended"
    });
  } else if (config.schedulingMode === "TARGET_GAMES") {
    rows.push({
      label: "Target games",
      value: String(config.targetGamesPerPlayer ?? 4)
    });
  } else if (config.schedulingMode === "TOTAL_TIME") {
    rows.push({
      label: "Duration",
      value: config.tournamentTimeMinutes ? `${config.tournamentTimeMinutes} min` : "—"
    });
  }

  if (config.scoringMode === "REGULAR" && config.regularScoring) {
    rows.push(...formatRegularScoringRows(config.regularScoring));
  } else if (!isMexicano && config.scoringMode !== "REGULAR") {
    rows.push({ label: "Points per match", value: String(config.pointsPerMatch) });
  }

  return rows;
}

export function buildKohConfigRows(config: KohTournamentHub["config"]): ConfigSummaryRow[] {
  const pairingLabel =
    config.pairingMode === "ROUND_ROBIN_PAIRS" ? "Round-robin pairs" : "Winner stays";
  const rows: ConfigSummaryRow[] = [
    { label: "Format", value: "King of the Court" },
    { label: "Pairing", value: pairingLabel },
    { label: "Courts", value: String(config.courts) },
    { label: "Scoring", value: formatScoringLabel(config.mode, config.scoringMode) },
    ...formatRegularScoringRows(config.regularScoring)
  ];
  if (config.promotionRules && config.promotionRules.length > 0) {
    rows.push({
      label: "Promotion",
      value: `${config.promotionRules.length} court rule${config.promotionRules.length === 1 ? "" : "s"}`
    });
  }
  return rows;
}
