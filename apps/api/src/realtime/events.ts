import type { Redis } from "ioredis";

import { logger } from "../lib/logger.js";

const channelName = "tournament:events";

export interface TournamentEvent<T = unknown> {
  type:
    | "TOURNAMENT_CREATED"
    | "TOURNAMENT_RENAMED"
    | "TOURNAMENT_DELETED"
    | "SCORE_SUBMITTED"
    | "PLAYER_RENAMED"
    | "COURTS_ADJUSTED"
    | "PLAYER_SUBSTITUTED"
    | "PENDING_PLAYER_ADDED"
    | "PENDING_PLAYERS_INTEGRATED"
    | "ROUND_ADVANCED"
    | "TOURNAMENT_ENDED"
    | "KOH_ASSIGNMENT_UPDATED"
    | "KOH_QUEUE_RANDOMIZED"
    | "KOH_QUEUE_REORDERED"
    | "KOH_SCORE_SUBMITTED"
    | "KOH_COURT_CHANGE"
    | "KOH_SWAP_APPLIED"
    | "KOH_HUB_UPDATED";
  tournamentId: string;
  payload: T;
}

export async function publishEvent(redis: Redis | undefined, event: TournamentEvent): Promise<void> {
  if (!redis) {
    logger.debug("events/publishEvent skipped (no redis)", {
      type: event.type,
      tournamentId: event.tournamentId
    });
    return;
  }
  logger.debug("events/publishEvent", { type: event.type, tournamentId: event.tournamentId });
  await redis.publish(channelName, JSON.stringify(event));
}

export function getChannelName(): string {
  return channelName;
}
