# Shared organizer access — implementation plan

Status: implemented locally; deployment and real-mail pilot pending. Date: 2026-10-22.

Product rules and API/data contracts: [specification](shared-organizer-access-spec.md).

## Delivery strategy

Ship account-level Owner/Manager delegation as one complete feature behind a flag. Build the
authorization foundation before invitation UI. Keep existing owners, tournament modes, career
credit logic and public Vite viewer intact. Do not start with a UI-only shortcut that replaces
the signed-in user ID with the owner's ID.

The older local epic-23 editor-link draft solves event-only access. Reconcile its backlog
entry to point to this account-delegation work; retain anonymous event links as a separate
future proposal. Its Next.js web editor is not a dependency.

## Phase 1 — contracts, migration and authorization foundation

Deliver:

- Shared schemas/DTOs for accessible organizer accounts, OWNER/MANAGER capabilities, invitation
  lifecycle, activity records and stable authorization errors.
- Add membership, invitation and activity models/migrations/indexes described in the spec.
- `modules/organizerAccess/{http,application,domain,infrastructure}` with repository/notifier
  ports and a single capability policy. Keep Prisma/Fastify out of pure policy code.
- Resolvers for account context and tournament-derived ownership; verify real persisted
  identities for delegation, independently of JWT grace-period claims.
- Per-request membership lookup and typed actor-versus-owner access context. Unit-test the
  operation matrix, self/non-transitive access and feature-flag behavior first.
- Make activity writes available inside existing persistence transactions, with explicit
  actor context and bounded metadata. Do not publish audit data on public score channels.

Key files/seams:

- `apps/api/prisma/schema.prisma` and a new migration.
- `packages/shared/src/schemas/` plus shared types/exports.
- `apps/api/src/modules/auth/http/preHandlers.ts`, `lib/authTypes.ts`, `lib/organizerAccess.ts`.
- `apps/api/src/app.ts` CORS and feature registration.
- New `apps/api/src/modules/organizerAccess/`.

Exit check: old owner/guest routes still pass; a manager resolver can return the correct owner
without modifying the actor; nonexistent, revoked, unverified and unrelated users are denied.

## Phase 2 — cover every private route and persistence boundary

Create a checked route-to-operation inventory before editing adapters. Audit direct owner
comparisons as well as calls to `requireOrganizerAccess`, `assertOrganizer` and owner loaders.
Retain resource scoping in repositories, using the authorized owner ID; enforce capabilities
at the application boundary as well so internal calls cannot skip them.

| Surface | Required coverage |
| --- | --- |
| Tournament discovery/create | List, normal create, KOH create branch, suggestions; optional context defaults to self. |
| Tournament private reads | Generic detail, KOH detail/rankings and authenticated exports. |
| Points/Regular scoring | Submit, draft/complete behavior, corrected results, ownership of match IDs. |
| Tournament live edits | Rename event/player, adjust courts, substitutions, pending-player add/integration. |
| Lifecycle | Next round, end night, close/void, delete and strip-career option; delete remains owner only. |
| KOH operations | Assignment, randomize/reorder queue, scores, swaps, promotion picks, rename/replace partner, end/close/delete. |
| Career contribution | Include/exclude/backfill/remove deltas; always use stored owner identity. |
| Career reads/management | List/detail/leaderboard, filters, merge, rename, archive/unarchive and bulk forms. |
| Account exports | Career leaderboard and match-history PDF/CSV; owner data and owner display name. |
| Career public-share management | Read/enable/rotate/revoke; preserve public read endpoints and existing tokens. |
| Realtime | Authenticated subscription branch accepts live manager membership; public token remains read-only. |

Key files:

- `modules/tournament/http/{create,query,edit,score,lifecycle,close,career,export}Routes.ts`.
- `modules/tournament/application/loadTournament.ts` and mutation use-cases/ports.
- `modules/tournament/infrastructure/{PrismaTournamentRepository,listPlayerSuggestions}.ts`.
- `modules/koh/http/*`, `application/ports.ts`, `infrastructure/PrismaKohRepository.ts`,
  `infrastructure/ops/*` (including direct owner loaders).
- `modules/organizerPlayers/http/*`, application ports, career credit and export infrastructure.
- `apps/api/src/realtime/socketHub.ts`.

Add explicit `/organizers/:organizerId/players...` and `/career-share...` route families that
reuse existing handlers/use-cases. Keep `/me/*` self-only, even when a context header is present.
Add request-context matching for resource mutations and `X-Organizer-Id` to CORS.

