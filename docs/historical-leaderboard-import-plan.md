# Historical leaderboard CSV imports

Status: implemented locally on 2026-10-22; pending user review and production rollout.
All changes remain uncommitted. Migration/import verification uses disposable local PostgreSQL only.

## Outcome

An Owner or Manager can upload a historical tournament leaderboard CSV, review the player
mapping and contribution preview, and add the confirmed results to the selected organizer's
career leaderboard. The owner retains ownership and the actual importer is recorded.

Imported summaries contribute supported player totals and one event appearance per player.
They never create fictional matches, opponents, partnerships, rounds, scores or court history.
Every affected screen/export explains when historical summaries are included.

## Converted source files

Files are in `plans/ranked-data/converted/`.

| Output | Source | Players | Player match appearances | Wins / losses | Games won / lost |
| --- | --- | ---: | ---: | ---: | ---: |
| recovered-aug18-leaderboard.csv (Ranked Games 1) | Two August 18 screenshots, pages 1 and 2 | 14 | 84 | 42 / 42 | 162 / 162 |
| ranked-games-2-leaderboard.csv | Ranked Games 2 PDF | 20 | 100 | 50 / 50 | 202 / 202 |
| ranked-games-3-leaderboard.csv | Ranked Games 3 screenshot | 14 | 84 | 42 / 42 | 172 / 172 |

There are 48 player-event rows and 24 distinct display names before identity review.
Player match appearances count each participating player; they are not counts of distinct
matches. The rows balance, ranks are consecutive, MP equals W+L+D, and GD equals GW-GL.
Reported percentages agree with the source counts within their displayed rounding.

Important source limitations:

- The organizer confirmed the actual event dates: Ranked Games 1 on 2026-08-18, Ranked
  Games 2 on 2026-08-27, and Ranked Games 3 on 2026-09-02. `event_date` is populated in
  each CSV. `source_date` separately retains the filename date.
- The organizer confirmed the first tournament's title as Ranked Games 1. Its filename
  and stable event key are retained to avoid treating this metadata correction as a new event.
- Only the first screenshots explicitly identify Americano / Team. Mode and variant remain
  blank for Games 2 and 3, whose headings only establish Regular scoring.
- Set win/loss totals are absent in all three sources and remain blank. The first event
  explicitly says one set per match, best of five games, win by one, Star point; preserve that
  evidence without applying its settings to the other tournaments.
- Games 2 and 3 show zero Americano rally points and match-win-based PTS. Those are preserved.
  Their percentages are stored as decimal fractions (80.0% becomes 0.8). The first screenshots
  do not show these fields, so those cells remain blank.
- Names, source rank and all visible numeric values are preserved. Do not infer that a
  repeated name, especially `Random`, necessarily means the same person in another event.

## Existing code and integration points

- `apps/api/prisma/schema.prisma`: `OrganizerPlayer` is the organizer-scoped career identity.
  `OrganizerPlayerStatDelta` currently represents a real player-match result and requires
  `matchId`, `tournamentId`, numeric set totals and an occurrence timestamp.
- `organizerPlayers/domain/careerStats.ts`: aggregates deltas into career totals, events
  played and recent events. Current ranking is match wins, set wins, games won, rally points,
  then name. The rally-point heuristic must not classify imported data from missing values.
- `organizerPlayers/infrastructure/PrismaOrganizerPlayerRepository.ts`: reads deltas and
  per-match export rows. Imports need a separate contribution query and explicit provenance.
- `organizerPlayers/application/exportCareer.ts`: full exports derive tournament sections
  from match rows. Historical events must be added independently so they are not omitted or
  represented as fabricated matches.
- `organizerPlayers/infrastructure/mergeOrganizerPlayers.ts`: moves live deltas on player
  merge and rejects shared match IDs. Imported identities need equivalent safe handling.
- `organizerAccess/infrastructure/access.ts`, `http/mutationWork.ts` and `OrganizerActivity`
  already provide selected-owner authorization, account write locks and actor attribution.
  New import endpoints must explicitly join these safeguards; their current path allowlists
  do not cover a new `result-imports` route automatically.
