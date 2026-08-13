/**
 * Parse padel://auth/magic?token=… and padel://auth/reset?token=…
 * Also accepts https-style paths containing /auth/magic or /auth/reset.
 */
export type AuthDeepLink =
  | { kind: "magic"; token: string }
  | { kind: "reset"; token: string };

export function parseAuthDeepLink(url: string): AuthDeepLink | null {
  try {
    const normalized = url.trim();
    if (!normalized) {
      return null;
    }

    // Custom schemes: padel://auth/magic?token=x
    const custom = normalized.match(/^padel:\/\/auth\/(magic|reset)\?([^#]+)/i);
    if (custom) {
      const kind = custom[1].toLowerCase() as "magic" | "reset";
      const params = new URLSearchParams(custom[2]);
      const token = params.get("token")?.trim();
      if (token) {
        return { kind, token };
      }
    }

    const withSlashes = normalized.includes("://") ? normalized : `https://dummy${normalized.startsWith("/") ? "" : "/"}${normalized}`;
    const parsed = new URL(withSlashes);
    const path = `${parsed.hostname}${parsed.pathname}`.replace(/\/+/g, "/").toLowerCase();
    const token = parsed.searchParams.get("token")?.trim();
    if (!token) {
      return null;
    }
    if (path.includes("auth/magic")) {
      return { kind: "magic", token };
    }
    if (path.includes("auth/reset")) {
      return { kind: "reset", token };
    }
    return null;
  } catch {
    return null;
  }
}
