import type {
  AssignKohCourtsInput,
  CreateKohTournamentInput,
  KohCourt,
  KohCourtChange,
  KohLastResult,
  KohPendingPromote,
  KohPromotionRule,
  KohRankingsBoard,
  KohTempSwap,
  KohUnit,
  MatchSet,
  PromoteKohPickInput,
  RenameKohPlayerInput,
  ReplaceKohPartnerInput,
  SubmitKohScoreInput,
  SwapKohUnitInput
} from "@padel/shared";
import { createId, evaluateMatch, KOH_MAX_UNITS_PER_COURT } from "@padel/shared";
import { Prisma } from "@prisma/client";

import {
  applyKohMatchResult,
  applyOrganizerPromotionPick,
  maybePromote,
  shuffleQueueOnce,
  sortKohRankings,
  type KohEngineCourt,
  type KohEngineUnit,
  type KohPromotionNotify
} from "../engine/koh/index.js";
import { logger } from "./logger.js";
import {
  creditKohMatchToOrganizerPlayers,
  ensureOrganizerPlayer
} from "./organizerPlayers.js";
import { prisma } from "./prisma.js";

const kohInclude = {
  players: true,
  kohPromotionRules: true,
  kohCourts: {
    include: {
      units: {
        include: {
          playerA: true,
          playerB: true
        },
        orderBy: { queuePosition: "asc" as const }
      },
      matches: {
        include: {
          sets: { orderBy: { setNumber: "asc" as const } }
        },
        orderBy: { updatedAt: "desc" as const },
        take: 8
      }
    },
    orderBy: { courtNumber: "asc" as const }
  }
} as const;

type KohDbTournament = Awaited<ReturnType<typeof loadKohRow>>;

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

export class KohVersionConflictError extends Error {
  constructor(
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(`Version conflict: expected ${expectedVersion}, got ${actualVersion}.`);
    this.name = "KohVersionConflictError";
  }
}

function mapUnit(row: {
  id: string;
  playerAId: string;
  playerBId: string;
  playerA: { name: string };
  playerB: { name: string };
  matchesWon?: number;
  matchesLost?: number;
}): KohUnit {
  return {
    id: row.id,
    playerAId: row.playerAId,
    playerBId: row.playerBId,
    playerAName: row.playerA.name,
    playerBName: row.playerB.name,
    matchesWon: row.matchesWon ?? 0,
    matchesLost: row.matchesLost ?? 0
  };
}

function parsePendingPromote(value: unknown): KohPendingPromote | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.fromCourtNumber !== "number" ||
    typeof row.toCourtNumber !== "number" ||
    typeof row.promotedUnitId !== "string" ||
    !Array.isArray(row.candidateUnitIds) ||
    !row.candidateUnitIds.every((id) => typeof id === "string")
  ) {
    return null;
  }
  return {
    fromCourtNumber: row.fromCourtNumber,
    toCourtNumber: row.toCourtNumber,
    promotedUnitId: row.promotedUnitId,
    candidateUnitIds: row.candidateUnitIds as string[]
  };
}

function mapTempSwap(row: {
  tempSwapSlot: string | null;
  tempSwapInUnitId: string | null;
  tempSwapOutUnitId: string | null;
  tempSwapReason: string | null;
}): KohTempSwap | null {
  if (
    (row.tempSwapSlot !== "KING" && row.tempSwapSlot !== "CHALLENGER") ||
    !row.tempSwapInUnitId ||
    !row.tempSwapOutUnitId ||
    !row.tempSwapReason
  ) {
    return null;
  }
  return {
    slot: row.tempSwapSlot,
    inUnitId: row.tempSwapInUnitId,
    outUnitId: row.tempSwapOutUnitId,
    reason: row.tempSwapReason
  };
}

function mapLastResult(
  matches: Array<{
    completed: boolean;
    sets: Array<{
      gamesA: number;
      gamesB: number;
      winMethodsA: Array<"REGULAR" | "GOLDEN" | "STAR">;
      winMethodsB: Array<"REGULAR" | "GOLDEN" | "STAR">;
    }>;
  }>
): KohLastResult | null {
  const completed = matches.find((match) => match.completed);
  if (!completed || completed.sets.length === 0) {
    return null;
  }
  let gamesA = 0;
  let gamesB = 0;
  let hadGolden = false;
  let hadStar = false;
  for (const set of completed.sets) {
    gamesA += set.gamesA;
    gamesB += set.gamesB;
    for (const method of [...set.winMethodsA, ...set.winMethodsB]) {
      if (method === "GOLDEN") hadGolden = true;
      if (method === "STAR") hadStar = true;
    }
  }
  const hadSpecialFinish = hadGolden || hadStar;
  return {
    gamesA,
    gamesB,
    hadSpecialFinish,
    specialLabel: hadStar ? "Star" : hadGolden ? "Golden" : undefined
  };
}

