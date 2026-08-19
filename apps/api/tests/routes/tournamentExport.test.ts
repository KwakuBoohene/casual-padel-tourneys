import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";

function signUser(id: string): string {
  return jwt.sign(
    { sub: id, email: `${id}@example.com`, name: "Test", emailVerified: true, isGuest: true },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function withApp<T>(fn: (app: Awaited<ReturnType<typeof createApp>>) => Promise<T>): Promise<T> {
  const originalSecret = process.env.JWT_SECRET;
  const originalRedis = process.env.REDIS_URL;
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  const app = await createApp();
  try {
    return await fn(app);
  } finally {
    await app.close();
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedis;
  }
}

const createPayload = {
  name: "Export Night",
  mode: "AMERICANO",
  variant: "CLASSIC",
  schedulingMode: "TARGET_GAMES",
  players: ["Ana", "Ben", "Cam", "Dee", "Eve", "Fay", "Gus", "Hal"].map((name) => ({ name })),
  courts: 2,
  pointsPerMatch: 24,
  targetGamesPerPlayer: 3
};

async function createTournament(app: Awaited<ReturnType<typeof createApp>>, token: string) {
  const response = await app.inject({
    method: "POST",
    url: "/tournaments",
    headers: { authorization: `Bearer ${token}` },
    payload: createPayload
  });
  assert.equal(response.statusCode, 200);
  return response.json().data;
}

function rows(csv: string): string[] {
  return csv.replace(/^﻿/, "").trim().split("\r\n");
}

test("organizer downloads the leaderboard as CSV", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-1");
    const tournament = await createTournament(app, token);

    const response = await app.inject({
      method: "GET",
      url: `/tournaments/${tournament.id}/export?format=csv`,
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] as string, /text\/csv/);
    assert.match(
      response.headers["content-disposition"] as string,
      /attachment; filename="export-night-full-\d{4}-\d{2}-\d{2}\.csv"/
    );

    const lines = rows(response.body);
    assert.equal(lines[0], "Leaderboard");
    assert.equal(lines[1], "#,Player,MP,W,L,D,GW,GL,GD,PW(A),PL(A),PTS");
    // Every player has a standings row, ahead of the matches section.
    const standings = lines.slice(2, 2 + createPayload.players.length);
    assert.equal(standings.length, createPayload.players.length);
    assert.ok(standings.every((line) => /^\d+,[A-Za-z]/.test(line)));
  });
});

test("the export carries the rounds and matches, not just the leaderboard", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-sections");
    const tournament = await createTournament(app, token);
    const match = tournament.rounds[0].matches[0];
    await app.inject({
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

    const response = await app.inject({
      method: "GET",
      url: `/tournaments/${tournament.id}/export?format=csv`,
      headers: { authorization: `Bearer ${token}` }
    });
    const lines = rows(response.body);

    assert.ok(lines.includes("Leaderboard"), "leaderboard section is labelled");
    assert.ok(lines.includes("Rounds and matches"), "matches section is present");
    assert.ok(lines.includes("Round,Court,Team A,Team B,Score,Status"));

    const played = lines.find((line) => line.includes("16-8"));
    assert.ok(played, "the scored match and its score are listed");
    assert.match(played!, /Completed$/);
    assert.ok(
      lines.some((line) => line.endsWith("Not played")),
      "unplayed matches are listed too"
    );

    const totalMatches = tournament.rounds.flatMap((r: { matches: unknown[] }) => r.matches).length;
    const matchLines = lines.filter((line) => /^\d+,\d+,/.test(line));
    assert.equal(matchLines.length, totalMatches, "every match appears exactly once");
  });
});

test("scope=leaderboard returns the standings only", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-scope");
    const tournament = await createTournament(app, token);

    const response = await app.inject({
      method: "GET",
      url: `/tournaments/${tournament.id}/export?format=csv&scope=leaderboard`,
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 200);
    const lines = rows(response.body);
    assert.equal(lines[0], "#,Player,MP,W,L,D,GW,GL,GD,PW(A),PL(A),PTS", "no section heading");
    assert.ok(!lines.includes("Rounds and matches"), "matches must be omitted");
    assert.equal(lines.length, 1 + createPayload.players.length);
    assert.match(
      response.headers["content-disposition"] as string,
      /-leaderboard-\d{4}-\d{2}-\d{2}\.csv/
    );
  });
});

test("scope=full is the default and names the file differently", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-scope2");
    const tournament = await createTournament(app, token);

    const explicit = await app.inject({
      method: "GET",
      url: `/tournaments/${tournament.id}/export?format=csv&scope=full`,
      headers: { authorization: `Bearer ${token}` }
    });
    const implied = await app.inject({
      method: "GET",
      url: `/tournaments/${tournament.id}/export?format=csv`,
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(explicit.body, implied.body, "full is the default");
    assert.ok(rows(explicit.body).includes("Rounds and matches"));
    assert.match(
      explicit.headers["content-disposition"] as string,
      /-full-\d{4}-\d{2}-\d{2}\.csv/
    );
  });
});

