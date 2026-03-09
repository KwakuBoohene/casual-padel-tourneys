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

1. Sort players by `gamesPlayed` ascending.
2. Select the active player pool for this round.
3. Split into groups of 4.
4. Evaluate team combinations and choose lowest repeat-cost pairing.
5. Update teammate/opponent matrices.
6. Repeat for all rounds derived from estimate.

## Fairness Validation

Simulation test runs 1,000 tournaments and checks:

- `maxGamesPlayed - minGamesPlayed <= 1`

## Mid-Tournament Changes

- completed rounds are locked
- adjust-court action recalculates remaining rounds
- rename and substitution preserve player identity/state