function mapCourt(row: {
  id: string;
  courtNumber: number;
  tempSwapSlot?: string | null;
  tempSwapInUnitId?: string | null;
  tempSwapOutUnitId?: string | null;
  tempSwapReason?: string | null;
  units: Array<{
    id: string;
    queuePosition: number;
    playerAId: string;
    playerBId: string;
    playerA: { name: string };
    playerB: { name: string };
    matchesWon?: number;
    matchesLost?: number;
  }>;
  matches?: Array<{
    id: string;
    unitAId: string;
    unitBId: string;
    completed: boolean;
    sets: Array<{
      setNumber: number;
      gamesA: number;
      gamesB: number;
      tbA: number | null;
      tbB: number | null;
      winMethodsA: Array<"REGULAR" | "GOLDEN" | "STAR">;
      winMethodsB: Array<"REGULAR" | "GOLDEN" | "STAR">;
    }>;
  }>;
}): KohHubCourt {
  const ordered = [...row.units].sort((a, b) => a.queuePosition - b.queuePosition);
  const mapped = ordered.map(mapUnit);
  const matches = row.matches ?? [];
  const draft = matches.find((match) => !match.completed);
  return {
    id: row.id,
    courtNumber: row.courtNumber,
    king: mapped[0] ?? null,
    challenger: mapped[1] ?? null,
    waiting: mapped.slice(2),
    tempSwap: mapTempSwap({
      tempSwapSlot: row.tempSwapSlot ?? null,
      tempSwapInUnitId: row.tempSwapInUnitId ?? null,
      tempSwapOutUnitId: row.tempSwapOutUnitId ?? null,
      tempSwapReason: row.tempSwapReason ?? null
    }),
    lastResult: mapLastResult(matches),
    unitCount: mapped.length,
    activeMatch: draft
      ? {
          id: draft.id,
          unitAId: draft.unitAId,
          unitBId: draft.unitBId,
          completed: draft.completed,
          sets: draft.sets.map((set) => ({
            setNumber: set.setNumber,
            gamesA: set.gamesA,
            gamesB: set.gamesB,
            tbA: set.tbA ?? undefined,
            tbB: set.tbB ?? undefined,
            winMethodsA: set.winMethodsA.length > 0 ? set.winMethodsA : undefined,
            winMethodsB: set.winMethodsB.length > 0 ? set.winMethodsB : undefined
          }))
        }
      : null
  };
}

export function computeBalanceHint(unitCounts: number[]): string | null {
  if (unitCounts.length === 0) {
    return null;
  }
  const min = Math.min(...unitCounts);
  const max = Math.max(...unitCounts);
  if (max - min > 1) {
    return "Court sizes differ by more than 1 — rebalance if possible.";
  }
  return null;
}

function toHub(row: NonNullable<KohDbTournament>): KohTournamentHub {
  const courts = row.kohCourts.map(mapCourt);
  const unitCounts = courts.map((court) => court.unitCount);
  const ready = courts.length > 0 && courts.every((court) => court.unitCount >= 2);
  const regularScoring = {
    setFormat: row.regularSetFormat ?? "FULL_SET",
    gameWinBy: (row.regularGameWinBy === 1 ? 1 : 2) as 1 | 2,
    setsToWin: row.regularSetsToWin ?? 1,
    setTiebreakTo:
      row.regularSetTiebreakTo === 7 || row.regularSetTiebreakTo === 10
        ? (row.regularSetTiebreakTo as 7 | 10)
        : undefined,
    matchTiebreak: row.regularMatchTiebreak ?? undefined
  };

  return {
    id: row.id,
    publicToken: row.publicToken,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    organizerId: row.organizerId ?? undefined,
    config: {
      name: row.name,
      mode: "KING_OF_THE_HILL",
      pairingMode: row.pairingMode === "ROUND_ROBIN_PAIRS" ? "ROUND_ROBIN_PAIRS" : "WINNER_STAYS",
      courts: row.courts,
      scoringMode: "REGULAR",
      regularScoring,
      promotionRules: row.kohPromotionRules.map((rule) => ({
        courtNumber: rule.courtNumber,
        winsRequired: rule.winsRequired,
        promoteToCourtNumber: rule.promoteToCourtNumber ?? undefined
      }))
    },
    players: row.players.map((player) => ({
      id: player.id,
      name: player.name,
      gender: player.gender === "MALE" || player.gender === "FEMALE" ? player.gender : undefined
    })),
    courts,
    ready,
    balanceHint: computeBalanceHint(unitCounts),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    pendingPromote: parsePendingPromote(row.kohPendingPromote)
  };
}

async function loadKohRow(tournamentId: string) {
  return prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: kohInclude
  });
}

export async function requireKohTournament(
  tournamentId: string,
  organizerId: string
): Promise<NonNullable<KohDbTournament>> {
  const row = await loadKohRow(tournamentId);
  if (!row || row.mode !== "KING_OF_THE_HILL") {
    throw new Error("KOH tournament not found.");
  }
  if (row.organizerId !== organizerId) {
    throw new Error("Tournament not found.");
  }
  return row;
}

function assertKohLive(row: NonNullable<KohDbTournament>): void {
  if (row.endedAt) {
    throw new Error("This KOH night has ended.");
  }
}

export async function getKohHub(tournamentId: string, organizerId?: string): Promise<KohTournamentHub> {
  const row = await loadKohRow(tournamentId);
  if (!row || row.mode !== "KING_OF_THE_HILL") {
    throw new Error("KOH tournament not found.");
  }
  if (organizerId !== undefined && row.organizerId !== organizerId) {
    throw new Error("Tournament not found.");
  }
  return toHub(row);
}

