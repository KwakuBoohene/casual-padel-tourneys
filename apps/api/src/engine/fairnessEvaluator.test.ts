import test from "node:test";
import assert from "node:assert/strict";

import { maxGamesDelta, countTeammateRepeats, countOpponentRepeats } from "./fairnessEvaluator.js";
import type { Player, Round, Match } from "@padel/shared";
import { createId } from "@padel/shared";

// ========== maxGamesDelta Tests ==========

test("maxGamesDelta returns 0 for empty player array", () => {
  const result = maxGamesDelta([]);
  assert.equal(result, 0);
});

test("maxGamesDelta returns 0 when all players have same gamesPlayed", () => {
  const players: Player[] = [
    { id: "p1", name: "Player 1", gamesPlayed: 3, totalPoints: 60 },
    { id: "p2", name: "Player 2", gamesPlayed: 3, totalPoints: 50 },
    { id: "p3", name: "Player 3", gamesPlayed: 3, totalPoints: 55 }
  ];
  const result = maxGamesDelta(players);
  assert.equal(result, 0);
});

test("maxGamesDelta returns 0 for single player", () => {
  const players: Player[] = [{ id: "p1", name: "Player 1", gamesPlayed: 5, totalPoints: 100 }];
  const result = maxGamesDelta(players);
  assert.equal(result, 0);
});

test("maxGamesDelta calculates difference correctly", () => {
  const players: Player[] = [
    { id: "p1", name: "Player 1", gamesPlayed: 2, totalPoints: 40 },
    { id: "p2", name: "Player 2", gamesPlayed: 5, totalPoints: 100 },
    { id: "p3", name: "Player 3", gamesPlayed: 3, totalPoints: 60 }
  ];
  const result = maxGamesDelta(players);
  assert.equal(result, 3, "5 - 2 = 3");
});

test("maxGamesDelta with players at 0 games", () => {
  const players: Player[] = [
    { id: "p1", name: "Player 1", gamesPlayed: 0, totalPoints: 0 },
    { id: "p2", name: "Player 2", gamesPlayed: 4, totalPoints: 80 },
    { id: "p3", name: "Player 3", gamesPlayed: 2, totalPoints: 40 }
  ];
  const result = maxGamesDelta(players);
  assert.equal(result, 4, "4 - 0 = 4");
});

test("maxGamesDelta with large differences", () => {
  const players: Player[] = [
    { id: "p1", name: "Player 1", gamesPlayed: 1, totalPoints: 20 },
    { id: "p2", name: "Player 2", gamesPlayed: 15, totalPoints: 300 }
  ];
  const result = maxGamesDelta(players);
  assert.equal(result, 14, "15 - 1 = 14");
});

test("maxGamesDelta ideal fairness scenario (delta <= 1)", () => {
  const players: Player[] = [
    { id: "p1", name: "Player 1", gamesPlayed: 4, totalPoints: 80 },
    { id: "p2", name: "Player 2", gamesPlayed: 4, totalPoints: 85 },
    { id: "p3", name: "Player 3", gamesPlayed: 5, totalPoints: 95 },
    { id: "p4", name: "Player 4", gamesPlayed: 4, totalPoints: 90 }
  ];
  const result = maxGamesDelta(players);
  assert.equal(result, 1, "5 - 4 = 1 (ideal fairness)");
  assert.ok(result <= 1, "Should meet fairness goal");
});

// ========== countTeammateRepeats Tests ==========

test("countTeammateRepeats returns 0 for empty rounds", () => {
  const result = countTeammateRepeats([]);
  assert.equal(result, 0);
});

test("countTeammateRepeats returns 0 when no repeated pairs", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p1", "p3"],
          teamB: ["p2", "p4"],
          completed: false
        }
      ]
    }
  ];
  const result = countTeammateRepeats(rounds);
  assert.equal(result, 0, "All teammates are different");
});

test("countTeammateRepeats counts one repeated pair", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p1", "p2"], // Repeated pair
          teamB: ["p3", "p5"],
          completed: false
        }
      ]
    }
  ];
  const result = countTeammateRepeats(rounds);
  assert.equal(result, 1, "p1-p2 played together twice");
});

test("countTeammateRepeats counts multiple repeated pairs", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p1", "p2"], // Repeated
          teamB: ["p3", "p4"], // Repeated
          completed: false
        }
      ]
    }
  ];
  const result = countTeammateRepeats(rounds);
  assert.equal(result, 2, "p1-p2 and p3-p4 both repeated");
});

test("countTeammateRepeats with multiple matches in same round", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        },
        {
          id: createId("match"),
          round: 1,
          court: 2,
          teamA: ["p5", "p6"],
          teamB: ["p7", "p8"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p1", "p2"], // Repeated
          teamB: ["p5", "p7"],
          completed: false
        }
      ]
    }
  ];
  const result = countTeammateRepeats(rounds);
  assert.equal(result, 1, "Only p1-p2 repeated");
});