- Organizer entry point: `apps/mobile/app/(app)/account-players.tsx` and associated career
  components/hooks. Public career board and PDF/CSV exports must receive the same provenance
  and completeness metadata as the signed-in view.

## Implemented data design

Add separate tables instead of inserting summary totals into the real-match delta table.

### HistoricalResultImport

- ID, owning organizer ID, stable event key, title, confirmed event date, tournament mode,
  scoring mode and optional variant. Original scoring settings remain source notes.
- Canonical content fingerprint on the logical import. Each immutable revision retains the
  uploaded filename, SHA-256 checksum, original CSV, normalized rows and confirmed metadata
  in a private JSON source snapshot. The original CSV preserves source dates, reported rates,
  notes and schema version. Public APIs never return this snapshot.
- Actual creator user ID, creation time, revision/version, inclusion status and correction
  reason. Keep prior committed revisions available for attribution and recovery.
- Unique organizer/event key for the active logical event. Never accept organizer ownership
  or actor identity from CSV fields.

### HistoricalPlayerResult

- Import/revision ID, mapped `OrganizerPlayer` ID, original source display name and source rank.
- MP, W, L, D; nullable games, sets and rally-point totals according to source availability.
- Optional source PTS retained per result; reported rates remain in the revision source CSV
  as evidence. Aggregation recalculates rates from counts.
- Explicit availability/provenance for optional statistics. Blank means unknown, not zero.
- Unique import/revision/player mapping. Reject two rows mapped to the same person in the
  same event instead of adding them together silently.

Unify reads through a contribution adapter with two explicit kinds: `LIVE_MATCH` and
`HISTORICAL_SUMMARY`. Live contributions retain their real match references. Historical
contributions carry an import reference and no match ID. Preserve the original live storage
and live credit-writing behavior.

## User flow

1. From Account Leaderboard, choose **Import historical results**. Show the selected owner
   prominently, including the Manager context when applicable. Offer a CSV template.
2. Upload one event CSV. The server parses bounded UTF-8 CSV including BOMs, quoted fields,
   commas and line breaks. The recovery files produced here use the proposed v1 template.
3. Confirm the event title, actual date, mode and scoring. Filename dates are suggestions
   requiring confirmation. Do not apply incomplete metadata to the career board.
4. Review each source player: suggest an exact normalized name match, select an existing
   career, or create a new identity. Fuzzy matches require a choice. Flag placeholders such
   as `Random` for explicit review. Do not overwrite an existing career's display name just
   because an import spells it differently.
5. Show validation errors/warnings, existing versus proposed player totals, event counts,
   possible duplicates, and the list of unavailable statistics. Nothing counts yet.
6. Confirm once. In one account-locked transaction, recheck membership and mappings, persist
   the committed revision, activate its contributions and record the actual actor in activity.
7. Return to the board with a success summary and an **Imported** badge. The import has a
   dedicated historical summary page, not a live scoring screen.

Both Owner and Manager can preview, confirm, correct and exclude/reinclude historical
contributions, matching their existing career-management rights. Corrections create an
audited revision; exclusion is reversible and removes only that import's contribution.
No permanent purge or audit deletion UI is needed for v1.

Use account-scoped query keys and immutable captured context for uploads and previews.
Switching accounts cancels unfinished work and discards the preview, consistent with the
existing organizer switch confirmation. Revocation between preview and commit must deny
the commit without signing the person out of their own account.

## Statistics and truthful display

- Combine known imported W/L/D and games with live totals. Derive MP from W+L+D, game
  difference from GW-GL, and percentages from aggregate numerators/denominators. Never average
  source percentages or interpret source PTS as Americano rally points.
- Count each committed historical event once per mapped player, independently of match IDs.
- For example, if all three Mims rows are confirmed as the same person, these sources recover
  17 matches, 12 wins, 5 losses, 44 games won and 25 games lost across three events, before any
  live results are added. They do not establish Mims's missing set totals or opponent history.
- Use the confirmed historical event date for existing UTC month/year/all-time ranges.
  Upload time is audit metadata and must not make August results appear as October play.
- Missing sets, tiebreaks, win methods, opponents, court assignments, individual match scores
  and timestamps remain unavailable. Infer set totals only if the user explicitly confirms a
  format that uniquely determines them; mark them derived and retain the confirmation.
