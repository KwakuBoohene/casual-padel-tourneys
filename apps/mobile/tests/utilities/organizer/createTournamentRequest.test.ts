import assert from "node:assert/strict";
import test from "node:test";

import { prepareCreateTournamentRequest } from "../../../src/utilities/organizer/createTournamentRequest.ts";

const baseDraft = {
  name: "Friday Social",
  mode: "AMERICANO" as const,
  variant: "CLASSIC" as const,
  schedulingMode: "TARGET_GAMES" as const,
  players: ["A", "B", "C", "D", "E", "F", "G", "H"],
  playerGenders: Array(8).fill(undefined) as undefined[],
  sanitizedPlayersCount: 8,
  hasDuplicatePlayerNames: false,
  courtsText: "2",
  pointsText: "24",
  targetGamesText: "4",
  tournamentTimeText: "90"
};

test("prepareCreateTournamentRequest includes Regular scoring fields without points", () => {
  const prepared = prepareCreateTournamentRequest({
    ...baseDraft,
    scoringMode: "REGULAR",
    regularScoring: {
      setFormat: "FULL_SET",
      gameWinBy: 2,
      setsToWin: 1,
      setTiebreakTo: 7
    }
  });
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  assert.equal(prepared.payload.scoringMode, "REGULAR");
  assert.equal(prepared.payload.regularScoring?.setFormat, "FULL_SET");
  assert.equal(prepared.payload.pointsPerMatch, undefined);
});

test("prepareCreateTournamentRequest sends deuceMode STAR with gameWinBy 1", () => {
  const prepared = prepareCreateTournamentRequest({
    ...baseDraft,
    scoringMode: "REGULAR",
    regularScoring: {
      setFormat: "BO3_GAMES",
      gameWinBy: 1,
      deuceMode: "STAR",
      setsToWin: 1
    }
  });
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  assert.equal(prepared.payload.regularScoring?.deuceMode, "STAR");
  assert.equal(prepared.payload.regularScoring?.gameWinBy, 1);
});

test("prepareCreateTournamentRequest keeps Americano points and omits regularScoring", () => {
  const prepared = prepareCreateTournamentRequest({
    ...baseDraft,
    scoringMode: "AMERICANO_POINTS",
    regularScoring: {
      setFormat: "BO3_GAMES",
      gameWinBy: 1,
      setsToWin: 1
    }
  });
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  assert.equal(prepared.payload.scoringMode, "AMERICANO_POINTS");
  assert.equal(prepared.payload.pointsPerMatch, 24);
  assert.equal(prepared.payload.regularScoring, undefined);
});

test("prepareCreateTournamentRequest accepts Team Americano with two pairs", () => {
  const prepared = prepareCreateTournamentRequest({
    ...baseDraft,
    variant: "TEAM",
    teams: [
      { playerA: "Ana", playerB: "Ben" },
      { playerA: "Cam", playerB: "Dee" }
    ],
    sanitizedPlayersCount: 4,
    courtsText: "1",
    scoringMode: "AMERICANO_POINTS",
    regularScoring: {
      setFormat: "FULL_SET",
      gameWinBy: 2,
      setsToWin: 1,
      setTiebreakTo: 7
    }
  });
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  assert.equal(prepared.payload.variant, "TEAM");
  assert.equal(prepared.payload.teams?.length, 2);
  assert.equal(prepared.payload.players.length, 4);
  assert.equal(prepared.payload.teams?.[0].playerA.name, "Ana");
});

test("prepareCreateTournamentRequest rejects Team Americano with one pair", () => {
  const prepared = prepareCreateTournamentRequest({
    ...baseDraft,
    variant: "TEAM",
    teams: [{ playerA: "Ana", playerB: "Ben" }],
    sanitizedPlayersCount: 2,
    courtsText: "1",
    scoringMode: "AMERICANO_POINTS",
    regularScoring: {
      setFormat: "FULL_SET",
      gameWinBy: 2,
      setsToWin: 1,
      setTiebreakTo: 7
    }
  });
  assert.equal(prepared.ok, false);
  if (prepared.ok) return;
  assert.match(prepared.error, /Team Americano/);
  assert.match(prepared.error, /2/);
});

test("prepareCreateTournamentRequest still requires four Team Mexicano pairs", () => {
  const prepared = prepareCreateTournamentRequest({
    ...baseDraft,
    mode: "MEXICANO",
    variant: "TEAM",
    schedulingMode: "TOTAL_TIME",
    teams: [
      { playerA: "A", playerB: "B" },
      { playerA: "C", playerB: "D" }
    ],
    sanitizedPlayersCount: 4,
    courtsText: "1",
    scoringMode: "AMERICANO_POINTS",
    regularScoring: {
      setFormat: "FULL_SET",
      gameWinBy: 2,
      setsToWin: 1,
      setTiebreakTo: 7
    }
  });
  assert.equal(prepared.ok, false);
  if (prepared.ok) return;
  assert.match(prepared.error, /Team Mexicano/);
});

test("prepareCreateTournamentRequest rejects Mexicano with fewer than 8 players", () => {
  const prepared = prepareCreateTournamentRequest({
    ...baseDraft,
    mode: "MEXICANO",
    schedulingMode: "TOTAL_TIME",
    players: ["A", "B", "C", "D"],
    sanitizedPlayersCount: 4,
    courtsText: "1",
    scoringMode: "AMERICANO_POINTS",
    regularScoring: {
      setFormat: "FULL_SET",
      gameWinBy: 2,
      setsToWin: 1,
      setTiebreakTo: 7
    }
  });
  assert.equal(prepared.ok, false);
  if (prepared.ok) return;
  assert.match(prepared.error, /at least 8/i);
});

test("prepareCreateTournamentRequest defaults contributeToCareerLeaderboard on", () => {
  const prepared = prepareCreateTournamentRequest({
    ...baseDraft,
    scoringMode: "AMERICANO_POINTS",
    regularScoring: {
      setFormat: "BO3_GAMES",
      gameWinBy: 1,
      setsToWin: 1
    }
  });
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  assert.equal(prepared.payload.contributeToCareerLeaderboard, true);
});

test("prepareCreateTournamentRequest sends contributeToCareerLeaderboard false", () => {
  const prepared = prepareCreateTournamentRequest({
    ...baseDraft,
    scoringMode: "AMERICANO_POINTS",
    regularScoring: {
      setFormat: "BO3_GAMES",
      gameWinBy: 1,
      setsToWin: 1
    },
    contributeToCareerLeaderboard: false
  });
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  assert.equal(prepared.payload.contributeToCareerLeaderboard, false);
});
