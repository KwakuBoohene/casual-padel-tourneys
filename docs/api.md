# API Contracts

Base URL: `http://localhost:3001`

## Auth

- `POST /auth/google` — body: `{ idToken }` → JWT
- `POST /auth/guest` — body: `{ guestId }` → JWT
- `GET /auth/me` — requires Bearer JWT
- `POST /auth/magic-link` — body: `{ email }` → always `200` generic message (no email enumeration); emails one-time link (15 min)
- `POST /auth/magic-link/consume` — body: `{ token }` → JWT; marks email verified; consumed/expired tokens → `401`
- `POST /auth/password/register/start` — body: `{ email, registrationRequest }` → `{ registrationResponse }`
- `POST /auth/password/register/finish` — body: `{ email, registrationRecord }` → `{ ok: true }` (stores envelope only; no password hash)
- `POST /auth/password/login/start` — body: `{ email, startLoginRequest }` → `{ loginResponse, loginId }`
- `POST /auth/password/login/finish` — body: `{ email, loginId, finishLoginRequest }` → JWT; invalid credentials → generic `401`
- `POST /auth/password/reset` — body: `{ email }` → always `200` generic message; emails RESET magic link when account exists
- `POST /auth/password/reset/consume` — body: `{ token }` → `{ resetTicket }` (short-lived; not a full JWT)
- `POST /auth/password/reset/register/start` — body: `{ resetTicket, registrationRequest }` → `{ registrationResponse }`
- `POST /auth/password/reset/register/finish` — body: `{ resetTicket, registrationRecord }` → JWT; **replaces** password envelope; ticket is one-time
- `POST /auth/verify/resend` — requires Bearer JWT; rate-limited; emails a verify magic link when still unverified
- `POST /auth/attach/email` — guest JWT; sets email on same user id; sends confirm magic link
- `POST /auth/attach/google` — guest JWT + `{ idToken }`; converts guest in place (`guestId` kept)
- `POST /auth/attach/password/register/start|finish` — guest JWT; password envelope on same user id
- JWT claims include `emailVerified` and optional `verifyBy` (epoch ms). After `emailVerificationDueAt`, organizer tournament routes return `403` `{ code: "EMAIL_VERIFY_REQUIRED" }` (guests exempt).
- Unauthenticated `POST /auth/google` links `googleId` onto an existing email user when present (no second row).

## Health

- `GET /health` — liveness, `{ status: "ok", ok: true }` (no database access)
- `GET /ready` — readiness, `{ status, ok, checks: { database } }`; `503` when Postgres is unreachable

## Tournament Read

- `GET /tournaments`
- `GET /tournaments/:id`
- `GET /public/:token` (read-only viewer endpoint)

## Players

- `GET /players/suggestions` (requires auth)
  - Returns distinct player names from organizer's past tournaments for autocomplete

## Tournament Write

- `POST /tournaments`
  - body: create tournament config
- `POST /tournaments/score`
  - body: `tournamentId`, `matchId`, `scoreA`, `scoreB`, `expectedVersion`
- `POST /tournaments/rename-player`
  - body: `tournamentId`, `playerId`, `newName`
- `POST /tournaments/adjust-courts`
  - body: `tournamentId`, `courts`, `expectedVersion`
- `POST /tournaments/substitute-player`
  - body: `tournamentId`, `playerId`, `replacementName`
- `POST /tournaments/rename`
  - body: `tournamentId`, `newName`
- `POST /tournaments/add-pending-player`
  - body: `tournamentId`, `name`, `gender` (optional), `expectedVersion`
  - Adds a player to the pending list during an active tournament
- `POST /tournaments/integrate-pending`
  - body: `tournamentId`, `expectedVersion`
  - Integrates pending players into the active tournament with handicap calculation
  - Requires: ≥2 pending players, current round complete, integration wave < 3
- `POST /tournaments/:id/close`
  - body: `expectedVersion`
  - Closes a live event for **any** mode (Americano, Mexicano, King of the Court).
  - Every match still unplayed (`completed: false`) is marked **void** (`voidedAt`): it keeps any
    partial score but never counts towards standings or the career board.
  - returns: `{ data: { tournament, voidedMatchCount } }`. For King of the Court, `tournament` is the
    KOC hub, matching how `GET /tournaments/:id` already branches by mode.
  - Idempotent: closing an already-closed event returns current state with `voidedMatchCount: 0`.
- `POST /tournaments/end-night`
  - body: `tournamentId`, `expectedVersion`
  - Mexicano alias of the close flow. Returns `{ data: tournament }`.
  - The in-progress round is **voided, not discarded** — awarded points are no longer reversed.
- `POST /koh/tournaments/:id/end`
  - body: `expectedVersion`
  - King of the Court alias of the close flow. Returns `{ data: hub }`.
- `DELETE /tournaments/:id`

## Realtime

- `GET /ws/tournaments/:id` (websocket)

Events:

- `TOURNAMENT_CREATED`
- `SCORE_SUBMITTED`
- `PLAYER_RENAMED`
- `TOURNAMENT_RENAMED`
- `COURTS_ADJUSTED`
- `PLAYER_SUBSTITUTED`
- `PENDING_PLAYER_ADDED`
- `PENDING_PLAYERS_INTEGRATED`
- `TOURNAMENT_DELETED`
- `ROUND_ADVANCED`
- `TOURNAMENT_ENDED`

## Concurrency

Mutating endpoints that can race (`score`, `adjust-courts`, `add-pending-player`, `integrate-pending`, `close`) require `expectedVersion`.
If mismatch occurs, API responds with conflict and caller must refresh state.
