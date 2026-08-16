import type {
  AssignKohCourtsInput,
  CreateKohTournamentInput,
  PromoteKohPickInput,
  KohRankingsBoard,
  RenameKohPlayerInput,
  ReplaceKohPartnerInput,
  SubmitKohScoreInput,
  SwapKohUnitInput
} from "@padel/shared";

import type { TournamentEvent } from "../../../realtime/events.js";
import type { KohTournamentHub } from "../domain/types.js";

/**
 * Persistence port for the KOH aggregate. Reads return the hub projection; writes
 * bump `version` and return the refreshed hub so use-cases can publish it.
 */
export interface KohRepository {
  /** Throws NOT_FOUND when the row is missing, not KOH, or owned by someone else. */
  getHub(tournamentId: string, organizerId?: string): Promise<KohTournamentHub>;
  getHubByPublicToken(publicToken: string): Promise<KohTournamentHub | null>;
  getRankings(
    tournamentId: string,
    organizerId: string,
    courtNumber?: number
  ): Promise<KohRankingsBoard>;
  getRankingsByPublicToken(
    publicToken: string,
    courtNumber?: number
  ): Promise<KohRankingsBoard | null>;

  create(input: CreateKohTournamentInput, organizerId: string): Promise<KohTournamentHub>;
  assignCourts(
    tournamentId: string,
    organizerId: string,
    input: AssignKohCourtsInput
  ): Promise<KohTournamentHub>;
  randomizeQueue(
    tournamentId: string,
    organizerId: string,
    courtNumber: number
  ): Promise<KohTournamentHub>;
  reorderQueue(
    tournamentId: string,
    organizerId: string,
    courtNumber: number,
    unitIds: string[]
  ): Promise<KohTournamentHub>;
  submitScore(
    tournamentId: string,
    organizerId: string,
    courtId: string,
    input: SubmitKohScoreInput
  ): Promise<KohTournamentHub>;
  swapSlot(
    tournamentId: string,
    organizerId: string,
    courtId: string,
    input: SwapKohUnitInput
  ): Promise<KohTournamentHub>;
  pickPromotion(
    tournamentId: string,
    organizerId: string,
    input: PromoteKohPickInput
  ): Promise<KohTournamentHub>;
  renamePlayer(
    tournamentId: string,
    organizerId: string,
    playerId: string,
    input: RenameKohPlayerInput
  ): Promise<KohTournamentHub>;
  replacePartner(
    tournamentId: string,
    organizerId: string,
    unitId: string,
    input: ReplaceKohPartnerInput
  ): Promise<KohTournamentHub>;
  endTournament(
    tournamentId: string,
    organizerId: string,
    expectedVersion: number
  ): Promise<KohTournamentHub>;
}

export interface KohEvents {
  publish(event: TournamentEvent): Promise<void>;
}

export type KohModuleDeps = {
  repo: KohRepository;
  events: KohEvents;
};