Exit check: matrix integration tests cover owner/manager/outsider/revoked/guest for every route
family, and manager-created tournaments and credited players remain under the original owner.

## Phase 3 — concurrent writes and activity integrity (release blocker)

This can proceed alongside route integration, but must finish before managers are enabled.

- Carry `expectedVersion` into KOH persistence and atomically claim/update the tournament
  version within the same transaction as all affected writes. Reject the losing write with
  409 before side effects. Cover draft/complete scoring, queue changes, swaps, promotions,
  replacements and closing; inspect operations that currently lack a version contract.
- Review `organizerPlayers/infrastructure/setCareerContribution.ts`: it increments version
  and changes ledger rows but currently does not accept `expectedVersion`. Define compatible
  version checking for new shared-account clients and prevent concurrent ledger/score changes
  from producing inconsistent credit. Keep serialized legacy owner-only behavior when sharing
  is inactive; require a version-capable client for shared event mutations, including owner
  requests, with the spec's explicit `CLIENT_UPDATE_REQUIRED` response.
- Preserve the Americano transaction's existing compare-and-swap behavior. Do not replace it
  with a read-before-write check.
- Commit each successful business change and its actor audit entry together. Preserve career
  attribution and existing credit semantics; verify no duplicate credits on retries/conflicts.
- Add friendly client conflict handling that refreshes state and retains reviewable drafts;
  never blindly resubmit a failed score with a newer version.

Key files: `PrismaTournamentRepository.save`, KOH `scoreKohOps.ts`, `scoreKohPersist.ts`,
`scoreKohDraft.ts`, `kohVersion.ts`, related KOH ops, career contribution infrastructure,
organizer/KOH score-save hooks.

Exit check: synchronized competing requests produce one success and one 409, exactly one
correct result/rotation/credit set and one success activity record. Test same-court and
cross-court KOH writes, close-versus-score and career-toggle-versus-score.

## Phase 4 — invitations, acceptance and revocation

- Owner-only create/list/resend/revoke APIs; manager leave/removal and activity APIs.
- Hashed, expiring invitation secrets bound to normalized email; atomic consume/grant and
  explicit replay/reactivation rules. Enforce owner-only administration using actual actor ID.
- `OrganizerInvitationNotifier` using existing `lib/mail` adapters; separate invitation
  templates from authentication magic links. Escape interpolated display names in HTML.
- Observable mail delivery failures and rotating resend; bounded invite/resend/preview/accept
  rate limits. No email enumeration and no secret-bearing logs.
- Deep-link URL builder using configured organizer web/native destinations, fragment token
  parsing, allowlisted return routes and expiring pending-invite storage through auth.
- Recheck membership on every private operation; preserve sign-in when a manager is removed.
  Test acceptance racing revocation and replay after membership removal.

Key files: new organizer-access module, `apps/api/src/lib/mail/*`, shared schemas, Expo
`src/api/authDeepLink.ts`/router handling and organizer-access API wrappers.

Exit check: new/existing recipient flows work; forwarded links cannot grant to the wrong
verified account; delivery failure is recoverable; next private request after removal fails
without waiting for JWT expiry. Public spectator access remains a separate capability.

## Phase 5 — organizer account selection and client state isolation

- Add `OrganizerAccountProvider` alongside existing auth/session providers. It owns selected
  organizer identity/capabilities; it never replaces `currentUser` or mints an owner's JWT.
- Add account selector, “Managing …” context label, invitation landing/acceptance UI, manager
  administration and activity views. Reuse the organizer's current screen/sheet components.
- Default to personal account and revalidate restored selections on sign-in/focus/reconnect.
- Update API helpers to capture an immutable actor/account context per request, all methods
  and download paths included. Career account endpoints use explicit organizer paths.
- Scope React Query keys, suggestions, lists, career filters and event details by actor and
  organizer. Cancel obsolete requests and prevent late-response UI contamination.
- Scope points, Regular/KOH and create/roster drafts by actor/owner/event. Unmount sheets/live
  state and close subscriptions on switch; require discard before leaving an edited form.
- Suppress forbidden actions in the UI using server capabilities, with the server still
  enforcing every operation. A removed account returns to self without global sign-out.
- Surface conflict/revocation states explicitly; exports must never use the newly selected
  account when a download started under a previous one.

Key files:

- `apps/mobile/src/providers/{AuthSessionProvider,OrganizerSessionProvider,QueryProvider}.tsx`
  plus new organizer-account provider.
