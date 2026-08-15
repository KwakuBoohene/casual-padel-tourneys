import { z } from "zod";

import { regularScoringSchema } from "./tournament.js";

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
    promotionRules: z.array(kohPromotionRuleSchema).optional()
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