export async function createKohTournament(
  input: CreateKohTournamentInput,
  organizerId: string
): Promise<KohTournamentHub> {
  const id = createId("tournament");
  const publicToken = createId("public");
  const now = new Date();
  const pairingMode = input.pairingMode ?? "WINNER_STAYS";

  await prisma.tournament.create({
    data: {
      id,
      name: input.name,
      mode: "KING_OF_THE_HILL",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      courts: input.courts,
      pointsPerMatch: 24,
      scoringMode: "REGULAR",
      regularSetFormat: input.regularScoring.setFormat,
      regularGameWinBy: input.regularScoring.gameWinBy,
      regularSetsToWin: input.regularScoring.setsToWin,
      regularSetTiebreakTo: input.regularScoring.setTiebreakTo ?? null,
      regularMatchTiebreak: input.regularScoring.matchTiebreak ?? null,
      pairingMode,
      publicToken,
      organizerId,
      version: 0,
      createdAt: now,
      updatedAt: now,
      kohCourts: {
        create: Array.from({ length: input.courts }, (_, index) => ({
          id: createId("kohcourt"),
          courtNumber: index + 1
        }))
      },
      kohPromotionRules: {
        create: (input.promotionRules ?? []).map((rule) => ({
          id: createId("kohpromo"),
          courtNumber: rule.courtNumber,
          winsRequired: rule.winsRequired,
          promoteToCourtNumber: rule.promoteToCourtNumber ?? null
        }))
      }
    }
  });

  logger.info("kohStore/createKohTournament", { id, courts: input.courts, organizerId });
  return getKohHub(id, organizerId);
}

function collectPlayerNames(courts: AssignKohCourtsInput["courts"]): string[] {
  const names: string[] = [];
  for (const court of courts) {
    for (const unit of court.units) {
      names.push(unit.playerA.name.trim(), unit.playerB.name.trim());
    }
  }
  return names;
}

export async function assignKohCourts(
  tournamentId: string,
  organizerId: string,
  input: AssignKohCourtsInput
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);

  for (const court of input.courts) {
    if (court.courtNumber < 1 || court.courtNumber > row.courts) {
      throw new Error(`courtNumber ${court.courtNumber} is outside 1..${row.courts}.`);
    }
    if (court.units.length > KOH_MAX_UNITS_PER_COURT) {
      throw new Error(`Max ${KOH_MAX_UNITS_PER_COURT} units per court.`);
    }
  }

  const names = collectPlayerNames(input.courts);
  const uniqueLower = new Set(names.map((name) => name.toLowerCase()));
  if (uniqueLower.size !== names.length) {
    throw new Error("Player names must be unique across the KOH tournament.");
  }

  const courtByNumber = new Map(row.kohCourts.map((court) => [court.courtNumber, court]));

  await prisma.$transaction(async (tx) => {
    await tx.kohUnit.deleteMany({
      where: { court: { tournamentId } }
    });
    await tx.player.deleteMany({ where: { tournamentId } });

    const playerIdByName = new Map<string, string>();
    for (const name of names) {
      const id = createId("player");
      playerIdByName.set(name.toLowerCase(), id);
      const organizerPlayerId = await ensureOrganizerPlayer(tx, organizerId, name);
      await tx.player.create({
        data: {
          id,
          tournamentId,
          name,
          gamesPlayed: 0,
          totalPoints: 0,
          organizerPlayerId
        }
      });
    }

    for (const assignment of input.courts) {
      const court = courtByNumber.get(assignment.courtNumber);
      if (!court) {
        throw new Error(`Court ${assignment.courtNumber} not found.`);
      }
      await tx.kohCourt.update({
        where: { id: court.id },
        data: {
          tempSwapSlot: null,
          tempSwapInUnitId: null,
          tempSwapOutUnitId: null,
          tempSwapReason: null
        }
      });
      let position = 0;
      for (const unit of assignment.units) {
        const playerAId = playerIdByName.get(unit.playerA.name.trim().toLowerCase());
        const playerBId = playerIdByName.get(unit.playerB.name.trim().toLowerCase());
        if (!playerAId || !playerBId) {
          throw new Error("Failed to resolve player ids for unit.");
        }
        await tx.kohUnit.create({
          data: {
            id: createId("kohunit"),
            courtId: court.id,
            playerAId,
            playerBId,
            queuePosition: position
          }
        });
        position += 1;
      }
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        version: { increment: 1 },
        updatedAt: new Date(),
        kohPendingPromote: Prisma.JsonNull
      }
    });
  });

  const hub = await getKohHub(tournamentId, organizerId);
  if (!hub.ready) {
    // Assignment may be partial while building the event; callers that need live play must check ready.
    logger.info("kohStore/assignKohCourts not ready", { tournamentId, ready: hub.ready });
  }
  return hub;
}

export async function randomizeKohCourtQueue(
  tournamentId: string,
  organizerId: string,
  courtNumber: number
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  const court = row.kohCourts.find((entry) => entry.courtNumber === courtNumber);
  if (!court) {
    throw new Error(`Court ${courtNumber} not found.`);
  }
  if (court.units.length < 2) {
    throw new Error("Need at least 2 units on a court to randomize.");
  }

  const engineUnits: KohEngineUnit[] = court.units.map((unit) => ({
    id: unit.id,
    playerAId: unit.playerAId,
    playerBId: unit.playerBId,
    matchesWon: unit.matchesWon,
    matchesLost: unit.matchesLost,
    kingWinStreak: unit.kingWinStreak
  }));
  const shuffled = shuffleQueueOnce({
    id: court.id,
    courtNumber: court.courtNumber,
    queue: engineUnits
  });

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < shuffled.queue.length; index += 1) {
      await tx.kohUnit.update({
        where: { id: shuffled.queue[index].id },
        data: { queuePosition: index, kingWinStreak: 0 }
      });
    }
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
  });

  return getKohHub(tournamentId, organizerId);
}

