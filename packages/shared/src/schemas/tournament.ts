import { z } from "zod";

export const modeSchema = z.enum(["AMERICANO", "MEXICANO"]);
export const variantSchema = z.enum(["CLASSIC", "MIXED", "TEAM"]);

export const createTournamentSchema = z
  .object({
    name: z.string().min(2),
    mode: modeSchema,
    variant: variantSchema,
    players: z.array(z.string().min(1)).min(4),
    courts: z.number().int().min(1),
    pointsPerMatch: z.number().int().min(1),
    targetGamesPerPlayer: z.number().int().min(1).optional(),
    tournamentTimeMinutes: z.number().int().min(10).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.targetGamesPerPlayer && !value.tournamentTimeMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide targetGamesPerPlayer or tournamentTimeMinutes."
      });
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
