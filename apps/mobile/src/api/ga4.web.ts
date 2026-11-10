import type { OrganizerGa4Event } from "@padel/shared";
import { getApiBaseUrl } from "./client";

export function sendOrganizerGa4(token: string, event: OrganizerGa4Event): void {
  void fetch(`${getApiBaseUrl().replace(/\/$/, "")}/analytics/ga4/organizer`, {
    method: "POST",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    redirect: "error",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(event)
  }).catch(() => {});
}
