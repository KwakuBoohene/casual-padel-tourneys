import type { Prisma } from "@prisma/client";
import type { AdminTournamentSummary, AdminUserSummary } from "@padel/shared";

const playedMatch = {
  voidedAt: null,
  OR: [{ completed: true }, { scoreA: { not: null } }, { scoreB: { not: null } }, { sets: { some: {} } }]
} satisfies Prisma.MatchWhereInput;
const playedKoh = {
  voidedAt: null,
  OR: [{ completed: true }, { sets: { some: {} } }]
} satisfies Prisma.KohMatchWhereInput;
const roundProgress = { matches: { some: playedMatch } };
const courtProgress = { matches: { some: playedKoh } };
export const startedTournament: Prisma.TournamentWhereInput = {
  OR: [{ rounds: { some: roundProgress } }, { kohCourts: { some: courtProgress } }]
};
export const userSelect = {
  id: true,
  name: true,
  email: true,
  isGuest: true,
  emailVerifiedAt: true,
  createdAt: true,
  _count: { select: { tournaments: true } }
} satisfies Prisma.UserSelect;
export const tournamentSelect = {
  id: true,
  name: true,
  mode: true,
  variant: true,
  scoringMode: true,
  createdAt: true,
  endedAt: true,
  courts: true,
  organizer: { select: { id: true, name: true } },
  _count: { select: { players: true, rounds: true } }
} satisfies Prisma.TournamentSelect;
export function userSummary(row: Prisma.UserGetPayload<{ select: typeof userSelect }>): AdminUserSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.isGuest ? null : row.email,
    accountType: row.isGuest ? "guest" : "registered",
    verified: !row.isGuest && Boolean(row.emailVerifiedAt),
    createdAt: row.createdAt.toISOString(),
    ownedTournamentCount: row._count.tournaments,
    lastActivityAt: null
  };
}
export function tournamentSummary(
  row: Prisma.TournamentGetPayload<{ select: typeof tournamentSelect }>,
  started: boolean
): AdminTournamentSummary {
  return {
    id: row.id,
    name: row.name,
    mode: row.mode,
    variant: row.variant,
    scoringMode: row.scoringMode,
    createdAt: row.createdAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    owner: row.organizer,
    status: row.endedAt ? "completed" : started ? "in-progress" : "not-started",
    playerCount: row._count.players,
    courtCount: row.courts,
    roundCount: row._count.rounds
  };
}