- `src/api/client.ts`, `accountPlayers.ts`, `careerShare.ts`, `exports.ts`, export path helpers.
- `src/utilities/organizer/tournamentQueryKeys.ts`, career query keys and query consumers.
- `src/hooks/organizer/useTournamentList.ts`, create and live hooks, KOH live/score hooks.
- `src/hooks/organizer/score/useScoreDraftPersistence.ts` and other draft stores.
- `app/(app)/profile/*`, tournament/create/player screens; new invite acceptance route accessible
  through the auth flow. Public Vite viewer receives no editor UI.

Exit check: browser and native organizer flows support owner and manager without cross-account
cache/draft bleed. Personal profile/auth flows and old public share links retain their meaning.

## Phase 6 — verification and rollout

### Automated acceptance matrix

| Test group | Required assertions |
| --- | --- |
| Policy and identity | Owner/manager capability map; no transitive grants, self-invite, owner impersonation or guest/grace-period acceptance. JWT claims cannot resurrect a revoked grant. |
| Invitation lifecycle | Normalize email; new/existing user; wrong user; expiry; revoke; delivery failure/resend; concurrent issue/accept; idempotent active replay; revoked replay never reactivates. |
| Cross-account isolation | Owner A, owner B and manager C; guessed IDs/header changes/court IDs/player merge IDs cannot cross scope. A manager of A can never use A's rights on B. |
| Private route inventory | Test every family above, including alternate KOH branches, legacy direct checks, bulk career operations and download helpers. No absent-header merged list. |
| Ownership and career | Manager creates/scores every supported mode; owner receives players and deltas; manager's personal board stays unchanged; shared exports name the owner. Merge/archive and contribution toggles retain existing behavior. |
| Concurrent editing | True simultaneous writes, same/different courts, close/score and toggle/score; rollback all losing side effects, no duplicated deltas, correct 409 and reviewable client draft. |
| Revocation | Owner removal and manager leave; next request denied; no global logout; no token replay; already authorized in-flight semantics match the spec; old spectator link remains read-only. |
| Client state | Switching mid-load/edit/download, offline drafts, sign-out/in as another actor, revoked remembered account, focus/reconnect and late responses. |
| Web/native UI | Invite → sign-in/register/verify → accept → select owner → create/score/manage/export; owner sees updates and activity; remove → manager loses write access. |
| Regression/deployment | Existing owner/guest auth, account attach/reset, all modes, career history, Vite share URLs/exports/WebSockets; additive migration against production-like sample data; feature off rollback. |

Follow the established external browser-test layout under the sibling
`../casual-padel-tourneys-e2e/` project for cross-account Playwright scenarios and visual parity;
use a disposable Docker database and real API sessions/sockets. Keep these new parity/browser
suites outside this application repository, consistent with the previous migration's testing
preference. Focused policy/API concurrency tests should follow the project's normal test
conventions. The new parity/browser suites remain external.

### Release sequence and gates

1. Back up the database and deploy additive tables/indexes. Test migration and existing owner
   flows on staging with the feature disabled. Existing IDs and share tokens must not change.
2. Deploy backward-compatible API, complete route inventory, transaction safeguards and audit
   coverage. Only then deploy the organizer web export and native changes.
3. Run the full multi-account/negative/concurrency matrix. Pilot with one real owner and one
   manager across a complete event, including career exports and access removal.
4. Confirm invite mail delivery, activity attribution, authorization errors, conflict counts
   and API resource usage. Do not record invitation/session secrets in monitoring.
5. Enable gradually. If disabled, delegated access must fail closed while owner and public
   viewer workflows continue; retain additive data for reenabling. Keep owner revocation
   available through the authenticated access-management route even with rollout off.

### Completion evidence

- Route-to-operation checklist, passing integration/concurrency results and external browser
  report, with owner and manager flows demonstrated on desktop/mobile widths.
- Proof that a manager's new event and all its career credits retain the owner's ID.
- Proof that revoked members cannot mutate through an overlooked route, stale session,
  invitation replay, alternate KOH endpoint or direct export/helper path.
- Confirmed production configuration for organizer invitation URLs and existing mail provider.
- Reviewed retention/cleanup policy and clearly documented permission defaults.

## Proposed work packages

| Package | Scope | Dependency |
| --- | --- | --- |
| A | Shared contracts, additive schema, context resolver and policy tests | None |
| B | Tournament/KOH/account route coverage and scoped career APIs | A |
| C | Atomic concurrency, compatible version contracts and transaction audit | A; coordinated with B |
| D | Invitation/revocation services, mail, replay/race tests | A |
| E | Organizer account provider, API/export context and cache/draft isolation | A+B contracts |
| F | Invite/member/activity UI, account selector and conflict/revocation UX | D+E |
| G | Full external browser suite, staging pilot, documentation and rollout | B+C+D+F |

