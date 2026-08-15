import type { FastifyInstance } from "fastify";
import type {
  Match as DbMatch,
  MatchSet as DbMatchSet,
  PendingPlayer as DbPendingPlayer,
  Player as DbPlayer,
  Round as DbRound,
  Tournament as DbTournament
} from "@prisma/client";
import type {
  LeaderboardEntry,
  PendingPlayer as DomainPendingPlayer,
  Player as DomainPlayer,
  RegularScoringConfig,
  Round as DomainRound,
  SchedulingMode,
  TournamentConfig
} from "@padel/shared";
import {
  addPendingPlayerSchema,
  adjustCourtsSchema,
  createTournamentSchema,
  integratePendingPlayersSchema,
  isRegularScoreBody,
  renamePlayerSchema,
  renameTournamentSchema,
  submitScoreSchema,
  substitutePlayerSchema
} from "@padel/shared";

import {
  addPendingPlayer,
  adjustCourts,
  assertVersion,
  createTournament,
  deleteTournament,
  getTournament,
  getTournamentByPublicToken,
  integratePendingPlayers,
  putTournament,
  renamePlayer,
  renameTournament,
  submitRegularScore,
  submitScore,
  substitutePlayer
} from "../lib/store.js";
import { prisma } from "../lib/prisma.js";
import { requireOrganizerAccess } from "../lib/auth.js";
import { assertOrganizer } from "../lib/organizerAccess.js";
import { publishEvent } from "../realtime/events.js";
import { broadcastToTournament } from "../realtime/socketHub.js";
import { logger } from "../lib/logger.js";

function buildLeaderboard(
  players: DomainPlayer[],
  scoringMode?: TournamentConfig["scoringMode"]
): LeaderboardEntry[] {
  const regular = scoringMode === "REGULAR";
  return [...players]
    .sort((a, b) => {
      if (!regular) {
        return b.totalPoints - a.totalPoints;
      }
      const byMatches = (b.matchesWon ?? 0) - (a.matchesWon ?? 0);
      if (byMatches !== 0) {
        return byMatches;
      }
      const bySets = (b.setsWon ?? 0) - (a.setsWon ?? 0);
      if (bySets !== 0) {
        return bySets;
      }
      return (b.gamesWon ?? 0) - (a.gamesWon ?? 0);
    })
    .map((player, index) => ({
      playerId: player.id,
      name: player.name,
      totalPoints: player.totalPoints,
      gamesPlayed: player.gamesPlayed,
      rank: index + 1,
      matchesWon: player.matchesWon,
      matchesLost: player.matchesLost,
      setsWon: player.setsWon,
      setsLost: player.setsLost,
      gamesWon: player.gamesWon,
      gamesLost: player.gamesLost
    }));
}

function regularConfigFromRow(tournament: DbTournament): RegularScoringConfig | undefined {
  if (tournament.scoringMode !== "REGULAR" || !tournament.regularSetFormat) {
    return undefined;
  }
  return {
    setFormat: tournament.regularSetFormat,
    gameWinBy: (tournament.regularGameWinBy === 2 ? 2 : 1) as 1 | 2,
    setsToWin: tournament.regularSetsToWin ?? 1,
    setTiebreakTo:
      tournament.regularSetTiebreakTo === 7 || tournament.regularSetTiebreakTo === 10
        ? tournament.regularSetTiebreakTo
        : undefined,
    matchTiebreak: tournament.regularMatchTiebreak ?? undefined
  };
}

type DbMatchWithSets = DbMatch & { sets: DbMatchSet[] };

