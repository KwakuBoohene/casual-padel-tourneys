import type { Redis } from "ioredis";
import type { WebSocket } from "@fastify/websocket";

import type { TournamentEvent } from "../../../realtime/events.js";
import { publishEvent } from "../../../realtime/events.js";
import { broadcastToTournament } from "../../../realtime/socketHub.js";
import type { TournamentEvents } from "../application/ports.js";

type SocketMap = Map<string, Set<WebSocket>>;

export class RealtimeTournamentEvents implements TournamentEvents {
  constructor(
    private readonly redis: Redis | undefined,
    private readonly subscriptions: SocketMap
  ) {}

  async publish(event: TournamentEvent): Promise<void> {
    await publishEvent(this.redis, event);
    broadcastToTournament(this.subscriptions, event.tournamentId, event);
  }
}
