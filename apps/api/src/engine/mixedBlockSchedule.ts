import { createId } from "@padel/shared";
import type { Match, Player, Round } from "@padel/shared";

import { spreadOpponents, type Team } from "./mixedOpponentSpread.js";
import type { ScheduleShape } from "./scheduleMath.js";

/**
 * Mixed Americano with equal numbers of men and women, built in blocks. In block `t` man `i`
 * partners woman `i + t`, so everybody plays at most once per block and no partnership can ever
 * repeat. Only who faces whom is left to choose, and that is improved by trading whole teams
 * between courts.
 */


export function buildMixedBlockRounds(players: Player[], shape: ScheduleShape): Round[] | null {
  const men = players.filter((player) => player.gender === "MALE");
  const women = players.filter((player) => player.gender === "FEMALE");
  const perGender = men.length;
  const everyoneHasGender = men.length + women.length === players.length;
  if (perGender < 2 || women.length !== perGender || !everyoneHasGender) {
    return null;
  }
  // An odd field cannot seat everyone in one block: team `t` sits out block `t`, which gives
  // every man and every woman exactly one block off, but only when all the blocks are played.
  const odd = perGender % 2 !== 0;
  const teamsPerBlock = odd ? perGender - 1 : perGender;
  const blockCount = (2 * shape.totalMatches) / teamsPerBlock;
  if (!Number.isInteger(blockCount) || blockCount > perGender || (odd && blockCount !== perGender)) {
    return null;
  }

  const blocks = Array.from({ length: blockCount }, (_, block) =>
    men
      .map((man, index): Team => [man.id, women[(index + block) % perGender].id])
      .filter((_, index) => !odd || index !== block)
  );
  const teamsByRound = packTeams(blocks, 2 * shape.matchesPerRound);
  if (!teamsByRound) {
    return null;
  }
  const rounds = teamsByRound.map((teams, index): Round => ({
    id: createId("round"),
    roundNumber: index + 1,
    isLocked: false,
    matches: Array.from({ length: teams.length / 2 }, (_, court): Match => ({
      id: createId("match"),
      round: index + 1,
      court: court + 1,
      teamA: teams[2 * court],
      teamB: teams[2 * court + 1],
      completed: false
    }))
  }));
  const blockOf = new Map<Team, number>();
  blocks.forEach((block, index) => block.forEach((team) => blockOf.set(team, index)));
  spreadOpponents(rounds, players, blockOf);
  return rounds;
}

/**
 * Plays the blocks in order, `teamsPerRound` at a time, putting whoever has waited longest on
 * court first. A round that straddles two blocks borrows teams from the next block whose players
 * are not already on court.
 */
function packTeams(blocks: Team[][], teamsPerRound: number): Team[][] | null {
  const queue = blocks.map((block) => [...block]);
  const lastPlayed = new Map<string, number>();
  const waited = (team: Team) => (lastPlayed.get(team[0]) ?? 0) + (lastPlayed.get(team[1]) ?? 0);
  const rounds: Team[][] = [];
  let current = 0;
  while (current < queue.length) {
    const picked: Team[] = [];
    const busy = new Set<string>();
    for (const block of queue.slice(current, current + 2)) {
      for (const team of [...block].sort((a, b) => waited(a) - waited(b))) {
        if (picked.length === teamsPerRound) break;
        if (busy.has(team[0]) || busy.has(team[1])) continue;
        busy.add(team[0]).add(team[1]);
        picked.push(team);
        block.splice(block.indexOf(team), 1);
      }
    }
    rounds.push(picked);
    busy.forEach((playerId) => lastPlayed.set(playerId, rounds.length));
    while (current < queue.length && queue[current].length === 0) current += 1;
    const unfinished = current < queue.length;
    if (picked.length % 2 !== 0 || (unfinished && picked.length < teamsPerRound)) {
      return null;
    }
  }
  return rounds;
}