export async function reorderKohCourtQueue(
  tournamentId: string,
  organizerId: string,
  courtNumber: number,
  unitIds: string[]
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  const court = row.kohCourts.find((entry) => entry.courtNumber === courtNumber);
  if (!court) {
    throw new Error(`Court ${courtNumber} not found.`);
  }
  if (unitIds.length < 2) {
    throw new Error("Queue reorder requires at least 2 units.");
  }
  const existingIds = new Set(court.units.map((unit) => unit.id));
  if (unitIds.length !== existingIds.size || unitIds.some((id) => !existingIds.has(id))) {
    throw new Error("unitIds must list each unit on the court exactly once.");
  }

  await prisma.$transaction(async (tx) => {
    // Two-phase update avoids unique (courtId, queuePosition) collisions.
    for (let index = 0; index < unitIds.length; index += 1) {
      await tx.kohUnit.update({
        where: { id: unitIds[index] },
        data: { queuePosition: 1000 + index }
      });
    }
    for (let index = 0; index < unitIds.length; index += 1) {
      await tx.kohUnit.update({
        where: { id: unitIds[index] },
        data: { queuePosition: index }
      });
    }
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
  });

  return getKohHub(tournamentId, organizerId);
}

function regularConfigFromRow(row: NonNullable<KohDbTournament>) {
  return {
    setFormat: row.regularSetFormat ?? ("FULL_SET" as const),
    gameWinBy: (row.regularGameWinBy === 1 ? 1 : 2) as 1 | 2,
    setsToWin: row.regularSetsToWin ?? 1,
    setTiebreakTo:
      row.regularSetTiebreakTo === 7 || row.regularSetTiebreakTo === 10
        ? (row.regularSetTiebreakTo as 7 | 10)
        : undefined,
    matchTiebreak: row.regularMatchTiebreak ?? undefined
  };
}

function toEngineCourt(court: {
  id: string;
  courtNumber: number;
  units: Array<{
    id: string;
    queuePosition: number;
    playerAId: string;
    playerBId: string;
    matchesWon: number;
    matchesLost: number;
    kingWinStreak: number;
    specialLosses?: number;
  }>;
}): KohEngineCourt {
  const ordered = [...court.units].sort((a, b) => a.queuePosition - b.queuePosition);
  return {
    id: court.id,
    courtNumber: court.courtNumber,
    queue: ordered.map(
      (unit): KohEngineUnit => ({
        id: unit.id,
        playerAId: unit.playerAId,
        playerBId: unit.playerBId,
        matchesWon: unit.matchesWon,
        matchesLost: unit.matchesLost,
        kingWinStreak: unit.kingWinStreak,
        specialLosses: unit.specialLosses ?? 0
      })
    )
  };
}

function restoreTempSwapQueue(
  queue: KohEngineUnit[],
  temp: KohTempSwap
): KohEngineUnit[] {
  const next = queue.map((unit) => ({ ...unit }));
  const slotIndex = temp.slot === "KING" ? 0 : 1;
  if (next[slotIndex]?.id !== temp.inUnitId) {
    return next;
  }
  const outIndex = next.findIndex((unit) => unit.id === temp.outUnitId);
  if (outIndex < 0) {
    return next;
  }
  const swappedIn = next[slotIndex];
  next[slotIndex] = next[outIndex];
  next[outIndex] = swappedIn;
  return next;
}

async function persistEngineCourts(
  tx: Prisma.TransactionClient,
  courts: KohEngineCourt[]
): Promise<void> {
  for (const court of courts) {
    for (let index = 0; index < court.queue.length; index += 1) {
      await tx.kohUnit.update({
        where: { id: court.queue[index].id },
        data: {
          courtId: court.id,
          queuePosition: 10_000 + court.courtNumber * 100 + index
        }
      });
    }
  }
  for (const court of courts) {
    for (let index = 0; index < court.queue.length; index += 1) {
      const unit = court.queue[index];
      await tx.kohUnit.update({
        where: { id: unit.id },
        data: {
          courtId: court.id,
          queuePosition: index,
          matchesWon: unit.matchesWon,
          matchesLost: unit.matchesLost,
          kingWinStreak: unit.kingWinStreak
        }
      });
    }
  }
}

function notifyToCourtChange(notify: KohPromotionNotify): KohCourtChange {
  if (notify.type === "PROMOTED") {
    return {
      type: "PROMOTED",
      fromCourtNumber: notify.fromCourtNumber,
      toCourtNumber: notify.toCourtNumber,
      promotedUnitId: notify.promotedUnitId,
      demotedUnitId: notify.demotedUnitId
    };
  }
  return {
    type: "NEEDS_ORGANIZER_PICK",
    fromCourtNumber: notify.fromCourtNumber,
    toCourtNumber: notify.toCourtNumber,
    promotedUnitId: notify.promotedUnitId,
    candidateUnitIds: notify.candidateUnitIds
  };
}

async function replaceMatchSets(matchId: string, sets: SubmitKohScoreInput["sets"]): Promise<void> {
  await prisma.kohMatchSet.deleteMany({ where: { matchId } });
  await prisma.kohMatchSet.createMany({
    data: sets.map((set) => ({
      id: createId("kohset"),
      matchId,
      setNumber: set.setNumber,
      gamesA: set.gamesA,
      gamesB: set.gamesB,
      tbA: set.tbA ?? null,
      tbB: set.tbB ?? null,
      winMethodsA: set.winMethodsA ?? [],
      winMethodsB: set.winMethodsB ?? []
    }))
  });
}

function isSpecialMethod(method: "REGULAR" | "GOLDEN" | "STAR"): boolean {
  return method === "GOLDEN" || method === "STAR";
}

