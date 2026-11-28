import { z } from "zod";

import { REGULAR_SETS_TO_WIN_MAX } from "../scoring/regularMatchLength.js";
import { KING_OF_THE_COURT, LEGACY_KING_OF_THE_HILL } from "../tournamentMode.js";
import { KOH_MAX_UNITS_PER_COURT, kohPairingModeSchema, kohPromotionRuleSchema } from "./koh.js";
import {
  americanoMexicanoModeSchema,
  deuceModeSchema,
  gameWinBySchema,
  playerGenderSchema,
  regularSetFormatSchema,
  schedulingModeSchema,
  scoringModeSchema,
  tiebreakPointsSchema,
  variantSchema
} from "./tournament.js";

/** Caps that keep a draft row small; the full create schemas apply on start. */
export const DRAFT_LIMITS = {
  nameMax: 120,
  playerNameMax: 80,
  playersMax: 64,
  teamsMax: 32,
  courtsMax: 32,
  payloadBytesMax: 32 * 1024
} as const;

const draftPlayerSchema = z.object({
  /** May be blank while the organizer is typing; blanks are dropped on start. */
  name: z.string().max(DRAFT_LIMITS.playerNameMax),
  gender: playerGenderSchema.optional()
});

const draftPairSchema = z.object({
  playerA: draftPlayerSchema,
  playerB: draftPlayerSchema,
  name: z.string().max(DRAFT_LIMITS.playerNameMax).optional()
});

/** Raw (untransformed) regular scoring input with every field optional. */
const draftRegularScoringSchema = z.object({
  setFormat: regularSetFormatSchema.optional(),
  gameWinBy: gameWinBySchema.optional(),
  deuceMode: deuceModeSchema.optional(),
  setsToWin: z.number().int().min(1).max(REGULAR_SETS_TO_WIN_MAX).optional(),
  setTiebreakTo: tiebreakPointsSchema.optional(),
  matchTiebreak: z.boolean().optional()
});

const commonDraftFields = {
  name: z.string().max(DRAFT_LIMITS.nameMax).optional(),
  courts: z.number().int().min(1).max(DRAFT_LIMITS.courtsMax).optional(),
  regularScoring: draftRegularScoringSchema.optional(),
  contributeToCareerLeaderboard: z.boolean().optional()
};

export const americanoMexicanoDraftPayloadSchema = z.object({
  ...commonDraftFields,
  mode: americanoMexicanoModeSchema,
  variant: variantSchema.optional(),
  schedulingMode: schedulingModeSchema.optional(),
  players: z.array(draftPlayerSchema).max(DRAFT_LIMITS.playersMax).optional(),
  teams: z.array(draftPairSchema).max(DRAFT_LIMITS.teamsMax).optional(),
  pointsPerMatch: z.number().int().min(1).optional(),
  scoringMode: scoringModeSchema.optional(),
  targetGamesPerPlayer: z.number().int().min(1).optional(),
  tournamentTimeMinutes: z.number().int().min(1).optional()
});

export const kohDraftCourtAssignmentSchema = z.object({
  courtNumber: z.number().int().min(1).max(DRAFT_LIMITS.courtsMax),
  units: z.array(draftPairSchema.omit({ name: true })).max(KOH_MAX_UNITS_PER_COURT)
});

export const kohDraftPayloadSchema = z.object({
  ...commonDraftFields,
  mode: z
    .enum([KING_OF_THE_COURT, LEGACY_KING_OF_THE_HILL])
    .transform(() => KING_OF_THE_COURT),
  pairingMode: kohPairingModeSchema.optional(),
  promotionRules: z.array(kohPromotionRuleSchema).max(DRAFT_LIMITS.courtsMax).optional(),
  /** King of the Court start = create + assign pairs to courts. */
  courtAssignments: z.array(kohDraftCourtAssignmentSchema).max(DRAFT_LIMITS.courtsMax).optional()
});

/** UTF-8 byte length without relying on TextEncoder (Hermes-safe). */
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
}

/** Anything the create wizard has collected so far. Only `mode` is required. */
export const tournamentDraftPayloadSchema = z
  .union([americanoMexicanoDraftPayloadSchema, kohDraftPayloadSchema])
  .superRefine((value, ctx) => {
    if (utf8ByteLength(JSON.stringify(value)) > DRAFT_LIMITS.payloadBytesMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "This draft is too large to save. Remove some players or teams."
      });
    }
  });

export type AmericanoMexicanoDraftPayload = z.infer<typeof americanoMexicanoDraftPayloadSchema>;
export type KohDraftPayload = z.infer<typeof kohDraftPayloadSchema>;
export type TournamentDraftPayload = z.infer<typeof tournamentDraftPayloadSchema>;
export type TournamentDraftPayloadInput = z.input<typeof tournamentDraftPayloadSchema>;

/** Draft-scoped role: account owner, account manager, or per-draft invited editor. */
export type DraftRole = "OWNER" | "MANAGER" | "EDITOR";
