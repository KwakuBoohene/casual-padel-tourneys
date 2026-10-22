# Shared organizer access — product and technical specification

Status: implemented locally, awaiting review and deployment. Date: 2026-10-22.

Companion: [implementation plan](shared-organizer-access-plan.md).

## 1. Outcome and recommendation

An organizer can invite another person to run their tournaments and manage their player
leaderboard while they are absent. Each person signs in with their own account. A manager
selects the owner's organizer account and works on its tournaments, players and career board.
The owner can remove that access without changing passwords or losing tournament history.

Implement **account-level delegation** over the existing owner model. Keep `organizerId`
pointing to the owning `User`; add explicit manager grants, invitations and an activity log.
Do not impersonate the owner, share session tokens, or move data into the manager's account.

Example: Ama invites Kojo. Kojo signs in as Kojo, switches from “My organizer account” to
“Ama's organizer account”, creates Friday Padel, scores matches and maintains Ama's player
board. Ama owns that tournament and receives its career credits. Kojo remains the recorded
person who performed those actions. His own tournaments and player board stay separate.

### Alternatives considered

| Approach | Covers the request? | Decision |
| --- | --- | --- |
| Share the owner's password/login token | Operationally, but no individual revocation or attribution | Reject |
| Tournament-specific editor link | Runs one existing event; cannot create events or manage an account career board | Separate future feature |
| Delegate access to an existing organizer account | Covers existing and new tournaments plus the shared career board | Recommended v1 |
| Introduce clubs/organizations/workspaces and migrate ownership | Covers the request and independent club ownership, but changes every data relationship | Defer until club ownership/transfer is a requirement |

Existing draft `plans/implementation/fullstack/epic-23-co-organizer-share/` proposes anonymous,
event-scoped editor tokens and a Next.js editor. It explicitly excludes multi-user accounts.
It does not implement this request and its Next.js assumptions predate the Vite migration.
This proposal takes precedence for this account-delegation feature; do not silently combine
the two credential models. Reconcile the backlog before implementation.

## 2. Findings in the current code

| Area | Current behavior and implementation consequence |
| --- | --- |
| Data ownership | `apps/api/prisma/schema.prisma`: tournaments, organizer players and career deltas use an organizer's user ID. There are no membership or invitation models. Preserve those IDs. |
| Authentication | `modules/auth/http/preHandlers.ts`: `requireOrganizerAccess` authenticates and applies the email verification gate; it does not establish delegated resource access. Guests bypass the current verification gate. |
| Credentials | `modules/auth/infrastructure/JwtAuthTokens.ts`: JWTs identify one user and last seven days. Do not embed authoritative membership permissions in these tokens. |
| Tournament list/create | `modules/tournament/http/queryRoutes.ts` and `createRoutes.ts` use `request.user.id`. A manager would currently see/create their own events. The KOH create branch needs the same owner resolution. |
| Private operations | `lib/organizerAccess.ts`, `tournament/application/loadTournament.ts`, direct HTTP ownership checks, and `koh/infrastructure/ops/loadKohOps.ts` separately enforce owner equality. Updating one middleware is insufficient. |
| Career board | `organizerPlayers/http/*` binds `/me/players*` and `/me/career-share*` to the caller. Management, exports, public-share settings and player suggestions all need account scope. |
| Career attribution | `creditAmericanoMatch.ts`, `careerCredits.ts`, and KOH persistence derive credit from tournament ownership. A manager's user ID must never replace the owner's ID. |
| Contribution settings | `setCareerContribution.ts` currently removes deltas when disabled and backfills completed matches when enabled. This differs from older ship-forward wording in `docs/career-leaderboard.md`. Preserve actual behavior and reconcile the documentation separately. |
| Realtime | `apps/api/src/realtime/socketHub.ts` allows a public token or the owner's bearer identity. Organizer browser/native hooks generally use the public token. This read subscription does not authorize HTTP mutations. |
| Concurrent edits | Americano `PrismaTournamentRepository.save` atomically matches `version` in its transaction. KOH `scoreKohOps.ts` checks the loaded version before `scoreKohPersist.ts` writes and increments it without a version predicate. This is a race risk to fix and test, not a proven production incident. |
| Client state | `tournamentQueryKeys.ts` has account-independent keys; score drafts use `scoreDraft:<tournamentId>`. Shared accounts require scoped state and cancellation when switching. |
| Exports | `apps/mobile/src/api/exports.ts` builds authorization headers itself, outside normal API helpers. It must capture the same selected organizer context. |
| Existing infrastructure | Modular API boundaries, PostgreSQL/Prisma, shared Zod contracts, provider-independent `lib/mail` and existing auth/deep-link flows can be reused. No additional service is needed. |

