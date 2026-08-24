import { cookies } from "next/headers";
import {
  parseVisibleColumns,
  STANDINGS_COLUMN_STORAGE_KEY,
  type StandingsColumnKey
} from "@padel/shared";

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

/**
 * The viewer's column choice, read on the server.
 *
 * The leaderboard is server rendered, so reading this only in the browser would paint the default
 * five and then swap after hydration. Mirrors how the theme cookie is read in `app/layout.tsx`.
 */
export async function readVisibleColumnsCookie(): Promise<StandingsColumnKey[]> {
  const store = await cookies();
  return decodeColumnsCookie(store.get(STANDINGS_COLUMN_STORAGE_KEY)?.value);
}
