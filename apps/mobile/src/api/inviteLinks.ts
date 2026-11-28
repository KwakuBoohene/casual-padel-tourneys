/** Account Manager invite (`/invite/accept`) or per-draft co-organizer invite (`/invite/draft`). */
export type PendingInviteKind = "organizer" | "draft";
export interface PendingInvite {
  kind: PendingInviteKind;
  token: string;
}

const TOKEN = /^[A-Za-z0-9_-]{40,128}$/;
const PATHS: Record<PendingInviteKind, string> = { organizer: "invite/accept", draft: "invite/draft" };

/** Token from the URL hash (`#token=…`), so it never reaches server logs or referrers. */
export function parseInviteUrl(url: string | null, kind: PendingInviteKind): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!`${parsed.host}${parsed.pathname}`.includes(PATHS[kind])) return null;
    const token = new URLSearchParams(parsed.hash.slice(1)).get("token");
    return token && TOKEN.test(token) ? token : null;
  } catch {
    return null;
  }
}

/** Values stored before `kind` existed are organizer invites. */
export function parseStoredInvite(raw: string | null, now = Date.now()): PendingInvite | null {
  try {
    const value = raw ? (JSON.parse(raw) as { token?: string; kind?: string; expiresAt?: number }) : null;
    if (!value?.token || !value.expiresAt || value.expiresAt <= now) return null;
    return { kind: value.kind === "draft" ? "draft" : "organizer", token: value.token };
  } catch {
    return null;
  }
}
