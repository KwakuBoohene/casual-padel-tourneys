import type {
  Match as DbMatch,
  MatchSet as DbMatchSet,
  PendingPlayer as DbPendingPlayer,
  Player as DbPlayer,
  Round as DbRound,
  Tournament as DbTournament
} from "@prisma/client";

export type DbMatchWithSets = DbMatch & { sets: DbMatchSet[] };

export type DbTournamentGraph = DbTournament & {
  players: DbPlayer[];
  rounds: Array<DbRound & { matches: DbMatchWithSets[] }>;
  pendingPlayers: DbPendingPlayer[];
};

export const tournamentInclude = {
  players: true,
  rounds: {
    include: {
      matches: {
        include: {
          sets: true
        }
      }
    }
  },
  pendingPlayers: true
} as const;
