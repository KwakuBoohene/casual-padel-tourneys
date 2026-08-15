import type { KohLastResult, KohTempSwap, KohUnit } from "@padel/shared";

export type KohPublicCourt = {
  id: string;
  courtNumber: number;
  king: KohUnit | null;
  challenger: KohUnit | null;
  waiting: KohUnit[];
  tempSwap?: KohTempSwap | null;
  lastResult?: KohLastResult | null;
};

export type KohPublicHub = {
  id: string;
  publicToken: string;
  updatedAt: string;
  config: {
    name: string;
    mode: "KING_OF_THE_HILL" | string;
    pairingMode?: "WINNER_STAYS" | "ROUND_ROBIN_PAIRS";
  };
  courts: KohPublicCourt[];
};

export function isKohPublicHub(value: unknown): value is KohPublicHub {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const config = row.config as Record<string, unknown> | undefined;
  return config?.mode === "KING_OF_THE_HILL" && Array.isArray(row.courts);
}

export function formatKohPair(unit: KohUnit | null | undefined): string {
  if (!unit) return "—";
  return `${unit.playerAName} / ${unit.playerBName}`;
}

export function formatKohLastResult(result: KohLastResult | null | undefined): string | null {
  if (!result) return null;
  const score = `${result.gamesA}-${result.gamesB}`;
  if (result.specialLabel) return `Last: ${score} · ${result.specialLabel}`;
  return `Last: ${score}`;
}
