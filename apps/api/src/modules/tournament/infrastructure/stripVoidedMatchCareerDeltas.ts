import { logger } from "../../../lib/logger.js";
import { prisma } from "../../../lib/prisma.js";

/**
 * Remove career credit belonging to voided matches.
 *
 * Credit is written when a match completes, but a Regular match can be edited back to a draft
 * afterwards — that reverses the player counters and leaves the delta behind. Closing then
 * voids the match, so without this strip a match nobody finished would keep counting on the
 * account leaderboard forever.
 *
 * Derives the voided set from the database rather than from one close call, so it is
 * idempotent: if it ever fails, closing again (which is itself idempotent) retries the strip.
 */
export async function stripVoidedMatchCareerDeltas(tournamentId: string): Promise<number> {
  const voided = await prisma.match.findMany({
    where: { round: { tournamentId }, voidedAt: { not: null } },
    select: { id: true }
  });
  if (voided.length === 0) {
    return 0;
  }
  const removed = await prisma.organizerPlayerStatDelta.deleteMany({
    where: { tournamentId, matchId: { in: voided.map((match) => match.id) } }
  });
  if (removed.count > 0) {
    logger.info("careerCredits/stripVoidedMatchCareerDeltas", {
      tournamentId,
      voidedMatchCount: voided.length,
      removedDeltas: removed.count
    });
  }
  return removed.count;
}