- Add completeness metadata to career DTOs. For incomplete metrics, show N/A or a clearly
  labeled known subtotal. Never silently display an incomplete subtotal as a complete total.
- Ranking needs an explicit missing-data rule because the current comparator uses sets.
  Recommended rule: within a match-win tie group, use a tie-break metric only when it is
  complete for every player in that group; otherwise skip it for that group and use the next
  complete metric. Preserve current ordering for groups with complete data. Explain skipped
  tie-breaks in the UI and exports. Do not let absent sets automatically disadvantage imports.
- Retain source rank on the historical event page. It is evidence from that event and must
  not override the account's aggregate ranking.

Suggested wording:

> Includes 3 imported tournaments. Historical totals are included; individual match scores,
> opponents and some detailed statistics are unavailable for these results.

Player history shows **Imported summary** rows with available totals. Head-to-head,
partnership and match-by-match lists show only known matches, with a note that their coverage
excludes historical summaries. Do not claim a streak or head-to-head record includes unknown
historical games.

Public career shares use the same badges and coverage notices. Full exports add a separate
historical-results section; match exports explain that imported summaries are excluded.
Historical event exports include the source rank and availability labels. Never expose raw
uploads, manager email addresses or private activity through public share endpoints.

## Validation, duplicate prevention and correction

- One logical event per file, maximum 1 MB / 1,000 player rows. Parse before opening
  a database transaction. Reject unsupported schema versions and ambiguous column mappings.
- Require bounded nonnegative integers for counts, supported scoring/mode, a confirmed valid
  date, unique source rows and MP=W+L+D. Validate optional derived columns against counts,
  respecting displayed percentage rounding. Validate full-event win/loss and game balance;
  partial-player imports are outside the initial full-event workflow.
- Require applicable base metrics for each scoring format. Missing non-applicable fields are
  not errors; missing supported optional fields remain explicitly unknown.
- Protect the transaction with the existing owner-row lock. Recheck the persisted active
  Manager grant at commit, and reject stale preview/revision versions.
- Use an idempotency key for confirmation and a unique owner/event key. Repeated clicks,
  retries or concurrent confirmations return the same committed batch rather than doubling it.
- Compare a canonical fingerprint, not just file bytes: reordering rows, changing filename,
  BOM or line endings must not bypass duplicate detection. Flag overlap with existing live
  events and restored backups. A genuinely distinct event with identical totals needs an
  explicit new-event decision and recorded reason, never automatic acceptance.
- Updating a committed logical event replaces its active revision atomically. Exclusion
  removes its totals once; reinclusion adds them once. Never subtract guessed match rows.
- Player archive/rename/merge must include import references. Prevent merges that would
  collapse two distinct participant rows from the same historical event; require correction
  of the mapping first. Safe merges across different events preserve one event count each.
- Treat filenames, notes and names as untrusted text. Use safe CSV parsing and spreadsheet-
  formula-safe exports. Keep source snapshots/private hashes for audit; no OCR service or
  additional long-running worker is required for v1.

## Implemented endpoints

All routes below are under `/organizers/:organizerId/result-imports` and require resolved
Owner/Manager access. Existing `/me` semantics remain personal.

| Method/path | Behavior |
| --- | --- |
| POST /preview | Parse, validate, suggest mappings and return a short-lived owner/actor-bound preview. No career contribution. |
| POST / | Commit a server-revalidated preview with expected preview version and idempotency key. |
| GET / | List historical imports, inclusion state, totals and attribution. |
| GET /:id | Show the historical summary and revision/provenance details. |
| POST /:id/revisions/preview | Preview a correction against the current version. |
| POST /:id/revisions | Atomically activate a corrected revision. |
| PATCH /:id/inclusion | Reversibly exclude or reinclude using expectedVersion. |

Do not trust a client-supplied `validated: true`. Confirmation must use a persisted draft or
signed, expiring preview reference bound to actor, owner, content and mapping state, and must
revalidate mutable authorization/identity constraints inside the transaction.

## Delivery phases and verification

1. **Recovery and contract:** converted files, documented unknowns, template download, final
   date/mode/identity confirmation and an agreed missing-set ranking rule.
