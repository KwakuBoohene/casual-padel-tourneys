import type {
  CreateKohTournamentInput,
  KohCourt,
  KohCourtChange,
  KohPendingPromote,
  KohPromotionRule,
  MatchSet
} from "@padel/shared";

export type KohHubActiveMatch = {
  id: string;
  unitAId: string;
  unitBId: string;
  completed: boolean;
  sets: Array<
    MatchSet & {
      winMethodsA?: Array<"REGULAR" | "GOLDEN" | "STAR">;
      winMethodsB?: Array<"REGULAR" | "GOLDEN" | "STAR">;
    }
  >;
};

export type KohHubCourt = KohCourt & {
  unitCount: number;
  activeMatch: KohHubActiveMatch | null;
};

export type KohTournamentHub = {
  id: string;
  publicToken: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  organizerId?: string;
  config: {
    name: string;
    mode: "KING_OF_THE_HILL";
    pairingMode: "WINNER_STAYS" | "ROUND_ROBIN_PAIRS";
    courts: number;
    scoringMode: "REGULAR";
    regularScoring: NonNullable<CreateKohTournamentInput["regularScoring"]>;
    promotionRules?: KohPromotionRule[];
  };
  players: Array<{ id: string; name: string; gender?: "MALE" | "FEMALE" }>;
  courts: KohHubCourt[];
  /** True when every court has ≥2 doubles units. */
  ready: boolean;
  /** Present when court unit counts differ by more than 1. */
  balanceHint: string | null;
  /** ISO timestamp when organizer ended the night; null while live. */
  endedAt: string | null;
  /** Last match result event after a COMPLETE score (optional). */
  lastMatchEvent?: {
    type: "KING_WIN" | "KING_LOSS";
    courtId: string;
    winnerUnitId: string;
    loserUnitId: string;
  };
  /** Set when auto-promo fires or needs an organizer pick. */
  lastCourtChange?: KohCourtChange | null;
  /** Pending weakest-candidate pick (multi-court). */
  pendingPromote?: KohPendingPromote | null;
};
