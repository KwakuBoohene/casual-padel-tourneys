import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

import { CAREER_JWT_SECRET, signUser, withApp, type LeaderboardRow } from "./careerTestApp.js";

const winSet = {
  setNumber: 1,
  gamesA: 6,
  gamesB: 4,
  winMethodsA: ["REGULAR", "REGULAR", "REGULAR", "REGULAR", "REGULAR", "REGULAR"],
  winMethodsB: ["REGULAR", "REGULAR", "REGULAR", "REGULAR"]
};

test("KOH complete credits organizer player career; replace keeps past on leaver", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const create = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Career KOH",
        mode: "KING_OF_THE_HILL",
        courts: 1,
        regularScoring: {
          setFormat: "FULL_SET",
          gameWinBy: 2,
          setsToWin: 1,
          setTiebreakTo: 7
        }
      }
    });
    assert.equal(create.statusCode, 200);
    const created = create.json().data;

    const assign = await app.inject({
      method: "PUT",
      url: `/koh/tournaments/${created.id}/assignment`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        courts: [
          {
            courtNumber: 1,
            units: [
              { playerA: { name: "Paul" }, playerB: { name: "George" } },
              { playerA: { name: "Sam" }, playerB: { name: "Jordan" } }
            ]
          }
        ]
      }
    });
    assert.equal(assign.statusCode, 200);
    const hub = assign.json().data;
    const court = hub.courts[0];
    const georgeId = court.king.playerBId;

    const score = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${created.id}/courts/${court.id}/score`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version,
        status: "COMPLETE",
        sets: [winSet]
      }
    });
    assert.equal(score.statusCode, 200);

    const board = await app.inject({
      method: "GET",
      url: "/me/players/leaderboard?range=all",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(board.statusCode, 200);
    assert.equal(board.json().data.mode, "overall");
    const rows = board.json().data.rows as LeaderboardRow[];
    assert.equal(rows.length, 4);
    const paul = rows.find((row) => row.name === "Paul");
    const george = rows.find((row) => row.name === "George");
    assert.ok(paul);
    assert.ok(george);
    assert.equal(paul.gamesWon, 6);
    assert.equal(paul.matchesWon, 1);
    assert.equal(george.gamesWon, 6);
    assert.equal(george.matchesWon, 1);

    const afterScore = score.json().data;
    const replace = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${created.id}/units/${court.king.id}/replace-partner`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: afterScore.version,
        leavePlayerId: georgeId,
        replacement: { name: "Peter" }
      }
    });
    assert.equal(replace.statusCode, 200);

    const boardAfter = await app.inject({
      method: "GET",
      url: "/me/players/leaderboard?range=all",
      headers: { authorization: `Bearer ${token}` }
    });
    const rowsAfter = boardAfter.json().data.rows as LeaderboardRow[];
    assert.equal(rowsAfter.find((row) => row.name === "George")?.gamesWon, 6);
    assert.equal(rowsAfter.find((row) => row.name === "Peter"), undefined);

    const georgeCareer = rowsAfter.find((row) => row.name === "George")!;
    const detail = await app.inject({
      method: "GET",
      url: `/me/players/${georgeCareer.id}?range=all`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json().data.gamesWon, 6);
    assert.ok(detail.json().data.recentEvents.some((e: { tournamentName: string }) => e.tournamentName === "Career KOH"));
  });
});

test("guest organizers get a career upsell instead of stats", async () => {
  await withApp(async (app) => {
    const guestId = `guest-${randomUUID()}`;
    const guestToken = jwt.sign(
      { sub: guestId, email: `${guestId}@guest.local`, name: "Guest", isGuest: true },
      CAREER_JWT_SECRET,
      { expiresIn: "1h" }
    );

    const board = await app.inject({
      method: "GET",
      url: "/me/players/leaderboard",
      headers: { authorization: `Bearer ${guestToken}` }
    });
    assert.equal(board.statusCode, 200);
    assert.deepEqual(board.json().data, {
      range: "all",
      mode: "overall",
      rows: [],
      guest: true,
      message: "Attach an account to track player careers across events."
    });

    const detail = await app.inject({
      method: "GET",
      url: "/me/players/orgplayer_whatever",
      headers: { authorization: `Bearer ${guestToken}` }
    });
    assert.equal(detail.statusCode, 403);
  });
});
