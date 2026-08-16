import { z } from "zod";

import { AMERICANO_MIN_TEAMS } from "../americano/teams.js";
import { MEXICANO_MIN_PLAYERS, MEXICANO_MIN_TEAMS } from "../mexicano/ladder.js";
import { REGULAR_SETS_TO_WIN_MAX } from "../scoring/regularMatchLength.js";

export const tournamentModeSchema = z.enum(["AMERICANO", "MEXICANO", "KING_OF_THE_HILL"]);
/** @deprecated Prefer tournamentModeSchema — kept for existing imports. */
export const modeSchema = tournamentModeSchema;
export const americanoMexicanoModeSchema = z.enum(["AMERICANO", "MEXICANO"]);
export const variantSchema = z.enum(["CLASSIC", "MIXED", "TEAM"]);
export const schedulingModeSchema = z.enum(["TARGET_GAMES", "TOTAL_TIME", "ROUND_ROBIN"]);
export const playerGenderSchema = z.enum(["MALE", "FEMALE"]);
export const scoringModeSchema = z.enum(["AMERICANO_POINTS", "REGULAR"]);
export const regularSetFormatSchema = z.enum(["BO3_GAMES", "BO5_GAMES", "FULL_SET"]);
export const gameWinBySchema = z.union([z.literal(1), z.literal(2)]);
export const tiebreakPointsSchema = z.union([z.literal(7), z.literal(10)]);

export const regularScoringSchema = z
  .object({
    setFormat: regularSetFormatSchema,
    gameWinBy: gameWinBySchema,
    setsToWin: z.number().int().min(1).max(REGULAR_SETS_TO_WIN_MAX),
    setTiebreakTo: tiebreakPointsSchema.optional(),
    matchTiebreak: z.boolean().optional()
  })
  .superRefine((value, ctx) => {
    if (value.setFormat === "FULL_SET" && value.gameWinBy === 2 && value.setTiebreakTo === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["setTiebreakTo"],
        message: "Provide setTiebreakTo (7 or 10) for full set win-by-2."
      });
    }
    if (value.matchTiebreak === true && value.setsToWin !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["matchTiebreak"],
        message: "Match tiebreak is only valid with setsToWin: 2 (two sets + match tiebreak)."
      });
    }
  });

const tournamentPlayerInputSchema = z.object({
  name: z.string().min(1),
  gender: playerGenderSchema.optional()
});

export const fixedTeamInputSchema = z.object({
  playerA: tournamentPlayerInputSchema,
  playerB: tournamentPlayerInputSchema,
  name: z.string().min(1).optional()
});

export const createTournamentSchema = z
  .object({
    name: z.string().min(2),
    mode: americanoMexicanoModeSchema,
    variant: variantSchema,
    schedulingMode: schedulingModeSchema,
    players: z.array(tournamentPlayerInputSchema).default([]),
    teams: z.array(fixedTeamInputSchema).optional(),
    courts: z.number().int().min(1),
    pointsPerMatch: z.number().int().min(1).optional(),
    scoringMode: scoringModeSchema.default("AMERICANO_POINTS"),
    regularScoring: regularScoringSchema.optional(),
    targetGamesPerPlayer: z.number().int().min(1).optional(),
    tournamentTimeMinutes: z.number().int().min(10).optional(),
    contributeToCareerLeaderboard: z.boolean().optional().default(true)
  })
  .superRefine((value, ctx) => {
    const isMexicano = value.mode === "MEXICANO";
    if (!isMexicano && value.schedulingMode === "TARGET_GAMES" && !value.targetGamesPerPlayer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide targetGamesPerPlayer for TARGET_GAMES mode."
      });
    }
    if (!isMexicano && value.schedulingMode === "TOTAL_TIME" && !value.tournamentTimeMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide tournamentTimeMinutes for TOTAL_TIME mode."
      });
    }
    if (value.variant === "TEAM") {
      const teams = value.teams ?? [];
      const minTeams = isMexicano ? MEXICANO_MIN_TEAMS : AMERICANO_MIN_TEAMS;
      const label = isMexicano ? "Team Mexicano" : "Team Americano";
      if (teams.length < minTeams) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["teams"],
          message: `${label} requires at least ${minTeams} fixed pairs.`
        });
      }
    } else if (value.teams && value.teams.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["teams"],
        message: "Fixed teams are only valid with variant TEAM."
      });
    } else if (isMexicano && value.players.length < MEXICANO_MIN_PLAYERS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["players"],
        message: `Mexicano requires at least ${MEXICANO_MIN_PLAYERS} players.`
      });
    } else if (!isMexicano && value.players.length < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["players"],
        message: "Provide at least 4 players."
      });
    }
    if (value.variant === "MIXED") {
      for (const player of value.players) {
        if (!player.gender) {
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

    if (scoringMode === "REGULAR" && !value.regularScoring) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["regularScoring"],
        message: "Provide regularScoring (set format) for Regular scoring."
      });
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

/** Organizer advances Mexicano after the current round is fully scored. */
export const advanceMexicanoRoundSchema = z.object({
  tournamentId: z.string().min(1),
  expectedVersion: z.number().int().min(0)
});

/** End Mexicano night; incomplete live round is discarded. */
export const endMexicanoNightSchema = z.object({
  tournamentId: z.string().min(1),
  expectedVersion: z.number().int().min(0)
});
