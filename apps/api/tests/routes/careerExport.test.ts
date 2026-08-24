import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";

function signUser(id: string, isGuest = false): string {
  return jwt.sign(
    { sub: id, email: `${id}@example.com`, name: "Kwaku Club", emailVerified: true, isGuest },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function ensureUser(id: string, isGuest: boolean): Promise<void> {
  await prisma.user.upsert({
    where: { id },
    create: {
      id,
      email: `${id}@example.com`,
      name: "Kwaku Club",
      isGuest,
      emailVerifiedAt: new Date()
    },
    update: { emailVerifiedAt: new Date(), isGuest }
  });
}

async function cleanup(id: string): Promise<void> {
  await prisma.organizerPlayerStatDelta.deleteMany({ where: { organizerId: id } });
  await prisma.organizerPlayer.deleteMany({ where: { organizerId: id } });
  await prisma.tournament.deleteMany({ where: { organizerId: id } });
  await prisma.user.deleteMany({ where: { id } });
}

async function withApp<T>(
  fn: (app: Awaited<ReturnType<typeof createApp>>, organizerId: string) => Promise<T>,
  isGuest = false
): Promise<T> {
  const organizerId = `career-export-${randomUUID()}`;
  const originalSecret = process.env.JWT_SECRET;
  const originalRedis = process.env.REDIS_URL;
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  const app = await createApp();
  try {
    await ensureUser(organizerId, isGuest);
    return await fn(app, organizerId);
  } finally {
    await app.close();
    await cleanup(organizerId);
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedis;
  }
}

const createPayload = {
  name: "Club Night",
  mode: "AMERICANO",
  variant: "CLASSIC",
  schedulingMode: "TARGET_GAMES",
  players: ["Ana", "Ben", "Cam", "Dee", "Eve", "Fay", "Gus", "Hal"].map((name) => ({ name })),
  courts: 2,
  pointsPerMatch: 24,
  targetGamesPerPlayer: 3,
  contributeToCareerLeaderboard: true
};

async function seedScoredEvent(
  app: Awaited<ReturnType<typeof createApp>>,
  token: string
): Promise<void> {
  const create = await app.inject({
    method: "POST",
    url: "/tournaments",
    headers: { authorization: `Bearer ${token}` },
    payload: createPayload
  });
  assert.equal(create.statusCode, 200);
  const tournament = create.json().data;
  const match = tournament.rounds[0].matches[0];
  const score = await app.inject({
    method: "POST",
    url: "/tournaments/score",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      tournamentId: tournament.id,
      matchId: match.id,
      scoreA: 16,
      scoreB: 8,
      expectedVersion: tournament.version
    }
  });
  assert.equal(score.statusCode, 200);
}

function rows(csv: string): string[] {
  return csv.replace(/^﻿/, "").trim().split("\r\n");
}

test("career board exports as CSV for the signed-in organizer", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    await seedScoredEvent(app, token);

    const response = await app.inject({
      method: "GET",
      url: "/me/players/leaderboard/export?format=csv&range=all&scope=leaderboard",
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] as string, /text\/csv/);
    assert.match(
      response.headers["content-disposition"] as string,
      /attachment; filename="kwaku-club-leaderboard-\d{4}-\d{2}-\d{2}\.csv"/
    );
    const lines = rows(response.body);
    assert.equal(lines[0], "#,Player,MP,W,L,D,GW,GL,GD,PW(A),PL(A),PTS,MWR,GWR");
    assert.equal(lines.length, 5, "four players credited from one match");
  });
});

test("career matches export lists one row per credited player", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    await seedScoredEvent(app, token);

    const response = await app.inject({
      method: "GET",
      url: "/me/players/matches/export?format=csv&range=all",
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 200);
    const lines = rows(response.body);
    assert.equal(lines[0], "Date,Tournament,Mode,Player,MP,W,L,D,GW,GL,PW(A),PL(A)");
    const dataLines = lines.filter((line) => line.includes("Club Night"));
    assert.equal(dataLines.length, 4);
    assert.ok(dataLines.every((line) => line.includes("AMERICANO")));
    // Americano has no games: GW and GL must be zero on every row.
    for (const line of dataLines) {
      const cells = line.split(",");
      assert.equal(cells[8], "0", `GW should be 0: ${line}`);
      assert.equal(cells[9], "0", `GL should be 0: ${line}`);
    }
  });
});

