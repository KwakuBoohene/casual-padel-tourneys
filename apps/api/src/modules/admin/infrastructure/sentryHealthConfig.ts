import type { SentryHealthScope } from "../application/sentryHealth.js";

export interface SentryHealthConfig extends SentryHealthScope { token: string }

/** Independent, server-only read settings. Ingestion DSNs and upload tokens are never reused. */
export function sentryHealthConfig(env: NodeJS.ProcessEnv = process.env): SentryHealthConfig | null {
  if (env.SENTRY_HEALTH_ENABLED !== "true") return null;
  const token = env.SENTRY_HEALTH_TOKEN?.trim();
  const organization = env.SENTRY_HEALTH_ORG?.trim();
  const projectIds = [...new Set((env.SENTRY_HEALTH_PROJECT_IDS ?? "").split(",").map((id) => id.trim()))].sort();
  const environment = env.SENTRY_HEALTH_ENVIRONMENT ?? "production";
  if (!token || !organization || !/^[a-zA-Z0-9_-]{1,100}$/.test(organization) ||
      projectIds.length > 10 || !projectIds.every((id) => /^\d{1,20}$/.test(id)) ||
      !/^[a-zA-Z0-9_.-]{1,64}$/.test(environment)) return null;
  try {
    const base = new URL(env.SENTRY_HEALTH_BASE_URL ?? "https://sentry.io");
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || base.pathname !== "/") return null;
    return { token, organization, projectIds, environment, baseUrl: base.origin,
      firstSeenVerified: env.SENTRY_HEALTH_FIRST_SEEN_VERIFIED === "true" };
  } catch {
    return null;
  }
}
