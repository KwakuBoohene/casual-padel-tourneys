import type { Prisma } from "@prisma/client";
export async function activityMetadata(
  tx: Prisma.TransactionClient,
  context: {
    eventId?: string;
    body: unknown;
    params: { id?: string; courtId?: string };
    beforeVersion?: number;
    beforeScore?: Prisma.JsonObject;
  }
): Promise<Prisma.JsonObject> {
  const { eventId, body, params, beforeVersion, beforeScore } = context;
  const input = body as { sets?: unknown[] } | undefined;
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
    const entry = (body as Record<string, unknown> | undefined)?.[key];
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

  return metadata;
}