Paths in this table are under `apps/api/src/` unless otherwise stated.

## 3. Scope and permissions

V1 has **Owner** and **Manager** only. Owner is the owning user, not an editable membership
row. A manager grant covers **all existing and future tournaments, player careers and account
leaderboard data** belonging to that owner. The invitation must state that scope clearly.

| Action | Owner | Manager |
| --- | --- | --- |
| List/read the organizer's tournaments and player board | Yes | Yes |
| Create Americano, Mexicano and King of the Court tournaments | Yes | Yes |
| Edit settings/rosters/courts, substitutions, queues, promotions | Yes | Yes |
| Enter/correct points, Regular sets and KOH scores | Yes | Yes |
| Advance rounds, end/close an event, void unfinished matches | Yes | Yes |
| Include/exclude an event from career credit, including existing backfill/removal behavior | Yes | Yes |
| Rename, merge, archive and restore organizer players | Yes | Yes |
| Export tournament results and career data | Yes | Yes |
| Enable, rotate and disable the public career-board share link | Yes | Yes |
| Read organizer activity history | Yes | Yes |
| Permanently delete a tournament, with either career-retention option | Yes | No |
| Invite/remove managers or revoke invitations | Yes | No |
| Leave an organizer account | Not applicable | Yes |
| Change the owner's email/password/Google login/profile or access their authentication data | Yes, through personal account flows | No |
| Transfer ownership or delete the owner's account | Not added in v1 | No |

Manager access is broad and includes exports, player merges and career-credit changes. These
are deliberate proposed defaults, not claims about existing permissions. Show consequences
in the existing confirmation flows and record changes in activity history. A narrower
scorekeeper role and event-only assignments are future work, not hidden v1 requirements.

“Manage leaderboard” means manage the underlying players, match results, credit inclusion
and sharing. It does not introduce arbitrary point/rank overrides or change ranking rules.

Guests retain their current personal tournament behavior. Invitations, grants and shared
account operations require both people to have persisted, non-guest, verified accounts.
The current verification grace period is insufficient for granting or accepting shared access.
Do not create a placeholder owner profile from a manager's identity.

## 4. User experience

### Owner: invite and revoke

1. Profile → **Organizer access** shows the current owner, active managers and pending invites.
2. **Invite manager** accepts an email. Explain the access above, including access to historical
   and future events, career management, downloads, and the owner's reserved actions.
3. Confirm once, then send an email naming the inviter and organizer account. Show Pending,
   expiration, delivery state, Resend and Revoke. Sending an invitation grants no access.
4. Active managers show their name, email, accepted date and Remove action. Removal explains
   that their personal account and the organizer's tournaments/results will remain intact.
5. Provide a simple activity list: actor, action, target and time; paginate it.

### Recipient: accept

1. Open the invitation in the existing **Expo organizer app/web export**, not the public Vite
   spectator viewer. Use a configured organizer web URL with a native deep-link counterpart.
2. The landing screen previews the organizer's name, access scope, expiry and masked intended
   email. It does not activate access and performs no state-changing GET request.
3. Sign in/create or attach an account using existing auth flows, retaining the pending invite
   across that flow. If signed into a different email, offer **Switch account**.
4. Require a verified matching email from the database. The invitation alone is not a login
   credential and must not change the current identity or auto-verify an account.
5. Explicitly press **Accept invitation**. Show success and offer **Open organizer account**.
6. Invalid/expired/revoked links show one clear state and an instruction to ask for a new invite.
   Do not reveal whether an arbitrary email already has an account.

### Working in an organizer account

- Add an organizer account selector to the tournament list and career/player screens; show
  **Managing: Ama's organizer account · Manager** prominently on create and live edit screens.
- Keep personal identity/profile and sign-out actions clearly tied to the signed-in person.
- Personal account is the default. A remembered selection is a preference, revalidated after
  sign-in. The manager may belong to several owners; there is no combined leaderboard.
- Account selection must not change a live form underneath the user. Block switching during
  submission; confirm discard of unsaved edits, cancel obsolete loads and close old sockets.
- Capture actor/organizer IDs when starting a request or export. A late response from the old
  context cannot populate the new context or cause an old draft to be submitted there.
