Tournament Scheduling Engine
Core Principle

The system should optimize for:

Equal number of games per player

NOT:

Everyone plays everyone

This means we treat scheduling as a constraint optimization problem rather than a round-robin generator.

Core Concepts
Player
Player {
  id: string
  name: string
  gamesPlayed: number
  totalPoints: number
}
Court
Court {
  id: number
}
Match
Match {
  id: string
  round: number
  court: number
  teamA: [Player, Player]
  teamB: [Player, Player]
  scoreA?: number
  scoreB?: number
}
Round

A round is a set of simultaneous matches.

Round 1
Court 1 → Match
Court 2 → Match
Court 3 → Match
Scheduling Constraints

The engine must satisfy:

Hard Constraints

Exactly 4 players per court

No player appears twice in the same round

Respect court count

Respect max games per player

Soft Constraints

Try to optimize for:

Minimize repeated teammates

Minimize repeated opponents

Balance court usage

Balance rest periods

These are optimization goals, not strict rules.

Key Inputs
players: number
courts: number
pointsPerMatch: number
targetGamesPerPlayer?: number
tournamentTimeMinutes?: number

One of these must exist:

targetGamesPerPlayer
OR
tournamentTimeMinutes
Derived Values

Players per round:

playersPerRound = courts * 4

Example:

3 courts = 12 players per round
If more players than courts allow

Players must rotate out.

Example:

16 players
3 courts

12 playing
4 resting
Number of Rounds

If target games per player is given:

rounds = ceil(
  players * targetGamesPerPlayer
  /
  playersPerRound
)

Example:

16 players
target = 4 games
courts = 3
playersPerRound = 12

rounds ≈ 6
Round Generation Algorithm

For each round:

Step 1

Choose players who will play.

Priority:

players with lowest gamesPlayed

This keeps play counts balanced.

Step 2

Group players into matches.

Example:

12 players
→ 3 matches

Shuffle pool.

Split into groups of 4.

Step 3

Create teams.

For each group of 4:

[A B] vs [C D]

But rotate teammates across rounds to avoid repeats.

Teammate Rotation Strategy

Keep a teammate history matrix.

Example:

matrix[playerA][playerB] = times teammates

When forming teams:

Prefer pairings with lowest count.

Opponent Matrix

Same idea.

matrix[playerA][playerB] = times opponents

Prefer new opponents.

Rest Rotation

When players > playersPerRound:

Choose resting players using:

players with highest gamesPlayed

This keeps play counts equal.

Mexicano Engine

Mexicano works differently.

After every round:

Players are ranked by points.

Then regrouped.

Example ranking:

1
2
3
4
5
6
7
8

Then courts become:

Court 1
1 + 4 vs 2 + 3

Court 2
5 + 8 vs 6 + 7

This keeps games competitive.

Handling Court Changes Mid Tournament

If courts increase:

Example:

courts = 2 → 3

Recompute remaining rounds using:

remainingGamesNeeded

Then regenerate schedule.

Already played matches remain locked.

Changing Player Names

Player ID stays constant.

Only name updates.

No schedule recalculation needed.

Substitution Logic

If player leaves:

replace playerId

New player inherits:

gamesPlayed
points
Time Estimation Engine

Estimate match time:

Typical padel rally pace:

1 point ≈ 35 seconds

Example:

24 points match
≈ 14 minutes

Formula:

matchTimeMinutes =
(pointsPerMatch * 35) / 60
Total Tournament Time
tournamentTime =
rounds * matchTime
Example

Input:

Players: 16
Courts: 3
Points: 24
Target games: 4

Result:

Players per round: 12
Resting: 4

Rounds: 6
Matches: 18
Total duration ≈ 84 minutes
Engine Structure
/engine
  americanoScheduler.ts
  mexicanoScheduler.ts
  constraintSolver.ts
  fairnessEvaluator.ts
  timeEstimator.ts
Key Engine Functions
Generate Tournament
generateTournament(config)

Returns:

rounds[]
matches[]
Recalculate Schedule
recalculateRemainingTournament()

Used when:

courts change

players change

Estimate Tournament
estimateTournament(config)

Returns:

rounds
gamesPerPlayer
duration
Testing the Engine

We must simulate tournaments.

Example test:

1000 tournament simulations

Verify:

maxGamesPlayed - minGamesPlayed <= 1

This ensures fairness.

Hard Problem You Must Solve Early

The tricky scenario:

players not divisible by 4

Example:

10 players
2 courts

Solution:

ghost rotation

or

sit-out system

Why This Architecture Works

It allows:

court changes

player changes

flexible game counts

Americano + Mexicano support

future AI scheduling

without breaking the system.