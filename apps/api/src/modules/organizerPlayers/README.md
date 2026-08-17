# Organizer players module (Modular Hexagonal)

Cross-event player careers for one organizer: every credited match adds an
`OrganizerPlayerStatDelta` row, and `/me/players/*` aggregates those rows per range
(`month` / `year` / `all`).

```text
http/            → /me/players/leaderboard, /me/players/:id
application/     → read use-cases + OrganizerPlayerRepository port
domain/          → range boundaries + pure aggregation (leaderboard, detail)
infrastructure/  → Prisma repository (reads) + careerCredits (writes)
```

## Notes

- **Write side lives in `infrastructure/careerCredits.ts`.** `ensureOrganizerPlayer` and
  `creditKohMatchToOrganizerPlayers` run inside the caller's Prisma transaction, so KOH scoring
  and roster changes credit careers atomically with the score. Americano/Mexicano credits run
  after score persist (`creditAmericanoMatchIfComplete`) and are skipped when
  `contributeToCareerLeaderboard` is false. Organizers can flip the flag later via
  `POST /tournaments/career-leaderboard` (`setCareerContribution`): off deletes this
  event's deltas; on backfills completed matches. That file is the stable entry point for other
  modules — do not reach into the repository from outside.
- Crediting is idempotent per `(matchId, organizerPlayerId)`: re-submitting a score overwrites
  the delta instead of double counting, and a player who leaves a unit keeps past results.
- Identity is `organizerId` + normalized display name (`domain/careerRange.ts`), so renames
  within one organizer merge into the same career.
- Leaderboard rank is match-win points, then sets, then regular games, then
  Americano rally points (name as last tiebreak). Points Americano stores rally
  totals as PW(A)/PL(A); each such match still counts as one match win (1 PTS)
  if won, or one draw (0 PTS) if tied. That game does not outrank regular games.
- Guests have no career: the leaderboard answers 200 with an upsell payload and the detail route
  answers 403. Keep that messaging when changing the routes.
