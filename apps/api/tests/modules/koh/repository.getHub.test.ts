import test from "node:test";
import assert from "node:assert/strict";

import { computeBalanceHint } from "../../../src/modules/koh/domain/balanceHint.js";
import { PrismaKohRepository } from "../../../src/modules/koh/infrastructure/PrismaKohRepository.js";
import { isAppError } from "../../../src/shared/kernel/appError.js";
import { prisma } from "../../../src/lib/prisma.js";

const OWNER = "koh-repo-owner";
const INTRUDER = "koh-repo-intruder";

const kohConfig = {
  name: "KOH Repo Night",
  mode: "KING_OF_THE_HILL" as const,
  pairingMode: "WINNER_STAYS" as const,
  courts: 2,
  regularScoring: {
    setFormat: "FULL_SET" as const,
    gameWinBy: 2 as const,
    setsToWin: 1,
    setTiebreakTo: 7 as const
  },
  promotionRules: [{ courtNumber: 2, winsRequired: 3 }]
};

async function ensureUser(id: string): Promise<void> {
  await prisma.user.upsert({
    where: { id },
    create: { id, email: `${id}@example.com`, name: "Repo Test", isGuest: false },
    update: {}
  });
}

async function seedHub() {
  await ensureUser(OWNER);
  await ensureUser(INTRUDER);
  const repo = new PrismaKohRepository();
  const hub = await repo.create(kohConfig, OWNER);
  return { repo, hub };
}

function appErrorCode(error: unknown): string | undefined {
  return isAppError(error) ? error.code : undefined;
}

test("repo.create then getHub returns the hub projection for the owner", async () => {
  const { repo, hub } = await seedHub();
  const loaded = await repo.getHub(hub.id, OWNER);

  assert.equal(loaded.id, hub.id);
  assert.equal(loaded.config.mode, "KING_OF_THE_HILL");
  assert.equal(loaded.config.pairingMode, "WINNER_STAYS");
  assert.equal(loaded.courts.length, 2);
  assert.equal(loaded.ready, false, "empty courts are not ready");
  assert.equal(loaded.balanceHint, null);
  assert.equal(loaded.endedAt, null);
  assert.equal(loaded.version, 0);
  assert.deepEqual(loaded.config.promotionRules, [
    { courtNumber: 2, winsRequired: 3, promoteToCourtNumber: undefined }
  ]);
});

test("getHub without an organizer scope serves public reads", async () => {
  const { repo, hub } = await seedHub();
  const loaded = await repo.getHub(hub.id);
  assert.equal(loaded.id, hub.id);
  assert.equal(loaded.organizerId, OWNER);
});

test("getHub hides another organizer's night as NOT_FOUND", async () => {
  const { repo, hub } = await seedHub();
  await assert.rejects(
    () => repo.getHub(hub.id, INTRUDER),
    (error: unknown) => {
      assert.equal(appErrorCode(error), "NOT_FOUND");
      assert.equal((error as Error).message, "Tournament not found.");
      return true;
    }
  );
});

test("getHub rejects unknown ids and non-KOH tournaments", async () => {
  const { repo } = await seedHub();
  await assert.rejects(
    () => repo.getHub("tournament_does_not_exist", OWNER),
    (error: unknown) => {
      assert.equal(appErrorCode(error), "NOT_FOUND");
      assert.equal((error as Error).message, "KOH tournament not found.");
      return true;
    }
  );

  const americano = await prisma.tournament.create({
    data: {
      id: `tournament_am_${Date.now()}`,
      name: "AM Control",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      courts: 1,
      pointsPerMatch: 24,
      publicToken: `public_am_${Date.now()}`,
      organizerId: OWNER,
      version: 0
    }
  });
  await assert.rejects(
    () => repo.getHub(americano.id, OWNER),
    (error: unknown) => appErrorCode(error) === "NOT_FOUND"
  );
});

test("getHubByPublicToken returns null for non-KOH tokens", async () => {
  const { repo, hub } = await seedHub();
  assert.equal(await repo.getHubByPublicToken("public_missing_token"), null);
  const byToken = await repo.getHubByPublicToken(hub.publicToken);
  assert.equal(byToken?.id, hub.id);
});

test("computeBalanceHint only warns when courts differ by more than one unit", () => {
  assert.equal(computeBalanceHint([]), null);
  assert.equal(computeBalanceHint([3, 3]), null);
  assert.equal(computeBalanceHint([3, 4]), null);
  assert.ok(computeBalanceHint([2, 4]));
});
