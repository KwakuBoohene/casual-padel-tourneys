import { maxGamesDelta } from "./fairnessEvaluator.js";
import { generateTournament } from "./americanoScheduler.js";

const runs = 1000;
let worstDelta = 0;

for (let index = 0; index < runs; index += 1) {
  const config = {
    name: "Simulation",
    mode: "AMERICANO" as const,
    variant: "CLASSIC" as const,
    schedulingMode: "TARGET_GAMES" as const,
    players: Array.from({ length: 16 }, (_, value) => `Player ${value + 1}`),
    courts: 3,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  };
  const { players } = generateTournament(config);
  const delta = maxGamesDelta(players);
  worstDelta = Math.max(worstDelta, delta);
}

console.log(JSON.stringify({ runs, worstDelta }, null, 2));
