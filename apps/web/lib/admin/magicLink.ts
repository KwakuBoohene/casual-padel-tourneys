let pending: string | null = null;

export function parseAdminMagicToken(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.pathname !== "/admin/sign-in") return null;
    const token = new URLSearchParams(url.hash.slice(1)).get("token");
    return token && /^[A-Za-z0-9_-]{40,128}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

/** Strip the capability before config loading, React, or diagnostics can observe the location. */
export function collectAdminMagicToken(): void {
  if (window.location.pathname !== "/admin/sign-in") return;
  const token = parseAdminMagicToken(window.location.href);
  if (token) pending = token;
  if (window.location.hash || window.location.search) window.history.replaceState(null, "", "/admin/sign-in");
}

export function takeAdminMagicToken(): string | null {
  collectAdminMagicToken();
  const token = pending;
  pending = null;
  return token;
}