test("global scope=full carries the leaderboard, its tournaments and its matches", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    await seedScoredEvent(app, token);

    const response = await app.inject({
      method: "GET",
      url: "/me/players/leaderboard/export?format=csv&range=year&scope=full",
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 200);
    const lines = rows(response.body);
    assert.ok(lines.includes("Account leaderboard"));
    assert.ok(lines.includes("Tournaments"));
    assert.ok(lines.includes("Matches"));
    assert.ok(lines.includes("Date,Tournament,Mode,Players,Matches"));

    const eventRow = lines.find((line) => line.startsWith("2026-") && line.includes("Club Night"));
    assert.ok(eventRow, "the event is listed");
    // One match was scored, crediting four players.
    assert.match(eventRow!, /,4,1$/);
    assert.match(response.headers["content-disposition"] as string, /-full-/);
  });
});

test("global scope=leaderboard returns the standings only", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    await seedScoredEvent(app, token);

    const response = await app.inject({
      method: "GET",
      url: "/me/players/leaderboard/export?format=csv&range=year&scope=leaderboard",
      headers: { authorization: `Bearer ${token}` }
    });

    const lines = rows(response.body);
    assert.equal(lines[0], "#,Player,MP,W,L,D,GW,GL,GD,PW(A),PL(A),PTS,MWR,GWR");
    assert.ok(!lines.includes("Tournaments"));
    assert.ok(!lines.includes("Matches"));
    assert.match(response.headers["content-disposition"] as string, /-leaderboard-/);
  });
});

test("an unknown scope is rejected on the global export", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const response = await app.inject({
      method: "GET",
      url: "/me/players/leaderboard/export?format=csv&range=year&scope=everything",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(response.statusCode, 400);
    assert.match(response.json().message, /Supported: leaderboard, full/);
  });
});

test("career exports render as PDF too", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    await seedScoredEvent(app, token);

    for (const url of [
      "/me/players/leaderboard/export?format=pdf&range=all",
      "/me/players/matches/export?format=pdf&range=all"
    ]) {
      const response = await app.inject({ method: "GET", url, headers: { authorization: `Bearer ${token}` } });
      assert.equal(response.statusCode, 200, url);
      assert.equal(response.headers["content-type"], "application/pdf");
      assert.equal(response.rawPayload.subarray(0, 5).toString(), "%PDF-", url);
    }
  });
});

test("a guest gets an empty table with headers, not an error", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId, true);
    const response = await app.inject({
      method: "GET",
      url: "/me/players/leaderboard/export?format=csv&range=all",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(response.statusCode, 200);
    const lines = rows(response.body);
    assert.equal(lines[0], "#,Player,MP,W,L,D,GW,GL,GD,PW(A),PL(A),PTS,MWR,GWR");
    assert.match(response.body, /Attach an account/);
  }, true);
});

test("career exports require auth and reject a bad range or format", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);

    const noAuth = await app.inject({ method: "GET", url: "/me/players/leaderboard/export?format=csv" });
    assert.equal(noAuth.statusCode, 401);

    const badRange = await app.inject({
      method: "GET",
      url: "/me/players/leaderboard/export?format=csv&range=decade",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(badRange.statusCode, 400);

    const badFormat = await app.inject({
      method: "GET",
      url: "/me/players/leaderboard/export?format=xlsx&range=all",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(badFormat.statusCode, 400);
  });
});

test("the export route does not shadow the player detail route", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const response = await app.inject({
      method: "GET",
      url: "/me/players/does-not-exist?range=all",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(response.statusCode, 404, "still routes to the detail handler");
  });
});