- On access loss, clear that account's cached private data/drafts, return to the personal
  account and show “Your access to this organizer account has been removed.” Stay signed in.
- Refresh accessible accounts on sign-in, app focus/network restoration, context selection
  and authorization failure. V1 does not require a background presence/revocation service.

The public Vite viewer remains static and read-only. Existing tournament and public career
URLs, rankings, exports and live score subscriptions keep their current behavior.

## 5. Proposed data model

Names are provisional contracts; use Prisma relations for all user references.

### OrganizerMembership

- `id`, `organizerId` (owner User), `memberUserId` (manager User), `role = MANAGER`.
- `createdAt`, `acceptedAt`, `revokedAt` nullable, `revokedByUserId` nullable.
- Unique `(organizerId, memberUserId)`; indexes on `(memberUserId, revokedAt)` and
  `(organizerId, revokedAt)`.
- Owner is implicit. Reject self-membership. A grant does not delegate another grant: if
  Kojo manages Ama, Kojo's managers gain no rights over Ama.
- Keep revoked rows for history. Reactivation requires a fresh accepted invitation.

### OrganizerInvitation

- `id`, `organizerId`, `invitedEmailNormalized`, `role = MANAGER`, `invitedByUserId`.
- Unique `tokenHash`; `createdAt`, `expiresAt`, `acceptedAt`, `acceptedByUserId`, `revokedAt`.
- Delivery state `PENDING | SENT | FAILED`, `lastSentAt`, `sendAttempts`; no raw email error body.
- Index `(organizerId, invitedEmailNormalized)`; permit at most one outstanding invitation per
  organizer/email using a transaction plus a PostgreSQL partial unique index on unaccepted,
  unrevoked rows. Expired rows must be revoked/superseded when issuing a replacement, because
  a time-dependent `now()` predicate is not suitable for that index.
- Use a separate credential from `MagicLinkToken`; accepting it never yields a JWT.

Generate a cryptographically random 32-byte token, store its SHA-256 hash, and default expiry
to seven days. Owner resend rotates the token and expiry; the old link stops working. Use
existing email normalization (trim + lowercase), without provider-specific dot/plus rewriting.

### OrganizerActivity

- `id`, `organizerId`, `actorUserId`, `action`, `targetType`, `targetId`, `occurredAt`, `requestId`.
- Bounded action-specific metadata: score before/after, affected player IDs, included/excluded
  career flag, invitation/membership IDs as applicable. Exclude credentials, raw tokens and
  full request bodies. Keep entries useful after a tournament is deleted.
- Index `(organizerId, occurredAt, id)` and optionally target lookup after measuring demand.
- Append-only through application APIs. Store successful business mutation and audit entry in
  the same transaction; publish realtime only after commit. Domain logic stays free of Prisma.
- Log owner and manager actions consistently. The activity feed is an operational record,
  not a promise of full historical undo. Proposed retention: 12 months, with bounded scheduled
  database cleanup; establish the policy before production rollout.

Keep existing `Tournament.organizerId`, `OrganizerPlayer.organizerId`, stat delta keys and
`User.careerShareToken` unchanged. No data copy, leaderboard regrouping, public-token rotation
or ownership backfill is required. No new Redis namespace or continuously running worker.

## 6. Authorization and request context

Introduce an `organizerAccess` module using the existing http/application/domain/infrastructure
pattern. Its policy resolves this server-owned context:

```ts
type OrganizerAccessContext = {
  actorUserId: string;       // authenticated JWT subject, checked against persisted user
  organizerId: string;       // owner whose data is being accessed
  role: "OWNER" | "MANAGER";
  membershipId?: string;
};
```

Use explicit operations such as `tournament.create`, `tournament.edit`, `tournament.score`,
`tournament.delete`, `career.manage`, `career.share`, `members.manage` and `activity.read`.
A role-to-operation map is authoritative on the server; returned client capabilities are UI
hints. Avoid scattering additional `owner || manager` checks across routes.

- Never overwrite `request.user` with the owner's identity or trust `organizerId` in a body.
- For list/create and account-wide suggestions, an optional `X-Organizer-Id` selects context;
  omission defaults to the authenticated user's personal account for old clients.
- For a tournament operation, first resolve its stored owner by tournament ID, authorize the
  actor for that owner/operation, and require any supplied context header to match. Never
  authorize by submitted match/player/court ID alone; verify those belong to this tournament.