test("an unknown scope is rejected", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-scope3");
    const tournament = await createTournament(app, token);
    const response = await app.inject({
      method: "GET",
      url: `/tournaments/${tournament.id}/export?format=csv&scope=everything`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(response.statusCode, 400);
    assert.match(response.json().message, /Supported: leaderboard, full/);
  });
});

test("a closed tournament marks its unplayed matches Void in the export", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-void");
    const tournament = await createTournament(app, token);

    const close = await app.inject({
      method: "POST",
      url: `/tournaments/${tournament.id}/close`,
      headers: { authorization: `Bearer ${token}` },
      payload: { expectedVersion: tournament.version }
    });
    assert.equal(close.statusCode, 200);

    const response = await app.inject({
      method: "GET",
      url: `/tournaments/${tournament.id}/export?format=csv`,
      headers: { authorization: `Bearer ${token}` }
    });
    const lines = rows(response.body).filter((line) => /^\d+,\d+,/.test(line));
    assert.ok(lines.length > 0);
    for (const line of lines) {
      assert.match(line, /,Void$/, `voided match should read Void: ${line}`);
      assert.match(line, /,,Void$/, "a voided match shows no score");
    }
  });
});

test("scored results reach the CSV", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-2");
    const tournament = await createTournament(app, token);
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

    const response = await app.inject({
      method: "GET",
      url: `/tournaments/${tournament.id}/export?format=csv`,
      headers: { authorization: `Bearer ${token}` }
    });
    const lines = rows(response.body);
    const winner = lines.find((line) => line.includes(",16,8,"));
    assert.ok(winner, "a row should carry 16 points won and 8 lost");
    assert.ok(winner!.split(",")[3] === "1", "that player has one win");
  });
});

test("share token downloads the same table without auth and without organizer data", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-3");
    const tournament = await createTournament(app, token);

    const organizerCsv = await app.inject({
      method: "GET",
      url: `/tournaments/${tournament.id}/export?format=csv`,
      headers: { authorization: `Bearer ${token}` }
    });
    const publicCsv = await app.inject({
      method: "GET",
      url: `/public/${tournament.publicToken}/export?format=csv`
    });

    assert.equal(publicCsv.statusCode, 200);
    assert.equal(publicCsv.body, organizerCsv.body);
    assert.doesNotMatch(publicCsv.body, /organizerId/);
    assert.doesNotMatch(publicCsv.body, /export-owner-3/);
  });
});

test("format defaults to csv when omitted", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-4");
    const tournament = await createTournament(app, token);
    const response = await app.inject({
      method: "GET",
      url: `/public/${tournament.publicToken}/export`
    });
    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] as string, /text\/csv/);
  });
});

test("organizer downloads the leaderboard as PDF", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-pdf");
    const tournament = await createTournament(app, token);

    const response = await app.inject({
      method: "GET",
      url: `/tournaments/${tournament.id}/export?format=pdf`,
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "application/pdf");
    assert.match(
      response.headers["content-disposition"] as string,
      /attachment; filename="export-night-full-\d{4}-\d{2}-\d{2}\.pdf"/
    );
    assert.equal(response.rawPayload.subarray(0, 5).toString(), "%PDF-");
    assert.ok(response.rawPayload.length > 1000);
  });
});

test("the share token can download a PDF too", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-pdf2");
    const tournament = await createTournament(app, token);
    const response = await app.inject({
      method: "GET",
      url: `/public/${tournament.publicToken}/export?format=pdf`
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.rawPayload.subarray(0, 5).toString(), "%PDF-");
  });
});

test("an unsupported format is rejected", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-5");
    const tournament = await createTournament(app, token);
    const response = await app.inject({
      method: "GET",
      url: `/public/${tournament.publicToken}/export?format=xlsx`
    });
    assert.equal(response.statusCode, 400);
    assert.match(response.json().message, /Unsupported export format/);
    assert.match(response.json().message, /csv, pdf/);
  });
});

test("unknown token and another organizer's tournament both 404", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-6");
    const stranger = signUser("export-stranger-6");
    const tournament = await createTournament(app, token);

    const unknown = await app.inject({ method: "GET", url: "/public/public_missing/export?format=csv" });
    assert.equal(unknown.statusCode, 404);

    const other = await app.inject({
      method: "GET",
      url: `/tournaments/${tournament.id}/export?format=csv`,
      headers: { authorization: `Bearer ${stranger}` }
    });
    assert.equal(other.statusCode, 404, "existence is not leaked to non-owners");
  });
});

test("the organizer export requires auth", async () => {
  await withApp(async (app) => {
    const token = signUser("export-owner-7");
    const tournament = await createTournament(app, token);
    const response = await app.inject({
      method: "GET",
      url: `/tournaments/${tournament.id}/export?format=csv`
    });
    assert.equal(response.statusCode, 401);
  });
});
