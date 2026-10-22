import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { databaseClient, prisma } from "../../../lib/prisma.js";
import { databaseWork } from "../../../lib/databaseContext.js";
import { AppError } from "../../../shared/kernel/appError.js";
import { sharedOrganizerAccessEnabled } from "../domain/policy.js";

class RejectedMutation {
  constructor(readonly result: unknown) {}
}

/** Serialize an organizer's writes, join repository transactions and publish only committed events. */
export function registerOrganizerMutationWork(server: FastifyInstance): void {
  server.addHook("onRoute", (route) => {
    const mutation = ["POST", "PUT", "PATCH", "DELETE"].some((method) =>
      Array.isArray(route.method) ? route.method.includes(method as "POST") : route.method === method
    );
    if (
      !mutation ||
      !/^\/(tournaments|koh\/tournaments|me\/(players|career-share)|organizers\/:organizerId\/(players|career-share))/.test(
        route.url
      )
    )
      return;
    const handler = route.handler;
    route.handler = async function (request, reply) {
      const context = request.organizerContext;
      if (!context) return handler.call(this, request, reply);
      const effects: Array<() => Promise<void>> = [];
      let result: unknown;
      try {
        result = await databaseClient.$transaction(
          async (tx) =>
            databaseWork.run({ transaction: tx, afterCommit: effects }, async () => {
              // All event/roster/career writes for one account use this ordering to avoid deadlocks.
              await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${context.organizerId} FOR UPDATE`;
              const params = request.params as { id?: string; courtId?: string };
              const body = request.body as { tournamentId?: string; expectedVersion?: number } | undefined;
              const tournamentRoute = /^\/(tournaments|koh\/tournaments)/.test(route.url);
              const eventId = tournamentRoute ? (params.id ?? body?.tournamentId) : undefined;
              let beforeVersion: number | undefined;
              let beforeScore: Prisma.JsonObject | undefined;
              if (eventId) {
                const rows = await tx.$queryRaw<
                  Array<{ version: number }>
                >`SELECT "version" FROM "Tournament" WHERE "id" = ${eventId} FOR UPDATE`;
                beforeVersion = rows[0]?.version;
                const shared =
                  sharedOrganizerAccessEnabled() &&
                  (context.role === "MANAGER" ||
                    (await tx.organizerMembership.count({
                      where: { organizerId: context.organizerId, revokedAt: null }
                    })) > 0);
                if (shared && request.method !== "DELETE" && !Number.isInteger(body?.expectedVersion)) {
                  throw new AppError("CONFLICT", 409, "Refresh your app to use shared editing safely.", {
                    code: "CLIENT_UPDATE_REQUIRED"
                  });
                }
                if (
                  body?.expectedVersion !== undefined &&
                  beforeVersion !== undefined &&
                  body.expectedVersion !== beforeVersion
                ) {
                  throw new AppError(
                    "CONFLICT",
                    409,
                    "Someone else updated this tournament. Review the latest score and try again.",
                    { expectedVersion: body.expectedVersion, actualVersion: beforeVersion }
                  );
                }
              }
              const input = request.body as { matchId?: string; sets?: unknown[] } | undefined;
              if (eventId && route.url.startsWith("/koh/") && route.url.endsWith("/score")) {
                const previous = await tx.kohMatch.findFirst({
                  where: {
                    court: { id: params.courtId, tournamentId: eventId },
                    ...(input?.matchId ? { id: input.matchId } : { completed: false, voidedAt: null })
                  },
                  orderBy: { createdAt: "desc" },
                  select: {
                    id: true,
                    completed: true,
                    winnerUnitId: true,
                    sets: {
                      take: 5,
                      select: { setNumber: true, gamesA: true, gamesB: true, tbA: true, tbB: true }
                    }
                  }
                });
                if (previous) beforeScore = previous as Prisma.JsonObject;
              } else if (eventId && input?.matchId) {
                const previous = await tx.match.findFirst({
                  where: { id: input.matchId, round: { tournamentId: eventId } },
                  select: {
                    scoreA: true,
                    scoreB: true,
                    completed: true,
                    sets: { take: 5, select: { setNumber: true, gamesA: true, gamesB: true } }
                  }
                });
                if (previous) beforeScore = previous as Prisma.JsonObject;
              }
              const value = await handler.call(this, request, reply);
              if (reply.statusCode >= 400) throw new RejectedMutation(value);
              const data = value as { data?: { id?: string } } | undefined;
              const metadata: Prisma.JsonObject = {};
              for (const key of [
                "scoreA",
                "scoreB",
                "matchId",
                "courtId",
                "playerId",
                "targetPlayerId",
                "sourcePlayerId",
                "matchTbA",
                "matchTbB",
                "contributeToCareerLeaderboard",
                "expectedVersion"
              ]) {
                const entry = (request.body as Record<string, unknown> | undefined)?.[key];
                if (["string", "number", "boolean"].includes(typeof entry))
                  metadata[key] = entry as string | number | boolean;
              }
              if (beforeVersion !== undefined) metadata.beforeVersion = beforeVersion;
              if (eventId) {
                const after = await tx.tournament.findUnique({
                  where: { id: eventId },
                  select: { version: true }
                });
                if (after) metadata.afterVersion = after.version;
              }
              if (params.courtId) metadata.courtId = params.courtId;
              if (beforeScore) metadata.beforeScore = beforeScore;
              if (Array.isArray(input?.sets))
                metadata.sets = input.sets.slice(0, 5).map((set) => {
                  const row = set as Record<string, unknown>;
                  return {
                    setNumber: Number(row.setNumber),
                    gamesA: Number(row.gamesA),
                    gamesB: Number(row.gamesB)
                  };
                });
              await prisma.organizerActivity.create({
                data: {
                  organizerId: context.organizerId,
                  actorUserId: context.actorUserId,
                  actorName: request.user?.name ?? "Organizer",
                  action: `${request.method} ${route.url}`,
                  targetId: eventId ?? data?.data?.id ?? params.id ?? null,
                  requestId: request.id,
                  metadata: metadata as Prisma.InputJsonValue
                }
              });
              return value;
            }),
          { maxWait: 15000, timeout: 30000 }
        );
      } catch (error) {
        if (error instanceof RejectedMutation) return error.result;
        throw error;
      }
      for (const effect of effects) {
        try {
          await effect();
        } catch {
          request.log.error("Post-commit realtime delivery failed; persisted data is intact.");
        }
      }
      return result;
    };
  });
}