- Reuse repositories' organizer scoping with the **resolved owner ID**, not the actor ID. Pass
  access/actor context into application operations for capability enforcement and attribution.
  An internal call must not be able to bypass permission merely by supplying an owner's ID.
- Private queries scope every resource to the resolved organizer. Check membership against
  the database on every private request; do not cache grants in the seven-day JWT.
- Invitation/member administration checks `actorUserId === organizerId` and verified identity,
  independently of the currently selected account. Managers cannot reshare access or self-upgrade.
- Maintain 404 for unknown/inaccessible resources, 401 for invalid/missing authentication,
  and 403 for a known authorized account's forbidden operation. Use a stable
  `ORGANIZER_ACCESS_REVOKED` 403 for a revoked former membership, without treating it as session
  expiry; return `ORGANIZER_CONTEXT_MISMATCH` 409 for inconsistent selected context.
- Reject unverified shared-account actors with `EMAIL_VERIFY_REQUIRED` and guests with a
  dedicated account-required code. Existing personal guest access remains as it is.

Revocation contract: after the revoke transaction commits, every **new authorization check**
rejects the member without waiting for JWT expiry. A request already authorized before that
commit may finish; it remains attributed in the activity log. Do not promise cancellation of
an already committed operation or removal of data someone previously exported.

A previously known public spectator token remains a read capability after manager revocation.
Removing a manager does not revoke spectator links. Keep public sockets read-only. Extend the
socket's authenticated-owner branch to use the same live membership lookup for managers, but
browser clients can keep their existing public-token subscription; never put JWTs in URLs.
Do not send private activity/member information in existing tournament broadcasts.

## 7. API contract proposal

All new private endpoints require the actual actor's bearer session. Explicit organizer paths
must reject a contradictory context header. Invitation previews are limited token reads.

| Endpoint | Behavior / access |
| --- | --- |
| `GET /organizers` | Personal organizer plus active delegated accounts, display name, role and capabilities; no tokens. Guests get their personal account only. |
| `GET /organizers/:organizerId/members` | Owner manages members/invites; manager sees only owner/self identity and their own grant, not other people's emails or pending invites. |
| `POST /organizers/:organizerId/invitations` | Owner only; `{ email, role: "MANAGER" }`; creates pending invitation and sends email. Return invitation/delivery state, not account-existence information or a raw token. |
| `POST /organizers/:organizerId/invitations/:id/resend` | Owner only; rotates token, resets expiry and retries delivery. |
| `DELETE /organizers/:organizerId/invitations/:id` | Owner only; revoke pending invite idempotently. |
| `POST /organizer-invitations/preview` | `{ token }`; limited organizer name, masked intended email, role and expiry; no membership changes. |
| `POST /organizer-invitations/accept` | `{ token }`; verified matching actor; atomic consume and grant/reactivation. |
| `DELETE /organizers/:organizerId/members/:memberUserId` | Owner removes manager, or that manager leaves; owner cannot remove implicit owner. |
| `GET /organizers/:organizerId/activity?cursor=...&limit=...` | Owner/manager, account-scoped keyset pagination. Default 25, maximum 100. |
| `GET /tournaments`, `POST /tournaments`, `GET /players/suggestions` | Existing routes gain validated optional `X-Organizer-Id`; preserve default-self behavior. |
| Existing private tournament and KOH endpoints | Resolve owner from resource, enforce operation and optional context match. Includes reads, exports, lifecycle, roster and career-contribution routes. |
| `/organizers/:organizerId/players...` | Account-scoped equivalents of all existing `/me/players...` reads, exports and management actions. |
| `/organizers/:organizerId/career-share...` | Account-scoped equivalents of existing `/me/career-share...` read/enable/rotate/revoke actions. |

Existing `/me/*` routes continue to mean the signed-in person's own data; they must not
silently start reading another account based on a global header. Extract shared route
handlers/use-cases rather than copying career logic. Updated shared-account clients use the
explicit organizer routes. `/auth/me` and all authentication/attach/reset flows remain personal.

Add `X-Organizer-Id` to the API CORS allowed headers and all relevant API/export client
helpers. Capture request context immutably instead of reading a mutable selection mid-flight.
Exports use the owner's display name and data, not `request.user.name`.

### Invitation edge cases

- Normalize and bind to email; require matching persisted verified user at acceptance.
- Self-invite and already-active manager return a clear conflict without adding another row.
- Concurrent issue/resend/accept/revoke operations are transactionally serialized on the
  invitation/grant records; two accept attempts cannot create duplicate memberships.
