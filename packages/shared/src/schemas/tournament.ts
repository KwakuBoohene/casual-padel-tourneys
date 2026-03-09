import { z } from "zod";

export const modeSchema = z.enum(["AMERICANO", "MEXICANO"]);
export const variantSchema = z.enum(["CLASSIC", "MIXED", "TEAM"]);
export const schedulingModeSchema = z.enum(["TARGET_GAMES", "TOTAL_TIME", "ROUND_ROBIN"]);
export const playerGenderSchema = z.enum(["MALE", "FEMALE"]);

export const createTournamentSchema = z
  .object({
    name: z.string().min(2),
    mode: modeSchema,
    variant: variantSchema,
    schedulingMode: schedulingModeSchema,
    players: z.array(z.object({ name: z.string().min(1), gender: playerGenderSchema.optional() })).min(4),
    courts: z.number().int().min(1),
    pointsPerMatch: z.number().int().min(1),
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
  });

export const submitScoreSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
  expectedVersion: z.number().int().min(0)
});

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
