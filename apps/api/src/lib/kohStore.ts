import type {
  AssignKohCourtsInput,
  CreateKohTournamentInput,
  KohCourt,
  KohPromotionRule,
  KohUnit
} from "@padel/shared";
import { createId, KOH_MAX_UNITS_PER_COURT } from "@padel/shared";

import { shuffleQueueOnce, type KohEngineUnit } from "../engine/koh/index.js";
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
      }
    },
    orderBy: { courtNumber: "asc" as const }
  }
} as const;

type KohDbTournament = Awaited<ReturnType<typeof loadKohRow>>;

export type KohHubCourt = KohCourt & {
  unitCount: number;
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
};

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
}): KohHubCourt {
  const ordered = [...row.units].sort((a, b) => a.queuePosition - b.queuePosition);
  const mapped = ordered.map(mapUnit);
  return {
    id: row.id,
    courtNumber: row.courtNumber,
    king: mapped[0] ?? null,
    challenger: mapped[1] ?? null,
    waiting: mapped.slice(2),
    unitCount: mapped.length
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
