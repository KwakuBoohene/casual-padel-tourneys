/** Public career board URL for a share token. Mirrors how tournament viewer links are built. */
export function careerShareUrl(viewerBaseUrl: string, token: string): string {
  return `${viewerBaseUrl.replace(/\/+$/, "")}/c/${encodeURIComponent(token)}`;
}

export type CareerShareStatus = "off" | "on";

export function careerShareStatus(token: string | null | undefined): CareerShareStatus {
  return token ? "on" : "off";
}

/** Sheet copy. Being explicit about what becomes public is the point of this screen. */
export function careerShareBlurb(status: CareerShareStatus): string {
  return status === "on"
    ? "Anyone with this link can see these standings. No match history, no tournaments, and nothing can be edited."
    : "Share a read-only link to these standings. Only the table is published — no match history, no tournaments, and nothing can be edited.";
}

export function careerShareWarning(action: "replace" | "stop"): string {
  return action === "replace"
    ? "The current link stops working immediately. Anyone using it will need the new one."
    : "The current link stops working immediately and the standings become private again.";
}