/** Games + golden/star losses for side A / B from submitted sets. */
function tallyKohSetStats(sets: SubmitKohScoreInput["sets"]): {
  gamesA: number;
  gamesB: number;
  specialLossA: number;
  specialLossB: number;
} {
  let gamesA = 0;
  let gamesB = 0;
  let specialLossA = 0;
  let specialLossB = 0;
  for (const set of sets) {
    gamesA += set.gamesA;
    gamesB += set.gamesB;
    specialLossA += (set.winMethodsB ?? []).filter(isSpecialMethod).length;
    specialLossB += (set.winMethodsA ?? []).filter(isSpecialMethod).length;
  }
  return { gamesA, gamesB, specialLossA, specialLossB };
}

/**
 * Submit DRAFT or COMPLETE Regular score for the on-court king vs challenger.
 * Side A = king, side B = challenger at the time of submit (or of existing draft).
 */
export async function submitKohCourtScore(
  tournamentId: string,
  organizerId: string,
  courtId: string,
  input: SubmitKohScoreInput
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  if (row.version !== input.expectedVersion) {
    throw new KohVersionConflictError(input.expectedVersion, row.version);
  }

  const court = row.kohCourts.find((entry) => entry.id === courtId);
  if (!court) {
    throw new Error("Court not found.");
  }
  if (court.units.length < 2) {
    throw new Error("Court needs at least king and challenger to score.");
  }

  const ordered = [...court.units].sort((a, b) => a.queuePosition - b.queuePosition);
  const king = ordered[0];
  const challenger = ordered[1];
  const regular = regularConfigFromRow(row);
  const setsForEval: MatchSet[] = input.sets.map((set) => ({
    setNumber: set.setNumber,
    gamesA: set.gamesA,
    gamesB: set.gamesB,
    tbA: set.tbA,
    tbB: set.tbB
  }));

  if (input.status === "DRAFT") {
    let matchId = input.matchId;
    if (matchId) {
      const existing = await prisma.kohMatch.findFirst({
        where: { id: matchId, courtId, completed: false }
      });
      if (!existing) {
        throw new Error("Draft match not found.");
      }
      await replaceMatchSets(matchId, input.sets);
      await prisma.kohMatch.update({
        where: { id: matchId },
        data: { updatedAt: new Date() }
      });
    } else {
      const open = await prisma.kohMatch.findFirst({
        where: { courtId, completed: false },
        orderBy: { updatedAt: "desc" }
      });
      if (open) {
        matchId = open.id;
        await replaceMatchSets(matchId, input.sets);
        await prisma.kohMatch.update({
          where: { id: matchId },
          data: { updatedAt: new Date() }
        });
      } else {
        matchId = createId("kohmatch");
        await prisma.kohMatch.create({
          data: {
            id: matchId,
            courtId,
            unitAId: king.id,
            unitBId: challenger.id,
            completed: false
          }
        });
        await replaceMatchSets(matchId, input.sets);
      }
    }

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
    logger.info("kohStore/submitKohCourtScore draft", { tournamentId, courtId, matchId });
    return getKohHub(tournamentId, organizerId);
  }

  const evaluation = evaluateMatch(setsForEval, regular, {
    a: input.matchTbA,
    b: input.matchTbB
  });
  if (!evaluation.complete || !evaluation.winner) {
    throw new Error(evaluation.error ?? "Regular match is not complete.");
  }

  let matchId = input.matchId;
  let unitAId = king.id;
  let unitBId = challenger.id;
  if (matchId) {
    const existing = await prisma.kohMatch.findFirst({
      where: { id: matchId, courtId, completed: false }
    });
    if (!existing) {
      throw new Error("Draft match not found.");
    }
    unitAId = existing.unitAId;
    unitBId = existing.unitBId;
  } else {
    const open = await prisma.kohMatch.findFirst({
      where: { courtId, completed: false },
      orderBy: { updatedAt: "desc" }
    });
    if (open) {
      matchId = open.id;
      unitAId = open.unitAId;
      unitBId = open.unitBId;
    }
  }

  const winnerUnitId = evaluation.winner === "A" ? unitAId : unitBId;
  const engineBefore = toEngineCourt(court);
  let engineCourt = engineBefore;
  if (engineBefore.queue[0]?.id !== unitAId || engineBefore.queue[1]?.id !== unitBId) {
    const byId = new Map(engineBefore.queue.map((unit) => [unit.id, unit]));
    const a = byId.get(unitAId);
    const b = byId.get(unitBId);
    if (!a || !b) {
      throw new Error("Match units are no longer on this court.");
    }
    const rest = engineBefore.queue.filter((unit) => unit.id !== unitAId && unit.id !== unitBId);
    engineCourt = { ...engineBefore, queue: [a, b, ...rest] };
  }

  const { court: engineAfterMatch, event } = applyKohMatchResult(engineCourt, winnerUnitId);

  const tempSwap = mapTempSwap(court);
  let engineAfter: KohEngineCourt = {
    ...engineAfterMatch,
    queue: tempSwap
      ? restoreTempSwapQueue(engineAfterMatch.queue, tempSwap)
      : engineAfterMatch.queue
  };

  if (!matchId) {
    matchId = createId("kohmatch");
    await prisma.kohMatch.create({
      data: {
        id: matchId,
        courtId,
        unitAId,
        unitBId,
        completed: false
      }
    });
  }

  let courtChange: KohCourtChange | null = null;
  let engineCourtsForPersist: KohEngineCourt[] | null = null;
  let pendingPromote: Prisma.InputJsonValue | typeof Prisma.JsonNull | null = null;

  const allEngineCourts = row.kohCourts.map((entry) => {
    if (entry.id === courtId) {
      return engineAfter;
    }
    return toEngineCourt(entry);
  });
  const promo = maybePromote({
    courts: allEngineCourts,
    rules: row.kohPromotionRules.map((rule) => ({
      courtNumber: rule.courtNumber,
      winsRequired: rule.winsRequired,
      promoteToCourtNumber: rule.promoteToCourtNumber ?? undefined
    })),
    fromCourtNumber: court.courtNumber
  });

  if (promo.notify?.type === "PROMOTED") {
    engineCourtsForPersist = promo.courts;
    courtChange = notifyToCourtChange(promo.notify);
    pendingPromote = Prisma.JsonNull;
  } else if (promo.notify?.type === "NEEDS_ORGANIZER_PICK") {
    courtChange = notifyToCourtChange(promo.notify);
    pendingPromote = {
      fromCourtNumber: promo.notify.fromCourtNumber,
      toCourtNumber: promo.notify.toCourtNumber,
      promotedUnitId: promo.notify.promotedUnitId,
      candidateUnitIds: promo.notify.candidateUnitIds
    };
  }

  const setStats = tallyKohSetStats(input.sets);

  await prisma.$transaction(async (tx) => {
    await tx.kohMatchSet.deleteMany({ where: { matchId } });
    await tx.kohMatchSet.createMany({
      data: input.sets.map((set) => ({
        id: createId("kohset"),
        matchId: matchId!,
        setNumber: set.setNumber,
        gamesA: set.gamesA,
        gamesB: set.gamesB,
        tbA: set.tbA ?? null,
        tbB: set.tbB ?? null,
        winMethodsA: set.winMethodsA ?? [],
        winMethodsB: set.winMethodsB ?? []
      }))
    });
    await tx.kohMatch.update({
      where: { id: matchId! },
      data: {
        completed: true,
        winnerUnitId,
        updatedAt: new Date()
      }
    });

    if (engineCourtsForPersist) {
      await persistEngineCourts(tx, engineCourtsForPersist);
    } else {
      for (let index = 0; index < engineAfter.queue.length; index += 1) {
        await tx.kohUnit.update({
          where: { id: engineAfter.queue[index].id },
          data: { queuePosition: 1000 + index }
        });
      }
      for (let index = 0; index < engineAfter.queue.length; index += 1) {
        const unit = engineAfter.queue[index];
        await tx.kohUnit.update({
          where: { id: unit.id },
          data: {
            queuePosition: index,
            matchesWon: unit.matchesWon,
            matchesLost: unit.matchesLost,
            kingWinStreak: unit.kingWinStreak
          }
        });
      }
    }

    await tx.kohUnit.update({
      where: { id: unitAId },
      data: {
        gamesWon: { increment: setStats.gamesA },
        gamesLost: { increment: setStats.gamesB },
        specialLosses: { increment: setStats.specialLossA }
      }
    });
    await tx.kohUnit.update({
      where: { id: unitBId },
      data: {
        gamesWon: { increment: setStats.gamesB },
        gamesLost: { increment: setStats.gamesA },
        specialLosses: { increment: setStats.specialLossB }
      }
    });

    if (row.organizerId) {
      const unitA = await tx.kohUnit.findUnique({
        where: { id: unitAId },
        select: { playerAId: true, playerBId: true }
      });
      const unitB = await tx.kohUnit.findUnique({
        where: { id: unitBId },
        select: { playerAId: true, playerBId: true }
      });
      if (unitA && unitB) {
        await creditKohMatchToOrganizerPlayers({
          tx,
          organizerId: row.organizerId,
          tournamentId,
          tournamentName: row.name,
          matchId: matchId!,
          unitAPlayerIds: [unitA.playerAId, unitA.playerBId],
          unitBPlayerIds: [unitB.playerAId, unitB.playerBId],
          winnerSide: evaluation.winner!,
          gamesA: setStats.gamesA,
          gamesB: setStats.gamesB
        });
      }
    }

    await tx.kohCourt.update({
      where: { id: courtId },
      data: {
        tempSwapSlot: null,
        tempSwapInUnitId: null,
        tempSwapOutUnitId: null,
        tempSwapReason: null
      }
    });

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        version: { increment: 1 },
        updatedAt: new Date(),
        ...(pendingPromote !== null ? { kohPendingPromote: pendingPromote } : {})
      }
    });
  });

  logger.info("kohStore/submitKohCourtScore complete", {
    tournamentId,
    courtId,
    matchId,
    winnerUnitId,
    event: event.type,
    courtChange: courtChange?.type ?? null
  });

  const hub = await getKohHub(tournamentId, organizerId);
  return {
    ...hub,
    lastMatchEvent: event,
    lastCourtChange: courtChange
  };
}

