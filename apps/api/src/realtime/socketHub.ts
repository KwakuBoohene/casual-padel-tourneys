import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "@fastify/websocket";

import { tryAuthUser } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { getChannelName } from "./events.js";

type SocketMap = Map<string, Set<WebSocket>>;

type TournamentAccess = {
  organizerId?: string | null;
  publicToken: string;
};

function readPublicToken(request: FastifyRequest): string | undefined {
  const query = request.query as { token?: string } | undefined;
  if (typeof query?.token === "string" && query.token.length > 0) {
    return query.token;
  }
  const header = request.headers["x-public-token"];
  if (typeof header === "string" && header.length > 0) {
    return header;
  }
  if (Array.isArray(header) && typeof header[0] === "string" && header[0].length > 0) {
    return header[0];
  }
  return undefined;
}

async function loadTournamentAccess(tournamentId: string): Promise<TournamentAccess | null> {
  try {
    const row = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { organizerId: true, publicToken: true }
    });
    if (!row) {
      return null;
    }
    return { organizerId: row.organizerId, publicToken: row.publicToken };
  } catch {
    logger.warn("socketHub: failed to load tournament for subscribe auth", { tournamentId });
    return null;
  }
}

export function mountSocketHub(server: FastifyInstance): SocketMap {
  const subscriptions: SocketMap = new Map();
  server.get("/ws/tournaments/:id", { websocket: true }, (socket, request) => {
    void (async () => {
      const tournamentId = (request.params as { id: string }).id;
      const access = await loadTournamentAccess(tournamentId);
      if (!access) {
        logger.warn("socketHub: subscribe rejected (missing tournament)", { tournamentId });
        socket.close(4404, "Not found");
        return;
      }

      const publicToken = readPublicToken(request);
      const tokenOk = Boolean(publicToken && publicToken === access.publicToken);
      const user = tryAuthUser(request);
      const organizerOk = Boolean(user && access.organizerId && user.id === access.organizerId);

      if (!tokenOk && !organizerOk) {
        logger.warn("socketHub: subscribe rejected (unauthorized)", { tournamentId });
        socket.close(4401, "Unauthorized");
        return;
      }

      const set = subscriptions.get(tournamentId) ?? new Set<WebSocket>();
      set.add(socket);
      subscriptions.set(tournamentId, set);
      logger.info("socketHub: client subscribed", { tournamentId, subscribers: set.size });
      socket.on("close", () => {
        set.delete(socket);
        if (set.size === 0) {
          subscriptions.delete(tournamentId);
        }
        logger.info("socketHub: client disconnected", { tournamentId, subscribers: set.size });
      });
    })();
  });
  return subscriptions;
}

export function broadcastToTournament(subscriptions: SocketMap, tournamentId: string, payload: unknown): void {
  const set = subscriptions.get(tournamentId);
  if (!set) {
    return;
  }
  const message = JSON.stringify({ channel: getChannelName(), payload });
  logger.debug("socketHub: broadcasting", { tournamentId, subscribers: set.size });
  for (const socket of set) {
    socket.send(message);
  }
}
