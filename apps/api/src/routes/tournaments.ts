import type { FastifyInstance } from "fastify";
import type { Match as DbMatch, Player as DbPlayer, Round as DbRound, Tournament as DbTournament } from "@prisma/client";
import type {
  LeaderboardEntry,
  Player as DomainPlayer,
  Round as DomainRound,
  SchedulingMode,
  TournamentConfig
} from "@padel/shared";
import {
  adjustCourtsSchema,
  createTournamentSchema,
  renamePlayerSchema,
  renameTournamentSchema,
  submitScoreSchema,
  substitutePlayerSchema
} from "@padel/shared";

import {
  adjustCourts,
  assertVersion,
  createTournament,
  deleteTournament,
  getTournament,
  getTournamentByPublicToken,
  putTournament,
  renamePlayer,
  renameTournament,
  submitScore,
  substitutePlayer
} from "../lib/store.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { publishEvent } from "../realtime/events.js";
import { broadcastToTournament } from "../realtime/socketHub.js";
import { logger } from "../lib/logger.js";

function buildLeaderboard(players: DomainPlayer[]): LeaderboardEntry[] {
  return [...players]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((player, index) => ({
      playerId: player.id,
      name: player.name,
      totalPoints: player.totalPoints,
      gamesPlayed: player.gamesPlayed,
      rank: index + 1
    }));
}

function mapDbTournamentToState(
  tournament: DbTournament & { players: DbPlayer[]; rounds: Array<DbRound & { matches: DbMatch[] }> }
) {
  const config: TournamentConfig = {
    name: tournament.name,
    mode: tournament.mode,
    variant: tournament.variant,
    schedulingMode: tournament.schedulingMode as SchedulingMode,
    players: tournament.players.map((player) => ({ name: player.name })),
    courts: tournament.courts,
    pointsPerMatch: tournament.pointsPerMatch,
    targetGamesPerPlayer: tournament.targetGamesPerPlayer ?? undefined,
    tournamentTimeMinutes: tournament.tournamentTimeMinutes ?? undefined
  };

  const players: DomainPlayer[] = tournament.players.map((player) => ({
    id: player.id,
    name: player.name,
    gamesPlayed: player.gamesPlayed,
    totalPoints: player.totalPoints
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
        completed: match.completed
      }))
    }));

  return {
    id: tournament.id,
    config,
    players,
    rounds,
    version: tournament.version,
    leaderboard: buildLeaderboard(players),
    publicToken: tournament.publicToken,
    createdAt: tournament.createdAt.toISOString(),
    updatedAt: tournament.updatedAt.toISOString(),
    organizerId: tournament.organizerId ?? undefined
  };
}