- An accepted invite replay by the same actor may return the current active membership
  idempotently. After that membership is revoked, replay must fail and never reactivate it.
- A different actor, expired link, or revoked invite gets no access. Accepted/revoked rows
  cannot be resent; issue a new invitation when reinviting a removed member.
- Email failure leaves a visible failed delivery state and no access. Explicit resend rotates
  the secret; do not store the raw token for retries or report the email as sent on failure.
- Start with account-based invite/resend throttles (proposed 20/hour per owner) plus existing
  request/IP limits. Apply separate token-preview/accept abuse limits and test collisions.
- Use an invite URL fragment for the raw token where supported; parse it explicitly for Expo
  web/native. Remove it from browser history immediately and retain pending state only in
  memory/session storage or expiring native secure storage through sign-in. Apply no-referrer
  policy to the landing page. Redact tokens from deep-link logs, errors, analytics and mail logs.
- Auth callbacks may return only to an allowlisted internal invite route, never an arbitrary
  supplied redirect. Opening an email link or previewing it must never accept automatically.

## 8. Concurrent editing and client consistency

Keep tournament-level `expectedVersion` semantics for v1, even on different courts. A stale
operation returns 409 with the latest version; the client refreshes authoritative data and
asks the person to review their retained draft. Never silently replay a score against a new
version. Display “Someone else updated this tournament. Review the latest score and try again.”

Some existing management endpoints do not carry a client version. New shared-editor clients
must send one for state-changing event operations. Preserve legacy versionless owner behavior
for accounts without active managers using serialized, fresh-state transactions. Once an owner
enables shared editing, reject versionless event mutations with `409 CLIENT_UPDATE_REQUIRED`
and an upgrade prompt; do not silently accept an unsafe legacy write during shared editing.
Document this limited compatibility requirement in the invitation flow and rollout notes.

Before enabling managers, enforce compare-and-swap **inside** the KOH write transaction and
audit other KOH mutations and career-contribution writes for the same property. Failure must
roll back match sets, rotations/promotions, stats, career deltas, audit entries and version
changes. Tests must synchronize competing requests; sequential stale-version tests alone do
not prove safety. Do not claim per-court independent editing or introduce a new conflict model.

Client query keys include actor ID and selected organizer ID for lists, careers, suggestions,
activity and permissions. Scope event details to that context as well. On a switch, cancel
queries, invalidate/unmount previous live state, close sockets and dismiss score/modification
sheets. Draft keys become `scoreDraft:<actorId>:<organizerId>:<tournamentId>`; do not import old
unscoped drafts into delegated accounts. Scope other persisted roster/create/KOH drafts too.
Personal legacy drafts may be restored only after proving the event belongs to that personal
account. Block stale responses and writes after sign-out or a context-generation change.

## 9. Compatibility, rollout and acceptance

- Additive tables/indexes only; keep all existing owner IDs, career aggregates and public links.
- Old clients omit context and retain owner-only behavior. Do not make an absent header mean
  “all accounts”. New client controls rely on returned capabilities, with server enforcement.
- Roll out behind `SHARED_ORGANIZER_ACCESS_ENABLED` (proposed server flag) after full API coverage.
  When off, deny all delegated private operations/acceptance and hide discovery/invitation
  controls; personal ownership and existing public viewer behavior keep working. Owner must
  still be able to revoke existing grants through the normal owner-only access-management routes.
- Deploy DB migration, compatible backend, then organizer web/native changes. The Vite viewer
  does not need a new management application or server-side runtime.
- For the shared 4 GB server: use indexed per-request permission lookups, bounded lists/activity
  metadata and existing mail infrastructure. Build images outside the server where possible.
  Measure with normal simultaneous tournament traffic; do not add a service just for sharing.
- Document that independent club identity/ownership transfer and event-only editor links are
  deferred. The owner's user record remains the owner throughout v1.

Acceptance scenario: a verified owner invites a new or existing verified manager; the manager
accepts, switches account, creates and runs all supported tournament modes, edits the owner's
career players and exports the correct board. Results credit only the owner. Both users can
work simultaneously without silent overwrite. The owner removes access and the manager's
next private request is rejected, while both users' own accounts, existing results, and
spectator viewing remain intact.

See the companion plan for the route inventory, delivery sequence and release test matrix.
