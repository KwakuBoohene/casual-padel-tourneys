import pattern from "../../sentry-project-url-pattern.json";

/** Only public project navigation is allowed; DSNs, credentials and arbitrary query strings stay out. */
export function resolveSentryProjectUrl(raw: unknown): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value || value.length > 2048 || !new RegExp(pattern).test(value)) return null;
  try {
    return new URL(value).href;
  } catch {
    return null;
  }
}