function mapDbTournamentToState(
  tournament: DbTournament & {
    players: DbPlayer[];
    rounds: Array<DbRound & { matches: DbMatchWithSets[] }>;
    pendingPlayers: DbPendingPlayer[];
  }
) {
  const regularScoring = regularConfigFromRow(tournament);
  const config: TournamentConfig = {
    name: tournament.name,
    mode: tournament.mode,
    variant: tournament.variant,
    schedulingMode: tournament.schedulingMode as SchedulingMode,
    players: tournament.players.map((player) => ({ name: player.name })),
    courts: tournament.courts,
    pointsPerMatch: tournament.pointsPerMatch,
    scoringMode: tournament.scoringMode,
    regularScoring,
    targetGamesPerPlayer: tournament.targetGamesPerPlayer ?? undefined,
    tournamentTimeMinutes: tournament.tournamentTimeMinutes ?? undefined,
    enableAutoIntegration: tournament.enableAutoIntegration,
    integrationThreshold: tournament.integrationThreshold
  };

  const players: DomainPlayer[] = tournament.players.map((player) => ({
    id: player.id,
    name: player.name,
    gender: player.gender === "MALE" || player.gender === "FEMALE" ? player.gender : undefined,
    gamesPlayed: player.gamesPlayed,
    totalPoints: player.totalPoints,
    handicap: player.handicap ?? undefined,
    integrationWave: player.integrationWave ?? undefined,
    matchesWon: player.matchesWon,
    matchesLost: player.matchesLost,
    setsWon: player.setsWon,
    setsLost: player.setsLost,
    gamesWon: player.gamesWon,
    gamesLost: player.gamesLost
  }));

  const pendingPlayers: DomainPendingPlayer[] = tournament.pendingPlayers.map((pp) => ({
    id: pp.id,
    name: pp.name,
    gender: pp.gender === "MALE" || pp.gender === "FEMALE" ? pp.gender : undefined,
    createdAt: pp.createdAt.toISOString()
  }));

  const rounds: DomainRound[] = tournament.rounds
    .slice()
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map((round) => ({
      id: round.id,
      roundNumber: round.roundNumber,
      isLocked: round.isLocked,
      matches: round.matches.map((match) => ({
        id: match.id,
        round: round.roundNumber,
        court: match.court,
        teamA: match.teamA as [string, string],
        teamB: match.teamB as [string, string],
        scoreA: match.scoreA ?? undefined,
        scoreB: match.scoreB ?? undefined,
        completed: match.completed,
        matchTbA: match.matchTbA ?? undefined,
        matchTbB: match.matchTbB ?? undefined,
        sets: match.sets
          .slice()
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((set) => ({
            setNumber: set.setNumber,
            gamesA: set.gamesA,
            gamesB: set.gamesB,
            tbA: set.tbA ?? undefined,
            tbB: set.tbB ?? undefined
          }))
      }))
    }));

  return {
    id: tournament.id,
    config,
    players,
    rounds,
    version: tournament.version,
    leaderboard: buildLeaderboard(players, config.scoringMode),
    publicToken: tournament.publicToken,
    createdAt: tournament.createdAt.toISOString(),
    updatedAt: tournament.updatedAt.toISOString(),
    organizerId: tournament.organizerId ?? undefined,
    pendingPlayers,
    integrationWaveCount: tournament.integrationWaveCount
  };
}

function mapTournamentMutationErrorStatus(message: string): number {
  if (message.includes("not found")) {
    return 404;
  }
  if (message.includes("Version mismatch")) {
    return 409;
  }
  if (
    message.includes("Need at least 2 pending players") ||
    message.includes("Maximum integration waves") ||
    message.includes("Cannot integrate during incomplete round") ||
    message.includes("not complete") ||
    message.includes("tiebreak") ||
    message.includes("submitRegularScore") ||
    message.includes("Use submitRegularScore") ||
    message.includes("REGULAR scoring") ||
    message.includes("regularScoring") ||
    message.includes("Invalid full-set") ||
    message.includes("points body") ||
    message.includes("sets body")
  ) {
    return 400;
  }
  return 409;
}

