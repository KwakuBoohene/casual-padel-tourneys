function withToken(base: string, rawToken: string): string {
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}token=${encodeURIComponent(rawToken)}`;
}

export function buildMagicLinkUrl(rawToken: string): string {
  return withToken(process.env.AUTH_MAGIC_LINK_BASE_URL?.trim() || "padel://auth/magic", rawToken);
}

export function buildPasswordResetUrl(rawToken: string): string {
  const base =
    process.env.AUTH_PASSWORD_RESET_BASE_URL?.trim() ||
    process.env.AUTH_MAGIC_LINK_BASE_URL?.trim() ||
    "padel://auth/reset";
  return withToken(base, rawToken);
}

/** The server chooses the viewer origin; clients cannot supply an arbitrary email-link destination. */
export function buildAdminSignInUrl(rawToken: string): string {
  const url = new URL(process.env.ADMIN_WEB_BASE_URL ?? "");
  const localHttp =
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
    process.env.NODE_ENV !== "production";
  if (
    !(url.protocol === "https:" || localHttp) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("ADMIN_WEB_BASE_URL must be the viewer HTTP(S) origin; HTTPS is required in production.");
  }
  url.pathname = "/admin/sign-in";
  url.hash = new URLSearchParams({ token: rawToken }).toString();
  return url.toString();
}
