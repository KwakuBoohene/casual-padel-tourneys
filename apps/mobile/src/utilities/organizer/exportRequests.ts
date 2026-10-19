import { exportFileName, type ExportScope, type OrganizerPlayerRange } from "@padel/shared";

export type ExportFormat = "csv" | "pdf";

/** What the organizer is exporting. Account datasets span every event on the account. */
export type ExportDataset = "tournament" | "careerLeaderboard" | "careerMatches";

export interface ExportRequest {
  dataset: ExportDataset;
  format: ExportFormat;
  /** Leaderboard only, or the leaderboard plus everything behind it. Defaults to full. */
  scope?: ExportScope;
  /** Required for the tournament dataset. */
  tournamentId?: string;
  /** Required for the account datasets. */
  range?: OrganizerPlayerRange;
}

export function exportRequestPath(request: ExportRequest): string {
  const scope = request.scope ?? "full";
  if (request.dataset === "tournament") {
    if (!request.tournamentId) {
      throw new Error("A tournament export needs a tournament id.");
    }
    return `/tournaments/${encodeURIComponent(request.tournamentId)}/export?format=${request.format}&scope=${scope}`;
  }
  const range = request.range ?? "year";
  if (request.dataset === "careerMatches") {
    return `/me/players/matches/export?format=${request.format}&range=${range}`;
  }
  return `/me/players/leaderboard/export?format=${request.format}&range=${range}&scope=${scope}`;
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
  const kind =
    request.dataset === "careerMatches"
      ? "matches"
      : (request.scope ?? "full") === "full"
        ? "full"
        : "leaderboard";
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
export function exportSheetSubtitle(
  request: Pick<ExportRequest, "dataset" | "range" | "scope">
): string {
  const full = (request.scope ?? "full") === "full";
  if (request.dataset === "tournament") {
    return full ? "Standings, plus every round, match and score." : "Standings only.";
  }
  const range = RANGE_LABEL[request.range ?? "year"];
  if (request.dataset === "careerMatches") {
    return `Every match behind the account leaderboard for ${range}.`;
  }
  return full
    ? `Account leaderboard for ${range}, with its tournaments and matches.`
    : `Account leaderboard for ${range}. Standings only.`;
}

/**
 * Filename the server chose, when the browser is allowed to read it. Returns null rather than a
 * generic placeholder so callers fall back to a name built from the tournament instead.
 */
export function fileNameFromContentDisposition(header: string | null | undefined): string | null {
  if (!header) return null;
  const quoted = /filename\*?=(?:UTF-8'')?"([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];
  const bare = /filename\*?=(?:UTF-8'')?([^;]+)/i.exec(header);
  return bare?.[1]?.trim() || null;
}
