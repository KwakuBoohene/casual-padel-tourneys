import type { UsageVisit } from "@padel/shared";
import { getApiBaseUrl } from "./client";

export async function sendUsageVisits(
  token: string,
  events: UsageVisit[],
  signal: AbortSignal
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/usage/visits`, {
    method: "POST",
    cache: "no-store",
    signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ surface: "organizer", consent: true, events })
  });
  if (response.status === 429 || response.status >= 500) throw new Error("Usage unavailable.");
}