These are implementation boundaries, not instructions to create commits or parallel agents.
Leave implementation changes uncommitted unless the owner approves a specific commit.

## Product decisions proposed for review

- Managers receive account-wide historical and future access, not just selected events.
- Managers can merge/archive players and change career credit/share settings; permanent event
  deletion and access administration remain owner-only.
- Both parties must use verified non-guest accounts; seven-day email invitations are the default.
- Owner/Manager ship first; scorekeepers, event-only links, independent club accounts, ownership
  transfer, arbitrary rank overrides and full undo are deferred.

The spec uses these defaults so work can be estimated and implemented without an ambiguous
permission model. The local implementation follows these defaults. Deployment is controlled by the feature flag below.


## Implementation and Coolify rollout notes

The local implementation includes the additive Prisma migration, persisted authorization,
invitation lifecycle, Owner/Manager screens, organizer switching, actor attribution, and
transactional tournament/career/audit writes. Public viewer routes and share tokens retain
their existing contracts. No production data was migrated and no changes were committed.

1. Back up the production database, then apply migrations from the API container:
   `npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma`.
2. Deploy the API and rebuilt organizer app together. Leave
   `SHARED_ORGANIZER_ACCESS_ENABLED=false` initially.
3. Set the API's `ORGANIZER_WEB_BASE_URL` to the **organizer app's HTTPS origin**, not the
   read-only Vite viewer origin. Invitations open `/invite/accept#token=...`; the organizer
   static host must serve its SPA for that route. Keep the existing auth callback origins.
4. Configure the existing production mail adapter and sender. The console adapter does not
   deliver invitation mail; a local inbox adapter was used only by the external tests.
5. Set `SHARED_ORGANIZER_ACCESS_ENABLED=true` on the API and restart/redeploy it. No client
   flag is required: discovery returns the server's current sharing availability. Pilot an
   invitation with two real verified accounts before making it broadly available.
6. In Coolify, schedule `npm run maintenance:prune-activity --workspace @padel/api` daily in
   the API container. It removes at most 10,000 audit rows older than one year per run.
   Activity reads also perform bounded account-local cleanup. No production schedule has
   been created by this task.

To roll back sharing, set the API flag to false and restart it. Managers lose delegated
access; owners and read-only viewers continue working. Owner revocation remains available.
Keep the additive tables and deployed migration; dropping them is unnecessary.

### Request authorization and concurrency

- Private tournament list/create/suggestions use the explicitly selected owner. Event reads,
  exports, edit/lifecycle and KOH court/queue/score operations derive the owner from persisted
  tournament data and reject a conflicting selected header.
- `/me/players/*` and `/me/career-share*` remain personal. Delegation uses the equivalent
  `/organizers/:organizerId/players/*` and `/organizers/:organizerId/career-share*` routes.
- Authentication, profile, attachment and password routes always use the actual signed-in
  person. Owner-only deletion and access administration are checked on the server.
- Writes lock the owner row, then the event row, and join repository transactions using
  AsyncLocalStorage. Tournament state, career deltas and activity commit together; realtime
  publication follows commit. Writes for different owners remain independent.
- While sharing is enabled, an event with active managers requires `expectedVersion` for
  non-delete event writes. Existing version-required contracts remain required even with
  sharing off; previously versionless owner operations retain their original behavior when
  sharing is off or the account has no active managers. Clients do not automatically retry
  conflicting writes.
- A request already authorized before revocation may finish; the next authorization denies
  access. Existing public-token socket data remains public and read-only. Switching clears
  private query state and closes the previous event UI; draft keys include actor and owner.

### Local verification artifacts

New parity, policy, integration, race and Playwright tests, baseline builds, screenshots,
reports, local test services and the recorded walkthrough live outside this repository in:
`../casual-padel-tourneys-e2e/shared-organizer/`. See its `README.md` for reproduction and
results. Existing repository tests were run without adding new test files here.

The browser coverage uses Chromium at desktop and Pixel 7 viewport sizes. Native iOS and
Android packages were typechecked through the shared Expo code, but were not run on physical
devices. Real production SMTP delivery, Coolify configuration and a two-user production pilot
remain deployment checks; the recording uses real application auth with a disposable local
email inbox and PostgreSQL database.
