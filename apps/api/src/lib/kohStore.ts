import type {
  AssignKohCourtsInput,
  CreateKohTournamentInput,
  KohCourt,
  KohPromotionRule,
  KohUnit,
  MatchSet,
  SubmitKohScoreInput
} from "@padel/shared";
import { createId, evaluateMatch, KOH_MAX_UNITS_PER_COURT } from "@padel/shared";

import {
  applyKohMatchResult,
  shuffleQueueOnce,
  type KohEngineUnit
} from "../engine/koh/index.js";
import { logger } from "./logger.js";
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
        where: { completed: false },
        include: {
          sets: { orderBy: { setNumber: "asc" as const } }
        },
        orderBy: { updatedAt: "desc" as const },
        take: 1
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
  /** Last match result event after a COMPLETE score (optional). */
  lastMatchEvent?: {
    type: "KING_WIN" | "KING_LOSS";
    courtId: string;
    winnerUnitId: string;
    loserUnitId: string;
  };
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
}): KohUnit {
  return {
    id: row.id,
    playerAId: row.playerAId,
    playerBId: row.playerBId,
    playerAName: row.playerA.name,
    playerBName: row.playerB.name
  };
}

function mapCourt(row: {
  id: string;
  courtNumber: number;
  units: Array<{
    id: string;
    queuePosition: number;
    playerAId: string;
    playerBId: string;
    playerA: { name: string };
    playerB: { name: string };
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
  const draft = row.matches?.[0];
  return {
    id: row.id,
    courtNumber: row.courtNumber,
    king: mapped[0] ?? null,
    challenger: mapped[1] ?? null,
    waiting: mapped.slice(2),
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
    balanceHint: computeBalanceHint(unitCounts)
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
      await tx.player.create({
        data: {
          id,
          tournamentId,
          name,
          gamesPlayed: 0,
          totalPoints: 0
        }
      });
    }

    for (const assignment of input.courts) {
      const court = courtByNumber.get(assignment.courtNumber);
      if (!court) {
        throw new Error(`Court ${assignment.courtNumber} not found.`);
      }
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
      data: { version: { increment: 1 }, updatedAt: new Date() }
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
  }>;
}) {
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
        kingWinStreak: unit.kingWinStreak
      })
    )
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

  const { court: engineAfter, event } = applyKohMatchResult(engineCourt, winnerUnitId);

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

    await tx.tournament.update({
      where: { id: tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
  });

  logger.info("kohStore/submitKohCourtScore complete", {
    tournamentId,
    courtId,
    matchId,
    winnerUnitId,
    event: event.type
  });

  const hub = await getKohHub(tournamentId, organizerId);
  return {
    ...hub,
    lastMatchEvent: event
  };
}
