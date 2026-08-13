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
- `POST /auth/verify/resend` — requires Bearer JWT; rate-limited; emails a verify magic link when still unverified
- `POST /auth/attach/email` — guest JWT; sets email on same user id; sends confirm magic link
- `POST /auth/attach/google` — guest JWT + `{ idToken }`; converts guest in place (`guestId` kept)
- `POST /auth/attach/password/register/start|finish` — guest JWT; password envelope on same user id
- JWT claims include `emailVerified` and optional `verifyBy` (epoch ms). After `emailVerificationDueAt`, organizer tournament routes return `403` `{ code: "EMAIL_VERIFY_REQUIRED" }` (guests exempt).
- Unauthenticated `POST /auth/google` links `googleId` onto an existing email user when present (no second row).

## Health

- `GET /health`

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

## Concurrency

Mutating endpoints that can race (`score`, `adjust-courts`, `add-pending-player`, `integrate-pending`) require `expectedVersion`.
If mismatch occurs, API responds with conflict and caller must refresh state.
