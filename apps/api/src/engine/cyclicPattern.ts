/**
 * In a cyclic schedule every player has the same play/rest rhythm, just shifted. This scores
 * that rhythm so the search can prefer designs where nobody waits long or falls behind on games.
 */
export interface RhythmQuality {
  /** Longest run of rounds a player sits out. */
  rest: number;
  /** Longest run of rounds a player plays without a break. */
  run: number;
  /** Largest gap in games played between any two players at any point in the event. */
  prefixDelta: number;
}

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** `plays[j]` is whether the reference player is on court in round `j` of one full cycle. */
export function rhythmQuality(plays: boolean[]): RhythmQuality {
  const period = plays.length;
  let rest = 0;
  let run = 0;
  let resting = 0;
  let playing = 0;
  for (let j = 0; j < 2 * period; j += 1) {
    resting = plays[j % period] ? 0 : resting + 1;
    playing = plays[j % period] ? playing + 1 : 0;
    rest = Math.max(rest, Math.min(resting, period));
    run = Math.max(run, Math.min(playing, period));
  }
  return { rest, run, prefixDelta: prefixDelta(plays) };
}

/** Compares every stretch of the same length: the busiest player against the idlest one. */
function prefixDelta(plays: boolean[]): number {
  const period = plays.length;
  const sums = [0];
  for (let j = 0; j < 2 * period; j += 1) {
    sums.push(sums[j] + (plays[j % period] ? 1 : 0));
  }
  let worst = 0;
  for (let length = 1; length < period; length += 1) {
    let low = Infinity;
    let high = -Infinity;
    for (let start = 0; start < period; start += 1) {
      const games = sums[start + length] - sums[start];
      low = Math.min(low, games);
      high = Math.max(high, games);
    }
    worst = Math.max(worst, high - low);
  }
  return worst;
}

export function rhythmScore(quality: RhythmQuality): number {
  return quality.rest * 100 + quality.prefixDelta * 10 + quality.run;
}
