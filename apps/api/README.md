# `@padel/api`

Fastify + Prisma API for Casual Padel Tourneys. Owns tournament lifecycle (Americano / Mexicano / Regular), auth, King of the Hill (KOH), and realtime scoreboard updates.

Package name: `@padel/api` · default port: `3001` (`API_PORT`)

## Quick start

From the monorepo root (Postgres + Redis via `infra/docker-compose.yml`):

```bash
# Infra (Postgres :5432, Redis :6379)
docker compose -f infra/docker-compose.yml up -d db redis

# Env: apps/api/.env (DATABASE_URL, REDIS_URL, JWT_SECRET, …)
npm run db:migrate --workspace @padel/api
npm run dev --workspace @padel/api
```

Useful scripts (from `apps/api` or via `--workspace @padel/api`):

| Script | Purpose |
|--------|---------|
| `dev` | `tsx watch` on `src/server.ts` |
| `build` / `start` | Compile + run `dist` |
| `lint` | ESLint (flat config, `--max-warnings 0`) incl. layer boundaries |
| `typecheck` | `tsc --noEmit` |
| `test` | Node test runner over `tests/**/*.test.ts` |
| `db:migrate` / `db:generate` / `db:push` | Prisma |
| `simulate` | Engine simulation helper |

Health: `GET /health` → `{ status: "ok", ok: true }` · readiness: `GET /ready` (see [Ops](#ops)).

## Architecture overview

The API is **modular hexagonal + light DDD** (epics 09–10). Tournaments (Americano / Mexicano /
Regular), KOH, auth and organizer players all live as modules under `src/modules/`.

```text
HTTP (Fastify)  →  application use-cases  →  domain / pure engines
                         ↓ ports
              infrastructure (Prisma, Redis/WS)
```

**Dependency rule (non-negotiable for modular code):**

- `http` → `application` → `domain` / `engine`
- `infrastructure` implements application **ports**
- `domain` / `engine` never import Fastify, Prisma, or ioredis

This is enforced by ESLint (`eslint.config.js`, `boundaries/dependencies`), not by convention:
`npm run lint --workspace @padel/api` fails if `modules/*/domain/**` imports `fastify`,
`@prisma/client` or `ioredis`, or if `modules/*/application/**` imports `fastify` or
`@prisma/client`. `tests/lint/boundaries.test.ts` asserts those rules still bite.

Longer rationale: [`plans/implementation/backend/epic-09-api-modular-hexagonal/adr-modular-hexagonal.md`](../../plans/implementation/backend/epic-09-api-modular-hexagonal/adr-modular-hexagonal.md).

### Request flow (tournament module)

1. Fastify route in `modules/tournament/http/` validates input and auth headers.
2. Calls an application use-case (e.g. `createTournament`, `submitScore`).
3. Use-case loads/saves via `TournamentRepository` (Prisma adapter) and mutates via pure `domain/` + `engine/` helpers.
4. Side effects (WS fan-out) go through `TournamentEvents` (realtime adapter).
5. Failures use shared `AppError` → `mapAppError` for HTTP status/body.

**Source of truth for live AM/MX/Regular state is Postgres** (optimistic locking via `version`). Redis is for pub/sub fan-out only, not the tournament store.

## File structure

```text
apps/api/
├── prisma/                 # schema + migrations (Postgres)
├── src/
│   ├── server.ts           # listen + boot
│   ├── app.ts              # Fastify plugins, module registration
│   ├── modules/
│   │   ├── tournament/     # hexagonal tournament bounded context
│   │   │   ├── http/       # Fastify adapters + register()
│   │   │   ├── application/# use-cases + ports
│   │   │   ├── domain/     # aggregate mutations (pure)
│   │   │   └── infrastructure/  # Prisma repo, realtime adapter, mappers
│   │   ├── koh/            # King of the Hill bounded context (same four layers)
│   │   ├── auth/           # guest/Google/password/magic-link/reset (same four layers)
│   │   └── organizerPlayers/  # cross-event player careers (`/me/players/*`)
│   ├── shared/
│   │   ├── kernel/         # AppError, Result helpers
│   │   └── http/           # mapAppError, global error handler, /health + /ready, request id
│   ├── engine/             # pure schedulers / scoring (Americano, Mexicano, Regular, KOH math)
│   ├── realtime/           # WebSocket hub + Redis pub/sub
│   ├── lib/                # auth shim, mail, prisma client, logger; store.ts = test harness only
│   └── types/
└── tests/                  # mirrors src/ (do not put *.test.ts under src/)
```

Module-local notes: [`src/modules/tournament/README.md`](./src/modules/tournament/README.md), [`src/modules/koh/README.md`](./src/modules/koh/README.md), [`src/modules/auth/README.md`](./src/modules/auth/README.md), [`src/modules/organizerPlayers/README.md`](./src/modules/organizerPlayers/README.md).  
Test layout: [`tests/README.md`](./tests/README.md).

### What lives where

| Area | Location | Notes |
|------|----------|--------|
| Create / score / live AM·MX·Regular | `modules/tournament/` | Prefer this path for new tournament work |
| Pairing & scoring algorithms | `engine/` | Keep pure; call from application/domain |
| KOH hubs & queues | `modules/koh/` | Hexagonal; `POST /tournaments` + public token reads branch in from the tournament module |
| Auth (guest, Google, password, magic link, reset, attach) | `modules/auth/` | Hexagonal; JWT + OPAQUE behind adapters. `lib/auth.ts` re-exports the preHandlers |
| Organizer player careers | `modules/organizerPlayers/` | Authenticated `/me/players/*`; KOH credits careers through `infrastructure/careerCredits.ts` |
| Realtime subscriptions | `realtime/socketHub.ts` | Clients subscribe by public share token |
| Health / readiness / request id | `shared/http/` | Registered once from `app.ts` |

## HTTP surface (high level)

Auth headers commonly used:

- `Authorization: Bearer <jwt>` — organizer session
- `x-organizer-token` — tournament organizer secret (share with care)
- `x-public-token` — public viewer token (read / limited write where allowed)

Typical tournament routes (registered by `registerTournamentModule`):

- `POST /tournaments` — create (Americano / Mexicano / Regular)
- `GET /tournaments/:id` — organizer read
- `GET /public/tournaments/:publicToken` — viewer snapshot
- Score / advance / regenerate / player mutations — under the tournament module HTTP adapters

KOH routes (`/koh/tournaments/...`) are registered by `registerKohModule` from `modules/koh/http/`. Auth routes (`/auth/...`) are registered by `registerAuthModule` from `modules/auth/http/`. Prefer reading the route files or OpenAPI-ish comments there for exact paths and bodies.

## Realtime

- Clients connect via WebSocket (Fastify `@fastify/websocket`).
- Hub loads tournament access from **Prisma** (public token → tournament), then fans out scoreboard updates.
- Optional `REDIS_URL`: cross-process pub/sub. Without Redis, in-process subscriptions still work for a single API instance.

## Ops

Sized for a self-hosted deployment with **&lt;1000 users** — boring basics, no APM stack.

### Health vs readiness

| Endpoint | Meaning | Body | Notes |
|----------|---------|------|-------|
| `GET /health` | Liveness — the process is up | `{ status: "ok", ok: true }` | Never touches Postgres, so a DB blip does not trigger restarts |
| `GET /ready` | Readiness — can serve traffic | `{ status, ok, checks: { database } }` | `SELECT 1` against Postgres; **fails closed with 503** when the DB is unreachable |

Both are registered from `app.ts` via `shared/http/opsRoutes.ts` and are exempt from the global
rate limit so probes never get throttled.

### Request ids and log safety

- Incoming `x-request-id` is reused as the Fastify request id (trimmed, max 128 chars);
  otherwise a UUID is generated. The value appears as `reqId` on every request log line and is
  echoed back in the `x-request-id` response header.
- The request log serializer (`shared/http/requestContext.ts`) logs method, redacted URL and
  remote address only — **no headers, no cookies**, so JWTs and `x-organizer-token` never land in
  logs. Share tokens in the path (`/public/:token`) and in `?token=` queries are replaced with
  `[redacted]`.

### Error contract

`app.ts` registers one global handler (`shared/http/errorHandler.ts`):

- An `AppError` that escapes a route becomes its declared status with `{ message }` — the same
  body routes already produce through `mapAppError`.
- Anything else is handed back to Fastify, preserving the `{ statusCode, error, message }`
  envelope that auth routes and the rate limiter return.

### Rate limits

Global: **100 requests / minute** per IP (`@fastify/rate-limit`, in-memory per instance).
Per-route overrides for the unauthenticated auth surface (`modules/auth/http/rateLimits.ts`):

| Cluster | Routes | Limit |
|---------|--------|-------|
| Email send | `POST /auth/magic-link`, `POST /auth/password/reset` | 5 / 15 min |
| Credentials | `/auth/password/{register,login}/*`, `/auth/password/reset/register/*`, `/auth/google`, `/auth/guest` | 20 / 15 min |
| Token redeem | `/auth/magic-link/consume`, `/auth/password/reset/consume` | 20 / 15 min |
| Verify resend | `POST /auth/verify/resend` (authenticated) | 5 / 15 min |
| Ops probes | `/health`, `/ready` | exempt |

Authenticated organizer routes stay on the global limit; at this user count they are not a
plausible abuse vector, and password login also has its own attempt tracking
(`lib/passwordLoginAttempts.ts`). Limits are per process — with more than one API instance,
move the store to Redis before tightening further.

## Configuration

Common env vars (see also repo root / `infra` docs):

| Variable | Role |
|----------|------|
| `DATABASE_URL` | Postgres (required for persist) |
| `REDIS_URL` | Realtime pub/sub (optional but recommended) |
| `API_PORT` | Listen port (default `3001`) |
| `API_LOG_LEVEL` | Fastify / app log level |
| `JWT_SECRET` | Session tokens |
| Mail / OAuth vars | Magic link + Google (see `lib/mail`, auth routes) |

## Testing

```bash
npm test --workspace @padel/api
```

- Place tests in `tests/` with the same relative path as `src/` (workspace rule).
- Tournament use-case / HTTP tests target the modular stack.
- `lib/store.ts` remains a **test harness** wrapping domain helpers — not the production live store.
- The runner does **not** use `--test-force-exit`: it made the process exit before every test file
  had reported, so runs silently dropped whole files (counts drifted between 263 and 284 while
  still printing `fail 0`). Integration tests need Postgres reachable; a hanging run means an open
  handle, so fix the handle instead of re-adding the flag.
- Tests that write career rows (`OrganizerPlayerStatDelta`) must use a unique organizer id and
  clean up — those rows have no natural expiry and will break row-count assertions on re-runs.

## Extending the API

**New Americano/Mexicano/Regular behavior**

1. Add or extend pure logic in `engine/` or `modules/tournament/domain/`.
2. Add a use-case under `application/`.
3. Wire ports if you need new persistence or events.
4. Keep HTTP adapters thin: validate → use-case → `mapAppError`.

**New bounded context**

Follow the same `modules/<name>/{domain,application,infrastructure,http}` layout and register it
from `app.ts` (see epic-10 plans). ESLint enforces the layering, so start from the port, not the
Prisma call.

**Do not**

- Put business rules in Fastify handlers.
- Import Prisma/Fastify inside `domain/` or `engine/`.
- Reintroduce an in-memory `Map` as source of truth for live tournaments.

## Related docs

- Architecture ADR: `plans/implementation/backend/epic-09-api-modular-hexagonal/adr-modular-hexagonal.md`
- Backend epics: `plans/implementation/backend/`
- Shared types: `packages/shared`
