import type { Prisma } from "@prisma/client";

/** Full KOH aggregate graph: players, promotion rules, courts → units + recent matches. */
export const kohInclude = {
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

export type KohDbTournament = Prisma.TournamentGetPayload<{ include: typeof kohInclude }>;

export type KohDbCourt = KohDbTournament["kohCourts"][number];