2. **Storage/read integration:** additive import tables and adapter; aggregation, period
   filters, events played, private/public career reads, exports and merge/archive behavior.
3. **API:** bounded parser, validation/preview, atomic idempotent commit, correction/inclusion,
   audit attribution and owner/manager authorization.
4. **Organizer UI:** upload, metadata confirmation, identity mapping, totals preview, errors,
   commit, historical summary, badges and reversible corrections. Keep mobile web usable.
5. **Public/export UI:** imported notices and coverage labels everywhere imported totals appear.
6. **External parity and Playwright verification:** keep new suites and recordings outside
   the repository, as requested in earlier work. Leave implementation uncommitted for review.

Required test cases:

- All 48 recovered rows round-trip exactly; no original PDF/image changes. UTF-8/BOM,
  quoting, blank versus zero, duplicate headers/names and malformed/oversized CSVs.
- Owner and Manager imports land under the selected owner. Outsider/guest denial, forged
  owner/player IDs, cross-account preview reuse and revocation between preview/commit.
- A player with live plus imported results has correct W/L/D, MP, games, event count and
  weighted rates; no fabricated sets, matches or opponents. Correct month/year boundaries.
- Source rank and PTS remain evidence; missing-stat tie groups follow the agreed rule.
- Same CSV twice, renamed/reordered variants, concurrent confirmation and retry after an
  uncertain response never double-count. Correction/exclusion/reinclusion are atomic.
- Rename/archive/safe merge retain contributions; duplicate same-event identity merges fail.
- Public career page, player detail, match lists and PDF/CSV exports display truthful coverage.
- Desktop/mobile browser flow: Manager selects owner, uploads these CSVs, confirms metadata
  and players, commits, sees totals and badges, excludes one import, and verifies totals revert.
- Existing live creation/scoring, career credit, sharing, exports and Owner/Manager workflows
  retain parity. Pilot on a disposable database before any production import.


## Review and rollout notes

- Before starting the new API in Coolify, run
  `npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma` against its database
  to apply `20261022150000_historical_results`. The API Dockerfile does not run migrations
  automatically. The migration adds three tables and foreign keys; it
  does not rewrite live match credits. Rebuild the organizer app and Vite viewer together
  with the shared package/API. No extra worker, Redis dependency or always-running service
  is introduced for imports.
- Preview tickets expire after 20 minutes, use a purpose-specific key derived from the
  existing JWT secret, and bind the content, actor, owner and correction version. Validation
  runs before writes; commit rechecks authorization, identities and duplicates under an
  organizer lock. Successful confirmations are idempotent.
- Leaderboard reads select contribution fields without loading private revision snapshots.
  Import details load current result rows and revision audit headers, leaving old result
  rows and original CSV snapshots out of normal reads.
- On the Account Leaderboard, choose **Import historical results**. Download a template or
  select one complete-event CSV, confirm metadata and review player identities, inspect
  cumulative changes, then confirm. Open an import to download its editable current CSV,
  submit a reasoned correction, or reversibly change inclusion. Lists show up to 200 imports.
- Missing sets skip the set tie-break across an entire tied group, avoiding inconsistent
  comparisons. Live-only rankings and response shapes retain their existing behavior.
- Games 2 and 3 still need their actual mode/variant confirmed by the organizer. The local
  walkthrough selects Americano/Team for demonstration; those choices have not been written
  into the recovered source CSVs or production. `Random` always requires explicit identity
  review.
- Web upload and download were exercised in desktop Chrome and Pixel 7 browser emulation.
  Native upload uses the SDK-matched `expo-document-picker`; native packages require a new
  app build. Physical iOS/Android file pickers were not exercised in this run.
- External suites, reports, recordings and reproducibility instructions are in
  `../casual-padel-tourneys-e2e/historical-imports/`. No new test files are in this repository.
  Production data has not been imported or changed.

Local verification: 861 existing checks passed (including four explicitly enabled atomic-save
checks); 37 new external parser/aggregation/migration/API checks passed; 22 desktop/mobile
Playwright checks passed plus the separate paced recording case. Workspace typecheck, lint,
API build, organizer web export and Vite viewer build passed. The recording is 4 minutes
46 seconds and includes real Manager magic-link sign-in through the local captured inbox.
