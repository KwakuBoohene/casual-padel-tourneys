# Scheduling Engine

## Objective

Primary objective: equal number of games per player.

Secondary objective: reduce repeated teammates and opponents while balancing rests and courts.

## Inputs

- number of players
- number of courts
- points per match
- target games per player OR total tournament time
- mode and variant (Americano or Mexicano)

## Hard Constraints

- exactly four players assigned per court
- player appears at most once per round
- respect court count and game limits
- **never repeat the same opponent team** (classic: the pair on the other side; team Americano: the
  same fixed pair). This is Americano's core promise and applies to every scheduling mode. Only
  Mexicano, which ladders by standings, may repeat a matchup.
- when recalculating remaining rounds, seed pairing history from locked rounds before generating

## Soft Constraints

- minimize repeated teammate pairings
- minimize repeated individual opponents
- balance sit-outs when players exceed `courts * 4`

## Schedule Length

Length is driven by how many distinct matchups exist, never by player count alone. Courts only
control how many of those matchups run in parallel — fewer courts means more rounds, not fewer
matches. See `scheduleMath.ts`.

| Mode | Team Americano (`t` teams) | Classic Americano (`n` players) |
| --- | --- | --- |
| `ROUND_ROBIN` | all `C(t,2)` matchups | every partnership once: `C(n,2) / 2` matches |
| `TARGET_GAMES` | `t * target / 2`, capped at `C(t,2)` | `n * target / 4`, target capped at `C(n-1,2)` |
| `TOTAL_TIME` | rounds from the time estimate, capped at capacity | same, capped at capacity |

`matchesPerRound = min(courts, floor(t / 2))` for team play and `min(courts, floor(n / 4))` for
classic. Targets are capped at capacity so a long event stops rather than forcing a rematch.

## Matchup Selection

- **Team Americano** plans the whole event upfront as an ordered matchup list using the circle
  ("Berger table") rotation, so every pair meets exactly once and any prefix of the list stays
  balanced. Rounds are then packed from that list, so a rematch is structurally impossible.
- **Classic Americano** fills each round court by court with a backtracking search. Splits that
  would repeat an opponent team are rejected outright; the search backtracks instead of settling
  for the cheapest rematch, and relaxes the rule only if the field offers no alternative.

## Round Generation Strategy

1. Sort players by `effectiveGames` ascending where `effectiveGames = gamesPlayed + (handicap ?? 0)`.
2. Anchor each court on the lowest-games player still free this round.
3. Enumerate quadruples from nearby players and all three ways to split each into two teams.
4. Discard splits that repeat an opponent team, then rank the rest by games balance, teammate
   repeats, individual opponent repeats, and co-play diversity.
5. Recurse to the next court, backtracking when a choice leaves no legal split behind.
6. Update teammate/opponent/opponent-team matrices and repeat for all planned rounds.

## Handicap System

When players are integrated mid-tournament:

- **Handicap calculation**: `handicap = floor(avgGamesPlayed * 0.5)` (default ratio)
- **Selection priority**: Uses `effectiveGames = gamesPlayed + handicap` in sorting
- **Purpose**: Prevents newly integrated players from monopolizing early rounds
- **Duration**: Handicap remains constant after integration, dilutes naturally as real games accumulate

## Team Americano (fixed pairs)

Americano `variant: TEAM` keeps **named doubles pairs** for the whole event (same roster
shape as Team Mexicano). Partners never split.

- Create with `teams[]` (min **2** pairs). Players are flattened for scoring / career credit.
- Schedule is generated upfront like Classic Americano (`TARGET_GAMES` / `TOTAL_TIME` /
  `ROUND_ROBIN`), but selection units are **pairs**: each court is pair vs pair.
- A pair never faces the same pair twice; `ROUND_ROBIN` plays all `C(t,2)` matchups.
- Unlike Team Mexicano, later rounds are **not** laddered from standings.

## Fairness Validation

Simulation test runs 1,000 tournaments and checks:

- `maxGamesPlayed - minGamesPlayed <= 1` (normal scenarios)
- With integrated players: tolerances vary based on integration size:
  - 2 players integrated: `maxGamesDelta <= 2` (their handicap costs them the first round back)
  - 4+ players or multiple waves: `maxGamesDelta <= 3-4`
  - Edge cases with high handicaps: `maxGamesDelta <= 5`

`tests/engine/americanoNoRematch.test.ts` additionally asserts, across team counts, player counts,
court counts, and every scheduling mode, that no player ever faces the same opponent team twice and
that `ROUND_ROBIN` really does schedule every matchup.

## Mid-Tournament Changes

- completed rounds are locked
- adjust-court action recalculates remaining rounds
- rename and substitution preserve player identity/state

### Player Integration (Late Arrivals)

**Adding pending players:**

- Players can be added to a pending list during active tournaments
- No immediate impact on schedule until integration
- Supports gender field for MIXED variant compatibility

**Integration process:**

- **Trigger**: Manual action via `POST /tournaments/integrate-pending`
- **Eligibility requirements:**
  - At least 2 pending players
  - Current round must be complete (at least one locked, none in progress)
  - Integration wave count < 3 (max 3 waves per tournament)
- **Integration steps:**
  1. Calculate average games played by existing players
  2. Assign handicap to new players: `handicap = floor(avgGames * 0.5)`
  3. Convert pending players to active players
  4. Recalculate all remaining (unlocked) rounds with expanded player pool
  5. Update leaderboard and round numbers for continuity
  6. Increment integration wave counter
- **Handicap effect**: New players treated as having played `handicap` games for selection purposes
- **Wave tracking**: Each integrated player tagged with `integrationWave` (1-3)

**Recalculation behavior:**

- Locked rounds remain unchanged
- Player `gamesPlayed` reset to count only locked rounds
- Regenerates schedule for remaining rounds with full player list
- Maintains round number continuity from locked rounds
