# Organizer players module (Modular Hexagonal)

Cross-event player careers for one organizer: every credited match adds an
`OrganizerPlayerStatDelta` row, and `/me/players/*` aggregates those rows per range
(`month` / `year` / `all`), tournament mode and optional name search.

```text
http/            → /me/players/leaderboard, /me/players/:id
application/     → read use-cases + OrganizerPlayerRepository port
domain/          → range boundaries + pure aggregation (leaderboard, detail)
infrastructure/  → Prisma repository (reads) + careerCredits (writes)
```

Ranking rules, opt-in behavior and worked examples:
[`docs/career-leaderboard.md`](../../../../../docs/career-leaderboard.md).

## Notes

- **Write side lives in `infrastructure/careerCredits.ts`.** `ensureOrganizerPlayer` and
  `creditMatchToOrganizerPlayers` run inside the caller's Prisma transaction, so KOH scoring,
  roster changes and Americano/Mexicano score submits credit careers atomically with the score.
  That file is the stable entry point for other modules — do not reach into the repository from
  outside. `creditKohMatchToOrganizerPlayers` is a thin King of the Hill wrapper over it.
- **Only opted-in tournaments are credited.** Callers must check
  `Tournament.contributeToCareerLeaderboard` before crediting; the tournament module does it in
  `application/submitScore.ts`, KOH in `infrastructure/ops/scoreKohPersist.ts`.
- **Rank is match wins, then name** (`domain/careerStats.ts`). Games and points are secondary
  display stats and must never become a primary sort key, or Americano scorelines would outrank
  Regular / King of the Hill results.
- Every delta stores its source `tournamentMode`, which is how `?mode=` filters one mode's board
  in SQL while `overall` sums them all.
- Crediting is idempotent per `(matchId, organizerPlayerId)`: re-submitting a score overwrites
  the delta instead of double counting, and a player who leaves a unit keeps past results.
- Identity is `organizerId` + normalized display name (`domain/careerRange.ts`), so renames
  within one organizer merge into the same career.
- Guests have no career: the leaderboard answers 200 with an upsell payload and the detail route
  answers 403. Keep that messaging when changing the routes.
