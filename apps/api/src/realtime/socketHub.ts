import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";

import { getChannelName } from "./events.js";

type SocketMap = Map<string, Set<WebSocket>>;

export function mountSocketHub(server: FastifyInstance): SocketMap {
  const subscriptions: SocketMap = new Map();
  server.get("/ws/tournaments/:id", { websocket: true }, (socket, request) => {
    const tournamentId = (request.params as { id: string }).id;
    const set = subscriptions.get(tournamentId) ?? new Set<WebSocket>();
    set.add(socket);
    subscriptions.set(tournamentId, set);
    socket.on("close", () => {
      set.delete(socket);
      if (set.size === 0) {
        subscriptions.delete(tournamentId);
      }
    });
  });
  return subscriptions;
}

export function broadcastToTournament(subscriptions: SocketMap, tournamentId: string, payload: unknown): void {
  const set = subscriptions.get(tournamentId);
  if (!set) {
    return;
  }
  const message = JSON.stringify({ channel: getChannelName(), payload });
  for (const socket of set) {
    socket.send(message);
  }
}
