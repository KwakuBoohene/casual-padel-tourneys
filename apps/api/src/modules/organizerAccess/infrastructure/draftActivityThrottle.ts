import type { Prisma } from "@prisma/client";

export const DRAFT_AUTOSAVE_ACTIVITY_WINDOW_MS = 5 * 60 * 1000;

/**
 * Draft autosave PATCHes arrive every few seconds; log at most one per actor/draft per window.
 */
export async function isThrottledDraftAutosave(
  tx: Prisma.TransactionClient,
  input: { action: string; targetId: string | null; actorUserId: string },
  now = new Date()
): Promise<boolean> {
  if (input.action !== "PATCH /drafts/:id" || !input.targetId) return false;
  const recent = await tx.organizerActivity.count({
    where: {
      action: input.action,
      targetId: input.targetId,
      actorUserId: input.actorUserId,
      occurredAt: { gte: new Date(now.getTime() - DRAFT_AUTOSAVE_ACTIVITY_WINDOW_MS) }
    }
  });
  return recent > 0;
}
