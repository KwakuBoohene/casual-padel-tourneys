import type { Ga4ReportSurface } from "@padel/shared";

export interface Ga4ReportingConfig {
  credentials: { client_email: string; private_key: string };
  properties: Record<Ga4ReportSurface, string | undefined>;
  environment: string;
}

const PROPERTY_ID = /^\d{5,15}$/;

/**
 * Server-only reporting settings. Returns null (reporting "not configured") unless explicitly
 * enabled with a service-account key and at least one valid, distinct numeric property ID.
 * Property routing is fixed by these variables; requests never choose a property.
 */
export function ga4ReportingConfig(env: NodeJS.ProcessEnv = process.env): Ga4ReportingConfig | null {
  if (env.GA4_REPORTING_ENABLED !== "true" || !env.GA4_REPORTING_CREDENTIALS_JSON) return null;
  let credentials: Ga4ReportingConfig["credentials"];
  try {
    const parsed = JSON.parse(env.GA4_REPORTING_CREDENTIALS_JSON) as Record<string, unknown>;
    if (typeof parsed.client_email !== "string" || typeof parsed.private_key !== "string") return null;
    credentials = { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    return null;
  }
  const valid = (value: string | undefined) => (value && PROPERTY_ID.test(value) ? value : undefined);
  const viewer = valid(env.GA4_VIEWER_PROPERTY_ID);
  const organizer = valid(env.GA4_ORGANIZER_PROPERTY_ID);
  if (!viewer && !organizer) return null;
  if (viewer && viewer === organizer) return null; // Surfaces must never share a property.
  return {
    credentials,
    properties: { viewer, organizer },
    environment: env.NODE_ENV ?? "development"
  };
}
