import type {
  KohCourt,
  KohCourtChange,
  KohPendingPromote,
  KohPromotionRule,
  KohTempSwap,
  KohUnit,
  MatchSet,
  RegularScoringConfig
} from "@padel/shared";

export type KohCreateStep =
  | "NAME"
  | "PAIRING"
  | "FORMAT"
  | "DEUCE"
  | "COURTS"
  | "PROMOTION"
  | "ASSIGN"
  | "REVIEW";

export type KohDeuceMode = "ADVANTAGE" | "GOLDEN" | "STAR";

export type KohMatchFormatChoice = "FULL_SET" | "BO3_GAMES" | "BO5_GAMES";

export interface KohDraftUnit {
  id: string;
  playerAName: string;
  playerBName: string;
}

export interface KohDraftCourt {
  courtNumber: number;
  units: KohDraftUnit[];
}

export interface KohDraftPromoRule {
  courtNumber: number;
  enabled: boolean;
  winsRequired: number;
}

export interface KohCreateDraft {
  name: string;
  pairingMode: "WINNER_STAYS";
  matchFormat: KohMatchFormatChoice;
  deuceMode: KohDeuceMode;
  courts: number;
  promoRules: KohDraftPromoRule[];
  courtUnits: KohDraftCourt[];
  assignCourtIndex: number;
  selectedUnitId: string | null;
  contributeToCareerLeaderboard: boolean;
}

/** Organizer hub returned by KOH create/assign/get/score. */
export interface KohTournamentHub {
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
    regularScoring: RegularScoringConfig;
    promotionRules?: KohPromotionRule[];
  };
  players: { id: string; name: string; gender?: "MALE" | "FEMALE" }[];
  courts: (KohCourt & {
      unitCount: number;
      activeMatch: {
        id: string;
        unitAId: string;
        unitBId: string;
        completed: boolean;
        sets: (MatchSet & {
            winMethodsA?: ("REGULAR" | "GOLDEN" | "STAR")[];
            winMethodsB?: ("REGULAR" | "GOLDEN" | "STAR")[];
          })[];
      } | null;
      tempSwap?: KohTempSwap | null;
    })[];
  ready: boolean;
  balanceHint: string | null;
  endedAt?: string | null;
  pendingPromote?: KohPendingPromote | null;
  lastMatchEvent?: {
    type: "KING_WIN" | "KING_LOSS";
    courtId: string;
    winnerUnitId: string;
    loserUnitId: string;
  };
  lastCourtChange?: KohCourtChange | null;
}

export type { KohUnit, KohCourtChange, KohPendingPromote };