const tournamentInclude = {
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

export async function registerTournamentRoutes(server: FastifyInstance): Promise<void> {
  server.get("/health", async () => ({ status: "ok" }));

  server.get("/tournaments", { preHandler: requireOrganizerAccess }, async (request) => {
    if (!request.user) {
      return { data: [] };
    }
    const rows = await prisma.tournament.findMany({
      where: { organizerId: request.user.id },
      include: tournamentInclude,
      orderBy: { createdAt: "desc" }
    });
    const data = rows.map(mapDbTournamentToState);
    request.log.info({ count: data.length }, "GET /tournaments");
    return { data };
  });

  server.get("/tournaments/:id", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const params = request.params as { id: string };
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }

    try {
      const row = await prisma.tournament.findUnique({
        where: { id: params.id },
        select: { mode: true }
      });
      if (row?.mode === "KING_OF_THE_HILL") {
        const { getKohHub } = await import("../lib/kohStore.js");
        const data = await getKohHub(params.id, request.user.id);
        request.log.info({ id: params.id }, "GET /tournaments/:id KOH hub");
        return { data };
      }
      const data = await loadTournamentState(params.id);
      assertOrganizer(request.user.id, data);
      request.log.info({ id: params.id }, "GET /tournaments/:id");
      return { data };
    } catch (error) {
      reply.status(404);
      request.log.warn({ id: params.id }, "GET /tournaments/:id not found");
      return { message: (error as Error).message || "Tournament not found." };
    }
  });

  server.get("/public/:token", async (request, reply) => {
    const params = request.params as { token: string };
    const inMemory = getTournamentByPublicToken(params.token);
    if (inMemory) {
      const { organizerId: _organizerId, ...publicData } = inMemory;
      request.log.info({ token: params.token }, "GET /public/:token");
      return { data: publicData };
    }

    const meta = await prisma.tournament.findUnique({
      where: { publicToken: params.token },
      select: { id: true, mode: true }
    });
    if (!meta) {
      reply.status(404);
      request.log.warn({ token: params.token }, "GET /public/:token not found");
      return { message: "Public tournament not found." };
    }

    if (meta.mode === "KING_OF_THE_HILL") {
      const { getKohHubByPublicToken } = await import("../lib/kohStore.js");
      const hub = await getKohHubByPublicToken(params.token);
      if (!hub) {
        reply.status(404);
        return { message: "Public tournament not found." };
      }
      const { organizerId: _organizerId, ...publicData } = hub;
      request.log.info({ token: params.token, mode: "KOH" }, "GET /public/:token");
      return { data: publicData };
    }

    const row = await prisma.tournament.findUnique({
      where: { publicToken: params.token },
      include: tournamentInclude
    });
    if (!row) {
      reply.status(404);
      request.log.warn({ token: params.token }, "GET /public/:token not found");
      return { message: "Public tournament not found." };
    }
    const { organizerId: _organizerId, ...publicData } = mapDbTournamentToState(row);
    request.log.info({ token: params.token }, "GET /public/:token");
    return { data: publicData };
  });

  server.get("/public/:token/rankings", async (request, reply) => {
    const params = request.params as { token: string };
    const query = request.query as { courtNumber?: string };
    let courtNumber: number | undefined;
    if (query.courtNumber !== undefined && query.courtNumber !== "") {
      courtNumber = Number(query.courtNumber);
      if (!Number.isInteger(courtNumber) || courtNumber < 1) {
        reply.status(400);
        return { message: "courtNumber must be a positive integer." };
      }
    }
    const { getKohRankingsByPublicToken } = await import("../lib/kohStore.js");
    try {
      const data = await getKohRankingsByPublicToken(params.token, courtNumber);
      if (!data) {
        reply.status(404);
        return { message: "Public tournament not found." };
      }
      request.log.info({ token: params.token, courtNumber: courtNumber ?? null }, "GET /public/:token/rankings");
      return { data };
    } catch (error) {
      reply.status(400);
      return { message: (error as Error).message || "Rankings failed." };
    }
  });

  server.post("/tournaments", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }

    const body = request.body as { mode?: string } | undefined;
    if (body?.mode === "KING_OF_THE_HILL") {
      const { handleCreateKohTournament } = await import("./koh.js");
      const result = await handleCreateKohTournament(server, request.body, request.user.id);
      reply.status(result.status);
      if (result.status === 200) {
        request.log.info({ id: (result.payload.data as { id?: string })?.id }, "POST /tournaments created KOH");
      }
      return result.payload;
    }

    const parsed = createTournamentSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    const data = parsed.data;
    const tournament = createTournament(
      {
        ...data,
        scoringMode: data.scoringMode,
        regularScoring: data.regularScoring,
        // Regular scoring ignores points-to-N; keep a stand-in for legacy time estimates until epic-03 ticket 06.
        pointsPerMatch: data.pointsPerMatch ?? 24
      },
      request.user.id
    );
    // Persist to database for history/suggestions
    try {
      await prisma.tournament.create({
        data: {
          id: tournament.id,
          name: tournament.config.name,
          mode: tournament.config.mode,
          variant: tournament.config.variant,
          schedulingMode: tournament.config.schedulingMode,
          courts: tournament.config.courts,
          pointsPerMatch: tournament.config.pointsPerMatch,
          scoringMode: tournament.config.scoringMode ?? "AMERICANO_POINTS",
          regularSetFormat: tournament.config.regularScoring?.setFormat ?? null,
          regularGameWinBy: tournament.config.regularScoring?.gameWinBy ?? null,
          regularSetsToWin: tournament.config.regularScoring?.setsToWin ?? null,
          regularSetTiebreakTo: tournament.config.regularScoring?.setTiebreakTo ?? null,
          regularMatchTiebreak: tournament.config.regularScoring?.matchTiebreak ?? null,
          targetGamesPerPlayer: tournament.config.targetGamesPerPlayer ?? null,
          tournamentTimeMinutes: tournament.config.tournamentTimeMinutes ?? null,
          publicToken: tournament.publicToken,
          organizerId: request.user.id,
          version: tournament.version,
          integrationWaveCount: tournament.integrationWaveCount,
          enableAutoIntegration: tournament.config.enableAutoIntegration ?? false,
          integrationThreshold: tournament.config.integrationThreshold ?? 2,
          createdAt: new Date(tournament.createdAt),
          updatedAt: new Date(tournament.updatedAt),
          players: {
            create: tournament.players.map((player) => ({
              id: player.id,
              name: player.name,
              gender: player.gender ?? null,
              gamesPlayed: player.gamesPlayed,
              totalPoints: player.totalPoints,
              matchesWon: player.matchesWon ?? 0,
              matchesLost: player.matchesLost ?? 0,
              setsWon: player.setsWon ?? 0,
              setsLost: player.setsLost ?? 0,
              gamesWon: player.gamesWon ?? 0,
              gamesLost: player.gamesLost ?? 0,
              handicap: player.handicap ?? null,
              integrationWave: player.integrationWave ?? null,
              integratedAt: null
            }))
          },
          rounds: {
            create: tournament.rounds.map((round) => ({
              id: round.id,
              roundNumber: round.roundNumber,
              isLocked: round.isLocked,
              matches: {
                create: round.matches.map((match) => ({
                  id: match.id,
                  court: match.court,
                  teamA: match.teamA,
                  teamB: match.teamB,
                  scoreA: match.scoreA ?? null,
                  scoreB: match.scoreB ?? null,
                  matchTbA: match.matchTbA ?? null,
                  matchTbB: match.matchTbB ?? null,
                  completed: match.completed,
                  sets: {
                    create: (match.sets ?? []).map((set) => ({
                      setNumber: set.setNumber,
                      gamesA: set.gamesA,
                      gamesB: set.gamesB,
                      tbA: set.tbA ?? null,
                      tbB: set.tbB ?? null
                    }))
                  }
                }))
              }
            }))
          }
        }
      });
    } catch (error) {
      request.log.error(error, "Failed to persist tournament to database");
    }
    const event = { type: "TOURNAMENT_CREATED" as const, tournamentId: tournament.id, payload: tournament };
    await publishEvent(server.redis, event);
    broadcastToTournament(server.subscriptions, tournament.id, event);
    request.log.info({ id: tournament.id }, "POST /tournaments created");
    return { data: tournament };
  });

  server.get("/players/suggestions", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    if (!request.user) {
      reply.status(401);
      return { names: [] };
    }
    const rows = await prisma.player.findMany({
      where: {
        tournament: {
          organizerId: request.user.id
        }
      },
      select: { name: true },
      distinct: ["name"],
      orderBy: { name: "asc" }
    });
    request.log.debug({ count: rows.length }, "GET /players/suggestions");
    return { names: rows.map((row: { name: string }) => row.name) };
  });

  server.post("/tournaments/score", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = submitScoreSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      const body = parsed.data;
      await ensureOrganizerTournament(body.tournamentId, request.user!.id);
      assertVersion(body.tournamentId, body.expectedVersion);
      const current = getTournament(body.tournamentId);
      const scoringMode = current?.config.scoringMode ?? "AMERICANO_POINTS";

      let tournament;
      if (isRegularScoreBody(body)) {
        if (scoringMode !== "REGULAR") {
          reply.status(400);
          return { message: "Sets body requires a Regular scoring tournament." };
        }
        tournament = submitRegularScore(body.tournamentId, body.matchId, body.sets, {
          complete: body.status === "COMPLETE",
          matchTbA: body.matchTbA,
          matchTbB: body.matchTbB
        });
      } else {
        if (scoringMode === "REGULAR") {
          reply.status(400);
          return { message: "Points body is not allowed on a Regular scoring tournament." };
        }
        tournament = submitScore(body.tournamentId, body.matchId, body.scoreA, body.scoreB);
      }

      await persistTournament(tournament);
      const event = { type: "SCORE_SUBMITTED" as const, tournamentId: tournament.id, payload: tournament };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, tournament.id, event);
      request.log.info(
        {
          tournamentId: tournament.id,
          matchId: body.matchId,
          scoringMode: tournament.config.scoringMode ?? "AMERICANO_POINTS",
          status: isRegularScoreBody(body) ? body.status : "COMPLETE"
        },
        "POST /tournaments/score"
      );
      return { data: tournament };
    } catch (error) {
      const message = (error as Error).message;
      reply.status(mapTournamentMutationErrorStatus(message));
      return { message };
    }
  });

  server.post("/tournaments/rename-player", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = renamePlayerSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      await ensureOrganizerTournament(parsed.data.tournamentId, request.user!.id);
      const tournament = renamePlayer(parsed.data.tournamentId, parsed.data.playerId, parsed.data.newName);
      await persistTournament(tournament);
      const event = { type: "PLAYER_RENAMED" as const, tournamentId: tournament.id, payload: tournament };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, tournament.id, event);
      request.log.info(
        {
          tournamentId: tournament.id,
          playerId: parsed.data.playerId
        },
        "POST /tournaments/rename-player"
      );
      return { data: tournament };
    } catch (error) {
      reply.status(404);
      return { message: (error as Error).message };
    }
  });

  server.post("/tournaments/rename", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = renameTournamentSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      await ensureOrganizerTournament(parsed.data.tournamentId, request.user!.id);
      const tournament = renameTournament(parsed.data.tournamentId, parsed.data.newName);
      await persistTournament(tournament);
      const event = { type: "TOURNAMENT_RENAMED" as const, tournamentId: tournament.id, payload: tournament };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, tournament.id, event);
      request.log.info({ tournamentId: tournament.id }, "POST /tournaments/rename");
      return { data: tournament };
    } catch (error) {
      reply.status(404);
      return { message: (error as Error).message };
    }
  });

  server.post("/tournaments/adjust-courts", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = adjustCourtsSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      await ensureOrganizerTournament(parsed.data.tournamentId, request.user!.id);
      assertVersion(parsed.data.tournamentId, parsed.data.expectedVersion);
      const tournament = adjustCourts(parsed.data.tournamentId, parsed.data.courts);
      await persistTournament(tournament);
      const event = { type: "COURTS_ADJUSTED" as const, tournamentId: tournament.id, payload: tournament };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, tournament.id, event);
      request.log.info(
        {
          tournamentId: tournament.id,
          courts: parsed.data.courts
        },
        "POST /tournaments/adjust-courts"
      );
      return { data: tournament };
    } catch (error) {
      const message = (error as Error).message;
      reply.status(mapTournamentMutationErrorStatus(message));
      return { message };
    }
  });

  server.post("/tournaments/substitute-player", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = substitutePlayerSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      await ensureOrganizerTournament(parsed.data.tournamentId, request.user!.id);
      const tournament = substitutePlayer(
        parsed.data.tournamentId,
        parsed.data.playerId,
        parsed.data.replacementName
      );
      await persistTournament(tournament);
      const event = { type: "PLAYER_SUBSTITUTED" as const, tournamentId: tournament.id, payload: tournament };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, tournament.id, event);
      request.log.info(
        {
          tournamentId: tournament.id,
          playerId: parsed.data.playerId
        },
        "POST /tournaments/substitute-player"
      );
      return { data: tournament };
    } catch (error) {
      reply.status(404);
      return { message: (error as Error).message };
    }
  });

  server.post("/tournaments/add-pending-player", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = addPendingPlayerSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      await ensureOrganizerTournament(parsed.data.tournamentId, request.user!.id);
      assertVersion(parsed.data.tournamentId, parsed.data.expectedVersion);
      const tournament = addPendingPlayer(parsed.data.tournamentId, parsed.data.name, parsed.data.gender);
      await persistTournament(tournament);
      const event = {
        type: "PENDING_PLAYER_ADDED" as const,
        tournamentId: tournament.id,
        payload: tournament
      };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, tournament.id, event);
      request.log.info(
        {
          tournamentId: tournament.id,
          playerName: parsed.data.name
        },
        "POST /tournaments/add-pending-player"
      );
      return { data: tournament };
    } catch (error) {
      const message = (error as Error).message;
      reply.status(mapTournamentMutationErrorStatus(message));
      return { message };
    }
  });

  server.post("/tournaments/integrate-pending", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = integratePendingPlayersSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      await ensureOrganizerTournament(parsed.data.tournamentId, request.user!.id);
      assertVersion(parsed.data.tournamentId, parsed.data.expectedVersion);
      const tournament = integratePendingPlayers(parsed.data.tournamentId);
      await persistTournament(tournament);
      const event = {
        type: "PENDING_PLAYERS_INTEGRATED" as const,
        tournamentId: tournament.id,
        payload: tournament
      };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, tournament.id, event);
      request.log.info(
        {
          tournamentId: tournament.id
        },
        "POST /tournaments/integrate-pending"
      );
      return { data: tournament };
    } catch (error) {
      const message = (error as Error).message;
      reply.status(mapTournamentMutationErrorStatus(message));
      return { message };
    }
  });

  server.delete("/tournaments/:id", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const params = request.params as { id: string };
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }
    try {
      await ensureOrganizerTournament(params.id, request.user.id);
      try {
        deleteTournament(params.id);
      } catch {
        // already removed from memory
      }
      try {
        await prisma.tournament.delete({
          where: { id: params.id }
        });
      } catch {
        // may only exist in memory when DB persist failed
      }
      const event = {
        type: "TOURNAMENT_DELETED" as const,
        tournamentId: params.id,
        payload: { id: params.id }
      };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, params.id, event);
      request.log.info({ id: params.id }, "DELETE /tournaments/:id");
      return { ok: true };
    } catch (error) {
      reply.status(404);
      return { message: (error as Error).message };
    }
  });
}

