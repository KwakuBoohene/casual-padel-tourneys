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