test("countTeammateRepeats pair order independence", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p2", "p1"], // Same pair, different order
          teamB: ["p3", "p5"],
          completed: false
        }
      ]
    }
  ];
  const result = countTeammateRepeats(rounds);
  assert.equal(result, 1, "p1-p2 and p2-p1 should be counted as same pair");
});

test("countTeammateRepeats with three times together", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p5", "p6"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 3,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 3,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p7", "p8"],
          completed: false
        }
      ]
    }
  ];
  const result = countTeammateRepeats(rounds);
  assert.equal(result, 1, "p1-p2 repeated (counts as 1 pair, not 2)");
});

// ========== countOpponentRepeats Tests ==========

test("countOpponentRepeats returns 0 for empty rounds", () => {
  const result = countOpponentRepeats([]);
  assert.equal(result, 0);
});

test("countOpponentRepeats returns 0 when no repeated opponents", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p5", "p6"],
          completed: false
        }
      ]
    }
  ];
  const result = countOpponentRepeats(rounds);
  assert.equal(result, 0, "No opponent pairs repeated");
});

test("countOpponentRepeats counts repeated opponent pair", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p1", "p5"],
          teamB: ["p3", "p6"], // p1 vs p3 again
          completed: false
        }
      ]
    }
  ];
  const result = countOpponentRepeats(rounds);
  assert.equal(result, 1, "p1 vs p3 repeated");
});

test("countOpponentRepeats with full match repetition", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"], // Same match
          completed: false
        }
      ]
    }
  ];
  const result = countOpponentRepeats(rounds);
  // Each match creates 4 opponent pairs: p1-p3, p1-p4, p2-p3, p2-p4
  assert.equal(result, 4, "All 4 opponent pairs repeated");
});

test("countOpponentRepeats with teams swapped", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p3", "p4"],
          teamB: ["p1", "p2"], // Same matchup, sides swapped
          completed: false
        }
      ]
    }
  ];
  const result = countOpponentRepeats(rounds);
  assert.equal(result, 4, "All 4 opponent pairs repeated regardless of side");
});

test("countOpponentRepeats pair order independence", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p3", "p5"],
          teamB: ["p1", "p6"], // p1 vs p3 again, but p3 and p1 on opposite teams
          completed: false
        }
      ]
    }
  ];
  const result = countOpponentRepeats(rounds);
  assert.equal(result, 1, "p1-p3 and p3-p1 should be same pair");
});

test("countOpponentRepeats with multiple rounds and matches", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        },
        {
          id: createId("match"),
          round: 1,
          court: 2,
          teamA: ["p5", "p6"],
          teamB: ["p7", "p8"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p1", "p3"], // p1 and p3 were opponents, now teammates
          teamB: ["p2", "p4"], // p2 and p4 were opponents, now teammates
          completed: false
        }
      ]
    }
  ];
  const result = countOpponentRepeats(rounds);
  // Round 1, Match 1 opponents: p1-p3, p1-p4, p2-p3, p2-p4
  // Round 1, Match 2 opponents: p5-p7, p5-p8, p6-p7, p6-p8
  // Round 2 opponents: p1-p2, p1-p4, p3-p2, p3-p4
  // Repeated: p1-p4, p2-p3 (note: p1-p2 were teammates in R1, p3-p4 were teammates in R1)
  assert.equal(result, 2, "p1-p4 and p2-p3 repeated");
});

test("countOpponentRepeats with three times against", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p1", "p5"],
          teamB: ["p3", "p6"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 3,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 3,
          court: 1,
          teamA: ["p1", "p7"],
          teamB: ["p3", "p8"],
          completed: false
        }
      ]
    }
  ];
  const result = countOpponentRepeats(rounds);
  assert.equal(result, 1, "p1-p3 repeated (counts as 1 pair even with 3 occurrences)");
});

test("countOpponentRepeats complex scenario", () => {
  const rounds: Round[] = [
    {
      id: createId("round"),
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          completed: false
        }
      ]
    },
    {
      id: createId("round"),
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: createId("match"),
          round: 2,
          court: 1,
          teamA: ["p1", "p3"],
          teamB: ["p2", "p5"],
          completed: false
        }
      ]
    }
  ];
  const result = countOpponentRepeats(rounds);
  // Round 1 opponents: p1-p3, p1-p4, p2-p3, p2-p4
  // Round 2 opponents: p1-p2, p1-p5, p3-p2, p3-p5
  // Repeated: p2-p3 only (p1-p2 were teammates in R1, not opponents)
  assert.equal(result, 1, "Only p2-p3 repeated");
});