/**
 * Swap king or challenger with another unit on the same court.
 * Blocks while a draft match is in progress.
 */
export async function swapKohCourtSlot(
  tournamentId: string,
  organizerId: string,
  courtId: string,
  input: SwapKohUnitInput
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  if (row.version !== input.expectedVersion) {
    throw new KohVersionConflictError(input.expectedVersion, row.version);
  }

  const court = row.kohCourts.find((entry) => entry.id === courtId);
  if (!court) {
    throw new Error("Court not found.");
  }
  if (court.matches.some((match) => !match.completed)) {
    throw new Error("Cannot swap while a match is in progress.");
  }
  if (court.units.length < 2) {
    throw new Error("Court needs king and challenger before swapping.");
  }

  const ordered = [...court.units].sort((a, b) => a.queuePosition - b.queuePosition);
  const slotIndex = input.slot === "KING" ? 0 : 1;
  const slotUnit = ordered[slotIndex];
  if (!slotUnit) {
    throw new Error(`Court has no ${input.slot.toLowerCase()} to swap.`);
  }
  if (slotUnit.id === input.withUnitId) {
    throw new Error("Cannot swap a unit with itself.");
  }
  const withIndex = ordered.findIndex((unit) => unit.id === input.withUnitId);
  if (withIndex < 0) {
    throw new Error("Swap target unit is not on this court.");
  }

  const permanent = input.permanent ?? input.slot === "CHALLENGER";
  const next = ordered.map((unit) => unit.id);
  next[slotIndex] = input.withUnitId;
  next[withIndex] = slotUnit.id;

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < next.length; index += 1) {
      await tx.kohUnit.update({
        where: { id: next[index] },
        data: { queuePosition: 1000 + index }
      });
    }
    for (let index = 0; index < next.length; index += 1) {
      await tx.kohUnit.update({
        where: { id: next[index] },
        data: { queuePosition: index }
      });
    }
    await tx.kohCourt.update({
      where: { id: courtId },
      data: permanent
        ? {
            tempSwapSlot: null,
            tempSwapInUnitId: null,
            tempSwapOutUnitId: null,
            tempSwapReason: null
          }
        : {
            tempSwapSlot: input.slot,
            tempSwapInUnitId: input.withUnitId,
            tempSwapOutUnitId: slotUnit.id,
            tempSwapReason: input.reason
          }
    });
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
  });

  logger.info("kohStore/swapKohCourtSlot", {
    tournamentId,
    courtId,
    slot: input.slot,
    permanent,
    withUnitId: input.withUnitId
  });

  return getKohHub(tournamentId, organizerId);
}

