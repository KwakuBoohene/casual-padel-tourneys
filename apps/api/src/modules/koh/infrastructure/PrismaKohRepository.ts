import type {
  AssignKohCourtsInput,
  CreateKohTournamentInput,
  KohRankingsBoard,
  PromoteKohPickInput,
  RenameKohPlayerInput,
  ReplaceKohPartnerInput,
  SubmitKohScoreInput,
  SwapKohUnitInput
} from "@padel/shared";

import type { KohRepository } from "../application/ports.js";
import type { KohTournamentHub } from "../domain/types.js";
import { assignKohCourts } from "./ops/assignKohOps.js";
import { createKohTournament } from "./ops/createKohOps.js";
import { endKohTournament } from "./ops/lifecycleKohOps.js";
import {
  getKohHub,
  getKohHubByPublicToken,
  getKohRankings,
  getKohRankingsByPublicToken
} from "./ops/loadKohOps.js";
import { pickKohPromotion } from "./ops/promoteKohOps.js";
import { randomizeKohCourtQueue, reorderKohCourtQueue } from "./ops/queueKohOps.js";
import { renameKohPlayer } from "./ops/renameKohPlayerOps.js";
import { replaceKohPartner } from "./ops/replaceKohPartnerOps.js";
import { submitKohCourtScore } from "./ops/scoreKohOps.js";
import { swapKohCourtSlot } from "./ops/swapKohOps.js";

/** Thin façade over the Prisma operation modules in `infrastructure/ops`. */
export class PrismaKohRepository implements KohRepository {
  getHub(tournamentId: string, organizerId?: string): Promise<KohTournamentHub> {
    return getKohHub(tournamentId, organizerId);
  }

  getHubByPublicToken(publicToken: string): Promise<KohTournamentHub | null> {
    return getKohHubByPublicToken(publicToken);
  }

  getRankings(
    tournamentId: string,
    organizerId: string,
    courtNumber?: number
  ): Promise<KohRankingsBoard> {
    return getKohRankings(tournamentId, organizerId, courtNumber);
  }

  getRankingsByPublicToken(
    publicToken: string,
    courtNumber?: number
  ): Promise<KohRankingsBoard | null> {
    return getKohRankingsByPublicToken(publicToken, courtNumber);
  }

  create(input: CreateKohTournamentInput, organizerId: string): Promise<KohTournamentHub> {
    return createKohTournament(input, organizerId);
  }

  assignCourts(
    tournamentId: string,
    organizerId: string,
    input: AssignKohCourtsInput
  ): Promise<KohTournamentHub> {
    return assignKohCourts(tournamentId, organizerId, input);
  }

  randomizeQueue(
    tournamentId: string,
    organizerId: string,
    courtNumber: number
  ): Promise<KohTournamentHub> {
    return randomizeKohCourtQueue(tournamentId, organizerId, courtNumber);
  }

  reorderQueue(
    tournamentId: string,
    organizerId: string,
    courtNumber: number,
    unitIds: string[]
  ): Promise<KohTournamentHub> {
    return reorderKohCourtQueue(tournamentId, organizerId, courtNumber, unitIds);
  }

  submitScore(
    tournamentId: string,
    organizerId: string,
    courtId: string,
    input: SubmitKohScoreInput
  ): Promise<KohTournamentHub> {
    return submitKohCourtScore(tournamentId, organizerId, courtId, input);
  }

  swapSlot(
    tournamentId: string,
    organizerId: string,
    courtId: string,
    input: SwapKohUnitInput
  ): Promise<KohTournamentHub> {
    return swapKohCourtSlot(tournamentId, organizerId, courtId, input);
  }

  pickPromotion(
    tournamentId: string,
    organizerId: string,
    input: PromoteKohPickInput
  ): Promise<KohTournamentHub> {
    return pickKohPromotion(tournamentId, organizerId, input);
  }

  renamePlayer(
    tournamentId: string,
    organizerId: string,
    playerId: string,
    input: RenameKohPlayerInput
  ): Promise<KohTournamentHub> {
    return renameKohPlayer(tournamentId, organizerId, playerId, input);
  }

  replacePartner(
    tournamentId: string,
    organizerId: string,
    unitId: string,
    input: ReplaceKohPartnerInput
  ): Promise<KohTournamentHub> {
    return replaceKohPartner(tournamentId, organizerId, unitId, input);
  }

  endTournament(
    tournamentId: string,
    organizerId: string,
    expectedVersion: number
  ): Promise<KohTournamentHub> {
    return endKohTournament(tournamentId, organizerId, expectedVersion);
  }
}
