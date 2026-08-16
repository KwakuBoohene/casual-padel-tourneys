export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "Player";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Player";
}
