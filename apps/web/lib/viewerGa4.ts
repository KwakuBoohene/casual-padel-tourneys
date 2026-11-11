import type { ViewerGa4Action } from "@padel/shared";

export function viewerAcquisition(referrer: string, ownOrigin: string): ViewerGa4Action["acquisition"] {
  if (!referrer) return "direct";
  try {
    const url = new URL(referrer);
    if (url.origin === ownOrigin) return "direct";
    const host = url.hostname;
    if (host === "google.com" || host === "www.google.com") return "google";
    for (const site of ["bing", "facebook", "instagram", "whatsapp"] as const) {
      if (host === `${site}.com` || host.endsWith(`.${site}.com`)) return site;
    }
  } catch {
    return "direct";
  }
  return "other_referral";
}

export function isViewerAnalyticsRoute(pathname: string): boolean {
  return /^\/tournament\/[^/]+(?:\/(?:leaderboard|rankings))?\/?$/i.test(pathname);
}
