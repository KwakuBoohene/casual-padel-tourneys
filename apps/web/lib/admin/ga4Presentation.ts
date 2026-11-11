import type { Ga4ViewerReport } from "@padel/shared";

export const count = (value: number) => value.toLocaleString();
export const percent = (value: number | null) =>
  value === null ? "Unavailable" : `${(value * 100).toFixed(1)}%`;
export function share(value: number, total: number): string {
  return total > 0 ? percent(value / total) : "Unavailable";
}
export function comparison(current: number | null, previous: number | null, rate = false): string {
  if (current === null || previous === null) return "Comparison unavailable";
  const delta = current - previous;
  const sign = delta > 0 ? "+" : "";
  if (rate) return `${sign}${(delta * 100).toFixed(1)} pp vs prior period`;
  if (previous === 0) return `${sign}${count(delta)} vs prior period · percentage unavailable`;
  return `${sign}${((delta / previous) * 100).toFixed(1)}% vs prior period`;
}
export function sessionTrend(data: Ga4ViewerReport) {
  const previous = data.previousDaily;
  return data.daily.map((day, index) => ({
    ...day,
    previousDate: previous?.[index]?.date ?? null,
    previous: previous?.[index]?.sessions ?? null
  }));
}
export const pageLabels = {
  scoreboard: "Live scoreboard",
  leaderboard: "Leaderboard",
  tournament_overview: "Tournament overview",
  other: "Other Viewer pages"
};
