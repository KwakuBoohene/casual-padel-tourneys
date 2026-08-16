import type { Redis } from "ioredis";
import type { WebSocket } from "@fastify/websocket";

import type { TournamentEvent } from "../../../realtime/events.js";
import { publishEvent } from "../../../realtime/events.js";
import { broadcastToTournament } from "../../../realtime/socketHub.js";
import type { KohEvents } from "../application/ports.js";

type SocketMap = Map<string, Set<WebSocket>>;

export class RealtimeKohEvents implements KohEvents {
  constructor(
    private readonly redis: Redis | undefined,
    private readonly subscriptions: SocketMap
  ) {}

  async publish(event: TournamentEvent): Promise<void> {
    await publishEvent(this.redis, event);
    broadcastToTournament(this.subscriptions, event.tournamentId, event);
  }
}
