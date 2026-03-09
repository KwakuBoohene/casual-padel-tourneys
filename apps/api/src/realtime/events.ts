import type { Redis } from "ioredis";

const channelName = "tournament:events";

export interface TournamentEvent<T = unknown> {
  type:
    | "TOURNAMENT_CREATED"
    | "TOURNAMENT_RENAMED"
    | "TOURNAMENT_DELETED"
    | "SCORE_SUBMITTED"
    | "PLAYER_RENAMED"
    | "COURTS_ADJUSTED"
    | "PLAYER_SUBSTITUTED";
  tournamentId: string;
  payload: T;
}

export async function publishEvent(redis: Redis | undefined, event: TournamentEvent): Promise<void> {
  if (!redis) {
    return;
  }
  await redis.publish(channelName, JSON.stringify(event));
}

export function getChannelName(): string {
  return channelName;
}
