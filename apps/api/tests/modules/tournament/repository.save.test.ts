import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Prisma } from "@prisma/client";

import { prisma } from "../../../src/lib/prisma.js";
import { createTournamentState } from "../../../src/modules/tournament/domain/createTournamentState.js";
import { PrismaTournamentRepository } from "../../../src/modules/tournament/infrastructure/PrismaTournamentRepository.js";
import { isAppError } from "../../../src/shared/kernel/appError.js";

// These tests write only to an explicitly configured, isolated test database.
const options = { skip: !process.env.TEST_DATABASE_URL };
const repo = new PrismaTournamentRepository();

async function fixture(t: { after: (cleanup: () => Promise<void>) => void }) {
  assert.ok(
    process.env.DATABASE_URL === process.env.TEST_DATABASE_URL,
    "DATABASE_URL must match the explicitly configured TEST_DATABASE_URL"
  );
  const organizerId = randomUUID();
  await prisma.user.create({
    data: { id: organizerId, name: "Save Test", email: `${organizerId}@example.com` }
  });
  t.after(async () => {
    await prisma.tournament.deleteMany({ where: { organizerId } });
    await prisma.user.delete({ where: { id: organizerId } });
  });
  const state = createTournamentState(
    {
      name: "Original tournament",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: ["A", "B", "C", "D"].map((name) => ({ name })),
      courts: 1,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 2,
      scoringMode: "REGULAR",
      regularScoring: { setFormat: "FULL_SET", gameWinBy: 2, setsToWin: 1 }
    },
    organizerId
  );
  state.rounds[0].matches[0].sets = [{ setNumber: 1, gamesA: 6, gamesB: 4 }];
  await repo.create(state);
  await prisma.pendingPlayer.create({ data: { id: randomUUID(), tournamentId: state.id, name: "Waiting" } });
  const saved = await repo.getById(state.id);
  assert.ok(saved);
  return saved;
}

test("save rolls back version, deletions, matches and sets when replacement fails", options, async (t) => {
  const original = await fixture(t);
  const changed = structuredClone(original);
  changed.config.name = "Must not be saved";
  changed.version += 1;
  changed.players.push({ ...changed.players[0] }); // Fails during the replacement write.

  await assert.rejects(
    repo.save(changed, original.version),
    (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );

  assert.deepEqual(await repo.getById(original.id), original);
});

test("save commits the complete replacement and keeps pending players and match sets", options, async (t) => {
  const original = await fixture(t);
  const changed = structuredClone(original);
  changed.config.name = "Updated tournament";
  changed.version += 1;
  changed.players[0].name = "Updated player";
  changed.pendingPlayers[0].name = "Updated waiting player";
  Object.assign(changed.rounds[0].matches[0].sets![0], { gamesA: 7, gamesB: 5 });

  await repo.save(changed, original.version);

  const loaded = await repo.getById(original.id);
  assert.ok(loaded);
  assert.equal(loaded.version, changed.version);
  assert.equal(loaded.config.name, changed.config.name);
  assert.deepEqual(loaded.players, changed.players);
  assert.deepEqual(loaded.pendingPlayers, changed.pendingPlayers);
  assert.deepEqual(loaded.rounds, changed.rounds);
});

test("concurrent saves with the same version allow only one complete update", options, async (t) => {
  const original = await fixture(t);
  const candidates = ["First writer", "Second writer"].map((name) => {
    const state = structuredClone(original);
    state.config.name = name;
    state.players[0].name = name;
    state.version += 1;
    return state;
  });
  const results = await Promise.allSettled(candidates.map((state) => repo.save(state, original.version)));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected?.status === "rejected" && isAppError(rejected.reason));
  assert.equal(rejected.reason.code, "CONFLICT");
  const winnerIndex = results.findIndex((result) => result.status === "fulfilled");
  const loaded = await repo.getById(original.id);
  assert.ok(loaded);
  assert.equal(loaded.version, original.version + 1);
  assert.equal(loaded.config.name, candidates[winnerIndex].config.name);
  assert.deepEqual(loaded.players, candidates[winnerIndex].players);
  assert.deepEqual(loaded.pendingPlayers, original.pendingPlayers);
  assert.deepEqual(loaded.rounds, original.rounds);
});

test("a stale save leaves the existing aggregate untouched", options, async (t) => {
  const original = await fixture(t);
  const changed = structuredClone(original);
  changed.version += 1;
  await assert.rejects(
    repo.save(changed, original.version + 5),
    (error) => isAppError(error) && error.code === "CONFLICT"
  );
  assert.deepEqual(await repo.getById(original.id), original);
});

test.after(async () => {
  await prisma.$disconnect();
});
