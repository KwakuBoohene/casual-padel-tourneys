import type { KohCourt, KohPromotionRule, KohUnit, RegularScoringConfig } from "@padel/shared";

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
}

/** Organizer hub returned by KOH create/assign/get. */
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
  players: Array<{ id: string; name: string; gender?: "MALE" | "FEMALE" }>;
  courts: Array<
    KohCourt & {
      unitCount: number;
      activeMatch?: unknown;
      tempSwap?: unknown;
    }
  >;
  ready: boolean;
  balanceHint: string | null;
  pendingPromote?: unknown;
}

export type { KohUnit };
