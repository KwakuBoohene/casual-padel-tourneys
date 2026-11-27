import type { z } from "zod";

import type { assignKohCourtsSchema, createKohTournamentSchema } from "../schemas/koh.js";
import type { createTournamentSchema } from "../schemas/tournament.js";
import type {
  AmericanoMexicanoDraftPayload,
  KohDraftPayload,
  TournamentDraftPayload
} from "../schemas/tournamentDraft.js";
import { isKingOfTheCourtMode } from "../tournamentMode.js";

type DraftPlayer = { name: string; gender?: "MALE" | "FEMALE" };
type DraftPair = { playerA: DraftPlayer; playerB: DraftPlayer; name?: string };

export type DraftCreateBodies =
  | { kind: "AMERICANO_MEXICANO"; create: z.input<typeof createTournamentSchema> }
  | {
      kind: "KING_OF_THE_COURT";
      create: z.input<typeof createKohTournamentSchema>;
      assign: z.input<typeof assignKohCourtsSchema>;
    };

export function isKohDraftPayload(payload: TournamentDraftPayload): payload is KohDraftPayload {
  return isKingOfTheCourtMode(payload.mode);
}

function trimPlayer(player: DraftPlayer): DraftPlayer {
  const name = player.name.trim();
  return player.gender ? { name, gender: player.gender } : { name };
}

/** Players with a non-blank name, trimmed. */
export function namedPlayers(players: DraftPlayer[] | undefined): DraftPlayer[] {
  return (players ?? []).map(trimPlayer).filter((player) => player.name.length > 0);
}

/** Pairs where at least one name was typed (half-filled pairs are kept so validation can flag them). */
export function startedPairs(pairs: DraftPair[] | undefined): DraftPair[] {
  return (pairs ?? [])
    .map((pair) => ({
      ...(pair.name?.trim() ? { name: pair.name.trim() } : {}),
      playerA: trimPlayer(pair.playerA),
      playerB: trimPlayer(pair.playerB)
    }))
    .filter((pair) => pair.playerA.name.length > 0 || pair.playerB.name.length > 0);
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function americanoMexicanoBody(payload: AmericanoMexicanoDraftPayload): DraftCreateBodies {
  const teams = startedPairs(payload.teams);
  const create = withoutUndefined({
    name: (payload.name ?? "").trim(),
    mode: payload.mode,
    variant: payload.variant,
    schedulingMode: payload.schedulingMode,
    players: namedPlayers(payload.players),
    teams: teams.length > 0 ? teams : undefined,
    courts: payload.courts,
    pointsPerMatch: payload.pointsPerMatch,
    scoringMode: payload.scoringMode,
    regularScoring: payload.regularScoring,
    targetGamesPerPlayer: payload.targetGamesPerPlayer,
    tournamentTimeMinutes: payload.tournamentTimeMinutes,
    contributeToCareerLeaderboard: payload.contributeToCareerLeaderboard
  });
  return { kind: "AMERICANO_MEXICANO", create: create as z.input<typeof createTournamentSchema> };
}

function kohBody(payload: KohDraftPayload): DraftCreateBodies {
  const create = withoutUndefined({
    name: (payload.name ?? "").trim(),
    mode: payload.mode,
    pairingMode: payload.pairingMode,
    courts: payload.courts,
    regularScoring: payload.regularScoring,
    promotionRules: payload.promotionRules,
    contributeToCareerLeaderboard: payload.contributeToCareerLeaderboard
  });
  const assign = {
    courts: (payload.courtAssignments ?? []).map((court) => ({
      courtNumber: court.courtNumber,
      units: startedPairs(court.units).map(({ playerA, playerB }) => ({ playerA, playerB }))
    }))
  };
  return {
    kind: "KING_OF_THE_COURT",
    create: create as z.input<typeof createKohTournamentSchema>,
    assign
  };
}

/**
 * Normalize a draft into the exact bodies the existing create endpoints accept.
 * Mobile and the API start route both use this, so a started draft equals a direct create.
 */
export function draftToCreateBodies(payload: TournamentDraftPayload): DraftCreateBodies {
  return isKohDraftPayload(payload) ? kohBody(payload) : americanoMexicanoBody(payload);
}
