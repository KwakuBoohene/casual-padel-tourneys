import { USAGE_SESSION_MS, type UsageRoute } from "../schemas/usage.js";

export function usageRoute(pathname: string): UsageRoute | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  if (/^\/(admin|auth|sign-in|verify|password|oauth)(\/|$)/.test(path)) return null;
  if (path === "/") return "home";
  if (path === "/tournaments") return "tournaments";
  if (/^\/tournaments\/[^/]+\/leaderboard$/.test(path)) return "leaderboard";
  if (/^\/tournaments\/[^/]+\/players\/[^/]+$/.test(path)) return "players";
  if (/^\/tournaments\/[^/]+$/.test(path) || path === "/koh/live") return "tournament";
  const routes: Record<string, UsageRoute> = {
    "/create": "create",
    "/koh": "create",
    "/profile": "profile",
    "/profile/players": "players",
    "/account-players": "players",
    "/estimator": "estimator",
    "/organizer-access": "organizer-access",
    "/historical-results": "historical-results"
  };
  return routes[path] ?? null;
}
export interface UsageSession {
  id: string;
  lastAt: number;
  route: UsageRoute;
  actor: string;
}
export function visitTransition(
  previous: UsageSession | null,
  input: { now: number; id: string; route: UsageRoute; actor: string }
): { session: UsageSession; emit: boolean } {
  const expired =
    !previous ||
    previous.actor !== input.actor ||
    input.now < previous.lastAt ||
    input.now - previous.lastAt >= USAGE_SESSION_MS;
  return {
    session: {
      id: expired ? input.id : previous.id,
      lastAt: input.now,
      route: input.route,
      actor: input.actor
    },
    emit: expired || previous.route !== input.route
  };
}
