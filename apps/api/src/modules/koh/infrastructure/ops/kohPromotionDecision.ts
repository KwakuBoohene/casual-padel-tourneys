import type { KohCourtChange } from "@padel/shared";
import { Prisma } from "@prisma/client";

import { maybePromote, type KohEngineCourt } from "../../../../engine/koh/index.js";
import type { KohDbTournament } from "../mappers/kohInclude.js";
import { notifyToCourtChange, toEngineCourt } from "../mappers/kohEngineMapper.js";

export type KohPromotionDecision = {
  courtChange: KohCourtChange | null;
  /** Non-null only when a promotion moved units and every court must be rewritten. */
  courtsToPersist: KohEngineCourt[] | null;
  /** Null means "leave `kohPendingPromote` untouched". */
  pendingPromote: Prisma.InputJsonValue | typeof Prisma.JsonNull | null;
};

/** Ask the engine whether the finished match triggers a promotion, and how to persist it. */
export function decideKohPromotion(args: {
  row: KohDbTournament;
  scoredCourtId: string;
  scoredCourtNumber: number;
  scoredCourtQueue: KohEngineCourt;
}): KohPromotionDecision {
  const promo = maybePromote({
    courts: args.row.kohCourts.map((entry) =>
      entry.id === args.scoredCourtId ? args.scoredCourtQueue : toEngineCourt(entry)
    ),
    rules: args.row.kohPromotionRules.map((rule) => ({
      courtNumber: rule.courtNumber,
      winsRequired: rule.winsRequired,
      promoteToCourtNumber: rule.promoteToCourtNumber ?? undefined
    })),
    fromCourtNumber: args.scoredCourtNumber
  });

  if (promo.notify?.type === "PROMOTED") {
    return {
      courtChange: notifyToCourtChange(promo.notify),
      courtsToPersist: promo.courts,
      pendingPromote: Prisma.JsonNull
    };
  }
  if (promo.notify?.type === "NEEDS_ORGANIZER_PICK") {
    return {
      courtChange: notifyToCourtChange(promo.notify),
      courtsToPersist: null,
      pendingPromote: {
        fromCourtNumber: promo.notify.fromCourtNumber,
        toCourtNumber: promo.notify.toCourtNumber,
        promotedUnitId: promo.notify.promotedUnitId,
        candidateUnitIds: promo.notify.candidateUnitIds
      }
    };
  }
  return { courtChange: null, courtsToPersist: null, pendingPromote: null };
}
