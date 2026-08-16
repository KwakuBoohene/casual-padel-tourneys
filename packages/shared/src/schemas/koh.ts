import { z } from "zod";

import { matchSetSchema, regularScoringSchema } from "./tournament.js";

export const kohPairingModeSchema = z.enum(["WINNER_STAYS", "ROUND_ROBIN_PAIRS"]);
export const kohGameWinMethodSchema = z.enum(["REGULAR", "GOLDEN", "STAR"]);

const kohPlayerInputSchema = z.object({
  name: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE"]).optional()
});

/** Doubles unit input — exactly two players; rejects singles. */
export const kohUnitInputSchema = z
  .object({
    playerA: kohPlayerInputSchema,
    playerB: kohPlayerInputSchema
  })
  .superRefine((value, ctx) => {
    if (value.playerA.name.trim().toLowerCase() === value.playerB.name.trim().toLowerCase()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["playerB", "name"],
        message: "A KOH unit needs two different players."
      });
    }
  });

export const kohPromotionRuleSchema = z.object({
  courtNumber: z.number().int().min(2),
  winsRequired: z.number().int().min(1),
  promoteToCourtNumber: z.number().int().min(1).optional()
});

/**
 * Create payload for King of the Hill (winner-stays).
 * Unit assignment / queue order is a later assign step (epic ticket 04).
 */
export const createKohTournamentSchema = z
  .object({
    name: z.string().min(2),
    mode: z.literal("KING_OF_THE_HILL"),
    pairingMode: kohPairingModeSchema.default("WINNER_STAYS"),
    courts: z.number().int().min(1),
    regularScoring: regularScoringSchema,
    promotionRules: z.array(kohPromotionRuleSchema).optional(),
    contributeToCareerLeaderboard: z.boolean().default(true)
  })
  .superRefine((value, ctx) => {
    const regular = value.regularScoring;
    if (regular.setFormat === "FULL_SET" && regular.gameWinBy === 2 && regular.setTiebreakTo === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["regularScoring", "setTiebreakTo"],
        message: "Provide setTiebreakTo (7 or 10) for full set win-by-2."
      });
    }

    if (value.courts === 1) {
      if (value.promotionRules && value.promotionRules.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["promotionRules"],
          message: "Single-court KOH must not include promotion rules."
        });
      }
      return;
    }

    if (!value.promotionRules || value.promotionRules.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promotionRules"],
        message: "Provide promotionRules when courts ≥ 2."
      });
      return;
    }

    const seen = new Set<number>();
    for (let index = 0; index < value.promotionRules.length; index += 1) {
      const rule = value.promotionRules[index];
      if (rule.courtNumber > value.courts) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["promotionRules", index, "courtNumber"],
          message: `courtNumber ${rule.courtNumber} exceeds courts (${value.courts}).`
        });
      }
      const promoteTo = rule.promoteToCourtNumber ?? rule.courtNumber - 1;
      if (promoteTo < 1 || promoteTo >= rule.courtNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["promotionRules", index, "promoteToCourtNumber"],
          message: "promoteToCourtNumber must be a stronger (lower) court than courtNumber."
        });
      }
      if (seen.has(rule.courtNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["promotionRules", index, "courtNumber"],
          message: "Duplicate promotion rule for the same court."
        });
      }
      seen.add(rule.courtNumber);
    }
  });

export type CreateKohTournamentInput = z.infer<typeof createKohTournamentSchema>;
export type KohUnitInput = z.infer<typeof kohUnitInputSchema>;

/** Soft/hard cap — also enforced in API assign. */
export const KOH_MAX_UNITS_PER_COURT = 12;

export const assignKohCourtSchema = z.object({
  courtNumber: z.number().int().min(1),
  units: z.array(kohUnitInputSchema).max(KOH_MAX_UNITS_PER_COURT)
});

/** Replace all court unit assignments for a KOH tournament. */
export const assignKohCourtsSchema = z
  .object({
    courts: z.array(assignKohCourtSchema).min(1)
  })
  .superRefine((value, ctx) => {
    const seen = new Set<number>();
    for (let index = 0; index < value.courts.length; index += 1) {
      const court = value.courts[index];
      if (seen.has(court.courtNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["courts", index, "courtNumber"],
          message: "Duplicate courtNumber in assignment."
        });
      }
      seen.add(court.courtNumber);
      if (court.units.length > KOH_MAX_UNITS_PER_COURT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["courts", index, "units"],
          message: `Max ${KOH_MAX_UNITS_PER_COURT} units per court.`
        });
      }
    }
  });

/** Full queue order for one court — index 0 = king, 1 = challenger, rest waiting. */
export const reorderKohQueueSchema = z.object({
  unitIds: z.array(z.string().min(1)).min(2)
});

export type AssignKohCourtsInput = z.infer<typeof assignKohCourtsSchema>;
export type ReorderKohQueueInput = z.infer<typeof reorderKohQueueSchema>;

export const kohMatchSetSchema = matchSetSchema.extend({
  winMethodsA: z.array(kohGameWinMethodSchema).optional(),
  winMethodsB: z.array(kohGameWinMethodSchema).optional()
});

/**
 * Score a KOH court match (king = side A, challenger = side B at submit time).
 * DRAFT persists sets only; COMPLETE runs winner-stays.
 */
export const submitKohScoreSchema = z.object({
  sets: z.array(kohMatchSetSchema).min(1),
  status: z.enum(["DRAFT", "COMPLETE"]),
  matchTbA: z.number().int().min(0).optional(),
  matchTbB: z.number().int().min(0).optional(),
  expectedVersion: z.number().int().min(0),
  /** Continue an existing draft match; omit to start/replace open draft for king vs challenger. */
  matchId: z.string().min(1).optional()
});

export type SubmitKohScoreInput = z.infer<typeof submitKohScoreSchema>;

export const kohSwapSlotSchema = z.enum(["KING", "CHALLENGER"]);

/**
 * Swap king or challenger with another unit on the same court.
 * King defaults to temporary (restore after next COMPLETE if still in slot);
 * pass permanent: true to keep. Challenger defaults to permanent.
 */
export const swapKohUnitSchema = z.object({
  slot: kohSwapSlotSchema,
  withUnitId: z.string().min(1),
  reason: z.string().min(1).max(500),
  permanent: z.boolean().optional(),
  expectedVersion: z.number().int().min(0)
});

export type SwapKohUnitInput = z.infer<typeof swapKohUnitSchema>;

/** Resolve NEEDS_ORGANIZER_PICK — demote the chosen candidate on the stronger court. */
export const promoteKohPickSchema = z.object({
  demotedUnitId: z.string().min(1),
  expectedVersion: z.number().int().min(0)
});

export type PromoteKohPickInput = z.infer<typeof promoteKohPickSchema>;

export const renameKohPlayerSchema = z.object({
  newName: z.string().min(1).max(80),
  expectedVersion: z.number().int().min(0)
});

export type RenameKohPlayerInput = z.infer<typeof renameKohPlayerSchema>;

/**
 * Replace one partner on a doubles unit. Ladder slot + unit match W–L stay;
 * new Player row is created for the replacement name.
 */
export const replaceKohPartnerSchema = z.object({
  leavePlayerId: z.string().min(1),
  replacement: kohPlayerInputSchema,
  expectedVersion: z.number().int().min(0)
});

export type ReplaceKohPartnerInput = z.infer<typeof replaceKohPartnerSchema>;

export const endKohTournamentSchema = z.object({
  expectedVersion: z.number().int().min(0)
});

export type EndKohTournamentInput = z.infer<typeof endKohTournamentSchema>;
