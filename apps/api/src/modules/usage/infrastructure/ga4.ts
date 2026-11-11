import type { OrganizerGa4Event, ViewerGa4Event } from "@padel/shared";

export type Ga4Surface = "viewer" | "organizer";
export function ga4Config(surface: Ga4Surface) {
  const prefix = `GA4_${surface.toUpperCase()}`;
  const measurementId = process.env[`${prefix}_MEASUREMENT_ID`];
  const secret = process.env[`${prefix}_API_SECRET`];
  const origin = process.env[`${prefix}_ORIGIN`];
  if (process.env[`${prefix}_ENABLED`] !== "true" || !measurementId || !/^G-[A-Z0-9]{4,20}$/.test(measurementId) || !secret || !origin)
    return null;
  try {
    const url = new URL(origin);
    if (url.origin !== origin || url.protocol !== "https:" && !(url.protocol === "http:" && process.env.NODE_ENV !== "production"))
      return null;
  } catch {
    return null;
  }
  const other = surface === "viewer" ? "ORGANIZER" : "VIEWER";
  if (process.env[`GA4_${other}_MEASUREMENT_ID`] === measurementId) return null;
  return { measurementId, secret, origin, debug: process.env[`${prefix}_DEBUG`] === "true" };
}

const safeReferrers = {
  direct: undefined,
  google: "https://www.google.com/",
  bing: "https://www.bing.com/",
  facebook: "https://www.facebook.com/",
  instagram: "https://www.instagram.com/",
  whatsapp: "https://www.whatsapp.com/",
  other_referral: undefined
} as const;

export async function sendGa4(config: NonNullable<ReturnType<typeof ga4Config>>, event: ViewerGa4Event | OrganizerGa4Event) {
  const params = {
    session_id: event.sessionId,
    ...(config.debug ? { debug_mode: 1 } : {}),
    ...("page" in event ? {
      page_location: `${config.origin}/_analytics/${event.page}`,
      page_title: event.page,
      page_type: event.page,
      viewer_acquisition: event.acquisition,
      page_referrer: safeReferrers[event.acquisition]
    } : "feature" in event ? {
      page_location: `${config.origin}/_analytics/${event.feature}`,
      page_title: event.feature,
      feature_area: event.feature
    } : {
      feature_area: "setup",
      ...("step" in event ? { creation_step: event.step } : {})
    })
  };
  const url = new URL("https://www.google-analytics.com/mp/collect");
  url.search = new URLSearchParams({ measurement_id: config.measurementId, api_secret: config.secret }).toString();
  const response = await fetch(url, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(2500),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: event.clientId,
      consent: { ad_user_data: "DENIED", ad_personalization: "DENIED" },
      device: { category: event.device },
      events: [{ name: event.event, params }]
    })
  });
  if (!response.ok) throw new Error("GA4 event delivery failed.");
}