async function loadTournamentState(tournamentId: string) {
  const existing = getTournament(tournamentId);
  if (existing) {
    return existing;
  }
  try {
    const row = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: tournamentInclude
    });
    if (!row) {
      throw new Error("Tournament not found.");
    }
    return mapDbTournamentToState(row);
  } catch (error) {
    if ((error as Error).message === "Tournament not found.") {
      throw error;
    }
    throw new Error("Tournament not found.");
  }
}

async function ensureTournamentInMemory(tournamentId: string): Promise<void> {
  const existing = getTournament(tournamentId);
  if (existing) {
    return;
  }
  const state = await loadTournamentState(tournamentId);
  putTournament(state);
}

async function ensureOrganizerTournament(tournamentId: string, userId: string): Promise<void> {
  await ensureTournamentInMemory(tournamentId);
  assertOrganizer(userId, getTournament(tournamentId));
}

async function persistTournament(tournament: {
  id: string;
  config: TournamentConfig;
  players: DomainPlayer[];
  rounds: DomainRound[];
  version: number;
  createdAt: string;
  updatedAt: string;
  pendingPlayers: DomainPendingPlayer[];
  integrationWaveCount: number;
}): Promise<void> {
  try {
    await prisma.player.deleteMany({ where: { tournamentId: tournament.id } });
    await prisma.round.deleteMany({ where: { tournamentId: tournament.id } });
    await prisma.pendingPlayer.deleteMany({ where: { tournamentId: tournament.id } });

    await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        name: tournament.config.name,
        mode: tournament.config.mode,
        variant: tournament.config.variant,
        schedulingMode: tournament.config.schedulingMode as SchedulingMode,
        courts: tournament.config.courts,
        pointsPerMatch: tournament.config.pointsPerMatch,
        scoringMode: tournament.config.scoringMode ?? "AMERICANO_POINTS",
        regularSetFormat: tournament.config.regularScoring?.setFormat ?? null,
        regularGameWinBy: tournament.config.regularScoring?.gameWinBy ?? null,
        regularSetsToWin: tournament.config.regularScoring?.setsToWin ?? null,
        regularSetTiebreakTo: tournament.config.regularScoring?.setTiebreakTo ?? null,
        regularMatchTiebreak: tournament.config.regularScoring?.matchTiebreak ?? null,
        targetGamesPerPlayer: tournament.config.targetGamesPerPlayer ?? null,
        tournamentTimeMinutes: tournament.config.tournamentTimeMinutes ?? null,
        integrationWaveCount: tournament.integrationWaveCount,
        enableAutoIntegration: tournament.config.enableAutoIntegration ?? false,
        integrationThreshold: tournament.config.integrationThreshold ?? 2,
        version: tournament.version,
        updatedAt: new Date(tournament.updatedAt),
        players: {
          create: tournament.players.map((player) => ({
            id: player.id,
            name: player.name,
            gender: player.gender ?? null,
            gamesPlayed: player.gamesPlayed,
            totalPoints: player.totalPoints,
            matchesWon: player.matchesWon ?? 0,
            matchesLost: player.matchesLost ?? 0,
            setsWon: player.setsWon ?? 0,
            setsLost: player.setsLost ?? 0,
            gamesWon: player.gamesWon ?? 0,
            gamesLost: player.gamesLost ?? 0,
            handicap: player.handicap ?? null,
            integrationWave: player.integrationWave ?? null,
            integratedAt: null // Not currently tracked in domain model
          }))
        },
        pendingPlayers: {
          create: tournament.pendingPlayers.map((pp) => ({
            id: pp.id,
            name: pp.name,
            gender: pp.gender ?? null,
            createdAt: new Date(pp.createdAt)
          }))
        },
        rounds: {
          create: tournament.rounds.map((round) => ({
            id: round.id,
            roundNumber: round.roundNumber,
            isLocked: round.isLocked,
            matches: {
              create: round.matches.map((match) => ({
                id: match.id,
                court: match.court,
                teamA: match.teamA,
                teamB: match.teamB,
                scoreA: match.scoreA ?? null,
                scoreB: match.scoreB ?? null,
                matchTbA: match.matchTbA ?? null,
                matchTbB: match.matchTbB ?? null,
                completed: match.completed,
                sets: {
                  create: (match.sets ?? []).map((set) => ({
                    setNumber: set.setNumber,
                    gamesA: set.gamesA,
                    gamesB: set.gamesB,
                    tbA: set.tbA ?? null,
                    tbB: set.tbB ?? null
                  }))
                }
              }))
            }
          }))
        }
      }
    });
  } catch (error) {
    // Memory store remains source of truth for the live session when DB is unavailable.
    logger.error({ err: error, tournamentId: tournament.id }, "Failed to persist tournament");
  }
}