/**
 * Resolve a pending promotion when multiple weakest candidates tied.
 */
export async function pickKohPromotion(
  tournamentId: string,
  organizerId: string,
  input: PromoteKohPickInput
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  if (row.version !== input.expectedVersion) {
    throw new KohVersionConflictError(input.expectedVersion, row.version);
  }

  const pending = parsePendingPromote(row.kohPendingPromote);
  if (!pending) {
    throw new Error("No pending promotion pick.");
  }
  if (!pending.candidateUnitIds.includes(input.demotedUnitId)) {
    throw new Error("demotedUnitId is not a candidate for this promotion.");
  }
  if (row.kohCourts.length <= 1) {
    throw new Error("Promotion requires multiple courts.");
  }

  const engineCourts = row.kohCourts.map(toEngineCourt);
  const { courts: nextCourts, notify } = applyOrganizerPromotionPick({
    courts: engineCourts,
    fromCourtNumber: pending.fromCourtNumber,
    toCourtNumber: pending.toCourtNumber,
    promotedUnitId: pending.promotedUnitId,
    demotedUnitId: input.demotedUnitId
  });

  await prisma.$transaction(async (tx) => {
    await persistEngineCourts(tx, nextCourts);
    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        version: { increment: 1 },
        updatedAt: new Date(),
        kohPendingPromote: Prisma.JsonNull
      }
    });
  });

  logger.info("kohStore/pickKohPromotion", {
    tournamentId,
    promotedUnitId: notify.promotedUnitId,
    demotedUnitId: notify.demotedUnitId
  });

  const hub = await getKohHub(tournamentId, organizerId);
  return {
    ...hub,
    lastCourtChange: notifyToCourtChange(notify)
  };
}

export async function getKohRankings(
  tournamentId: string,
  organizerId: string,
  courtNumber?: number
): Promise<KohRankingsBoard> {
  const row = await requireKohTournament(tournamentId, organizerId);
  return buildKohRankingsBoard(row, courtNumber);
}

export async function getKohHubByPublicToken(publicToken: string): Promise<KohTournamentHub | null> {
  const meta = await prisma.tournament.findUnique({
    where: { publicToken },
    select: { id: true, mode: true }
  });
  if (!meta || meta.mode !== "KING_OF_THE_HILL") {
    return null;
  }
  return getKohHub(meta.id);
}

export async function getKohRankingsByPublicToken(
  publicToken: string,
  courtNumber?: number
): Promise<KohRankingsBoard | null> {
  const meta = await prisma.tournament.findUnique({
    where: { publicToken },
    select: { id: true, mode: true }
  });
  if (!meta || meta.mode !== "KING_OF_THE_HILL") {
    return null;
  }
  const row = await loadKohRow(meta.id);
  if (!row) {
    return null;
  }
  return buildKohRankingsBoard(row, courtNumber);
}

function buildKohRankingsBoard(
  row: NonNullable<KohDbTournament>,
  courtNumber?: number
): KohRankingsBoard {
  const promotionEnabled = row.kohPromotionRules.length > 0;

  if (courtNumber !== undefined) {
    if (!Number.isInteger(courtNumber) || courtNumber < 1 || courtNumber > row.courts) {
      throw new Error(`courtNumber must be between 1 and ${row.courts}.`);
    }
  }

  const courts =
    courtNumber === undefined
      ? row.kohCourts
      : row.kohCourts.filter((court) => court.courtNumber === courtNumber);

  const nameByUnitId = new Map<string, { playerAName: string; playerBName: string }>();
  const candidates = courts.flatMap((court) =>
    court.units.map((unit) => {
      nameByUnitId.set(unit.id, {
        playerAName: unit.playerA.name,
        playerBName: unit.playerB.name
      });
      return {
        id: unit.id,
        playerAId: unit.playerAId,
        playerBId: unit.playerBId,
        matchesWon: unit.matchesWon,
        matchesLost: unit.matchesLost,
        kingWinStreak: unit.kingWinStreak,
        specialLosses: unit.specialLosses,
        courtNumber: court.courtNumber,
        gamesWon: unit.gamesWon,
        gamesLost: unit.gamesLost
      };
    })
  );

  const sorted = sortKohRankings(candidates);
  const weakestId =
    promotionEnabled && courtNumber !== undefined && sorted.length > 0
      ? sorted[sorted.length - 1].id
      : null;

  return {
    tournamentId: row.id,
    version: row.version,
    promotionEnabled,
    courtNumber: courtNumber ?? null,
    rows: sorted.map((unit, index) => {
      const names = nameByUnitId.get(unit.id)!;
      return {
        rank: index + 1,
        unitId: unit.id,
        courtNumber: unit.courtNumber,
        playerAName: names.playerAName,
        playerBName: names.playerBName,
        matchesWon: unit.matchesWon,
        matchesLost: unit.matchesLost,
        gameDiff: unit.gameDiff,
        specialLosses: unit.specialLosses ?? 0,
        weakest: weakestId !== null && unit.id === weakestId ? true : undefined
      };
    })
  };
}

