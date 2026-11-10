import type { OrganizerGa4Action } from "@padel/shared";

type Page = Extract<OrganizerGa4Action, { event: "page_view" }>["feature"];
const staticRoutes = new Map<string, Page>([
  ["/tournaments", "tournaments"], ["/create", "setup"], ["/koh", "setup"],
  ["/koh/live", "live_scoring"], ["/profile", "profile"], ["/estimator", "estimator"],
  ["/profile/players", "player_management"], ["/account-players", "player_management"],
  ["/organizer-access", "organizer_access"], ["/historical-results", "historical_results"]
]);

export function organizerFeature(pathname: string): Page | undefined {
  const path = pathname.replace(/\/$/, "");
  if (/^\/tournaments\/[^/]+\/leaderboard$/.test(path)) return "leaderboard";
  if (/^\/tournaments\/[^/]+\/players\/[^/]+$/.test(path)) return "player_management";
  if (/^\/tournaments\/[^/]+$/.test(path)) return "live_scoring";
  return staticRoutes.get(path);
}
