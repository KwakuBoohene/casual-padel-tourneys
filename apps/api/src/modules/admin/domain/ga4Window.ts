import type { Ga4Window } from "@padel/shared";
import { reportingRange } from "./reporting.js";

const DAY_MS = 86_400_000;
// Africa/Accra is UTC+0 year-round (no DST), so Accra calendar dates equal UTC dates.
const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const startOfDay = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS;

/**
 * Maps the dashboard's instant range to inclusive GA4 calendar dates.
 * `to` is exclusive in the app, so the last GA4 date is the day containing `to - 1ms`
 * (never later than today). The previous window has the same number of days.
 */
export function ga4Window(input: { from?: string; to?: string }, now = new Date()): Ga4Window {
  const range = reportingRange(input, now);
  const today = startOfDay(now.getTime());
  const first = startOfDay(range.from.getTime());
  const last = Math.min(startOfDay(range.to.getTime() - 1), today);
  const days = Math.max(1, Math.round((last - first) / DAY_MS) + 1);
  const previousLast = first - DAY_MS;
  const previousFirst = previousLast - (days - 1) * DAY_MS;
  return {
    from: isoDate(first),
    to: isoDate(Math.max(first, last)),
    previousFrom: isoDate(previousFirst),
    previousTo: isoDate(previousLast),
    days,
    timezone: "Africa/Accra",
    // GA4 standard reports can lag by 24–48 hours.
    provisional: last >= today - DAY_MS
  };
}

/** Every date from `from` to `to` inclusive, so GA4's omitted zero-days can be filled. */
export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let ms = Date.parse(from); ms <= Date.parse(to); ms += DAY_MS) dates.push(isoDate(ms));
  return dates;
}
