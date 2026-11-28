import { z } from "zod";

/**
 * Shape of the PadelMix public tournament payload, limited to the fields the
 * import reads. The API is undocumented, so everything else is ignored and
 * anything that does not fit is rejected rather than guessed at.
 */
const MAX_PLAYERS = 200;
const MAX_ROUNDS = 300;
const MAX_MATCHES_PER_ROUND = 50;

const playerRefSchema = z.object({ id: z.string().min(1) });

const teamSchema = z.object({ player1: playerRefSchema, player2: playerRefSchema });

const scoreSchema = z.number().int().min(0).max(999).nullish();

const matchSchema = z.object({
  teamA: teamSchema,
  teamB: teamSchema,
  courtName: z.string().nullish(),
  teamAScore: scoreSchema,
  teamBScore: scoreSchema
});

const roundSchema = z.object({
  roundNumber: z.number().int(),
  stage: z.string().nullish(),
  matches: z.array(matchSchema).max(MAX_MATCHES_PER_ROUND)
});

const participantSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  gender: z.string().nullish()
});

/** Read first so an unsupported format gets a specific message, not a shape error. */
export const padelMixFormatSchema = z.object({
  tournamentData: z.object({
    information: z.object({
      tournamentType: z.string(),
      tournamentVariant: z.string().nullish(),
      participantType: z.string().nullish()
    })
  })
});

export const padelMixPayloadSchema = z.object({
  tournamentData: z.object({
    rounds: z.array(roundSchema).max(MAX_ROUNDS),
    information: z.object({
      tournamentName: z.string().trim().max(120).nullish(),
      numberOfCourts: z.number().int().min(1).max(MAX_MATCHES_PER_ROUND),
      pointsPerRound: z.number().int().min(1).max(999).nullish(),
      courts: z.array(z.object({ name: z.string() })).nullish(),
      tournamentParticipants: z.array(participantSchema).min(4).max(MAX_PLAYERS)
    })
  })
});

export type PadelMixPayload = z.infer<typeof padelMixPayloadSchema>;
export type PadelMixRound = PadelMixPayload["tournamentData"]["rounds"][number];
export type PadelMixMatch = PadelMixRound["matches"][number];
