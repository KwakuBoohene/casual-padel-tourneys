/** How much of an export the caller wants. */
export const EXPORT_SCOPES = ["leaderboard", "full"] as const;
export type ExportScope = (typeof EXPORT_SCOPES)[number];

export function isExportScope(value: unknown): value is ExportScope {
  return typeof value === "string" && (EXPORT_SCOPES as readonly string[]).includes(value);
}

/**
 * Defaults to `full`: an export is usually wanted as a record of what happened, and narrowing to
 * the table is the deliberate choice.
 */
export function parseExportScope(value: string | undefined): ExportScope {
  const scope = (value ?? "full").toLowerCase();
  if (!isExportScope(scope)) {
    throw new Error(`Unsupported export scope. Supported: ${EXPORT_SCOPES.join(", ")}.`);
  }
  return scope;
}

/**
 * Tournament exports add `schedule`: the printable round-by-round matchups. Kept apart from
 * {@link ExportScope} so the career export does not start accepting a scope it cannot serve.
 */
export const TOURNAMENT_EXPORT_SCOPES = [...EXPORT_SCOPES, "schedule"] as const;
export type TournamentExportScope = (typeof TOURNAMENT_EXPORT_SCOPES)[number];

export function parseTournamentExportScope(value: string | undefined): TournamentExportScope {
  const scope = (value ?? "full").toLowerCase();
  if (!(TOURNAMENT_EXPORT_SCOPES as readonly string[]).includes(scope)) {
    throw new Error(`Unsupported export scope. Supported: ${TOURNAMENT_EXPORT_SCOPES.join(", ")}.`);
  }
  return scope as TournamentExportScope;
}
