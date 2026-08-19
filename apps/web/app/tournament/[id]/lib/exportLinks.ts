export type ExportLinkFormat = "csv" | "pdf";
export type ExportLinkScope = "leaderboard" | "full";

/**
 * Download URL for a spectator export. Built against the **public** API origin because the
 * browser fetches it directly — the container-internal origin is not reachable from a client.
 */
export function tournamentExportUrl(
  publicApiBaseUrl: string,
  shareToken: string,
  format: ExportLinkFormat,
  scope: ExportLinkScope = "full"
): string {
  const base = publicApiBaseUrl.replace(/\/+$/, "");
  return `${base}/public/${encodeURIComponent(shareToken)}/export?format=${format}&scope=${scope}`;
}
