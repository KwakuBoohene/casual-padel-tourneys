import type { LiveTournamentState } from "../../types/organizer/tournament";

export type ParsedTournamentSocketMessage =
  | { kind: "tournament"; data: LiveTournamentState }
  | { kind: "deleted"; tournamentId: string }
  | { kind: "ignore" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isLiveTournamentPayload(value: unknown): value is LiveTournamentState {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.publicToken === "string" &&
    isRecord(value.config) &&
    Array.isArray(value.players) &&
    Array.isArray(value.rounds)
  );
}

/**
 * Parse a server WS frame.
 * Wire shape: `{ channel, payload: TournamentEvent }` where event.payload is state or `{ id }`.
 */
export function parseTournamentSocketMessage(raw: string): ParsedTournamentSocketMessage {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return { kind: "ignore" };

    const event = isRecord(parsed.payload) ? parsed.payload : parsed;
    if (!isRecord(event)) return { kind: "ignore" };

    const type = typeof event.type === "string" ? event.type : undefined;
    const inner = event.payload;

    if (type === "TOURNAMENT_DELETED") {
      const id =
        (isRecord(inner) && typeof inner.id === "string" && inner.id) ||
        (typeof event.tournamentId === "string" ? event.tournamentId : null);
      return id ? { kind: "deleted", tournamentId: id } : { kind: "ignore" };
    }

    if (isLiveTournamentPayload(inner)) {
      return { kind: "tournament", data: inner };
    }

    // Web fallback: some frames nest only one level
    if (isLiveTournamentPayload(event)) {
      return { kind: "tournament", data: event };
    }

    return { kind: "ignore" };
  } catch {
    return { kind: "ignore" };
  }
}
