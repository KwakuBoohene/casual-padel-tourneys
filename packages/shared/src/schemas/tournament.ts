import { z } from "zod";

export const modeSchema = z.enum(["AMERICANO", "MEXICANO"]);
export const variantSchema = z.enum(["CLASSIC", "MIXED", "TEAM"]);
export const schedulingModeSchema = z.enum(["TARGET_GAMES", "TOTAL_TIME", "ROUND_ROBIN"]);
export const playerGenderSchema = z.enum(["MALE", "FEMALE"]);
export const scoringModeSchema = z.enum(["AMERICANO_POINTS", "REGULAR"]);
export const regularSetFormatSchema = z.enum(["BO3_GAMES", "BO5_GAMES", "FULL_SET"]);
export const gameWinBySchema = z.union([z.literal(1), z.literal(2)]);
export const tiebreakPointsSchema = z.union([z.literal(7), z.literal(10)]);

export const regularScoringSchema = z.object({
  setFormat: regularSetFormatSchema,
  gameWinBy: gameWinBySchema,
  setsToWin: z.number().int().min(1),
  setTiebreakTo: tiebreakPointsSchema.optional(),
  matchTiebreak: z.boolean().optional()
});

export const createTournamentSchema = z
  .object({
    name: z.string().min(2),
    mode: modeSchema,
    variant: variantSchema,
    schedulingMode: schedulingModeSchema,
    players: z.array(z.object({ name: z.string().min(1), gender: playerGenderSchema.optional() })).min(4),
    courts: z.number().int().min(1),
    pointsPerMatch: z.number().int().min(1).optional(),
    scoringMode: scoringModeSchema.default("AMERICANO_POINTS"),
    regularScoring: regularScoringSchema.optional(),
    targetGamesPerPlayer: z.number().int().min(1).optional(),
    tournamentTimeMinutes: z.number().int().min(10).optional()
  })
  .superRefine((value, ctx) => {
    if (value.schedulingMode === "TARGET_GAMES" && !value.targetGamesPerPlayer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide targetGamesPerPlayer for TARGET_GAMES mode."
      });
    }
    if (value.schedulingMode === "TOTAL_TIME" && !value.tournamentTimeMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide tournamentTimeMinutes for TOTAL_TIME mode."
      });
    }
    if (value.mode === "MEXICANO" && value.schedulingMode !== "TOTAL_TIME") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mexicano currently supports TOTAL_TIME scheduling mode."
      });
    }
    if (value.variant === "MIXED") {
      for (let index = 0; index < value.players.length; index += 1) {
        if (!value.players[index].gender) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Gender is required for every player in MIXED variant."
          });
          break;
        }
      }
    }

    const scoringMode = value.scoringMode ?? "AMERICANO_POINTS";
    if (scoringMode === "AMERICANO_POINTS") {
      if (value.pointsPerMatch === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pointsPerMatch"],
          message: "Provide pointsPerMatch for Americano scoring (single points)."
        });
      }
    }

    if (scoringMode === "REGULAR") {
      if (!value.regularScoring) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["regularScoring"],
          message: "Provide regularScoring (set format) for Regular scoring."
        });
      } else {
        const regular = value.regularScoring;
        if (regular.setFormat === "FULL_SET" && regular.gameWinBy === 2 && regular.setTiebreakTo === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["regularScoring", "setTiebreakTo"],
            message: "Provide setTiebreakTo (7 or 10) for full set win-by-2."
          });
        }
      }
    }
  });

export const matchSetSchema = z.object({
  setNumber: z.number().int().min(1),
  gamesA: z.number().int().min(0),
  gamesB: z.number().int().min(0),
  tbA: z.number().int().min(0).optional(),
  tbB: z.number().int().min(0).optional()
});

export const submitAmericanoScoreSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
  expectedVersion: z.number().int().min(0)
});

export const submitRegularScoreSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  sets: z.array(matchSetSchema).min(1),
  status: z.enum(["DRAFT", "COMPLETE"]),
  matchTbA: z.number().int().min(0).optional(),
  matchTbB: z.number().int().min(0).optional(),
  expectedVersion: z.number().int().min(0)
});

/** Points body (Americano) or sets + DRAFT/COMPLETE (Regular). */
export const submitScoreSchema = z.union([submitAmericanoScoreSchema, submitRegularScoreSchema]);

export function isRegularScoreBody(
  body: z.infer<typeof submitScoreSchema>
): body is z.infer<typeof submitRegularScoreSchema> {
  return "sets" in body && "status" in body;
}

export const renamePlayerSchema = z.object({
  tournamentId: z.string().min(1),
  playerId: z.string().min(1),
  newName: z.string().min(1)
});

export const renameTournamentSchema = z.object({
  tournamentId: z.string().min(1),
  newName: z.string().min(2)
});

export const adjustCourtsSchema = z.object({
  tournamentId: z.string().min(1),
  courts: z.number().int().min(1),
  expectedVersion: z.number().int().min(0)
});

export const substitutePlayerSchema = z.object({
  tournamentId: z.string().min(1),
  playerId: z.string().min(1),
  replacementName: z.string().min(1)
});

export const addPendingPlayerSchema = z.object({
  tournamentId: z.string().min(1),
  name: z.string().min(1),
  gender: playerGenderSchema.optional(),
  expectedVersion: z.number().int().min(0)
});

export const integratePendingPlayersSchema = z.object({
  tournamentId: z.string().min(1),
  expectedVersion: z.number().int().min(0)
});