export async function registerTournamentRoutes(server: FastifyInstance): Promise<void> {
  server.get("/health", async () => ({ status: "ok" }));

  server.get("/tournaments", { preHandler: requireAuth }, async (request) => {
    if (!request.user) {
      return { data: [] };
    }
    const rows = await prisma.tournament.findMany({
      where: { organizerId: request.user.id },
      include: {
        players: true,
        rounds: {
          include: {
            matches: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    const data = rows.map(mapDbTournamentToState);
    request.log.info({ count: data.length }, "GET /tournaments");
    return { data };
  });

  server.get("/tournaments/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const row = await prisma.tournament.findUnique({
      where: { id: params.id },
      include: {
        players: true,
        rounds: {
          include: {
            matches: true
          }
        }
      }
    });
    if (!row) {
      reply.status(404);
      request.log.warn({ id: params.id }, "GET /tournaments/:id not found");
      return { message: "Tournament not found." };
    }
    request.log.info({ id: params.id }, "GET /tournaments/:id");
    return { data: mapDbTournamentToState(row) };
  });

  server.get("/public/:token", async (request, reply) => {
    const params = request.params as { token: string };
    const row = await prisma.tournament.findUnique({
      where: { publicToken: params.token },
      include: {
        players: true,
        rounds: {
          include: {
            matches: true
          }
        }
      }
    });
    if (!row) {
      reply.status(404);
      request.log.warn({ token: params.token }, "GET /public/:token not found");
      return { message: "Public tournament not found." };
    }
    request.log.info({ token: params.token }, "GET /public/:token");
    return { data: mapDbTournamentToState(row) };
  });

  server.post("/tournaments", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = createTournamentSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }
    const tournament = createTournament(parsed.data, request.user.id);
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
          targetGamesPerPlayer: tournament.config.targetGamesPerPlayer ?? null,
          tournamentTimeMinutes: tournament.config.tournamentTimeMinutes ?? null,
          publicToken: tournament.publicToken,
          organizerId: request.user.id,
          version: tournament.version,
          createdAt: new Date(tournament.createdAt),
          updatedAt: new Date(tournament.updatedAt),
          players: {
            create: tournament.players.map((player) => ({
              id: player.id,
              name: player.name,
              gamesPlayed: player.gamesPlayed,
              totalPoints: player.totalPoints
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
                  completed: match.completed
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

  server.get("/players/suggestions", { preHandler: requireAuth }, async (request, reply) => {
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

  server.post("/tournaments/score", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = submitScoreSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      await ensureTournamentInMemory(parsed.data.tournamentId);
      assertVersion(parsed.data.tournamentId, parsed.data.expectedVersion);
      const tournament = submitScore(parsed.data.tournamentId, parsed.data.matchId, parsed.data.scoreA, parsed.data.scoreB);
      await persistTournament(tournament);
      const event = { type: "SCORE_SUBMITTED" as const, tournamentId: tournament.id, payload: tournament };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, tournament.id, event);
      request.log.info(
        {
          tournamentId: tournament.id,
          matchId: parsed.data.matchId
        },
        "POST /tournaments/score"
      );
      return { data: tournament };
    } catch (error) {
      reply.status(409);
      return { message: (error as Error).message };
    }
  });

  server.post("/tournaments/rename-player", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = renamePlayerSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      await ensureTournamentInMemory(parsed.data.tournamentId);
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

  server.post("/tournaments/rename", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = renameTournamentSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      await ensureTournamentInMemory(parsed.data.tournamentId);
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

  server.post("/tournaments/adjust-courts", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = adjustCourtsSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      await ensureTournamentInMemory(parsed.data.tournamentId);
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
      reply.status(409);
      return { message: (error as Error).message };
    }
  });

  server.post("/tournaments/substitute-player", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = substitutePlayerSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      await ensureTournamentInMemory(parsed.data.tournamentId);
      const tournament = substitutePlayer(parsed.data.tournamentId, parsed.data.playerId, parsed.data.replacementName);
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

  server.delete("/tournaments/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = request.params as { id: string };
    try {
      // Best-effort removal from in-memory store; ignore if it was already evicted.
      try {
        deleteTournament(params.id);
      } catch {
        // no-op
      }
      await prisma.tournament.delete({
        where: { id: params.id }
      });
      const event = { type: "TOURNAMENT_DELETED" as const, tournamentId: params.id, payload: { id: params.id } };
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

async function ensureTournamentInMemory(tournamentId: string): Promise<void> {
  const existing = getTournament(tournamentId);
  if (existing) {
    return;
  }
  const row = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      players: true,
      rounds: {
        include: {
          matches: true
        }
      }
    }
  });
  if (!row) {
    throw new Error("Tournament not found.");
  }
  const state = mapDbTournamentToState(row);
  putTournament(state);
}

async function persistTournament(tournament: {
  id: string;
  config: TournamentConfig;
  players: DomainPlayer[];
  rounds: DomainRound[];
  version: number;
  createdAt: string;
  updatedAt: string;
}) {
  await prisma.player.deleteMany({ where: { tournamentId: tournament.id } });
  await prisma.round.deleteMany({ where: { tournamentId: tournament.id } });

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: {
      name: tournament.config.name,
      mode: tournament.config.mode,
      variant: tournament.config.variant,
      schedulingMode: tournament.config.schedulingMode as SchedulingMode,
      courts: tournament.config.courts,
      pointsPerMatch: tournament.config.pointsPerMatch,
      targetGamesPerPlayer: tournament.config.targetGamesPerPlayer ?? null,
      tournamentTimeMinutes: tournament.config.tournamentTimeMinutes ?? null,
      version: tournament.version,
      updatedAt: new Date(tournament.updatedAt),
      players: {
        create: tournament.players.map((player) => ({
          id: player.id,
          name: player.name,
          gamesPlayed: player.gamesPlayed,
          totalPoints: player.totalPoints
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
              completed: match.completed
            }))
          }
        }))
      }
    }
  });
}
