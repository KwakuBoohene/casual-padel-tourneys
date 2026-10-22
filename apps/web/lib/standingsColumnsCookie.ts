import { parseVisibleColumns, STANDINGS_COLUMN_STORAGE_KEY, type StandingsColumnKey } from "@padel/shared";

/**
 * `decodeURIComponent` throws `URIError` on a malformed escape — a hand-edited or truncated cookie
 * would otherwise take down the server render of a public page. Fall back to the raw value and let
 * `parseVisibleColumns` decide what is usable.
 */
export function decodeColumnsCookie(raw: string | undefined): StandingsColumnKey[] {
  if (!raw) return parseVisibleColumns(null);
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // keep the raw value
  }
  return parseVisibleColumns(decoded);
}

/** Read the existing preference cookie before rendering a standings table. */
export function readVisibleColumnsCookie(): StandingsColumnKey[] {
  const prefix = `${STANDINGS_COLUMN_STORAGE_KEY}=`;
  const raw = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
  return decodeColumnsCookie(raw);
}
