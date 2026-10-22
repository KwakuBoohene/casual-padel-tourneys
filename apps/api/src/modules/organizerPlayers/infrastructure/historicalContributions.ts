import { prisma } from "../../../lib/prisma.js";
import type { CareerDeltaQuery } from "../application/ports.js";
import type { CareerDelta } from "../domain/careerStats.js";

export async function listHistoricalContributions(query: CareerDeltaQuery): Promise<CareerDelta[]> {
  const rows = await prisma.historicalPlayerResult.findMany({
    where: {
      ...(query.organizerPlayerId
        ? { organizerPlayerId: query.organizerPlayerId }
        : query.activeOnly === false
          ? {}
          : { player: { archivedAt: null } }),
      revision: {
        active: true,
        import: {
          organizerId: query.organizerId,
          included: true,
          ...(query.since ? { eventDate: { gte: query.since } } : {})
        }
      }
    },
    // Never multiply the private source CSV/snapshot by every player in a leaderboard read.
    include: {
      player: { select: { name: true } },
      revision: {
        select: {
          importId: true,
          import: { select: { title: true, eventDate: true, mode: true, scoringMode: true } }
        }
      }
    },
    orderBy: { revision: { import: { eventDate: "desc" } } }
  });
  return rows.map((row) => ({
    organizerPlayerId: row.organizerPlayerId,
    organizerPlayerName: row.player.name,
    tournamentId: `historical:${row.revision.importId}`,
    tournamentName: row.revision.import.title,
    gamesWon: row.gamesWon ?? 0,
    gamesLost: row.gamesLost ?? 0,
    setsWon: row.setsWon ?? 0,
    setsLost: row.setsLost ?? 0,
    matchesWon: row.matchesWon,
    matchesLost: row.matchesLost,
    matchesDrawn: row.matchesDrawn,
    americanoPointsWon: row.americanoPointsWon ?? 0,
    americanoPointsLost: row.americanoPointsLost ?? 0,
    historical: {
      importId: row.revision.importId,
      date: row.revision.import.eventDate.toISOString(),
      mode: row.revision.import.mode,
      scoringMode: row.revision.import.scoringMode,
      sourceRank: row.sourceRank,
      setsComplete: row.revision.import.scoringMode !== "REGULAR" || row.setsWon !== null
    }
  }));
}
