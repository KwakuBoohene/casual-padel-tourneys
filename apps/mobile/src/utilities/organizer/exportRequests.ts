import { exportFileName, type OrganizerPlayerRange } from "@padel/shared";

export type ExportFormat = "csv" | "pdf";

/** What the organizer is exporting. Account datasets span every event on the account. */
export type ExportDataset = "tournament" | "careerLeaderboard" | "careerMatches";

export interface ExportRequest {
  dataset: ExportDataset;
  format: ExportFormat;
  /** Required for the tournament dataset. */
  tournamentId?: string;
  /** Required for the account datasets. */
  range?: OrganizerPlayerRange;
}

export function exportRequestPath(request: ExportRequest): string {
  if (request.dataset === "tournament") {
    if (!request.tournamentId) {
      throw new Error("A tournament export needs a tournament id.");
    }
    return `/tournaments/${encodeURIComponent(request.tournamentId)}/export?format=${request.format}`;
  }
  const range = request.range ?? "year";
  const kind = request.dataset === "careerLeaderboard" ? "leaderboard" : "matches";
  return `/me/players/${kind}/export?format=${request.format}&range=${range}`;
}

/**
 * Local cache filename. Includes a timestamp because repeat exports in one session would
 * otherwise collide in the cache directory and silently share the first file's contents.
 */
export function exportCacheFileName(
  request: ExportRequest,
  name: string,
  isoTimestamp: string
): string {
  const kind = request.dataset === "careerMatches" ? "matches" : "leaderboard";
  const base = exportFileName(kind, name, isoTimestamp, request.format);
  const stamp = isoTimestamp.replace(/[^0-9]/g, "").slice(8, 14);
  return base.replace(new RegExp(`\\.${request.format}$`), `-${stamp}.${request.format}`);
}

export function exportMimeType(format: ExportFormat): string {
  return format === "pdf" ? "application/pdf" : "text/csv";
}

const RANGE_LABEL: Record<OrganizerPlayerRange, string> = {
  month: "this month",
  year: "this year",
  all: "all time"
};

/** Sheet copy has to say which slice is leaving the app, so nobody exports the wrong range. */
export function exportSheetSubtitle(request: Pick<ExportRequest, "dataset" | "range">): string {
  if (request.dataset === "tournament") {
    return "This tournament's leaderboard.";
  }
  const range = RANGE_LABEL[request.range ?? "year"];
  return request.dataset === "careerLeaderboard"
    ? `Account leaderboard for ${range}.`
    : `Every match behind the account leaderboard for ${range}.`;
}
