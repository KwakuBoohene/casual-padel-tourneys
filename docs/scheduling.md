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

## Soft Constraints

- minimize repeated teammate pairings
- minimize repeated opponent pairings
- balance sit-outs when players exceed `courts * 4`

## Round Generation Strategy

1. Sort players by `effectiveGames` ascending where `effectiveGames = gamesPlayed + (handicap ?? 0)`.
2. Select the active player pool for this round.
3. Split into groups of 4.
4. Evaluate team combinations and choose lowest repeat-cost pairing.
5. Update teammate/opponent matrices.
6. Repeat for all rounds derived from estimate.

## Handicap System

When players are integrated mid-tournament:

- **Handicap calculation**: `handicap = floor(avgGamesPlayed * 0.5)` (default ratio)
- **Selection priority**: Uses `effectiveGames = gamesPlayed + handicap` in sorting
- **Purpose**: Prevents newly integrated players from monopolizing early rounds
- **Duration**: Handicap remains constant after integration, dilutes naturally as real games accumulate

## Fairness Validation

Simulation test runs 1,000 tournaments and checks:

- `maxGamesPlayed - minGamesPlayed <= 1` (normal scenarios)
- With integrated players: tolerances vary based on integration size:
  - 2 players integrated: `maxGamesDelta <= 1`
  - 4+ players or multiple waves: `maxGamesDelta <= 3-4`
  - Edge cases with high handicaps: `maxGamesDelta <= 5`

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
