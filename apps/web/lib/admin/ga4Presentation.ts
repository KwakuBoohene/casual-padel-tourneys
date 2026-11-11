import type { Ga4ViewerReport, Ga4OrganizerReport } from "@padel/shared";

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
export function sessionTrend(data: Pick<Ga4ViewerReport, "daily" | "previousDaily">) {
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

export const featureLabels = {
  tournaments: "Tournament list",
  setup: "Tournament setup",
  live_scoring: "Live scoring",
  leaderboard: "Leaderboard",
  player_management: "Player management",
  profile: "Profile",
  estimator: "Estimator",
  organizer_access: "Organizer access",
  historical_results: "Historical results"
};
export function organizerMilestones(data: Ga4OrganizerReport) {
  const eventCount = (event: Ga4OrganizerReport["milestones"][number]["event"]) =>
    data.milestones.find((point) => point.event === event)?.count ?? 0;
  const stepCount = (step: "players" | "review") => data.creationSteps == null
    ? null : data.creationSteps.find((point) => point.step === step)?.count ?? 0;
  return [
    { label: "Wizard opened", count: eventCount("creation_started") },
    { label: "Players step reached", count: stepCount("players") },
    { label: "Review step reached", count: stepCount("review") },
    { label: "Tournament created", count: eventCount("creation_succeeded") }
  ];
}