export async function renameKohPlayer(
  tournamentId: string,
  organizerId: string,
  playerId: string,
  input: RenameKohPlayerInput
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  if (row.version !== input.expectedVersion) {
    throw new KohVersionConflictError(input.expectedVersion, row.version);
  }

  const player = row.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new Error("Player not found.");
  }

  const newName = input.newName.trim();
  if (!newName) {
    throw new Error("Name is required.");
  }

  const taken = row.players.some(
    (entry) => entry.id !== playerId && entry.name.trim().toLowerCase() === newName.toLowerCase()
  );
  if (taken) {
    throw new Error("Player names must be unique across the KOH tournament.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.player.update({
      where: { id: playerId },
      data: { name: newName }
    });
    if (player.organizerPlayerId) {
      const normalized = newName.trim().toLowerCase().replace(/\s+/g, " ");
      const conflict = await tx.organizerPlayer.findFirst({
        where: {
          organizerId,
          nameNormalized: normalized,
          NOT: { id: player.organizerPlayerId }
        }
      });
      if (!conflict) {
        await tx.organizerPlayer.update({
          where: { id: player.organizerPlayerId },
          data: { name: newName, nameNormalized: normalized, updatedAt: new Date() }
        });
      }
    }
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
  });

  logger.info("kohStore/renameKohPlayer", { tournamentId, playerId });
  return getKohHub(tournamentId, organizerId);
}

export async function replaceKohPartner(
  tournamentId: string,
  organizerId: string,
  unitId: string,
  input: ReplaceKohPartnerInput
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  if (row.version !== input.expectedVersion) {
    throw new KohVersionConflictError(input.expectedVersion, row.version);
  }

  let unitCourt: (typeof row.kohCourts)[number] | undefined;
  let unit: (typeof row.kohCourts)[number]["units"][number] | undefined;
  for (const court of row.kohCourts) {
    const found = court.units.find((entry) => entry.id === unitId);
    if (found) {
      unitCourt = court;
      unit = found;
      break;
    }
  }
  if (!unit || !unitCourt) {
    throw new Error("Unit not found.");
  }

  if (unitCourt.matches.some((match) => !match.completed)) {
    const open = unitCourt.matches.find((match) => !match.completed);
    if (open && (open.unitAId === unitId || open.unitBId === unitId)) {
      throw new Error("Cannot replace a partner while a match is in progress.");
    }
  }

  const leaveIsA = unit.playerAId === input.leavePlayerId;
  const leaveIsB = unit.playerBId === input.leavePlayerId;
  if (!leaveIsA && !leaveIsB) {
    throw new Error("leavePlayerId is not on this unit.");
  }

  const replacementName = input.replacement.name.trim();
  if (!replacementName) {
    throw new Error("Replacement name is required.");
  }

  const stayName = leaveIsA ? unit.playerB.name : unit.playerA.name;
  if (replacementName.toLowerCase() === stayName.trim().toLowerCase()) {
    throw new Error("A KOH unit needs two different players.");
  }

  const duplicate = row.players.some(
    (player) => player.name.trim().toLowerCase() === replacementName.toLowerCase()
  );
  if (duplicate) {
    throw new Error("Player names must be unique across the KOH tournament.");
  }

  const newPlayerId = createId("player");
  await prisma.$transaction(async (tx) => {
    const organizerPlayerId = await ensureOrganizerPlayer(tx, organizerId, replacementName);
    await tx.player.create({
      data: {
        id: newPlayerId,
        tournamentId,
        name: replacementName,
        gender: input.replacement.gender ?? null,
        gamesPlayed: 0,
        totalPoints: 0,
        organizerPlayerId
      }
    });
    await tx.kohUnit.update({
      where: { id: unitId },
      data: leaveIsA ? { playerAId: newPlayerId } : { playerBId: newPlayerId }
    });
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
  });

  logger.info("kohStore/replaceKohPartner", {
    tournamentId,
    unitId,
    leavePlayerId: input.leavePlayerId,
    newPlayerId
  });
  return getKohHub(tournamentId, organizerId);
}

/** Mark the KOH night finished — blocks further live mutations. */
export async function endKohTournament(
  tournamentId: string,
  organizerId: string,
  expectedVersion: number
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  if (row.version !== expectedVersion) {
    throw new KohVersionConflictError(expectedVersion, row.version);
  }
  if (row.endedAt) {
    return getKohHub(tournamentId, organizerId);
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      endedAt: new Date(),
      version: { increment: 1 },
      updatedAt: new Date(),
      kohPendingPromote: Prisma.JsonNull
    }
  });

  logger.info("kohStore/endKohTournament", { tournamentId });
  return getKohHub(tournamentId, organizerId);
}
